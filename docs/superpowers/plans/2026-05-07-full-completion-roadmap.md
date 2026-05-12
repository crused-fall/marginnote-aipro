# From Current State to Full Completion Roadmap

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Status:** complete. This roadmap has been executed and is retained as a historical planning artifact; current phase state lives in `PROJECT_STATUS.md` and durable decisions live in `PROJECT_MEMORY.md`.

**Goal:** bring this repository from the current `mnaipro`-centered baseline to a stable, shippable set of separated product lines: `mnaipro`, `marginnote-cli`, `mn-obsidian-bridge`, and a provider-agnostic bridge model backend.

**Architecture:** keep the three product lines separate, finish the stable public read/write surfaces first, then add the provider-agnostic bridge backend, then gate private or experimental integrations behind explicit flags, and finally harden release and GitHub workflows. Safe, preview-first behavior remains the default unless a command is explicitly documented as write-enabled.

**Tech Stack:** Node.js, `mnaddon4`, local MarginNote and Obsidian evidence files, GitHub Actions, shell scripts, and JSON/text regression fixtures.

---

## Current baseline

The repo is already past the “blank starter” stage. The current baseline includes:

- a deterministic planner/bridge/execution loop for `mnaipro`
- Breakdown diagnostics, replay helpers, visual strategy packs, and template-governance previews
- local smoke coverage and command-surface inspection scripts
- repo-level docs, memory, and GitHub workflow scaffolding
- an in-progress provider-agnostic model backend branch on top of the bridge and CLI surfaces

The roadmap below assumes that baseline and sequences the remaining work from safest to most open-ended.

## Dependency order

1. Close the in-flight bridge model-backend slice and sync docs/memory.
2. Finish `mnaipro` as the main plugin/agent product line.
3. Finish `marginnote-cli` as the standalone MarginNote-native CLI.
4. Finish `mn-obsidian-bridge` as the standalone MarginNote ↔ Obsidian CLI.
5. Expand the bridge model backend into a real provider interface with replay and failure classification.
6. Add gated experimental/private integrations.
7. Harden release, GitHub workflow, and packaging.

## Roadmap

### Phase 1: Close the current model-backend slice and reconcile repo truth

**Purpose:** get the active `codex/model-backend` work into a clean, documented, verified state before starting new product work.

**Primary files:**
- `bridge/model-backend.js`
- `bridge/server.js`
- `cli/mnaipro.js`
- `scripts/check-bridge-model-backend.js`
- `scripts/check-ci.js`
- `scripts/check-cli-smoke.js`
- `package.json`
- `README.md`
- `docs/mnaipro-cli-quickref.md`
- `docs/bridge-ops-quickstart.md`
- `PROJECT_MEMORY.md`
- `PROJECT_STATUS.md`
- `MEMORY.md`

**Done when:**
- the model backend is either fully landed or cleanly deferred with a documented reason
- `mnaipro` status/doctor/overview surfaces show the model-backend state consistently
- raw request passthrough for `/model/run` and `/model/latest` is stable
- docs and memory files describe the actual supported behavior instead of a half-updated draft
- `npm run check:ci`, `npm run check`, `npm run addon:build`, and `npm run bridge:model:check` are green

### Phase 2: Finish `mnaipro` as the plugin/agent product line

**Purpose:** make the selected-branch workflow feel like a complete agent loop, not a partially wired planner.

**Primary files:**
- `main.js`
- `bridge/planner.js`
- `bridge/native-ai-breakdown-postprocess.js`
- `bridge/breakdown-artifact-audit.js`
- `bridge/native-ai-supervision.js`
- `bridge/native-ai-template-governance.js`
- `scripts/check-native-ai-breakdown-postprocess.js`
- `scripts/check-native-ai-breakdown-artifacts.js`
- `scripts/check-native-ai-breakdown-smoke.js`
- `scripts/check-bridge-status-breakdown-surface.js`
- `scripts/check-cli-breakdown-audit-surface.js`
- `scripts/check-main-breakdown-origin.js`
- `scripts/replay-requests.js`
- `scripts/replay-after-apply.js`

**Work to finish:**
- keep preview/apply/follow-up/replay aligned with one planning model
- finish the selected-branch safety boundaries so they stay subtree-only and explainable
- keep zero-action conclusions, visual strategy packs, branch overview excerpts, and template-governance previews stable
- keep Breakdown-origin handling and replay traces consistent across live, follow-up, and offline inspection
- keep selection/filtering logic from widening the execution boundary

**Done when:**
- a user can organize the selected branch, see why the plan exists, apply it safely, inspect the artifacts, and replay it locally
- every visible action and no-op conclusion is explainable from reports alone
- the branch organizer still refuses unsupported structural changes
- the relevant smoke and regression scripts stay green

### Phase 3: Finish `marginnote-cli` as the standalone MarginNote-native CLI

**Purpose:** turn the native MarginNote surface into a proper read/write CLI with stable command groups and JSON/text parity.

**Primary files to create or extend:**
- `bin/marginnote-cli.js`
- `cli/marginnote-cli.js`
- `cli/marginnote-cli-core.js` or another shared helper module if the command tree needs to be split
- `scripts/check-marginnote-cli-smoke.js`
- `scripts/check-marginnote-cli-native-ai.js`
- `scripts/check-marginnote-cli-app-state.js`
- `README.md`
- `docs/mnaipro-cli-quickref.md`
- `PROJECT_MEMORY.md`

