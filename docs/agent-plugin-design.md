# MarginNote Agent Plugin Design

## Goal

Make MarginNote behave more like an agent for mind map cleanup and organization, instead of only offering chat and content generation.

Examples:

- normalize titles across a selected branch
- add tags based on the content of cards
- append concise summaries or action notes
- detect shallow or duplicated nodes
- propose a cleaner hierarchy before any destructive action
- auto-disambiguate duplicate sibling titles when a specific content-based rename is clear enough

## Practical boundary

The exposed addon APIs are strong enough for:

- reading selected nodes
- reading ancestors and descendants
- reading excerpts and comments
- editing titles
- editing tags
- editing text comments
- rewriting the main excerpt

They do not clearly expose a safe public setter for:

- changing parent-child relationships
- dragging nodes on the canvas
- forcing branch layout
- bulk spatial rearrangement on the mind map canvas

That means a true agent should be designed as two layers:

1. Planner
   Reads the current tree, decides what should change, and emits an action plan.
2. Executor
   Runs only actions that are known to be safe in the public addon API.

Structural actions should start in one of these modes:

- `suggest_only`
  The agent proposes the new structure but does not mutate it.
- `experimental`
  Use private selectors or UI automation behind a feature flag.

There is also a useful middle ground:

- structure-aware safe edits
  The planner may use structural context to generate safe note-local edits, such as renaming duplicate sibling titles without changing hierarchy.

## Routing layer

Codex-side task routing is separated from plugin execution. The local `marginnote` skill routes requests to the right surface:

- `marginnote-cli` for native MarginNote inspection and supported native preference writes
- `mnaipro` for this repo's selected-branch agent workflow
- `mn-obsidian-bridge` for bridge and Obsidian sync diagnostics

That keeps the plugin design focused on execution while leaving surface selection to a thin dispatcher.

## Architecture

### MarginNote plugin side

Responsibilities:

- collect current selection
- serialize node context
- call local bridge
- apply safe actions
- refuse unsupported or dangerous actions
- show progress and failures

### Local bridge side

Responsibilities:

- hold model credentials
- call the real LLM
- enforce action schema
- keep logs and dry-run traces
- support undo-friendly plans
- attach planner metadata such as source, confidence, and brief evidence so actions remain inspectable
- classify each action into execution tiers such as `safe_auto`, `review_required`, or `suggest_only`
- keep action order stable via pipeline phases such as `cleanup`, `normalize`, and `enrich`

## Action schema

Recommended first action set:

- `set_title`
- `append_tags`
- `append_comment`
- `rewrite_excerpt`
- `noop`

Second phase:

- `merge_candidates`
- `duplicate_candidates`
- `suggest_parent`
- `suggest_branch_order`

Experimental phase:

- `reparent_node`
- `move_canvas_node`
- `toggle_group_mode`

## Suggested rollout

### Phase 1

Ship an agent that only edits content and metadata.

Why:

- low risk
- immediately useful
- public API coverage is clear

### Phase 2

Ship a structural planner in `suggest_only` mode.

Output:

- which node should move
- suggested parent
- confidence
- reason

### Phase 3

Add opt-in experimental execution for structural edits.

Only do this after you have:

- stable action logging
- per-action confirmation
- undo strategy
- a fallback when the runtime selector changes

## Safety rules

- Never run structural edits silently.
- Never mutate more than the selected subtree by default.
- Always log the exact planned actions before execution.
- Prefer idempotent actions.
- Support dry-run for every command.
- Reject plans that mention unknown note ids.

## Minimum viable command

The first command worth shipping is:

`整理当前选中分支`

It should:

1. read selected nodes
2. normalize titles
3. add missing tags
4. append a short rationale comment
5. optionally rewrite low-quality excerpt text

This already feels agentic to users without depending on unstable private APIs.
