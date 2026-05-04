const fs = require("fs");
const os = require("os");
const path = require("path");

const BREAKDOWN_ORIGIN = "native_ai_breakdown";

function defaultReportsDir() {
  return (
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
    )
  );
}

function defaultRequestsDir() {
  return (
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
    )
  );
}

function compactText(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

function modeFromOrigin(origin) {
  return compactText(origin) === BREAKDOWN_ORIGIN ? "breakdown" : "primary";
}

function recommendBreakdownNextCommand(status) {
  return status === "complete"
    ? "mnaipro breakdown postprocess --json"
    : "mnaipro breakdown artifacts --json";
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
      return {
        file,
        fullPath,
        mtimeMs: stat.mtimeMs,
      };
    })
    .sort((left, right) => right.mtimeMs - left.mtimeMs);
}

function readJsonFile(fullPath) {
  try {
    return JSON.parse(fs.readFileSync(fullPath, "utf8"));
  } catch (error) {
    return null;
  }
}

function latestMatchingJsonFile(dirPath, filter, predicate) {
  const files = listJsonFiles(dirPath, filter);
  for (const item of files) {
    const report = readJsonFile(item.fullPath);
    if (!report) continue;
    if (!predicate || predicate(report, item)) {
      return {
        file: item.file,
        fullPath: item.fullPath,
        mtimeMs: item.mtimeMs,
        report,
      };
    }
  }
  return null;
}

function latestJsonFile(dirPath, filter) {
  return latestMatchingJsonFile(dirPath, filter, null);
}

function extractRequestId(fileName) {
  const value = String(fileName || "");
  let match = value.match(/^mnaipro-(.+?)-followup-apply-[^.]+\.json$/);
  if (match) return match[1];
  match = value.match(/^mnaipro-(.+?)-followup\.json$/);
  if (match) return match[1];
  match = value.match(/^mnaipro-(.+?)-apply-[^.]+\.json$/);
  if (match) return match[1];
  match = value.match(/^mnaipro-(.+?)-plan\.json$/);
  if (match) return match[1];
  match = value.match(/^mnaipro-(.+?)\.json$/);
  if (match) return match[1];
  return "";
}

function summarizeRequestArtifact(info) {
  if (!info) return null;
  const report = info.report || {};
  return {
    file: info.file,
    fullPath: info.fullPath,
    mtimeMs: info.mtimeMs,
    requestId: extractRequestId(info.file),
    origin: report.origin || "",
    mode: modeFromOrigin(report.origin),
    objective: report.objective || null,
    stage: report.stage || "primary",
    nodeCount: Array.isArray(report.nodes) ? report.nodes.length : 0,
  };
}

function summarizePlanArtifact(info) {
  if (!info) return null;
  const report = info.report || {};
  return {
    file: info.file,
    fullPath: info.fullPath,
    mtimeMs: info.mtimeMs,
    requestId: extractRequestId(info.file),
    origin: report.origin || "",
    mode: modeFromOrigin(report.origin),
    objective: report.objective || null,
    stage: report.stage || "primary",
    actionCount: Array.isArray(report.actions) ? report.actions.length : 0,
    warningCount: Array.isArray(report.notes) ? report.notes.length : 0,
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
    mtimeMs: info.mtimeMs,
    requestId: extractRequestId(info.file),
    origin: report.origin || "",
    mode: modeFromOrigin(report.origin),
    command: report.command || report.objective || null,
    actionCount: typeof report.actionCount === "number" ? report.actionCount : results.length,
    appliedCount: results.filter((item) => item && item.ok).length,
    skippedCount: results.filter((item) => item && item.skipped).length,
  };
}

function latestGenericArtifacts(reportsDir, requestsDir) {
  return {
    request: latestJsonFile(requestsDir),
    plan: latestJsonFile(reportsDir, (file) => /-plan\.json$/.test(file)),
    apply: latestJsonFile(
      reportsDir,
      (file) => /-apply-.*\.json$/.test(file) && !/-followup-apply-.*\.json$/.test(file)
    ),
    followup: latestJsonFile(reportsDir, (file) => /-followup\.json$/.test(file)),
    followupApply: latestJsonFile(reportsDir, (file) => /-followup-apply-.*\.json$/.test(file)),
  };
}

function uniqueStrings(values) {
  return Array.from(new Set((values || []).filter(Boolean)));
}

