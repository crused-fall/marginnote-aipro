#!/usr/bin/env node

const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync, spawnSync } = require("child_process");
const { Command } = require("commander");
const {
  bridgeStatus,
  latestDiagnosticWithFallback,
  latestFollowupWithFallback,
  latestReport,
  REQUESTS_DIR,
  RESPONSES_DIR,
  REPORTS_DIR,
  DIAGNOSTICS_DIR,
} = require("../bridge/server");
const { summarizeObsidianSyncSettings } = require("../bridge/obsidian-sync");
const { planResponse } = require("../bridge/planner");
const { buildBreakdownArtifactAudit } = require("../bridge/breakdown-artifact-audit");

const ROOT_DIR = path.resolve(__dirname, "..");
const DEFAULT_BASE_URL = process.env.MN_AGENT_BASE_URL || "http://127.0.0.1:8765";
const DEFAULT_OBSIDIAN_VAULT_PATH =
  process.env.MN_OBSIDIAN_VAULT_PATH || "/Users/cfall/Documents/Obsidian-vaults/Proactive_info_base";
const BREAKDOWN_SMOKE_SCRIPT = path.join(ROOT_DIR, "scripts", "check-native-ai-breakdown-smoke.js");
const BREAKDOWN_POSTPROCESS_SCRIPT = path.join(
  ROOT_DIR,
  "scripts",
  "inspect-native-ai-breakdown-postprocess.js"
);
const FOLLOWUP_APPLY_SCRIPT = path.join(
  ROOT_DIR,
  "scripts",
  "inspect-latest-followup-apply.js"
);
const BREAKDOWN_ARTIFACTS_SCRIPT = path.join(
  ROOT_DIR,
  "scripts",
  "inspect-native-ai-breakdown-artifacts.js"
);
const BRIDGE_RENDER_SCRIPT = path.join(ROOT_DIR, "scripts", "render-launch-agent.js");
const BRIDGE_RELOAD_SCRIPT = path.join(ROOT_DIR, "scripts", "reload-launch-agent.js");

function outputText(text) {
  process.stdout.write(`${text}\n`);
}

function outputBlock(text) {
  process.stdout.write(`${text}\n`);
}

function outputJson(payload) {
  process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
}

function compactText(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

function summarizeBreakdownAuditInline(audit) {
  if (!audit) return "unknown";
  const primary =
    audit.primaryChain && audit.primaryChain.complete
      ? "complete"
      : audit.primaryChain && audit.primaryChain.observed
        ? "partial"
        : "missing";
  const followup =
    audit.followupChain && audit.followupChain.complete
      ? "complete"
      : audit.followupChain && audit.followupChain.observed
        ? "partial"
        : "missing";
  return `status=${audit.status || "unknown"} primary=${primary} followup=${followup} gaps=${Array.isArray(audit.gaps) ? audit.gaps.length : 0}`;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseMaybeJson(text) {
  try {
    return JSON.parse(text);
  } catch (error) {
    return null;
  }
}

function runNodeScript(scriptPath, args = [], extraEnv = {}) {
  return spawnSync(process.execPath, [scriptPath, ...args], {
    cwd: ROOT_DIR,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    env: {
      ...process.env,
      ...extraEnv,
    },
  });
}

function safeRead(filePath) {
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch (error) {
    return "";
  }
}

function tailLines(filePath, count) {
  if (!fs.existsSync(filePath)) return [];
  return fs
    .readFileSync(filePath, "utf8")
    .split("\n")
    .filter(Boolean)
    .slice(-count);
}

function jsonFileList(dirPath, filter) {
  try {
    return fs
      .readdirSync(dirPath)
      .filter((file) => file.endsWith(".json") && (!filter || filter(file)))
      .map((file) => {
        const fullPath = path.join(dirPath, file);
        const stat = fs.statSync(fullPath);
        return { file, fullPath, mtimeMs: stat.mtimeMs, size: stat.size };
      })
      .sort((a, b) => b.mtimeMs - a.mtimeMs);
  } catch (error) {
    return [];
  }
}

function readJsonFile(fullPath) {
  return JSON.parse(fs.readFileSync(fullPath, "utf8"));
}

function latestJsonFile(dirPath, filter) {
  const files = jsonFileList(dirPath, filter);
  if (!files.length) return null;
  const latest = files[0];
  return {
    file: latest.file,
    fullPath: latest.fullPath,
    mtimeMs: latest.mtimeMs,
    size: latest.size,
    json: readJsonFile(latest.fullPath),
  };
}

function summarizeLaunchctl(printText) {
  const summary = {};
  const lines = String(printText || "").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("state = ")) summary.state = trimmed.replace("state = ", "");
    if (trimmed.startsWith("active count = ")) {
      summary.activeCount = trimmed.replace("active count = ", "");
    }
    if (trimmed.startsWith("last exit code = ")) {
      summary.lastExitCode = trimmed.replace("last exit code = ", "");
    }
    if (trimmed.startsWith("program = ")) summary.program = trimmed.replace("program = ", "");
    if (trimmed.startsWith("path = ")) summary.path = trimmed.replace("path = ", "");
  }
  return summary;
}

function launchctlPrint(label) {
  try {
    return execFileSync("launchctl", ["print", label], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (error) {
    return error.stdout || error.stderr || error.message || String(error);
  }
}

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
    },
  });
  const text = await response.text();
  let payload = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch (error) {
    payload = {
      ok: false,
      error: "non_json_response",
      body: text,
    };
  }
  return {
    ok: response.ok,
    status: response.status,
    headers: Object.fromEntries(response.headers.entries()),
    payload,
  };
}

async function readStatus(baseUrl) {
  try {
    const live = await fetchJson(`${baseUrl.replace(/\/+$/, "")}/status`);
    if (!live.ok) {
      throw new Error(`http_${live.status}`);
    }
    const payload = live.payload && typeof live.payload === "object" ? live.payload : {};
    payload.source = "live_http";
    return {
      ok: true,
      source: "live_http",
      payload,
      live,
    };
  } catch (error) {
    const payload = bridgeStatus();
    payload.source = "local_fallback";
    payload.bridgeOffline = true;
    payload.bridgeOfflineReason = error && error.message ? error.message : String(error);
    return {
      ok: true,
      source: "local_fallback",
      payload,
      live: null,
    };
  }
}

function summarizePlanPlan(plan) {
  const actions = Array.isArray(plan?.actions) ? plan.actions : [];
  const unsupported = Array.isArray(plan?.unsupportedActions) ? plan.unsupportedActions : [];
  const notes = Array.isArray(plan?.notes) ? plan.notes : [];
  const packs = Array.isArray(plan?.strategyPacks) ? plan.strategyPacks : [];
  const counts = plan?.actionDispositionCounts || {};
  const phaseCounts = plan?.actionPhaseCounts || {};
  const primaryPack = packs[0] || null;

  return {
    objective: plan?.objective || null,
    stage: plan?.stage || "primary",
    mode: plan?.origin === "native_ai_breakdown" ? "breakdown" : "primary",
    origin: plan?.origin || "",
    actionCount: actions.length,
    strategyPackCount: packs.length,
    warningCount: notes.length,
    unsupportedCount: unsupported.length,
    actionTypes: actions.map((action) => action && action.type).filter(Boolean),
    noteTypes: notes.map((note) => note && note.type).filter(Boolean),
    strategyTypes: packs.map((pack) => pack && pack.type).filter(Boolean),
    actionDispositionCounts: counts,
    actionPhaseCounts: phaseCounts,
    shapeSummary: plan?.shapeSummary || null,
    primaryStrategyPack: primaryPack
      ? {
          type: primaryPack.type || null,
          stage: primaryPack.stage || null,
          rootNoteId: primaryPack.rootNoteId || null,
          executionDisposition: primaryPack.executionDisposition || null,
          deferredVisualCount:
            typeof primaryPack.deferredVisualCount === "number"
              ? primaryPack.deferredVisualCount
              : null,
          deferredSemanticCount:
            typeof primaryPack.deferredSemanticCount === "number"
              ? primaryPack.deferredSemanticCount
              : null,
          visibleActionCounts: primaryPack.visibleActionCounts || null,
          summary: primaryPack.summary || null,
          reason: primaryPack.reason || null,
        }
      : null,
  };
}

function formatPlanLines(reportInfo) {
  const plan = reportInfo.report || {};
  const summary = summarizePlanPlan(plan);
  const lines = [
    `Latest plan report: ${reportInfo.file}`,
    `Path: ${reportInfo.fullPath}`,
    `Objective: ${summary.objective || "(unknown)"}`,
    `Stage: ${summary.stage}`,
    `Mode: ${summary.mode}`,
    `Origin: ${summary.origin || "(none)"}`,
    `Actions: ${summary.actionCount}`,
    `Strategy packs: ${summary.strategyPackCount}`,
    `Warnings: ${summary.warningCount}`,
    `Unsupported: ${summary.unsupportedCount}`,
  ];

  if (Object.keys(summary.actionDispositionCounts || {}).length) {
    lines.push("", "Execution tiers:");
    if (summary.actionDispositionCounts.safe_auto) {
      lines.push(`- safe_auto: ${summary.actionDispositionCounts.safe_auto}`);
    }
    if (summary.actionDispositionCounts.review_required) {
      lines.push(`- review_required: ${summary.actionDispositionCounts.review_required}`);
    }
    if (summary.actionDispositionCounts.suggest_only) {
      lines.push(`- suggest_only: ${summary.actionDispositionCounts.suggest_only}`);
    }
  }

  if (Object.keys(summary.actionPhaseCounts || {}).length) {
    lines.push("", "Pipeline phases:");
    if (summary.actionPhaseCounts.cleanup) {
      lines.push(`- cleanup: ${summary.actionPhaseCounts.cleanup}`);
    }
    if (summary.actionPhaseCounts.normalize) {
      lines.push(`- normalize: ${summary.actionPhaseCounts.normalize}`);
    }
    if (summary.actionPhaseCounts.enrich) {
      lines.push(`- enrich: ${summary.actionPhaseCounts.enrich}`);
    }
  }

  if (summary.shapeSummary && summary.shapeSummary.captured) {
    lines.push("", "Mind-map shape:");
    lines.push(
      `- visible_nodes: ${summary.shapeSummary.visibleNodeCount || 0}/${summary.shapeSummary.branchNodeCount || 0}`
    );
    lines.push(`- collapsed_branches: ${summary.shapeSummary.collapsedBranchCount || 0}`);
    lines.push(`- hidden_nodes: ${summary.shapeSummary.hiddenNodeCount || 0}`);
    lines.push(
      `- canvas_span: ${summary.shapeSummary.horizontalSpan ?? "?"} x ${summary.shapeSummary.verticalSpan ?? "?"}`
    );
  }

  if (plan.actions && plan.actions.length) {
    lines.push("", "Top actions:");
    plan.actions.slice(0, 10).forEach((action) => {
      const colorExtra =
        action.type === "set_color_index"
          ? ` | role=${action.visualRole || "unknown"} | salience=${typeof action.visualSalience === "number" ? action.visualSalience : "unknown"} | target_color=${typeof action.colorIndex === "number" ? action.colorIndex : "unknown"}`
          : "";
      const overviewExtra =
        action.type === "rewrite_excerpt" && action.meta?.source === "branch_structure_digest"
          ? ` | overview=${compactText(action.text).slice(0, 80)}`
          : "";
      lines.push(
        `- ${action.type} -> ${action.noteId} | phase=${action.phase || "unknown"} | disposition=${action.execution?.disposition || "unknown"} | source=${action.meta?.source || "unknown"} | confidence=${typeof action.meta?.confidence === "number" ? action.meta.confidence : "unknown"}${colorExtra}${overviewExtra}`
      );
    });
  }

  if (plan.strategyPacks && plan.strategyPacks.length) {
    lines.push("", "Strategy packs:");
    plan.strategyPacks.slice(0, 5).forEach((pack) => {
      const counts = pack.visibleActionCounts || {};
      lines.push(
        `- ${pack.type} -> ${pack.rootNoteId || "n/a"} | stage=${pack.stage || "unknown"} | disposition=${pack.executionDisposition || "unknown"} | colors=${counts.set_color_index || 0} | groups=${counts.organize_branch_groups || 0} | overviews=${counts.rewrite_excerpt || 0} | deferred_semantic=${pack.deferredSemanticCount || 0} | deferred_visual=${pack.deferredVisualCount || 0} | ${pack.summary || "no_summary"}`
      );
    });
  }

  if (plan.unsupportedActions && plan.unsupportedActions.length) {
    lines.push("", "Top unsupported suggestions:");
    plan.unsupportedActions.slice(0, 10).forEach((item) => {
      lines.push(
        `- ${item.type} -> ${item.noteId} | source=${item.meta?.source || "unknown"} | confidence=${typeof item.meta?.confidence === "number" ? item.meta.confidence : "unknown"} | ${item.summary || item.reason || "no_summary"}`
      );
    });
  }

  if (plan.notes && plan.notes.length) {
    lines.push("", "Top notes:");
    plan.notes.slice(0, 10).forEach((item) => {
      lines.push(`- ${item.type} -> ${item.noteId || "n/a"} | ${item.message || "no_message"}`);
    });
  }

  return lines.join("\n");
}

