# MarginNote Agent Plugin Starter

This repository is a pragmatic starter for turning MarginNote AI into a more agent-like workflow.

The product goal now explicitly includes both structural cleanup and selective visual cleanup, such as controlled card-color changes that help a branch read more clearly in the mind map.

It is split into two parts:

- `main.js`
  A real `mnaddon4`-style addon entry shell for MarginNote. It currently uses the stable helper route and maps "selected branch" to the current focused note plus descendants.
- `plugin/agent-core.js`
  MarginNote-side action runner. It supports a preview-first flow, then applies only safe actions supported by the exposed addon APIs.
- `plugin/index.js`
  Minimal command entry wrapper you can attach to a real addon command.
- `plugin/mock-api.js`
  A local mock MarginNote runtime so we can test the loop without launching the app.
- `bridge/server.js`
  A local planning service. In production this should call a real LLM. In this starter it returns deterministic action plans so the whole loop is easy to test.
- `bridge/planner.js`
  Shared planning core used by both the live bridge server and offline replay scripts, so regression checks exercise the same planner logic as production.
- standalone CLI split
  The bridge protocol is intentionally kept thin enough that separate command-line tools can reuse the same evidence model without sharing runtime:
  - `mnaipro` stays the CLI for this plugin / agent workflow.
  - `marginnote-cli` is the standalone read-write CLI for MarginNote native capabilities, with a stable `capabilities` registry command plus patch-compatible or restorable native AI preference snapshots and supported `ai preferences export|restore|set|patch|reset` flows.
  - `mn-obsidian-bridge` is the standalone read-write CLI for MarginNote ↔ Obsidian bridge diagnostics, including a stable `capabilities` registry command, a top-level `overview` evidence map, higher-level doctor/report evidence for Obsidian sync settings, plus patch-compatible or restorable settings snapshots and supported `ob settings export|restore|set|patch|reset` flows.
  - `marginnote-cli ai status` gives a compact native-AI health summary.
  - `marginnote-cli ai status --compact` also gives a short `next=` hint for the supported snapshot / restore workflow.
  - `marginnote-cli ai overview` gives a top-level native-AI capability map across prompts, study, memory, traces, OCR, and Breakdown.
  - `marginnote-cli ai boundaries` gives a visible-vs-restricted native-AI boundary map with can / cannot evidence.
  - `marginnote-cli ai prompts` gives a prompt-module and tool-contract view.
  - `marginnote-cli ai study` gives a Guide / Quiz / Explain study-mode view.
  - `marginnote-cli ai traces` gives a Breakdown / persistence trace view with a diagnostic tree.
  - `marginnote-cli ai memory` gives a chat-memory / conversation-trace view.
  - `marginnote-cli ai preferences export|restore|set|patch|reset` supports patch-compatible exports, full restorable snapshots, and preview-first native AI preference writes.
  - `mn-obsidian-bridge ob settings` gives a focused Obsidian sync settings + export-root scan view, with a stable JSON envelope for script consumers.
  - `mn-obsidian-bridge ob status --compact` also gives a short `next=` hint for the supported settings snapshot / restore workflow.
  - `mn-obsidian-bridge ob settings export|restore|set|patch|reset` supports patch-compatible exports, full restorable snapshots, and preview-first Obsidian sync setting writes.
  - `mn-obsidian-bridge overview` gives a top-level bridge evidence map across MarginNote, Obsidian, settings, export roots, and archive traces.
  - the local `marginnote` Codex skill at `~/.codex/skills/marginnote` routes MarginNote work to the right surface instead of guessing.
- `docs/agent-plugin-design.md`
  Design notes, capability boundaries, and the next implementation steps.
- `docs/ohmymn-integration.md`
  Notes on how to wire this into an OhMyMN or similar addon shell.
- `docs/native-ai-supervision-matrix.md`
  A v1 decision matrix for which native MarginNote AI capabilities we should mirror, supervise, augment, or avoid hooking directly.

## GitHub workflow

This repository uses `main` as the merge branch.
Small, verified fixes can land directly on `main`; larger slices should use a short-lived branch and a Draft PR.
GitHub issues and PRs track collaboration state only.
Long-term project memory lives in `PROJECT_MEMORY.md`, current phase tracking lives in `PROJECT_STATUS.md`, and repo-specific operating rules live in `AGENTS.md`.

For validation, use `npm run check:ci` for the CI-safe subset and `npm run check` for the broader local suite.

## Why this split exists

