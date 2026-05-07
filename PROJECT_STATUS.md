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
- The `mnaipro capabilities` command now exposes the live command registry and capability groups.
- The `mnaipro capabilities` command now also exposes the shared `surfaceDocs` catalog used by `mnaipro --help`, so the command-surface help footer and the registry stay in sync.
- The `mnaipro overview` command now exposes a top-level workflow evidence map across status, doctor, capabilities, and Breakdown.
- `mnaipro breakdown postprocess` now falls back to the latest apply report's `afterBranch` snapshot when no dedicated Breakdown artifacts exist, so the preview can still inspect a real branch snapshot.
- `mnaipro breakdown postprocess --live-only` now disables that proxy path, so we can compare true Breakdown artifacts against the proxy baseline without changing the default operator flow.
- The standalone `marginnote-cli overview` command now exposes a top-level MarginNote-native evidence map across app inspection, doctor, AI overview, and capabilities.
- The standalone `marginnote-cli capabilities` command now also exposes a shared `surfaceDocs` catalog, and its help footer reads from the same command-surface source of truth.
- The standalone `mn-obsidian-bridge capabilities` command now exposes a shared `surfaceDocs` catalog, and the bridge help footer reads from the same command-surface source of truth.
- `npm run native-ai:templates` now also emits a deterministic `patchExport` proposal surface for whitespace-only prompt normalization, keeping the template governance report preview-only and read-only.
- No open GitHub issues remain.
- The repo is moving toward GitHub issues + PRs as the main collaboration surface.

## Next work
- Decide whether native AI template governance should stay preview-only or gain a separate, explicitly scoped apply path for whitespace-only normalization proposals.

## Last validated locally
- `git diff --check`
- `npm run addon:build`
- `node --check scripts/check-ci.js`
- `ruby -e 'require "yaml"; files = Dir[".github/**/*.yml", ".github/**/*.yaml"]; files.each { |f| YAML.load_file(f) }'`
- `npm run check:ci`
- `node --check cli/mnaipro.js`
- `node cli/mnaipro.js --help`
- `node cli/mnaipro.js overview --json`
- `node cli/mnaipro.js breakdown postprocess --live-only --compact`
- `node --check scripts/check-cli-smoke.js`
- `node scripts/check-cli-smoke.js`
- `npm run native-ai:breakdown-postprocess -- --json`
- `npm run native-ai:breakdown-check`
- `npm run check`
