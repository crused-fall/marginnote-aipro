# Maintenance Operations

This repository is in maintenance-only mode on `main`. The purpose of this runbook is to keep the maintenance work itself disciplined: stable surfaces stay aligned, regression checks stay meaningful, and durable records stay in sync with shipped behavior.

## Operating model

- Automate first, escalate second: heartbeat and CI should catch routine drift before a human has to intervene.
- Keep the queue small: `MAINTENANCE_BACKLOG.md` is the short list of concrete maintenance checks, not a long roadmap.
- Prefer the smallest safe slice: if a maintenance issue exists, fix only the minimum surface needed to close it.
- Do not turn maintenance into feature work; if a change would expand capability, treat it as a separate slice.

## Priority order

1. Review the most recently changed code surfaces for regressions or behavior drift.
2. Review user-facing docs and help text for clarity, consistency, and UI/usability friction.
3. Verify CI-safe and smoke coverage still matches the shipped behavior.
4. Keep durable records aligned after any user-visible change.

## Maintenance loop

At each heartbeat or routine maintenance pass:

1. Read the durable records first: `PROJECT_STATUS.md`, `PROJECT_MEMORY.md`, and `PROJECT_LOG.md`.
2. Check `MAINTENANCE_BACKLOG.md` and pick one concrete, low-risk item.
3. Inspect the most recently changed surface and decide whether the issue is real.
4. Apply the smallest safe fix, or document why no change was needed.
5. Run the narrowest relevant verification first, then broaden only if needed.
6. Update docs and durable records in the same change when behavior or operator guidance changes.

If safe maintenance work exists, keep the block going for at least 10 minutes and preferably 15-20 minutes before stopping so the pass is more than a cursory scan.

## Weekly cadence

- Audit docs and help text for drift.
- Audit the verification command set to make sure the narrow and broad checks still match shipped behavior.
- Trim or replace stale backlog items so `MAINTENANCE_BACKLOG.md` stays concrete.

## Release preflight

Before a tagged release or other publishable maintenance change:

1. Update `CHANGELOG.md` with the user-visible changes.
2. Run `npm run check:ci`.
3. Run `npm run check` if the change touched stable behavior or operator guidance.
4. Run `npm run addon:build`.
5. Only then proceed with the publish path documented in `docs/release-process.md`.

## Priority levels

- `P0` — stable surface, CI, bridge, or release failure. Fix immediately.
- `P1` — docs/help drift, compact/JSON parity gap, or smoke coverage gap. Fix in the next maintenance round.
- `P2` — wording polish, backlog cleanup, or other low-risk clarity work. Batch when there is spare maintenance time.

## Check map

Stable CLI and docs:

- `mnaipro doctor --compact`
- `mnaipro status --compact`
- `mnaipro bridge doctor --compact`
- `mnaipro bridge status --compact`
- `mnaipro overview --compact`
- `README.md`
- `docs/mnaipro-cli-quickref.md`
- `docs/bridge-ops-quickstart.md`

Bridge and supervisor health:

- `npm run bridge:doctor`
- `npm run bridge:status`
- `mnaipro bridge reload`
- `mnaipro bridge logs --scope both --lines 80`

Native AI and plugin safety:

- `npm run native-ai:matrix`
- `npm run native-ai:templates`
- `npm run native-ai:breakdown-smoke`
- `npm run native-ai:breakdown-origin-check`
- `npm run plugin:agent-core-check`

Verification and release hygiene:

- `npm run check:ci`
- `npm run check`
- `npm run cli:smoke`
- `npm run cli:overview-consistency-check`
- `npm run bridge:model:check`
- `npm run addon:build`
- `CHANGELOG.md`
- `docs/release-process.md`

## Record sync rules

- If a user-visible surface changes, update `README.md`, `docs/mnaipro-cli-quickref.md`, `docs/bridge-ops-quickstart.md`, `PROJECT_STATUS.md`, `PROJECT_MEMORY.md`, and `PROJECT_LOG.md` in the same change unless one of them is clearly out of scope.
- Keep `MAINTENANCE_BACKLOG.md` short and concrete. Replace stale items with a more specific maintenance check instead of letting the file drift into a broad roadmap.
- Treat the runbook as the durable operating model and the backlog as the current work queue.

## Exit criteria for a maintenance slice

A maintenance slice is done when:

- the issue is closed or explicitly judged absent,
- the relevant verification is green,
- the user-visible docs and durable records match the shipped behavior,
- and the backlog still contains only concrete follow-up checks.
