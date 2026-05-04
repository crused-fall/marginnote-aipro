const fs = require("fs");
const path = require("path");

function supervisorStateFile(stateDir) {
  return path.join(stateDir || "", "bridge-state.json");
}

function readSupervisorState(stateDir) {
  const filePath = supervisorStateFile(stateDir);
  try {
    if (!fs.existsSync(filePath)) return null;
    const stat = fs.statSync(filePath);
    return {
      file: path.basename(filePath),
      fullPath: filePath,
      mtimeMs: stat.mtimeMs,
      json: JSON.parse(fs.readFileSync(filePath, "utf8")),
    };
  } catch (error) {
    return null;
  }
}

function writeSupervisorState(stateDir, state) {
  const filePath = supervisorStateFile(stateDir);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(state, null, 2), "utf8");
  return filePath;
}

function summarizeSupervisorState(info) {
  if (!info || !info.json) return null;
  const state = info.json;
  return {
    file: info.file,
    fullPath: info.fullPath,
    mtimeMs: info.mtimeMs,
    updatedAt: state.updatedAt || null,
    supervisorPid: typeof state.supervisorPid === "number" ? state.supervisorPid : null,
    bridgePid: typeof state.bridgePid === "number" ? state.bridgePid : null,
    bridgeRunning: !!state.bridgeRunning,
    ownership: state.ownership || "unknown",
    marginNoteRunning: !!state.marginNoteRunning,
    lastAction: state.lastAction || null,
    health: typeof state.health === "boolean" ? state.health : null,
  };
}

module.exports = {
  readSupervisorState,
  summarizeSupervisorState,
  supervisorStateFile,
  writeSupervisorState,
};
