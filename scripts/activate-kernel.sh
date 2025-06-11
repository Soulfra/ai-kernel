#!/bin/bash
set -e

# Function to check command status
check_status() {
    if [ $? -eq 0 ]; then
        echo "✅ $1"
    else
        echo "❌ $1"
        exit 1
    fi
}

# Function to check if command exists
check_command() {
    if ! command -v $1 &> /dev/null; then
        echo "❌ $1 is not installed"
        exit 1
    fi
}

# Function to check if GitHub user exists
check_github_user() {
    local username=$1
    if ! curl -s "https://github.com/$username" > /dev/null; then
        echo "❌ GitHub user '$username' not found"
        exit 1
    fi
    echo "✅ GitHub user '$username' exists"
}

# Function to check if remote exists
check_remote() {
    local remote=$1
    if git remote | grep -q "^$remote$"; then
        return 0
    else
        return 1
    fi
}

# Function to check if branch exists
check_branch() {
    local branch=$1
    if git show-ref --verify --quiet refs/heads/$branch; then
        return 0
    else
        return 1
    fi
}

# Check required commands
check_command git
check_command curl

# Get GitHub details
read -p "Enter your GitHub username: " GITHUB_USERNAME
read -p "Enter your GitHub repository name (e.g. ai-kernel): " GITHUB_REPO

# Validate GitHub user
check_github_user "$GITHUB_USERNAME"

# Construct remote URL
REMOTE_URL="https://github.com/$GITHUB_USERNAME/$GITHUB_REPO.git"
echo "📦 Remote URL: $REMOTE_URL"

# Initialize repo if not already done
if [ ! -d .git ]; then
    echo "Initializing git repository..."
    git init
    check_status "Git initialization"
    
    git add -A
    check_status "Stage all files"
    
    git commit -m "initial: activate kernel workspace"
    check_status "Initial commit"
fi

# Add or update remote
if check_remote "origin"; then
    echo "Updating existing remote..."
    git remote set-url origin "$REMOTE_URL"
    check_status "Update remote URL"
else
    echo "Adding new remote..."
    git remote add origin "$REMOTE_URL"
    check_status "Add remote"
fi

# Ensure we're on main branch
if [ "$(git branch --show-current)" != "main" ]; then
    if check_branch "main"; then
        git checkout main
        check_status "Switch to main branch"
    else
        git checkout -b main
        check_status "Create and switch to main branch"
    fi
fi

# Push main branch
echo "Pushing main branch..."
git push -u origin main || {
    echo "⚠️  Push to main failed. If this is a new repository, you may need to create it on GitHub first."
    echo "Please create the repository at: $REMOTE_URL"
    exit 1
}
check_status "Push to main"

# Create and push kernel-final-integrity branch
if ! check_branch "kernel-final-integrity"; then
    echo "Creating kernel-final-integrity branch..."
    git checkout -b kernel-final-integrity
    check_status "Create kernel-final-integrity branch"
else
    echo "Switching to existing kernel-final-integrity branch..."
    git checkout kernel-final-integrity
    check_status "Switch to kernel-final-integrity branch"
fi

git push -u origin kernel-final-integrity
check_status "Push kernel-final-integrity branch"

# Switch back to main
git checkout main
check_status "Switch back to main"

# Verify handoff file exists
if [ ! -f "handoff/to-codex/handoff_codex_kernel_final.md" ]; then
    echo "❌ Handoff file not found at handoff/to-codex/handoff_codex_kernel_final.md"
    exit 1
fi

echo "✅ Kernel activation complete!"
echo "📌 Current branch: $(git branch --show-current)"
echo "🔑 Commit: $(git rev-parse --short HEAD)"
echo "📄 Handoff file: handoff/to-codex/handoff_codex_kernel_final.md"
echo "🌐 Remote: $REMOTE_URL"