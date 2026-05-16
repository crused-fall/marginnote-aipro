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
- The repository is in maintenance-only mode on `main`; phase 7 and phase 8 are complete.
- Long-term target state belongs in `PROJECT_MEMORY.md`.
- Current phase / milestone tracking belongs in `PROJECT_STATUS.md`.
- Repo-specific operating rules belong in `AGENTS.md`.
- Contributor workflow guidance belongs in `CONTRIBUTING.md`.
- `CODEOWNERS` can be used to keep the maintainer review path visible in GitHub.

## Durable technical decisions
- `mnaipro breakdown smoke` defaults to self-hosted mode and can reuse an explicit bridge via `--bridge-base-url` or `--base-url` before or after the subcommand.
- `mnaipro capabilities` exposes the current `mnaipro` command registry, capability groups, and the shared `surfaceDocs` catalog used by `mnaipro --help` in a stable JSON/text shape.
- `mnaipro overview` is the top-level workflow evidence map for the plugin/agent CLI, combining status, doctor, capabilities, and Breakdown evidence in one stable report.
- `mnaipro operator` is the thin launcher on top of the stable `mnaipro` surfaces; it recommends the next stable command from the current health evidence and can optionally execute that command with `--run`, preserving explicit bridge and vault context when it launches the child command. Phase 8 optional expansion completed with this launcher and its docs/smoke coverage.
- `mnaipro breakdown postprocess` falls back to the latest apply report's `afterBranch` snapshot as a proxy input when no dedicated Breakdown artifacts exist, and also exposes a `--live-only` mode that disables that proxy path when we need to compare against true Breakdown artifacts only.
- `mnaipro followup latest` and `mnaipro followup apply latest` now surface explicit branch-overview action/fill counts when the second stage comes from `branch_structure_digest`, so the follow-up diagnostics read like an overview rather than a generic excerpt fill.
- `mnaipro replay latest` and `mnaipro replay after-apply` now surface the same strategy-pack and branch-overview summary in offline replay, so cached-request replay and after-apply replay stay aligned with live follow-up vocabulary.
- `mnaipro` non-summary color correction stays gated by visibility and shape salience: visible notes can still be recolored when the role signal is strong enough, but hidden or deep-offscreen non-summary notes stay out of the first-pass color surface.
- If the first-pass color surface is over capacity, visible recolors that are correcting an existing color stay ahead of fresh color suggestions so explicit fixes are not pruned away.
- The visual-strategy preview order also follows that same correction-first rule, while preserving summary-branch colors as the first visible structural cue.
- Fresh visible color suggestions stay conservative as well: if a visible note has no existing color correction need and the shape signal is weak, it stays out of the first-pass color surface.
- `mnaipro experimental status`, `mnaipro experimental diagnostics`, and `mnaipro experimental registry` are the opt-in experimental surfaces for the plugin/agent CLI; they stay hidden until `MNAIPRO_EXPERIMENTAL=1` is set, and when enabled they report the experimental gate state, latest diagnostic evidence, and gated command registry without changing the stable surface.
- `bridge/model-backend.js` is a provider-agnostic execution surface with preview/dry-run default behavior, trace persistence, replay hooks, and `/model/run`, `/model/replay`, and `/model/latest` endpoints.
- `mnaipro request post /model/run` is the supported raw preview entrypoint into that model backend, `mnaipro request post /model/replay` is the supported replay entrypoint, and `mnaipro request get /model/latest` is the supported latest-trace inspection path.
- `mnaipro status`, `mnaipro doctor`, and `mnaipro overview` surface model-backend readiness and latest execution evidence so operators can see the backend state without leaving the main CLI.
- `mnaipro doctor` and `bridge doctor` tail only the last bounded chunk of very large supervisor logs so diagnostics stay safe when log files grow unexpectedly.
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
- `docs/release-process.md` now captures the canonical release checklist and publish paths, and the release workflow check asserts that it keeps the changelog, validation commands, and publish triggers in sync.
- Phase 7 release hardening is complete on `main` after PR #4 merged; the stable public release path now explicitly centers `CHANGELOG.md`, `docs/release-process.md`, the PR checklist, and the CI-safe smoke gate.
- Phase 8 optional expansion completed with `mnaipro operator` as a thin launcher layer above the stable CLI surfaces, not as a hidden dependency inside them.
- `.mnaddon` archives are generated locally from source and should not be tracked in git.
- Release packaging should produce the `.mnaddon` archive outside version control, with git keeping source only.
- The `release-addon` workflow now runs `npm run check:ci` before building, uploads the built archive as a workflow artifact on every run, and attaches it to a GitHub Release when the run is triggered by a `v*` tag; the smoke gate is portable by construction and the broader local cross-repo sweep remains available through `npm run check`.
- Public docs should prefer stable repository-relative examples or environment variables over hard-coded machine paths when practical.

