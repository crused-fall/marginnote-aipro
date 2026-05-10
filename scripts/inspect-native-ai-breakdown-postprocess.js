const fs = require("fs");
const os = require("os");
const path = require("path");
const {
  buildBreakdownPostprocessPlan,
  normalizeBranchNodes
} = require("../bridge/native-ai-breakdown-postprocess");

function parseArgs(argv) {
  const options = {
    help: false,
    inputPath: "",
    json: false,
    compact: false,
    liveOnly: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--json") {
      options.json = true;
      continue;
    }
    if (arg === "--compact") {
      options.compact = true;
      continue;
    }
    if (arg === "--input" && argv[i + 1]) {
      options.inputPath = argv[i + 1];
      i += 1;
      continue;
    }
    if (arg.startsWith("--input=")) {
      options.inputPath = arg.slice("--input=".length);
      continue;
    }
    if (arg === "--help" || arg === "-h") {
      options.help = true;
      continue;
    }
    if (arg === "--live-only" || arg === "--no-proxy") {
      options.liveOnly = true;
      continue;
    }
  }

  return options;
}

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

const REQUESTS_DIR =
  process.env.MN_AGENT_REQUESTS_DIR ||
  path.join(
    os.homedir(),
    "Library",
    "Containers",
    "QReader.MarginStudy.easy",
    "Data",
    "Library",
    "Caches",
    "MNAIProBridge",
    "requests"
  );

function readJsonFile(fullPath) {
  return JSON.parse(fs.readFileSync(fullPath, "utf8"));
}

function listJsonFiles(dirPath, filter) {
  let files = [];
  try {
    files = fs.readdirSync(dirPath);
  } catch (error) {
    return [];
  }

  return files
    .filter((file) => file.endsWith(".json") && (!filter || filter(file)))
    .map((file) => {
      const fullPath = path.join(dirPath, file);
      const stat = fs.statSync(fullPath);
      return { file, fullPath, mtimeMs: stat.mtimeMs };
    })
    .sort((left, right) => right.mtimeMs - left.mtimeMs);
}

function latestJsonFile(dirPath, filter) {
  const files = listJsonFiles(dirPath, filter);
  if (!files.length) return null;
  const latest = files[0];
  return {
    file: latest.file,
    fullPath: latest.fullPath,
    report: readJsonFile(latest.fullPath)
  };
}

function readLatestApplyReport() {
  return latestJsonFile(
    REPORTS_DIR,
    (file) => /-apply-.*\.json$/.test(file) && !/-followup-apply-.*\.json$/.test(file)
  );
}

function normalizeAfterBranchNotes(report) {
  const notes =
    report &&
    report.afterBranch &&
    Array.isArray(report.afterBranch.notes)
      ? report.afterBranch.notes
      : [];

  return normalizeBranchNodes(notes);
}

function latestMatchingJsonFile(dirPath, filter, predicate) {
  const files = listJsonFiles(dirPath, filter);
  for (const item of files) {
    const report = readJsonFile(item.fullPath);
    if (!predicate || predicate(report, item)) {
      return {
        file: item.file,
        fullPath: item.fullPath,
        report
      };
    }
  }
  return null;
}

function modeFromOrigin(origin) {
  return String(origin || "").trim() === "native_ai_breakdown" ? "breakdown" : "primary";
}

function recommendPostprocessNextCommand() {
  return "mnaipro breakdown artifacts --json";
}

function summarizeRequestArtifact(info) {
  if (!info) return null;
  const report = info.report || {};
  return {
    file: info.file,
    fullPath: info.fullPath,
    origin: report.origin || "",
    mode: modeFromOrigin(report.origin),
    objective: report.objective || null,
    stage: report.stage || null,
    nodeCount: Array.isArray(report.nodes) ? report.nodes.length : 0,
  };
}

function summarizePlanArtifact(info) {
  if (!info) return null;
  const report = info.report || {};
  return {
    file: info.file,
    fullPath: info.fullPath,
    origin: report.origin || "",
    mode: modeFromOrigin(report.origin),
    objective: report.objective || null,
    stage: report.stage || null,
    actionCount: Array.isArray(report.actions) ? report.actions.length : 0,
    noteCount: Array.isArray(report.notes) ? report.notes.length : 0,
    unsupportedCount: Array.isArray(report.unsupportedActions) ? report.unsupportedActions.length : 0,
    strategyPackCount: Array.isArray(report.strategyPacks) ? report.strategyPacks.length : 0,
  };
}

