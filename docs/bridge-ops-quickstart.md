# Bridge Ops Quickstart

This repo runs the planning bridge as a local macOS user agent, supervised by a small Node process.

## Deployment model

- `scripts/reload-launch-agent.js` installs the current bridge bundle into `~/Library/Application Support/MNAIProBridge/launchd/current/`
- `scripts/render-launch-agent.js` renders the `launchd` plist
- `launchctl` loads `~/Library/LaunchAgents/com.mnaipro.bridge-supervisor.plist`
- `scripts/bridge-supervisor.js` keeps `bridge/server.js` in sync with MarginNote's lifecycle
- `bridge/server.js` serves the local HTTP bridge on `127.0.0.1:8765`

## Common commands

Use the CLI first:

```bash
mnaipro status --obsidian-vault-path /path/to/vault
mnaipro bridge status
mnaipro bridge doctor
mnaipro bridge reload
mnaipro bridge render
mnaipro bridge logs --scope both --lines 40
mnaipro bridge logs --follow --interval 2
```

If you need the older npm scripts, they still work:

```bash
npm run bridge:status
npm run bridge:doctor
npm run bridge:launchd:reload
npm run bridge:supervisor:check
```

## Breakdown smoke

The Breakdown smoke wrapper self-hosts a temporary bridge by default, but it can also reuse an already running bridge when you want to compare live and self-hosted behavior:

```bash
mnaipro breakdown smoke --json
mnaipro breakdown smoke --bridge-base-url http://127.0.0.1:8765 --compact
mnaipro breakdown smoke --base-url http://127.0.0.1:8765 --case organized-enough --json
mnaipro --base-url http://127.0.0.1:8765 breakdown smoke --case organized-enough --json
```

## Where to look when something is off

- launch agent plist: `~/Library/LaunchAgents/com.mnaipro.bridge-supervisor.plist`
- installed bridge bundle: `~/Library/Application Support/MNAIProBridge/launchd/current/`
- supervisor logs: `tmp/bridge-supervisor/`
- bridge reports: `~/Library/Containers/QReader.MarginStudy.easy/Data/Library/Caches/MNAIProBridge/reports/`

## Fast recovery path

1. Run `mnaipro bridge doctor`
2. If the bridge is offline, run `mnaipro bridge reload`
3. Re-run `mnaipro bridge doctor`
4. If it still looks wrong, inspect the latest diagnostics with `mnaipro diag latest`
5. If you want raw process output, run `mnaipro bridge logs --scope both --lines 80`
6. If you want to watch the logs live, run `mnaipro bridge logs --follow --interval 2`

## Reading the status hint

`mnaipro bridge doctor` now includes a short `hint` field to make the current state easier to read:

- `healthy` means the local HTTP bridge answered successfully
- `waiting_for_marginnote` usually means the supervisor is intentionally holding the bridge until MarginNote is visible again
- `bridge_starting` means launchd started the supervisor, but the bridge has not finished coming up yet
- `launch_agent_missing` means the LaunchAgent plist is not installed
- `supervisor_running_bridge_unreachable` means launchd has the supervisor, but the HTTP bridge is still not answering

`mnaipro status --compact` and `mnaipro bridge doctor --compact` now also surface the bridge supervisor ownership as `bridge_supervisor=...` and the current tracked pid as `bridge_supervisor_pid=...`, so you can see whether the bridge is spawned, adopted, external, or stopped without opening JSON.

That same doctor output now also carries the Obsidian sync settings summary and expected `data.json` path, so the root bridge diagnostics stay aligned with the standalone Obsidian bridge CLI.

`mnaipro status` now carries the same Obsidian sync settings summary and expected `data.json` path, so the fast status check and the fuller doctor check share the same local vault evidence.
`mnaipro bridge status`, `npm run bridge:status`, and the raw `/status` HTTP response now expose the same settings evidence too, so every bridge-facing status entrypoint stays aligned.

If you want the bridge-side evidence map instead of the operational health check, run `mn-obsidian-bridge overview --json` from the standalone bridge CLI. That command still reads only, while `mn-obsidian-bridge ob settings export|restore|set|patch|reset` handles the supported settings snapshot and write surface for Obsidian sync settings.
