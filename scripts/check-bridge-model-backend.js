const assert = require("assert");
const fs = require("fs");
const http = require("http");
const os = require("os");
const path = require("path");
const { spawn } = require("child_process");

function writeJson(filePath, payload) {
  fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

function startJsonServer(handler) {
  return new Promise((resolve, reject) => {
    const server = http.createServer(async (req, res) => {
      let raw = "";
      req.setEncoding("utf8");
      req.on("data", (chunk) => {
        raw += chunk;
      });
      req.on("end", async () => {
        let body = null;
        try {
          body = raw ? JSON.parse(raw) : {};
        } catch (error) {
          body = { parseError: error.message || String(error), raw };
        }
        try {
          const payload = await handler(req, body);
          const json = JSON.stringify(payload, null, 2);
          res.writeHead(200, {
            "Content-Type": "application/json; charset=utf-8",
            "Content-Length": Buffer.byteLength(json),
          });
          res.end(json);
        } catch (error) {
          const json = JSON.stringify(
            {
              ok: false,
              error: error.message || String(error),
            },
            null,
            2
          );
          res.writeHead(500, {
            "Content-Type": "application/json; charset=utf-8",
            "Content-Length": Buffer.byteLength(json),
          });
          res.end(json);
        }
      });
      req.on("error", reject);
    });

    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      resolve({
        server,
        port: address.port,
      });
    });
    server.on("error", reject);
  });
}

function spawnCli(args, extraEnv = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [path.join(__dirname, "..", "cli", "mnaipro.js"), ...args],
      {
        cwd: path.join(__dirname, ".."),
        stdio: ["ignore", "pipe", "pipe"],
        env: {
          ...process.env,
          ...extraEnv,
        },
      }
    );
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", reject);
    child.on("close", (status, signal) => {
      resolve({
        status,
        signal,
        stdout,
        stderr,
      });
    });
  });
}

function parseJson(label, text) {
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`${label} did not emit JSON: ${error.message}\n${text}`);
  }
}

