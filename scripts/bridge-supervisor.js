const { spawn, spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const http = require("http");
const {
  writeSupervisorState,
} = require("../bridge/supervisor-state");

const ROOT_DIR = path.resolve(__dirname, "..");
const BRIDGE_ENTRY = path.join(ROOT_DIR, "bridge", "server.js");
const NODE_BIN = process.execPath;
const PS_BIN = "/bin/ps";
const PGREP_BIN = "/usr/bin/pgrep";
const STATE_DIR =
  process.env.MN_BRIDGE_SUPERVISOR_STATE_DIR || path.join(ROOT_DIR, "tmp", "bridge-supervisor");
const LOG_PATH = path.join(STATE_DIR, "supervisor.log");
const PID_PATH = path.join(STATE_DIR, "bridge.pid");
const BRIDGE_LOG_PATH = path.join(STATE_DIR, "bridge.log");
const CHECK_INTERVAL_MS = Number(process.env.MN_BRIDGE_CHECK_INTERVAL_MS || 2000);
const BRIDGE_HOST = process.env.MN_AGENT_HOST || "127.0.0.1";
const BRIDGE_PORT = Number(process.env.MN_AGENT_PORT || 8765);
const MARGINNOTE_FORCE_RUNNING = process.env.MN_SUPERVISOR_FORCE_MARGINNOTE_RUNNING === "1";
const MARGINNOTE_FORCE_STATE = String(process.env.MN_SUPERVISOR_FORCE_MARGINNOTE_STATE || "")
  .trim()
  .toLowerCase();
const STOP_AFTER_MISSING_CHECKS = Number(process.env.MN_BRIDGE_STOP_AFTER_MISSING_CHECKS || 3);
const MARGINNOTE_PROCESS_PATTERNS = [
  /\/Applications\/MarginNote 4\.app\/Contents\/MacOS\/MarginNote 4$/,
  /MarginNote 4$/,
  /QReader\.MarginStudy\.easy/,
];

fs.mkdirSync(STATE_DIR, { recursive: true });

let bridgeChild = null;
let bridgeStopping = false;
let marginNoteMissingChecks = 0;
let adoptedBridgePid = 0;
let currentState = {
  updatedAt: now(),
  supervisorPid: process.pid,
  bridgePid: null,
  bridgeRunning: false,
  ownership: "none",
  marginNoteRunning: false,
  lastAction: "init",
  health: null,
};

function now() {
  return new Date().toISOString();
}

function log(message) {
  const line = `[${now()}] ${message}\n`;
  fs.appendFileSync(LOG_PATH, line, "utf8");
  process.stdout.write(line);
}

function commandListFromPgrep() {
  const result = spawnSync(PGREP_BIN, ["-fal", "MarginNote 4|QReader.MarginStudy.easy"], {
    encoding: "utf8",
  });

  if (result.status !== 0 && result.status !== 1) {
    throw new Error(result.stderr || "pgrep_failed");
  }

  return result.stdout
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const match = line.match(/^(\d+)\s+(.+)$/);
      return match
        ? {
            pid: Number(match[1]),
            command: match[2],
          }
        : null;
    })
    .filter(Boolean);
}

function processList() {
  const result = spawnSync(PS_BIN, ["-axo", "pid=,comm="], {
    encoding: "utf8",
  });

  if (result.status !== 0) {
    throw new Error(result.stderr || "ps_failed");
  }

  return result.stdout
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const match = line.match(/^(\d+)\s+(.+)$/);
      return match
        ? {
            pid: Number(match[1]),
            command: match[2],
          }
        : null;
    })
    .filter(Boolean);
}

function detectMarginNoteProcesses() {
  const processSources = [];
  try {
    processSources.push(...commandListFromPgrep());
  } catch (error) {
    log(`pgrep probe failed: ${error.message || String(error)}`);
  }

  try {
    processSources.push(...processList());
  } catch (error) {
    log(`ps probe failed: ${error.message || String(error)}`);
  }

  const byPid = new Map();
  for (const item of processSources) {
    if (!item || !item.pid || !item.command) continue;
    if (!byPid.has(item.pid)) {
      byPid.set(item.pid, item);
    }
  }
  return Array.from(byPid.values());
}

function isMarginNoteRunning() {
  if (MARGINNOTE_FORCE_STATE === "running") {
    return true;
  }
  if (MARGINNOTE_FORCE_STATE === "stopped") {
    return false;
  }
  if (MARGINNOTE_FORCE_RUNNING) {
    return true;
  }
  return detectMarginNoteProcesses().some((item) =>
    MARGINNOTE_PROCESS_PATTERNS.some((pattern) => pattern.test(item.command))
  );
}

function writeBridgeLog(message) {
  const line = `[${now()}] ${message}\n`;
  fs.appendFileSync(BRIDGE_LOG_PATH, line, "utf8");
}

function persistState(patch = {}) {
  currentState = {
    ...currentState,
    ...patch,
    updatedAt: now(),
    supervisorPid: process.pid,
  };
  try {
    writeSupervisorState(STATE_DIR, currentState);
  } catch (error) {
    log(`failed to persist bridge state: ${error.message || String(error)}`);
  }
}

