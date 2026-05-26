// ─── Data Model ───────────────────────────────────────────────────────────────
// NODES: Map<id, NodeRecord>
// EDGES: EdgeRecord[]  (source → target, always parent → child)

export const NODES = new Map();
export const EDGES = [];

let _idCounter = 0;
function genId() {
  return 'n' + (++_idCounter).toString(36) + Math.random().toString(36).slice(2, 6);
}

// ─── CRUD ─────────────────────────────────────────────────────────────────────

export function createNode(label, parentId = null, meta = {}) {
  const id = genId();
  NODES.set(id, {
    id, label,
    x: 0, y: 0,
    width: 0, height: 0,
    collapsed: false,
    parentId,
    meta: { color: null, note: '', ...meta },
  });
  if (parentId) EDGES.push({ source: parentId, target: id });
  return id;
}

export function updateNode(id, patch) {
  const n = NODES.get(id);
  if (!n) return;
  if (patch.meta) patch.meta = { ...n.meta, ...patch.meta };
  Object.assign(n, patch);
}

export function deleteNode(id) {
  getSubtree(id).forEach(nid => {
    NODES.delete(nid);
    for (let i = EDGES.length - 1; i >= 0; i--) {
      const e = EDGES[i];
      if (e.source === nid || e.target === nid) EDGES.splice(i, 1);
    }
  });
}

// ─── Traversal ────────────────────────────────────────────────────────────────

export function getChildren(id) {
  return EDGES.filter(e => e.source === id).map(e => e.target);
}

export function getSubtree(id) {
  const result = [];
  const queue = [id];
  while (queue.length) {
    const cur = queue.shift();
    result.push(cur);
    queue.push(...getChildren(cur));
  }
  return result;
}

export function getRootId() {
  const childIds = new Set(EDGES.map(e => e.target));
  for (const id of NODES.keys()) {
    if (!childIds.has(id)) return id;
  }
  return NODES.keys().next().value ?? null;
}

// ─── Serialization ────────────────────────────────────────────────────────────

export function exportJSON() {
  return JSON.stringify({
    version: 1,
    nodes: [...NODES.values()],
    edges: [...EDGES],
  }, null, 2);
}

export function importJSON(json) {
  const data = typeof json === 'string' ? JSON.parse(json) : json;
  NODES.clear();
  EDGES.length = 0;
  (data.nodes || []).forEach(n => NODES.set(n.id, n));
  (data.edges || []).forEach(e => EDGES.push(e));
  // sync _idCounter so new ids don't collide
  let max = 0;
  for (const id of NODES.keys()) {
    const n = parseInt(id.slice(1), 36);
    if (!isNaN(n) && n > max) max = n;
  }
  _idCounter = max;
}

// ─── Default map ──────────────────────────────────────────────────────────────

export function initDefault() {
  const root = createNode('OpenMind');
  const a = createNode('轻量化', root);
  const b = createNode('智能化', root);
  const c = createNode('开源', root);
  createNode('单 HTML 可跑', a);
  createNode('无后端依赖', a);
  createNode('Agent 对话', b);
  createNode('Claude / OpenAI', b);
  createNode('MIT License', c);
  createNode('社区驱动', c);
  return root;
}
