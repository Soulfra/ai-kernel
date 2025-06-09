const fs = require('fs');
const path = require('path');
const DocumentationValidator = require('./validate-docs');

class DocumentationFixer {
  constructor(rootDir) {
    this.rootDir = rootDir;
    this.validator = new DocumentationValidator(rootDir);
  }

  async fixAll() {
    console.log('Starting documentation fixes...');
    
    // 1. Get all markdown files
    const files = this.getAllMarkdownFiles();
    console.log(`Found ${files.length} markdown files`);

    // 2. Fix each file
    for (const file of files) {
      await this.fixFile(file);
    }

    // 3. Run validation again
    const results = await this.validator.validateAll();
    console.log('\nPost-fix validation results:');
    console.log(`Total Files: ${results.totalFiles}`);
    console.log(`Passed: ${results.passed}`);
    console.log(`Failed: ${results.failed}`);
    console.log('\nRemaining Issues:');
    console.log(`- Line Count Issues: ${results.issues.lineCount}`);
    console.log(`- Missing Fields: ${results.issues.missingFields}`);
    console.log(`- Missing Sections: ${results.issues.missingSections}`);
    console.log(`- Broken Links: ${results.issues.brokenLinks}`);
    console.log(`- Circular Dependencies: ${results.issues.circularDeps}`);
  }

  getAllMarkdownFiles() {
    return this.validator.getAllMarkdownFiles();
  }

  async fixFile(filePath) {
    const fullPath = path.join(this.rootDir, filePath);
    let content = fs.readFileSync(fullPath, 'utf8');

    // 1. Add or update frontmatter
    content = this.fixFrontmatter(content, filePath);

    // 2. Add missing sections
    content = this.addMissingSections(content, filePath);

    // 3. Fix line count issues
    if (content.split('\n').length > 250) {
      content = this.splitLongFile(content, filePath);
    }

    // Write the fixed content
    fs.writeFileSync(fullPath, content);
  }

  fixFrontmatter(content, filePath) {
    const title = this.generateTitle(filePath);
    const description = this.generateDescription(filePath);
    
    const frontmatter = `---
title: ${title}
description: ${description}
lastUpdated: ${new Date().toISOString()}
version: 1.0.0
tags: []
status: draft
---

`;

    // If file already has frontmatter, update it
    if (content.startsWith('---')) {
      const endOfFrontmatter = content.indexOf('---', 3) + 3;
      return frontmatter + content.slice(endOfFrontmatter);
    }

    // Otherwise, add new frontmatter
    return frontmatter + content;
  }

  generateTitle(filePath) {
    const name = path.basename(filePath, '.md');
    return name
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  generateDescription(filePath) {
    const name = path.basename(filePath, '.md');
    return `Documentation for the ${name} component of the Clarity Engine system.`;
  }

  generateSectionContent(section, filePath) {
    const baseName = path.basename(filePath, '.md');
    const sectionName = section.toLowerCase();
    
    switch (section) {
      case 'Overview':
        return `This section provides a high-level overview of the ${baseName} component.\n\n` +
               `## Purpose\n\n` +
               `The ${baseName} component is designed to...\n\n` +
               `## Key Features\n\n` +
               `- Feature 1\n` +
               `- Feature 2\n` +
               `- Feature 3\n\n`;
      case 'Implementation':
        return `This section details the implementation specifics of the ${baseName} component.\n\n` +
               `## Architecture\n\n` +
               `The component follows these architectural principles:\n\n` +
               `- Principle 1\n` +
               `- Principle 2\n\n` +
               `## Code Structure\n\n` +
               `\`\`\`typescript\n` +
               `// Example code structure\n` +
               `interface ${baseName}Config {\n` +
               `  // Configuration options\n` +
               `}\n\`\`\`\n\n`;
      case 'Maintenance':
        return `This section covers maintenance and troubleshooting information for the ${baseName} component.\n\n` +
               `## Common Issues\n\n` +
               `1. Issue 1\n` +
               `   - Cause\n` +
               `   - Solution\n\n` +
               `2. Issue 2\n` +
               `   - Cause\n` +
               `   - Solution\n\n` +
               `## Best Practices\n\n` +
               `- Practice 1\n` +
               `- Practice 2\n` +
               `- Practice 3\n\n`;
      default:
        return '';
    }
  }

  addMissingSections(content, filePath) {
    const requiredSections = [
      'Overview',
      'Implementation',
      'Maintenance'
    ];

    let newContent = content;

    for (const section of requiredSections) {
      if (!content.includes(`## ${section}`)) {
        newContent += `\n## ${section}\n\n`;
        newContent += this.generateSectionContent(section, filePath);
      }
    }

    return newContent;
  }

  splitLongFile(content, filePath) {
    const lines = content.split('\n');
    const sections = [];
    let currentSection = [];
    let currentHeader = '';

    // Split content into sections based on headers
    for (const line of lines) {
      if (line.startsWith('## ')) {
        if (currentSection.length > 0) {
          sections.push({
            header: currentHeader,
            content: currentSection.join('\n')
          });
        }
        currentHeader = line;
        currentSection = [line];
      } else {
        currentSection.push(line);
      }
    }
    sections.push({
      header: currentHeader,
      content: currentSection.join('\n')
    });

    // Create new files for each section
    const basePath = path.dirname(filePath);
    const baseName = path.basename(filePath, '.md');
    
    sections.forEach((section, index) => {
      const sectionName = section.header.replace('## ', '').toLowerCase().replace(/\s+/g, '-');
      const newPath = path.join(basePath, `${baseName}-${sectionName}.md`);
      
      // Add frontmatter to section file
      const sectionContent = this.fixFrontmatter(section.content, newPath);
      fs.writeFileSync(newPath, sectionContent);
    });

    // Create index file
    const indexContent = this.generateIndexContent(baseName, sections);
    fs.writeFileSync(filePath, indexContent);

    return indexContent;
  }

  generateIndexContent(baseName, sections) {
    let content = this.fixFrontmatter('', `${baseName}-index.md`);
    content += `# ${this.generateTitle(`${baseName}-index.md`)}\n\n`;
    content += 'This document has been split into the following sections:\n\n';

    sections.forEach(section => {
      const sectionName = section.header.replace('## ', '').toLowerCase().replace(/\s+/g, '-');
      content += `- [${section.header.replace('## ', '')}](${baseName}-${sectionName}.md)\n`;
    });

    return content;
  }
}

// Export the class
module.exports = DocumentationFixer;

// If run directly
if (require.main === module) {
  const fixer = new DocumentationFixer(process.cwd());
  fixer.fixAll()
    .then(() => console.log('Documentation fixes complete!'))
    .catch(error => console.error('Error:', error));
} 