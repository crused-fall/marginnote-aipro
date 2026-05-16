# Project Log

Last updated: 2026-05-16

This log is sorted by time first, then by thread. `019e1913-1b3c-7a32-8cd7-5b7c4276db8e` is a fork of `019d6b92-996c-7523-a2ae-90cd26d10fa5`, so those two belong to the same mainline.

## Chronological Timeline

### 2026-04-08 to 2026-04-16

- The work opened with local MarginNote AI research: what the app can do, what it cannot do, and whether the right answer was a plugin rather than a replacement UI.
- The project target narrowed to an agent-like organizer for selected branches, with `整理当前选中分支` fixed as the first command.
- Preview-first safety became the default model early: dry-run first, then only stable helper-shell actions on apply.
- The early implementation loop exposed the core integration boundaries: missing HUD APIs, `NSStringEncoding` issues, bridge connectivity problems, preview output that was too empty, helper-shell skips, and stale comments not being removed.
- By the end of this phase, the main conclusion was stable: MarginNote's built-in AI should be augmented and supervised, not cloned.

### 2026-05-11

- The original thread was forked and continued as a live mainline thread.
- The evidence base for native MarginNote AI widened: chat, study modes, OCR, Breakdown, internal tool-like operations, and memory traces all got folded into the product view.
- The implementation shape moved beyond plain branch cleanup and into a richer agent surface:
  - visual strategy packs
  - explicit "already organized" zero-action conclusions
  - branch overview excerpts for second-stage summaries
  - a `Breakdown` subcommand path with mode tagging
- The CLI split was clarified and locked in:
  - `mnaipro` for the plugin / agent workflow
  - `marginnote-cli` for MarginNote native capabilities
  - `mn-obsidian-bridge` for Obsidian bridge diagnostics
- The thread also pushed the process model forward:
  - `main` as the merge branch
  - short-lived branches for larger slices
  - GitHub issues and PRs as collaboration state
  - a phase 8 optional expansion layer on top of the stable surfaces
- By the end of this thread, the project had moved from exploration into stable-surface hardening and release-oriented discipline.

### 2026-05-12

- The current session re-read the repo docs, thread inventory, and current status files.
- The workspace boundary was re-confirmed: `Marginnote-AIpro` is the active repo, and the earlier `proactive-info-base` detour was a scope mistake that got corrected.
- The project log itself was created and then reworked into this chronological form so the thread history can be read as a timeline instead of a transcript dump.
- The working cadence became: finish a slice, update the durable records, and commit immediately without asking.
- The phase 8 optional expansion was completed on `main`; the operator launcher, docs, smoke coverage, and durable records all agree on the stable top-layer boundary.
- The old roadmap and operator-launcher plan docs were marked as historical artifacts so they no longer read like active work items.
- The remaining template-governance plan and spec were also marked as historical artifacts so the last active-looking design doc no longer reads like a live task.
- The next visual-strategy polish slice tightened the first-pass color boundary: visible stale colors can still be corrected for salient notes, while hidden or deep-offscreen non-summary notes are excluded from recoloring; the invariant suite now covers both branches.
- The color-pruning rule was then refined so visible recolors that correct an existing color keep their slot ahead of fresh color suggestions when the first pass needs to trim to the primary cap.
- The visible-color gate tightened again after that: fresh visible color suggestions now stay out of the first pass when the note has no existing color correction need and the shape signal is weak, keeping the color surface conservative instead of turning into broad styling.
- The current phase was recorded as clear:
  - phase 7 release hardening is complete
  - the live work had crossed the phase 8 optional expansion boundary and returned to maintenance / new-slice territory
  - there was no remaining phase 8 operator/tooling work to finish

### 2026-05-16

