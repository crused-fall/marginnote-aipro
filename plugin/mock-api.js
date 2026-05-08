class MockNode {
  static nextId = 1000;

  constructor(data) {
    this.noteId = data.noteId;
    this.title = data.title || "";
    this.tags = Array.isArray(data.tags) ? [...data.tags] : [];
    this.mainExcerptText = data.mainExcerptText || "";
    this.allText = data.allText || "";
    this.docMd5 = data.docMd5 || "mock-doc-1";
    this.notebookId = data.notebookId || "mock-notebook-1";
    this.colorIndex = typeof data.colorIndex === "number" ? data.colorIndex : 0;
    this.fillIndex = typeof data.fillIndex === "number" ? data.fillIndex : 0;
    this.visualFrame = data.visualFrame || null;
    this.visualDepth = typeof data.visualDepth === "number" ? data.visualDepth : null;
    this.visibleInMindMap = !!data.visibleInMindMap;
    this.branchClosed = !!data.branchClosed;
    this.hidden = !!data.hidden;
    this.zLevel = typeof data.zLevel === "number" ? data.zLevel : null;
    this.groupMode = data.groupMode || "";
    this.commentsText = Array.isArray(data.commentsText)
      ? [...data.commentsText]
      : [];
    this.childNodes = Array.isArray(data.childNodes) ? data.childNodes : [];
    this.parentNode = data.parentNode || null;
  }

  appendTextComments(...comments) {
    this.commentsText.push(...comments);
  }

  appendTextComment(comment) {
    this.appendTextComments(comment);
  }

  getCommentIndex(comment) {
    const target = String(comment || "").trim();
    if (!target) return -1;
    return this.commentsText.findIndex((item) => String(item || "").indexOf(target) >= 0);
  }

  removeCommentByIndex(index) {
    if (!Number.isInteger(index) || index < 0 || index >= this.commentsText.length) {
      return;
    }
    this.commentsText.splice(index, 1);
  }

  removeCommentByCondition(condition = {}) {
    const include = String(condition.include || "").trim();
    const exclude = String(condition.exclude || "").trim();
    const reg = String(condition.reg || "").trim();
    const pattern = include || reg;
    if (!pattern) return;
    this.commentsText = this.commentsText.filter((comment) => {
      const text = String(comment || "");
      if (exclude && text.indexOf(exclude) >= 0) {
        return true;
      }
      return text.indexOf(pattern) < 0;
    });
  }

  createChildNote(config = {}) {
    const child = new MockNode({
      noteId: `mock-${MockNode.nextId++}`,
      title: config.title || "",
      tags: [],
      mainExcerptText: config.excerptText || "",
      allText: [config.title || "", config.excerptText || "", config.content || ""]
        .filter(Boolean)
        .join("\n"),
      commentsText: [],
      childNodes: [],
      parentNode: this,
      docMd5: this.docMd5,
      notebookId: this.notebookId,
      colorIndex: this.colorIndex,
      fillIndex: this.fillIndex,
      visualDepth:
        typeof this.visualDepth === "number" ? this.visualDepth + 1 : null,
      visibleInMindMap: this.visibleInMindMap,
      hidden: false,
      branchClosed: false,
      zLevel: this.zLevel,
      groupMode: this.groupMode,
    });
    this.childNodes.push(child);
    return child;
  }

  createBrotherNote(config = {}) {
    if (!this.parentNode) return null;
    return this.parentNode.createChildNote({
      title: config.title || "",
      excerptText: "",
      content: config.content || "",
    });
  }

  addChild(note) {
    if (!note || note === this) return;
    if (note.parentNode) {
      note.parentNode.childNodes = (note.parentNode.childNodes || []).filter(
        (child) => child !== note
      );
    }
    note.parentNode = this;
    if (!this.childNodes.includes(note)) {
      this.childNodes.push(note);
    }
  }

  addAsChildNote(targetNote) {
    if (!targetNote || typeof targetNote.addChild !== "function") return;
    targetNote.addChild(this);
  }
}

async function mockFetch(url, options = {}) {
  const response = await fetch(url, options);
  return {
    json: async () => response.json(),
  };
}

