const assert = require("assert");
const fs = require("fs");
const path = require("path");

const MAIN_PATH = path.join(__dirname, "..", "main.js");

function extractFunctionBody(source, functionName) {
  const startToken = `function ${functionName}(`;
  const startIndex = source.indexOf(startToken);
  assert(startIndex >= 0, `missing ${functionName} function`);
  const bodyStart = source.indexOf("{", startIndex);
  assert(bodyStart >= 0, `missing ${functionName} body`);

  let depth = 0;
  for (let index = bodyStart; index < source.length; index += 1) {
    const char = source[index];
    if (char === "{") depth += 1;
    if (char === "}") depth -= 1;
    if (depth === 0) {
      return source.slice(bodyStart + 1, index);
    }
  }

  throw new Error(`unbalanced braces in ${functionName}`);
}

function main() {
  const source = fs.readFileSync(MAIN_PATH, "utf8");
  const applyBody = extractFunctionBody(source, "applySupportedActions");
  const blockedBody = extractFunctionBody(source, "buildBlockedExecution");

  assert(
    blockedBody.includes('command: commandTitleText(plan, Addon.title)'),
    "blocked execution should preserve plan command title"
  );
  assert(
    blockedBody.includes('objective: noteText(plan && plan.objective) || Addon.title'),
    "blocked execution should preserve plan objective"
  );
  assert(
    blockedBody.includes('origin: noteText(plan && plan.origin) || ""'),
    "blocked execution should preserve plan origin"
  );

  assert(
    applyBody.includes('command: commandTitleText(plan, Addon.title)'),
    "apply execution should preserve plan command title"
  );
  assert(
    applyBody.includes('objective: noteText(plan && plan.objective) || Addon.title'),
    "apply execution should preserve plan objective"
  );
  assert(
    applyBody.includes('origin: noteText(plan && plan.origin) || ""'),
    "apply execution should preserve plan origin"
  );

  process.stdout.write("main.js Breakdown execution envelope OK\n");
}

main();
