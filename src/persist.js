// ─── Persistence: localStorage + import/export ────────────────────────────────

import { exportJSON, importJSON, getRootId } from './model.js';
import { render } from './render.js';

const LS_KEY = 'openmind_map';

// ─── Auto-save (debounced) ────────────────────────────────────────────────────

let _saveTimer = null;

export function scheduleSave() {
  clearTimeout(_saveTimer);
  _saveTimer = setTimeout(() => {
    try { localStorage.setItem(LS_KEY, exportJSON()); } catch (_) {}
  }, 500);
}

export function loadFromStorage() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) { importJSON(raw); return true; }
  } catch (_) {}
  return false;
}

// ─── Export JSON ──────────────────────────────────────────────────────────────

export function downloadJSON() {
  const blob = new Blob([exportJSON()], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'mindmap.json';
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Import JSON ──────────────────────────────────────────────────────────────

export function uploadJSON(callback) {
  const input = document.createElement('input');
  input.type = 'file'; input.accept = '.json';
  input.addEventListener('change', async () => {
    const file = input.files[0];
    if (!file) return;
    const text = await file.text();
    try {
      importJSON(text);
      render(getRootId());
      scheduleSave();
      if (callback) callback();
    } catch (err) {
      alert('文件格式错误：' + err.message);
    }
  });
  input.click();
}

// ─── Export SVG ───────────────────────────────────────────────────────────────

export function downloadSVG() {
  const svgEl = document.getElementById('canvas');
  if (!svgEl) return;
  const clone = svgEl.cloneNode(true);
  // Embed font hint
  const style = document.createElementNS('http://www.w3.org/2000/svg', 'style');
  style.textContent = `text { font-family: 'Microsoft YaHei', sans-serif; }`;
  clone.insertBefore(style, clone.firstChild);

  const xml = new XMLSerializer().serializeToString(clone);
  const blob = new Blob([xml], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'mindmap.svg';
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Export PNG ───────────────────────────────────────────────────────────────

export function downloadPNG() {
  const svgEl = document.getElementById('canvas');
  if (!svgEl) return;
  const W = svgEl.clientWidth, H = svgEl.clientHeight;
  const xml = new XMLSerializer().serializeToString(svgEl);
  const blob = new Blob([xml], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = W * 2; canvas.height = H * 2;  // 2x for retina
    const ctx = canvas.getContext('2d');
    ctx.scale(2, 2);
    ctx.fillStyle = '#04080f';
    ctx.fillRect(0, 0, W, H);
    ctx.drawImage(img, 0, 0);
    URL.revokeObjectURL(url);
    canvas.toBlob(b => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(b); a.download = 'mindmap.png';
      a.click();
    }, 'image/png');
  };
  img.src = url;
}
