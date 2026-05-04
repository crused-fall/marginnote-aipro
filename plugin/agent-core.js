async function defaultShowHUD(message) {
  if (typeof console !== "undefined") {
    console.log(`[mn-agent] ${message}`);
  }
}

function requireApi(api) {
  if (!api || typeof api.getSelectedNodes !== "function") {
    throw new Error("api.getSelectedNodes is required");
  }
  if (!api || typeof api.fetch !== "function") {
    throw new Error("api.fetch is required");
  }
  return api;
}

function normalizeNode(node) {
  const childNodes = Array.isArray(node.childNodes) ? node.childNodes : [];
  const visualFrame =
    node.visualFrame && typeof node.visualFrame === "object"
      ? {
          x: typeof node.visualFrame.x === "number" ? node.visualFrame.x : null,
          y: typeof node.visualFrame.y === "number" ? node.visualFrame.y : null,
          width: typeof node.visualFrame.width === "number" ? node.visualFrame.width : null,
          height: typeof node.visualFrame.height === "number" ? node.visualFrame.height : null,
        }
      : null;
  return {
    noteId: node.noteId,
    title: node.title || "",
    tags: Array.isArray(node.tags) ? node.tags : [],
    mainExcerptText: node.mainExcerptText || "",
    allText: node.allText || "",
    commentsText: Array.isArray(node.commentsText) ? node.commentsText : [],
    colorIndex: typeof node.colorIndex === "number" ? node.colorIndex : null,
    fillIndex: typeof node.fillIndex === "number" ? node.fillIndex : null,
    childNoteIds: childNodes.map((child) => child.noteId).filter(Boolean),
    parentNoteId: node.parentNode ? node.parentNode.noteId : null,
    visualFrame,
    visualDepth: typeof node.visualDepth === "number" ? node.visualDepth : null,
    visibleInMindMap: !!node.visibleInMindMap,
    branchClosed: !!node.branchClosed,
    hidden: !!node.hidden,
    zLevel: typeof node.zLevel === "number" ? node.zLevel : null,
    groupMode: typeof node.groupMode === "string" ? node.groupMode : "",
  };
}

function collectSelectionContext(api) {
  const selectedNodes = api.getSelectedNodes();
  if (!selectedNodes || !selectedNodes.length) {
    throw new Error("no_selected_nodes");
  }

  return {
    selectedNodes,
    normalizedNodes: selectedNodes.map(normalizeNode),
  };
}

