const { buildPlan, sanitizePayload, compactText } = require("./planner");

function normalizeBranchNodes(nodes) {
  return (Array.isArray(nodes) ? nodes : []).map((node) => ({
    noteId: node.noteId,
    title: node.title || "",
    tags: Array.isArray(node.tags) ? node.tags : [],
    mainExcerptText: node.mainExcerptText || node.excerptText || "",
    allText: node.allText || "",
    commentsText: Array.isArray(node.commentsText) ? node.commentsText : [],
    childNoteIds: Array.isArray(node.childNoteIds) ? node.childNoteIds : [],
    parentNoteId: node.parentNoteId || null,
    colorIndex: typeof node.colorIndex === "number" ? node.colorIndex : null,
    fillIndex: typeof node.fillIndex === "number" ? node.fillIndex : null,
    visualFrame: node.visualFrame || null,
    visualDepth: typeof node.visualDepth === "number" ? node.visualDepth : null,
    visibleInMindMap: !!node.visibleInMindMap,
    branchClosed: !!node.branchClosed,
    hidden: !!node.hidden,
    zLevel: typeof node.zLevel === "number" ? node.zLevel : null,
    groupMode: node.groupMode || ""
  }));
}

function deriveBreakdownSignals(nodes) {
  const normalized = normalizeBranchNodes(nodes);
  const root = normalized[0] || null;
  return {
    branchNodeCount: normalized.length,
    rootNoteId: root ? root.noteId : null,
    rootChildCount: Array.isArray(root && root.childNoteIds) ? root.childNoteIds.length : 0,
    emptyExcerptCount: normalized.filter((node) => !compactText(node.mainExcerptText)).length,
    parentSummaryCandidateCount: normalized.filter((node) => {
      const childIds = Array.isArray(node.childNoteIds) ? node.childNoteIds : [];
      return childIds.length >= 2 && !compactText(node.mainExcerptText);
    }).length,
    visibleNodeCount: normalized.filter((node) => node.visibleInMindMap).length
  };
}

function buildBreakdownPostprocessPayload(options) {
  const opts = options || {};
  return {
    objective: compactText(opts.objective) || "整理当前 AI Breakdown 分支",
    stage: compactText(opts.stage) || "primary",
    origin: "native_ai_breakdown",
    dryRun: opts.dryRun !== false,
    nodes: normalizeBranchNodes(opts.nodes),
    shapeSummary: opts.shapeSummary || null
  };
}

function buildBreakdownPostprocessPlan(options) {
  const payload = sanitizePayload(buildBreakdownPostprocessPayload(options));
  return {
    payload,
    signals: deriveBreakdownSignals(payload.nodes),
    plan: buildPlan(payload)
  };
}

module.exports = {
  normalizeBranchNodes,
  deriveBreakdownSignals,
  buildBreakdownPostprocessPayload,
  buildBreakdownPostprocessPlan
};
