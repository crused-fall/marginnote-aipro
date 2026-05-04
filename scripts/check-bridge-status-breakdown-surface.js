const assert = require("assert");
const fs = require("fs");
const os = require("os");
const net = require("net");
const path = require("path");
const { spawn } = require("child_process");

const ROOT_DIR = path.resolve(__dirname, "..");
const SERVER_SCRIPT = path.join(ROOT_DIR, "bridge", "server.js");

function writeJsonFile(fullPath, payload) {
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, JSON.stringify(payload, null, 2), "utf8");
}

function sampleNodes() {
  return [
    {
      noteId: "bd-root",
      parentNoteId: null,
      title: "Chapter 1",
      tags: [],
      mainExcerptText: "",
      allText: "Chapter 1",
      commentsText: [],
      childNoteIds: ["bd-a"],
      colorIndex: 0,
      fillIndex: 0,
      visibleInMindMap: true,
      branchClosed: false,
      hidden: false,
      zLevel: 0,
      groupMode: "",
    },
    {
      noteId: "bd-a",
      parentNoteId: "bd-root",
      title: "Topic A",
      tags: [],
      mainExcerptText: "",
      allText: "Topic A",
      commentsText: [],
      childNoteIds: [],
      colorIndex: 3,
      fillIndex: 0,
      visibleInMindMap: true,
      branchClosed: false,
      hidden: false,
      zLevel: 1,
      groupMode: "",
    },
  ];
}

function createArtifacts(tempDir) {
  const bridgeDir = path.join(tempDir, "bridge");
  const reportsDir = path.join(bridgeDir, "reports");
  const requestsDir = path.join(bridgeDir, "requests");
  const responsesDir = path.join(bridgeDir, "responses");
  const diagnosticsDir = path.join(bridgeDir, "diagnostics");
  fs.mkdirSync(reportsDir, { recursive: true });
  fs.mkdirSync(requestsDir, { recursive: true });
  fs.mkdirSync(responsesDir, { recursive: true });
  fs.mkdirSync(diagnosticsDir, { recursive: true });

  const requestId = "7000000000001-555555";
  writeJsonFile(path.join(requestsDir, `mnaipro-${requestId}.json`), {
    origin: "native_ai_breakdown",
    objective: "整理 AI Breakdown 分支",
    stage: "primary",
    dryRun: true,
    nodes: sampleNodes(),
  });
  writeJsonFile(path.join(reportsDir, `mnaipro-${requestId}-plan.json`), {
    origin: "native_ai_breakdown",
    objective: "整理 AI Breakdown 分支",
    stage: "primary",
    actions: [{ type: "set_color_index", noteId: "bd-a" }],
    notes: [{ type: "native_ai_breakdown_context" }],
    unsupportedActions: [],
    strategyPacks: [{ type: "visual_branch_strategy" }],
  });
  writeJsonFile(path.join(reportsDir, `mnaipro-${requestId}-apply-7000000000100.json`), {
    origin: "native_ai_breakdown",
    command: "整理 AI Breakdown 分支",
    objective: "整理 AI Breakdown 分支",
    rootNoteId: "bd-root",
    actionCount: 1,
    results: [{ ok: true, type: "set_color_index", noteId: "bd-a" }],
    afterBranch: {
      notes: sampleNodes(),
    },
  });
  writeJsonFile(path.join(reportsDir, `mnaipro-${requestId}-followup.json`), {
    origin: "native_ai_breakdown",
    objective: "整理 AI Breakdown 分支",
    stage: "followup",
    actions: [
      {
        type: "rewrite_excerpt",
        noteId: "bd-root",
        meta: { source: "branch_structure_digest" },
      },
    ],
    notes: [],
    unsupportedActions: [],
    strategyPacks: [{ type: "visual_branch_strategy" }],
  });
  writeJsonFile(path.join(reportsDir, `mnaipro-${requestId}-followup-apply-7000000000101.json`), {
    origin: "native_ai_breakdown",
    command: "整理 AI Breakdown 分支",
    objective: "整理 AI Breakdown 分支",
    rootNoteId: "bd-root",
    actionCount: 1,
    results: [{ ok: true, type: "rewrite_excerpt", noteId: "bd-root" }],
    afterBranch: {
      notes: sampleNodes(),
    },
  });

  return { bridgeDir, requestId };
}

function getFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      server.close(() => {
        if (!address || typeof address === "string") {
          reject(new Error("free_port_unavailable"));
          return;
        }
        resolve(address.port);
      });
    });
  });
}

function startBridgeServer(port, bridgeDir) {
  const child = spawn(process.execPath, [SERVER_SCRIPT], {
    cwd: ROOT_DIR,
    env: {
      ...process.env,
      MN_AGENT_PORT: String(port),
      MN_AGENT_HOST: "127.0.0.1",
      MN_AGENT_BRIDGE_DIR: bridgeDir,
      MN_AGENT_REPORTS_DIR: path.join(bridgeDir, "reports"),
      MN_AGENT_REQUESTS_DIR: path.join(bridgeDir, "requests"),
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  const logs = { stdout: "", stderr: "" };
  child.stdout.on("data", (chunk) => {
    logs.stdout += chunk.toString("utf8");
  });
  child.stderr.on("data", (chunk) => {
    logs.stderr += chunk.toString("utf8");
  });
  return { child, logs };
}

async function stopBridgeServer(server) {
  if (!server || !server.child) return;
  await new Promise((resolve) => {
    if (server.child.exitCode !== null || server.child.signalCode !== null) {
      resolve();
      return;
    }
    const timeout = setTimeout(() => {
      try {
        server.child.kill("SIGKILL");
      } catch (error) {
        // ignore best effort
      }
    }, 3000);
    server.child.once("exit", () => {
      clearTimeout(timeout);
      resolve();
    });
    try {
      server.child.kill("SIGTERM");
    } catch (error) {
      clearTimeout(timeout);
      resolve();
    }
  });
}

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
    },
  });
  const text = await response.text();
  return {
    ok: response.ok,
    status: response.status,
    payload: text ? JSON.parse(text) : null,
  };
}

async function waitForStatus(baseUrl, server, timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs;
  let lastError = null;
  while (Date.now() < deadline) {
    if (server.child.exitCode !== null || server.child.signalCode !== null) {
      throw new Error(
        `bridge server exited early with code ${server.child.exitCode}\n${server.logs.stderr || server.logs.stdout || "(no output)"}`
      );
    }
    try {
      const status = await fetchJson(`${baseUrl}/status`);
      if (status.ok && status.payload && status.payload.ok === true) {
        return status;
      }
      lastError = new Error(`unexpected_status_${status.status}`);
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(
    `bridge status not ready: ${lastError ? lastError.message : "timeout"}\n${server.logs.stderr || server.logs.stdout || "(no output)"}`
  );
}

async function main() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "mnaipro-bridge-status-breakdown-"));
  const { bridgeDir, requestId } = createArtifacts(tempDir);
  const port = await getFreePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const server = startBridgeServer(port, bridgeDir);

  try {
    const status = await waitForStatus(baseUrl, server);
    assert(status.payload, "missing /status payload");
    assert(status.payload.breakdownArtifacts, "raw /status missing breakdownArtifacts");
    assert.strictEqual(
      status.payload.breakdownArtifacts.status,
      "complete",
      `unexpected raw /status breakdown status: ${status.payload.breakdownArtifacts.status}`
    );
    assert.strictEqual(
      status.payload.breakdownArtifacts.primaryChain.requestId,
      requestId,
      `unexpected request id: ${status.payload.breakdownArtifacts.primaryChain.requestId}`
    );
    assert.strictEqual(
      status.payload.breakdownArtifacts.followupChain.complete,
      true,
      "followup chain should be complete"
    );
    assert.strictEqual(
      status.payload.breakdownArtifacts.nextCommand,
      "mnaipro breakdown postprocess --json",
      `unexpected breakdown audit next command: ${status.payload.breakdownArtifacts.nextCommand}`
    );
    assert.strictEqual(
      status.payload.breakdownNextCommand,
      "mnaipro breakdown postprocess --json",
      `unexpected /status next command: ${status.payload.breakdownNextCommand}`
    );
    process.stdout.write("Bridge /status Breakdown audit surface OK\n");
  } finally {
    await stopBridgeServer(server);
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

main().catch((error) => {
  process.stderr.write(`${error && error.stack ? error.stack : String(error)}\n`);
  process.exitCode = 1;
});
