// @agent: diagnostics
// @orchestrator: recovery
// @origin: legacy-rescue
const fs = require('fs');
const path = require('path');
const glob = require('glob');

const CONVERSATION_LOG = path.join('docs', 'conversation_log.md');
const RULES_PATH = path.join(process.cwd(), '.cursorrules.json');
const rules = JSON.parse(fs.readFileSync(RULES_PATH, 'utf8'));

const EXCLUDED_DIRS = [
  'backups',
  'test-suite',
  'CLARITY_ENGINE_DOCS/backups',
  'CLARITY_ENGINE_DOCS/CLARITY_ENGINE_DOCS/archive',
  'whisper_env',
  'node_modules',
  'site-packages',
  'venv',
  '__pycache__',
  '.venv',
  'env',
];

const INCLUDED_DIRS = [
  'KERNEL_SLATE/',
  'KERNEL_SLATE/docs/',
  'KERNEL_SLATE/docs/standards/',
  'KERNEL_SLATE/scripts/',
  'KERNEL_SLATE/shared/',
  'KERNEL_SLATE/tests/',
];

function appendToConversationLog(entry) {
    const logEntry = [
        `- **Timestamp:** ${entry.timestamp}`,
        `- **Action:** ${entry.action}`,
        `- **Files affected:** ${entry.files.map(f => `[${f}](./${f})`).join(', ')}`,
        `- **Issues found:** ${entry.issues.join('; ')}`,
        `- **Related reports:** [${entry.report}](./${entry.report})`,
        '',
        '---',
        ''
    ].join('\n');
    fs.appendFileSync(CONVERSATION_LOG, logEntry);
}

class DocumentationValidator {
    constructor(rootDir) {
        this.rootDir = rootDir;
        this.standards = {
            maxLineCount: rules.maxFileLines || 250,
            requiredFields: rules.requiredDocFields || ['title', 'description', 'lastUpdated', 'version'],
            requiredSections: ['Overview', 'Implementation', 'Maintenance'],
            qualityChecks: {
                minDescriptionLength: 100,
                requireCodeBlocks: true
            }
        };
    }

    async validateAll() {
        console.log('Starting documentation validation...');
        
        const files = await this.getAllMarkdownFiles();
        const results = {
            totalFiles: files.length,
            passed: 0,
            failed: 0,
            issues: {
                lineCount: 0,
                missingFields: 0,
                missingSections: 0,
                brokenLinks: 0,
                circularDeps: 0
            },
            files: []
        };
        const failures = [];

        for (const file of files) {
            const fileResult = await this.validateFile(file);
            results.files.push(fileResult);
            
            if (fileResult.status === 'passed') {
                results.passed++;
            } else {
                results.failed++;
                this.updateIssueCounts(results.issues, fileResult.issues);
                failures.push({
                    file: file,
                    issues: fileResult.issues.map(i => i.message || i)
                });
            }
        }

        // Save validation report
        const reportPath = path.join('docs', 'validation-report.json');
        fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
        // Save batch failures summary
        const failuresPath = path.join('docs', 'validation-failures.json');
        fs.writeFileSync(failuresPath, JSON.stringify(failures, null, 2));
        // Append to conversation log
        if (failures.length > 0) {
            appendToConversationLog({
                timestamp: new Date().toISOString(),
                action: 'Validation (batch)',
                files: failures.map(f => f.file),
                issues: failures.flatMap(f => f.issues),
                report: 'validation-report.json'
            });
        }

        return results;
    }

    async getAllMarkdownFiles() {
        const files = glob.sync(path.join(this.rootDir, '**/*.md'));
        return files.filter(f =>
            INCLUDED_DIRS.some(dir => f.replace(this.rootDir + path.sep, '').startsWith(dir))
        );
    }

    async validateFile(filePath) {
        const fullPath = path.isAbsolute(filePath) ? filePath : path.join(this.rootDir, filePath);
        const content = fs.readFileSync(fullPath, 'utf8');
        const lines = content.split('\n');
        
        const result = {
            path: filePath,
            status: 'passed',
            issues: []
        };

        // Check line count
        if (lines.length > this.standards.maxLineCount) {
            result.status = 'failed';
            result.issues.push({
                type: 'lineCount',
                message: `File exceeds ${this.standards.maxLineCount} lines (${lines.length} lines)`
            });
        }

        // Check frontmatter
        const frontmatter = this.extractFrontmatter(content);
        if (!frontmatter) {
            result.status = 'failed';
            result.issues.push({
                type: 'missingFields',
                message: 'Missing frontmatter'
            });
        } else {
            // Check required fields
            for (const field of this.standards.requiredFields) {
                if (!frontmatter[field]) {
                    result.status = 'failed';
                    result.issues.push({
                        type: 'missingFields',
                        message: `Missing required field: ${field}`
                    });
                }
            }
        }

        // Check required sections
        for (const section of this.standards.requiredSections) {
            if (!content.includes(`## ${section}`)) {
                result.status = 'failed';
                result.issues.push({
                    type: 'missingSections',
                    message: `Missing required section: ${section}`
                });
            }
        }

        // Check for code blocks
        if (this.standards.qualityChecks.requireCodeBlocks && !content.includes('```')) {
            result.status = 'failed';
            result.issues.push({
                type: 'quality',
                message: 'Missing code blocks'
            });
        }

        return result;
    }

    extractFrontmatter(content) {
        const match = content.match(/^---\n([\s\S]*?)\n---/);
        if (!match) return null;

        const frontmatter = {};
        const lines = match[1].split('\n');
        
        for (const line of lines) {
            const [key, ...valueParts] = line.split(':');
            if (key && valueParts.length > 0) {
                frontmatter[key.trim()] = valueParts.join(':').trim();
            }
        }

        return frontmatter;
    }

    updateIssueCounts(counts, issues) {
        for (const issue of issues) {
            if (counts[issue.type] !== undefined) {
                counts[issue.type]++;
            }
        }
    }
}

// Export the class
module.exports = DocumentationValidator;

// If run directly
if (require.main === module) {
    const rootDir = process.argv[2] || process.cwd();
    const validator = new DocumentationValidator(rootDir);
    validator.validateAll().then(results => {
        console.log('\nValidation Results:');
        console.log(`Total Files: ${results.totalFiles}`);
        console.log(`Passed: ${results.passed}`);
        console.log(`Failed: ${results.failed}`);
        console.log('\nIssues:');
        console.log(`- Line Count Issues: ${results.issues.lineCount}`);
        console.log(`- Missing Fields: ${results.issues.missingFields}`);
        console.log(`- Missing Sections: ${results.issues.missingSections}`);
        console.log(`- Broken Links: ${results.issues.brokenLinks}`);
        console.log(`- Circular Dependencies: ${results.issues.circularDeps}`);
        if (results.failed > 0) {
            process.exit(1);
        } else {
            process.exit(0);
        }
    }).catch(error => {
        console.error('Error:', error);
        process.exit(2);
    });
} 
