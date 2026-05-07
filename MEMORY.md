# Legacy Memory Archive

Canonical long-term memory now lives in `PROJECT_MEMORY.md`.
Current phase tracking lives in `PROJECT_STATUS.md`.

Last updated: 2026-05-06

## Project Goal

Build a MarginNote plugin that makes MarginNote's AI feel more like a real agent, with a practical first focus on organizing mind maps and card trees.

In concrete terms, we want the plugin to help with tasks like:

- normalizing messy card titles
- adding useful tags
- adjusting card colors to reflect branch roles or reading status
- appending concise review comments
- identifying weak or overloaded branches
- suggesting better structure for a selected subtree

The long-term goal is to support stronger mind map organization workflows, including structural cleanup and clearer visual organization through card styling. The short-term goal is to ship a reliable and safe agent-assisted organizer that works with the public plugin API.

## Current Product Direction

We are building this as two layers:

1. MarginNote plugin executor
   Reads the current selection, sends context to a planner, and applies safe actions.
2. Local agent bridge
   Holds planning logic and later will call a real LLM.

This split is intentional. It keeps model access and planning outside the MarginNote addon runtime, while keeping note mutations inside the plugin where the context and execution target live.

We now also have a clearer positioning constraint from direct local research on MarginNote 4:

- native MarginNote AI is already broader than chat and behaves like a partially internal agent system
- it includes inline chat, study modes, AI OCR, AI Breakdown, prompt modules, tool-style operations, edit confirmation, and credit/quota control
- our plugin should therefore augment and supervise workflows instead of rebuilding a weaker duplicate chat surface

## Current Implementation Status

Implemented:

- local bridge service at `bridge/server.js`
- shared planner core at `bridge/planner.js`
- stable helper-shell addon entry at `main.js`
- addon packaging files: `mnaddon.json`, `jsconfig.json`, `index.d.ts`
- plugin execution core at `plugin/agent-core.js`
- command wrapper at `plugin/index.js`
- mock MarginNote API at `plugin/mock-api.js`
- dry-run script at `scripts/dry-run.js`
- first command spec at `docs/command-organize-selected-branch.md`
- design docs in `docs/`
- preview artifact saving in the addon shell: full JSON plan plus a text summary
- apply artifact saving in the addon shell: structured execution JSON plus a text summary with applied/skipped counts
- branch-level apply verification in the addon shell: selected-note before/after snapshots, changed-note diff, helper API path logging, and halt-on-error execution flow
- local report inspection script at `scripts/inspect-latest-apply.js`
- offline request replay script at `scripts/replay-requests.js`
- local command-line wrapper at `cli/mnaipro.js` with a `mnaipro` bin entry for bridge status, doctor checks, latest-report inspection, replay, Breakdown smoke, and raw request passthrough
- standalone `marginnote-cli` CLI at `/Users/cfall/Documents/Programs/marginnote-cli` for MarginNote native capability inspection, local evidence reading, and supported native AI preference writes
- standalone `mn-obsidian-bridge` CLI at `/Users/cfall/Documents/Programs/MN-Obsidian-bridge` for MarginNote ↔ Obsidian bridge diagnostics, archive evidence reading, and supported Obsidian sync-setting writes
- local `marginnote` Codex skill at `/Users/cfall/.codex/skills/marginnote` for routing MarginNote tasks to the right CLI surface instead of inventing a new runtime
- the repo README and agent-plugin design doc now explicitly describe that `marginnote` routing layer so the surface split stays visible to humans too
- both standalone CLIs now expose `capabilities` commands that list their command registries and capability groups in a stable JSON/text shape
- both standalone CLIs now expose conservative write surfaces with explicit `--dry-run` support:
  - `marginnote-cli ai preferences export|restore|set|patch|reset`
  - `mn-obsidian-bridge ob settings export|restore|set|patch|reset`
