const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");

const ROOT_DIR = path.resolve(__dirname, "..");
const LABEL = "com.mnaipro.bridge-supervisor";
const USER_LABEL = `gui/${process.getuid()}/${LABEL}`;
const RENDER_SCRIPT = path.join(ROOT_DIR, "scripts", "render-launch-agent.js");
const TARGET_PATH = path.join(os.homedir(), "Library", "LaunchAgents", `${LABEL}.plist`);
const INSTALL_ROOT = path.join(
  os.homedir(),
  "Library",
  "Application Support",
  "MNAIProBridge",
  "launchd"
);
const INSTALL_CURRENT = path.join(INSTALL_ROOT, "current");

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function copyIntoInstall(relativePath) {
  const sourcePath = path.join(ROOT_DIR, relativePath);
  const targetPath = path.join(INSTALL_CURRENT, relativePath);
  ensureDir(path.dirname(targetPath));
  fs.copyFileSync(sourcePath, targetPath);
  return targetPath;
}

function runNodeScript(scriptPath) {
  return execFileSync(process.execPath, [scriptPath], {
    cwd: ROOT_DIR,
    encoding: "utf8",
    env: {
      ...process.env,
      MNAIPRO_LAUNCHER_PATH: path.join(INSTALL_CURRENT, "scripts", "run-bridge-supervisor.sh"),
      MNAIPRO_LAUNCHD_STDOUT_PATH: path.join(INSTALL_CURRENT, "logs", "launchd.stdout.log"),
      MNAIPRO_LAUNCHD_STDERR_PATH: path.join(INSTALL_CURRENT, "logs", "launchd.stderr.log"),
      MNAIPRO_LAUNCHD_WORKDIR: INSTALL_CURRENT,
      MNAIPRO_LAUNCHD_ROOT: INSTALL_CURRENT,
    },
  }).trim();
}

function runLaunchctl(args, allowFailure) {
  try {
    return execFileSync("launchctl", args, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
  } catch (error) {
    if (allowFailure) {
      return (error.stdout || error.stderr || error.message || String(error)).trim();
    }
    throw error;
  }
}

function main() {
  ensureDir(INSTALL_CURRENT);
  ensureDir(path.join(INSTALL_CURRENT, "logs"));
  copyIntoInstall("scripts/run-bridge-supervisor.sh");
  copyIntoInstall("scripts/bridge-supervisor.js");
  copyIntoInstall("bridge/server.js");
  copyIntoInstall("bridge/planner.js");
  fs.chmodSync(
    path.join(INSTALL_CURRENT, "scripts", "run-bridge-supervisor.sh"),
    0o755
  );

  const renderedPath = runNodeScript(RENDER_SCRIPT);
  fs.mkdirSync(path.dirname(TARGET_PATH), { recursive: true });
  fs.copyFileSync(renderedPath, TARGET_PATH);

  const bootout = runLaunchctl(["bootout", `gui/${process.getuid()}`, TARGET_PATH], true);
  const bootstrap = runLaunchctl(["bootstrap", `gui/${process.getuid()}`, TARGET_PATH], true);
  const kickstart = runLaunchctl(["kickstart", "-k", USER_LABEL], true);
  const print = runLaunchctl(["print", USER_LABEL], true);

  process.stdout.write(
    JSON.stringify(
      {
        ok: true,
        installRoot: INSTALL_CURRENT,
        renderedPath,
        targetPath: TARGET_PATH,
        bootout,
        bootstrap,
        kickstart,
        print,
      },
      null,
      2
    ) + "\n"
  );
}

main();
