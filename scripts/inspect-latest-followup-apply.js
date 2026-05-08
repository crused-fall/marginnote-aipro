const fs = require("fs");
const os = require("os");
const path = require("path");

function parseArgs(argv) {
  const options = {
    help: false,
    json: false,
    compact: false,
  };

  for (const arg of argv) {
    if (arg === "--json") {
      options.json = true;
      continue;
    }
    if (arg === "--compact") {
      options.compact = true;
      continue;
    }
    if (arg === "--help" || arg === "-h") {
      options.help = true;
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

function readLatestFollowupApplyReport() {
  const files = fs
    .readdirSync(REPORTS_DIR)
    .filter((file) => /-followup-apply-.*\.json$/.test(file))
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

function buildEnvelope(reportInfo) {
  if (!reportInfo) {
    return {
      ok: false,
      kind: "followup_apply",
      error: "not_found",
      message: `No follow-up apply reports found in ${REPORTS_DIR}`,
      reportsDir: REPORTS_DIR,
    };
  }

  const report = reportInfo.report || {};
  const results = Array.isArray(report.results) ? report.results : [];
  const helperBlockedActions = Array.isArray(report.helperBlockedActions)
    ? report.helperBlockedActions
    : [];
  const okCount = results.filter((item) => item.ok).length;
  const skippedCount = results.filter((item) => item.skipped).length;
  const errorItems = results.filter((item) => item.error);
  const changedNotes = report.branchDiff?.changedNotes || [];
  const overviewFillResults = results.filter(
    (item) => item.type === "rewrite_excerpt" && item.planSource === "branch_structure_digest"
  );
  const origin = report.origin || "";
  const mode = origin === "native_ai_breakdown" ? "breakdown" : "primary";
  const command = report.command || report.objective || "(unknown)";

  const sourceCounts = {};
  for (const item of results) {
    const key = item?.planSource || "unknown";
    sourceCounts[key] = (sourceCounts[key] || 0) + 1;
  }

  return {
    ok: true,
    kind: "followup_apply",
    artifact: {
      file: reportInfo.file,
      fullPath: reportInfo.fullPath,
      mtimeMs: reportInfo.mtimeMs || null,
    },
    report,
    summary: {
      command,
      mode,
      origin,
      appliedAt: report.appliedAt || null,
      actionCount: report.actionCount || 0,
      appliedCount: okCount,
      helperBlockedCount: helperBlockedActions.length,
      skippedCount,
      errorCount: errorItems.length,
      changedNoteCount: report.branchDiff?.changedNoteCount || 0,
      overviewFillCount: overviewFillResults.length,
    },
    sourceCounts,
    errors: errorItems,
    helperBlockedActions,
    changedNotes,
    overviewFillResults,
  };
}

function summarize(reportInfo) {
  const envelope = buildEnvelope(reportInfo);
  if (!envelope.ok) {
    return [
      "Latest follow-up apply report",
      envelope.message,
      `Reports dir: ${envelope.reportsDir}`,
    ].join("\n");
  }

  const report = envelope.report || {};
  const summary = envelope.summary || {};
  const sourceCounts = envelope.sourceCounts || {};
  const changedNotes = envelope.changedNotes || [];
  const errors = envelope.errors || [];
  const helperBlockedActions = envelope.helperBlockedActions || [];
  const overviewFillResults = envelope.overviewFillResults || [];

  const lines = [
    `Latest follow-up apply report: ${reportInfo.file}`,
    `Path: ${reportInfo.fullPath}`,
    `Command: ${summary.command || "(unknown)"}`,
    `Mode: ${summary.mode}`,
    `Origin: ${summary.origin || "(none)"}`,
    `Applied at: ${summary.appliedAt || "(unknown)"}`,
    `Action count: ${summary.actionCount || 0}`,
    `Applied: ${summary.appliedCount || 0}`,
    `Helper blocked: ${summary.helperBlockedCount || 0}`,
    `Skipped: ${summary.skippedCount || 0}`,
    `Errors: ${summary.errorCount || 0}`,
    `Changed notes: ${summary.changedNoteCount || 0}`,
  ];

  const sourceKeys = Object.keys(sourceCounts);
  if (sourceKeys.length) {
    lines.push("", "Plan sources:");
    sourceKeys.forEach((key) => {
      lines.push(`- ${key}: ${sourceCounts[key]}`);
    });
  }

  if (errors.length) {
    lines.push("", "Errors:");
    errors.slice(0, 10).forEach((item) => {
      lines.push(
        `- ${item.type} -> ${item.noteId} | ${item.error} | path=${item.apiPath || "unknown"}`
      );
    });
  }

  if (helperBlockedActions.length) {
    lines.push("", "Helper blocked:");
    helperBlockedActions.slice(0, 10).forEach((item) => {
      lines.push(
        `- ${item.type} -> ${item.noteId} | ${item.reason || "unknown"} | path=${item.apiPath || "unknown"}`
      );
    });
  }

  if (changedNotes.length) {
    lines.push("", "Changed notes:");
    changedNotes.slice(0, 10).forEach((item) => {
      lines.push(`- ${item.noteId} | fields=${(item.changedFields || []).join(",")}`);
    });
  }

  if (overviewFillResults.length) {
    lines.push("", "Branch overview fills:");
    lines.push(`- count: ${overviewFillResults.length}`);
    overviewFillResults.slice(0, 10).forEach((item) => {
      lines.push(
        `- ${item.noteId} | source=${item.planSource || "unknown"} | disposition=${item.executionDisposition || "unknown"} | path=${item.apiPath || "unknown"}`
      );
    });
  }

  return lines.join("\n");
}

function formatCompact(envelope) {
  if (!envelope.ok) {
    return [
      "followup_apply=0",
      `error=${envelope.error || "not_found"}`,
      `reports_dir=${envelope.reportsDir || "(unknown)"}`,
    ].join(" ");
  }

  const summary = envelope.summary || {};
  return [
    "followup_apply=1",
    `action_count=${summary.actionCount || 0}`,
    `applied=${summary.appliedCount || 0}`,
    `skipped=${summary.skippedCount || 0}`,
    `errors=${summary.errorCount || 0}`,
    `mode=${summary.mode || "primary"}`,
    `origin=${summary.origin || "none"}`,
    `changed_notes=${summary.changedNoteCount || 0}`,
    `overview_fills=${summary.overviewFillCount || 0}`,
  ].join(" ");
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    process.stdout.write(
      [
        "Latest Follow-up Apply Report",
        "Usage: inspect-latest-followup-apply [--json|--compact]",
      ].join("\n") + "\n"
    );
    return;
  }

  const reportInfo = readLatestFollowupApplyReport();
  const envelope = buildEnvelope(reportInfo);
  if (options.json) {
    process.stdout.write(`${JSON.stringify(envelope, null, 2)}\n`);
    return;
  }
  if (options.compact) {
    process.stdout.write(`${formatCompact(envelope)}\n`);
    return;
  }
  process.stdout.write(`${summarize(reportInfo)}\n`);
}

main();
