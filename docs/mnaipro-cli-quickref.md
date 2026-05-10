# mnaipro Quick Reference

`mnaipro` is the thin local command-line wrapper around the MarginNote bridge.

## Core commands

```bash
mnaipro doctor
mnaipro status
mnaipro plan latest
mnaipro followup latest
mnaipro followup apply latest
mnaipro report latest
mnaipro diag latest
mnaipro replay latest
mnaipro replay after-apply
mnaipro breakdown smoke
mnaipro breakdown smoke --bridge-base-url http://127.0.0.1:8765
mnaipro breakdown smoke --base-url http://127.0.0.1:8765 --case organized-enough
mnaipro --base-url http://127.0.0.1:8765 breakdown smoke --case organized-enough
mnaipro breakdown postprocess
mnaipro breakdown artifacts
```

## Raw bridge access

```bash
mnaipro request get /status
mnaipro request get /model/latest
mnaipro request post /model/run --body '{"dryRun":true,"prompt":"preview this branch"}'
mnaipro request post /model/replay --body '{"traceId":"<trace-id>","dryRun":true}'
```

`mnaipro request post /model/run` is the preview-safe entrypoint into the provider-agnostic model backend. It defaults to dry-run behavior unless you intentionally opt into a real provider call through the bridge configuration.

## Experimental gate

```bash
MNAIPRO_EXPERIMENTAL=1 MNAIPRO_EXPERIMENTAL_COMMANDS='ui-probe,private-selector' mnaipro experimental status --json
MNAIPRO_EXPERIMENTAL=1 MNAIPRO_EXPERIMENTAL_COMMANDS='ui-probe,private-selector' mnaipro experimental diagnostics --json
MNAIPRO_EXPERIMENTAL=1 MNAIPRO_EXPERIMENTAL_COMMANDS='ui-probe,private-selector' mnaipro experimental registry --json
```

Those commands stay hidden until the gate is enabled. They report the experimental mode, configured private command names, the latest diagnostic evidence, and the gated command registry for the current session without changing the stable command surface.

## Bridge commands

```bash
mnaipro bridge status
mnaipro bridge doctor
mnaipro bridge render
mnaipro bridge reload
mnaipro bridge logs --scope both --lines 40
mnaipro bridge logs --follow --interval 2
```

## Common recovery path

```bash
mnaipro bridge doctor
mnaipro bridge reload
mnaipro bridge logs --scope both --lines 80
mnaipro bridge logs --follow --interval 2
```

## JSON output

Add `--json` when you want machine-readable output:

```bash
mnaipro doctor --json
mnaipro status --json
mnaipro bridge doctor --json
mnaipro status --obsidian-vault-path /path/to/vault --json
mnaipro doctor --obsidian-vault-path /path/to/vault --json
mnaipro breakdown smoke --json
mnaipro breakdown smoke --bridge-base-url http://127.0.0.1:8765 --compact
mnaipro --base-url http://127.0.0.1:8765 breakdown smoke --case organized-enough --json
mnaipro breakdown postprocess --json
mnaipro breakdown artifacts --json
mnaipro followup apply latest --json
mnaipro plan latest --json
```

