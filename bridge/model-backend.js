const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_PROVIDER_TYPE = "disabled";

function compactText(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

function isPlainObject(value) {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function safeFileName(value, fallback = "model-run") {
  const text = compactText(value);
  const cleaned = text.replace(/[^A-Za-z0-9._-]+/g, "_").replace(/^_+|_+$/g, "");
  return cleaned || fallback;
}

function parseMaybeJson(value) {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    return JSON.parse(value);
  } catch (error) {
    return null;
  }
}

function redactSensitiveValue(value) {
  if (Array.isArray(value)) {
    return value.map((item) => redactSensitiveValue(item));
  }
  if (isPlainObject(value)) {
    const result = {};
    for (const [key, item] of Object.entries(value)) {
      if (/(token|secret|password|api[_-]?key|authorization)/i.test(key)) {
        result[key] = "[redacted]";
      } else {
        result[key] = redactSensitiveValue(item);
      }
    }
    return result;
  }
  return value;
}

function stableClone(value) {
  if (Array.isArray(value)) {
    return value.map((item) => stableClone(item));
  }
  if (isPlainObject(value)) {
    return Object.keys(value)
      .sort()
      .reduce((accumulator, key) => {
        accumulator[key] = stableClone(value[key]);
        return accumulator;
      }, {});
  }
  return value;
}

function stableJson(value) {
  return JSON.stringify(stableClone(value));
}

function hashText(value) {
  return crypto.createHash("sha256").update(String(value || ""), "utf8").digest("hex");
}

function normalizeMessages(payload) {
  if (Array.isArray(payload?.messages) && payload.messages.length) {
    return payload.messages.map((message) => ({
      role: compactText(message && (message.role || message.type || "user")) || "user",
      content:
        typeof message?.content === "string"
          ? message.content
          : message && message.content != null
            ? message.content
            : null,
      name: compactText(message && message.name) || null,
      tool_call_id:
        compactText(message && (message.tool_call_id || message.toolCallId)) || null,
      id: compactText(message && message.id) || null,
    }));
  }

  const prompt = compactText(payload?.prompt);
  if (prompt) {
    return [
      {
        role: "user",
        content: prompt,
        name: null,
        tool_call_id: null,
        id: null,
      },
    ];
  }

  return [];
}

function normalizeTools(payload) {
  return Array.isArray(payload?.tools)
    ? payload.tools.map((tool) => {
        if (!isPlainObject(tool)) {
          return { name: compactText(tool) || null };
        }
        return {
          name: compactText(tool.name) || null,
          type: compactText(tool.type) || null,
          description: compactText(tool.description) || null,
          parameters: isPlainObject(tool.parameters) ? stableClone(tool.parameters) : tool.parameters || null,
        };
      })
    : [];
}

function normalizeToolCalls(payload) {
  return Array.isArray(payload?.toolCalls)
    ? payload.toolCalls.map((call, index) => {
        if (!isPlainObject(call)) {
          return {
            index,
            name: compactText(call) || `tool-${index + 1}`,
          };
        }
        return {
          index,
          id: compactText(call.id) || null,
          name: compactText(call.name) || compactText(call.type) || `tool-${index + 1}`,
          type: compactText(call.type) || null,
          arguments:
            typeof call.arguments === "string"
              ? call.arguments
              : call.arguments != null
                ? stableClone(call.arguments)
                : null,
          content:
            typeof call.content === "string"
              ? call.content
              : call.content != null
                ? stableClone(call.content)
                : null,
        };
      })
    : [];
}

function normalizeReplayFrom(value) {
  if (!value) return null;
  if (typeof value === "string") {
    return {
      requestId: compactText(value) || null,
      traceId: null,
      replayKey: null,
    };
  }
  if (!isPlainObject(value)) return null;
  return {
    requestId: compactText(value.requestId) || null,
    traceId: compactText(value.traceId) || null,
    replayKey: compactText(value.replayKey) || null,
  };
}

function readMaybeJsonHeader(value) {
  if (!value) return null;
  if (isPlainObject(value)) return stableClone(value);
  if (typeof value !== "string") return null;
  const parsed = parseMaybeJson(value);
  return parsed && isPlainObject(parsed) ? parsed : null;
}

function resolveModelBackendConfig(options = {}) {
  const env = options.env || process.env;
  const rootDir = path.resolve(options.rootDir || path.join(__dirname, ".."));
  const artifactDir = path.resolve(
    options.artifactDir || env.MN_MODEL_ARTIFACT_DIR || path.join(rootDir, "tmp", "bridge-model")
  );
  const providerType = compactText(
    options.providerType ||
      env.MN_MODEL_PROVIDER ||
      env.MN_BRIDGE_MODEL_PROVIDER ||
      DEFAULT_PROVIDER_TYPE
  ).toLowerCase();
  const providerName = compactText(
    options.providerName ||
      env.MN_MODEL_PROVIDER_NAME ||
      env.MN_BRIDGE_MODEL_PROVIDER_NAME ||
      providerType ||
      DEFAULT_PROVIDER_TYPE
  );
  const endpoint = compactText(
    options.endpoint || env.MN_MODEL_ENDPOINT || env.MN_BRIDGE_MODEL_ENDPOINT || ""
  );
  const model = compactText(options.model || env.MN_MODEL_MODEL || env.MN_MODEL_NAME || "");
  const timeoutMs = Math.max(
    1_000,
    Number.isFinite(Number(options.timeoutMs))
      ? Number(options.timeoutMs)
      : Number.isFinite(Number(env.MN_MODEL_TIMEOUT_MS))
        ? Number(env.MN_MODEL_TIMEOUT_MS)
        : DEFAULT_TIMEOUT_MS
  );
  const apiKey = compactText(options.apiKey || env.MN_MODEL_API_KEY || env.MN_BRIDGE_MODEL_API_KEY || "");
  const extraHeaders =
    readMaybeJsonHeader(options.headers) ||
    readMaybeJsonHeader(env.MN_MODEL_HEADERS_JSON) ||
    readMaybeJsonHeader(env.MN_BRIDGE_MODEL_HEADERS_JSON) ||
    null;

  return {
    rootDir,
    artifactDir,
    requestDir: path.join(artifactDir, "requests"),
    responseDir: path.join(artifactDir, "responses"),
    traceDir: path.join(artifactDir, "traces"),
    providerType,
    providerName,
    endpoint,
    model,
    timeoutMs,
    apiKey,
    headers: extraHeaders,
    configured: providerType !== DEFAULT_PROVIDER_TYPE,
    available: providerType !== DEFAULT_PROVIDER_TYPE && providerType !== "disabled" ? true : false,
  };
}

function providerAvailability(config) {
  const providerType = compactText(config.providerType).toLowerCase();
  if (!providerType || providerType === DEFAULT_PROVIDER_TYPE || providerType === "disabled") {
    return {
      configured: false,
      available: false,
      reason: "provider_disabled",
    };
  }

  if (providerType === "http" || providerType === "http-json" || providerType === "http_json") {
    if (!compactText(config.endpoint)) {
      return {
        configured: true,
        available: false,
        reason: "missing_endpoint",
      };
    }
    return {
      configured: true,
      available: true,
      reason: "ready",
    };
  }

  return {
    configured: true,
    available: false,
    reason: "unsupported_provider_type",
  };
}

function summarizeProvider(config, availability = providerAvailability(config)) {
  return {
    type: compactText(config.providerType) || DEFAULT_PROVIDER_TYPE,
    name: compactText(config.providerName) || compactText(config.providerType) || DEFAULT_PROVIDER_TYPE,
    configured: !!availability.configured,
    available: !!availability.available,
    reason: availability.reason || null,
    endpointConfigured: !!compactText(config.endpoint),
    endpoint: compactText(config.endpoint) ? "[configured]" : null,
    model: compactText(config.model) || null,
    timeoutMs: typeof config.timeoutMs === "number" ? config.timeoutMs : DEFAULT_TIMEOUT_MS,
  };
}

function normalizeMetadata(metadata) {
  if (!isPlainObject(metadata)) return {};
  return redactSensitiveValue(metadata);
}

function summarizeToolBoundaries({ messages, tools, toolCalls, replayKey }) {
  const boundaries = [
    {
      index: 0,
      kind: "request",
      label: "provider input",
      messageCount: Array.isArray(messages) ? messages.length : 0,
      toolCount: Array.isArray(tools) ? tools.length : 0,
      toolCallCount: Array.isArray(toolCalls) ? toolCalls.length : 0,
      replayKey: replayKey || null,
    },
  ];

  (Array.isArray(toolCalls) ? toolCalls : []).forEach((toolCall, index) => {
    boundaries.push({
      index: index + 1,
      kind: "tool_call",
      label: `tool call ${index + 1}`,
      name: compactText(toolCall && (toolCall.name || toolCall.type)) || `tool-${index + 1}`,
      toolCallId: compactText(toolCall && (toolCall.id || toolCall.toolCallId)) || null,
    });
  });

  boundaries.push({
    index: boundaries.length,
    kind: "response",
    label: "provider response",
  });

  return boundaries;
}

function summarizeRequest(payload, config) {
  const messages = normalizeMessages(payload);
  const tools = normalizeTools(payload);
  const toolCalls = normalizeToolCalls(payload);
  const origin = compactText(payload?.origin) || "bridge_model";
  const operation = compactText(payload?.operation) || "generate";
  const dryRun =
    typeof payload?.dryRun === "boolean"
      ? payload.dryRun
      : typeof payload?.execute === "boolean"
        ? !payload.execute
        : true;
  const replayFrom = normalizeReplayFrom(payload?.replayFrom || payload?.replay || null);
  const metadata = normalizeMetadata(payload?.metadata);
  const prompt = compactText(payload?.prompt);
  const normalized = {
    requestId: compactText(payload?.requestId) || null,
    createdAt: new Date().toISOString(),
    origin,
    operation,
    dryRun,
    model: compactText(config.model) || null,
    provider: summarizeProvider(config),
    prompt: prompt || null,
    messages,
    tools,
    toolCalls,
    metadata,
    replayFrom,
  };
  normalized.replayKey = hashText(
    stableJson({
      origin: normalized.origin,
      operation: normalized.operation,
      dryRun: normalized.dryRun,
      model: normalized.model,
      providerType: normalized.provider.type,
      endpointConfigured: normalized.provider.endpointConfigured,
      prompt: normalized.prompt,
      messages: normalized.messages,
      tools: normalized.tools,
      toolCalls: normalized.toolCalls,
      metadata: normalized.metadata,
      replayFrom: normalized.replayFrom,
    })
  );
  normalized.requestId =
    normalized.requestId ||
    `model-${Date.now()}-${normalized.replayKey.slice(0, 12)}-${Math.random()
      .toString(16)
      .slice(2, 8)}`;
  normalized.requestId = safeFileName(normalized.requestId, "model-run");
  normalized.traceId = `${normalized.requestId}-${normalized.replayKey.slice(0, 12)}`;
  normalized.toolBoundaries = summarizeToolBoundaries({
    messages: normalized.messages,
    tools: normalized.tools,
    toolCalls: normalized.toolCalls,
    replayKey: normalized.replayKey,
  });
  normalized.inputSummary = {
    origin: normalized.origin,
    operation: normalized.operation,
    dryRun: normalized.dryRun,
    model: normalized.model,
    messageCount: normalized.messages.length,
    toolCount: normalized.tools.length,
    toolCallCount: normalized.toolCalls.length,
    promptLength: normalized.prompt ? normalized.prompt.length : 0,
    metadataKeys: Object.keys(normalized.metadata || {}).slice(0, 12),
    replayRequested: !!normalized.replayFrom,
  };
  return normalized;
}

function buildProviderRequestBody(request) {
  return {
    requestId: request.requestId,
    traceId: request.traceId,
    replayKey: request.replayKey,
    origin: request.origin,
    operation: request.operation,
    dryRun: false,
    model: request.model || null,
    prompt: request.prompt || null,
    messages: request.messages,
    tools: request.tools,
    toolCalls: request.toolCalls,
    metadata: request.metadata,
    replayFrom: request.replayFrom,
    toolBoundaries: request.toolBoundaries,
  };
}

function summarizeProviderResponseBody(body, text, status) {
  const parsed = isPlainObject(body) ? body : null;
  const toolCalls = parsed
    ? Array.isArray(parsed.toolCalls)
      ? parsed.toolCalls
      : Array.isArray(parsed.tool_calls)
        ? parsed.tool_calls
        : []
    : [];
  const outputText = parsed
    ? compactText(
        parsed.output ??
          parsed.text ??
          parsed.message ??
          parsed.content ??
          parsed.response ??
          ""
      )
    : compactText(text);

  return {
    bodyType: parsed ? "json" : "text",
    status,
    outputText: outputText || null,
    toolCallCount: toolCalls.length,
    toolCalls: toolCalls.map((toolCall, index) =>
      isPlainObject(toolCall)
        ? {
            index,
            id: compactText(toolCall.id) || null,
            name: compactText(toolCall.name) || compactText(toolCall.type) || `tool-${index + 1}`,
            type: compactText(toolCall.type) || null,
          }
        : {
            index,
            name: compactText(toolCall) || `tool-${index + 1}`,
          }
    ),
    usage: parsed && isPlainObject(parsed.usage) ? stableClone(parsed.usage) : null,
    finishReason:
      parsed &&
      compactText(parsed.finishReason || parsed.finish_reason || parsed.stopReason || parsed.stop_reason)
        ? compactText(parsed.finishReason || parsed.finish_reason || parsed.stopReason || parsed.stop_reason)
        : null,
    keys: parsed ? Object.keys(parsed).sort().slice(0, 24) : [],
  };
}

function classifyFailure(error, context = {}) {
  const message = compactText(error && (error.message || error.error || error.reason)) || "model_execution_failed";
  if (context.providerReason === "provider_disabled") {
    return {
      classification: "provider_unavailable",
      retryable: false,
      message: "Model provider is disabled.",
    };
  }
  if (context.providerReason === "missing_endpoint") {
    return {
      classification: "provider_misconfigured",
      retryable: false,
      message: "Model provider endpoint is missing.",
    };
  }
  if (context.providerReason === "unsupported_provider_type") {
    return {
      classification: "provider_unsupported",
      retryable: false,
      message: "Model provider type is not supported by the bridge backend.",
    };
  }
  if (context.responseStatus && context.responseStatus >= 500) {
    return {
      classification: "provider_http_error",
      retryable: true,
      message: `Provider returned HTTP ${context.responseStatus}.`,
      status: context.responseStatus,
    };
  }
  if (context.responseStatus && context.responseStatus >= 400) {
    return {
      classification: "provider_http_error",
      retryable: false,
      message: `Provider returned HTTP ${context.responseStatus}.`,
      status: context.responseStatus,
    };
  }
  if (/timeout/i.test(message) || error?.name === "AbortError") {
    return {
      classification: "provider_timeout",
      retryable: true,
      message,
    };
  }
  if (/json/i.test(message) && /parse|unexpected token/i.test(message)) {
    return {
      classification: "provider_response_invalid",
      retryable: false,
      message,
    };
  }
  return {
    classification: "model_execution_error",
    retryable: false,
    message,
  };
}

function ensureArtifactDirs(config) {
  fs.mkdirSync(config.artifactDir, { recursive: true });
  fs.mkdirSync(config.requestDir, { recursive: true });
  fs.mkdirSync(config.responseDir, { recursive: true });
  fs.mkdirSync(config.traceDir, { recursive: true });
}

async function invokeHttpProvider(request, config) {
  const providerRequest = buildProviderRequestBody(request);
  const headers = {
    Accept: "application/json, text/plain;q=0.9, */*;q=0.1",
    "Content-Type": "application/json; charset=utf-8",
    ...(isPlainObject(config.headers) ? stableClone(config.headers) : {}),
  };
  if (config.apiKey) {
    headers.Authorization = `Bearer ${config.apiKey}`;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(new Error("provider_timeout")), config.timeoutMs);
  try {
    const response = await fetch(config.endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(providerRequest),
      signal: controller.signal,
    });
    const text = await response.text();
    const parsed = parseMaybeJson(text);
    return {
      ok: response.ok,
      status: response.status,
      headers: Object.fromEntries(response.headers.entries()),
      body: parsed != null ? parsed : text,
      text,
      providerRequest,
    };
  } finally {
    clearTimeout(timeout);
  }
}