function buildChain(label, artifacts) {
  const ordered = artifacts.filter(Boolean);
  const observed = ordered.length > 0;
  const ids = uniqueStrings(ordered.map((item) => item.requestId));
  const complete = observed && ordered.length === artifacts.length && ids.length === 1;
  const missing = [];
  const mismatches = [];

  if (!artifacts[0]) missing.push(`${label}.request`);
  if (!artifacts[1]) missing.push(`${label}.plan`);
  if (!artifacts[2]) missing.push(`${label}.apply`);
  if (ids.length > 1) mismatches.push(`${label}.request_id_mismatch`);

  return {
    observed,
    complete,
    requestId: ids.length === 1 ? ids[0] : "",
    requestIds: ids,
    missing,
    mismatches,
  };
}

function buildFollowupChain(followup, followupApply) {
  const artifacts = [followup, followupApply];
  const ordered = artifacts.filter(Boolean);
  const observed = ordered.length > 0;
  const ids = uniqueStrings(ordered.map((item) => item.requestId));
  const complete = observed && ordered.length === artifacts.length && ids.length === 1;
  const missing = [];
  const mismatches = [];

  if (!followup) missing.push("followup.plan");
  if (!followupApply) missing.push("followup.apply");
  if (ids.length > 1) mismatches.push("followup.request_id_mismatch");

  return {
    observed,
    complete,
    requestId: ids.length === 1 ? ids[0] : "",
    requestIds: ids,
    missing,
    mismatches,
  };
}

function buildStatus(primaryChain, followupChain) {
  if (!primaryChain.observed && !followupChain.observed) return "missing";
  if (primaryChain.complete && (!followupChain.observed || followupChain.complete)) return "complete";
  return "partial";
}

function buildHints(report) {
  const hints = [];
  if (report.status === "missing") {
    hints.push("No dedicated native_ai_breakdown artifacts were found in the local request/report cache.");
  }
  if (report.primaryChain.observed && !report.primaryChain.complete) {
    hints.push("The primary Breakdown chain is incomplete or split across multiple request IDs.");
  }
  if (report.breakdown.apply && !report.followupChain.observed) {
    hints.push("A Breakdown apply exists, but no follow-up plan/apply artifacts were found yet.");
  }
  if (report.followupChain.observed && !report.followupChain.complete) {
    hints.push("The follow-up Breakdown chain is incomplete or split across multiple request IDs.");
  }
  if (
    report.genericFallback &&
    report.genericFallback.request &&
    compactText(report.genericFallback.request.origin) !== BREAKDOWN_ORIGIN
  ) {
    hints.push("The newest generic request still looks like an ordinary branch-organization run, not the Breakdown subcommand.");
  }
  if (!hints.length) {
    hints.push("Breakdown-specific artifacts are coherent for the newest observed chain.");
  }
  return hints;
}

function buildBreakdownArtifactAudit(options = {}) {
  const reportsDir = options.reportsDir || defaultReportsDir();
  const requestsDir = options.requestsDir || defaultRequestsDir();

  const breakdown = {
    request: summarizeRequestArtifact(
      latestMatchingJsonFile(
        requestsDir,
        null,
        (report) =>
          compactText(report.origin) === BREAKDOWN_ORIGIN &&
          compactText(report.stage || "primary") !== "followup"
      )
    ),
    plan: summarizePlanArtifact(
      latestMatchingJsonFile(
        reportsDir,
        (file) => /-plan\.json$/.test(file),
        (report) =>
          compactText(report.origin) === BREAKDOWN_ORIGIN &&
          compactText(report.stage || "primary") !== "followup"
      )
    ),
    apply: summarizeApplyArtifact(
      latestMatchingJsonFile(
        reportsDir,
        (file) => /-apply-.*\.json$/.test(file) && !/-followup-apply-.*\.json$/.test(file),
        (report) => compactText(report.origin) === BREAKDOWN_ORIGIN
      )
    ),
    followup: summarizePlanArtifact(
      latestMatchingJsonFile(
        reportsDir,
        (file) => /-followup\.json$/.test(file),
        (report) =>
          compactText(report.origin) === BREAKDOWN_ORIGIN ||
          compactText(report.stage) === "followup"
      )
    ),
    followupApply: summarizeApplyArtifact(
      latestMatchingJsonFile(
        reportsDir,
        (file) => /-followup-apply-.*\.json$/.test(file),
        (report) => compactText(report.origin) === BREAKDOWN_ORIGIN
      )
    ),
  };

  const primaryChain = buildChain("primary", [
    breakdown.request,
    breakdown.plan,
    breakdown.apply,
  ]);
  const followupChain = buildFollowupChain(breakdown.followup, breakdown.followupApply);
  const generic = latestGenericArtifacts(reportsDir, requestsDir);
  const genericFallback = {
    request: summarizeRequestArtifact(generic.request),
    plan: summarizePlanArtifact(generic.plan),
    apply: summarizeApplyArtifact(generic.apply),
    followup: summarizePlanArtifact(generic.followup),
    followupApply: summarizeApplyArtifact(generic.followupApply),
  };
  const status = buildStatus(primaryChain, followupChain);
  const nextCommand = recommendBreakdownNextCommand(status);

  const report = {
    ok: true,
    kind: "native_ai_breakdown_artifacts",
    status,
    nextCommand,
    summary:
      status === "complete"
        ? "Breakdown-specific artifacts are present and coherent for the newest chain."
        : status === "partial"
          ? "Breakdown-specific artifacts exist, but the newest chain is incomplete or split."
          : "No Breakdown-specific artifacts were found; only generic cache evidence is available.",
    reportsDir,
    requestsDir,
    breakdown,
    primaryChain,
    followupChain,
    gaps: primaryChain.missing
      .concat(primaryChain.mismatches)
      .concat(followupChain.missing)
      .concat(followupChain.mismatches),
    genericFallback,
  };

  report.hints = buildHints(report);
  return report;
}

