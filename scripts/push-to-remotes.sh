#!/bin/bash

# Push to both GitHub and Forgejo remotes
# This script ensures both remotes are updated when pushing to main branch
# Forgejo will trigger Docker build when code is pushed to main branch

set -e

# Get current branch
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)

# Check if we're on main branch
if [ "$CURRENT_BRANCH" != "main" ]; then
    echo "Warning: You are not on the main branch (current: $CURRENT_BRANCH)"
    echo "Docker build will only trigger on main branch pushes to Forgejo"
    read -p "Do you want to continue? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Get commit message for reference
COMMIT_MSG=$(git log -1 --pretty=format:"%s")

echo "Pushing to both remotes..."
echo "Branch: $CURRENT_BRANCH"
echo "Commit: $COMMIT_MSG"
echo

# Push to Forgejo first - this will trigger the Docker build
echo "Pushing to Forgejo (will trigger Docker build)..."
git push forgejo "$CURRENT_BRANCH"

# Push to GitHub
echo "Pushing to GitHub (for backup)..."
git push origin "$CURRENT_BRANCH"

echo
echo "✅ Successfully pushed to both remotes!"
echo "🐳 Docker build will start shortly on Forgejo Actions"
echo "📦 Docker image will be available at: forgejo.hker.me/etklam/diary-vue"
echo
echo "🔍 You can monitor the build at: https://forgejo.hker.me/etklam/diary-vue/actions"