MarginNote addons can inspect notes and modify several note fields, but they are not a full general-purpose agent runtime. A local bridge gives you:

- better model access
- longer planning context
- action logging
- policy checks before editing notes
- an escape hatch for future private-api or UI-automation experiments

## What this starter already demonstrates

- package-level files for a real `mnaddon4` addon:
  - `main.js`
  - `mnaddon.json`
  - `jsconfig.json`
- collect selected MarginNote nodes into a normalized context payload
- send the payload to a local planner
- return a preview plan first
- keep a single addon entry with an in-app mode chooser so the same live command can run normal organization or the `native_ai_breakdown` subcommand without changing the safety boundary
- bundle visible color / grouping / branch-summary actions into a first-class visual strategy pack
- emit a first-class `branch_already_organized_strategy` result when a pass has no new visible actions and no structural blockers, so zero-action previews still read like an explicit agent conclusion
- turn second-stage `branch_structure_digest` fills into grouped branch overviews when the current branch already shows reorganized topic groups, and keep the fallback phrasing content-first instead of echoing generic summary-node labels
- apply preview-confirmed note actions:
  - set title
  - set role-based card color
  - append tags
  - append comments
  - rewrite main excerpt
  - remove legacy organizer comments by text
- start controlled visual organizer actions:
  - role-based card-color changes after preview and confirmation
  - a conservative first-pass cap so one run does not repaint too many leaf cards at once
  - shape-aware prioritization so visible, high-impact notes win before hidden leaves
- apply a first controlled structural action:
  - create grouping child notes and move direct children under them for overloaded branches
- generate a more visible second-stage enrich pass:
  - fill empty branch-node excerpts with short summary text when a regrouped node now acts as a parent summary node
  - auto-apply that second stage when it is limited to those visible branch-summary excerpt fills
- still reject unsupported structural actions such as arbitrary `reparent_node`
- replay cached real-world requests offline and compare generated plans against saved bridge responses
- inspect the locally installed MarginNote 4 app and container for repeatable evidence of native AI prompt/tool capabilities

## Stable Shell Boundary

The current root `main.js` uses the official helper-style shell for stability.

That shell can already:

- expose the command in MarginNote
- collect the focused note and its descendant branch
- write a planning payload to a temp file
- ask the local bridge for a preview plan through `GET /plan-file`
- apply a narrow safe subset directly in the raw helper shell

The helper shell does not yet give us the same rich writable surface we modeled in the Node-side adapter. In practice, the current shell auto-applies:

- `set_title`
- `set_color_index`
- `rewrite_excerpt`
- `append_tags`
- `append_comment`
- `remove_comments_by_text`
- `organize_branch_groups`

It also writes execution artifacts after apply, including per-action before/after snapshots and a selected-note branch diff to help debug cases where the UI appears unchanged.
For `organize_branch_groups`, the addon now tries three creation paths in order: `createChildNote`, `createBrotherNote`, then detached creation via `Note.createWithTitleNotebookDocument(...)` followed by `addChild(...)`.
That detached-create probe now resolves notebook/document through multiple runtime sources instead of only the `Application.getNoteBookById(...)` / `Application.getDocById(...)` pair: it also checks `Database.sharedInstance().getNotebookById(...)`, `Database.sharedInstance().getDocumentById(...)`, and the active `currentDocumentController.document` when available.
The addon also writes a per-run diagnostic session under the bridge cache directory, so failures before planning or apply still leave a structured trace we can inspect offline.
It also writes automatic runtime capability snapshots on addon load and command start, so helper-shell support for HUD, detached note creation, comment removal, and branch organization can be inspected without asking the user to describe the UI.
As a reliability fallback, those diagnostic sessions and runtime snapshots are now mirrored into the same `reports/` directory that already proved writable for plan/apply artifacts, so bridge-side inspection still works even if the standalone `diagnostics/` directory stays empty in a given helper shell.
When the Breakdown subcommand is chosen, the live request now threads `origin: native_ai_breakdown` through the bridge so follow-up planning, inspection, and replay can keep that mode distinct from ordinary branch organization.

## Quick start

Start the local bridge:

```bash
npm run bridge
```

Re-render and reload the launchd bridge supervisor:

```bash
npm run bridge:launchd:reload
```

In another terminal, run a local dry-run:

```bash
npm run dry-run
```

Run planner invariant checks:

```bash
npm run planner:check
```

Replay the latest real cached request through the same planner logic:

```bash
npm run replay:latest
```

