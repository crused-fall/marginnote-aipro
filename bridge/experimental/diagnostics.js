const { latestDiagnosticWithFallback, DIAGNOSTICS_DIR } = require("../server");
const { buildExperimentalState } = require("./gate");

function summarizeRuntimeSnapshot(info) {
  const diagnostic = info.diagnostic || {};
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
  return {
    kind: "runtime_snapshot",
    origin: diagnostic.origin || null,
    capturedAt: diagnostic.capturedAt || null,
    focusSource: focus.source || null,
    focusNoteId: note.noteId || null,
    app: diagnostic.app || null,
    globals: diagnostic.globals || null,
    controllers: diagnostic.controllers || null,
    summary: lines.join("\n"),
  };
}

function summarizeDerivedDiagnostic(info) {
  const diagnostic = info.diagnostic || {};
  const metrics = diagnostic.metrics || {};
  const warnings = Array.isArray(diagnostic.warnings) ? diagnostic.warnings : [];
  const lines = [
    `Latest diagnostic: ${info.file || "(derived)"}`,
    `Path: ${info.fullPath || "(derived from bridge artifacts)"}`,
    `Kind: derived_diagnostic`,
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
      typeof metrics.followupAppliedCount === "number"
        ? metrics.followupAppliedCount
        : 0
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

  if (warnings.length) {
    lines.push("", "Warnings:");
    for (const warning of warnings) {
      lines.push(`- ${warning}`);
    }
  }

  return {
    kind: "derived_diagnostic",
    status: diagnostic.status || null,
    sessionId: diagnostic.sessionId || diagnostic.requestId || null,
    rootNoteId: diagnostic.rootNoteId || null,
    notebookId: diagnostic.notebookId || null,
    metrics,
    warnings,
    summary: lines.join("\n"),
  };
}

function buildExperimentalDiagnosticsReport(env = process.env) {
  const gate = buildExperimentalState(env);
  const latest = latestDiagnosticWithFallback();
  const latestDiagnostic = latest
    ? latest.diagnostic?.kind === "runtime_snapshot"
      ? summarizeRuntimeSnapshot(latest)
      : summarizeDerivedDiagnostic(latest)
    : null;

  const warnings = [];
  if (!gate.enabled) warnings.push("experimental_disabled");
  if (!latest) warnings.push("diagnostic_missing");

  const summary = latestDiagnostic
    ? latestDiagnostic.kind === "runtime_snapshot"
      ? "Latest runtime snapshot is available for experimental inspection."
      : "Latest derived diagnostic is available for experimental inspection."
    : `No diagnostic artifacts found in ${DIAGNOSTICS_DIR}.`;

  return {
    ok: true,
    kind: "experimental_diagnostics",
    gate,
    latestDiagnostic,
    warnings,
    summary,
    nextCommand: latest ? "mnaipro diag latest" : "mnaipro doctor --json",
  };
}

function formatExperimentalDiagnosticsLines(report) {
  const lines = [
    "Experimental diagnostics",
    `Gate: ${report.gate && report.gate.enabled ? "enabled" : "disabled"}`,
    `Summary: ${report.summary || "(none)"}`,
  ];

  if (report.latestDiagnostic) {
    lines.push("", "Latest diagnostic evidence:", report.latestDiagnostic.summary);
  }

  if (Array.isArray(report.warnings) && report.warnings.length) {
    lines.push("", "Warnings:");
    for (const warning of report.warnings) {
      lines.push(`- ${warning}`);
    }
  }

  if (report.nextCommand) {
    lines.push("", `Next: ${report.nextCommand}`);
  }

  return lines.join("\n");
}

function formatExperimentalDiagnosticsCompact(report) {
  return [
    `experimental=${report.gate && report.gate.enabled ? 1 : 0}`,
    `kind=${report.kind}`,
    `diagnostic=${report.latestDiagnostic ? report.latestDiagnostic.kind : "missing"}`,
    `warnings=${Array.isArray(report.warnings) ? report.warnings.length : 0}`,
  ].join(" ");
}

module.exports = {
  buildExperimentalDiagnosticsReport,
  formatExperimentalDiagnosticsLines,
  formatExperimentalDiagnosticsCompact,
};
