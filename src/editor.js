// ─── Editor: keyboard shortcuts + undo stack ──────────────────────────────────

import { NODES, EDGES, createNode, deleteNode, updateNode, exportJSON, importJSON, getRootId } from './model.js';
import { render, selectNode, selectedId, startEdit, commitEdit, toggleCollapse, fitToScreen, setLayoutMode } from './render.js';

// ─── Undo stack ───────────────────────────────────────────────────────────────

const MAX_UNDO = 50;
const _undoStack = [];
let _undoPointer = -1;

export function snapshot() {
  // Truncate redo branch
  _undoStack.splice(_undoPointer + 1);
  _undoStack.push(exportJSON());
  if (_undoStack.length > MAX_UNDO) _undoStack.shift();
  _undoPointer = _undoStack.length - 1;
}

export function undo() {
  if (_undoPointer <= 0) return;
  _undoPointer--;
  importJSON(_undoStack[_undoPointer]);
  render(getRootId());
}

export function redo() {
  if (_undoPointer >= _undoStack.length - 1) return;
  _undoPointer++;
  importJSON(_undoStack[_undoPointer]);
  render(getRootId());
}

// ─── Node operations (each calls snapshot before mutating) ───────────────────

export function addChild(parentId) {
  if (!parentId) return;
  snapshot();
  const parent = NODES.get(parentId);
  if (parent?.collapsed) parent.collapsed = false;
  const id = createNode('新节点', parentId);
  render(getRootId());
  selectNode(id);
  setTimeout(() => startEdit(id), 50);
}

export function addSibling(id) {
  if (!id) return;
  const node = NODES.get(id);
  if (!node?.parentId) { addChild(id); return; }
  snapshot();
  const newId = createNode('新节点', node.parentId);
  render(getRootId());
  selectNode(newId);
  setTimeout(() => startEdit(newId), 50);
}

export function removeNode(id) {
  if (!id) return;
  const node = NODES.get(id);
  if (!node?.parentId) return;  // don't delete root
  snapshot();
  const parentId = node.parentId;
  deleteNode(id);
  render(getRootId());
  selectNode(parentId);
}

// ─── Keyboard routing ─────────────────────────────────────────────────────────

export function initKeyboard() {
  document.addEventListener('keydown', e => {
    // Don't capture when typing in input/textarea
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    const sel = selectedId;

    if (e.key === 'Tab') {
      e.preventDefault();
      addChild(sel);
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      addSibling(sel);
    } else if ((e.key === 'Delete' || e.key === 'Backspace') && sel) {
      e.preventDefault();
      removeNode(sel);
    } else if (e.key === ' ' && sel) {
      e.preventDefault();
      toggleCollapse(sel);
    } else if (e.key === 'F2' && sel) {
      e.preventDefault();
      startEdit(sel);
    } else if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
      e.preventDefault();
      undo();
    } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
      e.preventDefault();
      redo();
    } else if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
      e.preventDefault();
      fitToScreen();
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown' ||
               e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
      navigateByArrow(sel, e.key);
    }
  });
}

function navigateByArrow(currentId, key) {
  if (!currentId) {
    selectNode(getRootId());
    return;
  }
  const node = NODES.get(currentId);
  if (!node) return;

  if (key === 'ArrowRight') {
    const children = getVisibleChildren(currentId);
    if (children.length) selectNode(children[0]);
  } else if (key === 'ArrowLeft') {
    if (node.parentId) selectNode(node.parentId);
  } else if (key === 'ArrowUp' || key === 'ArrowDown') {
    if (!node.parentId) return;
    const siblings = getVisibleChildren(node.parentId);
    const idx = siblings.indexOf(currentId);
    const next = key === 'ArrowUp' ? siblings[idx - 1] : siblings[idx + 1];
    if (next) selectNode(next);
  }
}

function getVisibleChildren(id) {
  const n = NODES.get(id);
  if (!n || n.collapsed) return [];
  return EDGES.filter(e => e.source === id).map(e => e.target).filter(t => NODES.has(t));
}

// ─── Layout switcher (exposed to toolbar) ────────────────────────────────────

export function switchLayout(mode) {
  setLayoutMode(mode);
}
