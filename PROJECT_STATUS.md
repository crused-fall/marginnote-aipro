# Project Status

Last updated: 2026-05-08

## Current phase
- Bridge model-backend slice complete and locally verified.
- The repository now uses a `main`-as-merge-branch model with branch-and-PR support for larger slices, and the next roadmap phase is the remaining `mnaipro` hardening pass.
- The current `mnaipro` hardening slice closed the Node-side adapter parity gap for `remove_comments_by_text` and added a focused regression to keep it aligned with the stable addon shell.

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
- `mnaipro followup latest` and `mnaipro followup apply latest` now surface explicit branch-overview action/fill counts when the second stage comes from `branch_structure_digest`.
- The standalone `marginnote-cli overview` command now exposes a top-level MarginNote-native evidence map across app inspection, doctor, AI overview, and capabilities.
- The standalone `marginnote-cli capabilities` command now also exposes a shared `surfaceDocs` catalog, and its help footer reads from the same command-surface source of truth.
- The standalone `mn-obsidian-bridge capabilities` command now exposes a shared `surfaceDocs` catalog, and the bridge help footer reads from the same command-surface source of truth.
- The bridge now has a provider-agnostic model backend with `/model/run`, `/model/replay`, and `/model/latest` endpoints, dry-run default behavior, persisted request/response/trace artifacts, and raw CLI passthrough for inspection and replay.
- `mnaipro status`, `mnaipro doctor`, and `mnaipro overview` now surface model-backend readiness and latest execution evidence alongside the existing Breakdown and bridge health signals.
- `mnaipro request get|post` now advertises the provider-agnostic model backend routes, including preview `/model/run`, replay `/model/replay`, and latest-trace `/model/latest`.
- `npm run native-ai:templates` now also emits a deterministic `patchExport` proposal surface for whitespace-only prompt normalization, keeping the template governance report preview-only and read-only.
- `plugin/agent-core.js` now has comment-removal parity with the stable addon shell, including a dedicated focused regression path in `scripts/check-plugin-agent-core.js`.
- No open GitHub issues remain.
- The repo is moving toward GitHub issues + PRs as the main collaboration surface.

## Next work
- Start the next roadmap phase: finish the remaining `mnaipro` product-line hardening, especially any selected-branch polish that still needs to be promoted from preview-only to a stable operator surface.

## Last validated locally
- `node --check bridge/model-backend.js`
- `node --check bridge/server.js`
- `node --check cli/mnaipro.js`
- `node --check scripts/check-bridge-model-backend.js`
- `node scripts/check-bridge-model-backend.js`
- `npm run check:ci`
- `npm run check`
- `npm run addon:build`
- `node --check scripts/inspect-latest-followup.js`
- `node --check scripts/inspect-latest-followup-apply.js`
- `node scripts/check-cli-smoke.js`
- `node --check plugin/agent-core.js`
- `node --check plugin/mock-api.js`
- `node --check scripts/check-plugin-agent-core.js`
- `node scripts/check-plugin-agent-core.js`
