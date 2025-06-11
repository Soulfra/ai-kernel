#!/bin/bash
echo "Setting up the kernel environment..."
node kernel-slate/scripts/core/ensure-runtime.js
npm install || true
if [ -f requirements.txt ]; then
  pip install -r requirements.txt
else
  echo "[\u2713] No Python dependencies found"
fi
if [ -f generate-agents-doc.js ]; then
  node generate-agents-doc.js
elif [ -f scripts/generate-agents-doc.js ]; then
  node scripts/generate-agents-doc.js
elif [ -f legacy/scripts/generate-agents-doc.js ]; then
  node legacy/scripts/generate-agents-doc.js
fi

if [ -f validate-registry.js ]; then
  node validate-registry.js
elif [ -f scripts/validate-registry.js ]; then
  node scripts/validate-registry.js
elif [ -f legacy/scripts/validate-registry.js ]; then
  node legacy/scripts/validate-registry.js
fi
node kernel-slate/scripts/core/validate-environment.js
