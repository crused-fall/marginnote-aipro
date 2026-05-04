const fs = require("fs");
const os = require("os");
const path = require("path");

const ROOT_DIR = path.resolve(__dirname, "..");
const OUTPUT_PATH = path.join(ROOT_DIR, "tmp", "com.mnaipro.bridge-supervisor.plist");
const DEFAULT_LAUNCHER_PATH = path.join(ROOT_DIR, "scripts", "run-bridge-supervisor.sh");
const DEFAULT_STDOUT_PATH = path.join(ROOT_DIR, "tmp", "bridge-supervisor", "launchd.stdout.log");
const DEFAULT_STDERR_PATH = path.join(ROOT_DIR, "tmp", "bridge-supervisor", "launchd.stderr.log");
const LAUNCHER_PATH = process.env.MNAIPRO_LAUNCHER_PATH || DEFAULT_LAUNCHER_PATH;
const STDOUT_PATH = process.env.MNAIPRO_LAUNCHD_STDOUT_PATH || DEFAULT_STDOUT_PATH;
const STDERR_PATH = process.env.MNAIPRO_LAUNCHD_STDERR_PATH || DEFAULT_STDERR_PATH;
const WORKING_DIRECTORY =
  process.env.MNAIPRO_LAUNCHD_WORKDIR ||
  process.env.MNAIPRO_LAUNCHD_ROOT ||
  ROOT_DIR;

fs.mkdirSync(path.dirname(STDOUT_PATH), { recursive: true });
fs.mkdirSync(path.dirname(STDERR_PATH), { recursive: true });
fs.mkdirSync(path.join(os.homedir(), "Library", "LaunchAgents"), { recursive: true });

const plist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.mnaipro.bridge-supervisor</string>
  <key>ProgramArguments</key>
  <array>
    <string>${LAUNCHER_PATH}</string>
  </array>
  <key>WorkingDirectory</key>
  <string>${WORKING_DIRECTORY}</string>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
  <key>StandardOutPath</key>
  <string>${STDOUT_PATH}</string>
  <key>StandardErrorPath</key>
  <string>${STDERR_PATH}</string>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key>
    <string>/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin</string>
  </dict>
</dict>
</plist>
`;

fs.writeFileSync(OUTPUT_PATH, plist, "utf8");
console.log(OUTPUT_PATH);
