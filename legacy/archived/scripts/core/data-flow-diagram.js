const fs = require('fs').promises;
const path = require('path');

class DataFlowDiagram {
  constructor(options = {}) {
    this.options = {
      outputDir: options.outputDir || 'docs/diagrams',
      format: options.format || 'mermaid'
    };
  }

  async generateDiagram(validator) {
    const sources = validator.sources;
    const flows = validator.flows;
    
    let diagram = '';
    
    if (this.options.format === 'mermaid') {
      diagram = this.generateMermaidDiagram(sources, flows);
    } else {
      throw new Error(`Unsupported diagram format: ${this.options.format}`);
    }

    await this.saveDiagram(diagram);
    return diagram;
  }

  generateMermaidDiagram(sources, flows) {
    let diagram = 'graph TD\n';
    
    // Add nodes
    for (const [sourceId, source] of sources) {
      const type = source.type;
      const shape = type === 'primary' ? '(((' : '[[';
      const endShape = type === 'primary' ? ')))' : ']]';
      diagram += `    ${sourceId}${shape}${sourceId}${endShape}\n`;
    }

    // Add edges
    for (const [sourceId, flowSet] of flows) {
      for (const flow of flowSet) {
        diagram += `    ${sourceId} -->|${flow.flowType}| ${flow.targetId}\n`;
      }
    }

    return diagram;
  }

  async saveDiagram(diagram) {
    await fs.mkdir(this.options.outputDir, { recursive: true });
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `data-flow-${timestamp}.${this.options.format}`;
    const filepath = path.join(this.options.outputDir, filename);
    
    await fs.writeFile(filepath, diagram);
    return filepath;
  }
}

module.exports = DataFlowDiagram; 