function planArtifactEnvelope(kind, info) {
  if (!info) {
    return {
      ok: false,
      kind,
      error: "not_found",
    };
  }

  const report = info.report || info.json || {};
  const summary = summarizePlanPlan(report);
  return {
    ok: true,
    kind,
    artifact: info.artifact || {
      file: info.file || null,
      fullPath: info.fullPath || null,
      mtimeMs: info.mtimeMs || null,
    },
    derived: !!info.derived,
    source: info.source || "stored_report",
    report,
    summary,
    replay: kind === "followup" ? info.replay || null : null,
  };
}

function latestPlanReport() {
  const info = latestReport("plan");
  if (!info) return null;
  return {
    file: info.file,
    fullPath: info.fullPath,
    mtimeMs: info.mtimeMs,
    report: info.json,
  };
}

function latestApplyReport() {
  const info = latestReport("apply");
  if (!info) return null;
  return {
    file: info.file,
    fullPath: info.fullPath,
    mtimeMs: info.mtimeMs,
    report: info.json,
  };
}

function buildFollowupReplaySummary() {
  const latestApply = latestApplyReport();
  if (!latestApply) return null;

  const nodes = normalizeAfterBranchNotes(latestApply.report);
  if (!nodes.length) return null;

  const replayPlan = planResponse({
    objective: latestApply.report?.command || latestApply.report?.objective || "整理当前选中分支",
    origin: latestApply.report?.origin || "",
    stage: "followup",
    dryRun: true,
    nodes,
  }).plan;

  return {
    sourceApply: {
      file: latestApply.file,
      fullPath: latestApply.fullPath,
      mtimeMs: latestApply.mtimeMs,
    },
    summary: summarizePlanPlan(replayPlan),
  };
}

function latestFollowupReport() {
  const info = latestFollowupWithFallback();
  if (!info) return null;
  const replay = info.derived
    ? {
        sourceApply: info.artifact
          ? {
              file: info.artifact.file,
              fullPath: info.artifact.fullPath,
              mtimeMs: info.artifact.mtimeMs,
            }
          : null,
        summary: summarizePlanPlan(info.report || info.payload || {}),
      }
    : buildFollowupReplaySummary();
  return {
    file: info.artifact ? info.artifact.file : null,
    fullPath: info.artifact ? info.artifact.fullPath : null,
    mtimeMs: info.artifact ? info.artifact.mtimeMs : null,
    report: info.payload,
    derived: !!info.derived,
    source: info.source || "stored_followup_artifact",
    replay,
  };
}