function summarizeApplyArtifact(info) {
  if (!info) return null;
  const report = info.report || {};
  const results = Array.isArray(report.results) ? report.results : [];
  return {
    file: info.file,
    fullPath: info.fullPath,
    origin: report.origin || "",
    mode: modeFromOrigin(report.origin),
    command: report.command || report.objective || null,
    actionCount: typeof report.actionCount === "number" ? report.actionCount : results.length,
    appliedCount: results.filter((item) => item && item.ok).length,
    skippedCount: results.filter((item) => item && item.skipped).length,
  };
}

function latestGenericArtifacts() {
  return {
    request: latestJsonFile(REQUESTS_DIR),
    plan: latestJsonFile(REPORTS_DIR, (file) => /-plan\.json$/.test(file)),
    apply: latestJsonFile(
      REPORTS_DIR,
      (file) => /-apply-.*\.json$/.test(file) && !/-followup-apply-.*\.json$/.test(file)
    ),
  };
}

function buildNoArtifactHints(latestGeneric) {
  const request = latestGeneric?.request || null;
  const plan = latestGeneric?.plan || null;
  const apply = latestGeneric?.apply || null;
  const all = [request, plan, apply].filter(Boolean);
  const hints = [];

  if (all.length && all.every((item) => !item.origin)) {
    hints.push("Latest cached artifacts still look like ordinary branch-organization runs, not Breakdown-mode runs.");
  }
  if (request && request.stage === "followup") {
    hints.push("The newest cached request is already a follow-up snapshot, so it cannot confirm the primary Breakdown entry path.");
  }
  hints.push("Run the in-app `整理 AI Breakdown 分支` variant to create dedicated Breakdown request/plan/apply artifacts.");
  return hints;
}

function buildNoArtifactReport() {
  const genericArtifacts = latestGenericArtifacts();
  const latestGeneric = {
    request: summarizeRequestArtifact(genericArtifacts.request),
    plan: summarizePlanArtifact(genericArtifacts.plan),
    apply: summarizeApplyArtifact(genericArtifacts.apply),
  };
  return {
    ok: false,
    kind: "native_ai_breakdown_postprocess",
    error: "no_breakdown_artifacts",
    message: `No native_ai_breakdown apply, request, or plan artifacts found in ${REPORTS_DIR} or ${REQUESTS_DIR}`,
    nextCommand: recommendPostprocessNextCommand(),
    reportsDir: REPORTS_DIR,
    requestsDir: REQUESTS_DIR,
    latestGeneric,
    hints: buildNoArtifactHints(latestGeneric),
  };
}

function buildNoNodesReport(error, message, sourceInfo) {
  return {
    ok: false,
    kind: "native_ai_breakdown_postprocess",
    error,
    message,
    nextCommand: recommendPostprocessNextCommand(),
    source: sourceInfo?.label || null,
    path: sourceInfo?.path || null,
    snapshotPath: sourceInfo?.nodePath || sourceInfo?.path || null,
  };
}

function summarizeNoArtifactReport(report) {
  const lines = [
    "Native AI Breakdown Postprocess Preview",
    report.message,
    `Reports dir: ${report.reportsDir}`,
    `Requests dir: ${report.requestsDir}`,
  ];

  if (report.nextCommand) {
    lines.push(`Next: ${report.nextCommand}`);
  }

  if (report.latestGeneric?.request || report.latestGeneric?.plan || report.latestGeneric?.apply) {
    lines.push("", "Latest generic artifacts:");
    if (report.latestGeneric.request) {
      const request = report.latestGeneric.request;
      lines.push(
        `- request: ${request.file} | mode=${request.mode} | origin=${request.origin || "(none)"} | stage=${request.stage || "unknown"} | nodes=${request.nodeCount}`
      );
    }
    if (report.latestGeneric.plan) {
      const plan = report.latestGeneric.plan;
      lines.push(
        `- plan: ${plan.file} | mode=${plan.mode} | origin=${plan.origin || "(none)"} | stage=${plan.stage || "unknown"} | actions=${plan.actionCount}`
      );
    }
    if (report.latestGeneric.apply) {
      const apply = report.latestGeneric.apply;
      lines.push(
        `- apply: ${apply.file} | mode=${apply.mode} | origin=${apply.origin || "(none)"} | actions=${apply.actionCount} | applied=${apply.appliedCount}`
      );
    }
  }

  if (Array.isArray(report.hints) && report.hints.length) {
    lines.push("", "Hints:");
    report.hints.forEach((hint) => lines.push(`- ${hint}`));
  }

  return lines.join("\n");
}

