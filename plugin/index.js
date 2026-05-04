const {
  previewOrganizeSelectedNodes,
  applySafeActions,
  runOrganizeSelectedNodes,
} = require("./agent-core");

function createCommandRunner(defaults = {}) {
  return async function runCommand(runtime = {}) {
    const objective =
      runtime.objective ||
      defaults.objective ||
      "整理当前选中分支";

    return runOrganizeSelectedNodes({
      objective,
      origin: runtime.origin || defaults.origin || null,
      mode: runtime.mode || defaults.mode || "preview",
      plan: runtime.plan || defaults.plan,
      bridgeBaseUrl:
        runtime.bridgeBaseUrl ||
        defaults.bridgeBaseUrl ||
        "http://127.0.0.1:8765",
      api: runtime.api || defaults.api,
    });
  };
}

module.exports = {
  createCommandRunner,
  previewOrganizeSelectedNodes,
  applySafeActions,
  runOrganizeSelectedNodes,
};
