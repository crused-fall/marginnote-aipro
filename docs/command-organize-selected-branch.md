# Command Spec: 整理当前选中分支

## Purpose

Help the user organize the currently selected branch in MarginNote in a way that feels agentic, while staying safe and explainable.

## First Version Goal

The first version should improve a selected subtree through preview-first planning and optional safe execution.

## Command Name

`整理当前选中分支`

## Mode Selection

When the user clicks the addon command, the addon first shows a two-option selector:

- `整理当前选中分支`
- `整理 AI Breakdown 分支`

The second option keeps the same preview-first and safe-apply flow, but it tags the bridge request with `origin: "native_ai_breakdown"` so live, follow-up, replay, and inspection artifacts can recognize it as the Breakdown subcommand.

## Scope

Default scope is the current selected subtree only.

The command should not silently affect:

- sibling branches
- unrelated roots
- the whole notebook

## Interaction Model

### Step 1: Preview

The command first runs in preview mode.

It should show:

- a branch-level visual strategy pack when visible organization actions exist
- a branch-level organized-enough strategy result when this pass has no new visible actions and no structural blockers
- which notes will be updated
- title changes
- color changes
- tags to add
- comments to add
- unsupported structural suggestions
- concrete structure proposals when possible, such as:
  - how an overloaded branch could be split into clearer topic groups
  - how duplicate sibling titles could be disambiguated

### Step 2: Confirm

The user can then choose to apply safe actions.

Before applying, the user should be able to review note pages in-app and exclude specific notes from execution.

### Step 3: Apply safe actions

The command applies only supported public-api actions.

## Safe Actions In Phase 1

- `set_title`
- `set_color_index`
- `append_tags`
- `append_comment`
- `rewrite_excerpt`
- `remove_comments_by_text`

`set_title` may also be used to disambiguate duplicate sibling titles when the planner can produce specific, unique, content-based rename proposals with high confidence.
`set_color_index` is the first controlled visual action: it should remain preview-first, explain why a role-based color is suggested, and only execute after confirmation.
The same pass can also correct a small number of visibly important notes that already have a stale color, but only when the role signal is strong enough to justify a focused recolor instead of repainting the branch.
The first pass should also stay conservative: keep structural branch colors, then only surface a small number of the clearest non-summary recolor suggestions instead of repainting an entire branch at once.
When shape signals are available, those non-summary recolors should prefer notes that are currently visible and visually important in the mind map, instead of spending the first pass on hidden or deep-offscreen leaves.

## Planned Visual Actions After Phase 1

- richer color policies beyond the current role-based first pass

The first controlled color change now exists, but broader visual styling should still wait until preview text, confidence signals, and execution policy stay as clear as the existing text edits.

## Explicitly Not Auto-Applied In Phase 1

- reparenting notes
- moving nodes on the canvas
- visual layout rearrangement
- destructive merges

These should appear only as suggestions or warnings.

In preview, unsupported structural suggestions should be as specific as possible instead of generic warnings.

Examples:

- "This branch has 7 children; consider splitting into Definition / Example / Proof groups"
- "These 3 sibling notes all use the title Example; consider renaming them to Example - Definition / Example - Proof / Example - Worked example"

## Output Requirements

The preview output should be understandable without reading raw JSON.

At minimum it should summarize:

- strategy-pack summary when visible organization actions exist
- an explicit "already organized enough" strategy result when there are no new visible actions to run this pass
- action count
- affected note count
- structural warnings
- unsupported actions

When available, each planned action or structural suggestion should also carry lightweight planner metadata:

- source
- confidence
- brief evidence

Planned executable actions should also declare an execution disposition:

- `safe_auto`
- `review_required`
- `suggest_only`

Planned executable actions should be grouped into stable pipeline phases so preview and execution stay deterministic:

- `cleanup`
- `normalize`
- `enrich`

## Failure Behavior

If no node is selected:

- do not continue
- show a clear message

If the planner fails:

- do not mutate anything
- show the error

If applying actions fails partway through:

- stop further writes
- report which action failed

## Product Principles

- preview first
- mutate only the selected subtree
- no silent structural edits
- no hidden side effects
- keep the plan inspectable
