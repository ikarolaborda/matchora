#!/usr/bin/env bash
# Git credential helper that serves a SPECIFIC GitHub account's token via the
# gh CLI — without changing gh's globally-active account. Used so this repo can
# push as `ikarolaborda` on a machine where another account is gh-active.
#
# Git invokes a `!`-helper as `<this> <account> <operation>` (the account comes
# from the helper string in git config; the operation is appended by git).
# We only answer `get`; the token is fetched live from the gh keychain and is
# never written to disk.
set -euo pipefail

account="${1:?usage: git-credential-gh-user.sh <github-account> <get|store|erase>}"
operation="${2:-}"

[ "$operation" = "get" ] || exit 0

token="$(gh auth token --user "$account" 2>/dev/null || true)"
if [ -z "$token" ]; then
  # No token for this account: stay silent so git can fall back / fail clearly.
  exit 0
fi

printf 'username=%s\n' "$account"
printf 'password=%s\n' "$token"
