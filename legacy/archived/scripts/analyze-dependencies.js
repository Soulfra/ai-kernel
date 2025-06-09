const path = require('path');
const DependencyAnalyzer = require('./unified-migration/core/dependency-analyzer');
const DependencyReporter = require('./unified-migration/core/dependency-reporter');
const DependencyValidator = require('./unified-migration/core/dependency-validator');

async function main() {
  console.log('Starting dependency analysis...');

  // Initialize components
  const analyzer = new DependencyAnalyzer({
    rootDir: process.cwd(),
    excludePatterns: [
      'node_modules',
      '.git',
      'dist',
      'build',
      'coverage'
    ],
    fileExtensions: ['.js', '.md', '.json']
  });

  const reporter = new DependencyReporter({
    outputDir: path.join(process.cwd(), 'project_meta', 'reports'),
    reportName: 'dependency-analysis',
    format: 'both'
  });

  const validator = new DependencyValidator({
    rootDir: process.cwd(),
    validateLinks: true,
    validateDependencies: true,
    validateCircular: true
  });

  try {
    // Analyze dependencies
    console.log('Analyzing dependencies...');
    const graph = await analyzer.buildDependencyGraph();
    console.log(`Found ${Object.keys(graph).length} files to analyze`);

    // Validate dependencies
    console.log('Validating dependencies...');
    const validationResults = await validator.validateDependencyGraph(graph);
    const validationReport = await validator.generateValidationReport(validationResults);

    // Generate reports
    console.log('Generating reports...');
    await reporter.saveReport(graph);

    // Save validation report
    const validationReportPath = path.join(
      process.cwd(),
      'project_meta',
      'reports',
      `dependency-validation-${new Date().toISOString().split('T')[0]}.json`
    );
    require('fs').writeFileSync(
      validationReportPath,
      JSON.stringify(validationReport, null, 2)
    );

    // Print summary
    console.log('\nAnalysis Summary:');
    console.log('----------------');
    console.log(`Total Files: ${validationReport.summary.totalFiles}`);
    console.log(`Valid Files: ${validationReport.summary.validFiles}`);
    console.log(`Invalid Files: ${validationReport.summary.invalidFiles}`);
    console.log(`Total Issues: ${validationReport.summary.totalIssues}`);

    if (validationReport.summary.totalIssues > 0) {
      console.log('\nIssues Found:');
      console.log('-------------');
      Object.entries(validationReport.issues).forEach(([issueType, issues]) => {
        if (issues.length > 0) {
          console.log(`\n${issueType}: ${issues.length} issues`);
          issues.slice(0, 5).forEach(issue => {
            if (issue.file) {
              console.log(`  - ${issue.file}: ${issue.dependency || issue.link || 'Invalid path'}`);
            }
          });
          if (issues.length > 5) {
            console.log(`  ... and ${issues.length - 5} more issues`);
          }
        }
      });

      console.log('\nRecommendations:');
      console.log('----------------');
      validationReport.recommendations.forEach(rec => {
        console.log(`\n${rec.description}:`);
        rec.actions.forEach(action => {
          console.log(`  - ${action}`);
        });
      });
    }

    console.log('\nAnalysis complete!');
    console.log('Reports saved in project_meta/reports/');
  } catch (error) {
    console.error('Error during analysis:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = main; 