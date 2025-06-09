const DocumentationValidator = require('../validate-docs');
const fs = require('fs');
const path = require('path');

const RULES_PATH = path.join(process.cwd(), '.cursorrules.json');
const rules = JSON.parse(fs.readFileSync(RULES_PATH, 'utf8'));

class DocumentationFixer {
    constructor(rootDir, options = { dryRun: true }) {
        this.rootDir = rootDir;
        this.validator = new DocumentationValidator(rootDir);
        this.dryRun = options.dryRun;
        this.proposedChanges = [];
        this.options = options;
        this.standards = {
            maxLineCount: rules.maxFileLines || 250,
            requiredFields: rules.requiredDocFields || ['title', 'description', 'lastUpdated', 'version'],
            requiredSections: ['Overview', 'Implementation', 'Maintenance'],
        };
    }

    getProposedChanges() {
        return this.proposedChanges;
    }

    async fixAll() {
        console.log('Starting documentation fixes...');
        
        // First validate to get issues
        const report = await this.validator.validateAll();
        
        // Process each file with issues
        for (const file of report.files) {
            if (!file.passed) {
                await this.fixFile(file);
            }
        }

        // Revalidate after fixes
        const finalReport = await this.validator.validateAll();
        console.log('Documentation fixes completed.');
        console.log(`Initial issues: ${report.summary.failed}`);
        console.log(`Remaining issues: ${finalReport.summary.failed}`);
        
        return finalReport;
    }

    async fixFile(file) {
        console.log(`\nFixing issues in ${file.filePath}:`);
        
        const content = fs.readFileSync(file.filePath, 'utf8');
        let newContent = content;
        const changes = {
            filePath: file.filePath,
            originalContent: content,
            proposedChanges: []
        };

        // Fix line count issues
        if (file.issues.some(i => i.includes('line limit'))) {
            const { newContent: updatedContent, newFiles } = this.splitLongFile(file.filePath, newContent);
            newContent = updatedContent;
            changes.proposedChanges.push({
                type: 'split_file',
                details: {
                    newFiles: newFiles.map(f => ({
                        path: f.path,
                        content: f.content
                    }))
                }
            });
        }

        // Fix missing fields
        if (file.issues.some(i => i.includes('Missing required field'))) {
            const updatedContent = this.addMissingFields(newContent);
            if (updatedContent !== newContent) {
                changes.proposedChanges.push({
                    type: 'add_fields',
                    details: {
                        addedFields: this.standards.requiredFields
                    }
                });
                newContent = updatedContent;
            }
        }

        // Fix missing sections
        if (file.issues.some(i => i.includes('Missing required section'))) {
            const updatedContent = this.addMissingSections(newContent);
            if (updatedContent !== newContent) {
                changes.proposedChanges.push({
                    type: 'add_sections',
                    details: {
                        addedSections: this.standards.requiredSections
                    }
                });
                newContent = updatedContent;
            }
        }

        // Fix broken links
        if (file.issues.some(i => i.includes('Broken links'))) {
            const { newContent: updatedContent, fixedLinks } = await this.fixBrokenLinks(file.filePath, newContent);
            if (updatedContent !== newContent) {
                changes.proposedChanges.push({
                    type: 'fix_links',
                    details: {
                        fixedLinks
                    }
                });
                newContent = updatedContent;
            }
        }

        // Fix circular dependencies
        if (file.issues.some(i => i.includes('Circular dependencies'))) {
            const { newContent: updatedContent, fixedDeps } = this.fixCircularDependencies(newContent);
            if (updatedContent !== newContent) {
                changes.proposedChanges.push({
                    type: 'fix_dependencies',
                    details: {
                        fixedDependencies: fixedDeps
                    }
                });
                newContent = updatedContent;
            }
        }

        // Track changes
        if (changes.proposedChanges.length > 0) {
            changes.newContent = newContent;
            this.proposedChanges.push(changes);
            
            // Write changes if not in dry run mode
            if (!this.dryRun) {
                fs.writeFileSync(file.filePath, newContent);
                console.log(`Fixed ${file.issues.length} issues in ${file.filePath}`);
            } else {
                console.log(`Would fix ${file.issues.length} issues in ${file.filePath}`);
            }
        }
    }

