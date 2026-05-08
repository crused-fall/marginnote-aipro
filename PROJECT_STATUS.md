# Project Status

Last updated: 2026-05-08

## Current phase
- Bridge model-backend slice complete and locally verified.
- The repository now uses a `main`-as-merge-branch model with branch-and-PR support for larger slices, and the next roadmap phase is the remaining `mnaipro` hardening pass.
- The current `mnaipro` hardening slice closed the Node-side adapter parity gap for `remove_comments_by_text` and added a focused regression to keep it aligned with the stable addon shell.
- The gated `mnaipro experimental status`, `mnaipro experimental diagnostics`, and `mnaipro experimental registry` surfaces are now wired into the CLI, hidden by default, and exposed only when `MNAIPRO_EXPERIMENTAL=1` is set.
- `npm run check:ci` now runs the full `scripts/check-cli-smoke.js --portable` regression, so the stable CLI surface is covered by an actual smoke run in CI without depending on sibling CLI checkouts.
- `scripts/check-ci.js` is now itself guarded by `scripts/check-ci-orchestrator.js`, which keeps the portable smoke decision explicit.
- `scripts/check-cli-smoke-portable.js` now guards the missing-sibling-root portable smoke path directly.
- `npm run cli:smoke:portable` now exists as an explicit local entrypoint for the portable smoke path, and `scripts/check-cli-smoke.js --help` documents the portable fallback and checkout override flags.

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
- The release-addon workflow now runs `npm run check:ci` before packaging, then uploads `.mnaddon` builds as artifacts and GitHub Release assets on tag pushes.
- Issue #3 is closed after implementing the release packaging workflow and documenting the release path.
- The `mnaipro capabilities` command now exposes the live command registry and capability groups.
- The `mnaipro capabilities` command now also exposes the shared `surfaceDocs` catalog used by `mnaipro --help`, so the command-surface help footer and the registry stay in sync.
- The `mnaipro overview` command now exposes a top-level workflow evidence map across status, doctor, capabilities, and Breakdown.
- `mnaipro breakdown postprocess` now falls back to the latest apply report's `afterBranch` snapshot when no dedicated Breakdown artifacts exist, so the preview can still inspect a real branch snapshot.
- `mnaipro breakdown postprocess --live-only` now disables that proxy path, so we can compare true Breakdown artifacts against the proxy baseline without changing the default operator flow.
- `mnaipro followup latest` and `mnaipro followup apply latest` now surface explicit branch-overview action/fill counts when the second stage comes from `branch_structure_digest`.
- The `mnaipro experimental` command group now stays hidden until `MNAIPRO_EXPERIMENTAL=1` is set, and `capabilities` / `--help` only show it in that opt-in mode.
- `scripts/check-cli-smoke.js` now auto-falls back to portable mode when running in CI or when the sibling `marginnote-cli` / `MN-Obsidian-Bridge` checkouts are absent, and `scripts/check-ci.js` now forces that portable mode explicitly so the CI-safe subset stays deterministic.
- The standalone `marginnote-cli overview` command now exposes a top-level MarginNote-native evidence map across app inspection, doctor, AI overview, and capabilities.
- The standalone `marginnote-cli capabilities` command now also exposes a shared `surfaceDocs` catalog, and its help footer reads from the same command-surface source of truth.
- The standalone `mn-obsidian-bridge capabilities` command now exposes a shared `surfaceDocs` catalog, and the bridge help footer reads from the same command-surface source of truth.
- The bridge now has a provider-agnostic model backend with `/model/run`, `/model/replay`, and `/model/latest` endpoints, dry-run default behavior, persisted request/response/trace artifacts, and raw CLI passthrough for inspection and replay.
- `mnaipro replay latest` and `mnaipro replay after-apply` now surface the same strategy-pack and branch-overview summary in offline replay, keeping replay output aligned with the live follow-up vocabulary.
- `mnaipro status`, `mnaipro doctor`, and `mnaipro overview` now surface model-backend readiness and latest execution evidence alongside the existing Breakdown and bridge health signals.
- `mnaipro request get|post` now advertises the provider-agnostic model backend routes, including preview `/model/run`, replay `/model/replay`, and latest-trace `/model/latest`.
- `npm run native-ai:templates` now also emits a deterministic `patchExport` proposal surface for whitespace-only prompt normalization, keeping the template governance report preview-only and read-only.
- `plugin/agent-core.js` now has comment-removal parity with the stable addon shell, including a dedicated focused regression path in `scripts/check-plugin-agent-core.js`.
- No open GitHub issues remain.
- The repo is moving toward GitHub issues + PRs as the main collaboration surface.

## Next work
- Continue the remaining `mnaipro` product-line hardening and decide the next experimental/private capability to gate behind the new surface, or move on to phase 7 release hardening if no concrete private probe is ready.

## Last validated locally
- `node --check cli/mnaipro.js`
- `node --check bridge/experimental/gate.js`
- `node --check bridge/experimental/diagnostics.js`
- `node --check bridge/experimental/registry.js`
- `node scripts/check-experimental-gate.js`
- `node scripts/check-release-addon-workflow.js`
- `CI=true node scripts/check-cli-smoke.js --json`
- `CI=true npm run check:ci`
- `node scripts/check-cli-smoke.js --help`
- `npm run cli:smoke:portable -- --json`
- `node scripts/check-ci-orchestrator.js`
- `node scripts/check-cli-smoke-portable.js`
- `npm run check:ci`
- `node scripts/check-cli-smoke.js`
- `npm run check`
- `MNAIPRO_EXPERIMENTAL=1 node cli/mnaipro.js experimental status --json`
- `MNAIPRO_EXPERIMENTAL=1 node cli/mnaipro.js experimental diagnostics --json`
- `MNAIPRO_EXPERIMENTAL=1 node cli/mnaipro.js experimental registry --json`
