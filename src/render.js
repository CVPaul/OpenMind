// ─── SVG Renderer ─────────────────────────────────────────────────────────────

import { NODES, EDGES, getChildren } from './model.js';
import { layoutTree } from './layout.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

// ─── State ────────────────────────────────────────────────────────────────────

export let camera = { x: 0, y: 0, scale: 1 };
export let selectedId = null;
export let layoutMode = 'horizontal';

let _svg = null;
let _viewport = null;
let _edgesLayer = null;
let _nodesLayer = null;
let _onSelect = null;  // callback(id)

// ─── Init ─────────────────────────────────────────────────────────────────────

export function initRenderer(svgEl, onSelectCallback) {
  _svg = svgEl;
  _onSelect = onSelectCallback;

  _viewport   = mkEl('g', { id: 'viewport' });
  _edgesLayer = mkEl('g', { id: 'edges-layer' });
  _nodesLayer = mkEl('g', { id: 'nodes-layer' });
  _viewport.appendChild(_edgesLayer);
  _viewport.appendChild(_nodesLayer);
  _svg.appendChild(_viewport);

  bindCamera();
  updateViewport();
}

export function setLayoutMode(mode) {
  layoutMode = mode;
  render();
}

// ─── Main render ──────────────────────────────────────────────────────────────

export function render(rootId) {
  if (!_svg) return;
  layoutTree(rootId, layoutMode);
  _edgesLayer.innerHTML = '';
  _nodesLayer.innerHTML = '';

  // Draw edges first (behind nodes)
  for (const e of EDGES) {
    const src = NODES.get(e.source), tgt = NODES.get(e.target);
    if (!src || !tgt) continue;
    if (!isVisible(e.source) || !isVisible(e.target)) continue;
    _edgesLayer.appendChild(renderEdge(src, tgt));
  }

  // Draw nodes
  for (const [id, node] of NODES) {
    if (!isVisible(id)) continue;
    _nodesLayer.appendChild(renderNode(node));
  }

  updateViewport();
}

// A node is visible if none of its ancestors are collapsed
function isVisible(id) {
  let cur = NODES.get(id);
  if (!cur) return false;
  let pid = cur.parentId;
  while (pid) {
    const p = NODES.get(pid);
    if (!p) break;
    if (p.collapsed) return false;
    pid = p.parentId;
  }
  return true;
}

// ─── Node ─────────────────────────────────────────────────────────────────────

const PALETTE = [
  '#3b82f6','#10b981','#f59e0b','#ef4444','#a855f7',
  '#06b6d4','#f97316','#84cc16','#ec4899','#6366f1',
];

function nodeDepth(id) {
  let d = 0, cur = NODES.get(id);
  while (cur?.parentId) { d++; cur = NODES.get(cur.parentId); }
  return d;
}

function nodeColor(node) {
  if (node.meta?.color) return node.meta.color;
  const depth = nodeDepth(node.id);
  if (depth === 0) return '#2563eb';
  // color by root-child branch
  const rootChildren = getChildren(node.parentId || node.id);
  let ancestor = node.id;
  let cur = NODES.get(node.id);
  while (cur?.parentId && NODES.get(cur.parentId)?.parentId) {
    ancestor = cur.parentId;
    cur = NODES.get(cur.parentId);
  }
  const idx = rootChildren.indexOf(ancestor);
  return PALETTE[Math.abs(idx) % PALETTE.length];
}