function bridgeHealth() {
  return new Promise((resolve) => {
    const req = http.get(
      {
        host: BRIDGE_HOST,
        port: BRIDGE_PORT,
        path: "/health",
        timeout: 1200,
      },
      (res) => {
        let body = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => {
          body += chunk;
        });
        res.on("end", () => {
          if (res.statusCode !== 200) {
            resolve({ ok: false, statusCode: res.statusCode, body });
            return;
          }
          try {
            resolve(JSON.parse(body));
          } catch (error) {
            resolve({ ok: false, error: error.message || String(error) });
          }
        });
      }
    );

    req.on("timeout", () => {
      req.destroy(new Error("health_timeout"));
    });
    req.on("error", (error) => {
      resolve({ ok: false, error: error.message || String(error) });
    });
  });
}

function isPidAlive(pid) {
  if (!pid) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return false;
  }
}

function commandLineForPid(pid) {
  if (!pid) return "";
  const result = spawnSync(PS_BIN, ["-p", String(pid), "-o", "command="], {
    encoding: "utf8",
  });
  if (result.status !== 0) return "";
  return String(result.stdout || "").trim();
}

function looksLikeManagedBridgePid(pid) {
  if (!isPidAlive(pid)) return false;
  const cmd = commandLineForPid(pid);
  if (!cmd) return false;
  // Only adopt/kill a pid if it looks exactly like the bridge we spawn (absolute path).
  return cmd.includes(BRIDGE_ENTRY);
}