- both standalone CLIs now support two export shapes on those supported write surfaces: a default patch-compatible JSON object and a full `--snapshot` envelope that can later be restored
- both standalone CLIs now support preview-first `restore` commands that accept either full snapshot envelopes or plain patch objects; patch-only restore stays conservative and does not invent reset behavior
- dry-run write reports for `set` and `patch` now synthesize the after-state instead of merely echoing current settings, so preview output is closer to the real apply result
- `doctor` / `overview` outputs on both CLIs now also point at the matching snapshot / restore workflow, so the backup-preview path is visible from diagnostics instead of only from help text
- `status --compact` on both CLIs now also emits a short `next=` hint for the same snapshot / restore workflow, so the backup path stays visible in the fastest status checks too
- the unified CLI smoke test now exercises those write surfaces, `--snapshot` export flows, and `restore --dry-run` flows, so the supported read/write boundary stays covered by regression checks
- the unified CLI smoke test now also covers real apply + readback for `set`, `patch`, `reset`, and `restore` on both standalone CLIs using temporary domains / vaults, so write coverage stays safe and repeatable
- the current capability registry counts are 23 commands for `marginnote-cli` and 18 commands for `mn-obsidian-bridge`
- `mn-obsidian-bridge overview` now exposes a top-level bridge evidence map across MarginNote, Obsidian, settings, export roots, and archive traces
- `marginnote-cli ai status` now exposes a concise native-AI health summary with signal, prompt-module, OCR, and container-trace counts
- `marginnote-cli ai prompts` now exposes a focused prompt-module / tool-contract report with category coverage
- `marginnote-cli ai study` now exposes a focused Guide / Quiz / Explain study-mode view
- `marginnote-cli ai traces` now exposes a focused Breakdown / persistence trace view with a diagnostic tree
- `marginnote-cli ai memory` now exposes a focused chat-memory / conversation-trace view
- `mn-obsidian-bridge ob settings` now exposes a focused Obsidian sync settings summary plus resolved export-root / export-scan evidence, a next-file-to-check diagnostic tree, and a stable JSON envelope for script consumers
- `mn-obsidian-bridge overview` now exposes a top-level bridge evidence map across MarginNote, Obsidian, settings, export roots, and archive traces
- shared Obsidian sync settings helper at `bridge/obsidian-sync.js`, reused by `bridge/server.js`, `cli/mnaipro.js`, and `scripts/bridge-doctor.js` so the status/doctor/HTTP bridge paths stay in sync
- bridge-management subcommands now live under `mnaipro bridge` for status, doctor, render, and reload
- `mnaipro bridge logs` now exposes local and installed supervisor/bridge logs from the same CLI surface
- `mnaipro bridge logs` also supports follow mode for live refreshes
- `mn-obsidian-bridge ob settings restore` now correctly applies `missingKeys` by deleting them on write, so snapshot restore and readback stay aligned
- `mnaipro status` now carries the same Obsidian sync settings summary / expected `data.json` path evidence as `mnaipro doctor`, so the quick status check and fuller diagnostic view stay aligned
- `mnaipro status --compact` and `mnaipro doctor --compact` now also emit a Breakdown drill-down `next=` hint, pointing to `mnaipro breakdown postprocess --json` when the latest chain is complete and `mnaipro breakdown artifacts --json` otherwise
- `mnaipro doctor` and `npm run bridge:doctor` now surface the Obsidian sync settings summary / expected `data.json` path alongside the bridge health evidence, so the root diagnostics line up with the standalone bridge CLI
- the local `/status` HTTP response and `mnaipro bridge status` now carry the same Obsidian sync settings summary / expected `data.json` path evidence too, so every bridge-facing status entrypoint exposes the same local vault signal
- the local `/status` HTTP response and `mnaipro bridge status` now also carry the same Breakdown drill-down `breakdownNextCommand` hint, keeping the raw bridge payload aligned with the CLI-side health checks
- dedicated regression checks now cover the Breakdown `next=` hint on `mnaipro status`, `mnaipro doctor`, `mnaipro bridge status`, and raw `/status`, so that hint stays aligned across CLI and HTTP surfaces
- the dedicated `mnaipro breakdown artifacts` audit now also carries the same `nextCommand` recommendation, so the deep audit surface and the lighter health checks point to the same next step
- the dedicated `mnaipro breakdown artifacts --compact` output now prints `next=mnaipro breakdown artifacts --json` in the current partial-cache state, and complete chains will point to `mnaipro breakdown postprocess --json`
- `mnaipro breakdown postprocess` now also carries `nextCommand = mnaipro breakdown artifacts --json`, and its compact output mirrors that same hint, so the preview surface points directly at the companion cache-audit command
- `mnaipro followup apply latest` now exposes the latest second-stage execution artifact directly, with JSON and compact output variants, so we can inspect the follow-up apply snapshot without hunting through the reports folder
- `mnaipro status --json` now also carries `latestFollowupApply` when that second-stage execution artifact exists, so the quick health view exposes the same follow-up apply pointer as the deeper artifact commands
- `mnaipro status --compact` and `mnaipro doctor --compact` now also emit `followup_apply=1` plus `followup_apply_request=...` when that second-stage execution artifact exists, keeping the second-stage execution snapshot visible and directly identifiable in one-line health checks too
- `mnaipro doctor --json` now also carries `latestFollowupApply` when that second-stage execution artifact exists, so the higher-level health view can point at the same follow-up apply snapshot
- `scripts/bridge-doctor.js` now also exposes `latestFollowupApply` at the top level, and the CLI smoke test pins it with a temporary Breakdown fixture instead of relying on the live cache
- `scripts/bridge-doctor.js` summary text now says whether follow-up apply is present and includes the request id when available, so the JSON doctor snapshot is easier to scan without opening nested fields
- `bridge/supervisor-state.js` now provides a shared lifecycle state file (`bridge-state.json`) for the supervisor, bridge status, and bridge doctor surfaces, so bridge ownership can be reported as `spawned`, `adopted`, `external`, or `stopped`
- `mnaipro status --compact`, `mnaipro doctor --compact`, and `mnaipro doctor` text output now include `bridge_supervisor` ownership plus the tracked bridge pid when that shared state exists
- the CLI smoke test now also pins the `mnaipro doctor` text-mode bridge supervisor line, so the ownership/pid wording stays stable alongside the compact form
- `mnaipro status --compact`, `mnaipro doctor --compact`, and the matching bridge/doctor smoke paths now expose `followup_apply_request=...` alongside the boolean hint, so second-stage results are easier to identify without opening JSON
- the raw bridge `/status` payload and `scripts/bridge-status.js` now also expose `latestFollowupApply` at the top level, so consumers no longer need to drill through `latest.followupApply` to find the second-stage apply snapshot
- `scripts/check-native-ai-breakdown-smoke.js` now includes a grouped-overview Breakdown fixture in addition to the visible and organized-enough cases, so the branch-overview digest path is covered with a grouped subtree instead of only the leaf-only sample
- `scripts/check-native-ai-breakdown-smoke.js` now safely supports both self-hosted and external bridge modes, reports the bridge mode in compact output, and can attach to an existing local bridge via `--bridge-base-url` / `MN_AGENT_BASE_URL`; `npm run native-ai:breakdown-smoke:live` is the shortcut for the default localhost bridge
- `mnaipro breakdown smoke` now forwards an explicit `--bridge-base-url`, and also respects either a local `--base-url` after the subcommand or an explicitly supplied top-level `--base-url`, so the wrapper can reuse an already running bridge while still self-hosting by default
- `mnaipro breakdown smoke --help` and the top-level help footer now advertise both bridge-reuse forms, so the inherited bridge path is discoverable without opening the docs
- `scripts/check-cli-smoke.js` now pins that smoke help text too, so the bridge-reuse notes stay visible in regression runs
- `docs/bridge-ops-quickstart.md` now documents the Breakdown smoke bridge-reuse flow alongside the normal self-hosted smoke path
- `docs/bridge-supervisor.md` now mentions the Breakdown smoke bridge-reuse flow as part of bridge lifecycle debugging
- the main README and quick reference now both show the bridge-reuse Breakdown smoke examples, so the inherited bridge path is visible in the copy-paste entrypoints too
- `scripts/bridge-supervisor.js` now adopts a pre-existing bridge pid that matches the managed command line, and a new `bridge:supervisor:check` regression verifies that the supervisor can still stop that bridge when MarginNote is forced closed
- CLI quick reference docs now live in `docs/mnaipro-cli-quickref.md`
- both standalone CLIs now expose stable `capabilities` commands, and the project-level smoke test checks those registries so the command surfaces stay in sync over time
- `marginnote-cli ai status` now exposes a concise native-AI health summary with signal, prompt-module, OCR, and container-trace counts
- `marginnote-cli ai overview` now exposes a top-level native-AI capability map across prompts, study, memory, traces, OCR, and Breakdown
- `marginnote-cli ai boundaries` now exposes a visible-vs-restricted native-AI boundary map with can / cannot evidence
- `marginnote-cli ai memory` now exposes a focused chat-memory / conversation-trace view
- `mn-obsidian-bridge ob settings` now exposes a focused Obsidian sync settings summary plus resolved export-root and export-scan evidence, and its JSON now carries a stable schema envelope
- the unified smoke test now checks both of those focused commands so the new surfaces stay locked in regression
- first controlled visual organizer action:
  - role-based `set_color_index` planning, preview formatting, and execution support

Verified:

