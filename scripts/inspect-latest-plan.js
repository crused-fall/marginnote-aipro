const fs = require("fs");
const os = require("os");
const path = require("path");

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

function readLatestPlanReport() {
  const files = fs
    .readdirSync(REPORTS_DIR)
    .filter((file) => /-plan\.json$/.test(file))
    .map((file) => {
      const fullPath = path.join(REPORTS_DIR, file);
      const stat = fs.statSync(fullPath);
      return { file, fullPath, mtimeMs: stat.mtimeMs };
    })
    .sort((a, b) => b.mtimeMs - a.mtimeMs);

  if (!files.length) {
    return null;
  }

  const latest = files[0];
  return {
    file: latest.file,
    fullPath: latest.fullPath,
    report: JSON.parse(fs.readFileSync(latest.fullPath, "utf8")),
  };
}

function summarize(reportInfo) {
  const plan = reportInfo.report || {};
  const actions = Array.isArray(plan.actions) ? plan.actions : [];
  const unsupported = Array.isArray(plan.unsupportedActions)
    ? plan.unsupportedActions
    : [];
  const notes = Array.isArray(plan.notes) ? plan.notes : [];
  const strategyPacks = Array.isArray(plan.strategyPacks) ? plan.strategyPacks : [];
  const counts = plan.actionDispositionCounts || {};
  const phaseCounts = plan.actionPhaseCounts || {};
  const shapeSummary = plan.shapeSummary || null;
  const origin = plan.origin || "";
  const mode = origin === "native_ai_breakdown" ? "breakdown" : "primary";

  const lines = [
    `Latest plan report: ${reportInfo.file}`,
    `Path: ${reportInfo.fullPath}`,
    `Objective: ${plan.objective || "(unknown)"}`,
    `Stage: ${plan.stage || "primary"}`,
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
    if (counts.review_required)
      lines.push(`- review_required: ${counts.review_required}`);
    if (counts.suggest_only) lines.push(`- suggest_only: ${counts.suggest_only}`);
  }

  if (Object.keys(phaseCounts).length) {
    lines.push("", "Pipeline phases:");
    if (phaseCounts.cleanup) lines.push(`- cleanup: ${phaseCounts.cleanup}`);
    if (phaseCounts.normalize) lines.push(`- normalize: ${phaseCounts.normalize}`);
    if (phaseCounts.enrich) lines.push(`- enrich: ${phaseCounts.enrich}`);
  }

  if (shapeSummary && shapeSummary.captured) {
    lines.push("", "Mind-map shape:");
    lines.push(
      `- visible_nodes: ${shapeSummary.visibleNodeCount || 0}/${shapeSummary.branchNodeCount || 0}`
    );
    lines.push(
      `- collapsed_branches: ${shapeSummary.collapsedBranchCount || 0}`
    );
    lines.push(`- hidden_nodes: ${shapeSummary.hiddenNodeCount || 0}`);
    lines.push(
      `- canvas_span: ${shapeSummary.horizontalSpan ?? "?"} x ${shapeSummary.verticalSpan ?? "?"}`
    );
  }

  if (actions.length) {
    lines.push("", "Top actions:");
    actions.slice(0, 10).forEach((action) => {
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

  if (unsupported.length) {
    lines.push("", "Top unsupported suggestions:");
    unsupported.slice(0, 10).forEach((item) => {
      lines.push(
        `- ${item.type} -> ${item.noteId} | source=${item.meta?.source || "unknown"} | confidence=${typeof item.meta?.confidence === "number" ? item.meta.confidence : "unknown"} | ${item.summary || item.reason || "no_summary"}`
      );
    });
  }

  if (notes.length) {
    lines.push("", "Top notes:");
    notes.slice(0, 10).forEach((item) => {
      lines.push(
        `- ${item.type} -> ${item.noteId || "n/a"} | ${item.message || "no_message"}`
      );
    });
  }

  return lines.join("\n");
}

function main() {
  const reportInfo = readLatestPlanReport();
  if (!reportInfo) {
    process.stdout.write(`No plan reports found in ${REPORTS_DIR}\n`);
    return;
  }
  process.stdout.write(`${summarize(reportInfo)}\n`);
}

main();