function buildDryRunResponse(request, config) {
  const providerRequest = buildProviderRequestBody(request);
  const preview = {
    dryRun: true,
    provider: summarizeProvider(config),
    requestId: request.requestId,
    traceId: request.traceId,
    replayKey: request.replayKey,
    providerRequest,
  };
  return {
    ok: true,
    status: 200,
    body: preview,
    text: JSON.stringify(preview, null, 2),
    providerRequest,
  };
}

function buildExecutionSummary(request, config, providerResult, failure, status) {
  const provider = summarizeProvider(config);
  const responseSummary = summarizeProviderResponseBody(
    providerResult ? providerResult.body : null,
    providerResult ? providerResult.text : "",
    providerResult ? providerResult.status : null
  );
  const requestArtifact = {
    kind: "model_request",
    requestId: request.requestId,
    traceId: request.traceId,
    replayKey: request.replayKey,
    createdAt: request.createdAt,
    origin: request.origin,
    operation: request.operation,
    dryRun: request.dryRun,
    model: request.model || null,
    provider,
    inputSummary: request.inputSummary,
    toolBoundaries: request.toolBoundaries,
    normalizedPayload: {
      prompt: request.prompt || null,
      messages: request.messages,
      tools: request.tools,
      toolCalls: request.toolCalls,
      metadata: request.metadata,
      replayFrom: request.replayFrom,
    },
    originalPayload: redactSensitiveValue(request.originalPayload || {}),
  };

  const responseArtifact = {
    kind: "model_response",
    requestId: request.requestId,
    traceId: request.traceId,
    createdAt: new Date().toISOString(),
    ok: !!(providerResult && providerResult.ok),
    status: providerResult ? providerResult.status : null,
    provider,
    summary: responseSummary,
    providerRequest: providerResult ? providerResult.providerRequest : buildProviderRequestBody(request),
    providerResponse: providerResult ? providerResult.body : null,
  };

  const traceArtifact = {
    kind: "model_trace",
    requestId: request.requestId,
    traceId: request.traceId,
    replayKey: request.replayKey,
    createdAt: new Date().toISOString(),
    status,
    dryRun: request.dryRun,
    provider,
    request: requestArtifact.inputSummary,
    response: responseSummary,
    toolBoundaries: request.toolBoundaries,
    replay: request.replayFrom,
    failure: failure
      ? {
          classification: failure.classification,
          retryable: !!failure.retryable,
          message: failure.message || null,
          status: typeof failure.status === "number" ? failure.status : null,
        }
      : null,
    fallback: {
      used: status !== "completed",
      reason:
        status === "dry_run"
          ? "preview_only"
          : failure
            ? failure.classification
            : null,
    },
  };

  return {
    ok: status === "completed" || status === "dry_run",
    kind: "model_execution",
    status,
    requestId: request.requestId,
    traceId: request.traceId,
    replayKey: request.replayKey,
    dryRun: request.dryRun,
    provider,
    request: requestArtifact,
    response: responseArtifact,
    trace: traceArtifact,
    failure: traceArtifact.failure,
    fallback: traceArtifact.fallback,
    toolBoundaries: request.toolBoundaries,
  };
}