Replay the planner against the branch state captured after the latest real apply, to see what the next pass would do without asking the user to run the command again:

```bash
npm run replay:after-apply
```

Replay all cached requests and fail if any plan drifts:

```bash
npm run replay:all
```

Inspect the latest apply artifact:

```bash
npm run report:latest
```

That report now also shows helper-blocked structural actions and whether the detached-create fallback looked available in the captured runtime.
When a structural apply does run, the apply artifact now also records which creation path was used (`createChildNote`, `createBrotherNote`, or detached create + `addChild`), how each group resolved, and which child moves succeeded or were skipped.
After a successful live apply, the addon now also requests one immediate follow-up plan from the post-apply branch snapshot and saves it as a separate follow-up artifact, so we can inspect the likely second-stage enrich actions without asking for another manual run first.
When that follow-up plan is only the visible `branch_structure_digest` excerpt-fill action, the addon now immediately applies that second stage as well and writes a separate follow-up apply artifact.
If a follow-up pass would now only add invisible semantic tags to those freshly summarized branch nodes, the planner suppresses that output entirely so stage two stays quiet instead of generating low-value churn.

Inspect the latest follow-up artifact directly, or derive the same follow-up plan from the newest apply artifact when no stored follow-up file exists yet:

```bash
npm run followup:latest
```

Inspect the latest follow-up apply artifact, once a live run has auto-applied that second stage:

```bash
npm run followup:apply:latest
```

Inspect the latest diagnostic session:

```bash
npm run diag:latest
```

If the addon did not produce a standalone diagnostic artifact, that command now falls back to a bridge-derived session summary built from the latest request/response/plan/apply artifacts.

Inspect the locally installed MarginNote 4 app for repeatable evidence of native AI prompt modules, tool contracts, UI signals, preferences, and container traces:

```bash
npm run native-ai:inspect
```

Add `-- --json` if you want the same result as structured JSON for later automation.

Render the first supervision matrix that converts those native-AI findings into plugin strategy decisions:

```bash
npm run native-ai:matrix
```

Add `-- --json` for structured output.

Mirror the local AI OCR / card templates and run a first structural lint pass:

```bash
npm run native-ai:templates
```

Preview how the current organizer would post-process a branch treated as native AI Breakdown output:

```bash
npm run native-ai:breakdown-postprocess
```

By default this reuses the latest saved `afterBranch` snapshot as a proxy input.
You can also point it at an explicit snapshot file:

```bash
npm run native-ai:breakdown-postprocess -- --input /path/to/branch.json
```

The same preview is also available through the thin CLI wrapper:

```bash
mnaipro breakdown postprocess
mnaipro breakdown postprocess --json
mnaipro breakdown artifacts
mnaipro breakdown artifacts --json
```

That wrapper now prefers the latest `origin = native_ai_breakdown` apply report, then falls back to the latest Breakdown request, then the latest Breakdown plan report. If the selected source is a plan report, it also reuses the paired request snapshot for node replay, while still showing the plan artifact as the primary source. If no Breakdown artifacts exist at all, the wrapper now returns a structured `no_breakdown_artifacts` report in JSON mode and includes the newest ordinary request/plan/apply evidence, which makes it easier to see that the local cache is still only capturing primary-mode runs.
`mnaipro breakdown postprocess` now also carries a `nextCommand` hint that points to `mnaipro breakdown artifacts --json`, so the preview surface explicitly points at the companion cache-audit command in both JSON and compact modes.

If you need to audit the cache itself rather than replay a branch, run:

```bash
npm run native-ai:breakdown-artifacts
npm run native-ai:breakdown-artifacts -- --json
```

That audit reads the local request/report cache directly and tells you whether the newest Breakdown chain is `complete`, `partial`, or `missing`, whether request/plan/apply/followup artifacts still agree on one request id, and which latest generic artifacts are filling the gap when no Breakdown-specific chain exists yet.

If you want the second-stage execution artifact directly, run:

```bash
mnaipro followup apply latest
mnaipro followup apply latest --json
```

That command inspects the latest follow-up apply report and keeps the second-stage execution snapshot visible alongside the regular follow-up preview.
The same pointer also appears in `mnaipro status --json`, `mnaipro status --compact`, `mnaipro doctor --json`, and `mnaipro doctor --compact` when that follow-up apply artifact exists, and the compact forms also include the follow-up apply request id.

If you are validating the live addon wiring, run:

```bash
npm run native-ai:breakdown-origin-check
```

