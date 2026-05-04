const { latestDiagnosticWithFallback, DIAGNOSTICS_DIR } = require("../bridge/server");

function summarize(info) {
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
    lines.push(
      `Latest request artifact: ${
        diagnostic.latestRequestArtifact.fullPath || "unknown"
      }`
    );
  }
  if (diagnostic.latestResponseArtifact) {
    lines.push(
      `Latest response artifact: ${
        diagnostic.latestResponseArtifact.fullPath || "unknown"
      }`
    );
  }

  return lines.join("\n");
}

function main() {
  const info = latestDiagnosticWithFallback();
  if (!info) {
    process.stdout.write(`No diagnostics found in ${DIAGNOSTICS_DIR}\n`);
    return;
  }

  process.stdout.write(
    `${summarize({
      file: info.artifact ? info.artifact.file : null,
      fullPath: info.artifact ? info.artifact.fullPath : null,
      derived: !!info.derived,
      diagnostic: info.diagnostic,
    })}\n`
  );
}

main();