function summarizeNoNodesReport(report) {
  const lines = [
    "Native AI Breakdown Postprocess Preview",
    report.message,
  ];
  if (report.nextCommand) lines.push(`Next: ${report.nextCommand}`);
  if (report.source) lines.push(`Source: ${report.source}`);
  if (report.path) lines.push(`Path: ${report.path}`);
  if (report.snapshotPath && report.snapshotPath !== report.path) {
    lines.push(`Snapshot path: ${report.snapshotPath}`);
  }
  return lines.join("\n");
}

function readLatestBreakdownApplyReport() {
  return latestMatchingJsonFile(
    REPORTS_DIR,
    (file) => /-apply-.*\.json$/.test(file) && !/-followup-apply-.*\.json$/.test(file),
    (report) => report?.origin === "native_ai_breakdown"
  );
}

function readLatestBreakdownRequestReport() {
  return latestMatchingJsonFile(
    REQUESTS_DIR,
    null,
    (report) => report?.origin === "native_ai_breakdown"
  );
}

function extractRequestIdFromPlanFile(fileName) {
  return String(fileName || "").replace(/-plan\.json$/, "");
}

function readLatestBreakdownPlanReport() {
  const latest = latestMatchingJsonFile(
    REPORTS_DIR,
    (file) => /-plan\.json$/.test(file),
    (report) => report?.origin === "native_ai_breakdown"
  );
  if (!latest) return null;
  return {
    ...latest,
    requestId: extractRequestIdFromPlanFile(latest.file),
    requestPath: path.join(REQUESTS_DIR, `${extractRequestIdFromPlanFile(latest.file)}.json`)
  };
}

function readLatestBreakdownSource() {
  return (
    readLatestBreakdownApplyReport() ||
    readLatestBreakdownRequestReport() ||
    readLatestBreakdownPlanReport()
  );
}

function readLatestApplyProxySource() {
  const latestApply = readLatestApplyReport();
  if (!latestApply) return null;

  const nodes = normalizeAfterBranchNotes(latestApply.report);
  if (!nodes.length) return null;

  return {
    label: "latest_apply_after_branch_proxy",
    file: latestApply.file,
    path: latestApply.fullPath,
    fullPath: latestApply.fullPath,
    nodePath: latestApply.fullPath,
    report: latestApply.report,
    nodes,
    proxyApply: summarizeApplyArtifact(latestApply),
  };
}

function readLatestPostprocessSource(options = {}) {
  const liveOnly = !!options.liveOnly;
  return liveOnly ? readLatestBreakdownSource() : readLatestBreakdownSource() || readLatestApplyProxySource();
}

function extractNodesFromInput(filePath) {
  const raw = readJsonFile(filePath);
  if (Array.isArray(raw)) return normalizeBranchNodes(raw);
  if (Array.isArray(raw.nodes)) return normalizeBranchNodes(raw.nodes);
  if (raw.afterBranch && Array.isArray(raw.afterBranch.notes)) {
    return normalizeBranchNodes(raw.afterBranch.notes);
  }
  return [];
}

function extractNodesFromSource(source) {
  if (!source) return [];
  if (source.file && source.fullPath) {
    const primaryNodes = extractNodesFromInput(source.fullPath);
    if (primaryNodes.length) return primaryNodes;
  }
  if (source.requestPath && fs.existsSync(source.requestPath)) {
    const requestNodes = extractNodesFromInput(source.requestPath);
    if (requestNodes.length) return requestNodes;
  }
  return [];
}

function sourceLabel(source) {
  if (!source || !source.file) return "latest_breakdown_unknown";
  if (/-apply-.*\.json$/.test(source.file) && !/-followup-apply-.*\.json$/.test(source.file)) {
    return "latest_breakdown_apply";
  }
  if (/-plan\.json$/.test(source.file)) {
    return "latest_breakdown_plan";
  }
  return "latest_breakdown_request";
}

