# mnaipro Operator Launcher Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Status:** complete. `mnaipro operator` landed on `main`; this plan is kept as a historical implementation record while live status lives in `PROJECT_STATUS.md`.

**Goal:** add a thin `mnaipro operator` launcher that inspects the stable CLI surfaces, recommends the next stable command, and can optionally run that command without changing the default preview-first behavior.

**Architecture:** keep the launcher entirely on top of the existing stable `mnaipro` surfaces. The new command will reuse the current status / doctor / overview evidence, choose one recommended stable follow-up command from a small deterministic decision tree, and print a readable operator report in both text and JSON. Optional execution will shell out to the existing `mnaipro` binary only; no new backend or hidden side channel is introduced.

**Tech Stack:** Node.js, Commander, existing `cli/mnaipro.js` reporting helpers, and the current smoke/regression scripts.

---

### Task 1: Add the operator report and launcher helpers

**Files:**
- Modify: `cli/mnaipro.js`
- Test: `scripts/check-cli-smoke.js`

- [x] **Step 1: Add a failing smoke expectation for the new command**

```js
const mnaiproOperatorResult = runCommand('mnaipro operator', mnaiproCli, ['operator', '--json']);
const mnaiproOperator = parseJson('mnaipro operator', mnaiproOperatorResult.stdout);
ensure(report, 'mnaipro operator ok', mnaiproOperator.ok === true, { kind: mnaiproOperator.kind });
ensure(report, 'mnaipro operator kind exposed', mnaiproOperator.kind === 'operator', { kind: mnaiproOperator.kind });
ensure(report, 'mnaipro operator recommendation exposed', typeof mnaiproOperator.recommendedCommand === 'string' && mnaiproOperator.recommendedCommand.length > 0, {
  operator: mnaiproOperator,
});
```

- [x] **Step 2: Run the focused smoke path and confirm it fails before implementation**

Run: `node scripts/check-cli-smoke.js --portable --json`

Expected: the smoke run fails on the missing `mnaipro operator` assertions.

- [x] **Step 3: Implement the minimal launcher helpers**

```js
function buildOperatorReport(program, options = {}) {
  // Reuse buildOverviewReport and choose a stable next command from the current health signals.
}

function formatOperatorLines(report) {
  // Print the recommendation, the reason, and the evidence snapshot.
}

function formatOperatorCompact(report) {
  // Emit kind, recommendation, source, and optional execution mode on one line.
}
```

- [x] **Step 4: Run the focused smoke path again and confirm it passes**

Run: `node scripts/check-cli-smoke.js --portable --json`

Expected: the operator assertions pass and the new command reports a recommendation.

### Task 2: Wire `mnaipro operator` into the public command surface

**Files:**
- Modify: `cli/mnaipro.js`
- Modify: `README.md`
- Modify: `docs/mnaipro-cli-quickref.md`

- [x] **Step 1: Add the command entry to the CLI tree**

```js
program
  .command("operator")
  .description("Recommend the next stable mnaipro command, with optional launcher execution.")
  .option("--base-url <url>", "bridge base URL")
  .option("--obsidian-vault-path <path>", "Obsidian vault root used for sync settings evidence")
  .option("--run", "execute the recommended stable command")
  .option("--json", "emit JSON output")
  .option("--compact", "emit a compact single-line summary")
  .action(async (cmd) => {
    await handleOperator({
      baseUrl: cmd.baseUrl || program.opts().baseUrl,
      obsidianVaultPath: cmd.obsidianVaultPath || program.opts().obsidianVaultPath,
      run: !!cmd.run,
      json: !!cmd.json || !!program.opts().json,
      compact: !!cmd.compact || !!program.opts().compact,
    });
  });
```

- [x] **Step 2: Add `operator` to the command-surface catalog and capability registry output**

```js
{
  label: "Operator",
  prefix: "mnaipro",
  commands: ["operator"],
  summary: "Launch the next stable command from a single operator entrypoint.",
}
```

