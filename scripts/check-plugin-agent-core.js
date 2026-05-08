const assert = require("assert");

const { applySafeActions } = require("../plugin/agent-core");
const { createMockApi, MockNode } = require("../plugin/mock-api");

async function main() {
  const root = new MockNode({
    noteId: "root-1",
    title: "Root",
    commentsText: ["Agent review: remove me", "keep me"],
    childNodes: [],
  });

  const api = createMockApi([root], {
    showHUD: async () => {},
    hideHUD: async () => {},
  });

  const plan = {
    actions: [
      {
        type: "append_comment",
        noteId: root.noteId,
        comment: "new note",
        execution: { disposition: "review_required" },
        phase: "normalize",
        meta: { source: "unit-test" },
      },
      {
        type: "remove_comments_by_text",
        noteId: root.noteId,
        comments: ["Agent review:"],
        execution: { disposition: "review_required" },
        phase: "cleanup",
        meta: { source: "unit-test" },
      },
    ],
  };

  const execution = await applySafeActions({
    plan,
    api,
  });

  assert.strictEqual(execution.mode, "apply", "expected apply mode");
  assert.strictEqual(execution.results.length, 2, "expected both actions to execute");
  assert(
    root.commentsText.some((comment) => String(comment).includes("new note")),
    "expected append_comment to add a comment"
  );
  assert(
    !root.commentsText.some((comment) => String(comment).includes("Agent review:")),
    "expected remove_comments_by_text to remove the legacy comment"
  );
  assert(
    root.commentsText.some((comment) => String(comment).includes("keep me")),
    "expected unrelated comments to remain"
  );
  assert(
    execution.results.some((item) => item.type === "remove_comments_by_text" && item.ok),
    "expected remove_comments_by_text action to report success"
  );
  assert(
    execution.results.some((item) => item.type === "remove_comments_by_text" && item.executionDetail),
    "expected remove_comments_by_text execution detail"
  );

  process.stdout.write("Plugin agent core checks OK\n");
}

main().catch((error) => {
  process.stderr.write(`${error.stack || error.message || String(error)}\n`);
  process.exitCode = 1;
});