function formatArtifactLine(label, item) {
  if (!item) return `- ${label}: (missing)`;
  const parts = [
    `- ${label}: ${item.file}`,
    `request=${item.requestId || "(unknown)"}`,
    `mode=${item.mode}`,
    `origin=${item.origin || "(none)"}`,
  ];
  if (item.stage) parts.push(`stage=${item.stage}`);
  if (typeof item.nodeCount === "number") parts.push(`nodes=${item.nodeCount}`);
  if (typeof item.actionCount === "number") parts.push(`actions=${item.actionCount}`);
  if (typeof item.strategyPackCount === "number") parts.push(`packs=${item.strategyPackCount}`);
  return parts.join(" | ");
}

function summarizeChainLine(label, chain) {
  const requestId = chain.requestId || chain.requestIds.join(",") || "(none)";
  return `${label}: observed=${chain.observed ? 1 : 0} complete=${chain.complete ? 1 : 0} request=${requestId} gaps=${chain.missing.length + chain.mismatches.length}`;
}

function formatBreakdownArtifactAudit(report) {
  const lines = [
    "Native AI Breakdown Artifact Audit",
    report.summary,
    `Status: ${report.status}`,
    `Next: ${report.nextCommand || recommendBreakdownNextCommand(report.status)}`,
    `Reports dir: ${report.reportsDir}`,
    `Requests dir: ${report.requestsDir}`,
    "",
    "Chain summary:",
    `- ${summarizeChainLine("primary", report.primaryChain)}`,
    `- ${summarizeChainLine("followup", report.followupChain)}`,
    "",
    "Breakdown artifacts:",
    formatArtifactLine("request", report.breakdown.request),
    formatArtifactLine("plan", report.breakdown.plan),
    formatArtifactLine("apply", report.breakdown.apply),
    formatArtifactLine("followup", report.breakdown.followup),
    formatArtifactLine("followup_apply", report.breakdown.followupApply),
  ];

  if (report.gaps.length) {
    lines.push("", "Gaps:");
    report.gaps.forEach((gap) => lines.push(`- ${gap}`));
  }

  lines.push("", "Latest generic artifacts:");
  lines.push(formatArtifactLine("request", report.genericFallback.request));
  lines.push(formatArtifactLine("plan", report.genericFallback.plan));
  lines.push(formatArtifactLine("apply", report.genericFallback.apply));
  lines.push(formatArtifactLine("followup", report.genericFallback.followup));
  lines.push(formatArtifactLine("followup_apply", report.genericFallback.followupApply));

  if (report.hints.length) {
    lines.push("", "Hints:");
    report.hints.forEach((hint) => lines.push(`- ${compactText(hint)}`));
  }

  return lines.join("\n");
}

function formatBreakdownArtifactAuditCompact(report) {
  return [
    "Native AI Breakdown Artifact Audit",
    `status=${report.status}`,
    `next=${report.nextCommand || recommendBreakdownNextCommand(report.status)}`,
    `primary=${report.primaryChain.complete ? "complete" : report.primaryChain.observed ? "partial" : "missing"}`,
    `followup=${report.followupChain.complete ? "complete" : report.followupChain.observed ? "partial" : "missing"}`,
    `gaps=${report.gaps.length}`,
    `latest_breakdown_request=${report.breakdown.request ? report.breakdown.request.requestId || "unknown" : "none"}`,
  ].join(" ");
}

module.exports = {
  BREAKDOWN_ORIGIN,
  buildBreakdownArtifactAudit,
  compactText,
  defaultReportsDir,
  defaultRequestsDir,
  extractRequestId,
  formatBreakdownArtifactAudit,
  formatBreakdownArtifactAuditCompact,
  modeFromOrigin,
  recommendBreakdownNextCommand,
};