function createMockApi(nodes, hooks = {}) {
  const notebooksById = new Map();
  const docsById = new Map();
  const nodesById = new Map();

  for (const node of nodes) {
    if (!node) continue;
    nodesById.set(node.noteId, node);
    const notebookId = node.notebookId || "mock-notebook-1";
    const docMd5 = node.docMd5 || "mock-doc-1";
    if (!notebooksById.has(notebookId)) {
      notebooksById.set(notebookId, { notebookId, title: `Notebook ${notebookId}` });
    }
    if (!docsById.has(docMd5)) {
      docsById.set(docMd5, { docMd5, title: `Document ${docMd5}` });
    }
  }

  return {
    getSelectedNodes() {
      return nodes;
    },
    getDocumentById(docMd5) {
      return docsById.get(docMd5) || null;
    },
    getNotebookById(notebookId) {
      return notebooksById.get(notebookId) || null;
    },
    getDocById(docMd5) {
      return docsById.get(docMd5) || null;
    },
    Application: {
      getNoteBookById(notebookId) {
        return notebooksById.get(notebookId) || null;
      },
      getNotebookById(notebookId) {
        return notebooksById.get(notebookId) || null;
      },
      getDocumentById(docMd5) {
        return docsById.get(docMd5) || null;
      },
      getDocById(docMd5) {
        return docsById.get(docMd5) || null;
      },
    },
    Database: {
      sharedInstance() {
        return {
          getNotebookById(notebookId) {
            return notebooksById.get(notebookId) || null;
          },
          getDocumentById(docMd5) {
            return docsById.get(docMd5) || null;
          },
        };
      },
    },
    Note: {
      createWithTitleNotebookDocument(title, notebook, doc) {
        if (!notebook || !doc) return null;
        const child = new MockNode({
          noteId: `mock-${MockNode.nextId++}`,
          title: title || "",
          tags: [],
          mainExcerptText: "",
          allText: title || "",
          commentsText: [],
          childNodes: [],
          parentNode: null,
          notebookId: notebook.notebookId || "mock-notebook-1",
          docMd5: doc.docMd5 || "mock-doc-1",
          fillIndex: 0,
        });
        nodes.push(child);
        nodesById.set(child.noteId, child);
        return child;
      },
    },
    currentDocumentController: {
      docMd5: nodes[0]?.docMd5 || "mock-doc-1",
      document: docsById.get(nodes[0]?.docMd5 || "mock-doc-1") || null,
    },
    fetch: hooks.fetch || mockFetch,
    async showHUD(message) {
      if (hooks.showHUD) return hooks.showHUD(message);
      console.log(`[mock-hud] ${message}`);
    },
    async hideHUD() {
      if (hooks.hideHUD) return hooks.hideHUD();
      console.log("[mock-hud] done");
    },
  };
}

function createSampleSelection() {
  const leafA = new MockNode({
    noteId: "n-2",
    title: "Example",
    tags: [],
    mainExcerptText: "Definition of holomorphic function",
    allText: "Definition of holomorphic function and basic example",
    commentsText: [],
    visualFrame: { x: 180, y: 120, width: 160, height: 80 },
    visualDepth: 1,
    visibleInMindMap: true,
    zLevel: 1,
  });

  const leafB = new MockNode({
    noteId: "n-3",
    title: "Example",
    tags: ["draft"],
    mainExcerptText: "Proof of theorem using Cauchy integral formula",
    allText: "Proof of theorem using Cauchy integral formula",
    commentsText: [],
    visualFrame: { x: 420, y: 80, width: 160, height: 80 },
    visualDepth: 3,
    visibleInMindMap: true,
    zLevel: 1,
  });

  const leafC = new MockNode({
    noteId: "n-4",
    title: "Example",
    tags: [],
    mainExcerptText: "Worked example for residue computation",
    allText: "Worked example for residue computation with contour integral",
    commentsText: [],
    visualDepth: 4,
    visibleInMindMap: false,
    hidden: true,
  });

  const leafD = new MockNode({
    noteId: "n-5",
    title: "Definition",
    tags: [],
    mainExcerptText: "Definition of isolated singularity",
    allText: "Definition of isolated singularity and removable singularity",
    commentsText: [],
    visualDepth: 4,
    visibleInMindMap: false,
    hidden: true,
  });

  const leafE = new MockNode({
    noteId: "n-6",
    title: "Definition",
    tags: [],
    mainExcerptText: "Definition of residue at a pole",
    allText: "Definition of residue at a pole and notation summary",
    commentsText: [],
    visualFrame: { x: 640, y: 220, width: 160, height: 80 },
    visualDepth: 3,
    visibleInMindMap: true,
    zLevel: 1,
  });

  const leafF = new MockNode({
    noteId: "n-7",
    title: "Proof",
    tags: [],
    mainExcerptText: "Proof idea for residue theorem",
    allText: "Proof idea for residue theorem with coefficient extraction",
    commentsText: [],
    visualFrame: { x: 360, y: 260, width: 160, height: 80 },
    visualDepth: 2,
    visibleInMindMap: true,
    zLevel: 1,
  });

  const leafG = new MockNode({
    noteId: "n-8",
    title: "Question",
    tags: [],
    mainExcerptText: "Exercise about choosing the contour",
    allText: "Exercise about choosing the contour and estimating the integral",
    commentsText: [],
    visualFrame: { x: 210, y: 320, width: 160, height: 80 },
    visualDepth: 1,
    visibleInMindMap: true,
    zLevel: 1,
  });

  const root = new MockNode({
    noteId: "n-1",
    title: "",
    tags: ["complex-analysis"],
    mainExcerptText: "Theorem 1.1 on complex residues",
    allText:
      "Theorem 1.1 on complex residues with example and proof structure",
    commentsText: [],
    childNodes: [leafA, leafB, leafC, leafD, leafE, leafF, leafG],
    visualFrame: { x: 20, y: 20, width: 180, height: 100 },
    visualDepth: 0,
    visibleInMindMap: true,
    branchClosed: false,
    zLevel: 0,
  });

  leafA.parentNode = root;
  leafB.parentNode = root;
  leafC.parentNode = root;
  leafD.parentNode = root;
  leafE.parentNode = root;
  leafF.parentNode = root;
  leafG.parentNode = root;

  return [root, leafA, leafB, leafC, leafD, leafE, leafF, leafG];
}

module.exports = {
  MockNode,
  createMockApi,
  createSampleSelection,
};
