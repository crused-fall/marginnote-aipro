# Bridge Supervisor

## Goal

Keep the local planning bridge available without requiring manual restarts, while avoiding a bridge process running when MarginNote is closed.

## Design

We use two layers:

1. `scripts/bridge-supervisor.js`
   A lightweight Node supervisor that polls the local process list.
2. `launchd` user agent
   Starts the supervisor automatically in the logged-in macOS session.

The supervisor behavior is:

- if `MarginNote 4` is running, ensure `bridge/server.js` is running
- if `MarginNote 4` is not running, stop the bridge
- if the bridge crashes while MarginNote is open, restart it on the next check
- if process detection is flaky for a moment, avoid immediately tearing the bridge down
- if a bridge is already healthy on the target port, do not spawn a duplicate just because the supervisor restarted
- if the supervisor restarted but its previous bridge pid is still alive (pid file + command line match), the supervisor will adopt that bridge pid so it can still be stopped when MarginNote closes

When reading logs or `mnaipro bridge doctor`, a short-lived offline state can be normal:

- `waiting_for_marginnote` usually means the bridge has been parked intentionally because MarginNote was not detected for a few checks
- `bridge_starting` usually means launchd has started the supervisor and it is still bringing the HTTP bridge up

That same doctor output now also includes the Obsidian sync settings summary and expected `data.json` path, so missing-vs-present vault evidence is visible alongside the bridge health snapshot.

If you want to compare the launchd-managed bridge with a self-hosted smoke run, `mnaipro breakdown smoke` can reuse an already running bridge via `--bridge-base-url`, `--base-url` after the subcommand, or an explicit top-level `--base-url`; otherwise it still self-hosts by default.

## Files

- supervisor: `scripts/bridge-supervisor.js`
- plist renderer: `scripts/render-launch-agent.js`
- plist reloader: `scripts/reload-launch-agent.js`
- rendered plist output: `tmp/com.mnaipro.bridge-supervisor.plist`
- supervisor logs: `tmp/bridge-supervisor/`
- supervisor state: `tmp/bridge-supervisor/bridge-state.json`
- doctor script: `scripts/bridge-doctor.js`

## Why this route

This is more stable than asking the user to manually run `node bridge/server.js`, and simpler than wiring a private MarginNote lifecycle hook.

It also keeps the project aligned with the current safety boundary:

- planner stays outside MarginNote
- note mutation stays inside the addon
- launch/startup logic stays outside the addon runtime

## Expected install path

The rendered plist is intended to be copied to:

`~/Library/LaunchAgents/com.mnaipro.bridge-supervisor.plist`

Then load it with `launchctl` for the current user session.

## Current deployment flow

Today the bridge is deployed as a local macOS user agent, not as a standalone daemon or inside the addon bundle:

1. `scripts/reload-launch-agent.js` copies the current bridge/supervisor files into
   `~/Library/Application Support/MNAIProBridge/launchd/current/`
2. `scripts/render-launch-agent.js` renders a `launchd` plist that points at
   `scripts/run-bridge-supervisor.sh`
3. `launchctl bootstrap` loads `~/Library/LaunchAgents/com.mnaipro.bridge-supervisor.plist`
4. `launchd` starts the Node supervisor
5. The supervisor watches for MarginNote, then starts `bridge/server.js` on `127.0.0.1:8765`

So in practice the bridge is:

- local-only
- per-user
- launchd-managed
- supervised by a small Node process that keeps it in sync with MarginNote's lifecycle

## Test knobs

These environment variables exist primarily to make the supervisor regression checks deterministic:

- `MN_BRIDGE_SUPERVISOR_STATE_DIR` overrides where the supervisor writes `bridge.pid` and logs (default: `tmp/bridge-supervisor/` inside the current bundle).
- `MN_SUPERVISOR_FORCE_MARGINNOTE_STATE=running|stopped` forces the supervisor's MarginNote detection result, so tests can simulate open/close even on a machine where MarginNote is currently running.

The state file records the bridge lifecycle in a single machine-readable snapshot:

- `ownership`: `none`, `spawned`, `adopted`, `external`, or `stopped`
- `bridgePid`: the current managed bridge pid when one is tracked
- `bridgeRunning`: whether the supervisor believes a bridge is currently alive
- `lastAction`: the last lifecycle transition the supervisor recorded
