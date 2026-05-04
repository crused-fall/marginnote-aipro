const assert = require("assert");
const fs = require("fs");
const http = require("http");
const net = require("net");
const os = require("os");
const path = require("path");
const { spawn, spawnSync } = require("child_process");

const ROOT_DIR = path.resolve(__dirname, "..");
const BRIDGE_ENTRY = path.join(ROOT_DIR, "bridge", "server.js");
const SUPERVISOR_ENTRY = path.join(ROOT_DIR, "scripts", "bridge-supervisor.js");
const BRIDGE_DOCTOR_ENTRY = path.join(ROOT_DIR, "scripts", "bridge-doctor.js");

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    http
      .get(url, (res) => {
        let data = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => {
          data += chunk;
        });
        res.on("end", () => {
          try {
            resolve(JSON.parse(data));
          } catch (error) {
            reject(error);
          }
        });
      })
      .on("error", reject);
  });
}

async function waitForBridgeHealth(baseUrl, processInfo, timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs;
  let lastError = null;
  while (Date.now() < deadline) {
    if (processInfo.child.exitCode !== null || processInfo.child.signalCode !== null) {
      throw new Error(
        `bridge exited early code=${processInfo.child.exitCode} stderr=${processInfo.stderr || "(none)"}`
      );
    }
    try {
      const status = await fetchJson(`${baseUrl}/health`);
      if (status && status.ok === true) {
        return status;
      }
      lastError = new Error(`unexpected_health_${JSON.stringify(status)}`);
    } catch (error) {
      lastError = error;
    }
    await sleep(100);
  }
  throw new Error(`bridge not healthy: ${lastError ? lastError.message : "timeout"}`);
}

async function waitForExit(processInfo, timeoutMs = 7000) {
  if (processInfo.child.exitCode !== null || processInfo.child.signalCode !== null) {
    return {
      code: processInfo.child.exitCode,
      signal: processInfo.child.signalCode,
    };
  }
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error("process_exit_timeout"));
    }, timeoutMs);
    processInfo.child.once("exit", (code, signal) => {
      clearTimeout(timer);
      resolve({ code, signal });
    });
  });
}

