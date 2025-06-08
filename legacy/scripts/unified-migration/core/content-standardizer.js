const fs = require('fs');
const path = require('path');

const RULES_PATH = path.join(process.cwd(), '.cursorrules.json');
const rules = JSON.parse(fs.readFileSync(RULES_PATH, 'utf8'));

class ContentStandardizer {
  constructor() {
    this.requiredFields = rules.requiredDocFields || ['title', 'description', 'lastUpdated', 'version'];
  }

  // ... rest of the code remains unchanged ...
}

// ... rest of the file remains unchanged ... 