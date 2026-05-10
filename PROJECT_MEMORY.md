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
- `mnaipro followup latest` and `mnaipro followup apply latest` now surface explicit branch-overview action/fill counts when the second stage comes from `branch_structure_digest`, so the follow-up diagnostics read like an overview rather than a generic excerpt fill.
- `mnaipro replay latest` and `mnaipro replay after-apply` now surface the same strategy-pack and branch-overview summary in offline replay, so cached-request replay and after-apply replay stay aligned with live follow-up vocabulary.
- `mnaipro experimental status`, `mnaipro experimental diagnostics`, and `mnaipro experimental registry` are the opt-in experimental surfaces for the plugin/agent CLI; they stay hidden until `MNAIPRO_EXPERIMENTAL=1` is set, and when enabled they report the experimental gate state, latest diagnostic evidence, and gated command registry without changing the stable surface.
- `bridge/model-backend.js` is a provider-agnostic execution surface with preview/dry-run default behavior, trace persistence, replay hooks, and `/model/run`, `/model/replay`, and `/model/latest` endpoints.
- `mnaipro request post /model/run` is the supported raw preview entrypoint into that model backend, `mnaipro request post /model/replay` is the supported replay entrypoint, and `mnaipro request get /model/latest` is the supported latest-trace inspection path.
- `mnaipro status`, `mnaipro doctor`, and `mnaipro overview` surface model-backend readiness and latest execution evidence so operators can see the backend state without leaving the main CLI.
- `plugin/agent-core.js` now mirrors the stable addon shell for `remove_comments_by_text` by trying `removeCommentByIndex`, `getCommentIndex + removeCommentByIndex`, `removeCommentByCondition`, and raw comment-array fallbacks in that order, with `scripts/check-plugin-agent-core.js` as the focused parity regression.
- `marginnote-cli overview` is the top-level MarginNote-native evidence map, combining app inspection, doctor, AI overview, and capabilities in one stable report.
- `marginnote-cli capabilities` now also exposes a shared `surfaceDocs` command-surface catalog so `capabilities` and `--help` stay aligned.
- `mn-obsidian-bridge capabilities` and `mn-obsidian-bridge --help` now share a `surfaceDocs` command-surface catalog so the bridge help footer stays aligned with the live registry.
- `npm run native-ai:templates` now also emits a deterministic `patchExport` proposal surface for whitespace-only prompt normalization; it is preview-only and does not write back to MarginNote, while semantic findings remain warnings/recommendations rather than patches.
- `npm run check` remains the broad local validation command.
- `npm run check:ci` is the CI-safe subset used by GitHub Actions, and it now includes the full `scripts/check-cli-smoke.js --portable` regression so the smoke gate stays deterministic even when sibling CLI checkouts are present locally.
- `scripts/check-ci.js` is guarded by `scripts/check-ci-orchestrator.js`, which locks the portable smoke decision in place.
- `scripts/check-cli-smoke-portable.js` is the focused regression for missing sibling checkouts in portable smoke mode.
- `npm run cli:smoke:portable` is the explicit local entrypoint for the CI-safe portable smoke mode, and `scripts/check-cli-smoke.js --help` documents the portable fallback and root override flags.
- Tagged releases should be summarized in `CHANGELOG.md` so release notes stay easy to scan without mining commit history.
- `scripts/check-release-addon-workflow.js` now also asserts that `CHANGELOG.md` has an `Unreleased` section and that the release docs point at it, so the release-note entrypoint stays coupled to the workflow check.
- The pull request template now prompts contributors to update `CHANGELOG.md` when user-visible behavior changes, keeping release notes and review checklists aligned.
- `.mnaddon` archives are generated locally from source and should not be tracked in git.
- Release packaging should produce the `.mnaddon` archive outside version control, with git keeping source only.
- The `release-addon` workflow now runs `npm run check:ci` before building, uploads the built archive as a workflow artifact on every run, and attaches it to a GitHub Release when the run is triggered by a `v*` tag; the smoke gate is portable by construction and the broader local cross-repo sweep remains available through `npm run check`.
- Public docs should prefer stable repository-relative examples or environment variables over hard-coded machine paths when practical.

## Change discipline
- If a decision changes, update this file first.
- If a work item changes the current phase, update `PROJECT_STATUS.md` in the same change.

## Current long-term direction
- Keep expanding the standalone CLI surfaces so MarginNote native capabilities, the plugin workflow, and the Obsidian bridge stay separated and testable.
- Keep the bridge model backend provider-agnostic by default, with dry-run as the safe preview path and explicit configuration required before real execution.
