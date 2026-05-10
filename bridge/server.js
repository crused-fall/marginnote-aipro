const http = require("http");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { URL } = require("url");
const { planResponse } = require("./planner");
const { summarizeObsidianSyncSettings } = require("./obsidian-sync");
const { buildBreakdownArtifactAudit } = require("./breakdown-artifact-audit");
const { readSupervisorState, summarizeSupervisorState } = require("./supervisor-state");
const {
  executeModelRequest,
  buildModelBackendState,
  resolveModelBackendConfig,
  latestExecution: latestModelExecution,
  loadExecutionArtifacts,
  findExecutionByTraceId,
} = require("./model-backend");

const PORT = Number(process.env.MN_AGENT_PORT || 8765);
const HOST = process.env.MN_AGENT_HOST || "127.0.0.1";
const ROOT_DIR = path.resolve(__dirname, "..");
const SUPERVISOR_STATE_DIR =
  process.env.MN_BRIDGE_SUPERVISOR_STATE_DIR || path.join(ROOT_DIR, "tmp", "bridge-supervisor");
function defaultObsidianVaultPath() {
  return process.env.MN_OBSIDIAN_VAULT_PATH || "/Users/cfall/Documents/Obsidian-vaults/Proactive_info_base";
}
const BRIDGE_DIR =
  process.env.MN_AGENT_BRIDGE_DIR ||
  path.join(
    os.homedir(),
    "Library",
    "Containers",
    "QReader.MarginStudy.easy",
    "Data",
    "Library",
    "Caches",
    "MNAIProBridge"
  );
const MODEL_ARTIFACT_DIR = process.env.MN_AGENT_MODEL_DIR || path.join(BRIDGE_DIR, "model");
const REQUESTS_DIR = process.env.MN_AGENT_REQUESTS_DIR || path.join(BRIDGE_DIR, "requests");
const RESPONSES_DIR = process.env.MN_AGENT_RESPONSES_DIR || path.join(BRIDGE_DIR, "responses");
const REPORTS_DIR = process.env.MN_AGENT_REPORTS_DIR || path.join(BRIDGE_DIR, "reports");
const DIAGNOSTICS_DIR =
  process.env.MN_AGENT_DIAGNOSTICS_DIR || path.join(BRIDGE_DIR, "diagnostics");
const processedRequestFiles = new Set();

fs.mkdirSync(REQUESTS_DIR, { recursive: true });
fs.mkdirSync(RESPONSES_DIR, { recursive: true });
fs.mkdirSync(REPORTS_DIR, { recursive: true });
fs.mkdirSync(DIAGNOSTICS_DIR, { recursive: true });
fs.mkdirSync(MODEL_ARTIFACT_DIR, { recursive: true });

function modelBackendConfig(overrides = {}) {
  return resolveModelBackendConfig({
    ...overrides,
    rootDir: ROOT_DIR,
    artifactDir: MODEL_ARTIFACT_DIR,
    env: process.env,
  });
}

function sendJson(res, statusCode, payload) {
  const body = JSON.stringify(payload, null, 2);
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
  });
  res.end(body);
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => {
      data += chunk;
      if (data.length > 2_000_000) {
        reject(new Error("request_too_large"));
        req.destroy();
      }
    });
    req.on("end", () => {
      if (!data) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(data));
      } catch (error) {
        reject(error);
      }
    });
    req.on("error", reject);
  });
}

function writeBridgeResponse(requestId, payload) {
  const responsePath = path.join(RESPONSES_DIR, `${requestId}.json`);
  fs.writeFileSync(responsePath, JSON.stringify(payload, null, 2), "utf8");
}

function listFilesByMtime(dirPath, filter) {
  try {
    return fs
      .readdirSync(dirPath)
      .filter((file) => (typeof filter === "function" ? filter(file) : true))
      .map((file) => {
        const fullPath = path.join(dirPath, file);
        const stat = fs.statSync(fullPath);
        return {
          file,
          fullPath,
          mtimeMs: stat.mtimeMs,
          size: stat.size,
        };
      })
      .sort((a, b) => b.mtimeMs - a.mtimeMs);
  } catch (error) {
    return [];
  }
}

