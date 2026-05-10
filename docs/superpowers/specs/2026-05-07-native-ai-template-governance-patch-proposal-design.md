# Native AI Template Governance Patch Proposal Design

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** turn the existing MarginNote native AI template governance report into a deterministic, read-only patch proposal surface that exports safe normalization edits without adding any write path.

**Architecture:** keep `scripts/inspect-native-ai-templates.js` as the user-facing entrypoint, keep `bridge/native-ai-template-governance.js` as the rule engine, and extend the report with a structured `patchExport` object derived only from already-safe prompt whitespace normalization. Semantic issues such as generic content prompts, duplicate fingerprints, or weak field coverage remain recommendations and warnings, not patches.

**Tech Stack:** Node.js, the existing native AI inspection helpers, plain JSON/text rendering, and the repo’s current assertion-based regression scripts.

---

## Context

The current template governance path already does three useful things:

- mirrors MarginNote OCR / card templates from local preferences
- classifies them and reports structural findings
- suggests prompt whitespace normalization in human-readable form

What it does not yet provide is a first-class patch export that a later write-enabled workflow could consume safely. The next module adds that missing middle layer while staying read-only.

This module is explicitly conservative:

- no direct writes to defaults, plist, or app state
- no new template creation or deletion
- no field reordering
- no deepMode or kind mutation
- no semantic rewrite proposals disguised as patches

Only whitespace normalization in enabled prompt fields becomes an exportable patch.

## Proposed Contract

### Report shape

`bridge/native-ai-template-governance.js` will keep returning the existing analysis fields and add one new top-level object:

```ts
patchExport: {
  format: "template-patch-proposal-v1";
  safeOnly: true;
  summary: {
    proposalCount: number;
    affectedTemplateCount: number;
    affectedTemplateIndexes: number[];
  };
  proposals: Array<{
    key: string;
    op: "replace";
    path: string;
    templateIndex: number;
    fieldIndex: number;
    fieldType: string;
    templateKind: string;
    deepMode: boolean;
    before: string;
    after: string;
    reason: "normalize_whitespace";
    safe: true;
  }>;
}
```

### Proposal rules

The export is generated from the same template snapshot already used for linting:

- only enabled fields are considered
- only `prompt` text is eligible
- only collapsing whitespace runs to single spaces and trimming is proposed
- if `before === after`, no proposal is created
- semantic findings remain in `qualityFindings` and `recommendations`

### Output behavior

`scripts/inspect-native-ai-templates.js` will continue to support the current text and `--json` output styles, but now both surfaces should surface the patch export:

- JSON consumers get `patchExport`
- text consumers get a `Patch export` section with the proposal count and a readable list of proposed replacements
- the final line should still make it obvious that this is preview-only and does not write to MarginNote

No new command is required for v1. The existing `npm run native-ai:templates` entrypoint becomes the patch export surface.

## File Responsibilities

### `bridge/native-ai-template-governance.js`

Own the rules and derived data:

- keep `normalizePrompt`, `buildTemplateFingerprint`, `qualityFindings`, and `diffTemplates`
- add a patch proposal builder that converts whitespace-only prompt normalization opportunities into `patchExport.proposals`
- add a `patchExport.summary` builder that counts proposals and affected templates
- keep semantic findings out of the patch export

### `scripts/inspect-native-ai-templates.js`

Own the command UX:

- attach `patchExport` to the report object
- render a readable patch section in text mode
- preserve the current template mirror, warnings, normalization suggestions, diffs, and recommendations
- make the preview-only boundary explicit in the rendered text

### `scripts/check-native-ai-template-governance.js`

Own regression coverage:

- assert that the new patch export exists and is structured
- assert that whitespace-only changes become proposals
- assert that semantic-only findings do not become proposals
- assert that proposal paths, before/after values, and safety flags are stable
- assert that a clean template set yields an empty patch export without breaking the rest of the report

### Documentation and memory files

Update the durable docs once the implementation lands:

- `README.md`
- `docs/native-ai-supervision-matrix.md`
- `PROJECT_MEMORY.md`
- `PROJECT_STATUS.md`
- `MEMORY.md`

The documentation update should say exactly this:

- the template governance command now exports a deterministic patch proposal surface
- the export is preview-only and read-only
- only safe whitespace normalization is included in v1
- semantic suggestions still remain recommendations, not patches

## Non-Goals

This module does not:

- write normalized templates back to MarginNote
- add a `restore` or `apply` command for templates
- invent semantic prompt rewrites
- auto-merge duplicate templates
- change the current template classification logic
- expand beyond the OCR / card template domain already mirrored by the current command

## Testing Strategy

The implementation should be covered with the existing assertion-based script plus the repo-wide checks.

### Minimum regression checks

- `node scripts/check-native-ai-template-governance.js`
- `node scripts/inspect-native-ai-templates.js --json`
- `node scripts/inspect-native-ai-templates.js`
- `npm run check:ci`
- `npm run check`

### Assertions to add

Use one template fixture with whitespace in a prompt field and one clean fixture with no normalization opportunities.

For the whitespace fixture:

- `patchExport.summary.proposalCount === 1`
- `patchExport.summary.affectedTemplateCount === 1`
- the proposal `op` is `replace`
- the proposal `path` points at the normalized prompt field
- `before` preserves the original whitespace
- `after` is trimmed
- `safe === true`
- the generic content finding still appears as a warning or info finding, but not as a patch

For the clean fixture:

- `patchExport.summary.proposalCount === 0`
- `patchExport.proposals` is an empty array
- the rest of the report remains valid

## Rollout

Implement this module in four small steps:

1. add the patch proposal builder in `bridge/native-ai-template-governance.js`
2. wire `patchExport` into `scripts/inspect-native-ai-templates.js`
3. extend `scripts/check-native-ai-template-governance.js`
4. update docs and project memory files after verification passes

## Success Criteria

This module is done when all of the following are true:

- the template command exports structured patch proposals in JSON
- the text report shows a readable preview-only patch section
- only whitespace normalization is exportable as a patch in v1
- semantic template quality issues are still visible, but not represented as patches
- repo-wide verification passes
- the docs and memory files describe the new read-only patch export boundary

## Open Decisions

None for v1.

The only allowed patch class is whitespace normalization of enabled prompt fields. If we later want semantic rewrite proposals or a real apply path, that should be a separate module with its own design.
