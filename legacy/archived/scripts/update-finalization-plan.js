const path = require('path');
const fs = require('fs').promises;
const DocumentationOrchestrator = require('./core/documentation-orchestrator');

async function updateFinalizationPlan() {
  const documentationOrchestrator = new DocumentationOrchestrator({
    docsRoot: path.join(__dirname, '../docs'),
    structurePath: path.join(__dirname, '../CLARITY_ENGINE_DOCS/DOCUMENTATION_STRUCTURE.md')
  });
  
  try {
    // Initialize orchestrator
    await documentationOrchestrator.initialize();
    
    // Get documentation report
    const report = await documentationOrchestrator.generateReport();
    
    // Read current Finalization Plan
    const planPath = path.join(__dirname, '../project_meta/plans/FINALIZATION_PLAN.md');
    const planContent = await fs.readFile(planPath, 'utf8');
    
    // Update documentation section
    const updatedContent = updateDocumentationSection(planContent, report);
    
    // Write updated plan
    await fs.writeFile(planPath, updatedContent);
    
    console.log('Finalization Plan updated successfully');
  } catch (error) {
    console.error('Error updating Finalization Plan:', error);
    process.exit(1);
  }
}

function updateDocumentationSection(planContent, report) {
  // Find documentation section
  const docSectionRegex = /## Documentation Progress([\s\S]*?)(?=##|$)/;
  const match = planContent.match(docSectionRegex);
  
  if (!match) {
    return planContent + '\n\n## Documentation Progress\n\n' + generateDocProgress(report);
  }
  
  const updatedSection = generateDocProgress(report);
  return planContent.replace(docSectionRegex, `## Documentation Progress\n\n${updatedSection}`);
}

function generateDocProgress(report) {
  const { stats, validation } = report;
  
  let content = '### Current Status\n\n';
  content += `- Total Documentation Tasks: ${stats.total}\n`;
  content += `- Completed: ${stats.completed}\n`;
  content += `- Pending: ${stats.pending}\n`;
  content += `- Failed: ${stats.failed}\n\n`;
  
  content += '### Validation Results\n\n';
  if (validation.errors.length > 0) {
    content += '#### Errors\n';
    validation.errors.forEach(error => {
      content += `- ${error.type}: ${error.section || error.taskId}\n`;
    });
    content += '\n';
  }
  
  if (validation.warnings.length > 0) {
    content += '#### Warnings\n';
    validation.warnings.forEach(warning => {
      content += `- ${warning.type}: ${warning.message}\n`;
    });
    content += '\n';
  }
  
  content += '### Next Steps\n\n';
  if (stats.pending > 0) {
    content += `1. Process ${stats.pending} pending documentation tasks\n`;
  }
  if (stats.failed > 0) {
    content += `2. Address ${stats.failed} failed documentation tasks\n`;
  }
  if (validation.errors.length > 0) {
    content += `3. Fix ${validation.errors.length} validation errors\n`;
  }
  
  return content;
}

updateFinalizationPlan().catch(console.error); 