function latestJsonFile(dirPath, filter) {
  const files = listFilesByMtime(dirPath, (file) => {
    if (!file.endsWith(".json")) return false;
    return typeof filter === "function" ? filter(file) : true;
  });
  if (!files.length) return null;
  const latest = files[0];
  return {
    file: latest.file,
    fullPath: latest.fullPath,
    mtimeMs: latest.mtimeMs,
    size: latest.size,
    json: JSON.parse(fs.readFileSync(latest.fullPath, "utf8")),
  };
}

function jsonFileByName(dirPath, fileName) {
  try {
    const fullPath = path.join(dirPath, fileName);
    const stat = fs.statSync(fullPath);
    return {
      file: fileName,
      fullPath,
      mtimeMs: stat.mtimeMs,
      size: stat.size,
      json: JSON.parse(fs.readFileSync(fullPath, "utf8")),
    };
  } catch (error) {
    return null;
  }
}

function latestReport(kind) {
  if (kind === "plan") {
    return latestJsonFile(REPORTS_DIR, (file) => /-plan\.json$/.test(file));
  }
  if (kind === "followup") {
    return latestJsonFile(REPORTS_DIR, (file) => /-followup\.json$/.test(file));
  }
  if (kind === "followup_apply") {
    return latestJsonFile(REPORTS_DIR, (file) => /-followup-apply-.*\.json$/.test(file));
  }
  if (kind === "apply") {
    return latestJsonFile(
      REPORTS_DIR,
      (file) => /-apply-.*\.json$/.test(file) && !/-followup-apply-.*\.json$/.test(file)
    );
  }
  if (kind === "diagnostic") {
    return (
      latestJsonFile(DIAGNOSTICS_DIR, (file) => !/-summary\.json$/.test(file)) ||
      latestJsonFile(
        REPORTS_DIR,
        (file) =>
          /-diagnostic\.json$/.test(file) ||
          /-runtime-.*\.json$/.test(file) ||
          /diagnostic-latest\.json$/.test(file) ||
          /runtime-latest\.json$/.test(file)
      )
    );
  }
  return null;
}