function renderNode(node) {
  const g = mkEl('g', { class: 'node-g', transform: `translate(${node.x},${node.y})` });
  g.dataset.id = node.id;

  const isRoot = !node.parentId;
  const color = nodeColor(node);
  const w = node.width, h = node.height;

  const rect = mkEl('rect', {
    x: -w / 2, y: -h / 2, width: w, height: h,
    rx: isRoot ? 10 : 6,
    fill: hexAlpha(color, isRoot ? 0.18 : 0.10),
    stroke: color,
    'stroke-width': isRoot ? 2 : 1.2,
    'stroke-opacity': isRoot ? 1 : 0.6,
  });

  const text = mkEl('text', {
    'text-anchor': 'middle',
    'dominant-baseline': 'central',
    fill: isRoot ? '#fff' : lighten(color),
    'font-size': isRoot ? 14 : 12,
    'font-weight': isRoot ? 700 : 500,
    'font-family': "'Microsoft YaHei','PingFang SC','Segoe UI',sans-serif",
    'pointer-events': 'none',
  });
  text.textContent = node.label;

  // Collapse indicator
  const children = getChildren(node.id);
  if (children.length > 0) {
    const dot = mkEl('circle', {
      cx: w / 2 + 8, cy: 0, r: 5,
      fill: node.collapsed ? color : hexAlpha(color, 0.3),
      stroke: color, 'stroke-width': 1.2,
      class: 'collapse-dot', cursor: 'pointer',
    });
    dot.addEventListener('click', e => {
      e.stopPropagation();
      toggleCollapse(node.id);
    });
    g.appendChild(dot);
  }

  g.appendChild(rect);
  g.appendChild(text);

  // Selection ring
  if (node.id === selectedId) {
    const sel = mkEl('rect', {
      x: -w / 2 - 3, y: -h / 2 - 3,
      width: w + 6, height: h + 6,
      rx: isRoot ? 12 : 8,
      fill: 'none', stroke: color,
      'stroke-width': 2, 'stroke-dasharray': '6,3',
      'pointer-events': 'none',
    });
    g.appendChild(sel);
  }

  g.style.cursor = 'pointer';
  g.addEventListener('click', e => { e.stopPropagation(); selectNode(node.id); });
  g.addEventListener('dblclick', e => { e.stopPropagation(); startEdit(node.id); });
  bindDrag(g, node);

  return g;
}

// ─── Edge ─────────────────────────────────────────────────────────────────────

function renderEdge(src, tgt) {
  const hw = src.width / 2;
  // Connect right-center of src to left-center of tgt (horizontal mode)
  const x1 = src.x + (tgt.x > src.x ? hw : -hw);
  const y1 = src.y;
  const x2 = tgt.x - (tgt.x > src.x ? tgt.width / 2 : -tgt.width / 2);
  const y2 = tgt.y;
  const mx = (x1 + x2) / 2;

  const color = nodeColor(tgt);
  const path = mkEl('path', {
    d: `M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`,
    fill: 'none',
    stroke: hexAlpha(color, 0.45),
    'stroke-width': 1.4,
  });
  return path;
}

// ─── Collapse ─────────────────────────────────────────────────────────────────

export function toggleCollapse(id) {
  const n = NODES.get(id);
  if (!n) return;
  n.collapsed = !n.collapsed;
  render();
}

// ─── Selection ────────────────────────────────────────────────────────────────

export function selectNode(id) {
  selectedId = id;
  if (_onSelect) _onSelect(id);
  render();
}

export function clearSelection() {
  selectedId = null;
  render();
}

// ─── Inline edit ──────────────────────────────────────────────────────────────

let _editingId = null;

export function startEdit(id) {
  if (_editingId) commitEdit();
  _editingId = id;
  const node = NODES.get(id);
  if (!node) return;

  // Remove existing node element and replace with foreignObject input
  const existing = _nodesLayer.querySelector(`[data-id="${id}"]`);
  if (existing) existing.remove();

  const fo = mkEl('foreignObject', {
    x: node.x - node.width / 2,
    y: node.y - node.height / 2,
    width: node.width,
    height: node.height,
  });
  fo.id = 'edit-fo';

  const input = document.createElement('input');
  input.value = node.label;
  input.style.cssText = `
    width:100%;height:100%;border:none;outline:none;background:transparent;
    color:#fff;font-size:12px;font-weight:500;text-align:center;
    font-family:'Microsoft YaHei','PingFang SC','Segoe UI',sans-serif;
  `;
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === 'Escape') { e.preventDefault(); commitEdit(input.value); }
  });
  input.addEventListener('blur', () => commitEdit(input.value));
  fo.appendChild(input);
  _nodesLayer.appendChild(fo);
  input.focus();
  input.select();
}

