// ─── Layout Engine (Walker algorithm, simplified) ─────────────────────────────
// Writes x/y directly into each NodeRecord.
// Supports three modes: 'horizontal' | 'vertical' | 'radial'

import { NODES, EDGES, getChildren, getRootId } from './model.js';

const LEVEL_GAP = 200;   // px between depth levels
const SIBLING_GAP = 14;  // px between sibling subtrees
const NODE_H = 36;       // default node height
const NODE_W_PAD = 24;   // horizontal padding for label

// Estimate node width from label length (monospace fallback)
function measureWidth(label) {
  return Math.max(80, label.length * 8 + NODE_W_PAD);
}

// ─── Walker pass helpers ───────────────────────────────────────────────────────

function initSizes() {
  for (const [, n] of NODES) {
    n.width  = measureWidth(n.label);
    n.height = NODE_H;
    n._prelim   = 0;
    n._modifier = 0;
    n._thread   = null;
    n._ancestor = n;
    n._change   = 0;
    n._shift    = 0;
    n._number   = 0;  // index among siblings
  }
}

function firstWalk(id, siblings, index) {
  const n = NODES.get(id);
  n._number = index;
  const children = isCollapsed(id) ? [] : getChildren(id);

  if (children.length === 0) {
    const leftSibling = siblings[index - 1];
    n._prelim = leftSibling
      ? NODES.get(leftSibling)._prelim + siblingDist(leftSibling, id)
      : 0;
  } else {
    children.forEach((cid, i) => firstWalk(cid, children, i));
    const midpoint = (NODES.get(children[0])._prelim + NODES.get(children[children.length - 1])._prelim) / 2;
    const leftSibling = siblings[index - 1];
    if (leftSibling) {
      n._prelim = NODES.get(leftSibling)._prelim + siblingDist(leftSibling, id);
      n._modifier = n._prelim - midpoint;
      apportion(id, leftSibling, siblings);
    } else {
      n._prelim = midpoint;
    }
  }
}

function siblingDist(leftId, rightId) {
  const l = NODES.get(leftId), r = NODES.get(rightId);
  return (l.height + r.height) / 2 + SIBLING_GAP;
}

function apportion(id, leftSibling, siblings) {
  // Simplified: just ensure no overlap between subtrees
  const n = NODES.get(id);
  let shift = 0;
  const children = isCollapsed(id) ? [] : getChildren(id);
  if (children.length && leftSibling) {
    const lChildren = isCollapsed(leftSibling) ? [] : getChildren(leftSibling);
    if (lChildren.length) {
      const lRight = NODES.get(lChildren[lChildren.length - 1])._prelim + NODES.get(leftSibling)._modifier;
      const rLeft  = NODES.get(children[0])._prelim;
      shift = lRight - rLeft + SIBLING_GAP;
    }
  }
  if (shift > 0) {
    n._prelim   += shift;
    n._modifier += shift;
  }
}

function secondWalk(id, modSum, depth) {
  const n = NODES.get(id);
  n._y = n._prelim + modSum;   // cross-axis (will become y in horizontal)
  n._x = depth * LEVEL_GAP;   // main-axis  (will become x in horizontal)
  const children = isCollapsed(id) ? [] : getChildren(id);
  children.forEach(cid => secondWalk(cid, modSum + n._modifier, depth + 1));
}

function isCollapsed(id) {
  return NODES.get(id)?.collapsed ?? false;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function layoutTree(rootId, mode = 'horizontal') {
  if (!rootId || !NODES.has(rootId)) rootId = getRootId();
  if (!rootId) return;

  initSizes();

  const topChildren = isCollapsed(rootId) ? [] : getChildren(rootId);
  firstWalk(rootId, [rootId], 0);
  secondWalk(rootId, 0, 0);

  // Normalize: center root's y at 0
  const rootNode = NODES.get(rootId);
  const offsetY = -rootNode._y;
  for (const [, n] of NODES) {
    n._y += offsetY;
  }

  // Apply to node coords based on mode
  if (mode === 'horizontal') {
    for (const [, n] of NODES) {
      n.x = n._x;
      n.y = n._y;
    }
  } else if (mode === 'vertical') {
    for (const [, n] of NODES) {
      n.x = n._y;   // swap axes
      n.y = n._x;
    }
  } else if (mode === 'radial') {
    // Map depth → radius, angle from _y span
    let maxY = 1;
    for (const [, n] of NODES) if (Math.abs(n._y) > maxY) maxY = Math.abs(n._y);
    for (const [, n] of NODES) {
      const r = n._x;
      const angle = (n._y / maxY) * (Math.PI * 0.8);  // ±144°
      n.x = r * Math.cos(angle);
      n.y = r * Math.sin(angle);
    }
  }
}
