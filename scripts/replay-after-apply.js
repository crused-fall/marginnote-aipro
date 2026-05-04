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

  if (!files.length) return null;
  const latest = files[0];
  return {
    file: latest.file,
    fullPath: latest.fullPath,
    report: JSON.parse(fs.readFileSync(latest.fullPath, "utf8")),
  };
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
  }));
}

function summarize(planInfo, applyInfo) {
  const plan = planInfo.plan || {};
  const actionTypes = {};
  (plan.actions || []).forEach((action) => {
    actionTypes[action.type] = (actionTypes[action.type] || 0) + 1;
  });
  const origin = plan.origin || "";
  const mode = origin === "native_ai_breakdown" ? "breakdown" : "primary";
  const command = applyInfo.report?.command || applyInfo.report?.objective || "(unknown)";

  const lines = [
    `Latest apply report: ${applyInfo.file}`,
    `Path: ${applyInfo.fullPath}`,
    `Command: ${command}`,
    `Mode: ${mode}`,
    `Origin: ${origin || "(none)"}`,
    `After-apply replay actions: ${(plan.actions || []).length}`,
    `Warnings: ${(plan.notes || []).length}`,
    `Unsupported: ${(plan.unsupportedActions || []).length}`,
  ];

  const typeKeys = Object.keys(actionTypes);
  if (typeKeys.length) {
    lines.push("", "Action types:");
    typeKeys.forEach((key) => {
      lines.push(`- ${key}: ${actionTypes[key]}`);
    });
  }

  if ((plan.actions || []).length) {
    lines.push("", "Preview:");
    plan.actions.slice(0, 12).forEach((action) => {
      lines.push(
        `- ${action.type} -> ${action.noteId} | source=${action.meta?.source || "unknown"} | phase=${action.phase || "unknown"}`
      );
    });
  }

  return lines.join("\n");
}

function main() {
  const applyInfo = readLatestApplyReport();
  if (!applyInfo) {
    process.stdout.write(`No apply reports found in ${REPORTS_DIR}\n`);
    return;
  }

  const nodes = normalizeAfterBranchNotes(applyInfo.report);
  if (!nodes.length) {
    process.stdout.write(`Latest apply report has no afterBranch notes: ${applyInfo.file}\n`);
    return;
  }

  const planInfo = planResponse({
    objective: applyInfo.report?.command || applyInfo.report?.objective || "整理当前选中分支",
    origin: applyInfo.report?.origin || "",
    stage: "followup",
    dryRun: true,
    nodes,
  });

  process.stdout.write(`${summarize(planInfo, applyInfo)}\n`);
}

main();
