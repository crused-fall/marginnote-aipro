# Project Status

Last updated: 2026-05-07

## Current phase
- GitHub governance baseline complete.
- The repository now uses a `main`-as-merge-branch model with branch-and-PR support for larger slices.

## What is in place
- Public GitHub repository exists at `crused-fall/marginnote-aipro`.
- Local `main` tracks `origin/main`.
- Repo-specific operating rules live in `AGENTS.md`.
- Long-term memory now has a dedicated `PROJECT_MEMORY.md`.
- Current phase tracking now has a dedicated `PROJECT_STATUS.md`.
- GitHub issue templates, pull request template, and CI workflow are in place.
- Contributor workflow guidance now lives in `CONTRIBUTING.md`, with `CODEOWNERS` for GitHub review routing.
- The core GitHub label set has been created.
- The governance skeleton branch was merged through PR #1.
- The release-addon workflow now packages `.mnaddon` builds as artifacts and GitHub Release assets on tag pushes.
- Issue #3 is closed after implementing the release packaging workflow and documenting the release path.
- No open GitHub issues remain.
- The repo is moving toward GitHub issues + PRs as the main collaboration surface.

## Next work
- Choose the next product slice now that the governance baseline is complete.

## Last validated locally
- `git diff --check`
- `npm run addon:build`
- `node --check scripts/check-ci.js`
- `ruby -e 'require "yaml"; files = Dir[".github/**/*.yml", ".github/**/*.yaml"]; files.each { |f| YAML.load_file(f) }'`
- `npm run check:ci`
- `node --check cli/mnaipro.js`
- `node --check scripts/check-cli-smoke.js`
- `node scripts/check-cli-smoke.js`
- `npm run check`
