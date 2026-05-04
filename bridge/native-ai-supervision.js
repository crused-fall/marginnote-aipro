function yesNo(value) {
  return value ? "yes" : "no";
}

function formatEvidence(items) {
  return Array.isArray(items) && items.length ? items.join(", ") : "(none)";
}

function hasAny(items) {
  return Array.isArray(items) && items.length > 0;
}

function buildCapabilityRows(report) {
  const promptModules = report && report.promptModules ? report.promptModules : {};
  const strings = report && report.stringSignals ? report.stringSignals : {};
  const conclusions = report && report.conclusions ? report.conclusions : {};
  const prefs = report && report.preferences ? report.preferences : {};

  const rows = [];

  rows.push({
    key: "chat_context_qa",
    label: "Chat / Context QA",
    nativeAvailable:
      hasAny(strings.chat) ||
      !!(promptModules.en && promptModules.en.documentQa) ||
      !!(promptModules.en && promptModules.en.mindMapQa),
    supervisionMode: "augment_only",
    pluginApproach: "Do not rebuild chat. Add branch context packaging, result post-processing, and audit trails around organization workflows.",
    safeSurface: "Read-only inspection and later opt-in result post-processing",
    avoid: "Direct private chat runtime hooks or pretending the plugin is the primary chat UI",
    evidence: []
      .concat(strings.chat || [])
      .concat(
        promptModules.en && promptModules.en.documentQa ? ["document_qa_contract"] : []
      )
      .concat(
        promptModules.en && promptModules.en.mindMapQa ? ["mind_map_qa_contract"] : []
      )
      .concat(
        promptModules.en && promptModules.en.databaseQa ? ["database_qa_contract"] : []
      )
  });

  rows.push({
    key: "study_modes",
    label: "Study Modes",
    nativeAvailable: hasAny(strings.studyModes),
    supervisionMode: "augment_only",
    pluginApproach: "Treat Guide / Quiz / Explain as native-first surfaces. Only add branch-organization handoff and result summarization around them.",
    safeSurface: "Prompt or result-level supervision outside the native mode runtime",
    avoid: "Forking or cloning separate study-mode UIs in the plugin",
    evidence: strings.studyModes || []
  });

  rows.push({
    key: "ai_ocr_templates",
    label: "AI OCR Templates",
    nativeAvailable:
      hasAny(strings.ocr) ||
      !!prefs.mindbooksToolName ||
      !!(prefs.aiocrTemplates && prefs.aiocrTemplates.configCount > 0),
    supervisionMode: "mirror_and_supervise",
    pluginApproach: "Mirror template governance first: inspect, lint, diff, and eventually help generate safer OCR/card templates without invoking private OCR execution.",
    safeSurface: "Prompt/template files and preferences already visible on disk",
    avoid: "Calling private OCR execution flows directly from the addon",
    evidence: []
      .concat(strings.ocr || [])
      .concat(prefs.mindbooksToolName ? [`toolname:${prefs.mindbooksToolName}`] : [])
      .concat(
        prefs.aiocrTemplates && prefs.aiocrTemplates.configCount > 0
          ? [`template_configs:${prefs.aiocrTemplates.configCount}`]
          : []
      )
  });

  rows.push({
    key: "ai_breakdown_pipeline",
    label: "AI Breakdown",
    nativeAvailable:
      hasAny(strings.breakdown) ||
      !!prefs.aiBreakdownWorkflowType,
    supervisionMode: "supervise_outputs",
    pluginApproach: "Do not trigger the private pipeline. Supervise what happens after breakdown by reorganizing the resulting branch, fixing summaries, colors, and group structure.",
    safeSurface: "Post-breakdown branch selection plus offline inspection of prefs/progress traces",
    avoid: "Driving AIBreakdown private controllers or background tasks from plugin code",
    evidence: []
      .concat(strings.breakdown || [])
      .concat(
        prefs.aiBreakdownWorkflowType ? [`workflow:${prefs.aiBreakdownWorkflowType}`] : []
      )
      .concat(
        prefs.aiBreakdownMode ? [`mode:${prefs.aiBreakdownMode}`] : []
      )
  });

  rows.push({
    key: "style_learning_templates",
    label: "Mind Map Style Learning",
    nativeAvailable: hasAny(strings.styleLearning),
    supervisionMode: "mirror_and_supervise",
    pluginApproach: "Mirror branch-style evidence and help users turn good branches into reusable organization references for our own planner.",
    safeSurface: "Branch snapshots, style digests, and exported template-like summaries",
    avoid: "Depending on undocumented native few-shot storage formats",
    evidence: strings.styleLearning || []
  });

  rows.push({
    key: "internal_tool_engine",
    label: "Internal Tool Engine",
    nativeAvailable: conclusions.toolCallContractPresent,
    supervisionMode: "avoid_direct_hook",
    pluginApproach: "Assume the internal tool engine exists, but keep our executor separate. Use its existence only to guide product positioning and future supervision ideas.",
    safeSurface: "Inspection-only for now",
    avoid: "Any claim that stable public plugin access to internal tool calls already exists",
    evidence: []
      .concat(promptModules.toolNames || [])
      .concat(hasAny(strings.toolConfirmation) ? strings.toolConfirmation : [])
  });

  rows.push({
    key: "hierarchy_mutation",
    label: "Hierarchy Mutation",
    nativeAvailable:
      !!(promptModules.en && promptModules.en.hierarchyMutation) ||
      conclusions.toolCallContractPresent,
    supervisionMode: "plugin_executor_over_internal_tooling",
    pluginApproach: "Use our own public-API executor for safe grouping and branch cleanup instead of chasing native private hierarchy mutation APIs.",
    safeSurface: "Our helper-shell executor and apply artifacts",
    avoid: "Bridging directly into move/merge/delete private native tools",
    evidence: []
      .concat(
        promptModules.en && promptModules.en.hierarchyMutation
          ? ["native_hierarchy_tools_present"]
          : []
      )
      .concat(
        promptModules.toolNames || []
      )
      .filter((item) =>
        /move_cards_in_hierarchy|merge_cards|duplicate_or_link_card|delete_cards/.test(item)
      )
  });

  rows.push({
    key: "credits_and_max",
    label: "Credits / MAX",
    nativeAvailable: hasAny(strings.credits),
    supervisionMode: "defer_runtime_coupling",
    pluginApproach: "Treat credits and MAX as environment constraints, not something the plugin should couple execution policy to in v1.",
    safeSurface: "Read-only awareness in local inspection output",
    avoid: "Hard-coding plugin behavior against private credit/quota internals",
    evidence: strings.credits || []
  });

  return rows;
}