That source-level regression asserts both helper-blocked and normal apply envelopes in [`main.js`](/Users/cfall/Documents/Programs/Marginnote-AIpro/main.js) preserve `command`, `objective`, and `origin`, so Breakdown runs cannot silently collapse back into generic branch-organization apply artifacts.

Inspect bridge status and the latest artifact pointers through the local HTTP API:

```bash
npm run bridge:status
```

The `/status` payload now also carries the Obsidian sync settings summary / `data.json` path evidence plus the same `breakdownArtifacts` audit block used by the CLI, so the HTTP bridge status matches the CLI status and doctor views.

The CLI-side `status`, `bridge status`, and `doctor` views now also attach a local Breakdown artifact audit summary, and raw bridge `/status` exposes the same block plus a `breakdownNextCommand` hint. That means one normal health check can already tell you whether the newest `native_ai_breakdown` chain is `complete`, `partial`, or `missing`, without switching to the dedicated `breakdown artifacts` command first.
The dedicated `mnaipro breakdown artifacts` audit now carries the same `nextCommand` recommendation too, so both the summary path and the deep audit path point to the same next step.
Their compact output now also includes a short `next=` hint for the most useful Breakdown follow-up command: when the chain is complete it points to `mnaipro breakdown postprocess --json`, otherwise it points to `mnaipro breakdown artifacts --json`.

Run a unified smoke test across `marginnote-cli` and `mn-obsidian-bridge`:

```bash
npm run cli:smoke
```

Use `npm run cli:smoke:json` for structured output or `npm run cli:smoke:compact` for a one-line status.

The smoke now also checks each standalone CLI's `capabilities` registry command so command-surface drift gets caught early.

If you want to verify each standalone CLI on its own, run these repo-local smoke entrypoints directly:

- `cd ~/Documents/Programs/marginnote-cli && npm run smoke`
- `cd ~/Documents/Programs/MN-Obsidian-bridge && npm run smoke`

Those per-repo smoke commands use temporary domains / temporary vaults, so they can exercise real read-write behavior without touching your everyday settings.

Install the local command-line wrapper and inspect its command surface:

```bash
npm link
mnaipro --help
mnaipro status --obsidian-vault-path /path/to/vault
mnaipro doctor
mnaipro bridge doctor
mnaipro bridge logs --scope both --lines 20
mnaipro bridge logs --follow --interval 2
mnaipro breakdown smoke --json
mnaipro breakdown smoke --bridge-base-url http://127.0.0.1:8765 --compact
mnaipro breakdown smoke --base-url http://127.0.0.1:8765 --case organized-enough --json
mnaipro --base-url http://127.0.0.1:8765 breakdown smoke --case organized-enough --json
mnaipro breakdown postprocess
```

`mnaipro breakdown smoke` still self-hosts by default, but it now also accepts `--bridge-base-url <url>` or `--base-url <url>` when you want to reuse an already running bridge instead of starting a temporary one.
You can pass `--base-url` either before or after `breakdown smoke`; both forms reuse the same bridge.
That keeps the wrapper aligned with the raw smoke script's external-bridge mode.

The CLI currently exposes:

- `mnaipro bridge status`
- `mnaipro bridge doctor`
- `mnaipro bridge render`
- `mnaipro bridge reload`
- `mnaipro bridge logs`
- `mnaipro status`
- `mnaipro doctor`
- `mnaipro plan latest`
- `mnaipro followup latest`
- `mnaipro followup apply latest`
- `mnaipro report latest`
- `mnaipro diag latest`
- `mnaipro replay latest`
- `mnaipro replay after-apply`
- `mnaipro breakdown smoke`
- `mnaipro breakdown postprocess`
- `mnaipro breakdown artifacts`
- `mnaipro request get /status`

`mnaipro status` and `mnaipro doctor` now both carry the Obsidian sync settings summary / expected `data.json` path when you point them at a vault, so quick checks and fuller diagnostics share the same local evidence.
They now also surface the local Breakdown artifact audit by default, including the top-level `complete` / `partial` / `missing` state.
`mnaipro followup latest` now also shows the current replay summary beside the stored follow-up artifact, so older follow-up records can still be compared against the latest planner semantics.
The local bridge now mirrors that replay summary in `GET /status` and `GET /reports/latest?kind=followup`, so the live diagnostics surface stays aligned with the CLI.

See `docs/bridge-ops-quickstart.md` for the bridge deployment flow and the fastest recovery path.

