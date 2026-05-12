const { buildPlan, sanitizePayload, buildStrategyPacks } = require("../bridge/planner");
const { createSampleSelection } = require("../plugin/mock-api");

function normalize(node) {
  return {
    noteId: node.noteId,
    title: node.title,
    tags: node.tags,
    mainExcerptText: node.mainExcerptText,
    allText: node.allText,
    colorIndex: node.colorIndex,
    fillIndex: node.fillIndex,
    commentsText: node.commentsText,
    childNoteIds: (node.childNodes || []).map((child) => child.noteId),
    parentNoteId: node.parentNode ? node.parentNode.noteId : null,
    visualFrame: node.visualFrame,
    visualDepth: node.visualDepth,
    visibleInMindMap: node.visibleInMindMap,
    branchClosed: node.branchClosed,
    hidden: node.hidden,
    zLevel: node.zLevel,
    groupMode: node.groupMode,
  };
}

function phasePriority(phase) {
  if (phase === "cleanup") return 0;
  if (phase === "normalize") return 1;
  return 2;
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function buildSamplePlan() {
  const nodes = createSampleSelection().map(normalize);
  return buildPlan(
    sanitizePayload({
      objective: "整理当前选中分支",
      dryRun: true,
      nodes,
    })
  );
}

function buildPlanFromNodes(nodes, extra) {
  const options = extra || {};
  return buildPlan(
    sanitizePayload({
      objective: options.objective || "整理当前选中分支",
      dryRun: options.dryRun !== false,
      stage: options.stage || "primary",
      nodes,
      shapeSummary: options.shapeSummary || null,
    })
  );
}

function buildSemanticDeferredOnlyPlan() {
  return buildPlanFromNodes([
    {
      noteId: "s-1",
      title: "Theorem 1",
      tags: [],
      mainExcerptText: "A compact theorem statement already exists here.",
      allText: "Theorem 1. A compact theorem statement already exists here.",
      colorIndex: 9,
      fillIndex: null,
      commentsText: [],
      childNoteIds: [],
      parentNoteId: null,
      visualFrame: null,
      visualDepth: null,
      visibleInMindMap: false,
      branchClosed: false,
      hidden: false,
      zLevel: null,
      groupMode: "",
    },
  ]);
}

function buildPureOrganizedEnoughPlan() {
  return buildPlanFromNodes([
    {
      noteId: "o-1",
      title: "Overview",
      tags: ["summary"],
      mainExcerptText: "Stable branch summary already present for this note.",
      allText: "Overview. Stable branch summary already present for this note.",
      colorIndex: null,
      fillIndex: null,
      commentsText: [],
      childNoteIds: [],
      parentNoteId: null,
      visualFrame: null,
      visualDepth: null,
      visibleInMindMap: false,
      branchClosed: false,
      hidden: false,
      zLevel: null,
      groupMode: "",
    },
  ]);
}

function buildVisibleColorCorrectionPlan() {
  return buildPlanFromNodes([
    {
      noteId: "r-1",
      title: "Theorem 1",
      tags: [],
      mainExcerptText: "A compact theorem statement already exists here.",
      allText: "Theorem 1. A compact theorem statement already exists here.",
      colorIndex: 3,
      fillIndex: null,
      commentsText: [],
      childNoteIds: [],
      parentNoteId: null,
      visualFrame: { x: 180, y: 120, width: 160, height: 80 },
      visualDepth: 1,
      visibleInMindMap: true,
      branchClosed: false,
      hidden: false,
      zLevel: 1,
      groupMode: "",
    },
  ]);
}

function buildHiddenColorCorrectionPlan() {
  return buildPlanFromNodes([
    {
      noteId: "r-2",
      title: "Theorem 2",
      tags: [],
      mainExcerptText: "A compact theorem statement already exists here.",
      allText: "Theorem 2. A compact theorem statement already exists here.",
      colorIndex: 3,
      fillIndex: null,
      commentsText: [],
      childNoteIds: [],
      parentNoteId: null,
      visualFrame: null,
      visualDepth: 4,
      visibleInMindMap: false,
      branchClosed: false,
      hidden: true,
      zLevel: null,
      groupMode: "",
    },
  ]);
}

function buildDeferredVisualOnlyStrategyPacks() {
  return buildStrategyPacks(
    [],
    [
      {
        type: "visual_color_deferred",
        noteId: "v-1",
        deferredActionCount: 2,
        message:
          "Deferred 2 lower-priority color changes across 1 notes so the first pass stays conservative and keeps the most legible structural and role-based colors first.",
      },
    ],
    [],
    "primary",
    [{ noteId: "v-1" }],
    null,
    "en"
  );
}

function buildBlockedOrganizedEnoughStrategyPacks() {
  return buildStrategyPacks(
    [],
    [
      {
        type: "branch_shape_warning",
        noteId: "b-1",
        message: 'Branch "b-1" already looks visually spread in the current mind map.',
      },
    ],
    [
      {
        type: "suggest_split_branch",
        noteId: "b-1",
        summary: "Consider splitting this branch into clearer subtopics.",
        meta: {
          source: "branch_split_analysis",
          confidence: 0.72,
        },
      },
    ],
    "primary",
    [{ noteId: "b-1" }],
    null,
    "en"
  );
}

function buildGroupedOverviewPlan() {
  return buildPlanFromNodes(
    [
      {
        noteId: "g-root",
      title: "Residue theorem",
      tags: ["summary"],
      mainExcerptText: "",
      allText: "Residue theorem.",
      colorIndex: 6,
      fillIndex: null,
      commentsText: [],
      childNoteIds: ["g-def", "g-proof", "g-question"],
      parentNoteId: null,
      visualFrame: null,
      visualDepth: 0,
      visibleInMindMap: true,
      branchClosed: false,
      hidden: false,
      zLevel: 0,
      groupMode: "",
    },
    {
      noteId: "g-def",
      title: "Definitions",
      tags: ["summary"],
      mainExcerptText: "",
      allText: "Definitions.",
      colorIndex: 6,
      fillIndex: null,
      commentsText: [],
      childNoteIds: ["g-def-1", "g-def-2"],
      parentNoteId: "g-root",
      visualFrame: null,
      visualDepth: 1,
      visibleInMindMap: true,
      branchClosed: false,
      hidden: false,
      zLevel: 1,
      groupMode: "",
    },
    {
      noteId: "g-proof",
      title: "Proof steps",
      tags: ["summary"],
      mainExcerptText: "",
      allText: "Proof steps.",
      colorIndex: 6,
      fillIndex: null,
      commentsText: [],
      childNoteIds: ["g-proof-1", "g-proof-2"],
      parentNoteId: "g-root",
      visualFrame: null,
      visualDepth: 1,
      visibleInMindMap: true,
      branchClosed: false,
      hidden: false,
      zLevel: 1,
      groupMode: "",
    },
    {
      noteId: "g-question",
      title: "Questions",
      tags: ["summary"],
      mainExcerptText: "",
      allText: "Questions.",
      colorIndex: 6,
      fillIndex: null,
      commentsText: [],
      childNoteIds: ["g-question-1"],
      parentNoteId: "g-root",
      visualFrame: null,
      visualDepth: 1,
      visibleInMindMap: true,
      branchClosed: false,
      hidden: false,
      zLevel: 1,
      groupMode: "",
    },
    {
      noteId: "g-def-1",
      title: "Isolated singularity",
      tags: [],
      mainExcerptText: "Definition of isolated singularity.",
      allText: "Definition of isolated singularity.",
      colorIndex: 5,
      fillIndex: null,
      commentsText: [],
      childNoteIds: [],
      parentNoteId: "g-def",
      visualFrame: null,
      visualDepth: 2,
      visibleInMindMap: true,
      branchClosed: false,
      hidden: false,
      zLevel: 2,
      groupMode: "",
    },
    {
      noteId: "g-def-2",
      title: "Residue notation",
      tags: [],
      mainExcerptText: "Definition of residue notation.",
      allText: "Definition of residue notation.",
      colorIndex: 5,
      fillIndex: null,
      commentsText: [],
      childNoteIds: [],
      parentNoteId: "g-def",
      visualFrame: null,
      visualDepth: 2,
      visibleInMindMap: true,
      branchClosed: false,
      hidden: false,
      zLevel: 2,
      groupMode: "",
    },
    {
      noteId: "g-proof-1",
      title: "Contour decomposition",
      tags: [],
      mainExcerptText: "Split the contour into small loops.",
      allText: "Split the contour into small loops.",
      colorIndex: 4,
      fillIndex: null,
      commentsText: [],
      childNoteIds: [],
      parentNoteId: "g-proof",
      visualFrame: null,
      visualDepth: 2,
      visibleInMindMap: true,
      branchClosed: false,
      hidden: false,
      zLevel: 2,
      groupMode: "",
    },
    {
      noteId: "g-proof-2",
      title: "Coefficient extraction",
      tags: [],
      mainExcerptText: "Extract the residue coefficient from the Laurent series.",
      allText: "Extract the residue coefficient from the Laurent series.",
      colorIndex: 4,
      fillIndex: null,
      commentsText: [],
      childNoteIds: [],
      parentNoteId: "g-proof",
      visualFrame: null,
      visualDepth: 2,
      visibleInMindMap: true,
      branchClosed: false,
      hidden: false,
      zLevel: 2,
      groupMode: "",
    },
    {
      noteId: "g-question-1",
      title: "Choosing the contour",
      tags: [],
      mainExcerptText: "Question about how to choose the contour.",
      allText: "Question about how to choose the contour.",
      colorIndex: 2,
      fillIndex: null,
      commentsText: [],
      childNoteIds: [],
      parentNoteId: "g-question",
      visualFrame: null,
      visualDepth: 2,
      visibleInMindMap: true,
      branchClosed: false,
      hidden: false,
      zLevel: 2,
      groupMode: "",
      },
    ],
    {
      objective: "Organize current selected branch",
    }
  );
}

function buildGroupedOverviewPlanWithGenericTitle() {
  return buildPlanFromNodes(
    [
      {
        noteId: "g-generic-root",
        title: "Summary node",
        tags: ["summary"],
        mainExcerptText: "",
        allText: "Summary node.",
        colorIndex: 6,
        fillIndex: null,
        commentsText: [],
        childNoteIds: ["g-generic-def", "g-generic-proof", "g-generic-question"],
        parentNoteId: null,
        visualFrame: null,
        visualDepth: 0,
        visibleInMindMap: true,
        branchClosed: false,
        hidden: false,
        zLevel: 0,
        groupMode: "",
      },
      {
        noteId: "g-generic-def",
        title: "Definitions",
        tags: ["summary"],
        mainExcerptText: "",
        allText: "Definitions.",
        colorIndex: 6,
        fillIndex: null,
        commentsText: [],
        childNoteIds: ["g-generic-def-1", "g-generic-def-2"],
        parentNoteId: "g-generic-root",
        visualFrame: null,
        visualDepth: 1,
        visibleInMindMap: true,
        branchClosed: false,
        hidden: false,
        zLevel: 1,
        groupMode: "",
      },
      {
        noteId: "g-generic-proof",
        title: "Proof steps",
        tags: ["summary"],
        mainExcerptText: "",
        allText: "Proof steps.",
        colorIndex: 6,
        fillIndex: null,
        commentsText: [],
        childNoteIds: ["g-generic-proof-1", "g-generic-proof-2"],
        parentNoteId: "g-generic-root",
        visualFrame: null,
        visualDepth: 1,
        visibleInMindMap: true,
        branchClosed: false,
        hidden: false,
        zLevel: 1,
        groupMode: "",
      },
      {
        noteId: "g-generic-question",
        title: "Questions",
        tags: ["summary"],
        mainExcerptText: "",
        allText: "Questions.",
        colorIndex: 6,
        fillIndex: null,
        commentsText: [],
        childNoteIds: ["g-generic-question-1"],
        parentNoteId: "g-generic-root",
        visualFrame: null,
        visualDepth: 1,
        visibleInMindMap: true,
        branchClosed: false,
        hidden: false,
        zLevel: 1,
        groupMode: "",
      },
      {
        noteId: "g-generic-def-1",
        title: "Isolated singularity",
        tags: [],
        mainExcerptText: "Definition of isolated singularity.",
        allText: "Definition of isolated singularity.",
        colorIndex: 5,
        fillIndex: null,
        commentsText: [],
        childNoteIds: [],
        parentNoteId: "g-generic-def",
        visualFrame: null,
        visualDepth: 2,
        visibleInMindMap: true,
        branchClosed: false,
        hidden: false,
        zLevel: 2,
        groupMode: "",
      },
      {
        noteId: "g-generic-def-2",
        title: "Residue notation",
        tags: [],
        mainExcerptText: "Definition of residue notation.",
        allText: "Definition of residue notation.",
        colorIndex: 5,
        fillIndex: null,
        commentsText: [],
        childNoteIds: [],
        parentNoteId: "g-generic-def",
        visualFrame: null,
        visualDepth: 2,
        visibleInMindMap: true,
        branchClosed: false,
        hidden: false,
        zLevel: 2,
        groupMode: "",
      },
      {
        noteId: "g-generic-proof-1",
        title: "Contour decomposition",
        tags: [],
        mainExcerptText: "Split the contour into small loops.",
        allText: "Split the contour into small loops.",
        colorIndex: 4,
        fillIndex: null,
        commentsText: [],
        childNoteIds: [],
        parentNoteId: "g-generic-proof",
        visualFrame: null,
        visualDepth: 2,
        visibleInMindMap: true,
        branchClosed: false,
        hidden: false,
        zLevel: 2,
        groupMode: "",
      },
      {
        noteId: "g-generic-proof-2",
        title: "Coefficient extraction",
        tags: [],
        mainExcerptText: "Extract the residue coefficient from the Laurent series.",
        allText: "Extract the residue coefficient from the Laurent series.",
        colorIndex: 4,
        fillIndex: null,
        commentsText: [],
        childNoteIds: [],
        parentNoteId: "g-generic-proof",
        visualFrame: null,
        visualDepth: 2,
        visibleInMindMap: true,
        branchClosed: false,
        hidden: false,
        zLevel: 2,
        groupMode: "",
      },
      {
        noteId: "g-generic-question-1",
        title: "Choosing the contour",
        tags: [],
        mainExcerptText: "Question about how to choose the contour.",
        allText: "Question about how to choose the contour.",
        colorIndex: 2,
        fillIndex: null,
        commentsText: [],
        childNoteIds: [],
        parentNoteId: "g-generic-question",
        visualFrame: null,
        visualDepth: 2,
        visibleInMindMap: true,
        branchClosed: false,
        hidden: false,
        zLevel: 2,
        groupMode: "",
      },
    ],
    {
      objective: "Organize current selected branch",
    }
  );
}

function buildDirectChildDigestPlan() {
  return buildPlanFromNodes(
    [
      {
        noteId: "d-root",
      title: "Cauchy integral formula",
      tags: ["summary"],
      mainExcerptText: "",
      allText: "Cauchy integral formula.",
      colorIndex: 6,
      fillIndex: null,
      commentsText: [],
      childNoteIds: ["d-1", "d-2", "d-3"],
      parentNoteId: null,
      visualFrame: null,
      visualDepth: 0,
      visibleInMindMap: true,
      branchClosed: false,
      hidden: false,
      zLevel: 0,
      groupMode: "",
    },
    {
      noteId: "d-1",
      title: "Kernel setup",
      tags: [],
      mainExcerptText: "Set up the Cauchy kernel.",
      allText: "Set up the Cauchy kernel.",
      colorIndex: 0,
      fillIndex: null,
      commentsText: [],
      childNoteIds: [],
      parentNoteId: "d-root",
      visualFrame: null,
      visualDepth: 1,
      visibleInMindMap: true,
      branchClosed: false,
      hidden: false,
      zLevel: 1,
      groupMode: "",
    },
    {
      noteId: "d-2",
      title: "Circle contour",
      tags: [],
      mainExcerptText: "Integrate around the circle contour.",
      allText: "Integrate around the circle contour.",
      colorIndex: 0,
      fillIndex: null,
      commentsText: [],
      childNoteIds: [],
      parentNoteId: "d-root",
      visualFrame: null,
      visualDepth: 1,
      visibleInMindMap: true,
      branchClosed: false,
      hidden: false,
      zLevel: 1,
      groupMode: "",
    },
    {
      noteId: "d-3",
      title: "Worked example",
      tags: [],
      mainExcerptText: "Apply the formula to a polynomial.",
      allText: "Apply the formula to a polynomial.",
      colorIndex: 0,
      fillIndex: null,
      commentsText: [],
      childNoteIds: [],
      parentNoteId: "d-root",
      visualFrame: null,
      visualDepth: 1,
      visibleInMindMap: true,
      branchClosed: false,
      hidden: false,
      zLevel: 1,
      groupMode: "",
      },
    ],
    {
      objective: "Organize current selected branch",
    }
  );
}

function buildFollowupGroupedDigestSuppressionPlan() {
  return buildPlanFromNodes(
    [
      {
        noteId: "f-1",
        title: "Residue theorem overview",
        tags: [],
        mainExcerptText:
          '"Residue theorem overview" currently covers Definitions (2), Proof steps (2), Questions (1), including Isolated singularity, Coefficient extraction, and Choosing the contour.',
        allText:
          '"Residue theorem overview" currently covers Definitions (2), Proof steps (2), Questions (1), including Isolated singularity, Coefficient extraction, and Choosing the contour.',
        colorIndex: 0,
        fillIndex: null,
        commentsText: [],
        childNoteIds: [],
        parentNoteId: null,
        visualFrame: null,
        visualDepth: null,
        visibleInMindMap: false,
        branchClosed: false,
        hidden: false,
        zLevel: null,
        groupMode: "",
      },
    ],
    {
      stage: "followup",
      objective: "Organize current selected branch",
    }
  );
}

function validateAction(action, index) {
  assert(action.noteId, `action[${index}] missing noteId`);
  assert(action.type, `action[${index}] missing type`);
  assert(
    typeof action.actionKey === "string" && action.actionKey,
    `action[${index}] missing actionKey`
  );
  assert(action.meta, `action[${index}] missing meta`);
  assert(typeof action.meta.source === "string" && action.meta.source, `action[${index}] missing meta.source`);
  assert(
    typeof action.meta.confidence === "number" &&
      action.meta.confidence >= 0 &&
      action.meta.confidence <= 1,
    `action[${index}] has invalid meta.confidence`
  );
  assert(action.execution, `action[${index}] missing execution`);
  assert(
    ["safe_auto", "review_required", "suggest_only"].includes(action.execution.disposition),
    `action[${index}] has invalid execution.disposition`
  );
  assert(
    ["cleanup", "normalize", "enrich"].includes(action.phase),
    `action[${index}] has invalid phase`
  );
  if (action.type === "set_color_index") {
    assert(
      typeof action.colorIndex === "number",
      `action[${index}] set_color_index missing colorIndex`
    );
  }
}

function validateOrdering(actions) {
  for (let i = 1; i < actions.length; i += 1) {
    const prev = actions[i - 1];
    const next = actions[i];
    const prevPriority = phasePriority(prev.phase);
    const nextPriority = phasePriority(next.phase);
    assert(
      prevPriority <= nextPriority,
      `action order regressed between index ${i - 1} (${prev.phase}) and ${i} (${next.phase})`
    );
  }
}

function validateCounts(plan) {
  const dispositionCounts = plan.actionDispositionCounts || {};
  const phaseCounts = plan.actionPhaseCounts || {};
  const actionCount = Array.isArray(plan.actions) ? plan.actions.length : 0;

  const dispositionSum = Object.values(dispositionCounts).reduce((sum, value) => sum + value, 0);
  const phaseSum = Object.values(phaseCounts).reduce((sum, value) => sum + value, 0);

  assert(dispositionSum === actionCount, `disposition count mismatch: ${dispositionSum} !== ${actionCount}`);
  assert(phaseSum === actionCount, `phase count mismatch: ${phaseSum} !== ${actionCount}`);
}

function validateUnsupported(unsupportedActions) {
  unsupportedActions.forEach((action, index) => {
    assert(action.type, `unsupported[${index}] missing type`);
    assert(action.noteId, `unsupported[${index}] missing noteId`);
    assert(action.meta, `unsupported[${index}] missing meta`);
    assert(
      typeof action.meta.source === "string" && action.meta.source,
      `unsupported[${index}] missing meta.source`
    );
    assert(
      typeof action.meta.confidence === "number" &&
        action.meta.confidence >= 0 &&
        action.meta.confidence <= 1,
      `unsupported[${index}] invalid meta.confidence`
    );
  });
}

function validateColorPolicy(actions) {
  const nonSummaryColorActions = actions.filter(
    (action) => action.type === "set_color_index" && action.visualRole !== "summary_branch"
  );
  assert(
    nonSummaryColorActions.length <= 3,
    `too many non-summary color actions in primary sample plan: ${nonSummaryColorActions.length}`
  );
  assert(
    !nonSummaryColorActions.some((action) => action.noteId === "n-5"),
    "hidden definition note n-5 should not outrank visible color candidates"
  );
  assert(
    nonSummaryColorActions.some((action) => action.noteId === "n-7"),
    "visible theorem/proof note n-7 should be retained by shape-aware color ranking"
  );
}

function validateVisibleColorCorrection(plan) {
  const actions = Array.isArray(plan.actions) ? plan.actions : [];
  const recolorAction = actions.find(
    (action) =>
      action.type === "set_color_index" &&
      action.noteId === "r-1" &&
      action.colorIndex === 4
  );
  assert(recolorAction, "visible theorem note with a stale color should be recolored");
  assert(
    recolorAction.visualRole === "theorem",
    `unexpected recolor visual role: ${recolorAction.visualRole}`
  );
  assert(
    recolorAction.meta &&
      Array.isArray(recolorAction.meta.evidence) &&
      recolorAction.meta.evidence.some(
        (item) => /current color index 3|当前颜色索引 3/i.test(item)
      ),
    "visible recolor should explain the stale current color in its evidence"
  );
}

function validateHiddenColorSkip(plan) {
  const actions = Array.isArray(plan.actions) ? plan.actions : [];
  assert(
    !actions.some((action) => action.type === "set_color_index"),
    "hidden note should not receive a color correction"
  );
}

function validateStrategyPacks(plan) {
  const strategyPacks = Array.isArray(plan.strategyPacks) ? plan.strategyPacks : [];
  const actionKeys = new Set((plan.actions || []).map((action) => action.actionKey));
  assert(strategyPacks.length === 1, `expected 1 strategy pack, got ${strategyPacks.length}`);

  const pack = strategyPacks[0];
  assert(pack.type === "visual_branch_strategy", "unexpected strategy pack type");
  assert(pack.rootNoteId === "n-1", `unexpected strategy pack root: ${pack.rootNoteId}`);
  assert(pack.executionDisposition === "review_required", "unexpected strategy pack disposition");
  assert(Array.isArray(pack.actionKeys) && pack.actionKeys.length > 0, "strategy pack missing actionKeys");
  pack.actionKeys.forEach((actionKey) => {
    assert(actionKeys.has(actionKey), `strategy pack references unknown actionKey: ${actionKey}`);
  });

  const actionMap = new Map((plan.actions || []).map((action) => [action.actionKey, action]));
  pack.actionKeys.forEach((actionKey) => {
    const action = actionMap.get(actionKey);
    assert(action, `missing action for strategy key ${actionKey}`);
    assert(
      action.type === "set_color_index" ||
        action.type === "organize_branch_groups" ||
        (action.type === "rewrite_excerpt" &&
          action.meta &&
          action.meta.source === "branch_structure_digest"),
      `strategy pack included non-visible action type ${action.type}`
    );
  });

  assert(
    typeof pack.deferredVisualCount === "number" && pack.deferredVisualCount >= 0,
    "strategy pack missing deferredVisualCount"
  );
}

function validateOrganizedEnoughPack(plan, expectations) {
  const options = expectations || {};
  const strategyPacks = Array.isArray(plan.strategyPacks) ? plan.strategyPacks : [];
  assert(strategyPacks.length === 1, `expected 1 organized-enough pack, got ${strategyPacks.length}`);

  const pack = strategyPacks[0];
  assert(
    pack.type === "branch_already_organized_strategy",
    `unexpected organized-enough pack type: ${pack.type}`
  );
  assert(
    pack.rootNoteId === options.rootNoteId,
    `unexpected organized-enough root: ${pack.rootNoteId}`
  );
  assert(
    pack.executionDisposition === "suggest_only",
    `unexpected organized-enough disposition: ${pack.executionDisposition}`
  );
  assert(Array.isArray(pack.actionKeys), "organized-enough pack missing actionKeys");
  assert(pack.actionKeys.length === 0, "organized-enough pack should not reference actions");
  assert(pack.summary, "organized-enough pack missing summary");
  assert(pack.reason, "organized-enough pack missing reason");
  assert(pack.visibleActionCounts, "organized-enough pack missing visibleActionCounts");
  assert(
    pack.visibleActionCounts.set_color_index === 0 &&
      pack.visibleActionCounts.organize_branch_groups === 0 &&
      pack.visibleActionCounts.rewrite_excerpt === 0,
    "organized-enough pack should report zero visible actions"
  );
  assert(
    pack.deferredSemanticCount === (options.deferredSemanticCount || 0),
    `unexpected deferredSemanticCount: ${pack.deferredSemanticCount}`
  );
  assert(
    pack.deferredVisualCount === (options.deferredVisualCount || 0),
    `unexpected deferredVisualCount: ${pack.deferredVisualCount}`
  );
}

function validateGroupedOverviewDigest(plan) {
  const actions = Array.isArray(plan.actions) ? plan.actions : [];
  const digestAction = actions.find(
    (action) =>
      action.noteId === "g-root" &&
      action.type === "rewrite_excerpt" &&
      action.meta &&
      action.meta.source === "branch_structure_digest"
  );
  assert(digestAction, "grouped overview plan missing root branch_structure_digest");
  assert(
    /^\"Residue theorem\" currently covers /i.test(digestAction.text),
    `expected grouped overview phrasing, got: ${digestAction.text}`
  );
  assert(
    digestAction.text.includes("Definitions (2)") &&
      digestAction.text.includes("Proof steps (2)") &&
      digestAction.text.includes("Questions (1)"),
    `grouped overview text missing group labels/counts: ${digestAction.text}`
  );
  assert(
    (digestAction.text.includes("Isolated singularity") ||
      digestAction.text.includes("Residue notation")) &&
      (digestAction.text.includes("Contour decomposition") ||
        digestAction.text.includes("Coefficient extraction")) &&
      digestAction.text.includes("Choosing the contour"),
    `grouped overview text missing representative descendants: ${digestAction.text}`
  );
  assert(
    Array.isArray(digestAction.meta.evidence) &&
      digestAction.meta.evidence.some((item) => /Detected 3 grouped themes/i.test(item)) &&
      digestAction.meta.evidence.some((item) => /Grouped themes:/i.test(item)),
    "grouped overview evidence should explain detected grouped themes"
  );
}

function validateGroupedOverviewDigestWithoutGenericTitle(plan) {
  const actions = Array.isArray(plan.actions) ? plan.actions : [];
  const digestAction = actions.find(
    (action) =>
      action.noteId === "g-generic-root" &&
      action.type === "rewrite_excerpt" &&
      action.meta &&
      action.meta.source === "branch_structure_digest"
  );
  assert(digestAction, "generic-title grouped plan missing root branch_structure_digest");
  assert(
    /^This branch currently covers /i.test(digestAction.text),
    `expected generic title to be suppressed, got: ${digestAction.text}`
  );
  assert(
    !/Summary node/i.test(digestAction.text),
    `generic title should not be echoed back in grouped overview text: ${digestAction.text}`
  );
}

function validateDirectChildDigestFallback(plan) {
  const actions = Array.isArray(plan.actions) ? plan.actions : [];
  const digestAction = actions.find(
    (action) =>
      action.noteId === "d-root" &&
      action.type === "rewrite_excerpt" &&
      action.meta &&
      action.meta.source === "branch_structure_digest"
  );
  assert(digestAction, "direct-child plan missing root branch_structure_digest");
  assert(
    /^This branch currently groups\s*3\s*direct child notes/i.test(digestAction.text),
    `direct-child digest should keep legacy phrasing, got: ${digestAction.text}`
  );
}

function validateFollowupGroupedDigestSuppression(plan) {
  const actions = Array.isArray(plan.actions) ? plan.actions : [];
  assert(
    !actions.some((action) => action.type === "append_tags"),
    "follow-up grouped digest text should continue to suppress semantic tag actions"
  );
}

function main() {
  const plan = buildSamplePlan();
  const visibleRecolorPlan = buildVisibleColorCorrectionPlan();
  const hiddenRecolorPlan = buildHiddenColorCorrectionPlan();
  const semanticDeferredPlan = buildSemanticDeferredOnlyPlan();
  const pureOrganizedEnoughPlan = buildPureOrganizedEnoughPlan();
  const visualDeferredOnlyPacks = buildDeferredVisualOnlyStrategyPacks();
  const blockedPacks = buildBlockedOrganizedEnoughStrategyPacks();
  const groupedOverviewPlan = buildGroupedOverviewPlan();
  const groupedOverviewPlanWithGenericTitle = buildGroupedOverviewPlanWithGenericTitle();
  const directChildDigestPlan = buildDirectChildDigestPlan();
  const followupGroupedDigestSuppressionPlan = buildFollowupGroupedDigestSuppressionPlan();
  const actions = Array.isArray(plan.actions) ? plan.actions : [];
  const unsupportedActions = Array.isArray(plan.unsupportedActions)
    ? plan.unsupportedActions
    : [];

  actions.forEach(validateAction);
  validateOrdering(actions);
  validateCounts(plan);
  validateUnsupported(unsupportedActions);
  validateColorPolicy(actions);
  validateVisibleColorCorrection(visibleRecolorPlan);
  validateHiddenColorSkip(hiddenRecolorPlan);
  validateStrategyPacks(plan);
  validateOrganizedEnoughPack(semanticDeferredPlan, {
    rootNoteId: "s-1",
    deferredSemanticCount: 1,
    deferredVisualCount: 0,
  });
  validateOrganizedEnoughPack(pureOrganizedEnoughPlan, {
    rootNoteId: "o-1",
    deferredSemanticCount: 0,
    deferredVisualCount: 0,
  });
  validateOrganizedEnoughPack({ strategyPacks: visualDeferredOnlyPacks }, {
    rootNoteId: "v-1",
    deferredSemanticCount: 0,
    deferredVisualCount: 2,
  });
  validateGroupedOverviewDigest(groupedOverviewPlan);
  validateGroupedOverviewDigestWithoutGenericTitle(groupedOverviewPlanWithGenericTitle);
  validateDirectChildDigestFallback(directChildDigestPlan);
  validateFollowupGroupedDigestSuppression(followupGroupedDigestSuppressionPlan);
  assert(
    Array.isArray(blockedPacks) && blockedPacks.length === 0,
    "blocking warnings or unsupported suggestions should suppress organized-enough packs"
  );

  process.stdout.write(
    `Planner invariants OK: actions=${actions.length}, unsupported=${unsupportedActions.length}\n`
  );
}

main();
