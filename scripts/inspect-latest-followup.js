const fs = require("fs");
const os = require("os");
const path = require("path");
const { planResponse } = require("../bridge/planner");

const REPORTS_DIR =
  process.env.MN_AGENT_REPORTS_DIR ||
  path.join(
    os.homedir(),
    "Library",
    "Containers",
    "QReader.MarginStudy.easy",
    "Data",
    "Library",
    "Caches",
    "MNAIProBridge",
    "reports"
  );

function latestJson(regex) {
  const files = fs
    .readdirSync(REPORTS_DIR)
    .filter((file) => regex.test(file))
    .map((file) => {
      const fullPath = path.join(REPORTS_DIR, file);
      const stat = fs.statSync(fullPath);
      return { file, fullPath, mtimeMs: stat.mtimeMs };
    })
    .sort((a, b) => b.mtimeMs - a.mtimeMs);

  if (!files.length) return null;
  const latest = files[0];
  return {
    file: latest.file,
    fullPath: latest.fullPath,
    report: JSON.parse(fs.readFileSync(latest.fullPath, "utf8")),
  };
}

function latestPrimaryApplyJson() {
  const apply = latestJson(/-apply-.*\.json$/);
  if (!apply) return null;
  if (/-followup-apply-.*\.json$/.test(apply.file)) return null;
  return apply;
}

function normalizeAfterBranchNotes(report) {
  const notes =
    report &&
    report.afterBranch &&
    Array.isArray(report.afterBranch.notes)
      ? report.afterBranch.notes
      : [];

  return notes.map((note) => ({
    noteId: note.noteId,
    title: note.title || "",
    tags: Array.isArray(note.tags) ? note.tags : [],
    mainExcerptText: note.excerptText || "",
    allText: note.allText || "",
    commentsText: Array.isArray(note.commentsText) ? note.commentsText : [],
    childNoteIds: Array.isArray(note.childNoteIds) ? note.childNoteIds : [],
    parentNoteId: note.parentNoteId || null,
    colorIndex: typeof note.colorIndex === "number" ? note.colorIndex : null,
    fillIndex: typeof note.fillIndex === "number" ? note.fillIndex : null,
    visualFrame: note.visualFrame || null,
    visualDepth: typeof note.visualDepth === "number" ? note.visualDepth : null,
    visibleInMindMap: !!note.visibleInMindMap,
    branchClosed: !!note.branchClosed,
    hidden: !!note.hidden,
    zLevel: typeof note.zLevel === "number" ? note.zLevel : null,
    groupMode: note.groupMode || "",
  }));
}

