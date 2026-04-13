#!/bin/bash

# Check if inside a git repo
git rev-parse --is-inside-work-tree 2>/dev/null 1>/dev/null
if [ $? -ne 0 ]; then
    echo "Not a git repository. Exiting."
    exit 1
fi

# Get current branch
branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null)

echo "Current branch: $branch"

if [ "$branch" = "main" ]; then
    echo "You are on the main branch."
    read -p "Do you want to make changes here? (y/n): " ans
    if [ "$ans" != "y" ]; then
        # List branches
        echo "Available branches:"
        branches=($(git branch | sed 's/^[* ] //'))
        for i in "${!branches[@]}"; do
            echo "$i) ${branches[$i]}"
        done
        read -p "Enter the number of the branch to checkout: " num
        git checkout "${branches[$num]}"
        branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null)
        echo "Switched to branch: $branch"
    fi
fi

read -p "Do you want to add all files? (y/n): " addall
if [ "$addall" = "y" ]; then
    git add .
else
    # List only non-hidden files
    echo "Untracked/modified non-hidden files:"
    git status --short | awk '{print $2}' | grep -v '/\.' | grep -v '^\.' || echo "No non-hidden files found."
    read -p "Enter files to add (space-separated): " files
    git add $files
fi

git status

read -p "Enter commit message: " msg
git commit -m "$msg"

git push -u origin "$branch"