    splitLongFile(filePath, content) {
        const sections = content.split(/(?=^## )/m);
        const newFiles = [];
        
        // Keep the first section in the original file
        const mainContent = sections[0];
        newFiles.push({ path: filePath, content: mainContent });

        // Create new files for other sections
        for (let i = 1; i < sections.length; i++) {
            const section = sections[i];
            const title = section.split('\n')[0].replace('## ', '').trim();
            const newFileName = `${title.toLowerCase().replace(/\s+/g, '-')}.md`;
            const newFilePath = path.join(path.dirname(filePath), newFileName);
            
            // Add frontmatter and link back to main file
            const newContent = `---
title: ${title}
description: ${title} documentation
lastUpdated: ${new Date().toISOString()}
version: 1.0.0
---

${section}

[Back to main document](${path.basename(filePath)})
`;
            newFiles.push({ path: newFilePath, content: newContent });
        }

        // Write all files if not in dry run mode
        if (!this.dryRun) {
            for (const file of newFiles) {
                fs.writeFileSync(file.path, file.content);
            }
        }

        return { newContent: mainContent, newFiles };
    }

    addMissingFields(content) {
        if (!content.includes('---')) {
            content = `---
title: ${path.basename(content.split('\n')[0].replace('# ', ''))}
description: Documentation for ${path.basename(content.split('\n')[0].replace('# ', ''))}
lastUpdated: ${new Date().toISOString()}
version: 1.0.0
---

${content}`;
        }
        return content;
    }

    addMissingSections(content) {
        const requiredSections = ['Overview', 'Implementation', 'Maintenance'];
        const existingSections = content.match(/^## ([^\n]+)/gm) || [];
        
        for (const section of requiredSections) {
            if (!existingSections.includes(`## ${section}`)) {
                content += `\n\n## ${section}\n\n[Add ${section.toLowerCase()} content here]`;
            }
        }
        
        return content;
    }

    async fixBrokenLinks(filePath, content) {
        const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
        let match;
        let newContent = content;
        const fixedLinks = [];

        while ((match = linkRegex.exec(content)) !== null) {
            const [fullMatch, text, url] = match;
            if (url.startsWith('./') || url.startsWith('../')) {
                const targetPath = path.resolve(path.dirname(filePath), url);
                if (!fs.existsSync(targetPath)) {
                    // Try to find the file in the docs directory
                    const possiblePaths = this.findPossiblePaths(url);
                    if (possiblePaths.length > 0) {
                        const relativePath = path.relative(path.dirname(filePath), possiblePaths[0]);
                        newContent = newContent.replace(fullMatch, `[${text}](${relativePath})`);
                        fixedLinks.push({
                            original: url,
                            fixed: relativePath
                        });
                    } else {
                        // Remove broken link
                        newContent = newContent.replace(fullMatch, text);
                        fixedLinks.push({
                            original: url,
                            fixed: 'removed'
                        });
                    }
                }
            }
        }

        return { newContent, fixedLinks };
    }

    findPossiblePaths(url) {
        const possiblePaths = [];
        const searchPath = path.join(this.rootDir, '**', path.basename(url));
        const glob = require('glob');
        
        return glob.sync(searchPath);
    }

    fixCircularDependencies(content) {
        // Replace circular links with references to the main document
        const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
        let match;
        let newContent = content;
        const fixedDeps = [];

        while ((match = linkRegex.exec(content)) !== null) {
            const [fullMatch, text, url] = match;
            if (url.startsWith('./') || url.startsWith('../')) {
                // Replace with a reference to the main document
                const newLink = `[${text}](#${text.toLowerCase().replace(/\s+/g, '-')})`;
                newContent = newContent.replace(fullMatch, newLink);
                fixedDeps.push({
                    original: url,
                    fixed: newLink
                });
            }
        }

        return { newContent, fixedDeps };
    }

    async getAllMarkdownFiles() {
        const markdownFiles = [];
        const glob = require('glob');
        
        const searchPath = path.join(this.rootDir, '**', '*.md');
        const files = glob.sync(searchPath);
        
        for (const file of files) {
            markdownFiles.push(file);
        }
        
        return markdownFiles;
    }

    fixFrontmatter(content, filePath) {
        if (!/^---[\s\S]+?---/.test(content)) {
            content = `---
title: ${path.basename(filePath.split('\n')[0].replace('# ', ''))}
description: Documentation for ${path.basename(filePath.split('\n')[0].replace('# ', ''))}
lastUpdated: ${new Date().toISOString()}
version: 1.0.0
---

${content}`;
        }
        return content;
    }

    addMissingSections(content, filePath) {
        const requiredSections = ['Overview', 'Implementation', 'Maintenance'];
        const existingSections = content.match(/^## ([^\n]+)/gm) || [];
        
        for (const section of requiredSections) {
            if (!existingSections.includes(`## ${section}`)) {
                content += `\n\n## ${section}\n\n[Add ${section.toLowerCase()} content here]`;
            }
        }
        
        return content;
    }
}

// Usage
const fixer = new DocumentationFixer('./docs', { dryRun: true });
fixer.fixAll().then(report => {
    console.log('\nFinal validation report:');
    console.log(JSON.stringify(report.summary, null, 2));
    console.log('\nProposed changes:');
    console.log(JSON.stringify(fixer.getProposedChanges(), null, 2));
});

const EXCLUDED_DIRS = [
  'backups',
  'test-suite',
  'CLARITY_ENGINE_DOCS/backups',
  'CLARITY_ENGINE_DOCS/CLARITY_ENGINE_DOCS/archive',
];

async function getAllMarkdownFiles(rootDir) {
  const glob = require('glob');
  const files = glob.sync(path.join(rootDir, '**/*.md'));
  return files.filter(f => !EXCLUDED_DIRS.some(ex => f.includes(ex)));
}

async function batchFixDocs(rootDir) {
  const fixer = new DocumentationFixer(rootDir, { dryRun: false });
  const files = await getAllMarkdownFiles(rootDir);
  for (const file of files) {
    let content = await fs.promises.readFile(file, 'utf8');
    let updated = false;
    if (!/^---[\s\S]+?---/.test(content)) {
      content = fixer.fixFrontmatter(content, file);
      updated = true;
    }
    if (/^---[\s\S]+?---/.test(content) && content.indexOf('## Overview') === -1) {
      content = fixer.addMissingSections(content, file);
      updated = true;
    }
    if (updated) {
      await fs.promises.writeFile(file, content, 'utf8');
      console.log(`Fixed: ${file}`);
    }
  }
  console.log('Batch doc fix complete.');
}

if (require.main === module) {
  const rootDir = process.argv[2] || process.cwd();
  batchFixDocs(rootDir).catch(console.error);
}

module.exports = DocumentationFixer; 