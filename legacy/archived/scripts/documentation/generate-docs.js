const fs = require('fs');
const path = require('path');
const handlebars = require('handlebars');

class DocumentationGenerator {
    constructor(rootDir) {
        this.rootDir = rootDir;
        this.templatesDir = path.join(rootDir, 'templates');
    }

    async loadTemplate(templateName) {
        const templatePath = path.join(this.templatesDir, templateName);
        if (!fs.existsSync(templatePath)) {
            throw new Error(`Template not found: ${templateName}`);
        }
        return fs.readFileSync(templatePath, 'utf8');
    }

    async generateSection(sectionName, data) {
        try {
            // Load appropriate template
            const templateType = this.determineTemplateType(sectionName);
            const template = await this.loadTemplate(templateType);
            
            // Prepare data
            const sectionData = {
                ...data,
                lastUpdated: new Date().toISOString(),
                version: '1.0.0'
            };
            
            // Generate content
            const compiledTemplate = handlebars.compile(template);
            const content = compiledTemplate(sectionData);
            
            // Create directory if needed
            const sectionDir = path.join(this.rootDir, sectionName);
            if (!fs.existsSync(sectionDir)) {
                fs.mkdirSync(sectionDir, { recursive: true });
            }
            
            // Write file
            const filePath = path.join(sectionDir, 'README.md');
            fs.writeFileSync(filePath, content);
            
            return {
                success: true,
                filePath,
                section: sectionName
            };
        } catch (error) {
            console.error(`Error generating section ${sectionName}:`, error);
            return {
                success: false,
                section: sectionName,
                error: error.message
            };
        }
    }

    determineTemplateType(sectionName) {
        // Map section names to template types
        const templateMap = {
            'core': 'core.md',
            'clarity-engine': 'product.md',
            'document-generator': 'product.md',
            'llm-router': 'product.md',
            'api': 'api.md'
        };
        
        return templateMap[sectionName] || 'core.md';
    }

    async updateMainIndex() {
        const indexPath = path.join(this.rootDir, 'index.md');
        const sections = this.getDocumentationSections();
        
        const indexContent = this.generateIndexContent(sections);
        fs.writeFileSync(indexPath, indexContent);
        
        return {
            success: true,
            filePath: indexPath
        };
    }

    getDocumentationSections() {
        const sections = [];
        const structurePath = path.join(this.rootDir, 'DOCUMENTATION_STRUCTURE.json');
        
        if (fs.existsSync(structurePath)) {
            const structure = JSON.parse(fs.readFileSync(structurePath, 'utf8'));
            for (const [key, value] of Object.entries(structure)) {
                if (key !== 'metadata') {
                    sections.push({
                        title: value.title,
                        description: value.description || '',
                        path: key
                    });
                }
            }
        }
        
        return sections;
    }

    generateIndexContent(sections) {
        let content = '# Documentation Index\n\n';
        
        for (const section of sections) {
            content += `## ${section.title}\n`;
            if (section.description) {
                content += `${section.description}\n\n`;
            }
            content += `[View Documentation](./${section.path}/README.md)\n\n`;
        }
        
        content += `\n---\n*Last Updated: ${new Date().toISOString()}*\n`;
        return content;
    }
}

module.exports = DocumentationGenerator; 