async function requestPlan(api, bridgeBaseUrl, payload) {
  const response = await api.fetch(`${bridgeBaseUrl}/plan`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  if (!data.ok) {
    throw new Error(data.error || "bridge_plan_failed");
  }
  return data.plan;
}

function indexNodesById(nodes) {
  return new Map(nodes.map((node) => [node.noteId, node]));
}

function validatePlan(plan) {
  if (!plan || !Array.isArray(plan.actions)) {
    throw new Error("invalid_plan");
  }
}

function actionDisposition(action) {
  return action?.execution?.disposition || "review_required";
}

function actionPhase(action) {
  return action?.phase || "enrich";
}

function resolveNotebookById(api, notebookId) {
  const id = String(notebookId || "").trim();
  if (!id) return null;

  const databaseApi =
    api.Database && typeof api.Database.sharedInstance === "function"
      ? api.Database.sharedInstance()
      : null;
  if (databaseApi && typeof databaseApi.getNotebookById === "function") {
    const notebook = databaseApi.getNotebookById(id);
    if (notebook) {
      return { notebook, source: "Database.sharedInstance().getNotebookById" };
    }
  }

  if (typeof api.getNotebookById === "function") {
    const notebook = api.getNotebookById(id);
    if (notebook) {
      return { notebook, source: "api.getNotebookById" };
    }
  }

  if (api.Application && typeof api.Application.getNotebookById === "function") {
    const notebook = api.Application.getNotebookById(id);
    if (notebook) {
      return { notebook, source: "Application.getNotebookById" };
    }
  }

  if (api.Application && typeof api.Application.getNoteBookById === "function") {
    const notebook = api.Application.getNoteBookById(id);
    if (notebook) {
      return { notebook, source: "Application.getNoteBookById" };
    }
  }

  return null;
}

function resolveDocumentById(api, docMd5, node) {
  const id = String(docMd5 || "").trim();
  if (!id) return null;

  if (api.currentDocumentController?.document) {
    const currentDoc = api.currentDocumentController.document;
    const currentMd5 = String(
      api.currentDocumentController.docMd5 || currentDoc.docMd5 || ""
    ).trim();
    if (!currentMd5 || currentMd5 === id) {
      return { document: currentDoc, source: "currentDocumentController.document" };
    }
  }

  const databaseApi =
    api.Database && typeof api.Database.sharedInstance === "function"
      ? api.Database.sharedInstance()
      : null;
  if (databaseApi && typeof databaseApi.getDocumentById === "function") {
    const document = databaseApi.getDocumentById(id);
    if (document) {
      return { document, source: "Database.sharedInstance().getDocumentById" };
    }
  }

  if (typeof api.getDocumentById === "function") {
    const document = api.getDocumentById(id);
    if (document) {
      return { document, source: "api.getDocumentById" };
    }
  }

  if (typeof api.getDocById === "function") {
    const document = api.getDocById(id);
    if (document) {
      return { document, source: "api.getDocById" };
    }
  }

  if (api.Application && typeof api.Application.getDocumentById === "function") {
    const document = api.Application.getDocumentById(id);
    if (document) {
      return { document, source: "Application.getDocumentById" };
    }
  }

  if (api.Application && typeof api.Application.getDocById === "function") {
    const document = api.Application.getDocById(id);
    if (document) {
      return { document, source: "Application.getDocById" };
    }
  }

  const nodeDocMd5 = String(node?.docMd5 || "").trim();
  if (nodeDocMd5 && nodeDocMd5 === id && node?.document) {
    return { document: node.document, source: "node.document" };
  }

  return null;
}

function getDetachedGroupingCreateContext(api, node) {
  if (!api || !node) return null;
  const NoteApi = api.Note;
  if (!NoteApi || typeof NoteApi.createWithTitleNotebookDocument !== "function") {
    return null;
  }

  const notebookId = String(node.notebookId || "").trim();
  const docMd5 = String(node.docMd5 || "").trim();
  if (!notebookId || !docMd5) return null;

  const notebookResult = resolveNotebookById(api, notebookId);
  const documentResult = resolveDocumentById(api, docMd5, node);
  if (!notebookResult || !documentResult) return null;

  return {
    notebook: notebookResult.notebook,
    document: documentResult.document,
    source: `${notebookResult.source}+${documentResult.source}`,
  };
}

async function applyAction(action, nodesById, api) {
  const node = nodesById.get(action.noteId);
  if (!node) {
    throw new Error(`unknown_note:${action.noteId}`);
  }

  const disposition = actionDisposition(action);
  if (disposition === "suggest_only") {
    return {
      ok: false,
      skipped: true,
      type: action.type,
      noteId: action.noteId,
      reason: "execution_policy_blocked",
      executionDisposition: disposition,
      actionPhase: actionPhase(action),
      planSource: action?.meta?.source || "",
      planConfidence:
        typeof action?.meta?.confidence === "number" ? action.meta.confidence : null,
    };
  }

  switch (action.type) {
    case "set_title":
      node.title = action.title;
      return {
        ok: true,
        type: action.type,
        noteId: action.noteId,
        executionDisposition: disposition,
        actionPhase: actionPhase(action),
        planSource: action?.meta?.source || "",
        planConfidence:
          typeof action?.meta?.confidence === "number" ? action.meta.confidence : null,
      };

    case "set_color_index":
      node.colorIndex = Number(action.colorIndex);
      return {
        ok: true,
        type: action.type,
        noteId: action.noteId,
        executionDisposition: disposition,
        actionPhase: actionPhase(action),
        planSource: action?.meta?.source || "",
        planConfidence:
          typeof action?.meta?.confidence === "number" ? action.meta.confidence : null,
      };

    case "append_tags": {
      const current = Array.isArray(node.tags) ? node.tags : [];
      const next = [...new Set([...current, ...(action.tags || [])])];
      node.tags = next;
      return {
        ok: true,
        type: action.type,
        noteId: action.noteId,
        executionDisposition: disposition,
        actionPhase: actionPhase(action),
        planSource: action?.meta?.source || "",
        planConfidence:
          typeof action?.meta?.confidence === "number" ? action.meta.confidence : null,
      };
    }

    case "append_comment":
      if (typeof node.appendTextComments !== "function") {
        throw new Error(`append_comment_not_supported:${action.noteId}`);
      }
      node.appendTextComments(action.comment);
      return {
        ok: true,
        type: action.type,
        noteId: action.noteId,
        executionDisposition: disposition,
        actionPhase: actionPhase(action),
        planSource: action?.meta?.source || "",
        planConfidence:
          typeof action?.meta?.confidence === "number" ? action.meta.confidence : null,
      };

    case "rewrite_excerpt":
      node.mainExcerptText = action.text;
      return {
        ok: true,
        type: action.type,
        noteId: action.noteId,
        executionDisposition: disposition,
        actionPhase: actionPhase(action),
        planSource: action?.meta?.source || "",
        planConfidence:
          typeof action?.meta?.confidence === "number" ? action.meta.confidence : null,
      };

    case "organize_branch_groups": {
      const groups = Array.isArray(action.groups) ? action.groups : [];
      if (!groups.length) {
        throw new Error(`organize_branch_groups_invalid:${action.noteId}`);
      }
      const directChildren = Array.isArray(node.childNodes) ? node.childNodes : [];
      const anchor = directChildren.find(Boolean) || null;
      const detachedCreateContext = getDetachedGroupingCreateContext(api, node);
      const canCreate =
        typeof node.createChildNote === "function" ||
        !!(anchor && typeof anchor.createBrotherNote === "function") ||
        !!(detachedCreateContext && typeof node.addChild === "function");
      const canMove =
        typeof node.addChild === "function" ||
        !!(anchor && typeof anchor.addAsChildNote === "function");
      if (!canCreate || !canMove) {
        throw new Error(`organize_branch_groups_not_supported:${action.noteId}`);
      }

      const normalizeTitleKey = (value) =>
        String(value || "")
          .trim()
          .toLowerCase()
          .replace(/[^\p{L}\p{N}]+/gu, "");
      const allMovedIds = new Set(
        groups.flatMap((group) =>
          Array.isArray(group?.noteIds) ? group.noteIds.filter(Boolean) : []
        )
      );
      const existingGroups = new Map();

      for (const child of directChildren) {
        if (!child || allMovedIds.has(child.noteId)) continue;
        const key = normalizeTitleKey(child.title);
        if (!key || existingGroups.has(key)) continue;
        if (child.mainExcerptText || (Array.isArray(child.commentsText) && child.commentsText.length)) {
          continue;
        }
        existingGroups.set(key, child);
      }

      for (const group of groups) {
        const label = String(group?.label || "").trim();
        if (!label) continue;
        const key = normalizeTitleKey(label);
        let groupNode = existingGroups.get(key);
        if (!groupNode) {
          if (typeof node.createChildNote === "function") {
            groupNode = node.createChildNote({
              title: label,
              excerptText: "",
              excerptTextMarkdown: false,
              content: "",
              markdown: false,
              color: typeof node.colorIndex === "number" ? node.colorIndex : 0,
            });
          } else if (anchor && typeof anchor.createBrotherNote === "function") {
            groupNode = anchor.createBrotherNote({
              title: label,
              content: "",
              markdown: false,
              color: typeof node.colorIndex === "number" ? node.colorIndex : 0,
            });
          } else if (detachedCreateContext && typeof node.addChild === "function") {
            groupNode = api.Note.createWithTitleNotebookDocument(
              label,
              detachedCreateContext.notebook,
              detachedCreateContext.document
            );
            if (groupNode) {
              if (typeof node.colorIndex === "number") {
                groupNode.colorIndex = node.colorIndex;
              }
              node.addChild(groupNode);
            }
          }
          if (!groupNode) continue;
          nodesById.set(groupNode.noteId, groupNode);
          existingGroups.set(key, groupNode);
        }

        for (const childId of Array.isArray(group.noteIds) ? group.noteIds : []) {
          const childNode = nodesById.get(childId);
          if (!childNode || childNode.noteId === groupNode.noteId) continue;
          if (childNode.parentNode && childNode.parentNode.noteId === groupNode.noteId) continue;
          if (typeof groupNode.addChild === "function") {
            groupNode.addChild(childNode);
          } else if (typeof childNode.addAsChildNote === "function") {
            childNode.addAsChildNote(groupNode);
          }
        }
      }

      return {
        ok: true,
        type: action.type,
        noteId: action.noteId,
        executionDisposition: disposition,
        actionPhase: actionPhase(action),
        planSource: action?.meta?.source || "",
        planConfidence:
          typeof action?.meta?.confidence === "number" ? action.meta.confidence : null,
      };
    }

    case "noop":
      return {
        ok: true,
        type: action.type,
        noteId: action.noteId,
        executionDisposition: disposition,
        actionPhase: actionPhase(action),
        planSource: action?.meta?.source || "",
        planConfidence:
          typeof action?.meta?.confidence === "number" ? action.meta.confidence : null,
      };

    case "reparent_node":
      throw new Error(
        "reparent_node is intentionally blocked in the public-api executor"
      );

    default:
      throw new Error(`unknown_action:${action.type}`);
  }
}

async function executePlan(api, selectedNodes, plan) {
  validatePlan(plan);

  const nodesById = indexNodesById(selectedNodes);
  const results = [];

  for (const action of plan.actions) {
    results.push(await applyAction(action, nodesById, api));
  }

  return {
    mode: "apply",
    plan,
    actionDispositionCounts: plan.actionDispositionCounts || null,
    actionPhaseCounts: plan.actionPhaseCounts || null,
    results,
  };
}

async function previewOrganizeSelectedNodes(options) {
  const {
    objective,
    origin,
    bridgeBaseUrl = "http://127.0.0.1:8765",
    api: unsafeApi,
  } = options || {};

  if (!objective) {
    throw new Error("objective is required");
  }

  const api = requireApi(unsafeApi);
  const showHUD = api.showHUD || defaultShowHUD;

  await showHUD("Collecting selected nodes...");

  const { normalizedNodes } = collectSelectionContext(api);
  const plan = await requestPlan(api, bridgeBaseUrl, {
    objective,
    origin,
    dryRun: true,
    nodes: normalizedNodes,
  });

  const executableCount = (plan.actions || []).filter(
    (action) => actionDisposition(action) !== "suggest_only"
  ).length;
  await showHUD(
    `Dry run complete: ${plan.actions.length} actions planned, ${executableCount} executable.`
  );
  return {
    mode: "preview",
    plan,
  };
}

async function applySafeActions(options) {
  const {
    objective,
    origin,
    plan: unsafePlan,
    bridgeBaseUrl = "http://127.0.0.1:8765",
    api: unsafeApi,
  } = options || {};

  const api = requireApi(unsafeApi);
  const showHUD = api.showHUD || defaultShowHUD;
  const hideHUD = api.hideHUD || (async () => {});

  await showHUD("Collecting selected nodes...");
  const { selectedNodes, normalizedNodes } = collectSelectionContext(api);

  let plan = unsafePlan;
  if (!plan) {
    if (!objective) {
      throw new Error("objective_or_plan is required");
    }
    plan = await requestPlan(api, bridgeBaseUrl, {
      objective,
      origin,
      dryRun: false,
      nodes: normalizedNodes,
    });
  }

  const executableCount = (plan.actions || []).filter(
    (action) => actionDisposition(action) !== "suggest_only"
  ).length;
  await showHUD(`Applying ${executableCount} executable actions...`);
  const executed = await executePlan(api, selectedNodes, plan);
  await hideHUD();
  return executed;
}

async function runOrganizeSelectedNodes(options) {
  const { mode = "preview" } = options || {};
  if (mode === "apply") {
    return applySafeActions(options);
  }
  return previewOrganizeSelectedNodes(options);
}

module.exports = {
  collectSelectionContext,
  normalizeNode,
  requestPlan,
  validatePlan,
  actionDisposition,
  actionPhase,
  applyAction,
  executePlan,
  previewOrganizeSelectedNodes,
  applySafeActions,
  runOrganizeSelectedNodes,
};
