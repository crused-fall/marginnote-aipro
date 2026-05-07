# Native AI Template Governance Patch Proposal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** add a deterministic, read-only `patchExport` surface to the existing native AI template governance report so whitespace-only prompt normalization can be exported as a safe preview artifact.

**Architecture:** keep the rule engine in `bridge/native-ai-template-governance.js`, keep the user-facing command in `scripts/inspect-native-ai-templates.js`, and keep regression coverage in `scripts/check-native-ai-template-governance.js`. The new surface is report-only: it must not write templates back to MarginNote, and semantic template quality issues remain warnings/recommendations rather than patch proposals.

**Tech Stack:** Node.js, the repo’s existing assertion-based smoke/regression scripts, and the current local MarginNote inspection helpers.

---

### Task 1: Add a patch export builder to the governance engine

**Files:**
- Modify: `bridge/native-ai-template-governance.js`
- Modify: `scripts/check-native-ai-template-governance.js`

**Behavior to add:**
- derive `patchExport` from the same normalized template snapshot used by the current lint/report logic
- emit only whitespace-normalization proposals for enabled `prompt` fields
- keep `qualityFindings`, `normalizationSuggestions`, `templateDiffs`, and `recommendations` unchanged
- expose summary counts for proposal count and affected template count

**Failing test to write first:**

```js
const assert = require("assert");
const { analyzeTemplates } = require("../bridge/native-ai-template-governance");

const report = analyzeTemplates([
  {
    index: 0,
    kind: "translation",
    deepMode: false,
    fieldCount: 2,
    enabledFieldCount: 1,
    enabledContentFieldCount: 1,
    fields: [
      { type: "title", enabled: false, prompt: "", cloze: false },
      { type: "content", enabled: true, prompt: "  翻译成英文  ", cloze: false }
    ]
  }
]);

assert.strictEqual(report.patchExport.format, "template-patch-proposal-v1");
assert.strictEqual(report.patchExport.safeOnly, true);
assert.strictEqual(report.patchExport.summary.proposalCount, 1);
assert.strictEqual(report.patchExport.summary.affectedTemplateCount, 1);
assert.strictEqual(report.patchExport.proposals[0].op, "replace");
assert.strictEqual(report.patchExport.proposals[0].path, "templates[0].fields[1].prompt");
assert.strictEqual(report.patchExport.proposals[0].before, "  翻译成英文  ");
assert.strictEqual(report.patchExport.proposals[0].after, "翻译成英文");
assert.strictEqual(report.patchExport.proposals[0].safe, true);
```

**Run to verify it fails first:**

```bash
node scripts/check-native-ai-template-governance.js
```

Expected: fail because `patchExport` does not exist yet.

**Minimal implementation target:**
- add a helper that walks the template array and builds proposal objects for whitespace-only prompt normalization
- build `patchExport.summary.affectedTemplateIndexes` from the unique template indexes in proposals
- export the helper only if it keeps the module clean; otherwise keep it internal and attach the result to `analyzeTemplates(...)`

**Run to verify it passes:**

```bash
node scripts/check-native-ai-template-governance.js
```

Expected: `Template governance checks OK ...` with the new patch export assertions passing.

---

### Task 2: Render patch export in the template inspector

**Files:**
- Modify: `scripts/inspect-native-ai-templates.js`

**Behavior to add:**
- include `patchExport` in the report returned by `buildTemplateReport()`
- render a `Patch export` section in text mode
- make the preview-only boundary explicit in the text output
- keep JSON output stable and additive

**Test-first check to add:**

```js
const { buildTemplateReport, renderText } = require("../scripts/inspect-native-ai-templates");

const report = buildTemplateReport();
assert.ok(report.patchExport, "missing patchExport");
assert.ok(renderText(report).includes("Patch export"), "missing patch export text section");
assert.ok(
  renderText(report).includes("preview-only") || renderText(report).includes("does not write"),
  "missing preview-only boundary text"
);
```

**Run to verify it fails first:**

```bash
node scripts/check-native-ai-template-governance.js
node scripts/inspect-native-ai-templates.js
```

Expected: the direct unit-style assertion fails until the script exports the needed helpers and report field.

**Minimal implementation target:**
- refactor the script so `buildTemplateReport` and `renderText` can be required from tests
- print the patch summary and proposal list in text mode
- keep the existing template mirror, warnings, diffs, and recommendations intact

**Run to verify it passes:**

```bash
node scripts/inspect-native-ai-templates.js --json
node scripts/inspect-native-ai-templates.js
```

Expected: JSON includes `patchExport`, and text output contains a readable patch section.

---

### Task 3: Update durable docs and project memory

**Files:**
- Modify: `README.md`
- Modify: `docs/native-ai-supervision-matrix.md`
- Modify: `PROJECT_MEMORY.md`
- Modify: `PROJECT_STATUS.md`
- Modify: `MEMORY.md`

**Behavior to document:**
- `npm run native-ai:templates` now emits deterministic patch proposals
- the export is preview-only and read-only
- only whitespace normalization is exportable in v1
- semantic quality findings remain recommendations, not patches

**Concrete content to add:**

```md
- `npm run native-ai:templates` now also emits a structured `patchExport` proposal surface for whitespace-only prompt normalization.
- The patch export is preview-only and does not write back to MarginNote.
- Semantic template issues still remain warnings and recommendations, not patch proposals.
```

**Run to verify the docs are coherent:**

```bash
git diff --check
npm run check:ci
```

Expected: no whitespace or syntax issues, and CI-safe checks still pass.

---

### Task 4: Full verification and final cleanup

**Files:**
- None new; only verify the touched files

**Run the narrow checks first:**

```bash
node scripts/check-native-ai-template-governance.js
node scripts/inspect-native-ai-templates.js --json
node scripts/inspect-native-ai-templates.js
```

**Then run repo-wide checks:**

```bash
npm run check:ci
npm run check
```

**Success criteria:**
- the governance report now exposes `patchExport`
- only safe whitespace normalization appears in the export
- the text and JSON inspector output both surface the new proposal section
- docs and memory files describe the new boundary
- repo-wide verification stays green

---

## Self-review checklist

- Spec coverage: patch export builder, inspector rendering, docs, and verification are each assigned a task.
- Placeholder scan: no TODO/TBD placeholders remain in the plan text.
- Type consistency: `patchExport`, `proposals`, `summary`, `buildTemplateReport`, and `renderText` are used consistently across tasks.
- Scope check: the plan stays read-only and does not add any write/apply path.

