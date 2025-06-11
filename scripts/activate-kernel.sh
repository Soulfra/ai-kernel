#!/bin/bash
set -e

# Get the GitHub username from the user
read -p "Enter your GitHub username: " GITHUB_USERNAME

# Initialize repo if not already done
if [ ! -d .git ]; then
    echo "Initializing git repository..."
    git init
    git add -A
    git commit -m "initial: activate kernel workspace"
fi

# Add remote if not already done
if ! git remote | grep -q "origin"; then
    echo "Adding GitHub remote..."
    git remote add origin "https://github.com/$GITHUB_USERNAME/ai-kernel-starter.git"
fi

# Push to main
echo "Pushing to main branch..."
git push -u origin main

# Create and push kernel-final-integrity branch
echo "Creating and pushing kernel-final-integrity branch..."
git checkout -b kernel-final-integrity
git push -u origin kernel-final-integrity

# Switch back to main
git checkout main

echo "✅ Kernel activation complete!"
echo "Branch: kernel-final-integrity"
echo "Commit: $(git rev-parse --short HEAD)"
echo "Handoff file: handoff/to-codex/handoff_codex_kernel_final.md" 