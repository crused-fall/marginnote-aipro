# Project Status

Last updated: 2026-05-06

## Current phase
- GitHub governance skeleton adoption.
- The repository now uses a `main`-as-merge-branch model with branch-and-Draft-PR support for larger slices.

## What is in place
- Public GitHub repository exists at `crused-fall/marginnote-aipro`.
- Local `main` tracks `origin/main`.
- Repo-specific operating rules live in `AGENTS.md`.
- Long-term memory now has a dedicated `PROJECT_MEMORY.md`.
- Current phase tracking now has a dedicated `PROJECT_STATUS.md`.
- GitHub issue templates, pull request template, and CI workflow are in place.
- Contributor workflow guidance now lives in `CONTRIBUTING.md`, with `CODEOWNERS` for GitHub review routing.
- The core GitHub label set has been created.
- Open backlog items now exist for public-doc path cleanup and release packaging.
- The repo is moving toward GitHub issues + PRs as the main collaboration surface.

## Next work
- Resolve issue #2: normalize public docs away from machine-specific paths.
- Resolve issue #3: add release packaging workflow for `.mnaddon` builds.
- Decide whether the draft governance PR should be marked ready once those follow-up items are either merged or explicitly deferred.

## Last validated locally
- `node --check scripts/check-ci.js`
- `ruby -e 'require "yaml"; files = Dir[".github/**/*.yml", ".github/**/*.yaml"]; files.each { |f| YAML.load_file(f) }'`
- `npm run check:ci`
- `node --check cli/mnaipro.js`
- `node --check scripts/check-cli-smoke.js`
- `node scripts/check-cli-smoke.js`
- `npm run check`