**Work to finish:**
- expose stable `app` and `ai` command groups
- keep the command registry and `surfaceDocs` catalog in sync so help text never drifts from capability reporting
- complete supported read/write coverage for native AI and app state surfaces already evidenced on disk
- keep preview-first or dry-run semantics the default for write-capable commands
- add temp-domain regression coverage for supported restore/write flows

**Done when:**
- the CLI can report all supported native MarginNote surfaces through stable commands
- every supported surface has `--json` output and a readable text counterpart
- write paths are explicitly previewed or dry-run by default
- the command tree remains stable enough to be used as a public operator surface

### Phase 4: Finish `mn-obsidian-bridge` as the standalone bridge CLI

**Purpose:** make MarginNote ↔ Obsidian diagnostics and settings management a separate, stable command surface.

**Primary files to create or extend:**
- `bin/mn-obsidian-bridge.js`
- `cli/mn-obsidian-bridge.js`
- `cli/mn-obsidian-bridge-core.js` or another shared helper module if the command tree needs to be split
- `scripts/check-mn-obsidian-bridge-smoke.js`
- `scripts/check-mn-obsidian-bridge-settings.js`
- `scripts/check-mn-obsidian-bridge-archive.js`
- `README.md`
- `docs/bridge-ops-quickstart.md`
- `PROJECT_MEMORY.md`

**Work to finish:**
- expose stable `mn` and `ob` command groups
- keep export-root evidence, frontmatter/PDF/Canvas inspection, and Obsidian sync settings in one coherent report model
- complete supported read/write flows for settings snapshots and restore paths
- keep archive evidence and local vault diagnostics read/write safe by default

**Done when:**
- bridge-side status, settings, archive evidence, and supported writes are all covered by command-level regression tests
- the bridge CLI can be used independently of `mnaipro`
- the `surfaceDocs` catalog and help text stay aligned

### Phase 5: Expand the bridge model backend into a real provider interface

**Purpose:** move from deterministic planning only to a pluggable execution backend that can call a configured model provider while staying auditable.

**Primary files:**
- `bridge/model-backend.js`
- `bridge/server.js`
- `scripts/check-bridge-model-backend.js`
- `scripts/check-ci.js`
- `package.json`

**Work to finish:**
- keep provider selection config-driven instead of hard-coded
- preserve traceable request/response metadata, tool-call boundaries, replay hooks, and failure classification
- make dry-run the safe default and require explicit opt-in for real execution
- keep replay behavior reproducible through stored trace/request identifiers
- add contract tests for provider availability, fallback behavior, and trace persistence

**Done when:**
- a configured backend can be called through the bridge
- the bridge can record a reproducible trace for each run
- unavailable providers fail cleanly instead of breaking the default planner path
- replay reproduces the same request shape through the backend interface

### Phase 6: Add gated experimental and private integrations

**Purpose:** support future private API or UI-automation experiments without polluting the stable public path.

**Primary files to create or extend:**
- `bridge/experimental/*`
- `scripts/check-experimental-*.js`
- `README.md`
- `PROJECT_MEMORY.md`
- `PROJECT_STATUS.md`

**Work to finish:**
- put every private or UI-driven experiment behind an explicit feature flag or dedicated command
- keep the default path limited to public, supportable APIs
- add tests that confirm disabled experiments stay disabled and do not leak into the normal workflow
- document the boundary clearly enough that operators can tell supported commands from experiments at a glance

**Done when:**
- experimental capabilities can be enabled, tested, and disabled without affecting the stable public workflow
- unsupported paths stay clearly labeled as unsupported
- the stable command surfaces do not depend on any experimental code path

### Phase 7: Production hardening and release completion

**Purpose:** close the loop from code to release so the repo can be operated and shipped with low friction.

**Primary files:**
- `.github/workflows/*`
- `.github/ISSUE_TEMPLATE/*`
- `.github/pull_request_template.md`
- `CONTRIBUTING.md`
- `CODEOWNERS`
- `README.md`
- `PROJECT_MEMORY.md`
- `PROJECT_STATUS.md`
- `MEMORY.md`

**Work to finish:**
- keep GitHub issues, Draft PRs, reviews, and tags aligned with the repo’s actual branching model
- keep CI and smoke coverage aligned with every public command surface
- keep release packaging reproducible from source
- keep the long-term memory and current status files synchronized with shipped behavior

**Done when:**
- each product line has a documented release path
- the local verification story is reproducible from a clean checkout
- no unresolved architecture questions block normal use of the stable public commands

### Phase 8: Optional post-completion expansion

**Purpose:** if the stable CLI surfaces are fully complete, add higher-level operator tooling on top of them instead of inside them.

**Potential files:**
- `skills/marginnote/*` or another dedicated skill bundle if the repo eventually adopts one
- a thin wrapper or launcher for “do the right thing” workflows that only call the stable CLIs

**Rule:**
- do not start this phase until the stable public surfaces above are production-grade
- keep it as a separate product layer, not a hidden dependency inside the stable commands

## Verification ladder

Use the narrowest checks first, then expand only when the narrower checks are green.

1. `node --check` on touched JavaScript files
2. the phase-specific smoke/regression script
3. `npm run check:ci`
4. `npm run check`
5. `npm run addon:build` when addon packaging is involved
6. the release and GitHub workflow checks once the public surfaces are done

## Self-review checklist

- The roadmap starts from the current working-tree reality, not an imagined clean state.
- The current `model-backend` work is the first milestone, not an afterthought.
- The three product lines stay separate throughout the plan.
- Safe/public behavior stays the default until a later phase explicitly gates something experimental.
- Every phase has a clear done condition and a verification ladder.
- The plan leaves room for a future `marginnote` skill without making it a dependency for completion.