function writeJson(filePath, payload) {
  fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

function persistExecutionArtifacts(config, execution) {
  ensureArtifactDirs(config);
  const requestFileName = `${safeFileName(execution.requestId, "model-run")}.json`;
  const responseFileName = `${safeFileName(execution.requestId, "model-run")}.json`;
  const traceFileName = `${safeFileName(execution.requestId, "model-run")}.json`;
  const requestPath = path.join(config.requestDir, requestFileName);
  const responsePath = path.join(config.responseDir, responseFileName);
  const tracePath = path.join(config.traceDir, traceFileName);

  writeJson(requestPath, execution.request);
  writeJson(responsePath, execution.response);
  writeJson(tracePath, execution.trace);

  return {
    request: requestPath,
    response: responsePath,
    trace: tracePath,
  };
}

function loadExecutionArtifacts(config, requestId) {
  ensureArtifactDirs(config);
  const safeId = safeFileName(requestId, "");
  if (!safeId) return null;
  const requestPath = path.join(config.requestDir, `${safeId}.json`);
  const responsePath = path.join(config.responseDir, `${safeId}.json`);
  const tracePath = path.join(config.traceDir, `${safeId}.json`);

  if (!fs.existsSync(tracePath)) return null;

  const trace = JSON.parse(fs.readFileSync(tracePath, "utf8"));
  const request = fs.existsSync(requestPath) ? JSON.parse(fs.readFileSync(requestPath, "utf8")) : null;
  const response = fs.existsSync(responsePath) ? JSON.parse(fs.readFileSync(responsePath, "utf8")) : null;
  const stat = fs.statSync(tracePath);

  return {
    file: path.basename(tracePath),
    fullPath: tracePath,
    mtimeMs: stat.mtimeMs,
    request,
    response,
    trace,
    artifacts: {
      request: requestPath,
      response: responsePath,
      trace: tracePath,
    },
  };
}

function listJsonArtifacts(dirPath) {
  try {
    return fs
      .readdirSync(dirPath)
      .filter((file) => file.endsWith(".json"))
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
  } catch (error) {
    return [];
  }
}

function latestExecution(config) {
  ensureArtifactDirs(config);
  const files = listJsonArtifacts(config.traceDir);
  if (!files.length) return null;
  const latest = files[0];
  const loaded = loadExecutionArtifacts(config, path.basename(latest.file, path.extname(latest.file)));
  if (!loaded) return null;
  return loaded;
}

function findExecutionByTraceId(config, traceId) {
  ensureArtifactDirs(config);
  const files = listJsonArtifacts(config.traceDir);
  const target = compactText(traceId);
  if (!target) return null;

  for (const item of files) {
    try {
      const trace = JSON.parse(fs.readFileSync(item.fullPath, "utf8"));
      if (trace && trace.traceId === target) {
        return loadExecutionArtifacts(config, path.basename(item.file, path.extname(item.file)));
      }
    } catch (error) {
      continue;
    }
  }
  return null;
}

function summarizeExecution(execution) {
  if (!execution) return null;
  const trace = execution.trace || {};
  const request = execution.request || {};
  const response = execution.response || {};
  const summary = request.inputSummary || trace.request || null;
  return {
    requestId: trace.requestId || request.requestId || null,
    traceId: trace.traceId || request.traceId || null,
    replayKey: trace.replayKey || request.replayKey || null,
    status: trace.status || null,
    dryRun: !!trace.dryRun,
    providerType: trace.provider ? trace.provider.type || null : null,
    model: trace.provider ? trace.provider.model || null : null,
    failure: trace.failure || null,
    fallback: trace.fallback || null,
    requestSummary: summary,
    responseSummary: response.summary || null,
  };
}

async function executeModelRequest(payload, options = {}) {
  const config = resolveModelBackendConfig(options);
  const availability = providerAvailability(config);
  const request = summarizeRequest(payload || {}, config);
  request.originalPayload = payload || {};

  let providerResult = null;
  let failure = null;
  let status = request.dryRun ? "dry_run" : "completed";

  if (request.dryRun) {
    providerResult = buildDryRunResponse(request, config);
  } else if (!availability.available) {
    failure = classifyFailure(null, { providerReason: availability.reason });
    status = availability.reason === "missing_endpoint" ? "provider_misconfigured" : "provider_unavailable";
  } else {
    try {
      providerResult = await invokeHttpProvider(request, config);
      if (!providerResult.ok) {
        failure = classifyFailure(null, {
          responseStatus: providerResult.status,
        });
        status = providerResult.status >= 500 ? "provider_error" : "provider_rejected";
      } else {
        status = "completed";
      }
    } catch (error) {
      failure = classifyFailure(error, {
        providerReason: availability.reason,
      });
      status = failure.classification;
    }
  }

  const execution = buildExecutionSummary(request, config, providerResult, failure, status);
  execution.providerAvailability = availability;
  execution.artifacts = persistExecutionArtifacts(config, execution);
  execution.requestPath = execution.artifacts.request;
  execution.responsePath = execution.artifacts.response;
  execution.tracePath = execution.artifacts.trace;
  return execution;
}

function buildModelBackendState(config) {
  const availability = providerAvailability(config);
  const latest = latestExecution(config);
  return {
    kind: "model_backend",
    configured: !!availability.configured,
    available: !!availability.available,
    reason: availability.reason || null,
    provider: summarizeProvider(config, availability),
    artifactDir: config.artifactDir,
    dryRunDefault: true,
    latest: latest ? summarizeExecution(latest) : null,
    summary: !availability.configured
      ? "Model backend is disabled; use the raw model endpoint in preview mode first."
      : availability.available
        ? `Model backend ${compactText(config.providerType) || DEFAULT_PROVIDER_TYPE} is ready.`
        : `Model backend ${compactText(config.providerType) || DEFAULT_PROVIDER_TYPE} is configured but unavailable (${availability.reason}).`,
    nextCommand: "mnaipro request post /model/run --json",
  };
}

module.exports = {
  DEFAULT_PROVIDER_TYPE,
  resolveModelBackendConfig,
  providerAvailability,
  summarizeProvider,
  summarizeToolBoundaries,
  summarizeRequest,
  summarizeProviderResponseBody,
  classifyFailure,
  executeModelRequest,
  buildModelBackendState,
  latestExecution,
  loadExecutionArtifacts,
  findExecutionByTraceId,
  summarizeExecution,
};