function summarize(planInfo) {
  const plan = planInfo.report || {};
  const actions = Array.isArray(plan.actions) ? plan.actions : [];
  const unsupported = Array.isArray(plan.unsupportedActions)
    ? plan.unsupportedActions
    : [];
  const notes = Array.isArray(plan.notes) ? plan.notes : [];
  const strategyPacks = Array.isArray(plan.strategyPacks) ? plan.strategyPacks : [];
  const counts = plan.actionDispositionCounts || {};
  const phaseCounts = plan.actionPhaseCounts || {};
  const origin = plan.origin || "";
  const mode = origin === "native_ai_breakdown" ? "breakdown" : "primary";

  const lines = [
    `Latest follow-up report: ${planInfo.file}`,
    `Path: ${planInfo.fullPath}`,
    `Derived: ${planInfo.derived ? 1 : 0}`,
    `Source: ${planInfo.source}`,
    `Objective: ${plan.objective || "(unknown)"}`,
    `Stage: ${plan.stage || "followup"}`,
    `Mode: ${mode}`,
    `Origin: ${origin || "(none)"}`,
    `Actions: ${actions.length}`,
    `Strategy packs: ${strategyPacks.length}`,
    `Warnings: ${notes.length}`,
    `Unsupported: ${unsupported.length}`,
  ];

  if (Object.keys(counts).length) {
    lines.push("", "Execution tiers:");
    if (counts.safe_auto) lines.push(`- safe_auto: ${counts.safe_auto}`);
    if (counts.review_required) {
      lines.push(`- review_required: ${counts.review_required}`);
    }
    if (counts.suggest_only) lines.push(`- suggest_only: ${counts.suggest_only}`);
  }

  if (Object.keys(phaseCounts).length) {
    lines.push("", "Pipeline phases:");
    if (phaseCounts.cleanup) lines.push(`- cleanup: ${phaseCounts.cleanup}`);
    if (phaseCounts.normalize) lines.push(`- normalize: ${phaseCounts.normalize}`);
    if (phaseCounts.enrich) lines.push(`- enrich: ${phaseCounts.enrich}`);
  }

  if (actions.length) {
    const typeCounts = {};
    for (const action of actions) {
      typeCounts[action.type] = (typeCounts[action.type] || 0) + 1;
    }

    lines.push("", "Action types:");
    for (const key of Object.keys(typeCounts).sort((a, b) => typeCounts[b] - typeCounts[a])) {
      lines.push(`- ${key}: ${typeCounts[key]}`);
    }

    lines.push("", "Top actions:");
    actions.slice(0, 12).forEach((action) => {
      const colorExtra =
        action.type === "set_color_index"
          ? ` | role=${action.visualRole || "unknown"} | salience=${typeof action.visualSalience === "number" ? action.visualSalience : "unknown"} | target_color=${typeof action.colorIndex === "number" ? action.colorIndex : "unknown"}`
          : "";
      const overviewExtra =
        action.type === "rewrite_excerpt" && action.meta?.source === "branch_structure_digest"
          ? ` | overview=${String(action.text || "").replace(/\\s+/g, " ").trim().slice(0, 80)}`
          : "";
      lines.push(
        `- ${action.type} -> ${action.noteId} | phase=${action.phase || "unknown"} | disposition=${action.execution?.disposition || "unknown"} | source=${action.meta?.source || "unknown"} | confidence=${typeof action.meta?.confidence === "number" ? action.meta.confidence : "unknown"}${colorExtra}${overviewExtra}`
      );
    });
  }

  if (strategyPacks.length) {
    lines.push("", "Strategy packs:");
    strategyPacks.slice(0, 5).forEach((pack) => {
      const countsText = pack.visibleActionCounts || {};
      lines.push(
        `- ${pack.type} -> ${pack.rootNoteId || "n/a"} | stage=${pack.stage || "unknown"} | disposition=${pack.executionDisposition || "unknown"} | colors=${countsText.set_color_index || 0} | groups=${countsText.organize_branch_groups || 0} | overviews=${countsText.rewrite_excerpt || 0} | deferred_semantic=${pack.deferredSemanticCount || 0} | deferred_visual=${pack.deferredVisualCount || 0} | ${pack.summary || "no_summary"}`
      );
    });
  }

  return lines.join("\n");
}

function summarizeCurrentReplay(replayPlan, applyInfo) {
  const actions = Array.isArray(replayPlan.actions) ? replayPlan.actions : [];
  const strategyPacks = Array.isArray(replayPlan.strategyPacks) ? replayPlan.strategyPacks : [];
  const primaryPack = strategyPacks[0] || null;
  const origin = replayPlan.origin || "";
  const mode = origin === "native_ai_breakdown" ? "breakdown" : "primary";
  const lines = [
    "Current replay:",
    `- Source apply: ${applyInfo.file}`,
    `- Actions: ${actions.length}`,
    `- Strategy packs: ${strategyPacks.length}`,
    `- Mode: ${mode}`,
    `- Origin: ${origin || "(none)"}`,
  ];

  if (primaryPack) {
    lines.push(
      `- Primary strategy: ${primaryPack.type || "unknown"} | stage=${primaryPack.stage || "unknown"} | disposition=${primaryPack.executionDisposition || "unknown"} | deferred_semantic=${primaryPack.deferredSemanticCount || 0} | deferred_visual=${primaryPack.deferredVisualCount || 0}`
    );
    if (primaryPack.summary) {
      lines.push(`- Summary: ${primaryPack.summary}`);
    }
    if (primaryPack.reason) {
      lines.push(`- Reason: ${primaryPack.reason}`);
    }
  }

  return lines.join("\n");
}