async function main() {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "mnaipro-model-backend-"));
  const artifactDir = path.join(tempRoot, "model-artifacts");
  const disabledArtifactDir = path.join(tempRoot, "model-artifacts-disabled");
  const bridgeDir = path.join(tempRoot, "bridge-cache");
  const requestsDir = path.join(tempRoot, "requests");
  const responsesDir = path.join(tempRoot, "responses");
  const reportsDir = path.join(tempRoot, "reports");
  const diagnosticsDir = path.join(tempRoot, "diagnostics");

  fs.mkdirSync(requestsDir, { recursive: true });
  fs.mkdirSync(responsesDir, { recursive: true });
  fs.mkdirSync(reportsDir, { recursive: true });
  fs.mkdirSync(diagnosticsDir, { recursive: true });

  const originalEnv = {
    MN_AGENT_BRIDGE_DIR: process.env.MN_AGENT_BRIDGE_DIR,
    MN_AGENT_MODEL_DIR: process.env.MN_AGENT_MODEL_DIR,
    MN_AGENT_REQUESTS_DIR: process.env.MN_AGENT_REQUESTS_DIR,
    MN_AGENT_RESPONSES_DIR: process.env.MN_AGENT_RESPONSES_DIR,
    MN_AGENT_REPORTS_DIR: process.env.MN_AGENT_REPORTS_DIR,
    MN_AGENT_DIAGNOSTICS_DIR: process.env.MN_AGENT_DIAGNOSTICS_DIR,
    MN_MODEL_PROVIDER: process.env.MN_MODEL_PROVIDER,
    MN_MODEL_ENDPOINT: process.env.MN_MODEL_ENDPOINT,
    MN_MODEL_MODEL: process.env.MN_MODEL_MODEL,
    MN_MODEL_TIMEOUT_MS: process.env.MN_MODEL_TIMEOUT_MS,
  };

  process.env.MN_AGENT_BRIDGE_DIR = bridgeDir;
  process.env.MN_AGENT_MODEL_DIR = artifactDir;
  process.env.MN_AGENT_REQUESTS_DIR = requestsDir;
  process.env.MN_AGENT_RESPONSES_DIR = responsesDir;
  process.env.MN_AGENT_REPORTS_DIR = reportsDir;
  process.env.MN_AGENT_DIAGNOSTICS_DIR = diagnosticsDir;
  process.env.MN_MODEL_PROVIDER = "http";
  process.env.MN_MODEL_MODEL = "mock-model";
  process.env.MN_MODEL_TIMEOUT_MS = "5000";

  const providerCalls = [];
  const provider = await startJsonServer(async (_req, body) => {
    providerCalls.push(body);
    return {
      ok: true,
      output: `ack:${body.requestId}`,
      toolCalls: [
        {
          id: "tool-1",
          name: "summarize",
          type: "function",
        },
      ],
      usage: {
        promptTokens: 3,
        completionTokens: 4,
        totalTokens: 7,
      },
      finishReason: "stop",
    };
  });

  process.env.MN_MODEL_ENDPOINT = `http://127.0.0.1:${provider.port}/invoke`;

  const modelBackend = require("../bridge/model-backend");
  const bridge = require("../bridge/server");
  const { executeModelRequest, buildModelBackendState, resolveModelBackendConfig } = modelBackend;

  try {
    const fallbackExecution = await executeModelRequest(
      {
        prompt: "preview this branch",
        dryRun: false,
        metadata: { source: "unit-test" },
      },
      {
        rootDir: tempRoot,
        artifactDir: disabledArtifactDir,
        providerType: "disabled",
        env: {
          MN_MODEL_PROVIDER: "disabled",
        },
      }
    );

    assert.strictEqual(fallbackExecution.ok, false, "disabled provider should not execute");
    assert.strictEqual(
      fallbackExecution.status,
      "provider_unavailable",
      `unexpected fallback status: ${fallbackExecution.status}`
    );
    assert.strictEqual(
      fallbackExecution.failure && fallbackExecution.failure.classification,
      "provider_unavailable",
      "disabled provider should classify as unavailable"
    );
    assert(
      fallbackExecution.fallback && fallbackExecution.fallback.used,
      "fallback execution should report fallback.used"
    );
    assert(
      fallbackExecution.trace && Array.isArray(fallbackExecution.trace.toolBoundaries),
      "fallback execution should include tool boundaries"
    );

    const readyConfig = resolveModelBackendConfig({
      rootDir: tempRoot,
      artifactDir,
      env: process.env,
    });
    const backendState = buildModelBackendState(readyConfig);
    assert.strictEqual(backendState.configured, true, "expected provider to be configured");
    assert.strictEqual(backendState.available, true, "expected provider to be available");
    assert.strictEqual(backendState.provider.type, "http", "expected HTTP provider");

    const server = bridge.createServer();
    await new Promise((resolve) => {
      server.listen(0, "127.0.0.1", resolve);
    });
    const bridgePort = server.address().port;
    const baseUrl = `http://127.0.0.1:${bridgePort}`;

    try {
      const requestBody = {
        prompt: "Summarize this branch",
        dryRun: false,
        messages: [
          {
            role: "user",
            content: "Summarize this branch",
          },
        ],
        toolCalls: [
          {
            id: "call-1",
            name: "summarize",
            type: "function",
          },
        ],
        metadata: {
          source: "cli-test",
          branchId: "branch-123",
        },
      };
      const postResult = await spawnCli(
        [
          "--base-url",
          baseUrl,
          "request",
          "post",
          "/model/run",
          "--body",
          JSON.stringify(requestBody),
          "--json",
        ],
        {
          MN_AGENT_BRIDGE_DIR: bridgeDir,
          MN_AGENT_MODEL_DIR: artifactDir,
          MN_AGENT_REQUESTS_DIR: requestsDir,
          MN_AGENT_RESPONSES_DIR: responsesDir,
          MN_AGENT_REPORTS_DIR: reportsDir,
          MN_AGENT_DIAGNOSTICS_DIR: diagnosticsDir,
          MN_MODEL_PROVIDER: "http",
          MN_MODEL_ENDPOINT: process.env.MN_MODEL_ENDPOINT,
          MN_MODEL_MODEL: "mock-model",
          MN_MODEL_TIMEOUT_MS: "5000",
        }
      );

      assert.strictEqual(
        postResult.status,
        0,
        `request post failed: ${postResult.stderr || postResult.stdout}`
      );

      const post = parseJson("request post /model/run", postResult.stdout);
      const run = post.body;
      assert.strictEqual(post.ok, true, "expected HTTP request to succeed");
      assert.strictEqual(post.status, 200, `unexpected HTTP status: ${post.status}`);
      assert(run, "expected model run body");
      assert.strictEqual(run.ok, true, "expected model run to succeed");
      assert.strictEqual(run.status, "completed", `unexpected model run status: ${run.status}`);
      assert.strictEqual(run.provider.type, "http", "expected HTTP provider trace");
      assert.strictEqual(run.provider.available, true, "expected provider to be available");
      assert(run.trace, "expected trace payload");
      assert.strictEqual(run.trace.status, "completed", "expected completed trace");
      assert.strictEqual(run.trace.failure, null, "expected successful trace");
      assert(Array.isArray(run.trace.toolBoundaries), "expected tool boundaries in trace");
      assert(run.trace.toolBoundaries.length >= 2, "expected request and response boundaries");
      assert.strictEqual(
        run.trace.request.messageCount,
        1,
        `unexpected request message count: ${run.trace.request.messageCount}`
      );
      assert.strictEqual(
        run.trace.response.toolCallCount,
        1,
        `unexpected response tool call count: ${run.trace.response.toolCallCount}`
      );
      assert.strictEqual(providerCalls.length, 1, "provider should have been called once");
      assert.strictEqual(providerCalls[0].dryRun, false, "provider should see execute mode");
      assert.strictEqual(providerCalls[0].requestId, run.requestId, "provider request id mismatch");
      assert(providerCalls[0].replayKey, "provider request should include replayKey");
      assert(Array.isArray(providerCalls[0].toolBoundaries), "provider request should include tool boundaries");

      const requestArtifact = path.join(artifactDir, "requests", `${run.requestId}.json`);
      const responseArtifact = path.join(artifactDir, "responses", `${run.requestId}.json`);
      const traceArtifact = path.join(artifactDir, "traces", `${run.requestId}.json`);
      assert(fs.existsSync(requestArtifact), `missing request artifact: ${requestArtifact}`);
      assert(fs.existsSync(responseArtifact), `missing response artifact: ${responseArtifact}`);
      assert(fs.existsSync(traceArtifact), `missing trace artifact: ${traceArtifact}`);

      const latestResult = await spawnCli(
        [
          "--base-url",
          baseUrl,
          "request",
          "get",
          "/model/latest",
          "--json",
        ],
        {
          MN_AGENT_BRIDGE_DIR: bridgeDir,
          MN_AGENT_MODEL_DIR: artifactDir,
          MN_AGENT_REQUESTS_DIR: requestsDir,
          MN_AGENT_RESPONSES_DIR: responsesDir,
          MN_AGENT_REPORTS_DIR: reportsDir,
          MN_AGENT_DIAGNOSTICS_DIR: diagnosticsDir,
          MN_MODEL_PROVIDER: "http",
          MN_MODEL_ENDPOINT: process.env.MN_MODEL_ENDPOINT,
          MN_MODEL_MODEL: "mock-model",
          MN_MODEL_TIMEOUT_MS: "5000",
        }
      );
      assert.strictEqual(latestResult.status, 0, `request get failed: ${latestResult.stderr || latestResult.stdout}`);
      const latest = parseJson("request get /model/latest", latestResult.stdout);
      assert.strictEqual(latest.ok, true, "expected latest model trace to be visible");
      assert.strictEqual(latest.status, 200, `unexpected latest HTTP status: ${latest.status}`);
      assert(latest.body, "expected latest trace body");
      assert.strictEqual(latest.body.summary.status, "completed", "unexpected latest trace status");
      assert.strictEqual(latest.body.summary.providerType, "http", "unexpected latest provider type");
      assert.strictEqual(
        latest.body.summary.requestMessageCount,
        1,
        "unexpected latest request count"
      );

      const replayResult = await spawnCli(
        [
          "--base-url",
          baseUrl,
          "request",
          "post",
          "/model/replay",
          "--body",
          JSON.stringify({
            traceId: run.traceId,
            dryRun: false,
          }),
          "--json",
        ],
        {
          MN_AGENT_BRIDGE_DIR: bridgeDir,
          MN_AGENT_MODEL_DIR: artifactDir,
          MN_AGENT_REQUESTS_DIR: requestsDir,
          MN_AGENT_RESPONSES_DIR: responsesDir,
          MN_AGENT_REPORTS_DIR: reportsDir,
          MN_AGENT_DIAGNOSTICS_DIR: diagnosticsDir,
          MN_MODEL_PROVIDER: "http",
          MN_MODEL_ENDPOINT: process.env.MN_MODEL_ENDPOINT,
          MN_MODEL_MODEL: "mock-model",
          MN_MODEL_TIMEOUT_MS: "5000",
        }
      );
      assert.strictEqual(
        replayResult.status,
        0,
        `model replay failed: ${replayResult.stderr || replayResult.stdout}`
      );
      const replay = parseJson("request post /model/replay", replayResult.stdout);
      assert.strictEqual(replay.ok, true, "expected HTTP replay request to succeed");
      assert.strictEqual(replay.status, 200, `unexpected replay HTTP status: ${replay.status}`);
      assert(replay.body, "expected replay body");
      assert.strictEqual(
        replay.body.replayOf.traceId,
        run.traceId,
        "replay should reference original trace"
      );
      assert.strictEqual(replay.body.trace.status, "completed", "replay trace should complete");
      assert.strictEqual(providerCalls.length, 2, "provider should have been called twice");
      assert.strictEqual(
        replay.body.trace.replay.requestId,
        run.requestId,
        "replay trace should carry replay metadata"
      );

      const statusResult = await fetch(`${baseUrl}/status`, {
        headers: {
          Accept: "application/json",
        },
      });
      assert.strictEqual(statusResult.ok, true, "/status should stay healthy");
      const status = await statusResult.json();
      assert(status.modelBackend, "expected model backend status in bridge /status");
      assert.strictEqual(status.modelBackend.configured, true, "expected configured model backend");
      assert.strictEqual(status.modelBackend.available, true, "expected available model backend");
      assert(status.latestModelExecution, "expected latest model execution in status");
      assert.strictEqual(
        status.latestModelExecution.summary.status,
        "completed",
        "expected latest model execution summary"
      );
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }

    process.stdout.write("Bridge model backend checks OK\n");
  } finally {
    provider.server.close();
    for (const [key, value] of Object.entries(originalEnv)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
}

main().catch((error) => {
  process.stderr.write(`${error.stack || error.message || String(error)}\n`);
  process.exitCode = 1;
});
