const DocumentationValidator = require('./validate-docs');
const DocumentationFixer = require('./fix-docs');
const fs = require('fs');
const path = require('path');

async function runValidation(options = { dryRun: true }) {
    console.log(`Starting documentation validation and fixing process (${options.dryRun ? 'DRY RUN' : 'LIVE'})...`);
    
    // Initialize validator and fixer
    const validator = new DocumentationValidator('./docs');
    const fixer = new DocumentationFixer('./docs', { dryRun: options.dryRun });
    
    // Step 1: Initial validation
    console.log('\nStep 1: Running initial validation...');
    const initialReport = await validator.validateAll();
    console.log('Initial validation complete.');
    console.log('Summary:', JSON.stringify(initialReport.summary, null, 2));
    
    // Step 2: Fix issues
    console.log('\nStep 2: Fixing documentation issues...');
    const fixReport = await fixer.fixAll();
    console.log('Fixes complete.');
    console.log('Summary:', JSON.stringify(fixReport.summary, null, 2));
    
    // Step 3: Final validation
    console.log('\nStep 3: Running final validation...');
    const finalReport = await validator.validateAll();
    console.log('Final validation complete.');
    console.log('Summary:', JSON.stringify(finalReport.summary, null, 2));
    
    // Generate final report
    const report = {
        timestamp: new Date().toISOString(),
        mode: options.dryRun ? 'dry-run' : 'live',
        initial: initialReport.summary,
        afterFixes: fixReport.summary,
        final: finalReport.summary,
        files: finalReport.files,
        proposedChanges: options.dryRun ? fixer.getProposedChanges() : null
    };
    
    // Save report
    const reportPath = path.join('./docs', `validation-report-${options.dryRun ? 'dry-run' : 'live'}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    console.log('\nProcess complete!');
    console.log(`Full report saved to: ${reportPath}`);
    
    if (options.dryRun) {
        console.log('\n📋 This was a dry run. Review the proposed changes in the report before running in live mode.');
        console.log('To apply changes, run: npm run validate-docs -- --live');
    }
    
    // Return success/failure
    return finalReport.summary.failed === 0;
}

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
    dryRun: !args.includes('--live')
};

// Run the process
runValidation(options).then(success => {
    if (success) {
        console.log('\n✅ All documentation issues have been resolved!');
        process.exit(0);
    } else {
        console.log('\n⚠️ Some documentation issues remain. Please review the report for details.');
        process.exit(1);
    }
}).catch(error => {
    console.error('\n❌ Error during validation process:', error);
    process.exit(1);
}); 