export function commitEdit(value) {
  if (!_editingId) return;
  const id = _editingId;
  _editingId = null;
  const fo = document.getElementById('edit-fo');
  if (fo) fo.remove();
  if (value !== undefined && value.trim()) {
    NODES.get(id).label = value.trim();
    NODES.get(id).width = Math.max(80, value.trim().length * 8 + 24);
  }
  render();
}

// ─── Camera / pan / zoom ──────────────────────────────────────────────────────

function updateViewport() {
  if (!_viewport) return;
  _viewport.setAttribute('transform', `translate(${camera.x},${camera.y}) scale(${camera.scale})`);
}

function bindCamera() {
  let panning = false, lastX = 0, lastY = 0;

  _svg.addEventListener('wheel', e => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.1 : 0.91;
    const rect = _svg.getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    camera.x = mx - (mx - camera.x) * factor;
    camera.y = my - (my - camera.y) * factor;
    camera.scale = Math.min(3, Math.max(0.2, camera.scale * factor));
    updateViewport();
  }, { passive: false });

  _svg.addEventListener('pointerdown', e => {
    if (e.target === _svg || e.target === _viewport ||
        e.target === _edgesLayer || e.target.tagName === 'path') {
      panning = true; lastX = e.clientX; lastY = e.clientY;
      _svg.setPointerCapture(e.pointerId);
      clearSelection();
    }
  });
  _svg.addEventListener('pointermove', e => {
    if (!panning) return;
    camera.x += e.clientX - lastX;
    camera.y += e.clientY - lastY;
    lastX = e.clientX; lastY = e.clientY;
    updateViewport();
  });
  _svg.addEventListener('pointerup', () => { panning = false; });
}

// ─── Node drag ────────────────────────────────────────────────────────────────

function bindDrag(g, node) {
  let dragging = false, startX = 0, startY = 0, origX = 0, origY = 0;

  g.addEventListener('pointerdown', e => {
    if (e.target.classList.contains('collapse-dot')) return;
    dragging = true;
    startX = e.clientX; startY = e.clientY;
    origX = node.x; origY = node.y;
    g.setPointerCapture(e.pointerId);
    e.stopPropagation();
  });
  g.addEventListener('pointermove', e => {
    if (!dragging) return;
    const dx = (e.clientX - startX) / camera.scale;
    const dy = (e.clientY - startY) / camera.scale;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
      node.x = origX + dx;
      node.y = origY + dy;
      // Live update transform without full re-render
      g.setAttribute('transform', `translate(${node.x},${node.y})`);
      // Redraw edges only
      _edgesLayer.innerHTML = '';
      for (const edge of EDGES) {
        const s = NODES.get(edge.source), t = NODES.get(edge.target);
        if (s && t) _edgesLayer.appendChild(renderEdge(s, t));
      }
    }
  });
  g.addEventListener('pointerup', () => { dragging = false; });
}

// ─── Fit to screen ────────────────────────────────────────────────────────────

export function fitToScreen() {
  if (!_svg || NODES.size === 0) return;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const [, n] of NODES) {
    minX = Math.min(minX, n.x - n.width / 2);
    minY = Math.min(minY, n.y - n.height / 2);
    maxX = Math.max(maxX, n.x + n.width / 2);
    maxY = Math.max(maxY, n.y + n.height / 2);
  }
  const W = _svg.clientWidth, H = _svg.clientHeight;
  const mw = maxX - minX + 80, mh = maxY - minY + 80;
  camera.scale = Math.min(3, Math.max(0.2, Math.min(W / mw, H / mh)));
  camera.x = W / 2 - (minX + mw / 2 - 40) * camera.scale;
  camera.y = H / 2 - (minY + mh / 2 - 40) * camera.scale;
  updateViewport();
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mkEl(tag, attrs = {}) {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el;
}

function hexAlpha(hex, a) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${a})`;
}

function lighten(hex) {
  // Return a lighter version for text on dark bg
  const r = Math.min(255, parseInt(hex.slice(1, 3), 16) + 60);
  const g = Math.min(255, parseInt(hex.slice(3, 5), 16) + 60);
  const b = Math.min(255, parseInt(hex.slice(5, 7), 16) + 60);
  return `rgb(${r},${g},${b})`;
}