function clearPidFile() {
  try {
    fs.unlinkSync(PID_PATH);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}

function writePidFile(pid) {
  fs.writeFileSync(PID_PATH, String(pid), "utf8");
}

function readPidFile() {
  try {
    const raw = fs.readFileSync(PID_PATH, "utf8").trim();
    const pid = Number(raw);
    return Number.isFinite(pid) ? pid : 0;
  } catch (error) {
    return 0;
  }
}

function startBridge() {
  if (bridgeChild || bridgeStopping) return;

  log("starting bridge process");
  adoptedBridgePid = 0;
  bridgeChild = spawn(NODE_BIN, [BRIDGE_ENTRY], {
    cwd: ROOT_DIR,
    stdio: ["ignore", "pipe", "pipe"],
  });

  writePidFile(bridgeChild.pid);
  persistState({
    bridgePid: bridgeChild.pid,
    bridgeRunning: true,
    ownership: "spawned",
    lastAction: "start_bridge",
  });

  bridgeChild.stdout.on("data", (chunk) => {
    const text = String(chunk).trim();
    if (!text) return;
    log(`[bridge] ${text}`);
    writeBridgeLog(text);
  });

  bridgeChild.stderr.on("data", (chunk) => {
    const text = String(chunk).trim();
    if (!text) return;
    log(`[bridge:stderr] ${text}`);
    writeBridgeLog(`stderr ${text}`);
  });

  bridgeChild.on("exit", (code, signal) => {
    log(`bridge exited code=${code} signal=${signal || "none"}`);
    if (adoptedBridgePid === bridgeChild?.pid) {
      adoptedBridgePid = 0;
    }
    bridgeChild = null;
    bridgeStopping = false;
    clearPidFile();
    persistState({
      bridgePid: null,
      bridgeRunning: false,
      ownership: "stopped",
      lastAction: "bridge_exit",
    });
  });
}

function stopBridge() {
  if (!bridgeChild || bridgeStopping) return;

  bridgeStopping = true;
  log("stopping bridge process");
  persistState({
    bridgePid: bridgeChild.pid,
    bridgeRunning: true,
    ownership: "spawned",
    lastAction: "stop_bridge_requested",
  });
  bridgeChild.kill("SIGTERM");

  setTimeout(() => {
    if (bridgeChild) {
      log("bridge did not exit after SIGTERM, sending SIGKILL");
      bridgeChild.kill("SIGKILL");
    }
  }, 3000);
}

function adoptBridgePid(pid) {
  if (!pid || bridgeChild) return;
  if (adoptedBridgePid === pid) return;
  adoptedBridgePid = pid;
  log(`adopting existing bridge pid=${pid}`);
  persistState({
    bridgePid: pid,
    bridgeRunning: true,
    ownership: "adopted",
    lastAction: "adopt_existing_bridge",
  });
}

function stopAdoptedBridge(pid) {
  if (!pid || bridgeChild || bridgeStopping) return;
  bridgeStopping = true;
  log(`stopping adopted bridge pid=${pid}`);
  persistState({
    bridgePid: pid,
    bridgeRunning: true,
    ownership: "adopted",
    lastAction: "stop_adopted_bridge_requested",
  });
  try {
    process.kill(pid, "SIGTERM");
  } catch (error) {
    log(`failed to SIGTERM adopted bridge pid=${pid}: ${error.message || String(error)}`);
    adoptedBridgePid = 0;
    bridgeStopping = false;
    clearPidFile();
    return;
  }

  setTimeout(() => {
    if (adoptedBridgePid !== pid) return;
    if (isPidAlive(pid)) {
      log(`adopted bridge pid=${pid} did not exit after SIGTERM, sending SIGKILL`);
      try {
        process.kill(pid, "SIGKILL");
      } catch (error) {
        log(`failed to SIGKILL adopted bridge pid=${pid}: ${error.message || String(error)}`);
      }
    }
  }, 3000);

  const deadline = Date.now() + 8000;
  const poll = setInterval(() => {
    if (adoptedBridgePid !== pid) {
      clearInterval(poll);
      return;
    }
    if (!isPidAlive(pid)) {
      log(`adopted bridge pid=${pid} stopped`);
      adoptedBridgePid = 0;
      bridgeStopping = false;
      clearPidFile();
      persistState({
        bridgePid: null,
        bridgeRunning: false,
        ownership: "stopped",
        lastAction: "adopted_bridge_stopped",
      });
      clearInterval(poll);
      return;
    }
    if (Date.now() > deadline) {
      log(`adopted bridge pid=${pid} still alive after stop attempts; leaving pid file intact`);
      bridgeStopping = false;
      clearInterval(poll);
    }
  }, 200);
}

async function reconcile() {
  try {
    const marginNoteRunning = isMarginNoteRunning();
    const health = await bridgeHealth();
    const pidFromFile = readPidFile();
    persistState({
      marginNoteRunning,
      health: !!(health && health.ok),
    });
    const adoptedAlive =
      adoptedBridgePid && looksLikeManagedBridgePid(adoptedBridgePid) ? adoptedBridgePid : 0;
    if (adoptedBridgePid && !adoptedAlive) {
      adoptedBridgePid = 0;
      clearPidFile();
      bridgeStopping = false;
      persistState({
        bridgePid: null,
        bridgeRunning: false,
        ownership: "stopped",
        lastAction: "adopted_bridge_stopped",
      });
    }
    const pidFromFileManaged =
      pidFromFile && looksLikeManagedBridgePid(pidFromFile) ? pidFromFile : 0;

    if (marginNoteRunning) {
      marginNoteMissingChecks = 0;

      if (health && health.ok) {
        if (!bridgeChild && pidFromFileManaged) {
          adoptBridgePid(pidFromFileManaged);
          log(`bridge already healthy on ${BRIDGE_HOST}:${BRIDGE_PORT}, pid=${pidFromFileManaged}`);
          return;
        }
        if (!bridgeChild) {
          log(`bridge already healthy on ${BRIDGE_HOST}:${BRIDGE_PORT}, external_or_existing=true`);
          persistState({
            bridgePid: pidFromFile || null,
            bridgeRunning: true,
            ownership: pidFromFile ? "external" : "none",
            lastAction: "observe_healthy_bridge",
          });
        }
        return;
      }

      if (!bridgeChild) startBridge();
      return;
    }

    marginNoteMissingChecks += 1;
    if (marginNoteMissingChecks < STOP_AFTER_MISSING_CHECKS) {
      log(`MarginNote not detected yet (${marginNoteMissingChecks}/${STOP_AFTER_MISSING_CHECKS}); keeping bridge state unchanged`);
      return;
    }

    if (bridgeChild) {
      stopBridge();
      return;
    }

    if (pidFromFileManaged && health && health.ok) {
      adoptBridgePid(pidFromFileManaged);
      stopAdoptedBridge(pidFromFileManaged);
      return;
    }

    if (adoptedAlive && health && health.ok) {
      stopAdoptedBridge(adoptedAlive);
      return;
    }

    if (pidFromFile && isPidAlive(pidFromFile) && health && health.ok) {
      log("MarginNote absent for threshold checks; leaving externally healthy bridge running");
      persistState({
        bridgePid: pidFromFile,
        bridgeRunning: true,
        ownership: "external",
        lastAction: "leave_external_bridge_running",
      });
      return;
    }
  } catch (error) {
    log(`supervisor reconcile error: ${error.message || String(error)}`);
  }
}

function shutdown() {
  log("supervisor shutting down");
  if (bridgeChild) {
    try {
      bridgeChild.kill("SIGTERM");
    } catch (error) {
      log(`shutdown kill error: ${error.message || String(error)}`);
    }
  } else if (adoptedBridgePid && looksLikeManagedBridgePid(adoptedBridgePid)) {
    try {
      process.kill(adoptedBridgePid, "SIGTERM");
    } catch (error) {
      log(`shutdown kill adopted pid error: ${error.message || String(error)}`);
    }
  }
  clearPidFile();
  persistState({
    bridgePid: null,
    bridgeRunning: false,
    ownership: "stopped",
    lastAction: "shutdown",
  });
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

log(`supervisor starting with Node ${NODE_BIN}`);
persistState({
  bridgePid: null,
  bridgeRunning: false,
  ownership: "none",
  lastAction: "start_supervisor",
});
reconcile();
setInterval(() => {
  reconcile();
}, CHECK_INTERVAL_MS);