function startProcess(scriptPath, env) {
  const child = spawn(process.execPath, [scriptPath], {
    cwd: ROOT_DIR,
    env: {
      ...process.env,
      ...env,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  const info = {
    child,
    stdout: "",
    stderr: "",
  };
  child.stdout.on("data", (chunk) => {
    info.stdout += chunk.toString("utf8");
  });
  child.stderr.on("data", (chunk) => {
    info.stderr += chunk.toString("utf8");
  });
  return info;
}

async function main() {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "mnaipro-supervisor-stop-"));
  const stateDir = path.join(tempRoot, "state");
  const queueDir = path.join(tempRoot, "queue");
  const requestsDir = path.join(queueDir, "requests");
  const responsesDir = path.join(queueDir, "responses");
  const reportsDir = path.join(queueDir, "reports");
  const diagnosticsDir = path.join(queueDir, "diagnostics");
  fs.mkdirSync(stateDir, { recursive: true });
  fs.mkdirSync(requestsDir, { recursive: true });
  fs.mkdirSync(responsesDir, { recursive: true });
  fs.mkdirSync(reportsDir, { recursive: true });
  fs.mkdirSync(diagnosticsDir, { recursive: true });

  const port = await getFreePort();
  const baseUrl = `http://127.0.0.1:${port}`;

  const bridge = startProcess(BRIDGE_ENTRY, {
    MN_AGENT_HOST: "127.0.0.1",
    MN_AGENT_PORT: String(port),
    MN_AGENT_REQUESTS_DIR: requestsDir,
    MN_AGENT_RESPONSES_DIR: responsesDir,
    MN_AGENT_REPORTS_DIR: reportsDir,
    MN_AGENT_DIAGNOSTICS_DIR: diagnosticsDir,
  });

  const supervisor = {
    child: null,
    stdout: "",
    stderr: "",
  };

  try {
    await waitForBridgeHealth(baseUrl, bridge);
    fs.writeFileSync(path.join(stateDir, "bridge.pid"), String(bridge.child.pid), "utf8");

    Object.assign(
      supervisor,
      startProcess(SUPERVISOR_ENTRY, {
        MN_AGENT_HOST: "127.0.0.1",
        MN_AGENT_PORT: String(port),
        MN_AGENT_REQUESTS_DIR: requestsDir,
        MN_AGENT_RESPONSES_DIR: responsesDir,
        MN_AGENT_REPORTS_DIR: reportsDir,
        MN_AGENT_DIAGNOSTICS_DIR: diagnosticsDir,
        MN_BRIDGE_SUPERVISOR_STATE_DIR: stateDir,
        MN_BRIDGE_CHECK_INTERVAL_MS: "150",
        MN_BRIDGE_STOP_AFTER_MISSING_CHECKS: "1",
        MN_SUPERVISOR_FORCE_MARGINNOTE_STATE: "stopped",
      })
    );

    const exit = await waitForExit(bridge, 7000);
    assert.notStrictEqual(
      exit,
      null,
      "expected supervisor to stop the adopted bridge when MarginNote is forced stopped"
    );

    const supervisorLogPath = path.join(stateDir, "supervisor.log");
    const logText = fs.existsSync(supervisorLogPath)
      ? fs.readFileSync(supervisorLogPath, "utf8")
      : "";
    assert(
      /stopping adopted bridge pid=/.test(logText),
      `expected supervisor log to mention adopted bridge stop, got:\n${logText}`
    );

    const statePath = path.join(stateDir, "bridge-state.json");
    const stateDeadline = Date.now() + 5000;
    while (
      (!fs.existsSync(statePath) ||
        JSON.parse(fs.readFileSync(statePath, "utf8")).ownership !== "stopped") &&
      Date.now() < stateDeadline
    ) {
      await sleep(100);
    }
    assert.strictEqual(fs.existsSync(statePath), true, "expected supervisor bridge-state.json");
    const state = JSON.parse(fs.readFileSync(statePath, "utf8"));
    assert.strictEqual(state.ownership, "stopped", "expected stopped ownership in bridge state");
    assert.strictEqual(state.bridgePid, null, "expected cleared bridge pid in bridge state");

    const bridgeDoctorResult = spawnSync(process.execPath, [BRIDGE_DOCTOR_ENTRY], {
      encoding: "utf8",
      env: {
        ...process.env,
        MN_BRIDGE_SUPERVISOR_STATE_DIR: stateDir,
      },
    });
    assert.strictEqual(
      bridgeDoctorResult.status,
      0,
      `bridge doctor exited with ${bridgeDoctorResult.status}: ${bridgeDoctorResult.stderr || bridgeDoctorResult.stdout}`
    );
    const bridgeDoctor = JSON.parse(bridgeDoctorResult.stdout);
    assert.strictEqual(
      bridgeDoctor.bridgeSupervisorState && bridgeDoctor.bridgeSupervisorState.ownership,
      "stopped",
      "expected bridge doctor to expose stopped bridge supervisor ownership"
    );
    assert(
      typeof bridgeDoctor.summary === "string" && /bridge supervisor stopped/.test(bridgeDoctor.summary),
      `expected bridge doctor summary to mention stopped supervisor, got:\n${bridgeDoctor.summary || ""}`
    );

    const pidFilePath = path.join(stateDir, "bridge.pid");
    const clearDeadline = Date.now() + 2500;
    while (fs.existsSync(pidFilePath) && Date.now() < clearDeadline) {
      await sleep(100);
    }
    assert.strictEqual(
      fs.existsSync(pidFilePath),
      false,
      "expected supervisor to clear bridge.pid after stop"
    );

    process.stdout.write(
      `Bridge supervisor managed-stop check OK: port=${port} bridge_pid=${bridge.child.pid}\n`
    );
  } finally {
    if (supervisor.child && supervisor.child.exitCode === null && supervisor.child.signalCode === null) {
      supervisor.child.kill("SIGTERM");
      await sleep(200);
      if (supervisor.child.exitCode === null && supervisor.child.signalCode === null) {
        supervisor.child.kill("SIGKILL");
      }
    }
    if (bridge.child.exitCode === null && bridge.child.signalCode === null) {
      bridge.child.kill("SIGKILL");
    }
  }
}

main().catch((error) => {
  process.stderr.write(`${error.stack || error.message || String(error)}\n`);
  process.exitCode = 1;
});