function summarizeMatrix(rows) {
  const summary = {
    total: rows.length,
    nativeAvailable: 0,
    byMode: {}
  };

  rows.forEach((row) => {
    if (row.nativeAvailable) summary.nativeAvailable += 1;
    const key = row.supervisionMode || "unknown";
    summary.byMode[key] = (summary.byMode[key] || 0) + 1;
  });

  return summary;
}

function buildSupervisionMatrix(report) {
  const rows = buildCapabilityRows(report);
  return {
    generatedAt: new Date().toISOString(),
    appVersion: report && report.appInfo ? report.appInfo.version : null,
    appBuild: report && report.appInfo ? report.appInfo.build : null,
    rows,
    summary: summarizeMatrix(rows),
    recommendation:
      "Use native AI evidence to guide plugin positioning, but keep execution governance and branch-organization mutations in the plugin's own audited layer."
  };
}

function renderSupervisionMatrixText(matrix) {
  const lines = [
    "MarginNote 4 Native AI Supervision Matrix",
    `Generated: ${matrix.generatedAt}`,
    `App version: ${matrix.appVersion || "(unknown)"} (${matrix.appBuild || "unknown"})`,
    `Capabilities: ${matrix.summary.nativeAvailable}/${matrix.summary.total} detected`,
    "",
    "Mode summary:"
  ];

  Object.keys(matrix.summary.byMode)
    .sort()
    .forEach((key) => {
      lines.push(`- ${key}: ${matrix.summary.byMode[key]}`);
    });

  matrix.rows.forEach((row) => {
    lines.push("");
    lines.push(`${row.label}`);
    lines.push(`- Native available: ${yesNo(row.nativeAvailable)}`);
    lines.push(`- Supervision mode: ${row.supervisionMode}`);
    lines.push(`- Plugin approach: ${row.pluginApproach}`);
    lines.push(`- Safe surface: ${row.safeSurface}`);
    lines.push(`- Avoid: ${row.avoid}`);
    lines.push(`- Evidence: ${formatEvidence(row.evidence)}`);
  });

  lines.push("");
  lines.push("Recommendation:");
  lines.push(`- ${matrix.recommendation}`);
  return lines.join("\n");
}

module.exports = {
  buildSupervisionMatrix,
  renderSupervisionMatrixText
};
