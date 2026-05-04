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

function readLatestApplyReport() {
  const files = fs
    .readdirSync(REPORTS_DIR)
    .filter((file) => /-apply-.*\.json$/.test(file) && !/-followup-apply-.*\.json$/.test(file))
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
  const report = reportInfo.report || {};
  const results = Array.isArray(report.results) ? report.results : [];
  const helperBlockedActions = Array.isArray(report.helperBlockedActions)
    ? report.helperBlockedActions
    : [];
  const okCount = results.filter((item) => item.ok).length;
  const skippedCount = results.filter((item) => item.skipped).length;
  const errorItems = results.filter((item) => item.error);
  const changedNotes = report.branchDiff?.changedNotes || [];
  const origin = report.origin || "";
  const mode = origin === "native_ai_breakdown" ? "breakdown" : "primary";
  const command = report.command || report.objective || "(unknown)";

  const lines = [
    `Latest apply report: ${reportInfo.file}`,
    `Path: ${reportInfo.fullPath}`,
    `Command: ${command}`,
    `Mode: ${mode}`,
    `Origin: ${origin || "(none)"}`,
    `Applied at: ${report.appliedAt || "(unknown)"}`,
    `Action count: ${report.actionCount || 0}`,
    `Applied: ${okCount}`,
    `Helper blocked: ${helperBlockedActions.length}`,
    `Skipped: ${skippedCount}`,
    `Errors: ${errorItems.length}`,
    `Changed notes: ${report.branchDiff?.changedNoteCount || 0}`,
  ];

  if (report.halted) {
    lines.push(
      `Halted at: ${report.halted.type} -> ${report.halted.noteId} (${report.halted.error || report.halted.reason || "unknown"})`
    );
  }

  if (errorItems.length) {
    lines.push("", "Errors:");
    errorItems.slice(0, 10).forEach((item) => {
      lines.push(
        `- ${item.type} -> ${item.noteId} | ${item.error} | path=${item.apiPath || "unknown"}`
      );
    });
  }

  const interestingSkips = results
    .filter((item) => item.skipped && item.reason !== "previous_error_halt")
    .slice(0, 10);
  if (interestingSkips.length) {
    lines.push("", "Skipped:");
    interestingSkips.forEach((item) => {
      lines.push(
        `- ${item.type} -> ${item.noteId} | ${item.reason || "unknown"} | disposition=${item.executionDisposition || "unknown"} | source=${item.planSource || "unknown"} | path=${item.apiPath || "unknown"}`
      );
    });
  }

  if (helperBlockedActions.length) {
    lines.push("", "Helper blocked:");
    helperBlockedActions.slice(0, 10).forEach((item) => {
      const detail = item.capabilityDetail || {};
      const detailBits = [];
      if (typeof detail.createGroupingChild === "boolean") {
        detailBits.push(`create=${detail.createGroupingChild ? 1 : 0}`);
      }
      if (typeof detail.moveExistingChild === "boolean") {
        detailBits.push(`move=${detail.moveExistingChild ? 1 : 0}`);
      }
      if (typeof detail.detachedCreateContextReady === "boolean") {
        detailBits.push(`detached=${detail.detachedCreateContextReady ? 1 : 0}`);
      }
      if (detail.detachedCreateContextSource) {
        detailBits.push(`detachedSource=${detail.detachedCreateContextSource}`);
      }
      lines.push(
        `- ${item.type} -> ${item.noteId} | ${item.reason || "unknown"} | path=${item.apiPath || "unknown"}${detailBits.length ? ` | ${detailBits.join(" ")}` : ""}`
      );
    });
  }

  if (changedNotes.length) {
    lines.push("", "Changed notes:");
    changedNotes.slice(0, 10).forEach((item) => {
      lines.push(`- ${item.noteId} | fields=${(item.changedFields || []).join(",")}`);
    });
  }

  const structureItems = results
    .filter((item) => item.type === "organize_branch_groups" && item.executionDetail)
    .slice(0, 10);
  if (structureItems.length) {
    lines.push("", "Structure detail:");
    structureItems.forEach((item) => {
      const detail = item.executionDetail || {};
      lines.push(
        `- ${item.noteId} | created=${(item.createdNoteIds || []).length} moved=${(item.movedNoteIds || []).length} path=${item.apiPath || "unknown"}`
      );
      const groups = Array.isArray(detail.groupSummaries) ? detail.groupSummaries : [];
      groups.slice(0, 6).forEach((group) => {
        const moved = Array.isArray(group.moveSummaries)
          ? group.moveSummaries.filter((entry) => entry.moved).length
          : 0;
        const skipped = Array.isArray(group.moveSummaries)
          ? group.moveSummaries.filter((entry) => entry.skipped).length
          : 0;
        lines.push(
          `  - ${group.label || "(empty)"} | note=${group.groupNoteId || "(none)"} | create=${group.createPath || "unknown"} | moved=${moved} | skipped=${skipped}${group.createError ? ` | error=${group.createError}` : ""}`
        );
      });
    });
  }

  return lines.join("\n");
}

function main() {
  const reportInfo = readLatestApplyReport();
  if (!reportInfo) {
    process.stdout.write(`No apply reports found in ${REPORTS_DIR}\n`);
    return;
  }
  process.stdout.write(`${summarize(reportInfo)}\n`);
}

main();
