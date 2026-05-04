# OhMyMN Integration Notes

This repository now has a reusable command core, but the exact addon shell is still intentionally thin.

## What to wire up

Your real addon entry should do three things:

1. expose a command in the addon UI
2. build an `api` adapter from the MarginNote runtime
3. call `createCommandRunner(...)`

## Required adapter shape

The command runner expects:

- `getSelectedNodes()`
- `fetch(url, options)`
- optional `showHUD(message)`
- optional `hideHUD()`

## Suggested adapter mapping

For an OhMyMN-based addon, the adapter will usually wrap:

- `NodeNote.getSelectedNodes()`
- `fetch` from `marginnote`
- whatever HUD helper your addon shell already uses

## Example shape

This is intentionally conservative and may need adjustment to the addon framework you choose:

```js
const { fetch, NodeNote } = require("marginnote");
const { createCommandRunner } = require("./index");

const runAgentOrganize = createCommandRunner({
  objective: "整理当前选中分支，统一标题并补充标签",
  dryRun: false,
});

async function onCommand() {
  return runAgentOrganize({
    api: {
      getSelectedNodes: () => NodeNote.getSelectedNodes(),
      fetch,
      showHUD: (message) => showHUD(message),
      hideHUD: () => hideHUD(),
    },
  });
}
```

## Why this file stays example-only

The public docs clearly cover note access and network access, but addon bootstrapping differs between helper stacks. Keeping the integration layer narrow lets us swap in:

- official `mnaddon-helper`
- an OhMyMN addon shell
- a custom private loader

without rewriting the agent core.