- The current state and todo list were rechecked, and the remaining work was distilled into an explicit next-slices backlog for the heartbeat automation.
- The highest-leverage remaining code slice is conservative `mnaipro` visual-strategy polish; deeper structural edits remain a separate future experimental track.
- The automation now reads that backlog directly, so later check-ins can select work from the documented list instead of re-deriving it every time.
- The visual-strategy slice was then advanced a little further: color-action ordering now surfaces retained recolors before fresh suggestions, while summary-branch colors still stay first.
- The automation focus then pivoted from feature-style polish toward stabilization, compatibility checks, code-review sweeps, and bug-fix work so later check-ins can prefer maintenance first.
- The maintenance priority was then broadened to include UI improvements and usability work so automated check-ins can also pick up clarity and friction-reduction fixes.
- The heartbeat policy was also clarified to prefer sustained maintenance blocks of roughly 10 minutes when safe work exists, instead of stopping after only a cursory scan.

## Thread Index

### Thread `019d6b92-996c-7523-a2ae-90cd26d10fa5`

Status: archived

Goal:
- Inspect MarginNote's local AI capability surface and decide whether to build a plugin that makes it behave more like an agent.

Progress:
- Confirmed that the local MarginNote app already exposes broad AI features, not just chat.
- Narrowed the product target to a MarginNote plugin/agent workflow for branch organization and related cleanup.
- Settled the first user-facing command on `整理当前选中分支`.
- Chose a preview-first flow, with dry-run as the default safety boundary and safe actions only for execution.
- Repeatedly hit the practical integration limits of the helper shell and bridge path, which forced the design toward a stable helper-shell baseline and better logging.
- Started persisting project memory into repo files instead of keeping it only in the conversation.

Key conclusion:
- The project should augment and supervise MarginNote's existing AI surface, not try to rebuild a generic chat clone.
- Stable helper-shell execution plus preview-first planning is the right baseline.

### Thread `019e1913-1b3c-7a32-8cd7-5b7c4276db8e`

Status: live fork of `019d6b92-996c-7523-a2ae-90cd26d10fa5`

Goal:
- Continue the same MarginNote AI research and turn the idea into a concrete implementation shape.

Progress:
- Expanded the evidence base for native MarginNote AI by tracing chat, study modes, OCR, Breakdown, tool-like internal operations, and memory-related traces.
- Moved from product framing into implementation details for preview/apply behavior, safe execution, and explainable action grouping.
- Started treating visible branch cleanup, controlled visual changes, and branch-summary follow-up work as first-class outputs.
- Refined the handling of "already organized" branches so zero-action runs still produce a meaningful agent-style conclusion.
- Kept the long-running planning thread aligned with the broader process direction:
  - CLI split
  - GitHub-based collaboration
  - phase 8 optional expansion on stable surfaces

Key conclusion:
- MarginNote's own AI surface is already broad and partially agent-like, so the plugin should sit alongside it as an organizer and supervisor.
- The useful differentiation is in branch-level planning, preview, audit, and controlled execution.

### Thread `019e1c73-32b6-79f3-9801-b50f2e4646d8`

Status: live

Goal:
- Re-orient on the current workspace, confirm the project state, and continue the mainline in the correct repository scope.

Progress:
- Read `README.md`, `PROJECT_STATUS.md`, `PROJECT_MEMORY.md`, and `MEMORY.md`.
- Rechecked the thread inventory and confirmed there are only three workspace-linked thread records.
- Corrected the scope mistake around `proactive-info-base` and re-centered the work on `Marginnote-AIpro`.
- Confirmed the repo had already passed phase 7 release hardening and was in optional phase 8 expansion territory.

Key conclusion:
- The current live work should stay on `Marginnote-AIpro` and continue the optional operator/tooling expansion from the established stable surfaces.
- The mainline is no longer release hardening; it is disciplined expansion on top of the stable plugin, native AI, and bridge boundaries.

## Current Synthesis

- Product target: a MarginNote plugin/agent workflow that organizes selected branches safely and explainably.
- Safety model: preview first, then apply only stable actions that the helper shell can actually support.
- Surface split: `mnaipro` for the plugin workflow, `marginnote-cli` for native MarginNote state, and `mn-obsidian-bridge` for bridge diagnostics.
- Thread state: `019d6b92` is archived, `019e1913` is its live fork, and `019e1c73` is the current session.
- Current process state: phase 8 optional expansion was complete on `main`; the work ahead was ordinary maintenance or new product slices, not unfinished phase 8 work.
