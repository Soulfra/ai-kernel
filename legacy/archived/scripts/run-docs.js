#!/usr/bin/env node

const DocumentationOrchestrator = require('./documentation-orchestrator');
const path = require('path');

async function main() {
    try {
        // Get the docs directory path
        const docsDir = path.resolve(process.cwd(), 'docs');
        
        // Create orchestrator
        const orchestrator = new DocumentationOrchestrator(docsDir);
        
        // Run the system
        console.log('Starting documentation system...');
        const results = await orchestrator.run();
        
        // Check results
        if (results.validation.exceedsLimit > 0) {
            console.error('\n❌ Some files exceed the 250-line limit!');
            process.exit(1);
        }
        
        if (results.validation.needsExpansion > 0) {
            console.warn('\n⚠️ Some files need expansion');
        }
        
        console.log('\n✅ Documentation system completed successfully!');
        console.log('📊 Summary:');
        console.log(`   - Total files: ${results.validation.totalFiles}`);
        console.log(`   - Files needing expansion: ${results.validation.needsExpansion}`);
        console.log(`   - Files exceeding limit: ${results.validation.exceedsLimit}`);
        console.log(`   - Generated sections: ${results.generation.length}`);
        
    } catch (error) {
        console.error('\n❌ Documentation system failed:', error);
        process.exit(1);
    }
}

// Run the script
main(); 