function sourceNodePath(source) {
  if (source?.requestPath && /-plan\.json$/.test(source.file || "")) {
    return source.requestPath;
  }
  return source?.fullPath || null;
}

function strategyPackSummary(pack) {
  if (!pack) return null;
  return {
    key: pack.key || null,
    type: pack.type || null,
    stage: pack.stage || null,
    rootNoteId: pack.rootNoteId || null,
    summary: pack.summary || null,
    reason: pack.reason || null,
    actionKeyCount: Array.isArray(pack.actionKeys) ? pack.actionKeys.length : 0,
    deferredVisualCount: typeof pack.deferredVisualCount === "number" ? pack.deferredVisualCount : null,
    deferredSemanticCount:
      typeof pack.deferredSemanticCount === "number" ? pack.deferredSemanticCount : null,
    executionDisposition: pack.executionDisposition || null,
    visibleActionCounts: pack.visibleActionCounts || null,
    shapeEvidence: Array.isArray(pack.shapeEvidence) ? pack.shapeEvidence : [],
  };
}

function buildReport(result, sourceInfo) {
  const packs = Array.isArray(result.plan.strategyPacks) ? result.plan.strategyPacks : [];
  const primaryPack = packs[0] || null;
  const summary = {
    objective: result.payload.objective,
    origin: result.payload.origin,
    actionCount: (result.plan.actions || []).length,
    strategyPackCount: packs.length,
    warningCount: (result.plan.notes || []).length,
    unsupportedCount: (result.plan.unsupportedActions || []).length,
    primaryStrategyPack: strategyPackSummary(primaryPack),
  };

  return {
    ok: true,
    kind: "native_ai_breakdown_postprocess",
    source: sourceInfo.label,
    path: sourceInfo.path || null,
    snapshotPath: sourceInfo.nodePath || sourceInfo.path || null,
    nextCommand: recommendPostprocessNextCommand(),
    payload: result.payload,
    signals: result.signals,
    summary,
    strategyPacks: packs.map(strategyPackSummary),
    notes: result.plan.notes || [],
    actions: result.plan.actions || [],
    unsupported: result.plan.unsupportedActions || [],
    sourceProxy: sourceInfo.proxyApply || null,
    sourceSelectionMode: sourceInfo.proxyApply ? "proxy_after_branch" : "live_breakdown",
  };
}

