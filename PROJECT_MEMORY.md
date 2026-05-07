# Project Memory

Canonical long-term memory for this repository.

## Purpose
- This file stores durable product decisions, boundaries, and long-lived architectural intent.
- GitHub issues and PRs track collaboration state only; they do not replace this file.

## Product lines
- `mnaipro` is the plugin/agent CLI for this repository.
- `marginnote-cli` is the standalone CLI for MarginNote native capabilities.
- `mn-obsidian-bridge` is the standalone CLI for MarginNote ↔ Obsidian bridge diagnostics and evidence.

## Governance model
- `main` is the merge branch.
- Small, verified fixes can go straight to `main`.
- Medium and larger slices should use a short-lived branch and Draft PR.
- Long-term target state belongs in `PROJECT_MEMORY.md`.
- Current phase / milestone tracking belongs in `PROJECT_STATUS.md`.
- Repo-specific operating rules belong in `AGENTS.md`.
- Contributor workflow guidance belongs in `CONTRIBUTING.md`.
- `CODEOWNERS` can be used to keep the maintainer review path visible in GitHub.

## Durable technical decisions
- `mnaipro breakdown smoke` defaults to self-hosted mode and can reuse an explicit bridge via `--bridge-base-url` or `--base-url` before or after the subcommand.
- `mnaipro capabilities` exposes the current `mnaipro` command registry, capability groups, and the shared `surfaceDocs` catalog used by `mnaipro --help` in a stable JSON/text shape.
- `mnaipro overview` is the top-level workflow evidence map for the plugin/agent CLI, combining status, doctor, capabilities, and Breakdown evidence in one stable report.
- `mnaipro breakdown postprocess` falls back to the latest apply report's `afterBranch` snapshot as a proxy input when no dedicated Breakdown artifacts exist, and also exposes a `--live-only` mode that disables that proxy path when we need to compare against true Breakdown artifacts only.
- `bridge/model-backend.js` is a provider-agnostic execution surface with preview/dry-run default behavior, trace persistence, replay hooks, and `/model/run`, `/model/replay`, and `/model/latest` endpoints.
- `mnaipro request post /model/run` is the supported raw preview entrypoint into that model backend, and `mnaipro request get /model/latest` is the supported latest-trace inspection path.
- `mnaipro status`, `mnaipro doctor`, and `mnaipro overview` surface model-backend readiness and latest execution evidence so operators can see the backend state without leaving the main CLI.
- `marginnote-cli overview` is the top-level MarginNote-native evidence map, combining app inspection, doctor, AI overview, and capabilities in one stable report.
- `marginnote-cli capabilities` now also exposes a shared `surfaceDocs` command-surface catalog so `capabilities` and `--help` stay aligned.
- `mn-obsidian-bridge capabilities` and `mn-obsidian-bridge --help` now share a `surfaceDocs` command-surface catalog so the bridge help footer stays aligned with the live registry.
- `npm run native-ai:templates` now also emits a deterministic `patchExport` proposal surface for whitespace-only prompt normalization; it is preview-only and does not write back to MarginNote, while semantic findings remain warnings/recommendations rather than patches.
- `npm run check` remains the broad local validation command.
- `npm run check:ci` is the CI-safe subset used by GitHub Actions.
- `.mnaddon` archives are generated locally from source and should not be tracked in git.
- Release packaging should produce the `.mnaddon` archive outside version control, with git keeping source only.
- The `release-addon` workflow uploads the built archive as a workflow artifact on every run and attaches it to a GitHub Release when the run is triggered by a `v*` tag.
- Public docs should prefer stable repository-relative examples or environment variables over hard-coded machine paths when practical.

## Change discipline
- If a decision changes, update this file first.
- If a work item changes the current phase, update `PROJECT_STATUS.md` in the same change.

## Current long-term direction
- Keep expanding the standalone CLI surfaces so MarginNote native capabilities, the plugin workflow, and the Obsidian bridge stay separated and testable.
- Keep the bridge model backend provider-agnostic by default, with dry-run as the safe preview path and explicit configuration required before real execution.