function summarizeReplayDelta(storedPlan, replayPlan, applyInfo) {
  const storedActions = Array.isArray(storedPlan?.actions) ? storedPlan.actions : [];
  const replayActions = Array.isArray(replayPlan?.actions) ? replayPlan.actions : [];
  const storedTypes = {};
  const replayTypes = {};

  for (const action of storedActions) {
    storedTypes[action.type] = (storedTypes[action.type] || 0) + 1;
  }
  for (const action of replayActions) {
    replayTypes[action.type] = (replayTypes[action.type] || 0) + 1;
  }

  const lines = [
    "Current replay against latest primary apply:",
    `- Source apply: ${applyInfo.file}`,
    `- Replay actions: ${replayActions.length}`,
    `- Stored actions: ${storedActions.length}`,
  ];

  const allKeys = [...new Set([...Object.keys(storedTypes), ...Object.keys(replayTypes)])].sort();
  if (allKeys.length) {
    lines.push("- Type delta:");
    for (const key of allKeys) {
      lines.push(
        `  ${key}: replay=${replayTypes[key] || 0} stored=${storedTypes[key] || 0}`
      );
    }
  }

  return lines.join("\n");
}

function main() {
  const actual = latestJson(/-followup\.json$/);
  if (actual) {
    const applyInfo = latestPrimaryApplyJson();
    const nodes = applyInfo ? normalizeAfterBranchNotes(applyInfo.report) : [];
    const applyOrigin = applyInfo?.report?.origin || "";
    const applyObjective = applyInfo?.report?.command || applyInfo?.report?.objective || "整理当前选中分支";
    const replayPlan =
      nodes.length
        ? planResponse({
            objective: applyObjective,
            origin: applyOrigin,
            stage: "followup",
            dryRun: true,
            nodes,
          }).plan
        : null;
    const actualText = summarize({
      file: actual.file,
      fullPath: actual.fullPath,
      report: actual.report,
      source: "stored_followup_artifact",
      derived: false,
    });
    const replaySummary = replayPlan ? summarizeCurrentReplay(replayPlan, applyInfo) : "";
    const replayDelta =
      replayPlan &&
      replayPlan.actions &&
      Array.isArray(actual.report?.actions) &&
      replayPlan.actions.length !== actual.report.actions.length
        ? summarizeReplayDelta(actual.report, replayPlan, applyInfo)
        : "";
    process.stdout.write(
      `${actualText}${replaySummary ? `\n\n${replaySummary}` : ""}${replayDelta ? `\n\n${replayDelta}` : ""}\n`
    );
    return;
  }

  const applyInfo = latestPrimaryApplyJson();
  if (!applyInfo) {
    process.stdout.write(`No follow-up reports or apply reports found in ${REPORTS_DIR}\n`);
    return;
  }

  const nodes = normalizeAfterBranchNotes(applyInfo.report);
  if (!nodes.length) {
    process.stdout.write(`Latest apply report has no afterBranch notes: ${applyInfo.file}\n`);
    return;
  }

  const derived = planResponse({
    objective: applyInfo.report?.command || applyInfo.report?.objective || "整理当前选中分支",
    origin: applyInfo.report?.origin || "",
    stage: "followup",
    dryRun: true,
    nodes,
  });

  process.stdout.write(
    `${summarize({
      file: `${applyInfo.file} (derived)`,
      fullPath: applyInfo.fullPath,
      report: derived.plan,
      source: "latest_apply_after_branch_replay",
      derived: true,
    })}\n`
  );
}

main();
