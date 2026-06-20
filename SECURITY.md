# Security Policy

## Reporting a Vulnerability
Please do **not** open a public issue for security vulnerabilities. Instead,
use GitHub's private **"Report a vulnerability"** advisory flow on this
repository, or contact the maintainer directly. We aim to acknowledge reports
within 72 hours.

## Secrets & credentials
- This project never commits secrets. Provider API keys (e.g. `API_FOOTBALL_KEY`)
  live only in a local, untracked `.env` file. `.env` is gitignored.
- The default runtime uses the in-memory **mock** data provider and requires no
  credentials, so contributors can run and test the project without secrets.
- If you believe a secret was committed, rotate it immediately and report it.

## Supported versions
The latest tagged release on the default branch is supported.