- static checks pass via `npm run check`
- `npm link` now exposes the new `mnaipro` binary on PATH, and `mnaipro --help`, `mnaipro doctor`, and `mnaipro breakdown smoke --json` all work
- local dry-run planning flow works end to end
- code now models the intended two-step flow: preview first, then safe apply
- `mnaddon4 build` succeeds and produces `mnaipro.mnaddon`
- `mnaddon4 watch` successfully syncs the addon into MarginNote's Extensions folder
- `mnaddon4 restart` successfully restarts MarginNote after addon sync
- MarginNote shows the addon startup success popup, confirming that the addon shell is executing inside the app
- the addon writes request and response files through the local bridge queue successfully
- real preview artifacts are being generated under the local bridge `reports/` directory
- returned actions currently include:
  - `set_title`
  - `set_color_index`
  - `append_tags`
  - `append_comment`
  - `rewrite_excerpt`
  - `remove_comments_by_text`
- the locally installed MarginNote 4 app bundle and container clearly contain native AI assets and runtime traces, including:
  - inline chat / chat with AI
  - study modes: guide / quiz / explain
  - AI OCR templates with multi-field extraction
  - AI Breakdown workflows and progress hooks
  - system prompts, preset prompts, custom prompts, and prompt optimization
  - tool-call style internal AI operations with confirmation / rejection UX
- local prompt modules explicitly reference internal AI tools such as:
  - `get_card_meta`
  - `get_card_content`
  - `get_page_content`
  - `get_studyset_structure`
  - `get_document_toc`
  - `search_in_database`
  - `fetch_url`
  - `create_card`
  - `create_card_tree`
  - `set_card_meta`
  - `set_card_content`
  - `move_cards_in_hierarchy`
  - `merge_cards`
  - `delete_cards`
- the local MarginNote container includes `ChatMemories` and `AIBreakdownProgress` directories, supporting the conclusion that native chat memory and background AI task concepts exist even though those directories are currently empty on this machine
- the obvious sqlite path at `.MN4NotebookDatabase/MarginNotes.sqlite` is currently an empty placeholder file on this machine, so we should not assume native AI state is exposed through a stable local database path

## Current Assumptions

- Phase 1 should prioritize reliability over ambition.
- The first real user-facing command is:
  `整理当前选中分支`
- We should mutate only the selected subtree by default.
- We should prefer dry-run and explainable action plans before aggressive automation.
- We should prefer the most stable addon integration path first, while allowing a mixed approach if that reduces delivery risk.
- The first version should default to `dry-run`, then let the user confirm before applying safe actions.
- Native MarginNote AI should be treated as an adjacent system we may augment, not a capability vacuum we need to replace.
- Some high-value native AI functions likely remain private / internal and may not be safely reachable from the public addon API.
- Our strategic advantage is more likely to come from branch-level collection, planning, preview, audit, replay, and controlled execution than from building a generic chat UI.
- The primary command should now prioritize visible branch organization and readable summaries over invisible semantic-tag churn; if a branch yields only bulk tags, that should be treated as "already organized enough" rather than surfaced as the main outcome.
- Visual cleanup is now part of the product goal, and the first controlled color action can ship now as long as it stays preview-first, explainable, and conservative about recoloring already-styled cards.
- The first color pass should stay intentionally conservative: keep branch-summary recolors, then only surface a small number of the strongest non-summary role-color suggestions per run.
- When visual shape signals are present, first-pass recolors should be biased toward notes that are actually visible and visually important in the current mind map, not deep hidden leaves.

## Known Constraints

Based on the current MarginNote / OhMyMN public API understanding:

Clearly supported:

- read selected nodes
- inspect parent/child/ancestor/descendant relationships
- read excerpts, comments, and combined text
- edit title
- rewrite main excerpt

Supported in the richer Node-side adapter design, but not yet clearly writable in the stable raw helper shell:
- deeper structural edits beyond note-local content/metadata writes

Not yet confirmed as safe public API operations:

- changing parent-child relationships
- dragging nodes on the canvas
- changing branch layout directly
- bulk visual rearrangement of the mind map

Because of that, true structural edits are currently treated as:

- `suggest_only` by default
- `experimental` only if we later choose to use private APIs or UI automation

## Non-Goals For Now

We are not trying to build:

- a full desktop-wide agent
- unrestricted UI automation from day one
- silent structural rewrites of large note trees
- a cloud-first system that depends on remote infrastructure before local workflows are proven

## Decision Log

2026-04-11

- Decided to use a two-layer architecture: plugin executor plus local bridge.
- Decided that Phase 1 focuses on safe metadata/content edits, not structural tree mutations.
- Decided to create a persistent project memory file and keep updating it as the project evolves.
- Decided that the first command name is `整理当前选中分支`.
- Decided to choose the more stable integration path first, and use a mixed approach if it improves stability or compatibility.
- Decided that `整理当前选中分支` should default to preview-first (`dry-run`) behavior.
- Decided that safe actions should be applied only after preview confirmation in the first version.
- Decided to prefer a stable helper-based addon shell, while borrowing API patterns and implementation ideas from OhMyMN where helpful.
- Verified that the stable helper shell is suitable for packaging and preview flow, but currently appears weaker than the richer adapter for writable tags/comments.
- Decided that the first real addon shell should still use the stable helper route, with mixed integration reserved for richer note writes.
- Verified that the project now builds into a real `.mnaddon` package artifact.
- Verified that the addon can be live-synced into the local MarginNote installation through the helper workflow.
- Verified by live user observation that the startup test popup appears inside MarginNote.
- Verified from a real plan artifact that one preview generated 221 actions consisting only of `append_comment` and `append_tags`, which explained why the old safe-apply path skipped everything.
- Updated the addon apply layer to attempt `append_comment` and `append_tags` in the stable shell as well, instead of only `set_title` and `rewrite_excerpt`.
- Updated preview UX so preview-only mode explicitly tells the user that files were generated and where to find them.
- Verified by live user testing that preview-only now shows generated preview information correctly, and safe apply now executes successfully.
- Upgraded the in-app preview from a single summary popup to a paginated detailed preview grouped by note, so the user can review planned edits inside MarginNote before applying them.
- Fixed a blind-spot in branch collection where the addon had been sending empty `tags` and `commentsText` arrays to the bridge; the planner now receives real existing tags/comments.
- Upgraded the bridge planner from "leave a comment on every node" to issue-driven heuristics: title repair, missing excerpt fill, semantic tags, duplicate-title warnings, and overloaded-branch suggestions with explicit reasons.
- Tightened comment policy again after live feedback: organizer comments should no longer describe what the agent just did. Comments are now reserved for real structural suggestions, and the planner can remove legacy `Agent review...` trace comments from older runs.
- Verified a MarginNote-specific edge case: some legacy visible comments appear in `allText` but not in `commentsText`. The planner now detects legacy organizer comments from `allText` too, and the executor falls back to pattern-based deletion when exact comment lookup is unavailable.
- Upgraded the in-app approval flow again: users can now exclude specific notes from execution inside the preview flow, instead of only applying the whole plan.
- Added a launchd-backed bridge supervisor so the local bridge can follow MarginNote lifecycle more reliably: when MarginNote is open the supervisor keeps the bridge up, and when MarginNote closes it stops the bridge.

