#!/usr/bin/env bash
# Prepare the root repository for a Vercel Git deployment without staging secrets.
#
# This script deliberately does not commit or push. It preserves the nested
# frontend repository metadata in a sibling backup, removes generated backend
# files from Git's index only, and stages ordinary source files for review.

set -euo pipefail

project_root="$(git rev-parse --show-toplevel)"
cd "$project_root"

git_dir="$(git rev-parse --git-dir)"
if [[ ! -w "$git_dir" ]]; then
  echo "The root Git directory is not writable; refusing to move frontend metadata."
  exit 1
fi

frontend_mode="$(git ls-files --stage -- frontend | awk 'NR == 1 { print $1 }')"
backup_root=""

if [[ "$frontend_mode" == "160000" ]]; then
  if [[ ! -e frontend/.git ]]; then
    echo "frontend/.git is missing; refusing to convert without a recoverable metadata backup."
    exit 1
  fi

  backup_root="$(mktemp -d ../optilink-frontend-git-backup.XXXXXX)"
  mv frontend/.git "$backup_root/.git"
  echo "Nested frontend Git metadata backed up at: $backup_root/.git"

  # Remove only the gitlink from the index; working files remain on disk.
  git rm --cached frontend
elif [[ -z "$frontend_mode" ]]; then
  echo "frontend is not yet in the index; staging its working tree as regular files."
elif [[ "$frontend_mode" == "100644" || "$frontend_mode" == "100755" ]]; then
  echo "frontend is already represented as regular files; continuing idempotently."
else
  echo "Unexpected frontend index mode '$frontend_mode'; refusing conversion."
  exit 1
fi

# Remove generated files from Git's index only; local files remain on disk.
git rm -r --cached --ignore-unmatch -- \
  ':(glob)backend/.venv/**' \
  ':(glob)backend/**/__pycache__/**' \
  ':(glob)backend/**/*.py[cod]'

# Normal git add respects both root and frontend ignore rules, including env files.
git add frontend
git add -- \
  .agentcontext \
  .github \
  .gitignore \
  AGENTS.md \
  FINAL_VERIFICATION.md \
  SECRET_MANAGEMENT.md \
  scripts/prepare-release-tree.sh \
  backend/.env.example \
  backend/.gitignore \
  backend/.vercelignore \
  backend/README.md \
  backend/pyproject.toml \
  backend/app/core/config.py \
  backend/app/db.py \
  backend/app/main.py

if ! git ls-files --error-unmatch frontend/app/page.tsx >/dev/null 2>&1; then
  echo "frontend/app/page.tsx was not staged; do not commit."
  exit 1
fi

staged_paths="$(git diff --cached --name-only --diff-filter=ACMRTUXB)"
while IFS= read -r staged_path; do
  [[ -n "$staged_path" ]] || continue
  staged_name="${staged_path##*/}"
  case "$staged_path" in
    */.venv/*|*/__pycache__/*|*.pyc|*.pyo)
      echo "Secret or generated artifact is staged: $staged_path"
      echo "Remove it from the index before committing."
      exit 1
      ;;
  esac
  case "$staged_name" in
    .env|.env.*)
      if [[ "$staged_name" != ".env.example" ]]; then
        echo "Secret environment file is staged: $staged_path"
        echo "Remove it from the index before committing."
        exit 1
      fi
      ;;
  esac
done <<< "$staged_paths"

echo "Release tree is staged for review. Confirm the following before committing:"
git diff --cached --stat
echo
echo "After review: git commit -m 'fix: prepare frontend and backend for Vercel'"
echo "Then verify: git ls-tree HEAD frontend  # must show mode 040000"
if [[ -n "$backup_root" ]]; then
  echo "The nested frontend metadata remains safely backed up at: $backup_root/.git"
fi