Run a fully command-line Breakdown smoke test that drives the same preview/apply loop through the local bridge without opening MarginNote UI:

```bash
npm run native-ai:breakdown-smoke
```

By default it runs both the visible-action case and the zero-action `branch_already_organized_strategy` case.
Use `-- --case visible` or `-- --case organized-enough` to narrow it down.
Add `-- --json` for machine-readable output, or `-- --compact` for terse one-line summaries.
It now self-hosts a temporary local bridge on a free localhost port and cleans up its temp workspace automatically, so it no longer depends on a manually started bridge.
If you already have a bridge process running, pass `-- --bridge-base-url <url>` or set `MN_AGENT_BASE_URL`; the smoke will reuse that existing bridge instead of starting its own.
You can also pass `-- --base-url <url>` directly to `breakdown smoke`; the wrapper treats that as the same external-bridge request.
Use `npm run native-ai:breakdown-smoke:live` when you want the common `http://127.0.0.1:8765` live-bridge path without typing the URL.

If you want fixed shortcuts, use:

```bash
npm run native-ai:breakdown-smoke:visible
npm run native-ai:breakdown-smoke:organized-enough
npm run native-ai:breakdown-smoke:live
npm run native-ai:breakdown-smoke:json
```

Use `visible` when you want to exercise the normal agent-style breakdown path with real actions, `organized-enough` when you want to verify the zero-action conclusion path and the no-op reporting flow, and `live` when you want the smoke to attach to an already running bridge on the default local port.

Run a fuller local bridge doctor report with launchd state, pid/log tails, and latest artifact pointers:

```bash
npm run bridge:doctor
```

That doctor report now also carries the Obsidian sync settings summary and expected `data.json` path when the local vault is available.
It also carries the bridge supervisor ownership state when that lifecycle state file exists, so you can see whether the bridge is spawned, adopted, external, or stopped.
The compact `mnaipro doctor --compact` and `mnaipro status --compact` forms now mirror that ownership as `bridge_supervisor=...` plus `bridge_supervisor_pid=...`.
Use `mnaipro doctor --obsidian-vault-path <path>` or `MN_OBSIDIAN_VAULT_PATH` if you need to point those diagnostics at a different vault.

Inspect the latest preview plan artifact with execution tiers and phases:

```bash
npm run plan:latest
```

Run the full static/regression suite, including planner checks, Breakdown postprocess checks, and the live Breakdown origin envelope guard:

```bash
npm run check
```

To build a real `.mnaddon` package:

```bash
npm run addon:build
```

## Local bridge diagnostics API

When the local bridge is running, these endpoints are available:

- `GET /status`
  returns bridge status, request/response counts, unanswered queue counts, and the latest request/response/plan/apply/diagnostic pointers
- `GET /diagnostics/latest`
  returns the newest plugin diagnostic session JSON, or a derived fallback assembled from bridge artifacts when no native diagnostic file exists
- `GET /requests/latest`
- `GET /responses/latest`
- `GET /reports/latest?kind=apply`
- `GET /reports/latest?kind=plan`
- `GET /reports/latest?kind=followup`
  returns the newest stored follow-up artifact, or derives the same follow-up plan from the latest apply artifact when no follow-up file exists yet
- `GET /reports/latest?kind=followup_apply`
- `GET /reports/latest?kind=diagnostic`

This is intended to let us debug future runs from logs and APIs first, instead of relying on repeated manual “what did you see?” testing loops.
The same principle now applies to native MarginNote AI research too: the repo includes a repeatable local inspection command instead of relying only on one-off manual bundle spelunking.

Then wire `plugin/agent-core.js` into your MarginNote addon entry point and call:

```js
await runOrganizeSelectedNodes({
  objective: "整理当前选中分支",
  mode: "preview",
  bridgeBaseUrl: "http://127.0.0.1:8765",
  api: injectedMarginNoteApi
})
```

To apply safe actions after preview confirmation:

```js
await runOrganizeSelectedNodes({
  objective: "整理当前选中分支",
  mode: "apply",
  plan: approvedPreview.plan,
  bridgeBaseUrl: "http://127.0.0.1:8765",
  api: injectedMarginNoteApi
})
```

`api` is an adapter object that should expose:

- `getSelectedNodes()`
- `fetch(url, options)`
- optional `showHUD(message)`
- optional `hideHUD()`

The exact addon bootstrap differs by framework. If you use OhMyMN, keep its addon shell and only plug this runner into a command or panel action.