2026-04-29

- Decided to keep the standalone CLI smoke tests on temporary preference domains / temporary vaults so real apply + readback coverage stays safe on the local machine.
- Fixed `mn-obsidian-bridge ob settings restore` so `missingKeys` are actually deleted on apply, which keeps restore write behavior aligned with the readback contract.
- Installed the user launch agent at `~/Library/LaunchAgents/com.mnaipro.bridge-supervisor.plist` and verified the launchd-managed bridge health outside the sandbox.
- Tightened organizer-text cleanup further after live testing: the planner no longer appends new organizer comments by default, and it now treats legacy organizer text in both comments and excerpts as cleanup targets.
- Verified another MarginNote-specific residue mode: organizer text can survive only in `allText` as repeated visible lines even when `commentsText` and `mainExcerptText` are empty. The planner now extracts those lines directly from raw `allText` and emits cleanup actions for them.
- Added structured apply execution reporting in the addon shell. After safe apply, the plugin now saves an execution JSON artifact with per-action before/after snapshots, skip reasons, and observed change fields, plus a text summary for faster debugging of "said it executed but nothing changed" cases.
- Verified locally that the updated addon passes `npm run check`, builds again via `npm run addon:build`, syncs the latest `main.js` into the installed MarginNote extension folder, and restarts MarginNote successfully.
- Strengthened apply verification again so one execution artifact now also records selected-note branch snapshots before and after apply, a branch diff of actually changed notes/fields, the concrete helper API path used per action, and whether execution halted after a hard runtime error instead of continuing blindly.
- Added `npm run report:latest` to summarize the newest apply artifact from the bridge reports folder, allowing offline diagnosis even when no one is available to manually describe what happened in the app.
- Split deterministic planning logic out of `bridge/server.js` into `bridge/planner.js`, so the live bridge and offline tooling now share exactly the same planner implementation.
- Added offline replay commands `npm run replay:latest` and `npm run replay:all`, and verified locally that 21 cached real-world request files still reproduce their saved responses exactly after the planner refactor.


2026-04-22

- Added `marginnote-cli ai status` as the concise native-AI status command, using the existing `nativeAi.inspect()` evidence without broadening the supported preference-write boundary.
- Added `marginnote-cli ai overview` as the top-level native-AI capability map, so one command can summarize the prompt, study, memory, trace, OCR, and Breakdown surfaces.
- Added `marginnote-cli ai boundaries` as a visible-vs-restricted native-AI boundary map, so we can tell the difference between evidenced capability, direct-hook restrictions, and currently missing surfaces.
- Added `marginnote-cli ai prompts` as the next native-AI capability-area command, focusing on prompt modules, tool names, and category coverage.
- Added `marginnote-cli ai study` as a focused Guide / Quiz / Explain study-mode command, keeping it adjacent to the prompt surface.
- Added `marginnote-cli ai traces` as a focused Breakdown / persistence trace command, making the native-AI trace evidence more explicit and actionable.
- Added `marginnote-cli ai memory` as a focused chat-memory / conversation-trace command, keeping the evidence model aligned with the native persistence traces.
- Added `mn-obsidian-bridge ob settings` as the focused Obsidian sync settings / resolved export-root scan command, and then expanded it into a small diagnostic tree that points at the next file to inspect and a stable JSON envelope for script consumers.
- Added `mn-obsidian-bridge overview` as a top-level bridge evidence map, so one command can summarize the MarginNote side, the Obsidian side, settings visibility, export roots, and archive traces without losing the conservative boundary.
- Extended the shared smoke test so both new focused commands are part of the regression surface.
- Kept the long-term direction for `marginnote-cli` open-ended: first it is a diagnostics CLI, but its eventual target is still broader MarginNote-native command coverage.


2026-04-21

- Locked the product boundary into three separate CLI lines: `mnaipro` remains the plugin/agent CLI, `marginnote-cli` is the standalone MarginNote-native CLI with supported AI preference writes, and `mn-obsidian-bridge` is the standalone MarginNote ↔ Obsidian diagnostics CLI with supported sync-setting writes.
- Created and linked the new `mn-obsidian-bridge` command with `doctor`, `mn status|inspect|report`, `ob status|inspect|report`, and raw `read` escape hatch commands.
- Kept the new bridge CLI conservative in v1 so it can diagnose exported Markdown, Canvas files, PDF link blocks, vault settings, and Codex archive evidence without triggering export or scan actions beyond the supported settings write surface.
- Confirmed a real local Obsidian vault for bridge diagnostics at `/Users/cfall/Documents/Obsidian-vaults/Proactive_info_base`, and a real MN container evidence root at `/Users/cfall/Library/Containers/QReader.MarginStudy.easy/Data/Documents`.
- Added local Codex companion skills for `marginnote-cli` and `mn-obsidian-bridge` under `~/.codex/skills`, each with conservative boundaries, raw `read` escape hatches, supported write examples, and copy-paste examples.
- Added a unified root smoke test entry at `npm run cli:smoke` that exercises both CLIs with `doctor`, path inventory, and raw `read` checks against the known local vault / container evidence.
- Added `npm run cli:smoke:json` and `npm run cli:smoke:compact` wrappers so the unified smoke test now has stable machine-readable and one-line output variants.
- Expanded `marginnote-cli` with an `app inventory` command and deeper `app inspect` output so the CLI now exposes bundle, resource, and container path evidence directly.
- Expanded `mn-obsidian-bridge` with `mn inventory` and `ob inventory` commands so the bridge can surface path-focused addon, vault, export, archive, and concise sync settings evidence separately from the broader reports.
- Exposed a compact `settingsSummary` block from `mn-obsidian-bridge ob inventory`, and taught the unified smoke test to report missing Obsidian sync `data.json` files cleanly instead of treating them as hard failures.
- Hoisted the Obsidian sync `settingsSummary` evidence into higher-level `doctor` and `report` outputs as well, so the bridge CLI now carries the same settings-path signal from inventory through the broader diagnosis layers.
- Threaded the same Obsidian sync settings summary into `mnaipro doctor` and the standalone `npm run bridge:doctor` report, keeping the root bridge diagnostics aligned with the standalone bridge CLI while staying conservative.
- Extended `mnaipro status` and `mnaipro bridge status` to carry the same settings summary / path evidence, so the fast status path and the doctor path now show the same local Obsidian vault signal.

2026-04-16

