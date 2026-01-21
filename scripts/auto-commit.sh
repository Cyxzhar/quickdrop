#!/bin/bash

# scripts/auto-commit.sh

# Ensure we are in the project root
export PATH=$PATH:/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT" || exit 1

# Log file path
LOG_FILE=".github/ACTIVITY.md"

# Ensure the log file exists
if [ ! -f "$LOG_FILE" ]; then
  mkdir -p .github
  echo "# Activity Log" > "$LOG_FILE"
  echo "Tracking automated maintenance activity." >> "$LOG_FILE"
  echo "" >> "$LOG_FILE"
fi

# Add a new entry with timestamp
echo "- Maintenance check: $(date)" >> "$LOG_FILE"

# Git operations
# Only commit if there are changes
if [[ -n $(git status -s "$LOG_FILE") ]]; then
  git add "$LOG_FILE"
  git commit -m "chore: automated activity log update [skip ci]"
  
  # Push to remote
  # Note: This requires SSH keys or credential helper to be configured
  # Using quiet flag to reduce noise in logs
  git push -q origin main
  
  echo "Successfully pushed activity update for $(date)."
else
  echo "No changes to push."
fi
