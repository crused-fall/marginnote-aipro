const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");
const { bridgeStatus, latestDiagnosticWithFallback } = require("../bridge/server");
const { summarizeObsidianSyncSettings } = require("../bridge/obsidian-sync");

const ROOT_DIR = path.resolve(__dirname, "..");
const STATE_DIR = path.join(ROOT_DIR, "tmp", "bridge-supervisor");
const SUPERVISOR_LOG = path.join(STATE_DIR, "supervisor.log");
const BRIDGE_LOG = path.join(STATE_DIR, "bridge.log");
const PID_PATH = path.join(STATE_DIR, "bridge.pid");
const DEFAULT_OBSIDIAN_VAULT_PATH =
  process.env.MN_OBSIDIAN_VAULT_PATH || "/Users/cfall/Documents/Obsidian-vaults/Proactive_info_base";
const INSTALLED_STATE_DIR = path.join(
  os.homedir(),
  "Library",
  "Application Support",
  "MNAIProBridge",
  "launchd",
  "current",
  "tmp",
  "bridge-supervisor"
);
const INSTALLED_LAUNCHD_LOG_DIR = path.join(
  os.homedir(),
  "Library",
  "Application Support",
  "MNAIProBridge",
  "launchd",
  "current",
  "logs"
);
const PLIST_PATH = path.join(os.homedir(), "Library", "LaunchAgents", "com.mnaipro.bridge-supervisor.plist");
const LABEL = `gui/${process.getuid()}/com.mnaipro.bridge-supervisor`;

function tailLines(filePath, count) {
  if (!fs.existsSync(filePath)) return [];
  const targetCount = Math.max(1, Number(count) || 0);
  const stat = fs.statSync(filePath);
  if (!stat.size) return [];

  const maxBytes = Math.min(stat.size, 1024 * 1024);
  const start = Math.max(0, stat.size - maxBytes);
  const buffer = Buffer.allocUnsafe(maxBytes);
  const fd = fs.openSync(filePath, "r");
  try {
    const bytesRead = fs.readSync(fd, buffer, 0, maxBytes, start);
    let text = buffer.toString("utf8", 0, bytesRead);
    if (start > 0) {
      const firstNewline = text.indexOf("\n");
      if (firstNewline >= 0) {
        text = text.slice(firstNewline + 1);
      }
    }
    return text
      .split(/\r?\n/)
      .map((line) => line.trimEnd())
      .filter(Boolean)
      .slice(-targetCount);
  } finally {
    fs.closeSync(fd);
  }
}

function safeRead(filePath) {
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch (error) {
    return "";
  }
}

function launchctlPrint() {
  try {
    return execFileSync("launchctl", ["print", LABEL], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (error) {
    return error.stdout || error.stderr || error.message || String(error);
  }
}

function summarizeLaunchctl(printText) {
  const summary = {};
  const lines = String(printText || "").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("state = ")) summary.state = trimmed.replace("state = ", "");
    if (trimmed.startsWith("active count = ")) summary.activeCount = trimmed.replace("active count = ", "");
    if (trimmed.startsWith("last exit code = ")) summary.lastExitCode = trimmed.replace("last exit code = ", "");
    if (trimmed.startsWith("program = ")) summary.program = trimmed.replace("program = ", "");
    if (trimmed.startsWith("path = ")) summary.path = trimmed.replace("path = ", "");
  }
  return summary;
}

function main() {
  const status = bridgeStatus();
  const latestDiagnostic = latestDiagnosticWithFallback();
  const obsidianSyncSettings = summarizeObsidianSyncSettings(DEFAULT_OBSIDIAN_VAULT_PATH);
  const launchctlInfo = launchctlPrint();
  const latestFollowupApply =
    status && (status.latestFollowupApply || (status.latest && status.latest.followupApply))
      ? status.latestFollowupApply || status.latest.followupApply
      : null;
  const recommendedCommands = [
    "mn-obsidian-bridge ob settings export ./ob-settings.snapshot.json --snapshot",
    "mn-obsidian-bridge ob settings restore ./ob-settings.snapshot.json --dry-run",
    "mn-obsidian-bridge ob settings --json",
  ];
  const summary = {
    kind: "bridge_doctor",
    title: "bridge doctor",
    summary: `Bridge health snapshot collected; follow-up apply ${latestFollowupApply ? `present (${latestFollowupApply.requestId || "unknown"})` : "missing"}; bridge supervisor ${status.supervisorState ? `${status.supervisorState.ownership || "unknown"}${status.supervisorState.bridgePid ? ` pid=${status.supervisorState.bridgePid}` : ""}` : "unknown"}; Obsidian settings ${obsidianSyncSettings.exists ? "present" : "missing"}.`,
    bridgeStatus: status,
    bridgeSupervisorState: status.supervisorState || null,
    latestFollowupApply,
    obsidianSyncSettings,
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
    launchAgent: {
      plistExists: fs.existsSync(PLIST_PATH),
      plistPath: PLIST_PATH,
      summary: summarizeLaunchctl(launchctlInfo),
    },
    recommendedCommands,
    supervisor: {
      pidFile: safeRead(PID_PATH).trim() || null,
      installedPidFile:
        safeRead(path.join(INSTALLED_STATE_DIR, "bridge.pid")).trim() || null,
      recentLog: tailLines(SUPERVISOR_LOG, 20),
      recentBridgeLog: tailLines(BRIDGE_LOG, 20),
      installedRecentLog: tailLines(path.join(INSTALLED_STATE_DIR, "supervisor.log"), 20),
      installedRecentBridgeLog: tailLines(path.join(INSTALLED_STATE_DIR, "bridge.log"), 20),
      launchdStdout: tailLines(path.join(INSTALLED_LAUNCHD_LOG_DIR, "launchd.stdout.log"), 20),
      launchdStderr: tailLines(path.join(INSTALLED_LAUNCHD_LOG_DIR, "launchd.stderr.log"), 20),
    },
    rawLaunchctl: launchctlInfo,
  };

  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
}

main();