- Deeply inspected the locally installed MarginNote 4 app and confirmed that its native AI is a real multi-mode system, not just a thin chat wrapper.
- Confirmed from local prompt modules that native AI already uses an internal tool-call model with pre-execution explanation and user confirmation, which is conceptually close to an agent workflow.
- Confirmed that the built-in AI scope includes document Q&A, mind map Q&A, database search, AI OCR card generation, AI Breakdown, study modes, prompt optimization, and custom template / few-shot workflows.
- Decided to position our plugin as an augmentation and supervision layer over MarginNote workflows rather than as a replacement chat interface.
- Decided that future plugin value should center on branch-level organization, stronger preview and auditability, deterministic execution, and workflow control around selected subtrees.
- Upgraded the deterministic planner so unsupported structural output is now more specific: instead of only generic warnings, it can propose branch split groupings and sibling-title disambiguation suggestions for preview.
- Extended that branch organizer step further: when sibling-title disambiguation proposals are specific, unique, and non-placeholder, the planner now upgrades them into safe `set_title` actions while still showing the structural suggestion context in preview.
- Added planner metadata to both safe actions and unsupported structural suggestions: plans now carry `source`, `confidence`, and brief evidence fields so preview, audit, and future gating logic can rely on something more explicit than plain reason text.
- Added explicit execution tiers to planned actions (`safe_auto`, `review_required`, `suggest_only`) and wired the preview/apply path to understand them, so future confirmation rules can build on a stable policy layer instead of ad-hoc heuristics.
- Added `npm run plan:latest` as an offline plan inspector for the newest preview artifact shape, so action tiers, source, confidence, and unsupported structural suggestions can be inspected without opening raw JSON.
- Added stable action pipeline phases (`cleanup`, `normalize`, `enrich`) to the planner and preview summaries, so plan ordering and future per-phase execution policies now have an explicit foundation.
- Updated the Node-side command runner in `plugin/agent-core.js` so it also respects execution disposition (`suggest_only` is skipped there too), reducing behavioral drift between the lightweight Node adapter and the real addon shell.
- Added `npm run planner:check` as a planner invariant test to verify action metadata, execution tiers, pipeline phases, and ordering constraints on a sample branch.
- Diagnosed a real helper-shell constraint from live apply artifacts: on this machine, `remove_comments_by_text` may be planned correctly but the stable helper shell does not always expose any supported comment-removal API, so those actions can be impossible to execute even when the rest of the plan succeeds.
- Decided to preflight helper-shell capabilities before apply and block known-impossible comment-removal actions up front, so execution reports distinguish "preflight blocked by shell capability" from true runtime skips or failures.
- Diagnosed another real product issue from live plan/apply artifacts: some branches now degrade into large batches of invisible `append_tags`, which execute successfully but do not feel like meaningful mind-map organization inside MarginNote.
- Decided that when overloaded-branch structure suggestions exist, the planner should emit concrete branch-root guidance comments and suppress bulk semantic-tag actions for that run, so the outcome is visible and closer to an organizer workflow.
- Confirmed from local typings that the public note API is stronger than our original execution layer had used: `MNNote` exposes `createChildNote`, `addChild`, `addAsChildNote`, `merge`, and `delete`, which is enough for a first controlled hierarchy edit without touching canvas automation.
- Decided to upgrade the first real structural execution from “comment-only suggestion” to a deterministic `organize_branch_groups` action: create grouping child cards under an overloaded branch and move direct children into those groups after preview confirmation.
- Broadened the structure executor with a helper-shell fallback chain: create group cards via `createChildNote` or `createBrotherNote`, and move cards via `addChild` or `addAsChildNote`, so runtime capability mismatches can still land real hierarchy edits when at least one supported path exists.
- Diagnosed the current live blocker more precisely from apply artifacts: on this machine's helper shell, moving existing child notes is exposed, but direct group-note creation is often missing for selected roots.
- Added a new detached-note creation fallback for structural grouping: when inline child creation APIs are absent, the addon now tries `Note.createWithTitleNotebookDocument(...)` plus `parentNote.addChild(...)` to create a group note off-root and then attach it under the selected branch.
- Extended helper-shell diagnostics and offline tooling to surface detached-create readiness explicitly, so future reports can distinguish "no creation API at all" from "detached creation path available but failed at runtime."
- Verified locally in the Node mock runtime that `organize_branch_groups` now still succeeds when `createChildNote` and `createBrotherNote` are both unavailable, as long as detached note creation plus `addChild` remain available.
- Rebuilt the packaged addon after these structural changes so the latest `mnaipro.mnaddon` artifact now includes the detached-creation fallback path.
- Synced the updated `main.js` into the live MarginNote Extensions folder as well, so the installed addon now matches the current workspace code instead of only the packaged `.mnaddon` artifact.
- Decided to reduce future dependence on live user retesting by adding a built-in per-run diagnostic session log inside the addon itself, not just plan/apply artifacts.
- Added a diagnostics directory under the bridge cache and now persist structured command lifecycle events there (focus-note detection, branch collection, bridge request outcome, plan artifact write, preflight block summary, apply finish, and failures).
- Added bridge-side external diagnostics APIs (`/status`, `/diagnostics/latest`, `/reports/latest`) so future inspection can rely on machine-readable local endpoints and latest-artifact pointers instead of manual narration.
- Added local helper commands `npm run diag:latest` and `npm run bridge:status` to surface those new diagnostics quickly during autonomous debugging.
- Rebuilt and resynced the installed addon after the diagnostics work, so the live MarginNote extension now includes the built-in session logging path.
- Identified another recurring ops risk: the launchd-backed bridge supervisor itself has been flaky, so bridge availability still cannot depend on a single brittle process probe.
- Hardened the supervisor to use multiple MarginNote detection paths (`pgrep` + `ps`), check live bridge health before spawning, avoid immediate stop on a single missed detection, and avoid duplicate bridge spawns when an existing healthy bridge is already listening.
- Added `npm run bridge:doctor` to collect bridge status, launchd state, pid/log tails, and recent supervisor evidence in one machine-readable report for autonomous debugging.
- Added `npm run bridge:launchd:reload` so the launch agent can be re-rendered, reinstalled, and kickstarted from the project itself instead of requiring manual plist juggling.
- Added automatic runtime capability snapshots on addon load and command start, so we can inspect real helper-shell support for HUD APIs, detached note creation, comment removal, and branch organization from files instead of depending on user descriptions.
- Extended apply artifacts for structural actions so future real runs record the exact group creation path, per-group result, per-child move path, and skip/failure reasons, letting us debug structure execution from artifacts instead of visual inspection alone.
- Found that real helper-shell runs were still not leaving files in `diagnostics/` even though plan/apply artifacts existed, so the diagnostics feature needed a second storage path instead of assuming the dedicated directory was trustworthy.
- Added report-directory diagnostic mirroring in the addon: every diagnostic session and runtime snapshot now also writes a JSON/TXT mirror into `reports/`, plus rolling `mnaipro-diagnostic-latest.*` and `mnaipro-runtime-latest.*` aliases.
- Updated bridge inspection to fall back gracefully when native diagnostic artifacts are missing: `/diagnostics/latest`, `/reports/latest?kind=diagnostic`, `npm run diag:latest`, and `npm run bridge:doctor` now synthesize a derived diagnostic from the latest request/response/plan/apply artifacts instead of returning only "not found".
- Expanded bridge status for autonomous debugging with request/response pointers and queue counts (`requestCount`, `responseCount`, `unansweredRequestCount`), so we no longer have to infer bridge health from a raw request-file count alone.
- Confirmed with a fresh post-restart live run that the new addon instrumentation is actually loaded: native diagnostic sessions and runtime snapshots now write successfully into both `diagnostics/` and mirrored `reports/`.
- Confirmed the real blocker more precisely: the helper shell exposes `Note.createWithTitleNotebookDocument(...)`, `note.addChild(...)`, and note ids for notebook/doc context, but does not expose `Application.getNoteBookById(...)` / `Application.getDocById(...)`; therefore detached create was being marked unavailable even though a different resolver path may still work.
- Updated detached-create resolution to probe multiple sources for notebook/document objects (`Database.sharedInstance().getNotebookById`, `Database.sharedInstance().getDocumentById`, `currentDocumentController.document`, plus both `Application.getNotebookById` and `Application.getNoteBookById` variants), and extended diagnostics/apply summaries to record the resolver source when that path becomes available.
- Verified the new resolver on a fresh live run: detached grouping now works in the real helper shell via `Database.sharedInstance().getNotebookById + Database.sharedInstance().getDocumentById`, and the command successfully applied all 6 planned `organize_branch_groups` actions with 41 changed notes.
- Added `npm run replay:after-apply` so we can inspect the planner's likely second-pass behavior from the latest apply artifact's `afterBranch` snapshot, without asking the user to trigger another live run just for analysis.
- Continued the mainline toward multi-stage agent behavior: after a successful live apply, the addon now immediately asks the bridge for one follow-up plan based on the captured `afterBranch` snapshot, records that artifact separately, and includes a short next-stage summary in diagnostics/UI feedback.
- Re-inspected the newest successful structural apply artifact and confirmed why the second stage still felt weak: the follow-up snapshot mostly contains changed branch nodes with titles and child counts but little body text, so the replayed plan collapses into hidden semantic tags instead of obvious mind-map edits.
- Added a new planner enrich path, `branch_structure_digest`, that turns those post-organization branch nodes into visible `rewrite_excerpt` actions whenever they have multiple direct children, no excerpt, and only title-level text.
- Tightened action pruning so once a pass already contains structural regrouping or visible branch-digest summaries, bulk `append_tags` are suppressed for that pass to keep previews focused on noticeable changes instead of low-value hidden metadata.
- Added `npm run followup:latest` to inspect the newest stored follow-up artifact directly, with an offline replay fallback from the latest apply artifact when no follow-up file exists yet.
- Extended the bridge report API so `/reports/latest?kind=followup` now exposes the newest stored follow-up artifact or derives the same follow-up plan from the latest apply snapshot when needed, giving the external diagnostics surface first-class visibility into stage-two planning.
- Aligned the live bridge status and follow-up report API with the CLI replay view: `/status` and `/reports/latest?kind=followup` now carry the same replay summary object so stale follow-up artifacts can be compared against the latest planner semantics from either surface.
- Added explicit plan stage metadata (`primary` / `followup`) to the shared planner payload and plan output, so plan artifacts, replay tools, and bridge status can now distinguish first-pass organization from second-pass enrich work.
- Decided on a deliberately narrow second-stage auto-apply policy: after a successful structural pass, the addon may immediately execute only follow-up actions that are visible `rewrite_excerpt` fills from `branch_structure_digest`; anything else remains in the saved follow-up plan for later review.
- Implemented that second-stage auto-apply path in the live addon flow, with separate `followup-apply` execution artifacts, dedicated diagnostic events/metrics, and alert text that distinguishes planned follow-up work from auto-applied follow-up work.
- Added `npm run followup:apply:latest` plus bridge/status support for `followupApply`, so once the next live run happens we can inspect the second-stage execution artifact without asking the user to describe the UI.
- Tightened artifact selection rules so primary apply tooling now ignores `followup-apply` reports; otherwise `report:latest`, after-apply replay, and follow-up derivation would accidentally pivot onto the second-stage artifact instead of the main structural apply artifact.
- Validated the new stage-two path on a fresh live run: the addon now writes a real stored follow-up artifact, but that artifact exposed another planner weakness — after visible branch summaries are in place, follow-up can still degrade into low-value `append_tags` on those same summary nodes.
- Refined the planner again so `followup` stage suppresses semantic-tag proposals for notes whose excerpt/allText already match the generated branch-summary digest pattern, which collapses the latest after-apply replay from 7 tag actions down to 0 follow-up actions.
- Replayed the latest real request against the newest planner logic and confirmed a new primary-stage edge case: once singleton-only regrouping is suppressed, the same branch can fall back to 94 pure `append_tags` actions with no visible mind-map changes.
- Tightened the primary-stage pruning policy again so `整理当前选中分支` now removes semantic-tag actions entirely from the first pass, and records an explicit deferred-enrichment note when a branch would otherwise produce only invisible tag edits.
- Verified locally that the latest problematic real request now resolves to 0 primary actions plus a clear defer note instead of 94 hidden tag writes, while `npm run replay:after-apply` and `npm run check` still pass.
- Improved the in-app preview UX for that same state: when the primary plan has no executable actions and only deferred semantic enrichment notes, the addon now surfaces an explicit "branch already organized enough" status in preview/summary text instead of looking like a silent empty run.
- Updated the in-app review flow so plans with zero executable actions no longer show a misleading "执行已选动作" path; they now present a simple confirm/close action, matching the fact that there is nothing to apply.
- Rebuilt the packaged addon and resynced the installed extension `main.js` after the preview UX change, so the workspace code and live installed addon are aligned again on disk.
- Made follow-up branch digests more informative: visible `branch_structure_digest` excerpts now include up to three representative direct-child titles, so second-stage summaries read more like usable branch overviews instead of generic placeholder text.
- Refined the non-grouped `branch_structure_digest` fallback so it now emphasizes visible child titles in content-first wording instead of repeating generic "summary node" phrasing, which keeps real-world digests closer to a branch overview even when the grouped path does not trigger.
- Generalized grouped branch-overview wording so placeholder titles like "Summary node" are suppressed instead of echoed back into the excerpt, keeping title-centric digest labels from leaking into the user-facing summary text.
- Added a thin local `mnaipro` CLI as the first command-line entrypoint over the bridge, with `status`, `doctor`, `plan latest`, `followup latest`, `report latest`, `diag latest`, `replay latest`, `replay after-apply`, `breakdown smoke`, and `request get` subcommands.
- Added `mnaipro bridge` subcommands for bridge status, doctor, render, and reload, so deployment and health checks now live beside the rest of the CLI surface.
- Added `mnaipro bridge logs` so bridge/supervisor log tails can be inspected directly from the CLI, and wrote a short `mnaipro` quick-reference doc for the new command surface.
- Added follow mode to `mnaipro bridge logs`, and grouped the top-level CLI help so the command surface reads more like a formal tool.
- Made the Breakdown smoke path JSON-clean under `--json` and `--compact` by silencing mock HUD logs during non-pretty runs.
- Kept the existing suppression behavior stable while enriching those digests: the branch-summary detection regex still matches the new phrasing prefix, so follow-up tag suppression and replay behavior remain compatible.
- Reloaded the launchd-managed bridge after the planner update and confirmed via local doctor/status tooling that the supervised bridge came back healthy with the new code installed.
- Confirmed from the local MarginNote typings that the public addon surface exposes real mind-map shape signals beyond plain parent/child links: `NotebookController.mindmapView.mindmapNodes[].frame`, plus note-level flags such as `mindmapBranchClose`, `hidden`, `zLevel`, and `groupMode`.
- Upgraded branch collection and execution snapshots so request payloads now carry those shape hints into the planner as stable visual context: per-node frame/depth/visibility data and a branch-level `shapeSummary` with visible-node counts, collapsed branches, hidden nodes, and canvas span.
- Surfaced that captured shape context in plan summaries and offline inspection tooling, so we can verify that the AI is seeing the current branch's visible mind-map footprint, not just its abstract tree structure.
- Took the next step from "shape can be seen" to "shape changes planning": the planner now emits explicit `branch_shape_warning` notes when the selected branch or a specific node is visually spread out (wide span, deep visible depth, or many collapsed branches), even if child-count heuristics alone would have missed it.
- Relaxed structure-trigger gating for visually overloaded branches: a node can now enter branch-split analysis from shape pressure at around 4 direct children when the current mind-map layout is already too wide/deep/collapsed, instead of waiting strictly for the old 6-child threshold.
- Rebuilt the addon package and resynced the installed extension after the shape-aware planner pass, keeping the live extension on disk aligned with the current workspace again.
- Updated the project goal to explicitly include card-color changes as part of the intended organizer capability, while keeping that work as a future controlled action rather than pretending it already ships today.
- Implemented the first real color-action path end to end: the planner now emits `set_color_index` for a small role-based palette, preview/apply flows surface the proposed color diff, the helper shell can write `note.colorIndex`, and the Node/mock adapter now mirrors that behavior for offline validation.
- Kept the first color pass conservative by default: it skips already-colored non-summary notes, treats color changes as `review_required`, and records color state in branch snapshots so execution reports can confirm whether a recolor actually landed.
- Tightened that color policy further after seeing how broad full-branch recoloring could get: the primary planner now preserves all summary-branch recolors but caps non-summary role recolors to a small top-priority set and emits a deferred-color note for the rest, keeping preview/apply output easier to trust.
- Closed another consistency gap between offline testing and the real addon path: the Node-side adapter and mock runtime now forward mind-map shape fields too, so local dry-run and planner checks exercise the same shape-aware logic that the live helper-shell branch collector already sends.
- Upgraded color prioritization from role-only to shape-aware: when the planner has current visibility/depth signals, it now favors visible high-impact notes under visually overloaded branches and lets hidden/deeper leaves fall behind in the first-pass recolor shortlist.
- Carried that visual policy through to user-facing inspection too: in-app preview and offline plan inspectors now show color-role / visual-priority context and evidence lines, so shape-aware recolor decisions are explainable instead of feeling arbitrary.
- Introduced the first branch-level visual strategy layer: planner output now includes `strategyPacks` that bundle visible color / regroup / branch-summary actions, preview summary pages show that pack before per-note details, and follow-up/offline inspectors surface the same pack semantics so the workflow reads like one agent strategy instead of scattered actions.
- Upgraded that strategy layer with a first-class zero-action result: when a pass has no new visible actions and no structural blockers, the planner now emits `branch_already_organized_strategy` with deferred semantic/visual counts, the preview UI treats it as the main conclusion instead of duplicating fallback copy, filtering keeps true zero-action packs alive without inventing new ones, and offline/follow-up inspectors report the same result type.
- Upgraded second-stage `branch_structure_digest` output from a generic child-count summary into a grouped branch overview when the current node snapshot already shows reorganized child groups: the planner now derives 2-3 topic groups plus representative descendants from the current tree, keeps the same `rewrite_excerpt` + `branch_structure_digest` contract and auto-apply policy, extends digest-pattern detection so follow-up semantic-tag suppression still works, and updates preview/inspector wording to describe these fills as branch overviews instead of generic excerpt rewrites.
- Exposed richer in-app diagnostics directly inside the addon UI: the preview summary page now shows a compact diagnostics block, and blocked/apply-complete alerts now include current session status plus latest plan/apply/follow-up artifact pointers so future debugging depends less on external scripts.
- Added a repeatable local native-AI inspection tool at `scripts/inspect-native-ai.js` plus `npm run native-ai:inspect`, so MarginNote 4 app resources, internal tool-contract signals, AI OCR preferences, and container traces can be re-verified from this repo instead of relying on one-off manual bundle inspection.
- Kept that native-AI inspection path conservative: it proves local evidence of internal prompt/tool capabilities and persisted AI traces, but it still does not claim stable public plugin access to MarginNote's internal tool engine.
- Landed a first deterministic native-AI supervision layer at `bridge/native-ai-supervision.js` plus `npm run native-ai:matrix`: it converts local inspection evidence into capability rows such as `augment_only`, `mirror_and_supervise`, `supervise_outputs`, and `avoid_direct_hook`, so future native-AI integration work starts from explicit policy instead of hand-wavy direction.
- Documented that supervision matrix in `docs/native-ai-supervision-matrix.md`, with current v1 decisions such as: do not rebuild native chat/study surfaces, mirror OCR/template governance, supervise AI Breakdown outputs, prefer our own executor over native private hierarchy tools, and defer any hard runtime coupling to credits/MAX state.
- Took the first concrete step under that supervision matrix by adding `npm run native-ai:templates`: it mirrors local AI OCR/card-template configs, classifies them coarsely (translation / summary / mermaid / review / custom), and runs a conservative structural lint pass so template governance work can start without touching private OCR execution paths.
- Expanded that template-governance path into a deterministic rule module at `bridge/native-ai-template-governance.js`: template reports now include explainable normalization suggestions, same-kind diffs, generic-prompt quality findings, and recommendation lines, with a dedicated regression check at `npm run native-ai:template-check`.
- Added the first offline AI Breakdown result post-processing entry at `bridge/native-ai-breakdown-postprocess.js` plus `npm run native-ai:breakdown-postprocess`: it tags planner payloads with `origin = native_ai_breakdown`, emits a `native_ai_breakdown_context` note, derives simple breakdown-fit signals, and reuses the existing organizer pipeline on a saved branch snapshot without claiming live private-runtime integration.
- Added a dedicated regression check for that path at `npm run native-ai:breakdown-check`, and verified the sample breakdown-like branch produces visible `branch_structure_digest` actions while the current latest saved real branch snapshot can also be replayed through the same origin-aware entry.
- Added a live Breakdown subcommand behind a mode chooser in the addon shell: the same MarginNote entry now can run either the ordinary branch organizer or `整理 AI Breakdown 分支`, and the selected mode is threaded through live preview/apply, follow-up planning, and replay artifacts via `origin: native_ai_breakdown`.
- Added a command-line Breakdown smoke test at `npm run native-ai:breakdown-smoke`; it now runs both the visible-action and zero-action organized-enough cases by default, supports `--case visible|organized-enough|all`, and can emit `--json` or `--compact` output while still asserting the `native_ai_breakdown` origin and context note.
- Made that Breakdown smoke test self-contained: it now starts a temporary local bridge on a free port, points the smoke run at that bridge, and cleans the temp workspace afterward so long autonomous verification runs no longer need a manually started bridge.
- That self-hosted Breakdown smoke now also emits structured report metadata on failure, including the temporary bridge base URL when available, so future autonomous runs can diagnose startup problems without a separate manual bridge session.
- Added that self-hosted Breakdown smoke to the root `npm run check` gate, so the live preview/apply self-test now runs alongside the static planner and artifact regressions.
- Added shortcut aliases for the smoke test: `npm run native-ai:breakdown-smoke:visible` and `npm run native-ai:breakdown-smoke:organized-enough`, so the two most useful cases can be run without remembering CLI flags.
- Added `mnaipro breakdown postprocess` as a thin read-only wrapper around the Breakdown postprocess preview, taught that preview to surface the primary strategy pack directly so zero-action organized-enough results still read like explicit agent conclusions instead of silent empty runs, and then upgraded its artifact selection to prefer `origin = native_ai_breakdown` apply reports first, then Breakdown requests, then Breakdown plan reports; when a plan report wins, the replay now explicitly uses the paired request snapshot as the node source and surfaces both paths in the diagnostic output.
- Tightened that Breakdown postprocess diagnostic path again for the current real-world local state where no Breakdown artifacts exist yet: `mnaipro breakdown postprocess --json` now emits a structured `no_breakdown_artifacts` report instead of plain text, and includes the newest ordinary request/plan/apply summaries so we can prove from cache evidence that the machine is still only producing primary-mode runs.
- Fixed the live addon apply envelope for Breakdown mode: `main.js` now preserves `command`, `objective`, and `origin` on the normal `applySupportedActions()` path instead of only on blocked/no-op executions, and added `npm run native-ai:breakdown-origin-check` as a dedicated source-level regression for both execution envelopes.
- Added a dedicated Breakdown cache-audit surface at `scripts/inspect-native-ai-breakdown-artifacts.js`, `npm run native-ai:breakdown-artifacts`, and `mnaipro breakdown artifacts`: it classifies the newest Breakdown artifact chain as `complete`, `partial`, or `missing`, verifies whether request/plan/apply/followup still agree on one request id, and shows the latest generic artifacts when the cache still only contains ordinary primary-mode runs.
- Promoted that Breakdown cache audit into the default CLI diagnostics: `mnaipro status`, `mnaipro bridge status`, `mnaipro doctor`, and `scripts/bridge-status.js` now all attach the same local `breakdownArtifacts` summary, and `npm run cli:breakdown-audit-surface-check` plus the larger CLI smoke suite both pin that behavior with deterministic temp-artifact fixtures.
- Pushed that same `breakdownArtifacts` summary down into `bridge/server.js` itself, so raw HTTP `/status`, CLI live/fallback status paths, and the bridge-status helper all now share one source of truth; the bridge layer also now honors explicit `MN_AGENT_REQUESTS_DIR` / `MN_AGENT_REPORTS_DIR` overrides, and `npm run bridge:status:breakdown-check` pins the raw `/status` contract directly.
- Taught `mnaipro followup latest` to surface a current replay summary beside the stored follow-up artifact, so stale follow-up records can be compared against the latest planner semantics instead of being read in isolation.
- Updated the in-app and offline inspectors so plan, follow-up, apply, and diagnostic summaries now surface mode/origin context instead of collapsing Breakdown runs into generic branch organization output.
- Re-validated the CLI and addon surface after the latest bridge/log/help polish: `node --check cli/mnaipro.js`, `npm run check`, `npm run addon:build`, and `npm run native-ai:breakdown-smoke` all passed, and `mnaipro bridge logs --follow` renders cleanly in both text and compact modes with separated snapshots.
- Added isolated real-apply smoke coverage for both standalone CLIs: `marginnote-cli` now honors `--preference-domain` during native-AI inspection, which lets the smoke test write to a temporary defaults domain and read the value back safely; `mn-obsidian-bridge` now gets the same style of temporary-vault apply/readback verification.
- Added repo-local smoke entrypoints to both standalone CLIs so they can self-verify without going through the root project harness: `marginnote-cli` now has `npm run smoke` using a temporary defaults domain, and `mn-obsidian-bridge` now has `npm run smoke` using a temporary vault and settings file.

## Next Recommended Milestones

1. Capture a real live Breakdown branch snapshot through the new `mnaipro breakdown postprocess` wrapper and use it to tune the grouped branch-overview heuristics.
2. Decide whether template governance should next produce auto-normalized template patches or stay recommendation-only for safety.
3. Continue expanding `marginnote-cli` toward broader MarginNote-native read/write coverage, while keeping `mnaipro` focused on the plugin / agent workflow and `mn-obsidian-bridge` as the separate bridge diagnostics/write CLI.
4. Decide when to introduce a real model provider into the bridge, and how much deterministic planning should remain in front of it for auditability and replay.
5. Extend the new `marginnote` Codex skill only if routing needs become more specific. Keep it a thin dispatcher: native MarginNote tasks -> `marginnote-cli`, plugin/agent tasks -> `mnaipro`, bridge tasks -> `mn-obsidian-bridge`.

## Open Questions

- Which model provider should power the bridge in the first real version?

## Update Rule

This file is the working memory for the project.

It should be updated whenever one of these changes:

- the project goal changes
- we make an architecture decision
- we learn a new hard constraint
- we add a new milestone or change priority
- we verify or reject an implementation path