- [x] **Step 3: Document the new launcher in the repo docs**

```md
mnaipro operator --json
mnaipro operator --compact
mnaipro operator --run --json
```

- [x] **Step 4: Verify the help/footer text now exposes the new operator surface**

Run: `node cli/mnaipro.js --help`

Expected: the help footer includes `mnaipro operator` in the command groups and common flows.

### Task 3: Update the capability and operator smoke coverage

**Files:**
- Modify: `scripts/check-cli-smoke.js`

- [x] **Step 1: Add the capability count expectations for the extra top-level command**

```js
ensure(report, 'mnaipro capabilities command count exposed', mnaiproCapabilities.commandCount === 22, {
  commandCount: mnaiproCapabilities.commandCount || 0,
  topLevelCount: mnaiproCapabilities.topLevelCount || 0,
});
ensure(report, 'mnaipro capabilities group count exposed', mnaiproCapabilities.groupCount === 8, {
  groupCount: mnaiproCapabilities.groupCount || 0,
});
ensure(report, 'mnaipro capabilities compact exposes summary', /commands=22/.test(mnaiproCapabilitiesCompactResult.stdout || '') && /groups=8/.test(mnaiproCapabilitiesCompactResult.stdout || '') && /topLevel=13/.test(mnaiproCapabilitiesCompactResult.stdout || ''), {
  stdout: mnaiproCapabilitiesCompactResult.stdout || '',
});
```

- [x] **Step 2: Add a compact/operator-specific assertion that the launcher exposes a `next=` hint**

```js
ensure(report, 'mnaipro operator compact exposes next command', /kind=operator/.test(mnaiproOperatorCompactResult.stdout || '') && /next=/.test(mnaiproOperatorCompactResult.stdout || ''), {
  stdout: mnaiproOperatorCompactResult.stdout || '',
});
```

- [x] **Step 3: Run the smoke suite once more to validate the public surface**

Run: `node scripts/check-cli-smoke.js --portable --json`

Expected: the command registry, help footer, and operator launcher assertions all pass.

### Task 4: Reconcile long-lived docs and status files

**Files:**
- Modify: `PROJECT_MEMORY.md`
- Modify: `PROJECT_STATUS.md`
- Modify: `README.md`
- Modify: `docs/mnaipro-cli-quickref.md`

- [x] **Step 1: Record the operator launcher as the completed phase 8 expansion**

```md
- `mnaipro operator` is the thin operator launcher that inspects stable surfaces and can run the next stable command on demand.
```

- [x] **Step 2: Update the project status so future work reflects the new surface**

```md
- The phase 8 optional expansion included the `mnaipro operator` launcher on top of the stable CLI surfaces.
```

- [x] **Step 3: Update the quick reference and README examples**

```md
mnaipro operator --json
mnaipro operator --compact
mnaipro operator --run
```

- [x] **Step 4: Re-read the edited docs for consistency before finishing**

Run: `sed -n '1,120p' PROJECT_STATUS.md && printf '\n---\n' && sed -n '1,140p' PROJECT_MEMORY.md && printf '\n---\n' && sed -n '1,120p' docs/mnaipro-cli-quickref.md`

Expected: the operator launcher is described as an optional top-layer tool, not a hidden dependency inside the stable commands.

### Task 5: Final verification

**Files:**
- Modified files from Tasks 1-4

- [x] **Step 1: Run the narrow JavaScript syntax check on the touched CLI file**

Run: `node --check cli/mnaipro.js`

Expected: no syntax errors.

- [x] **Step 2: Run the portable CLI smoke suite**

Run: `node scripts/check-cli-smoke.js --portable --json`

Expected: the operator launcher, updated counts, and help surface all pass.

- [x] **Step 3: Run the CI-safe repository check**

Run: `npm run check:ci`

Expected: the repository still passes the CI-safe verification subset.
