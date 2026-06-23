#!/usr/bin/env bash
# Configure THIS repo (local git config only) to authenticate git over HTTPS as
# a specific GitHub account via the gh CLI, regardless of which account gh has
# globally active. Idempotent — safe to re-run.
#
#   scripts/setup-git-account.sh [github-account]   # default: ikarolaborda
#
# Why: this machine has multiple gh accounts; the globally-active one
# (ikarolaborda-greenmetrics) lacks access to ikarolaborda/matchora, so plain
# `git push` 403s. This pins the credential to `ikarolaborda` for this repo only
# — no `gh auth switch`, so other repos/sessions are unaffected.
set -euo pipefail

ACCOUNT="${1:-ikarolaborda}"
HOST="https://github.com"
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
HELPER="$REPO_ROOT/scripts/git-credential-gh-user.sh"

if ! command -v gh >/dev/null 2>&1; then
  echo "error: gh CLI not found on PATH." >&2
  exit 1
fi
if ! gh auth token --user "$ACCOUNT" >/dev/null 2>&1; then
  echo "error: gh has no token for '$ACCOUNT'. Run: gh auth login (and add that account)." >&2
  exit 1
fi
chmod +x "$HELPER"

# Reset any inherited helper chain for this host in THIS repo, then point at ours.
# The leading empty value clears global helpers (osxkeychain / gcm / gh-active).
git config --local --unset-all "credential.$HOST.helper" 2>/dev/null || true
git config --local --add "credential.$HOST.helper" ""
git config --local --add "credential.$HOST.helper" "!\"$HELPER\" $ACCOUNT"
git config --local "credential.$HOST.username" "$ACCOUNT"

echo "OK: this repo now authenticates git ($HOST) as '$ACCOUNT' (local config only)."
echo "Try: git push"