## Maintenance mode
- No active milestones remain; the repository is in maintenance-only mode.
- Future work should stay scoped as a bugfix slice or a new product slice, with the product-line boundaries preserved.

## Change discipline
- If a decision changes, update this file first.
- If a work item changes the current phase, update `PROJECT_STATUS.md` in the same change.
- When a slice is complete, commit it immediately without asking for confirmation.
- GitHub remote publishes, pushes, merges, and branch cleanup do not need a separate user confirmation once the target repo, branch, and checks are clear.
- Update the relevant memory/status/log files in the same change before moving on to the next slice.

## Current long-term direction
- Keep expanding the standalone CLI surfaces so MarginNote native capabilities, the plugin workflow, and the Obsidian bridge stay separated and testable.
- Keep the bridge model backend provider-agnostic by default, with dry-run as the safe preview path and explicit configuration required before real execution.

## Automation-facing next slices
- The heartbeat automation should read this section first before choosing work.
- Prioritize stability/compatibility hardening, UI/usability improvements, code-review sweeps, and small bug-fix slices before any further feature-style polish.
- When safe maintenance work exists, the heartbeat should stay in a sustained work block and target roughly 10 minutes of focused effort before stopping, unless it has already completed and verified a concrete safe slice.
- The conservative `mnaipro` visual-strategy polish remains a fallback only when a regression or smoke case shows a concrete gap.
- That polish still keeps preview ordering for color actions aligned with the correction-first ranking, so retained recolors appear before fresh suggestions instead of being buried by note order.
- A future experimental slice could expose deeper structural edits beyond note-local writes, but it should remain a separate track with its own verification surface.
- Keep docs and release hygiene aligned when a user-visible change lands, especially the status/memory/log trio plus `README.md` and `docs/mnaipro-cli-quickref.md`.
- Keep product-line and GitHub remote boundaries explicit across the three repos.

## Remaining functional gaps
- The visual organization surface is still intentionally conservative; broader styling is not finished beyond the current role-based first pass and the small stale-color correction now allowed for visibly important notes.
- Structural edits beyond note-local content and metadata writes are still not a stable public surface in the raw helper shell; parent/child rewrites, canvas dragging, and direct layout changes remain suggestion-only or experimental.
- The richer Node-side adapter still models deeper structural writes that the stable helper shell has not yet exposed as a verified public write path.

## Maintenance backlog
- Keep `PROJECT_STATUS.md`, `PROJECT_MEMORY.md`, `PROJECT_LOG.md`, `README.md`, and the quick reference aligned whenever shipped behavior or the maintenance boundary changes.
- Keep the three product lines isolated: `mnaipro`, `marginnote-cli`, and `mn-obsidian-bridge`.
- Keep the CI-safe validation ladder green, especially `npm run check:ci` and `npm run check`, and rerun the narrow smoke checks after documentation or behavior changes.
- Keep `CHANGELOG.md` updated for user-visible changes and keep generated artifacts out of version control.
- Keep archived planning docs clearly historical so they do not read like active work items.

## Prioritized backlog
1. Preserve the maintenance-only boundary first: update status, memory, and log together whenever anything changes.
2. Run stability, compatibility, UI/usability, and bug-fix sweeps on the most recently touched surfaces before any further feature-style polish.
3. Decide whether a future experimental slice should expose deeper structural edits beyond note-local writes.
4. Preserve the standalone product-line separation and avoid new hidden cross-repo coupling.
5. Keep validation, changelog, and release documentation in lockstep.