function formatApplyLines(reportInfo) {
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

function applyArtifactEnvelope(info) {
  if (!info) {
    return {
      ok: false,
      kind: "apply",
      error: "not_found",
    };
  }

  const report = info.report || {};
  const results = Array.isArray(report.results) ? report.results : [];
  const helperBlockedActions = Array.isArray(report.helperBlockedActions)
    ? report.helperBlockedActions
    : [];
  return {
    ok: true,
    kind: "apply",
    artifact: {
      file: info.file,
      fullPath: info.fullPath,
      mtimeMs: info.mtimeMs,
    },
    report,
    summary: {
      command: report.command || report.objective || null,
      mode: report.origin === "native_ai_breakdown" ? "breakdown" : "primary",
      origin: report.origin || "",
      appliedAt: report.appliedAt || null,
      actionCount: report.actionCount || 0,
      appliedCount: results.filter((item) => item.ok).length,
      skippedCount: results.filter((item) => item.skipped).length,
      errorCount: results.filter((item) => item.error).length,
      helperBlockedCount: helperBlockedActions.length,
      changedNoteCount: report.branchDiff?.changedNoteCount || 0,
    },
  };
}

function latestDiagnosticEnvelope() {
  const info = latestDiagnosticWithFallback();
  if (!info) return null;

  return {
    ok: true,
    kind: "diagnostic",
    artifact: info.artifact
      ? {
          file: info.artifact.file,
          fullPath: info.artifact.fullPath,
          mtimeMs: info.artifact.mtimeMs,
        }
      : null,
    derived: !!info.derived,
    diagnostic: info.diagnostic,
    status: info.status || null,
  };
}

function formatDiagnosticLines(info) {
  const diagnostic = info.diagnostic || {};
  if (diagnostic.kind === "runtime_snapshot") {
    const focus = diagnostic.focus || {};
    const note = focus.note || {};
    const lines = [
      `Latest diagnostic: ${info.file || "(derived)"}`,
      `Path: ${info.fullPath || "(derived from bridge artifacts)"}`,
      `Kind: runtime_snapshot`,
      `Origin: ${diagnostic.origin || "unknown"}`,
      `Captured: ${diagnostic.capturedAt || "unknown"}`,
      `Focus source: ${focus.source || "none"}`,
      `Focus note: ${note.noteId || "(none)"}`,
      `HUD wait support: ${diagnostic.app?.hasWaitHUDOnView ? 1 : 0}`,
      `HUD stop support: ${diagnostic.app?.hasStopWaitHUDOnView ? 1 : 0}`,
      `Global detached create: ${diagnostic.globals?.hasNoteCreateWithTitleNotebookDocument ? 1 : 0}`,
      `Comment removal: ${note.supportsCommentRemoval ? 1 : 0}`,
      `Branch organization: ${note.supportsBranchOrganization ? 1 : 0}`,
      `Create grouping: ${note.canCreateGroupingChild ? 1 : 0}`,
      `Move child: ${note.canMoveExistingChild ? 1 : 0}`,
      `Detached create ready: ${note.detachedCreateContextReady ? 1 : 0}`,
    ];
    if (note.detachedCreateContextSource) {
      lines.push(`Detached source: ${note.detachedCreateContextSource}`);
    }
    return lines.join("\n");
  }

  const metrics = diagnostic.metrics || {};
  const events = Array.isArray(diagnostic.events) ? diagnostic.events : [];
  const eventCounts = {};

  for (const event of events) {
    const key = event?.type || "unknown";
    eventCounts[key] = (eventCounts[key] || 0) + 1;
  }

  const lines = [
    `Latest diagnostic: ${info.file || "(derived)"}`,
    `Path: ${info.fullPath || "(derived from bridge artifacts)"}`,
    `Derived: ${info.derived ? 1 : 0}`,
    `Status: ${diagnostic.status || "unknown"}`,
    `Session: ${diagnostic.sessionId || diagnostic.requestId || "unknown"}`,
    `Root note: ${diagnostic.rootNoteId || "(unknown)"}`,
    `Notebook: ${diagnostic.notebookId || "(unknown)"}`,
    `Started: ${diagnostic.startedAt || diagnostic.generatedAt || "(unknown)"}`,
    `Updated: ${diagnostic.updatedAt || diagnostic.generatedAt || "(unknown)"}`,
    `Branch nodes: ${typeof metrics.branchNodeCount === "number" ? metrics.branchNodeCount : 0}`,
    `Planned actions: ${typeof metrics.plannedActionCount === "number" ? metrics.plannedActionCount : 0}`,
    `Apply actions: ${typeof metrics.applyActionCount === "number" ? metrics.applyActionCount : 0}`,
    `Applied: ${typeof metrics.appliedCount === "number" ? metrics.appliedCount : 0}`,
    `Helper blocked: ${typeof metrics.helperBlockedCount === "number" ? metrics.helperBlockedCount : 0}`,
    `Changed notes: ${typeof metrics.changedNoteCount === "number" ? metrics.changedNoteCount : 0}`,
    `Follow-up actions: ${
      typeof metrics.followupPlannedActionCount === "number"
        ? metrics.followupPlannedActionCount
        : 0
    }`,
    `Follow-up applied: ${
      typeof metrics.followupAppliedCount === "number" ? metrics.followupAppliedCount : 0
    }`,
    `Follow-up deferred: ${
      typeof metrics.followupDeferredActionCount === "number"
        ? metrics.followupDeferredActionCount
        : 0
    }`,
  ];

  if (diagnostic.lastError) {
    lines.push(
      `Last error: ${diagnostic.lastError.message || JSON.stringify(diagnostic.lastError)}`
    );
  }

  const warnings = Array.isArray(diagnostic.warnings) ? diagnostic.warnings : [];
  if (warnings.length) {
    lines.push("", "Warnings:");
    for (const warning of warnings) {
      lines.push(`- ${warning}`);
    }
  }

  const eventKeys = Object.keys(eventCounts);
  if (eventKeys.length) {
    lines.push("", "Events:");
    for (const key of eventKeys) {
      lines.push(`- ${key}: ${eventCounts[key]}`);
    }
  }

  if (events.length) {
    lines.push("", "Recent:");
    for (const event of events.slice(-10)) {
      lines.push(`- ${event.at || "(unknown)"} | ${event.type || "unknown"}`);
    }
  }

  if (diagnostic.latestPlanArtifact) {
    lines.push(
      "",
      `Latest plan artifact: ${
        diagnostic.latestPlanArtifact.fullPath ||
        diagnostic.latestPlanArtifact.jsonPath ||
        diagnostic.latestPlanArtifact.jsonName ||
        "unknown"
      }`
    );
  }
  if (diagnostic.latestApplyArtifact) {
    lines.push(
      `Latest apply artifact: ${
        diagnostic.latestApplyArtifact.fullPath ||
        diagnostic.latestApplyArtifact.jsonPath ||
        diagnostic.latestApplyArtifact.jsonName ||
        "unknown"
      }`
    );
  }
  if (diagnostic.latestFollowupPlanArtifact) {
    lines.push(
      `Latest follow-up artifact: ${
        diagnostic.latestFollowupPlanArtifact.fullPath ||
        diagnostic.latestFollowupPlanArtifact.jsonPath ||
        diagnostic.latestFollowupPlanArtifact.jsonName ||
        "unknown"
      }`
    );
  }
  if (diagnostic.latestFollowupApplyArtifact) {
    lines.push(
      `Latest follow-up apply artifact: ${
        diagnostic.latestFollowupApplyArtifact.fullPath ||
        diagnostic.latestFollowupApplyArtifact.jsonPath ||
        diagnostic.latestFollowupApplyArtifact.jsonName ||
        "unknown"
      }`
    );
  }
  if (diagnostic.latestRequestArtifact) {
    lines.push(`Latest request artifact: ${diagnostic.latestRequestArtifact.fullPath || "unknown"}`);
  }
  if (diagnostic.latestResponseArtifact) {
    lines.push(
      `Latest response artifact: ${diagnostic.latestResponseArtifact.fullPath || "unknown"}`
    );
  }

  return lines.join("\n");
}

function summarizeReportEnvelope(info, kind) {
  if (!info) {
    return {
      ok: false,
      kind,
      error: "not_found",
    };
  }

  const report = info.report || {};
  const summary = summarizePlanPlan(report);
  return {
    ok: true,
    kind,
    artifact: info.artifact || {
      file: info.file || null,
      fullPath: info.fullPath || null,
      mtimeMs: info.mtimeMs || null,
    },
    derived: !!info.derived,
    source: info.source || "stored_report",
    report,
    summary,
    replay: kind === "followup" ? info.replay || null : null,
  };
}

function selectLatestRequestFiles(options) {
  const files = jsonFileList(REQUESTS_DIR, null);
  if (options.requestPath) {
    return [{ file: path.basename(options.requestPath), fullPath: options.requestPath }];
  }
  if (options.all) return files;
  if (!files.length) return [];
  return [files[files.length - 1]];
}

function loadCachedResponse(requestFileName) {
  const responsePath = path.join(RESPONSES_DIR, requestFileName);
  if (!fs.existsSync(responsePath)) return null;
  return readJsonFile(responsePath);
}

function summarizeReplayComparison(generated, cached) {
  if (!cached) {
    return {
      matches: false,
      reason: "missing_cached_response",
      generated: {
        actions: Array.isArray(generated?.plan?.actions) ? generated.plan.actions.length : 0,
        notes: Array.isArray(generated?.plan?.notes) ? generated.plan.notes.length : 0,
        unsupportedActions: Array.isArray(generated?.plan?.unsupportedActions)
          ? generated.plan.unsupportedActions.length
          : 0,
      },
      cached: null,
    };
  }

  const generatedText = JSON.stringify(generated);
  const cachedText = JSON.stringify(cached);
  return {
    matches: generatedText === cachedText,
    reason: generatedText === cachedText ? "exact_match" : "response_changed",
    generated: {
      actions: Array.isArray(generated?.plan?.actions) ? generated.plan.actions.length : 0,
      notes: Array.isArray(generated?.plan?.notes) ? generated.plan.notes.length : 0,
      unsupportedActions: Array.isArray(generated?.plan?.unsupportedActions)
        ? generated.plan.unsupportedActions.length
        : 0,
    },
    cached: {
      actions: Array.isArray(cached?.plan?.actions) ? cached.plan.actions.length : 0,
      notes: Array.isArray(cached?.plan?.notes) ? cached.plan.notes.length : 0,
      unsupportedActions: Array.isArray(cached?.plan?.unsupportedActions)
        ? cached.plan.unsupportedActions.length
        : 0,
    },
  };
}

function replayRequest(requestInfo) {
  const payload = readJsonFile(requestInfo.fullPath);
  const generated = planResponse(payload);
  const cached = loadCachedResponse(requestInfo.file);
  const comparison = summarizeReplayComparison(generated, cached);

  return {
    request: requestInfo.file,
    requestPath: requestInfo.fullPath,
    payload,
    generated,
    cached,
    comparison,
  };
}

function formatReplayLines(result) {
  const lines = [
    `Request: ${result.request}`,
    `Path: ${result.requestPath}`,
    `Status: ${result.comparison.matches ? "MATCH" : "DIFF"}`,
    `Reason: ${result.comparison.reason}`,
    `Generated: actions=${result.comparison.generated.actions}, notes=${result.comparison.generated.notes}, unsupported=${result.comparison.generated.unsupportedActions}`,
  ];

  if (result.comparison.cached) {
    lines.push(
      `Cached: actions=${result.comparison.cached.actions}, notes=${result.comparison.cached.notes}, unsupported=${result.comparison.cached.unsupportedActions}`
    );
  }

  return lines.join("\n");
}

function formatReplayCompact(result) {
  const cached = result.comparison.cached
    ? ` cached=actions:${result.comparison.cached.actions},notes:${result.comparison.cached.notes},unsupported:${result.comparison.cached.unsupportedActions}`
    : "";
  return [
    `request=${result.request}`,
    `status=${result.comparison.matches ? "MATCH" : "DIFF"}`,
    `reason=${result.comparison.reason}`,
    `generated=actions:${result.comparison.generated.actions},notes:${result.comparison.generated.notes},unsupported:${result.comparison.generated.unsupportedActions}`,
    cached,
  ]
    .filter(Boolean)
    .join(" ");
}

function normalizeAfterBranchNotes(report) {
  const notes =
    report && report.afterBranch && Array.isArray(report.afterBranch.notes)
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

async function handleStatus(options) {
  const statusInfo = await readStatus(options.baseUrl || DEFAULT_BASE_URL);
  const payload = buildStatusReport(statusInfo, options.obsidianVaultPath || DEFAULT_OBSIDIAN_VAULT_PATH);
  if (options.json) {
    outputJson(payload);
    return;
  }
  if (options.compact) {
    const followupApplyRequest = payload.latestFollowupApply
      ? payload.latestFollowupApply.requestId || "unknown"
      : "none";
    const supervisorState = payload.supervisorState || null;
    outputText(
      `bridge=${payload.service || "unknown"} source=${payload.source || statusInfo.source} queue=${payload.queueDepth ?? "?"} latest_plan=${payload.latest?.plan?.requestId || "none"} followup_apply=${payload.latestFollowupApply ? 1 : 0} followup_apply_request=${followupApplyRequest} bridge_supervisor=${supervisorState ? supervisorState.ownership || "unknown" : "none"} bridge_supervisor_pid=${supervisorState && supervisorState.bridgePid ? supervisorState.bridgePid : "none"} breakdown=${payload.breakdownArtifacts ? payload.breakdownArtifacts.status || "unknown" : "unknown"} next=${payload.breakdownNextCommand} obsidian_settings=${payload.obsidianSyncSettings && payload.obsidianSyncSettings.exists ? "present" : "missing"}`
    );
    return;
  }
  outputJson(payload);
}

function buildStatusReport(statusInfo, obsidianVaultPath) {
  const obsidianSyncSettings = summarizeObsidianSyncSettings(
    obsidianVaultPath || DEFAULT_OBSIDIAN_VAULT_PATH
  );
  const breakdownArtifacts =
    (statusInfo.payload &&
      typeof statusInfo.payload === "object" &&
      statusInfo.payload.breakdownArtifacts) ||
    buildBreakdownArtifactAudit();
  const latestFollowupApply =
    (statusInfo.payload && statusInfo.payload.latestFollowupApply) ||
    (statusInfo.payload &&
      statusInfo.payload.latest &&
      statusInfo.payload.latest.followupApply) ||
    null;
  const bridgeLive = statusInfo.source === "live_http";
  const payload = {
    ...(statusInfo.payload && typeof statusInfo.payload === "object" ? statusInfo.payload : {}),
    kind: "status",
    title: "mnaipro status",
    summary: `Bridge ${bridgeLive ? "live" : "offline"}; Breakdown artifacts ${breakdownArtifacts.status}; follow-up apply ${latestFollowupApply ? "present" : "missing"}; Obsidian settings ${obsidianSyncSettings.exists ? "present" : "missing"}.`,
    breakdownArtifacts,
    breakdownNextCommand: breakdownArtifacts.nextCommand || "mnaipro breakdown artifacts --json",
    latestFollowupApply,
    obsidianSyncSettings,
    obsidianVaultPath: obsidianSyncSettings.vaultPath,
  };
  return payload;
}

async function buildDoctorSummary(baseUrl, obsidianVaultPath) {
  const statusInfo = await readStatus(baseUrl || DEFAULT_BASE_URL);
  const bridgePayload = statusInfo.payload || bridgeStatus();
  const latestDiagnostic = latestDiagnosticWithFallback();
  const obsidianSyncSettings = summarizeObsidianSyncSettings(obsidianVaultPath);
  const breakdownArtifacts = bridgePayload.breakdownArtifacts || buildBreakdownArtifactAudit();
  const latestFollowupApply = bridgePayload.latestFollowupApply || bridgePayload.latest?.followupApply || null;
  const supervisorState = bridgePayload.supervisorState || null;
  const label = `gui/${process.getuid()}/com.mnaipro.bridge-supervisor`;
  const launchctlInfo = launchctlPrint(label);
  const launchAgent = {
    plistExists: fs.existsSync(
      path.join(os.homedir(), "Library", "LaunchAgents", "com.mnaipro.bridge-supervisor.plist")
    ),
    plistPath: path.join(os.homedir(), "Library", "LaunchAgents", "com.mnaipro.bridge-supervisor.plist"),
    summary: summarizeLaunchctl(launchctlInfo),
  };
  const supervisorStateDir = path.join(ROOT_DIR, "tmp", "bridge-supervisor");
  const installedSupervisorDir = path.join(
    os.homedir(),
    "Library",
    "Application Support",
    "MNAIProBridge",
    "launchd",
    "current",
    "tmp",
    "bridge-supervisor"
  );
  const installedLogsDir = path.join(
    os.homedir(),
    "Library",
    "Application Support",
    "MNAIProBridge",
    "launchd",
    "current",
    "logs"
  );
  const supervisor = {
    pidFile: safeRead(path.join(supervisorStateDir, "bridge.pid")).trim() || null,
    installedPidFile:
      safeRead(path.join(installedSupervisorDir, "bridge.pid")).trim() || null,
    recentLog: tailLines(path.join(supervisorStateDir, "supervisor.log"), 20),
    recentBridgeLog: tailLines(path.join(supervisorStateDir, "bridge.log"), 20),
    installedRecentLog: tailLines(path.join(installedSupervisorDir, "supervisor.log"), 20),
    installedRecentBridgeLog: tailLines(path.join(installedSupervisorDir, "bridge.log"), 20),
    launchdStdout: tailLines(path.join(installedLogsDir, "launchd.stdout.log"), 20),
    launchdStderr: tailLines(path.join(installedLogsDir, "launchd.stderr.log"), 20),
  };
  const bridgeReachable = statusInfo.ok && statusInfo.source === "live_http";
  const checks = {
    bridgeReachable,
    fallbackAvailable: !!bridgePayload,
    launchAgentPlistExists: launchAgent.plistExists,
    diagnosticAvailable: !!latestDiagnostic,
    supervisorPidPresent: !!(supervisor.pidFile || supervisor.installedPidFile),
  };
  const missing = [];
  if (!checks.bridgeReachable) missing.push("bridge_unreachable");
  if (!checks.launchAgentPlistExists) missing.push("launch_agent_missing");
  if (!checks.diagnosticAvailable) missing.push("diagnostic_missing");
  if (!checks.supervisorPidPresent) missing.push("supervisor_pid_missing");

  return {
    ok: true,
    kind: "doctor",
    title: "mnaipro doctor",
    summary: `Bridge ${bridgeReachable ? "reachable" : "offline"}; Breakdown artifacts ${breakdownArtifacts.status}; follow-up apply ${latestFollowupApply ? "present" : "missing"}; Obsidian settings ${obsidianSyncSettings.exists ? "present" : "missing"}.`,
    source: statusInfo.source,
    bridgeOffline: !bridgeReachable,
    bridgeOfflineReason: bridgeReachable ? null : bridgePayload.bridgeOfflineReason || null,
    bridgeStatus: bridgePayload,
    breakdownArtifacts,
    breakdownNextCommand: breakdownArtifacts.nextCommand || "mnaipro breakdown artifacts --json",
    obsidianSyncSettings,
    supervisorState,
    latestFollowupApply,
    statusHint: inferBridgeStatusHint({
      checks,
      launchAgent,
      supervisor,
    }),
    latestDiagnostic: latestDiagnostic
      ? {
          derived: !!latestDiagnostic.derived,
          file: latestDiagnostic.artifact ? latestDiagnostic.artifact.file : null,
          fullPath: latestDiagnostic.artifact ? latestDiagnostic.artifact.fullPath : null,
          status:
            latestDiagnostic.diagnostic &&
            (latestDiagnostic.diagnostic.status ||
              latestDiagnostic.diagnostic.origin ||
              latestDiagnostic.diagnostic.kind ||
              null),
          requestId:
            latestDiagnostic.diagnostic &&
            typeof latestDiagnostic.diagnostic.requestId === "string"
              ? latestDiagnostic.diagnostic.requestId
              : null,
          warnings: Array.isArray(latestDiagnostic.diagnostic?.warnings)
            ? latestDiagnostic.diagnostic.warnings
            : [],
        }
      : null,
    launchAgent,
    supervisor,
    checks,
    missing,
  };
}

function buildOverviewSurfaces(statusReport, doctorReport, capabilitiesReport) {
  const breakdownStatus = statusReport.breakdownArtifacts ? statusReport.breakdownArtifacts.status || "unknown" : "unknown";
  const followupApply = statusReport.latestFollowupApply || null;
  const obsidianSettings = statusReport.obsidianSyncSettings || null;
  const surfaces = [
    {
      key: "status",
      label: "Bridge status",
      present: true,
      summary: statusReport.summary || "Bridge status is unavailable.",
      evidence: [
        `source:${statusReport.source || "unknown"}`,
        `breakdown:${breakdownStatus}`,
        `followup_apply:${followupApply ? "present" : "missing"}`,
      ],
      nextCommand: "mnaipro status --json",
    },
    {
      key: "doctor",
      label: "Bridge doctor",
      present: true,
      summary: doctorReport.summary || "Bridge doctor is unavailable.",
      evidence: [
        `source:${doctorReport.source || "unknown"}`,
        `warnings:${Array.isArray(doctorReport.warnings) ? doctorReport.warnings.length : 0}`,
        `missing:${Array.isArray(doctorReport.missing) ? doctorReport.missing.length : 0}`,
      ],
      nextCommand: "mnaipro doctor --json",
    },
    {
      key: "capabilities",
      label: "Command surface",
      present: true,
      summary: capabilitiesReport.summary || "Command surface is unavailable.",
      evidence: [
        `commands:${capabilitiesReport.commandCount || 0}`,
        `groups:${capabilitiesReport.groupCount || 0}`,
        `top_level:${capabilitiesReport.topLevelCount || 0}`,
      ],
      nextCommand: "mnaipro capabilities --json",
    },
    {
      key: "breakdown",
      label: "Breakdown audit",
      present: true,
      summary:
        breakdownStatus === "complete"
          ? "Breakdown artifacts are complete."
          : `Breakdown artifacts are ${breakdownStatus}.`,
      evidence: [
        `next:${statusReport.breakdownNextCommand || "unknown"}`,
        `status:${breakdownStatus}`,
      ],
      nextCommand: statusReport.breakdownNextCommand || "mnaipro breakdown artifacts --json",
    },
    {
      key: "obsidian_settings",
      label: "Obsidian settings",
      present: true,
      summary: obsidianSettings && obsidianSettings.exists
        ? obsidianSettings.summary || "Obsidian sync settings are visible."
        : "Obsidian sync settings are missing.",
      evidence: [
        obsidianSettings && obsidianSettings.settingsPath
          ? `settings_path:${obsidianSettings.settingsPath}`
          : "settings_path:missing",
      ],
      nextCommand: "mn-obsidian-bridge ob settings export ./ob-settings.snapshot.json --snapshot",
    },
  ];

  return {
    surfaces,
    visibleCount: surfaces.filter((surface) => surface.present).length,
    totalCount: surfaces.length,
    missing: surfaces.filter((surface) => !surface.present).map((surface) => surface.key),
  };
}

async function buildOverviewReport(program, options = {}) {
  const baseUrl = options.baseUrl || DEFAULT_BASE_URL;
  const obsidianVaultPath = options.obsidianVaultPath || DEFAULT_OBSIDIAN_VAULT_PATH;
  const statusInfo = await readStatus(baseUrl);
  const statusReport = buildStatusReport(statusInfo, obsidianVaultPath);
  const doctorReport = await buildDoctorSummary(baseUrl, obsidianVaultPath);
  const capabilitiesReport = buildCapabilitiesReport(program);
  const surfaceState = buildOverviewSurfaces(statusReport, doctorReport, capabilitiesReport);
  const highlightState = {
    bridgeLive: statusReport.source === "live_http",
    bridgeReachable: !doctorReport.bridgeOffline,
    capabilitiesVisible: !!capabilitiesReport,
    breakdownComplete: statusReport.breakdownArtifacts && statusReport.breakdownArtifacts.status === "complete",
    followupApplyVisible: !!statusReport.latestFollowupApply,
    obsidianSettingsVisible: !!(statusReport.obsidianSyncSettings && statusReport.obsidianSyncSettings.exists),
  };
  const warnings = [];
  if (!highlightState.bridgeLive) warnings.push("bridge_offline");
  if (!highlightState.bridgeReachable) warnings.push("doctor_offline");
  if (!highlightState.capabilitiesVisible) warnings.push("capabilities_missing");
  if (!highlightState.breakdownComplete) warnings.push("breakdown_incomplete");
  if (!highlightState.followupApplyVisible) warnings.push("followup_apply_missing");
  if (!highlightState.obsidianSettingsVisible) warnings.push("obsidian_settings_missing");

  const summary = `Agent workflow overview: ${statusReport.summary || "status unavailable"}; ${capabilitiesReport.commandCount} runnable commands across ${capabilitiesReport.groupCount} groups.`;

  const recommendedCommands = [
    "mnaipro doctor --json",
    "mnaipro status --json",
    "mnaipro capabilities --json",
    statusReport.breakdownNextCommand || "mnaipro breakdown artifacts --json",
    "mnaipro followup apply latest --json",
  ];

  return {
    ok: true,
    kind: "overview",
    title: "mnaipro overview",
    summary,
    warnings,
    source: statusReport.source || statusInfo.source || "unknown",
    status: statusReport,
    doctor: doctorReport,
    capabilities: capabilitiesReport,
    surfaces: surfaceState.surfaces,
    surfaceCounts: {
      visible: surfaceState.visibleCount,
      total: surfaceState.totalCount,
      statusVisible: highlightState.bridgeLive ? 1 : 0,
      doctorVisible: highlightState.bridgeReachable ? 1 : 0,
      capabilitiesVisible: 1,
      breakdownVisible: highlightState.breakdownComplete ? 1 : 0,
      followupApplyVisible: highlightState.followupApplyVisible ? 1 : 0,
      obsidianSettingsVisible: highlightState.obsidianSettingsVisible ? 1 : 0,
      commandCount: capabilitiesReport.commandCount || 0,
      groupCount: capabilitiesReport.groupCount || 0,
      topLevelCount: capabilitiesReport.topLevelCount || 0,
    },
    highlights: highlightState,
    recommendedCommands,
    nextCommand: recommendedCommands[0],
    details: {
      status: statusReport,
      doctor: doctorReport,
      capabilities: capabilitiesReport,
    },
  };
}

function formatDoctorLines(report) {
  const lines = [
    `Doctor summary: ${report.summary || "(none)"}`,
    `Bridge source: ${report.source || "unknown"}`,
    `Bridge reachable: ${report.checks.bridgeReachable ? "yes" : "no"}`,
    `Bridge offline: ${report.bridgeOffline ? "yes" : "no"}`,
    `Bridge offline reason: ${report.bridgeOfflineReason || "(none)"}`,
    `LaunchAgent plist: ${report.launchAgent.plistExists ? "present" : "missing"}`,
    `LaunchAgent path: ${report.launchAgent.plistPath}`,
    `Supervisor pid: ${report.checks.supervisorPidPresent ? "present" : "missing"}`,
    `Diagnostic: ${report.checks.diagnosticAvailable ? "present" : "missing"}`,
  ];

  if (report.breakdownArtifacts) {
    lines.push(
      `Breakdown artifacts: ${summarizeBreakdownAuditInline(report.breakdownArtifacts)}`
    );
    if (report.breakdownNextCommand) {
      lines.push(`Breakdown next: ${report.breakdownNextCommand}`);
    }
    if (
      report.breakdownArtifacts.breakdown &&
      report.breakdownArtifacts.breakdown.request &&
      report.breakdownArtifacts.breakdown.request.requestId
    ) {
      lines.push(
        `Latest Breakdown request: ${report.breakdownArtifacts.breakdown.request.requestId}`
      );
    }
    if (Array.isArray(report.breakdownArtifacts.hints) && report.breakdownArtifacts.hints.length) {
      lines.push(`Breakdown hints: ${report.breakdownArtifacts.hints.join("; ")}`);
    }
  }

  if (report.obsidianSyncSettings) {
    lines.push(
      `Obsidian vault: ${report.obsidianSyncSettings.vaultPath || "(missing)"}`,
      `Obsidian settings: ${report.obsidianSyncSettings.summary || "(none)"}`,
      `Obsidian settings path: ${report.obsidianSyncSettings.settingsPath || "(missing)"}`
    );
    if (report.obsidianSyncSettings.missingKeys && report.obsidianSyncSettings.missingKeys.length) {
      lines.push(`Obsidian settings missing: ${report.obsidianSyncSettings.missingKeys.join(", ")}`);
    }
  }

  if (report.latestDiagnostic) {
    lines.push(
      `Latest diagnostic: ${report.latestDiagnostic.file || "(derived)"} | status=${report.latestDiagnostic.status || "unknown"} | requestId=${report.latestDiagnostic.requestId || "unknown"}`
    );
    if (report.latestDiagnostic.warnings.length) {
      lines.push(`Diagnostic warnings: ${report.latestDiagnostic.warnings.join("; ")}`);
    }
  }

  if (report.supervisorState) {
    lines.push(
      `Bridge supervisor: ownership=${report.supervisorState.ownership || "unknown"} | pid=${report.supervisorState.bridgePid || "none"} | updatedAt=${report.supervisorState.updatedAt || "(unknown)"}`
    );
  }

  if (report.latestFollowupApply) {
    lines.push(
      `Latest follow-up apply: ${report.latestFollowupApply.file || "(unknown)"} | requestId=${report.latestFollowupApply.requestId || "unknown"} | actions=${report.latestFollowupApply.summary?.actionCount || 0} | applied=${report.latestFollowupApply.summary?.appliedCount || 0}`
    );
  }

  if (report.missing.length) {
    lines.push(`Missing: ${report.missing.join(", ")}`);
  }

  lines.push("", "Launchctl summary:");
  if (report.launchAgent.summary && Object.keys(report.launchAgent.summary).length) {
    for (const [key, value] of Object.entries(report.launchAgent.summary)) {
      lines.push(`- ${key}: ${value}`);
    }
  } else {
    lines.push("- (no launchctl summary available)");
  }

  return lines.join("\n");
}

function formatOverviewLines(report) {
  const counts = report.surfaceCounts || {};
  const highlights = report.highlights || {};
  const lines = [
    `Overview summary: ${report.summary || "(none)"}`,
    `Visible surfaces: ${counts.visible || 0}/${counts.total || 0}`,
    `Bridge live: ${highlights.bridgeLive ? "yes" : "no"}`,
    `Bridge reachable: ${highlights.bridgeReachable ? "yes" : "no"}`,
    `Breakdown complete: ${highlights.breakdownComplete ? "yes" : "no"}`,
    `Follow-up apply visible: ${highlights.followupApplyVisible ? "yes" : "no"}`,
    `Obsidian settings visible: ${highlights.obsidianSettingsVisible ? "yes" : "no"}`,
    `Command count: ${counts.commandCount || 0}`,
    `Group count: ${counts.groupCount || 0}`,
  ];

  if (Array.isArray(report.surfaces) && report.surfaces.length) {
    lines.push("", "Surfaces:");
    for (const surface of report.surfaces) {
      lines.push(
        `- ${surface.label} | ${surface.present ? "present" : "missing"} | ${surface.summary || "no summary"}`
      );
    }
  }

  if (Array.isArray(report.recommendedCommands) && report.recommendedCommands.length) {
    lines.push("", "Recommended commands:");
    for (const command of report.recommendedCommands) {
      lines.push(`- ${command}`);
    }
  }

  return lines.join("\n");
}

function formatOverviewCompact(report) {
  const counts = report.surfaceCounts || {};
  const highlights = report.highlights || {};
  return [
    `ok=${report.ok ? "yes" : "no"}`,
    `kind=${report.kind || "unknown"}`,
    `visible=${counts.visible || 0}/${counts.total || 0}`,
    `bridge=${highlights.bridgeLive ? "live" : "offline"}`,
    `reachable=${highlights.bridgeReachable ? "yes" : "no"}`,
    `breakdown=${highlights.breakdownComplete ? "complete" : "incomplete"}`,
    `commands=${counts.commandCount || 0}`,
    `groups=${counts.groupCount || 0}`,
    `next=${report.nextCommand || "none"}`,
  ].join(" ");
}

function inferBridgeStatusHint(report) {
  if (!report) return "unknown";
  if (report.checks && report.checks.bridgeReachable) return "healthy";
  if (report.checks && !report.checks.launchAgentPlistExists) return "launch_agent_missing";

  const logs = [
    ...(Array.isArray(report.supervisor?.recentLog) ? report.supervisor.recentLog : []),
    ...(Array.isArray(report.supervisor?.installedRecentLog) ? report.supervisor.installedRecentLog : []),
    ...(Array.isArray(report.supervisor?.launchdStdout) ? report.supervisor.launchdStdout : []),
  ].join("\n");

  if (/MarginNote not detected yet/i.test(logs)) return "waiting_for_marginnote";
  if (/starting bridge process/i.test(logs) && !/mn-agent-bridge listening on/i.test(logs)) {
    return "bridge_starting";
  }
  if (report.checks && report.checks.supervisorPidPresent) {
    return "supervisor_running_bridge_unreachable";
  }
  return "bridge_unreachable";
}

function getBridgeLogPaths() {
  return {
    localStateDir: path.join(ROOT_DIR, "tmp", "bridge-supervisor"),
    installedStateDir: path.join(
      os.homedir(),
      "Library",
      "Application Support",
      "MNAIProBridge",
      "launchd",
      "current",
      "tmp",
      "bridge-supervisor"
    ),
    installedLogsDir: path.join(
      os.homedir(),
      "Library",
      "Application Support",
      "MNAIProBridge",
      "launchd",
      "current",
      "logs"
    ),
  };
}

function collectBridgeLogSections(scope, lineCount) {
  const normalizedScope = ["local", "installed", "both"].includes(scope) ? scope : "both";
  const count = Number.isFinite(Number(lineCount)) ? Math.max(1, Number(lineCount)) : 40;
  const paths = getBridgeLogPaths();
  const sections = [];

  function addSection(label, filePath) {
    const exists = fs.existsSync(filePath);
    const lines = exists ? tailLines(filePath, count) : [];
    sections.push({
      label,
      path: filePath,
      exists,
      lineCount: lines.length,
      lines,
    });
  }

  if (normalizedScope === "local" || normalizedScope === "both") {
    addSection("local supervisor.log", path.join(paths.localStateDir, "supervisor.log"));
    addSection("local bridge.log", path.join(paths.localStateDir, "bridge.log"));
  }

  if (normalizedScope === "installed" || normalizedScope === "both") {
    addSection(
      "installed launchd.stdout.log",
      path.join(paths.installedLogsDir, "launchd.stdout.log")
    );
    addSection(
      "installed launchd.stderr.log",
      path.join(paths.installedLogsDir, "launchd.stderr.log")
    );
    addSection("installed supervisor.log", path.join(paths.installedStateDir, "supervisor.log"));
    addSection("installed bridge.log", path.join(paths.installedStateDir, "bridge.log"));
  }

  return {
    ok: true,
    kind: "bridge_logs",
    scope: normalizedScope,
    lineCount: count,
    sections,
  };
}

function formatBridgeLogSection(section) {
  const header = `${section.label} (${section.exists ? `${section.lineCount} lines` : "missing"})`;
  if (!section.exists || !section.lines.length) {
    return `${header}\n- (empty)`;
  }
  return [header, ...section.lines.map((line) => `- ${line}`)].join("\n");
}

function formatBridgeLogsText(report) {
  const lines = [
    `Bridge logs: scope=${report.scope} lineCount=${report.lineCount}`,
  ];
  for (const section of report.sections || []) {
    lines.push("", formatBridgeLogSection(section));
  }
  return lines.join("\n");
}

function formatBridgeLogsCompact(report) {
  const bits = [`scope=${report.scope}`, `lineCount=${report.lineCount}`];
  for (const section of report.sections || []) {
    bits.push(`${section.label.replace(/\s+/g, "_")}=${section.lineCount}`);
  }
  return bits.join(" ");
}

function formatBridgeLogsSnapshot(report, options = {}) {
  if (options.compact) {
    return formatBridgeLogsCompact(report);
  }
  return formatBridgeLogsText(report);
}

function formatBridgeLogsFollowSnapshot(report, options = {}) {
  const stamp = new Date().toISOString();
  if (options.compact) {
    return `[${stamp}] ${formatBridgeLogsCompact(report)}`;
  }
  return [`[${stamp}] Bridge logs snapshot`, formatBridgeLogsText(report)].join("\n");
}

function bridgeHelpFooter() {
  return [
    "",
    "Bridge command groups:",
    "  Lifecycle:    mnaipro bridge status | doctor | render | reload | logs",
    "  Recovery:     mnaipro bridge doctor -> mnaipro bridge reload -> mnaipro bridge logs",
    "",
    "Bridge log modes:",
    "  One-shot:     mnaipro bridge logs --scope both --lines 40",
    "  Follow:       mnaipro bridge logs --follow --interval 2",
  ].join("\n");
}

function buildCommandSurfaceDocs() {
  return {
    sections: [
      {
        label: "Overview",
        prefix: "mnaipro",
        commands: ["overview"],
        summary: "Top-level workflow evidence map.",
      },
      {
        label: "Bridge ops",
        prefix: "mnaipro bridge",
        commands: ["status", "doctor", "render", "reload", "logs"],
        summary: "Bridge lifecycle commands for deploy, status, and local health checks.",
      },
      {
        label: "Artifacts",
        prefix: "mnaipro",
        commands: [
          "status",
          "doctor",
          "plan latest",
          "followup latest",
          "followup apply latest",
          "report latest",
          "diag latest",
        ],
        summary: "Inspect the latest plan, follow-up, apply, and diagnostic artifacts.",
      },
      {
        label: "Replay",
        prefix: "mnaipro replay",
        commands: ["latest", "after-apply"],
        summary: "Replay cached bridge requests.",
      },
      {
        label: "Breakdown",
        prefix: "mnaipro breakdown",
        commands: ["smoke", "postprocess", "artifacts"],
        summary: "Breakdown-specific helpers.",
      },
      {
        label: "Raw access",
        prefix: "mnaipro request",
        commands: ["get /status"],
        summary: "Raw bridge request passthrough.",
      },
    ],
    discovery: {
      label: "Discovery",
      command: "mnaipro capabilities --json",
      summary: "Inspect the CLI command registry and capability groups.",
    },
    commonFlows: [
      "mnaipro overview --json",
      "mnaipro bridge doctor",
      "mnaipro bridge reload",
      "mnaipro bridge logs --follow --interval 2",
      "mnaipro breakdown smoke --json",
      "mnaipro breakdown smoke --bridge-base-url http://127.0.0.1:8765 --compact",
      "mnaipro breakdown smoke --base-url http://127.0.0.1:8765 --case organized-enough --json",
      "mnaipro --base-url http://127.0.0.1:8765 breakdown smoke --case organized-enough --json",
      "mnaipro breakdown postprocess",
      "mnaipro breakdown artifacts --json",
    ],
  };
}

function formatCommandSurfaceLine(label, body) {
  const spacing = Math.max(1, 13 - String(label || "").length);
  return `  ${label}:${" ".repeat(spacing)}${body}`;
}

function formatCommandSurfaceSection(section) {
  const commands = Array.isArray(section?.commands) ? section.commands.join(" | ") : "";
  return formatCommandSurfaceLine(section.label, `${section.prefix} ${commands}`.trim());
}

function formatCommandSurfaceFooter(surfaceDocs = buildCommandSurfaceDocs()) {
  return [
    "",
    "Command groups:",
    ...surfaceDocs.sections.map(formatCommandSurfaceSection),
    formatCommandSurfaceLine(surfaceDocs.discovery.label, surfaceDocs.discovery.command),
    "",
    "Common flows:",
    ...surfaceDocs.commonFlows.map((flow) => `  ${flow}`),
  ].join("\n");
}

function topLevelHelpFooter() {
  return formatCommandSurfaceFooter();
}

function summarizeCommandOptions(command) {
  return (Array.isArray(command?.options) ? command.options : [])
    .filter((option) => option && option.long !== "--help")
    .map((option) => ({
      flags: option.flags || "",
      long: option.long || null,
      short: option.short || null,
      required: !!option.required,
      optional: !!option.optional,
      description: option.description || "",
      defaultValue:
        Object.prototype.hasOwnProperty.call(option, "defaultValue") &&
        option.defaultValue !== undefined
          ? option.defaultValue
          : null,
    }));
}

function summarizeCommandArguments(command) {
  return (Array.isArray(command?.registeredArguments) ? command.registeredArguments : []).map(
    (argument) => ({
      name: typeof argument?.name === "function" ? argument.name() : argument?._name || "",
      required: !!argument?.required,
      variadic: !!argument?.variadic,
      description: argument?.description || "",
      defaultValue:
        Object.prototype.hasOwnProperty.call(argument || {}, "defaultValue") &&
        argument.defaultValue !== undefined
          ? argument.defaultValue
          : null,
    })
  );
}

function collectLeafCommandPaths(command, parentPath) {
  const childCommands = Array.isArray(command?.commands) ? command.commands : [];
  const paths = [];

  for (const child of childCommands) {
    const childPath = parentPath ? `${parentPath}/${child.name()}` : child.name();
    const descendants = Array.isArray(child?.commands) ? child.commands : [];
    if (descendants.length) {
      paths.push(...collectLeafCommandPaths(child, childPath));
    } else {
      paths.push(childPath);
    }
  }

  return paths;
}

function collectCapabilityRegistry(program) {
  const registry = [];
  const topLevel = [];
  const groups = [];

  function visit(parent, parentPath) {
    const childCommands = Array.isArray(parent?.commands) ? parent.commands : [];

    for (const child of childCommands) {
      const name = child.name();
      const path = parentPath ? `${parentPath}/${name}` : name;
      const descendants = Array.isArray(child?.commands) ? child.commands : [];
      const kind = descendants.length ? "group" : "command";
      const entry = {
        path,
        name,
        kind,
        parentPath: parentPath || null,
        depth: path ? path.split("/").length : 0,
        description: child.description() || "",
        aliases: typeof child.aliases === "function" ? child.aliases() : [],
        options: summarizeCommandOptions(child),
        arguments: summarizeCommandArguments(child),
      };

      registry.push(entry);

      if (!parentPath) {
        topLevel.push(entry);
        if (kind === "group") {
          groups.push({
            path,
            name,
            description: entry.description,
            aliases: entry.aliases,
            commandCount: collectLeafCommandPaths(child, path).length,
            leafPaths: collectLeafCommandPaths(child, path),
          });
        }
      }

      if (kind === "group") {
        visit(child, path);
      }
    }
  }

  visit(program, "");

  return {
    registry,
    topLevel,
    groups,
    topLevelCount: topLevel.length,
    groupCount: groups.length,
    commandCount: registry.filter((entry) => entry.kind === "command").length,
  };
}

function buildCapabilitiesReport(program) {
  const registry = collectCapabilityRegistry(program);
  const surfaceDocs = buildCommandSurfaceDocs();
  return {
    ok: true,
    kind: "capabilities",
    title: "mnaipro capabilities",
    summary: `${registry.commandCount} runnable commands across ${registry.groupCount} command groups.`,
    commandSurface: "plugin_agent_cli",
    commandCount: registry.commandCount,
    groupCount: registry.groupCount,
    topLevelCount: registry.topLevelCount,
    globalOptions: summarizeCommandOptions(program),
    topLevel: registry.topLevel,
    groups: registry.groups,
    registry: registry.registry,
    surfaceDocs,
    recommendedCommands: [
      "mnaipro overview --json",
      "mnaipro capabilities --json",
      "mnaipro status --compact",
      "mnaipro doctor",
      "mnaipro breakdown artifacts --json",
    ],
    warnings: [],
  };
}

function formatCapabilitiesLines(report) {
  const lines = [
    report.title || "mnaipro capabilities",
    `Summary: ${report.summary || "(none)"}`,
    `Top-level entries: ${report.topLevelCount || 0}`,
    `Command groups: ${report.groupCount || 0}`,
    `Runnable commands: ${report.commandCount || 0}`,
  ];

  if (Array.isArray(report.topLevel) && report.topLevel.length) {
    lines.push("", "Top-level:");
    for (const entry of report.topLevel) {
      lines.push(`- ${entry.path} | ${entry.kind} | ${entry.description || "no description"}`);
    }
  }

  if (Array.isArray(report.groups) && report.groups.length) {
    lines.push("", "Groups:");
    for (const group of report.groups) {
      lines.push(
        `- ${group.path} | commands=${group.commandCount || 0} | ${group.description || "no description"}`
      );
    }
  }

  if (Array.isArray(report.registry) && report.registry.length) {
    lines.push("", "Registry:");
    for (const entry of report.registry) {
      lines.push(`- ${entry.path} | ${entry.kind} | ${entry.description || "no description"}`);
    }
  }

  return lines.join("\n");
}

function formatCapabilitiesCompact(report) {
  return [
    `commands=${report.commandCount || 0}`,
    `groups=${report.groupCount || 0}`,
    `topLevel=${report.topLevelCount || 0}`,
    `surface=${report.commandSurface || "unknown"}`,
  ].join(" ");
}

async function handleCapabilities(program, options) {
  const report = buildCapabilitiesReport(program);
  if (options.json) {
    outputJson(report);
    return;
  }
  if (options.compact) {
    outputText(formatCapabilitiesCompact(report));
    return;
  }
  outputText(formatCapabilitiesLines(report));
}

async function handleOverview(program, options) {
  const report = await buildOverviewReport(program, {
    baseUrl: options.baseUrl || DEFAULT_BASE_URL,
    obsidianVaultPath: options.obsidianVaultPath || DEFAULT_OBSIDIAN_VAULT_PATH,
  });
  if (options.json) {
    outputJson(report);
    return;
  }
  if (options.compact) {
    outputText(formatOverviewCompact(report));
    return;
  }
  outputText(formatOverviewLines(report));
}

function collectReportInfo(kind) {
  if (kind === "plan") return latestPlanReport();
  if (kind === "apply") return latestApplyReport();
  if (kind === "followup") return latestFollowupReport();
  if (kind === "diagnostic") return latestDiagnosticEnvelope();
  return null;
}

function formatFollowupLines(reportInfo) {
  const plan = reportInfo.report || {};
  const summary = summarizePlanPlan(plan);
  const lines = [
    `Latest follow-up report: ${reportInfo.file || "(derived)"}`,
    `Path: ${reportInfo.fullPath || "(derived from bridge artifacts)"}`,
    `Derived: ${reportInfo.derived ? 1 : 0}`,
    `Source: ${reportInfo.source || "unknown"}`,
    `Objective: ${summary.objective || "(unknown)"}`,
    `Stage: ${summary.stage}`,
    `Mode: ${summary.mode}`,
    `Origin: ${summary.origin || "(none)"}`,
    `Actions: ${summary.actionCount}`,
    `Strategy packs: ${summary.strategyPackCount}`,
    `Warnings: ${summary.warningCount}`,
    `Unsupported: ${summary.unsupportedCount}`,
  ];

  if (reportInfo.replay && reportInfo.replay.summary) {
    const replaySummary = reportInfo.replay.summary;
    const replayPrimary = replaySummary.primaryStrategyPack || null;
    lines.push("", "Current replay:");
    if (reportInfo.replay.sourceApply) {
      lines.push(`- source apply: ${reportInfo.replay.sourceApply.file || "(unknown)"}`);
    }
    lines.push(`- actions: ${replaySummary.actionCount}`);
    lines.push(`- strategy packs: ${replaySummary.strategyPackCount}`);
    lines.push(`- mode: ${replaySummary.mode}`);
    lines.push(`- origin: ${replaySummary.origin || "(none)"}`);
    if (replayPrimary) {
      lines.push(
        `- primary strategy: ${replayPrimary.type || "unknown"} | disposition=${replayPrimary.executionDisposition || "unknown"} | deferred_semantic=${replayPrimary.deferredSemanticCount ?? 0} | deferred_visual=${replayPrimary.deferredVisualCount ?? 0}`
      );
      if (replayPrimary.summary) {
        lines.push(`- summary: ${replayPrimary.summary}`);
      }
      if (replayPrimary.reason) {
        lines.push(`- reason: ${replayPrimary.reason}`);
      }
    }
    if (summary.strategyPackCount === 0 && replaySummary.strategyPackCount > 0) {
      lines.push(
        "- note: the stored follow-up artifact is older than the current planner replay, so this section shows the latest strategy semantics."
      );
    }
  }

  if (Object.keys(summary.actionDispositionCounts || {}).length) {
    lines.push("", "Execution tiers:");
    if (summary.actionDispositionCounts.safe_auto) {
      lines.push(`- safe_auto: ${summary.actionDispositionCounts.safe_auto}`);
    }
    if (summary.actionDispositionCounts.review_required) {
      lines.push(`- review_required: ${summary.actionDispositionCounts.review_required}`);
    }
    if (summary.actionDispositionCounts.suggest_only) {
      lines.push(`- suggest_only: ${summary.actionDispositionCounts.suggest_only}`);
    }
  }

  if (Object.keys(summary.actionPhaseCounts || {}).length) {
    lines.push("", "Pipeline phases:");
    if (summary.actionPhaseCounts.cleanup) {
      lines.push(`- cleanup: ${summary.actionPhaseCounts.cleanup}`);
    }
    if (summary.actionPhaseCounts.normalize) {
      lines.push(`- normalize: ${summary.actionPhaseCounts.normalize}`);
    }
    if (summary.actionPhaseCounts.enrich) {
      lines.push(`- enrich: ${summary.actionPhaseCounts.enrich}`);
    }
  }

  if (plan.actions && plan.actions.length) {
    const typeCounts = {};
    for (const action of plan.actions) {
      typeCounts[action.type] = (typeCounts[action.type] || 0) + 1;
    }

    lines.push("", "Action types:");
    for (const key of Object.keys(typeCounts).sort((a, b) => typeCounts[b] - typeCounts[a])) {
      lines.push(`- ${key}: ${typeCounts[key]}`);
    }

    lines.push("", "Top actions:");
    plan.actions.slice(0, 12).forEach((action) => {
      const colorExtra =
        action.type === "set_color_index"
          ? ` | role=${action.visualRole || "unknown"} | salience=${typeof action.visualSalience === "number" ? action.visualSalience : "unknown"} | target_color=${typeof action.colorIndex === "number" ? action.colorIndex : "unknown"}`
          : "";
      const overviewExtra =
        action.type === "rewrite_excerpt" && action.meta?.source === "branch_structure_digest"
          ? ` | overview=${compactText(action.text).slice(0, 80)}`
          : "";
      lines.push(
        `- ${action.type} -> ${action.noteId} | phase=${action.phase || "unknown"} | disposition=${action.execution?.disposition || "unknown"} | source=${action.meta?.source || "unknown"} | confidence=${typeof action.meta?.confidence === "number" ? action.meta.confidence : "unknown"}${colorExtra}${overviewExtra}`
      );
    });
  }

  if (plan.strategyPacks && plan.strategyPacks.length) {
    lines.push("", "Strategy packs:");
    plan.strategyPacks.slice(0, 5).forEach((pack) => {
      const counts = pack.visibleActionCounts || {};
      lines.push(
        `- ${pack.type} -> ${pack.rootNoteId || "n/a"} | stage=${pack.stage || "unknown"} | disposition=${pack.executionDisposition || "unknown"} | colors=${counts.set_color_index || 0} | groups=${counts.organize_branch_groups || 0} | overviews=${counts.rewrite_excerpt || 0} | deferred_semantic=${pack.deferredSemanticCount || 0} | deferred_visual=${pack.deferredVisualCount || 0} | ${pack.summary || "no_summary"}`
      );
    });
  }

  return lines.join("\n");
}

function formatRequestGetResponse(responseInfo, options) {
  if (options.json) {
    return responseInfo;
  }
  const lines = [
    `Request: GET ${responseInfo.path}`,
    `URL: ${responseInfo.url}`,
    `Status: ${responseInfo.status}`,
    `Content-Type: ${responseInfo.contentType || "unknown"}`,
  ];
  if (responseInfo.body && typeof responseInfo.body === "object") {
    lines.push(JSON.stringify(responseInfo.body, null, 2));
  } else if (typeof responseInfo.bodyText === "string") {
    lines.push(responseInfo.bodyText);
  }
  return lines.join("\n");
}

async function handleReportCommand(kind, options) {
  const info = collectReportInfo(kind);
  if (!info) {
    const message =
      kind === "diagnostic"
        ? `No diagnostics found in ${DIAGNOSTICS_DIR}`
        : `No ${kind} reports found in ${REPORTS_DIR}`;
    if (options.json) {
      outputJson({ ok: false, kind, error: "not_found", message });
    } else {
      outputText(message);
    }
    return;
  }

  if (kind === "plan") {
    const envelope = summarizeReportEnvelope(info, kind);
    if (options.json) {
      outputJson(envelope);
      return;
    }
    if (options.compact) {
      outputText(
        `plan=${envelope.summary.actionCount} packs=${envelope.summary.strategyPackCount} mode=${envelope.summary.mode} origin=${envelope.summary.origin || "none"}`
      );
      return;
    }
    outputText(formatPlanLines({
      file: info.file,
      fullPath: info.fullPath,
      report: info.report,
    }));
    return;
  }

  if (kind === "followup") {
    const envelope = summarizeReportEnvelope(info, kind);
    if (options.json) {
      outputJson(envelope);
      return;
    }
    if (options.compact) {
      const replay = info.replay && info.replay.summary ? info.replay.summary : null;
      const replayPrimary = replay && replay.primaryStrategyPack ? replay.primaryStrategyPack : null;
      outputText(
        [
          `followup=${envelope.summary.actionCount}`,
          `packs=${envelope.summary.strategyPackCount}`,
          `mode=${envelope.summary.mode}`,
          `origin=${envelope.summary.origin || "none"}`,
          `derived=${info.derived ? 1 : 0}`,
          replay ? `replay=${replay.actionCount}` : null,
          replay ? `replay_packs=${replay.strategyPackCount}` : null,
          replayPrimary ? `replay_primary=${replayPrimary.type || "unknown"}` : null,
        ]
          .filter(Boolean)
          .join(" ")
      );
      return;
    }
    outputText(
      formatFollowupLines({
        file: info.file,
        fullPath: info.fullPath,
        report: info.report,
        derived: !!info.derived,
        source: info.source,
        replay: info.replay || null,
      })
    );
    return;
  }

  if (kind === "apply") {
    const envelope = applyArtifactEnvelope(info);
    if (options.json) {
      outputJson(envelope);
      return;
    }
    if (options.compact) {
      outputText(
        `apply=${envelope.summary.actionCount} applied=${envelope.summary.appliedCount} skipped=${envelope.summary.skippedCount} mode=${envelope.summary.mode} origin=${envelope.summary.origin || "none"}`
      );
      return;
    }
    outputText(formatApplyLines({
      file: info.file,
      fullPath: info.fullPath,
      report: info.report,
    }));
    return;
  }

  if (kind === "diagnostic") {
    const envelope = latestDiagnosticEnvelope();
    if (options.json) {
      outputJson(envelope);
      return;
    }
    if (options.compact) {
      outputText(
        `diagnostic=${envelope.status || "unknown"} derived=${envelope.derived ? 1 : 0} request=${envelope.diagnostic?.requestId || "unknown"}`
      );
      return;
    }
    outputText(
      formatDiagnosticLines({
        file: info.file,
        fullPath: info.fullPath,
        derived: !!info.derived,
        diagnostic: info.diagnostic,
      })
    );
  }
}

async function handleReplayLatest(options) {
  const requestInfos = selectLatestRequestFiles(options);
  if (!requestInfos.length) {
    const message = `No request files found in ${REQUESTS_DIR}`;
    if (options.json) {
      outputJson({ ok: false, kind: "replay", error: "not_found", message });
    } else {
      outputText(message);
    }
    return;
  }

  const results = requestInfos.map(replayRequest);
  const mismatchCount = results.filter((item) => !item.comparison.matches).length;
  const payload = {
    ok: true,
    kind: "replay",
    scope: options.all ? "all" : options.requestPath ? "request" : "latest",
    results,
    mismatchCount,
  };

  if (options.json) {
    outputJson(payload);
    if (mismatchCount > 0) {
      process.exitCode = 1;
    }
    return;
  }

  if (options.compact) {
    results.forEach((result) => {
      outputText(formatReplayCompact(result));
    });
    outputText(`Total: ${results.length}, mismatches: ${mismatchCount}`);
    if (mismatchCount > 0) {
      process.exitCode = 1;
    }
    return;
  }

  results.forEach((result, index) => {
    outputText(formatReplayLines(result));
    if (index < results.length - 1) {
      outputText("---");
    }
  });
  outputText(`Total: ${results.length}, mismatches: ${mismatchCount}`);
  if (mismatchCount > 0) {
    process.exitCode = 1;
  }
}

async function handleReplayAfterApply(options) {
  const applyInfo = latestApplyReport();
  if (!applyInfo) {
    const message = `No apply reports found in ${REPORTS_DIR}`;
    if (options.json) {
      outputJson({ ok: false, kind: "replay_after_apply", error: "not_found", message });
    } else {
      outputText(message);
    }
    return;
  }

  const nodes = normalizeAfterBranchNotes(applyInfo.report);
  if (!nodes.length) {
    const message = `Latest apply report has no afterBranch notes: ${applyInfo.file}`;
    if (options.json) {
      outputJson({ ok: false, kind: "replay_after_apply", error: "no_after_branch", message });
    } else {
      outputText(message);
    }
    return;
  }

  const generated = planResponse({
    objective: applyInfo.report?.command || applyInfo.report?.objective || "整理当前选中分支",
    origin: applyInfo.report?.origin || "",
    stage: "followup",
    dryRun: true,
    nodes,
  });

  const payload = {
    ok: true,
    kind: "replay_after_apply",
    sourceApply: {
      file: applyInfo.file,
      fullPath: applyInfo.fullPath,
      report: applyInfo.report,
    },
    generated,
    summary: summarizePlanPlan(generated.plan),
  };

  if (options.json) {
    outputJson(payload);
    return;
  }

  if (options.compact) {
    outputText(
      `apply=${applyInfo.file} actions=${generated.plan.actions.length} warnings=${generated.plan.notes.length} unsupported=${generated.plan.unsupportedActions.length} origin=${applyInfo.report?.origin || "none"}`
    );
    return;
  }

  const lines = [
    `Latest apply report: ${applyInfo.file}`,
    `Path: ${applyInfo.fullPath}`,
    `Command: ${applyInfo.report?.command || applyInfo.report?.objective || "(unknown)"}`,
    `Mode: ${applyInfo.report?.origin === "native_ai_breakdown" ? "breakdown" : "primary"}`,
    `Origin: ${applyInfo.report?.origin || "(none)"}`,
    `After-apply replay actions: ${generated.plan.actions.length}`,
    `Warnings: ${generated.plan.notes.length}`,
    `Unsupported: ${generated.plan.unsupportedActions.length}`,
  ];
  if (generated.plan.actions.length) {
    lines.push("", "Preview:");
  }
  outputText(lines.join("\n"));
  if (generated.plan.actions.length) {
    generated.plan.actions.slice(0, 12).forEach((action) => {
      outputText(
        `- ${action.type} -> ${action.noteId} | source=${action.meta?.source || "unknown"} | phase=${action.phase || "unknown"}`
      );
    });
  }
}

async function handleRequestGet(pathname, options) {
  const baseUrl = (options.baseUrl || DEFAULT_BASE_URL).replace(/\/+$/, "");
  const cleanPath = pathname.startsWith("/") ? pathname : `/${pathname}`;
  const url = `${baseUrl}${cleanPath}`;
  const response = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json, text/plain;q=0.9, */*;q=0.1",
    },
  });
  const contentType = response.headers.get("content-type") || "";
  const text = await response.text();
  let body = null;
  if (contentType.includes("application/json")) {
    try {
      body = text ? JSON.parse(text) : null;
    } catch (error) {
      body = null;
    }
  }
  const responseInfo = {
    ok: response.ok,
    method: "GET",
    path: cleanPath,
    url,
    status: response.status,
    contentType,
    body: body || null,
    bodyText: body ? null : text,
  };
  if (options.json) {
    outputJson(responseInfo);
  } else {
    outputText(formatRequestGetResponse(responseInfo, options));
  }
  if (!response.ok) {
    process.exitCode = 1;
  }
}

async function handleBreakdownSmoke(argv, options) {
  const args = [];
  if (options.json) args.push("--json");
  if (options.compact) args.push("--compact");
  if (options.caseName) args.push("--case", options.caseName);
  if (options.bridgeBaseUrl) args.push("--bridge-base-url", options.bridgeBaseUrl);
  if (options.help) args.push("--help");
  const result = spawnSync(process.execPath, [BREAKDOWN_SMOKE_SCRIPT, ...args], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.error) {
    process.stderr.write(`${result.error.message || String(result.error)}\n`);
    process.exitCode = 1;
    return;
  }
  if (typeof result.status === "number") {
    process.exitCode = result.status;
  }
}

async function handleBreakdownPostprocess(options) {
  const args = [];
  if (options.inputPath) args.push("--input", options.inputPath);
  if (options.json) args.push("--json");
  if (options.compact) args.push("--compact");
  if (options.liveOnly) args.push("--live-only");
  if (options.help) args.push("--help");
  const result = spawnSync(process.execPath, [BREAKDOWN_POSTPROCESS_SCRIPT, ...args], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.error) {
    process.stderr.write(`${result.error.message || String(result.error)}\n`);
    process.exitCode = 1;
    return;
  }
  if (typeof result.status === "number") {
    process.exitCode = result.status;
  }
}

async function handleBreakdownArtifacts(options) {
  const args = [];
  if (options.json) args.push("--json");
  if (options.compact) args.push("--compact");
  if (options.help) args.push("--help");
  const result = spawnSync(process.execPath, [BREAKDOWN_ARTIFACTS_SCRIPT, ...args], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.error) {
    process.stderr.write(`${result.error.message || String(result.error)}\n`);
    process.exitCode = 1;
    return;
  }
  if (typeof result.status === "number") {
    process.exitCode = result.status;
  }
}

async function handleFollowupApplyLatest(options) {
  const args = [];
  if (options.json) args.push("--json");
  if (options.compact) args.push("--compact");
  if (options.help) args.push("--help");
  const result = spawnSync(process.execPath, [FOLLOWUP_APPLY_SCRIPT, ...args], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.error) {
    process.stderr.write(`${result.error.message || String(result.error)}\n`);
    process.exitCode = 1;
    return;
  }
  if (typeof result.status === "number") {
    process.exitCode = result.status;
  }
}

async function handleBridgeRender(options) {
  const result = runNodeScript(BRIDGE_RENDER_SCRIPT);
  const renderedPath = String(result.stdout || "").trim();
  const payload = {
    ok: !result.error && result.status === 0,
    kind: "bridge_render",
    renderedPath: renderedPath || null,
    statusCode: typeof result.status === "number" ? result.status : null,
    stderr: String(result.stderr || "").trim() || null,
    error: result.error ? result.error.message || String(result.error) : null,
  };

  if (options.json) {
    outputJson(payload);
  } else if (options.compact) {
    outputText(
      `render=${payload.ok ? "ok" : "fail"} path=${payload.renderedPath || "unknown"} status=${payload.statusCode ?? "unknown"}`
    );
  } else {
    outputText(renderedPath || payload.stderr || "bridge render produced no output");
  }

  if (!payload.ok) {
    process.exitCode = payload.statusCode || 1;
  }
}

async function handleBridgeReload(options) {
  const result = runNodeScript(BRIDGE_RELOAD_SCRIPT);
  const parsed = parseMaybeJson(String(result.stdout || "").trim());
  const payload =
    parsed && typeof parsed === "object"
      ? parsed
      : {
          ok: false,
          stdout: String(result.stdout || "").trim() || null,
          stderr: String(result.stderr || "").trim() || null,
        };

  payload.kind = "bridge_reload";
  payload.statusCode = typeof result.status === "number" ? result.status : null;
  if (result.error) {
    payload.error = result.error.message || String(result.error);
  }
  if (payload.stderr === "") {
    payload.stderr = null;
  }

  if (options.json) {
    outputJson(payload);
  } else if (options.compact) {
    outputText(
      `reload=${payload.ok ? "ok" : "fail"} status=${payload.statusCode ?? "unknown"} target=${payload.targetPath || "unknown"} rendered=${payload.renderedPath || "unknown"}`
    );
  } else if (payload.ok) {
    outputText(JSON.stringify(payload, null, 2));
  } else {
    outputText(payload.stderr || payload.stdout || "bridge reload failed");
  }

  if (!payload.ok) {
    process.exitCode = payload.statusCode || 1;
  }
}

async function handleBridgeLogs(options) {
  const scope = options.scope || "both";
  const lineCount = parseNumber(options.lines, 40);
  const follow = !!options.follow;
  const intervalMs = Math.max(250, parseNumber(options.interval, 2) * 1000);
  const hasCyclesOption =
    options.cycles !== undefined && options.cycles !== null && options.cycles !== "";
  const cycles = hasCyclesOption
    ? Math.max(1, parseNumber(options.cycles, 1))
    : follow
      ? Infinity
      : 1;

  if (follow && options.json) {
    outputJson({
      ok: false,
      kind: "bridge_logs",
      error: "json_follow_not_supported",
      message: "Use text or compact output with --follow.",
    });
    process.exitCode = 1;
    return;
  }

  let iteration = 0;
  while (iteration < cycles) {
    const report = collectBridgeLogSections(scope, lineCount);
    if (follow && iteration > 0) {
      outputText("");
    }
    if (follow) {
      if (options.compact) {
        outputText(formatBridgeLogsFollowSnapshot(report, { compact: true }));
      } else {
        outputBlock(formatBridgeLogsFollowSnapshot(report));
      }
    } else if (options.compact) {
      outputText(formatBridgeLogsSnapshot(report, { compact: true }));
    } else {
      outputText(formatBridgeLogsSnapshot(report));
    }

    iteration += 1;
    if (iteration >= cycles) {
      break;
    }
    await sleep(intervalMs);
  }
}

function createProgram() {
  const program = new Command();
  program.name("mnaipro");
  program.description("Local MarginNote agent CLI for bridge status, reports, replay, and smoke checks.");
  program.option("--base-url <url>", "bridge base URL", DEFAULT_BASE_URL);
  program.option(
    "--obsidian-vault-path <path>",
    "Obsidian vault root used for sync settings evidence",
    DEFAULT_OBSIDIAN_VAULT_PATH
  );
  program.option("--json", "emit JSON output");
  program.option("--compact", "emit a compact single-line summary");

  program
    .command("status")
    .description("Inspect the live bridge status.")
    .option("--base-url <url>", "bridge base URL")
    .option(
      "--obsidian-vault-path <path>",
      "Obsidian vault root used for sync settings evidence"
    )
    .action(async (cmd) => {
      await handleStatus({
        baseUrl: cmd.baseUrl || program.opts().baseUrl,
        obsidianVaultPath: cmd.obsidianVaultPath || program.opts().obsidianVaultPath,
        json: !!cmd.json || !!program.opts().json,
        compact: !!cmd.compact || !!program.opts().compact,
      });
    });

  program
    .command("doctor")
    .description("Check bridge reachability, diagnostics, launch agent state, and local fallback health.")
    .option(
      "--obsidian-vault-path <path>",
      "Obsidian vault root used for sync settings evidence"
    )
    .option("--json", "emit JSON output")
    .option("--compact", "emit a compact single-line summary")
    .action(async (cmd) => {
      const report = await buildDoctorSummary(
        program.opts().baseUrl,
        cmd.obsidianVaultPath || program.opts().obsidianVaultPath
      );
      if (cmd.json || program.opts().json) {
        outputJson(report);
        return;
      }
      if (cmd.compact || program.opts().compact) {
        const followupApplyRequest = report.latestFollowupApply
          ? report.latestFollowupApply.requestId || "unknown"
          : "none";
        const supervisorState = report.supervisorState || null;
        outputText(
          `bridge=${report.checks.bridgeReachable ? "live" : "offline"} hint=${report.statusHint || "unknown"} diagnostic=${report.checks.diagnosticAvailable ? "yes" : "no"} launch_agent=${report.launchAgent.plistExists ? "yes" : "no"} followup_apply=${report.latestFollowupApply ? 1 : 0} followup_apply_request=${followupApplyRequest} bridge_supervisor=${supervisorState ? supervisorState.ownership || "unknown" : "none"} bridge_supervisor_pid=${supervisorState && supervisorState.bridgePid ? supervisorState.bridgePid : "none"} breakdown=${report.breakdownArtifacts ? report.breakdownArtifacts.status || "unknown" : "unknown"} next=${report.breakdownNextCommand || "unknown"} obsidian_settings=${report.obsidianSyncSettings && report.obsidianSyncSettings.exists ? "present" : "missing"} missing=${report.missing.length}`
        );
        return;
      }
      outputText(formatDoctorLines(report));
    });

  program
    .command("capabilities")
    .description("Inspect the CLI command registry and capability groups.")
    .option("--json", "emit JSON output")
    .option("--compact", "emit a compact single-line summary")
    .action(async (cmd) => {
      await handleCapabilities(program, {
        json: !!cmd.json || !!program.opts().json,
        compact: !!cmd.compact || !!program.opts().compact,
      });
    });

  program
    .command("overview")
    .description("Render a top-level workflow overview across status, doctor, capabilities, and Breakdown evidence.")
    .option("--base-url <url>", "bridge base URL")
    .option(
      "--obsidian-vault-path <path>",
      "Obsidian vault root used for sync settings evidence"
    )
    .option("--json", "emit JSON output")
    .option("--compact", "emit a compact single-line summary")
    .action(async (cmd) => {
      await handleOverview(program, {
        baseUrl: cmd.baseUrl || program.opts().baseUrl,
        obsidianVaultPath: cmd.obsidianVaultPath || program.opts().obsidianVaultPath,
        json: !!cmd.json || !!program.opts().json,
        compact: !!cmd.compact || !!program.opts().compact,
      });
    });

  const bridge = new Command("bridge").description(
    "Bridge lifecycle commands for deploy, status, and local health checks."
  );
  bridge
    .command("status")
    .description("Inspect the live bridge status.")
    .option("--base-url <url>", "bridge base URL")
    .option(
      "--obsidian-vault-path <path>",
      "Obsidian vault root used for sync settings evidence"
    )
    .action(async (cmd) => {
      await handleStatus({
        baseUrl: cmd.baseUrl || program.opts().baseUrl,
        obsidianVaultPath: cmd.obsidianVaultPath || program.opts().obsidianVaultPath,
        json: !!cmd.json || !!program.opts().json,
        compact: !!cmd.compact || !!program.opts().compact,
      });
    });
  bridge
    .command("doctor")
    .description("Check bridge reachability, diagnostics, launch agent state, and local fallback health.")
    .option(
      "--obsidian-vault-path <path>",
      "Obsidian vault root used for sync settings evidence"
    )
    .option("--json", "emit JSON output")
    .option("--compact", "emit a compact single-line summary")
    .action(async (cmd) => {
      const report = await buildDoctorSummary(
        program.opts().baseUrl,
        cmd.obsidianVaultPath || program.opts().obsidianVaultPath
      );
      if (cmd.json || program.opts().json) {
        outputJson(report);
        return;
      }
      if (cmd.compact || program.opts().compact) {
        const followupApplyRequest = report.latestFollowupApply
          ? report.latestFollowupApply.requestId || "unknown"
          : "none";
        const supervisorState = report.supervisorState || null;
        outputText(
          `bridge=${report.checks.bridgeReachable ? "live" : "offline"} hint=${report.statusHint || "unknown"} diagnostic=${report.checks.diagnosticAvailable ? "yes" : "no"} launch_agent=${report.launchAgent.plistExists ? "yes" : "no"} followup_apply=${report.latestFollowupApply ? 1 : 0} followup_apply_request=${followupApplyRequest} bridge_supervisor=${supervisorState ? supervisorState.ownership || "unknown" : "none"} bridge_supervisor_pid=${supervisorState && supervisorState.bridgePid ? supervisorState.bridgePid : "none"} breakdown=${report.breakdownArtifacts ? report.breakdownArtifacts.status || "unknown" : "unknown"} next=${report.breakdownNextCommand || "unknown"} obsidian_settings=${report.obsidianSyncSettings && report.obsidianSyncSettings.exists ? "present" : "missing"} missing=${report.missing.length}`
        );
        return;
      }
      outputText(formatDoctorLines(report));
    });
  bridge
    .command("render")
    .description("Render the launchd plist for the bridge supervisor.")
    .option("--json", "emit JSON output")
    .option("--compact", "emit a compact single-line summary")
    .action(async (cmd) => {
      await handleBridgeRender({
        json: !!cmd.json || !!program.opts().json,
        compact: !!cmd.compact || !!program.opts().compact,
      });
    });
  bridge
    .command("reload")
    .description("Re-render, reinstall, and restart the launchd-managed bridge supervisor.")
    .option("--json", "emit JSON output")
    .option("--compact", "emit a compact single-line summary")
    .action(async (cmd) => {
      await handleBridgeReload({
        json: !!cmd.json || !!program.opts().json,
        compact: !!cmd.compact || !!program.opts().compact,
      });
    });
  bridge
    .command("logs")
    .description("Show recent bridge and supervisor logs.")
    .option("--scope <scope>", "local, installed, or both", "both")
    .option("--lines <n>", "number of lines to show per file", "40")
    .option("--follow", "keep refreshing the log snapshot until interrupted")
    .option("--interval <seconds>", "refresh interval when following", "2")
    .option("--cycles <n>", "number of refresh cycles for scripted follow runs")
    .option("--json", "emit JSON output")
    .option("--compact", "emit a compact single-line summary")
    .action(async (cmd) => {
      await handleBridgeLogs({
        scope: cmd.scope || "both",
        lines: cmd.lines || 40,
        follow: !!cmd.follow,
        interval: cmd.interval || 2,
        cycles: cmd.cycles || null,
        json: !!cmd.json || !!program.opts().json,
        compact: !!cmd.compact || !!program.opts().compact,
      });
    });
  program.addCommand(bridge);

  const plan = new Command("plan").description("Inspect latest planning artifacts.");
  plan
    .command("latest")
    .description("Inspect the latest plan artifact.")
    .option("--json", "emit JSON output")
    .option("--compact", "emit a compact single-line summary")
    .action(async (cmd) => {
      await handleReportCommand("plan", {
        json: !!cmd.json || !!program.opts().json,
        compact: !!cmd.compact || !!program.opts().compact,
      });
    });
  program.addCommand(plan);

  const followup = new Command("followup").description("Inspect follow-up artifacts.");
  followup
    .command("latest")
    .description("Inspect the latest follow-up artifact.")
    .option("--json", "emit JSON output")
    .option("--compact", "emit a compact single-line summary")
    .action(async (cmd) => {
      await handleReportCommand("followup", {
        json: !!cmd.json || !!program.opts().json,
        compact: !!cmd.compact || !!program.opts().compact,
      });
    });
  const followupApply = followup
    .command("apply")
    .description("Inspect follow-up apply artifacts.");
  followupApply
    .command("latest")
    .description("Inspect the latest follow-up apply artifact.")
    .option("--json", "emit JSON output")
    .option("--compact", "emit a compact single-line summary")
    .action(async (cmd) => {
      await handleFollowupApplyLatest({
        json: !!cmd.json || !!program.opts().json,
        compact: !!cmd.compact || !!program.opts().compact,
        help: !!cmd.help,
      });
    });
  program.addCommand(followup);

  const report = new Command("report").description("Inspect latest apply artifacts.");
  report
    .command("latest")
    .description("Inspect the latest apply artifact.")
    .option("--json", "emit JSON output")
    .option("--compact", "emit a compact single-line summary")
    .action(async (cmd) => {
      await handleReportCommand("apply", {
        json: !!cmd.json || !!program.opts().json,
        compact: !!cmd.compact || !!program.opts().compact,
      });
    });
  program.addCommand(report);

  const diag = new Command("diag").description("Inspect latest diagnostic artifacts.");
  diag
    .command("latest")
    .description("Inspect the latest diagnostic artifact.")
    .option("--json", "emit JSON output")
    .option("--compact", "emit a compact single-line summary")
    .action(async (cmd) => {
      await handleReportCommand("diagnostic", {
        json: !!cmd.json || !!program.opts().json,
        compact: !!cmd.compact || !!program.opts().compact,
      });
    });
  program.addCommand(diag);

  const replay = new Command("replay").description("Replay cached bridge requests.");
  replay
    .command("latest")
    .description("Replay the latest cached request, or all cached requests if requested.")
    .option("--all", "replay all cached requests")
    .option("--request <path>", "replay a specific request file")
    .option("--json", "emit JSON output")
    .option("--compact", "emit a compact single-line summary")
    .action(async (cmd) => {
      await handleReplayLatest({
        all: !!cmd.all,
        requestPath: cmd.request || "",
        json: !!cmd.json || !!program.opts().json,
        compact: !!cmd.compact || !!program.opts().compact,
      });
    });
  replay
    .command("after-apply")
    .description("Replay the follow-up plan derived from the latest primary apply artifact.")
    .option("--json", "emit JSON output")
    .option("--compact", "emit a compact single-line summary")
    .action(async (cmd) => {
      await handleReplayAfterApply({
        json: !!cmd.json || !!program.opts().json,
        compact: !!cmd.compact || !!program.opts().compact,
      });
    });
  program.addCommand(replay);

  const breakdown = new Command("breakdown").description("Breakdown-specific helpers.");
  const breakdownSmoke = breakdown
    .command("smoke")
    .description("Run the existing Breakdown smoke harness (reuses explicit bridge URLs when provided).")
    .option("--case <name>", "case to run: visible, organized-enough, or all")
    .option("--base-url <url>", "bridge base URL to reuse instead of self-hosting")
    .option("--bridge-base-url <url>", "bridge base URL to reuse instead of self-hosting")
    .option("--json", "emit JSON output")
    .option("--compact", "emit a compact single-line summary")
    .action(async (cmd) => {
      const baseUrlSource =
        typeof program.getOptionValueSource === "function"
          ? program.getOptionValueSource("baseUrl")
          : "default";
      const smokeBaseUrl =
        cmd.bridgeBaseUrl ||
        cmd.baseUrl ||
        (baseUrlSource === "cli" ? program.opts().baseUrl || "" : "");
      await handleBreakdownSmoke([], {
        caseName: cmd.case || "",
        bridgeBaseUrl: smokeBaseUrl,
        json: !!cmd.json || !!program.opts().json,
        compact: !!cmd.compact || !!program.opts().compact,
        help: !!cmd.help,
      });
    });
  breakdownSmoke.addHelpText(
    "afterAll",
    [
      "",
      "Notes:",
      "  - Self-hosted mode is still the default when no bridge URL is provided.",
      "  - The smoke also honors `--bridge-base-url` or `--base-url` passed before or after the subcommand.",
    ].join("\n")
  );
  breakdown
    .command("postprocess")
    .alias("inspect")
    .description("Inspect the latest Breakdown postprocess preview.")
    .argument("[inputPath]", "optional branch snapshot or apply report to inspect")
    .option("--input <path>", "inspect a specific branch snapshot or apply report")
    .option("--json", "emit JSON output")
    .option("--compact", "emit a compact single-line summary")
    .option("--live-only", "skip the apply-report proxy fallback and require dedicated Breakdown artifacts")
    .action(async (inputPath, cmd) => {
      await handleBreakdownPostprocess({
        inputPath: cmd.input || inputPath || "",
        json: !!cmd.json || !!program.opts().json,
        compact: !!cmd.compact || !!program.opts().compact,
        liveOnly: !!cmd.liveOnly,
        help: !!cmd.help,
      });
    });
  breakdown
    .command("artifacts")
    .description("Audit the latest Breakdown-specific request/report artifact chain.")
    .option("--json", "emit JSON output")
    .option("--compact", "emit a compact single-line summary")
    .action(async (cmd) => {
      await handleBreakdownArtifacts({
        json: !!cmd.json || !!program.opts().json,
        compact: !!cmd.compact || !!program.opts().compact,
        help: !!cmd.help,
      });
    });
  program.addCommand(breakdown);

  const request = new Command("request").description("Raw bridge request passthrough.");
  request
    .command("get")
    .description("GET a raw bridge path.")
    .argument("<path>", "bridge path, such as /status or /reports/latest?kind=plan")
    .option("--base-url <url>", "bridge base URL")
    .option("--json", "emit JSON output")
    .action(async (pathname, cmd) => {
      await handleRequestGet(pathname, {
        baseUrl: cmd.baseUrl || program.opts().baseUrl,
        json: !!cmd.json || !!program.opts().json,
      });
    });
  program.addCommand(request);

  program.addHelpText("afterAll", ({ command }) =>
    command === program ? topLevelHelpFooter() : ""
  );
  bridge.addHelpText("afterAll", ({ command }) => (command === bridge ? bridgeHelpFooter() : ""));

  return program;
}

async function main(argv = process.argv) {
  const program = createProgram();
  if (!argv || argv.length <= 2) {
    await program.parseAsync(["node", "mnaipro", "--help"], { from: "node" });
    return;
  }
  await program.parseAsync(argv, { from: "node" });
}

if (require.main === module) {
  main().catch((error) => {
    process.stderr.write(`${error && error.stack ? error.stack : String(error)}\n`);
    process.exitCode = 1;
  });
}

module.exports = {
  main,
  createProgram,
  handleStatus,
  buildDoctorSummary,
  handleReportCommand,
  handleReplayLatest,
  handleReplayAfterApply,
  handleRequestGet,
  handleBreakdownSmoke,
  handleBreakdownArtifacts,
  summarizePlanPlan,
  formatPlanLines,
  formatApplyLines,
  formatFollowupLines,
  formatDiagnosticLines,
};