`mnaipro status` now carries the same Obsidian sync settings summary / `data.json` path evidence as `doctor`, so the quick health check and the fuller diagnostic view stay aligned.
Those status/doctor surfaces now also attach the local Breakdown artifact audit by default, so normal health checks already show whether the newest Breakdown chain is `complete`, `partial`, or `missing`.
`mnaipro breakdown smoke` still self-hosts by default, but it now also honors a local `--base-url` after the subcommand, an explicit top-level `--base-url`, or the dedicated `--bridge-base-url` flag when you want to reuse an already running bridge.
`mnaipro bridge status` and the local `/status` bridge payload now expose the same settings evidence, the same `breakdownArtifacts` block, and the same `breakdownNextCommand` hint too, so the CLI wrapper and the HTTP bridge stay in lockstep.
The raw bridge passthrough now also exposes `/model/run`, `/model/replay`, and `/model/latest`, so you can inspect and replay the provider-agnostic model backend directly when you need to debug the execution surface.
`mnaipro breakdown postprocess` now prefers the latest `origin = native_ai_breakdown` apply report, then falls back to the latest Breakdown request, then the latest Breakdown plan report; when a plan report is selected, the wrapper also replays through the paired request snapshot so the preview still shows the real branch nodes and strategy pack. If no Breakdown artifacts exist yet, `--json` now returns a structured `no_breakdown_artifacts` diagnostic with the newest ordinary request/plan/apply evidence so you can tell whether the machine is still only producing primary branch runs.
`mnaipro breakdown postprocess` now also exposes `nextCommand = mnaipro breakdown artifacts --json`, and compact output mirrors that same hint as `next=...`, so the preview and the cache-audit companion stay aligned.
`mnaipro breakdown artifacts` is the cache-audit companion to that preview: it reads the local request/report cache directly, classifies the newest Breakdown chain as `complete`, `partial`, or `missing`, checks whether request/plan/apply/followup still share one request id, and shows the latest generic artifacts when no Breakdown-specific chain exists.
`mnaipro status --compact`, `mnaipro bridge status --compact`, and `mnaipro doctor --compact` now also emit a short `next=` hint for the Breakdown drill-down: `mnaipro breakdown postprocess --json` when the newest chain is complete, otherwise `mnaipro breakdown artifacts --json`.
When the local bridge supervisor has recorded lifecycle state, those same compact outputs also include `bridge_supervisor=...` and `bridge_supervisor_pid=...`, so the bridge ownership state stays visible without opening JSON.
`mnaipro breakdown artifacts` now carries the same `nextCommand` recommendation, so the deep audit and the lighter health checks point to the same next action.
`mnaipro followup apply latest` surfaces the latest second-stage execution artifact directly, so you can inspect the exact follow-up apply snapshot without hunting through the reports folder.
`mnaipro followup latest` and `mnaipro followup apply latest` now also surface explicit branch-overview action/fill counts when the second stage comes from `branch_structure_digest`, so the follow-up diagnostics read like an overview instead of a generic excerpt fill.
`mnaipro status --json` now also carries `latestFollowupApply` when that second-stage execution artifact exists, so the quick health view can surface the same follow-up apply snapshot as `doctor`.
`mnaipro status --compact` and `mnaipro doctor --compact` now also emit `followup_apply=1` plus `followup_apply_request=...` when that follow-up apply artifact exists, so the one-line health view keeps the second-stage execution snapshot visible too.
`mnaipro doctor --json` now also carries `latestFollowupApply` when that second-stage execution artifact exists, so the higher-level health view can point at the same follow-up apply snapshot.
`mnaipro followup latest` now also shows the current replay summary beside the stored follow-up artifact, which makes old follow-up snapshots easier to compare against today’s planner output.
`mnaipro replay latest` and `mnaipro replay after-apply` now surface the same strategy-pack and branch-overview summary in offline replay, so cached-request replay and after-apply replay stay aligned with live follow-up vocabulary.

If you are checking live addon wiring instead of replay output, run:

```bash
npm run native-ai:breakdown-origin-check
```

That regression guards the `main.js` execution envelope directly and asserts Breakdown applies keep their `command`, `objective`, and `origin` fields in both blocked and normal apply paths.

## Standalone CLI examples

These commands live outside `mnaipro`, but they are part of the same local workflow:

```bash
marginnote-cli ai status --json
marginnote-cli ai overview --json
marginnote-cli ai boundaries --json
marginnote-cli ai prompts --json
marginnote-cli ai study --json
marginnote-cli ai traces --json
marginnote-cli ai memory --json
marginnote-cli ai preferences export ./preferences.snapshot.json --snapshot --json
marginnote-cli ai preferences restore ./preferences.snapshot.json --dry-run --json
mn-obsidian-bridge ob settings --json
mn-obsidian-bridge ob settings export ./ob-settings.snapshot.json --snapshot --json
mn-obsidian-bridge ob settings restore ./ob-settings.snapshot.json --dry-run --json
mn-obsidian-bridge overview --json
```

`ai status` is the concise native-AI health snapshot, `ai overview` is the top-level capability map, `ai boundaries` is the visible-vs-restricted boundary map, `ai prompts` is the prompt-module / tool-contract view, `ai study` is the Guide / Quiz / Explain evidence view, `ai traces` is the Breakdown / persistence trace view, `ai memory` is the chat-memory / conversation-trace view, `ai preferences export|restore|set|patch|reset` covers patch-compatible preference exports, full `--snapshot` envelopes, and supported native AI preference writes, `ob settings` is the focused Obsidian sync settings / export-root scan view with a stable JSON envelope, `ob settings export|restore|set|patch|reset` covers patch-compatible settings exports, full `--snapshot` envelopes, and supported Obsidian sync setting writes, and `overview` is the bridge-side evidence map that pulls the two sides together while keeping the explicit write surfaces separate.

`doctor` and `overview` now also hint at the matching `export --snapshot` and `restore --dry-run` workflow, so you can back up and preview a restore without hunting through help text.
`ai status --compact` and `mn-obsidian-bridge ob status --compact` now also emit a short `next=` hint for the same workflow.

## Install

```bash
npm link
```

That exposes the local `mnaipro` binary on your PATH while you are developing in this repo.