function summarize(result, sourceInfo) {
  const actionTypes = {};
  (result.plan.actions || []).forEach((action) => {
    actionTypes[action.type] = (actionTypes[action.type] || 0) + 1;
  });
  const packs = Array.isArray(result.plan.strategyPacks) ? result.plan.strategyPacks : [];
  const primaryPack = packs[0] || null;
  const lines = [
    "Native AI Breakdown Postprocess Preview",
    `Source: ${sourceInfo.label}`,
    `Selection mode: ${sourceInfo.proxyApply ? "proxy_after_branch" : "live_breakdown"}`,
    `Path: ${sourceInfo.path || "(n/a)"}`,
    `Objective: ${result.payload.objective}`,
    `Origin: ${result.payload.origin}`,
    `Branch nodes: ${result.signals.branchNodeCount}`,
    `Root child branches: ${result.signals.rootChildCount}`,
    `Empty excerpts: ${result.signals.emptyExcerptCount}`,
    `Overview candidates: ${result.signals.parentSummaryCandidateCount}`,
    `Actions: ${(result.plan.actions || []).length}`,
    `Strategy packs: ${packs.length}`,
    `Warnings: ${(result.plan.notes || []).length}`,
    `Unsupported: ${(result.plan.unsupportedActions || []).length}`,
    `Next: ${recommendPostprocessNextCommand()}`
  ];

  if (sourceInfo.nodePath && sourceInfo.nodePath !== sourceInfo.path) {
    lines.push(`Snapshot path: ${sourceInfo.nodePath}`);
  }

  if (sourceInfo.proxyApply) {
    lines.push(
      `Proxy apply: ${sourceInfo.proxyApply.file} | mode=${sourceInfo.proxyApply.mode} | origin=${sourceInfo.proxyApply.origin || "(none)"}`
    );
  }

  if (primaryPack) {
    lines.push("", "Strategy conclusion:");
    lines.push(`- type: ${primaryPack.type || "unknown"}`);
    if (primaryPack.summary) {
      lines.push(`- summary: ${primaryPack.summary}`);
    }
    if (primaryPack.reason) {
      lines.push(`- reason: ${primaryPack.reason}`);
    }
    lines.push(
      `- disposition: ${primaryPack.executionDisposition || "unknown"} | deferred_semantic=${primaryPack.deferredSemanticCount ?? 0} | deferred_visual=${primaryPack.deferredVisualCount ?? 0} | action_keys=${Array.isArray(primaryPack.actionKeys) ? primaryPack.actionKeys.length : 0}`
    );
    if (Array.isArray(primaryPack.shapeEvidence) && primaryPack.shapeEvidence.length) {
      lines.push("- evidence:");
      primaryPack.shapeEvidence.forEach((item) => {
        lines.push(`  - ${item}`);
      });
    }
    if (primaryPack.type === "branch_already_organized_strategy") {
      lines.push(
        "- conclusion: no new executable actions were planned; this branch already looks organized enough for a conservative pass."
      );
    }
  }

  const typeKeys = Object.keys(actionTypes);
  if (typeKeys.length) {
    lines.push("", "Action types:");
    typeKeys.forEach((key) => {
      lines.push(`- ${key}: ${actionTypes[key]}`);
    });
  }

  if ((result.plan.notes || []).length) {
    lines.push("", "Notes:");
    result.plan.notes.slice(0, 8).forEach((item) => {
      lines.push(`- ${item.type}: ${item.message}`);
    });
  }

  if ((result.plan.actions || []).length) {
    lines.push("", "Preview:");
    result.plan.actions.slice(0, 10).forEach((action) => {
      lines.push(
        `- ${action.type} -> ${action.noteId} | source=${action.meta?.source || "unknown"} | phase=${action.phase || "unknown"}`
      );
    });
  }

  return lines.join("\n");
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    process.stdout.write(
      [
        "Native AI Breakdown Postprocess Preview",
        "Usage: inspect-native-ai-breakdown-postprocess [options]",
        "When no Breakdown-specific cache exists, the latest apply report's afterBranch snapshot is used as a proxy input if available.",
        "",
        "Options:",
        "  --input <path>   inspect a specific branch snapshot, request, or report",
        "  --json           emit a JSON report",
        "  --compact        emit a one-line summary",
        "  --live-only      skip the apply-report proxy fallback and require dedicated Breakdown artifacts",
        "  -h, --help       show this help",
      ].join("\n") + "\n"
    );
    return;
  }

  if (options.inputPath) {
    const inputPath = path.resolve(options.inputPath);
    const nodes = extractNodesFromInput(inputPath);
    if (!nodes.length) {
      const report = buildNoNodesReport(
        "no_branch_nodes",
        `No branch nodes found in ${inputPath}`,
        {
          label: "input_file",
          path: inputPath,
          nodePath: inputPath,
        }
      );
      if (options.json) {
        process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
        return;
      }
      if (options.compact) {
        process.stdout.write(
          [
            "Native AI Breakdown Postprocess",
            `source=${report.source || "unknown"}`,
            `error=${report.error}`,
            `path=${report.path || "none"}`,
            `snapshot=${report.snapshotPath || "none"}`,
            `next=${report.nextCommand || recommendPostprocessNextCommand()}`
          ].join(" ") + "\n"
        );
        return;
      }
      process.stdout.write(`${summarizeNoNodesReport(report)}\n`);
      return;
    }
    const result = buildBreakdownPostprocessPlan({ nodes, dryRun: true });
    const report = buildReport(result, {
      label: "input_file",
      path: inputPath,
      nodePath: inputPath
    });
    if (options.json) {
      process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
      return;
    }
    if (options.compact) {
      const primaryPack = report.summary.primaryStrategyPack || null;
      process.stdout.write(
        [
          "Native AI Breakdown Postprocess",
          `source=input_file`,
          "selection=live_breakdown",
          `actions=${report.summary.actionCount}`,
          `strategies=${report.summary.strategyPackCount}`,
          `primary=${primaryPack ? primaryPack.type || "unknown" : "none"}`,
          `deferredSemantic=${primaryPack && typeof primaryPack.deferredSemanticCount === "number" ? primaryPack.deferredSemanticCount : 0}`,
          `deferredVisual=${primaryPack && typeof primaryPack.deferredVisualCount === "number" ? primaryPack.deferredVisualCount : 0}`,
          `origin=${report.summary.origin || "none"}`,
          `next=${report.nextCommand || recommendPostprocessNextCommand()}`
        ].join(" ") + "\n"
      );
      return;
    }
    process.stdout.write(
      `${summarize(result, { label: "input_file", path: inputPath, nodePath: inputPath })}\n`
    );
    return;
  }

  const latestSource = readLatestPostprocessSource({ liveOnly: options.liveOnly });
  if (!latestSource) {
    const report = buildNoArtifactReport();
    if (options.json) {
      process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
      return;
    }
    if (options.compact) {
      const latest = report.latestGeneric || {};
      const request = latest.request ? `request=${latest.request.file}` : "request=none";
      const plan = latest.plan ? `plan=${latest.plan.file}` : "plan=none";
      const apply = latest.apply ? `apply=${latest.apply.file}` : "apply=none";
      process.stdout.write(
        [
          "Native AI Breakdown Postprocess",
          "source=none",
          `selection=${options.liveOnly ? "live_breakdown" : "proxy_after_branch"}`,
          "error=no_breakdown_artifacts",
          request,
          plan,
          apply,
          `next=${report.nextCommand || recommendPostprocessNextCommand()}`
        ].join(" ") + "\n"
      );
      return;
    }
    process.stdout.write(`${summarizeNoArtifactReport(report)}\n`);
    return;
  }
  const nodes = extractNodesFromSource(latestSource);
  if (!nodes.length) {
    const report = buildNoNodesReport(
      "no_branch_nodes",
      `Latest postprocess source has no branch nodes: ${latestSource.file}`,
      {
        label: latestSource.label || sourceLabel(latestSource),
        path: latestSource.fullPath,
        nodePath: sourceNodePath(latestSource),
      }
    );
    if (options.json) {
      process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
      return;
    }
    if (options.compact) {
      process.stdout.write(
        [
          "Native AI Breakdown Postprocess",
          `source=${report.source || "unknown"}`,
          `error=${report.error}`,
          `path=${report.path || "none"}`,
          `snapshot=${report.snapshotPath || "none"}`,
          `next=${report.nextCommand || recommendPostprocessNextCommand()}`
        ].join(" ") + "\n"
      );
      return;
    }
    process.stdout.write(`${summarizeNoNodesReport(report)}\n`);
    return;
  }
  const selectedLabel = sourceLabel(latestSource);
  const selectedNodePath = sourceNodePath(latestSource);
  const result = buildBreakdownPostprocessPlan({ nodes, dryRun: true });
  const report = buildReport(result, {
    label: selectedLabel,
    path: latestSource.fullPath,
    nodePath: selectedNodePath,
  });
  if (options.json) {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    return;
  }
  if (options.compact) {
    const primaryPack = report.summary.primaryStrategyPack || null;
    process.stdout.write(
      [
        "Native AI Breakdown Postprocess",
        `source=${report.source}`,
        `selection=${report.sourceProxy ? "proxy_after_branch" : "live_breakdown"}`,
        `actions=${report.summary.actionCount}`,
        `strategies=${report.summary.strategyPackCount}`,
        `primary=${primaryPack ? primaryPack.type || "unknown" : "none"}`,
        `deferredSemantic=${primaryPack && typeof primaryPack.deferredSemanticCount === "number" ? primaryPack.deferredSemanticCount : 0}`,
        `deferredVisual=${primaryPack && typeof primaryPack.deferredVisualCount === "number" ? primaryPack.deferredVisualCount : 0}`,
        `origin=${report.summary.origin || "none"}`,
        `next=${report.nextCommand || recommendPostprocessNextCommand()}`
      ].join(" ") + "\n"
    );
    return;
  }
  process.stdout.write(
    `${summarize(result, { label: selectedLabel, path: latestSource.fullPath, nodePath: selectedNodePath })}\n`
  );
}

main();