function latestQueueArtifact(kind) {
  const targetDir = kind === "response" ? RESPONSES_DIR : REQUESTS_DIR;
  return latestJsonFile(targetDir, (file) => file.endsWith(".json"));
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

function buildFollowupReplaySummary(latestApply) {
  if (!latestApply) return null;

  const nodes = normalizeAfterBranchNotes(latestApply.json);
  if (!nodes.length) return null;

  const replayPlan = planResponse({
    objective: latestApply.json?.command || latestApply.json?.objective || "整理当前选中分支",
    origin: latestApply.json?.origin || "",
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

function queueArtifactForRequestId(kind, requestId) {
  if (!requestId) return null;
  const targetDir = kind === "response" ? RESPONSES_DIR : REQUESTS_DIR;
  return jsonFileByName(targetDir, `${requestId}.json`);
}

function queueStats() {
  const requestFiles = listFilesByMtime(REQUESTS_DIR, (file) => file.endsWith(".json"));
  const responseFiles = listFilesByMtime(RESPONSES_DIR, (file) => file.endsWith(".json"));
  const responseSet = new Set(responseFiles.map((item) => item.file));

  return {
    requestCount: requestFiles.length,
    responseCount: responseFiles.length,
    unansweredRequestCount: requestFiles.filter((item) => !responseSet.has(item.file)).length,
  };
}

function extractRequestId(fileName) {
  const name = path.basename(fileName || "", path.extname(fileName || ""));
  if (!name) return null;
  if (/-plan$/.test(name)) return name.replace(/-plan$/, "");
  if (/-apply-\d+$/.test(name)) return name.replace(/-apply-\d+$/, "");
  return name;
}

function summarizeRequestPayload(payload) {
  const nodes = Array.isArray(payload?.nodes) ? payload.nodes : [];
  const root = nodes[0] || {};
  const origin = payload?.origin || "";
  return {
    nodeCount: nodes.length,
    rootNoteId: root.noteId || root.id || null,
    notebookId: root.notebookId || null,
    objective: payload?.objective || null,
    origin,
    mode: origin === "native_ai_breakdown" ? "breakdown" : "primary",
  };
}

function summarizeResponsePayload(payload) {
  const plan = payload?.plan || {};
  const origin = plan?.origin || "";
  return {
    ok: !!payload?.ok,
    requestId: payload?.requestId || null,
    actionCount: Array.isArray(plan.actions) ? plan.actions.length : 0,
    helperBlockedCount: Array.isArray(plan.helperBlockedActions)
      ? plan.helperBlockedActions.length
      : 0,
    objective: plan?.objective || null,
    origin,
    mode: origin === "native_ai_breakdown" ? "breakdown" : "primary",
  };
}

function summarizeModelExecutionPayload(payload) {
  const trace = payload?.trace || payload || {};
  const request = payload?.request || {};
  const response = payload?.response || {};
  return {
    ok: !!payload?.ok,
    kind: payload?.kind || trace.kind || "model_execution",
    status: trace.status || payload?.status || null,
    dryRun: !!(payload?.dryRun ?? trace.dryRun),
    requestId: payload?.requestId || trace.requestId || request.requestId || null,
    traceId: payload?.traceId || trace.traceId || request.traceId || null,
    replayKey: payload?.replayKey || trace.replayKey || request.replayKey || null,
    providerType: trace.provider?.type || payload?.provider?.type || null,
    providerAvailable: !!(trace.provider && trace.provider.available),
    failureClass: trace.failure?.classification || payload?.failure?.classification || null,
    fallbackUsed: !!(trace.fallback && trace.fallback.used),
    requestMessageCount:
      typeof trace.request === "object" && trace.request && typeof trace.request.messageCount === "number"
        ? trace.request.messageCount
        : typeof request.inputSummary?.messageCount === "number"
          ? request.inputSummary.messageCount
          : 0,
    responseToolCallCount:
      typeof response.summary?.toolCallCount === "number"
        ? response.summary.toolCallCount
        : typeof trace.response?.toolCallCount === "number"
          ? trace.response.toolCallCount
          : 0,
  };
}

function summarizePlanPayload(payload) {
  const origin = payload?.origin || "";
  return {
    stage: payload?.stage || "primary",
    actionCount: Array.isArray(payload?.actions) ? payload.actions.length : 0,
    helperBlockedCount: Array.isArray(payload?.helperBlockedActions)
      ? payload.helperBlockedActions.length
      : 0,
    objective: payload?.objective || null,
    origin,
    mode: origin === "native_ai_breakdown" ? "breakdown" : "primary",
    originalActionCount:
      typeof payload?.originalActionCount === "number"
        ? payload.originalActionCount
        : null,
  };
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

function summarizeApplyPayload(payload) {
  const origin = payload?.origin || "";
  return {
    command: payload?.command || null,
    objective: payload?.objective || null,
    origin,
    mode: origin === "native_ai_breakdown" ? "breakdown" : "primary",
    actionCount: typeof payload?.actionCount === "number" ? payload.actionCount : 0,
    appliedCount: Array.isArray(payload?.results)
      ? payload.results.filter((item) => item && item.ok).length
      : 0,
    helperBlockedCount: Array.isArray(payload?.helperBlockedActions)
      ? payload.helperBlockedActions.length
      : 0,
    changedNoteCount:
      typeof payload?.branchDiff?.changedNoteCount === "number"
        ? payload.branchDiff.changedNoteCount
        : 0,
    halted: !!payload?.halted,
  };
}

function artifactMeta(artifact, summaryBuilder, extra) {
  if (!artifact) return null;
  return {
    file: artifact.file,
    fullPath: artifact.fullPath,
    mtimeMs: artifact.mtimeMs,
    size: artifact.size,
    requestId: extractRequestId(artifact.file),
    summary: typeof summaryBuilder === "function" ? summaryBuilder(artifact.json) : null,
    ...(extra || {}),
  };
}

function buildDerivedDiagnostic(latest) {
  const latestPlan = latest?.plan || null;
  const latestApply = latest?.apply || null;
  const latestRequest = latest?.request || null;
  const latestResponse = latest?.response || null;
  const requestPayload = latestRequest?.json || {};
  const responsePayload = latestResponse?.json || {};
  const planPayload = latestPlan?.json || responsePayload.plan || {};
  const applyPayload = latestApply?.json || {};
  const requestSummary = summarizeRequestPayload(requestPayload);
  const responseSummary = summarizeResponsePayload(responsePayload);
  const planSummary = summarizePlanPayload(planPayload);
  const applySummary = summarizeApplyPayload(applyPayload);
  const requestId =
    extractRequestId(latestApply?.file) ||
    extractRequestId(latestPlan?.file) ||
    extractRequestId(latestResponse?.file) ||
    extractRequestId(latestRequest?.file) ||
    null;

  let status = "idle";
  if (latestApply) {
    status = applySummary.halted
      ? "failed"
      : applySummary.actionCount > 0 || applySummary.appliedCount > 0
        ? "completed"
        : applySummary.helperBlockedCount > 0
          ? "blocked_before_execution"
          : "apply_noop";
  } else if (latestPlan) {
    status = "planned";
  } else if (latestResponse) {
    status = responseSummary.ok ? "response_ready" : "bridge_error";
  } else if (latestRequest) {
    status = "request_seen";
  }

  const warnings = [];
  warnings.push("addon_diagnostic_artifact_missing");
  if (planSummary.helperBlockedCount || applySummary.helperBlockedCount) {
    warnings.push("helper_blocked_actions_present");
  }
  if (latestRequest && !latestResponse) {
    warnings.push("request_without_response_artifact");
  }

  return {
    kind: "derived_diagnostic",
    source: "bridge_artifacts_fallback",
    derived: true,
    generatedAt: new Date().toISOString(),
    status,
    requestId,
    rootNoteId:
      applyPayload.rootNoteId || requestSummary.rootNoteId || null,
    notebookId:
      applyPayload.notebookId || requestSummary.notebookId || null,
    metrics: {
      branchNodeCount: requestSummary.nodeCount,
      plannedActionCount:
        planSummary.originalActionCount != null
          ? planSummary.originalActionCount
          : planSummary.actionCount + planSummary.helperBlockedCount,
      applyActionCount: applySummary.actionCount,
      appliedCount: applySummary.appliedCount,
      helperBlockedCount: Math.max(
        planSummary.helperBlockedCount,
        applySummary.helperBlockedCount
      ),
      changedNoteCount: applySummary.changedNoteCount,
    },
    latestPlanArtifact: artifactMeta(latestPlan, summarizePlanPayload),
    latestApplyArtifact: artifactMeta(latestApply, summarizeApplyPayload),
    latestRequestArtifact: artifactMeta(latestRequest, summarizeRequestPayload),
    latestResponseArtifact: artifactMeta(latestResponse, summarizeResponsePayload),
    warnings,
  };
}

function latestDiagnosticWithFallback() {
  const diagnostic = latestReport("diagnostic");
  const latestPlan = latestReport("plan");
  const latestApply = latestReport("apply");
  const latestRequest = latestQueueArtifact("request");
  const pivotRequestId =
    extractRequestId(latestApply?.file) ||
    extractRequestId(latestPlan?.file) ||
    extractRequestId(latestRequest?.file) ||
    null;
  const latest = {
    request: queueArtifactForRequestId("request", pivotRequestId) || latestRequest,
    response:
      queueArtifactForRequestId("response", pivotRequestId) ||
      latestQueueArtifact("response"),
    plan: latestPlan,
    apply: latestApply,
  };

  if (diagnostic) {
    return {
      artifact: diagnostic,
      derived: false,
      diagnostic: diagnostic.json,
      status:
        (diagnostic.json && (diagnostic.json.status || diagnostic.json.origin || diagnostic.json.kind)) ||
        null,
    };
  }

  const derivedDiagnostic = buildDerivedDiagnostic(latest);
  if (!latest.request && !latest.response && !latest.plan && !latest.apply) {
    return null;
  }

  return {
    artifact: null,
    derived: true,
    diagnostic: derivedDiagnostic,
    status: derivedDiagnostic.status,
  };
}

function latestFollowupWithFallback() {
  const stored = latestReport("followup");
  const latestApply = latestReport("apply");
  const replay = buildFollowupReplaySummary(latestApply);
  if (stored) {
    return {
      artifact: stored,
      derived: false,
      source: "stored_followup_artifact",
      payload: stored.json,
      replay,
    };
  }

  if (!latestApply || !replay) return null;
  const nodes = normalizeAfterBranchNotes(latestApply.json);

  return {
    artifact: latestApply,
    derived: true,
    source: "latest_apply_after_branch_replay",
    payload: planResponse({
      objective: "整理当前选中分支",
      stage: "followup",
      dryRun: true,
      nodes,
    }).plan,
  };
}

function bridgeStatus() {
  const queue = queueStats();
  const latestRequest = latestQueueArtifact("request");
  const latestResponse = latestQueueArtifact("response");
  const latestPlan = latestReport("plan");
  const latestFollowup = latestFollowupWithFallback();
  const latestFollowupApply = latestReport("followup_apply");
  const latestApply = latestReport("apply");
  const latestDiagnostic = latestDiagnosticWithFallback();
  const modelConfig = modelBackendConfig();
  const latestModel = latestModelExecution(modelConfig);
  const modelBackend = buildModelBackendState(modelConfig);
  const obsidianSyncSettings = summarizeObsidianSyncSettings(defaultObsidianVaultPath());
  const breakdownArtifacts = buildBreakdownArtifactAudit({
    reportsDir: REPORTS_DIR,
    requestsDir: REQUESTS_DIR,
  });
  const supervisorState = summarizeSupervisorState(readSupervisorState(SUPERVISOR_STATE_DIR));

  return {
    ok: true,
    service: "mn-agent-bridge",
    host: HOST,
    port: PORT,
    now: new Date().toISOString(),
    bridgeDir: BRIDGE_DIR,
    queueDepth: queue.requestCount,
    queue,
    obsidianVaultPath: obsidianSyncSettings.vaultPath,
    obsidianSyncSettings,
    modelBackend: latestModel
      ? {
          ...modelBackend,
          latest: summarizeModelExecutionPayload(latestModel),
        }
      : modelBackend,
    latestModelExecution: latestModel
      ? {
          file: latestModel.file,
          fullPath: latestModel.fullPath,
          mtimeMs: latestModel.mtimeMs,
          requestId: latestModel.trace?.requestId || latestModel.request?.requestId || null,
          traceId: latestModel.trace?.traceId || latestModel.request?.traceId || null,
          summary: summarizeModelExecutionPayload(latestModel),
        }
      : null,
    breakdownArtifacts,
    breakdownNextCommand: breakdownArtifacts.nextCommand || "mnaipro breakdown artifacts --json",
    supervisorState,
    latestFollowupApply: latestFollowupApply
      ? {
          file: latestFollowupApply.file,
          fullPath: latestFollowupApply.fullPath,
          mtimeMs: latestFollowupApply.mtimeMs,
          requestId: extractRequestId(latestFollowupApply.file),
          summary: summarizeApplyPayload(latestFollowupApply.json),
        }
      : null,
    latest: {
      request: artifactMeta(latestRequest, summarizeRequestPayload),
      response: artifactMeta(latestResponse, summarizeResponsePayload),
      plan: latestPlan
        ? {
            file: latestPlan.file,
            fullPath: latestPlan.fullPath,
            mtimeMs: latestPlan.mtimeMs,
            requestId: extractRequestId(latestPlan.file),
            summary: summarizePlanPayload(latestPlan.json),
          }
        : null,
      followup: latestFollowup
        ? {
            derived: !!latestFollowup.derived,
            source: latestFollowup.source,
            file: latestFollowup.artifact ? latestFollowup.artifact.file : null,
            fullPath: latestFollowup.artifact ? latestFollowup.artifact.fullPath : null,
            mtimeMs: latestFollowup.artifact ? latestFollowup.artifact.mtimeMs : null,
            requestId:
              latestFollowup.artifact && latestFollowup.artifact.file
                ? extractRequestId(latestFollowup.artifact.file)
                : null,
            summary: summarizePlanPlan(latestFollowup.payload),
            replay: latestFollowup.replay || null,
          }
        : null,
      followupApply: latestFollowupApply
        ? {
            file: latestFollowupApply.file,
            fullPath: latestFollowupApply.fullPath,
            mtimeMs: latestFollowupApply.mtimeMs,
            requestId: extractRequestId(latestFollowupApply.file),
            summary: summarizeApplyPayload(latestFollowupApply.json),
          }
        : null,
      apply: latestApply
        ? {
            file: latestApply.file,
            fullPath: latestApply.fullPath,
            mtimeMs: latestApply.mtimeMs,
            requestId: extractRequestId(latestApply.file),
            summary: summarizeApplyPayload(latestApply.json),
          }
        : null,
      diagnostic: latestDiagnostic
        ? {
            derived: !!latestDiagnostic.derived,
            file: latestDiagnostic.artifact ? latestDiagnostic.artifact.file : null,
            fullPath: latestDiagnostic.artifact ? latestDiagnostic.artifact.fullPath : null,
            mtimeMs: latestDiagnostic.artifact ? latestDiagnostic.artifact.mtimeMs : null,
            kind:
              latestDiagnostic.diagnostic &&
              typeof latestDiagnostic.diagnostic.kind === "string"
                ? latestDiagnostic.diagnostic.kind
                : null,
            origin:
              latestDiagnostic.diagnostic &&
              typeof latestDiagnostic.diagnostic.origin === "string"
                ? latestDiagnostic.diagnostic.origin
                : null,
            status: latestDiagnostic.status,
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
    },
  };
}

async function handleModelRun(req, res, url) {
  try {
    const payload = await readJson(req);
    const execution = await executeModelRequest(payload, modelBackendConfig());
    sendJson(res, 200, {
      ok: execution.ok,
      kind: execution.kind,
      status: execution.status,
      requestId: execution.requestId,
      traceId: execution.traceId,
      replayKey: execution.replayKey,
      dryRun: execution.dryRun,
      provider: execution.provider,
      request: execution.request,
      response: execution.response,
      trace: execution.trace,
      failure: execution.failure,
      fallback: execution.fallback,
      artifacts: execution.artifacts,
      toolBoundaries: execution.toolBoundaries,
    });
  } catch (error) {
    sendJson(res, 400, {
      ok: false,
      error: error.message || String(error),
    });
  }
}

async function handleModelReplay(req, res) {
  try {
    const payload = await readJson(req);
    const config = modelBackendConfig();
    const source =
      (payload && payload.requestId && loadExecutionArtifacts(config, payload.requestId)) ||
      (payload && payload.traceId && findExecutionByTraceId(config, payload.traceId)) ||
      null;
    if (!source) {
      sendJson(res, 404, {
        ok: false,
        error: "not_found",
      });
      return;
    }

    const basePayload = source.request && source.request.originalPayload ? source.request.originalPayload : {};
    const replayPayload = {
      ...basePayload,
      requestId: payload.requestId || basePayload.requestId || null,
      dryRun:
        typeof payload.dryRun === "boolean"
          ? payload.dryRun
          : typeof basePayload.dryRun === "boolean"
            ? basePayload.dryRun
            : true,
      replayFrom: {
        requestId: source.trace && source.trace.requestId ? source.trace.requestId : source.request?.requestId || null,
        traceId: source.trace && source.trace.traceId ? source.trace.traceId : source.request?.traceId || null,
        replayKey: source.trace && source.trace.replayKey ? source.trace.replayKey : source.request?.replayKey || null,
      },
    };

    const execution = await executeModelRequest(replayPayload, config);
    sendJson(res, 200, {
      ok: execution.ok,
      kind: execution.kind,
      status: execution.status,
      requestId: execution.requestId,
      traceId: execution.traceId,
      replayKey: execution.replayKey,
      dryRun: execution.dryRun,
      provider: execution.provider,
      request: execution.request,
      response: execution.response,
      trace: execution.trace,
      failure: execution.failure,
      fallback: execution.fallback,
      artifacts: execution.artifacts,
      toolBoundaries: execution.toolBoundaries,
      replayOf: {
        requestId: replayPayload.replayFrom.requestId,
        traceId: replayPayload.replayFrom.traceId,
        replayKey: replayPayload.replayFrom.replayKey,
      },
    });
  } catch (error) {
    sendJson(res, 400, {
      ok: false,
      error: error.message || String(error),
    });
  }
}

function processBridgeRequestFile(fileName) {
  const requestPath = path.join(REQUESTS_DIR, fileName);
  const requestId = path.basename(fileName, path.extname(fileName));

  try {
    const raw = fs.readFileSync(requestPath, "utf8");
    const payload = JSON.parse(raw);
    writeBridgeResponse(requestId, planResponse(payload));
  } catch (error) {
    writeBridgeResponse(requestId, {
      ok: false,
      error: error.message || String(error),
    });
  }
}

function scanBridgeQueue() {
  let files = [];
  try {
    files = fs.readdirSync(REQUESTS_DIR).filter((file) => file.endsWith(".json"));
  } catch (error) {
    return;
  }

  for (const fileName of files) {
    const requestPath = path.join(REQUESTS_DIR, fileName);
    const responsePath = path.join(RESPONSES_DIR, fileName);
    let requestStat = null;
    let responseStat = null;
    try {
      requestStat = fs.statSync(requestPath);
    } catch (error) {
      requestStat = null;
    }
    try {
      responseStat = fs.statSync(responsePath);
    } catch (error) {
      responseStat = null;
    }

    if (
      responseStat &&
      requestStat &&
      responseStat.mtimeMs >= requestStat.mtimeMs
    ) {
      processedRequestFiles.add(fileName);
      continue;
    }

    if (processedRequestFiles.has(fileName)) {
      continue;
    }
    processedRequestFiles.add(fileName);
    processBridgeRequestFile(fileName);
  }
}

function createServer() {
  return http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host || `${HOST}:${PORT}`}`);

    if (req.method === "GET" && url.pathname === "/health") {
      sendJson(res, 200, bridgeStatus());
      return;
    }

    if (req.method === "GET" && url.pathname === "/status") {
      sendJson(res, 200, bridgeStatus());
      return;
    }

    if (req.method === "POST" && url.pathname === "/plan") {
      try {
        const payload = await readJson(req);
        sendJson(res, 200, planResponse(payload));
      } catch (error) {
        sendJson(res, 400, {
          ok: false,
          error: error.message || String(error),
        });
      }
      return;
    }

    if (req.method === "POST" && url.pathname === "/model/run") {
      await handleModelRun(req, res, url);
      return;
    }

    if (req.method === "POST" && url.pathname === "/model/replay") {
      await handleModelReplay(req, res);
      return;
    }

    if (req.method === "GET" && url.pathname === "/model/latest") {
      const config = modelBackendConfig();
      const latest = latestModelExecution(config);
      if (!latest) {
        sendJson(res, 404, {
          ok: false,
          error: "not_found",
        });
        return;
      }

      sendJson(res, 200, {
        ok: true,
        derived: false,
        file: latest.file,
        fullPath: latest.fullPath,
        mtimeMs: latest.mtimeMs,
        request: latest.request,
        response: latest.response,
        trace: latest.trace,
        summary: summarizeModelExecutionPayload(latest),
      });
      return;
    }

    if (req.method === "GET" && url.pathname === "/plan-file") {
      try {
        const filePath = url.searchParams.get("path");
        if (!filePath) {
          sendJson(res, 400, {
            ok: false,
            error: "missing_path",
          });
          return;
        }

        const raw = fs.readFileSync(filePath, "utf8");
        const payload = JSON.parse(raw);
        sendJson(res, 200, planResponse(payload));
      } catch (error) {
        sendJson(res, 400, {
          ok: false,
          error: error.message || String(error),
        });
      }
      return;
    }

    if (req.method === "GET" && url.pathname === "/reports/latest") {
      const kind = url.searchParams.get("kind") || "apply";
      if (!["plan", "followup", "followup_apply", "apply", "diagnostic"].includes(kind)) {
        sendJson(res, 400, {
          ok: false,
          error: "invalid_kind",
        });
        return;
      }

      const latest =
        kind === "diagnostic"
          ? latestDiagnosticWithFallback()
          : kind === "followup"
            ? latestFollowupWithFallback()
            : latestReport(kind);
      if (!latest) {
        sendJson(res, 404, {
          ok: false,
          error: "not_found",
          kind,
        });
        return;
      }

      const responsePayload =
        kind === "followup" && latest.payload
          ? {
              ...latest.payload,
              replay: latest.replay || null,
            }
          : latest.diagnostic || latest.payload || latest.json;

      sendJson(res, 200, {
        ok: true,
        kind,
        derived: !!latest.derived,
        source: latest.source || null,
        file: latest.artifact ? latest.artifact.file : latest.file,
        fullPath: latest.artifact ? latest.artifact.fullPath : latest.fullPath,
        mtimeMs: latest.artifact ? latest.artifact.mtimeMs : latest.mtimeMs,
        payload: responsePayload,
        replay: latest.replay || null,
      });
      return;
    }

    if (req.method === "GET" && url.pathname === "/diagnostics/latest") {
      const latest = latestDiagnosticWithFallback();
      if (!latest) {
        sendJson(res, 404, {
          ok: false,
          error: "not_found",
        });
        return;
      }

      sendJson(res, 200, {
        ok: true,
        derived: !!latest.derived,
        file: latest.artifact ? latest.artifact.file : null,
        fullPath: latest.artifact ? latest.artifact.fullPath : null,
        mtimeMs: latest.artifact ? latest.artifact.mtimeMs : null,
        diagnostic: latest.diagnostic,
      });
      return;
    }

    if (req.method === "GET" && url.pathname === "/requests/latest") {
      const latest = latestQueueArtifact("request");
      if (!latest) {
        sendJson(res, 404, {
          ok: false,
          error: "not_found",
        });
        return;
      }

      sendJson(res, 200, {
        ok: true,
        file: latest.file,
        fullPath: latest.fullPath,
        mtimeMs: latest.mtimeMs,
        requestId: extractRequestId(latest.file),
        payload: latest.json,
      });
      return;
    }

    if (req.method === "GET" && url.pathname === "/responses/latest") {
      const latest = latestQueueArtifact("response");
      if (!latest) {
        sendJson(res, 404, {
          ok: false,
          error: "not_found",
        });
        return;
      }

      sendJson(res, 200, {
        ok: true,
        file: latest.file,
        fullPath: latest.fullPath,
        mtimeMs: latest.mtimeMs,
        requestId: extractRequestId(latest.file),
        payload: latest.json,
      });
      return;
    }

    sendJson(res, 404, {
      ok: false,
      error: "not_found",
    });
  });
}

function startServer() {
  const server = createServer();
  setInterval(scanBridgeQueue, 300);
  scanBridgeQueue();

  server.listen(PORT, HOST, () => {
    console.log(`mn-agent-bridge listening on http://${HOST}:${PORT}`);
    console.log(`mn-agent-bridge queue ${BRIDGE_DIR}`);
  });

  return server;
}

if (require.main === module) {
  startServer();
}

module.exports = {
  createServer,
  startServer,
  scanBridgeQueue,
  processBridgeRequestFile,
  BRIDGE_DIR,
  REQUESTS_DIR,
  RESPONSES_DIR,
  REPORTS_DIR,
  DIAGNOSTICS_DIR,
  MODEL_ARTIFACT_DIR,
  bridgeStatus,
  latestReport,
  latestDiagnosticWithFallback,
  latestFollowupWithFallback,
  latestQueueArtifact,
  latestModelExecution,
  loadExecutionArtifacts,
  findExecutionByTraceId,
};
