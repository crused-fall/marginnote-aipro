const fs = require("fs");
const path = require("path");

const OBSIDIAN_SYNC_SETTING_KEYS = [
  "marginNoteSourcePath",
  "pdfVaultFolder",
  "canvasFolderName",
  "autoLinkPdfsOnScan",
  "autoGenerateCanvasesOnScan",
];

function formatSettingValue(value) {
  if (value === null || value === undefined || value === "") {
    return "(missing)";
  }
  if (typeof value === "boolean") {
    return value ? "yes" : "no";
  }
  return String(value);
}

function summarizeObsidianSyncSettings(vaultPath) {
  const effectiveVaultPath = vaultPath || "";
  const resolvedVaultPath = effectiveVaultPath ? path.resolve(effectiveVaultPath) : "";
  const settingsPath = resolvedVaultPath
    ? path.join(
        resolvedVaultPath,
        ".obsidian",
        "plugins",
        "marginnote-obsidian-sync",
        "data.json"
      )
    : "";
  let settingsData = null;

  if (resolvedVaultPath) {
    try {
      const stat = fs.statSync(resolvedVaultPath);
      if (stat && stat.isDirectory() && fs.existsSync(settingsPath)) {
        settingsData = JSON.parse(fs.readFileSync(settingsPath, "utf8"));
      }
    } catch (error) {
      settingsData = null;
    }
  }

  const hasSettings = !!settingsData && typeof settingsData === "object";
  const values = {};
  const missingKeys = [];

  for (const key of OBSIDIAN_SYNC_SETTING_KEYS) {
    const value = hasSettings && Object.prototype.hasOwnProperty.call(settingsData, key)
      ? settingsData[key]
      : null;
    values[key] = value;
    if (value === null || value === undefined || value === "") {
      missingKeys.push(key);
    }
  }

  return {
    provided: !!effectiveVaultPath,
    vaultPath: resolvedVaultPath,
    exists: hasSettings,
    settingsPath,
    summary: hasSettings
      ? OBSIDIAN_SYNC_SETTING_KEYS.map((key) => `${key}=${formatSettingValue(values[key])}`).join(", ")
      : "marginnote-obsidian-sync data.json is missing",
    values,
    missingKeys: hasSettings ? missingKeys : [...OBSIDIAN_SYNC_SETTING_KEYS],
  };
}

module.exports = {
  OBSIDIAN_SYNC_SETTING_KEYS,
  summarizeObsidianSyncSettings,
};
