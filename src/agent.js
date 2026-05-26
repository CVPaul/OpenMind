// ─── Agent: Claude / OpenAI integration ───────────────────────────────────────

import { NODES, EDGES, exportJSON, importJSON, getRootId, createNode } from './model.js';
import { render, selectedId } from './render.js';
import { snapshot, scheduleSave } from './editor.js';

// scheduleSave is re-exported from persist but wired via editor to avoid circular deps
// If circular: just inline debounced localStorage.setItem here.

// ─── Config (persisted in localStorage) ──────────────────────────────────────

const CFG_KEY = 'openmind_agent_cfg';

export function loadConfig() {
  try { return JSON.parse(localStorage.getItem(CFG_KEY) || '{}'); } catch { return {}; }
}

export function saveConfig(cfg) {
  localStorage.setItem(CFG_KEY, JSON.stringify(cfg));
}

// ─── System prompt ────────────────────────────────────────────────────────────

function buildSystemPrompt() {
  const mapJson = exportJSON();
  return `You are a mind map assistant embedded in OpenMind.
Current mind map (JSON):
${mapJson}

When the user sends a request, respond with ONLY a valid JSON object — no explanation, no markdown fences.
The JSON must follow this schema:
{
  "action": "replace" | "append" | "patch",
  "nodes": [ { "id": string, "label": string, "parentId": string|null, "meta": {} } ],
  "edges": [ { "source": string, "target": string } ]
}

Action semantics:
- "replace": Clear all existing data and use the provided nodes/edges as the new map.
- "append": Add the provided nodes/edges to the existing map (ids must not collide; use unique ids like "n_a1", "n_a2"…).
- "patch": Update labels/meta of existing nodes by id; do not change structure.

Rules:
- Always include the root node when action is "replace".
- Node ids must be unique strings.
- Every non-root node must appear as a target in edges.
- Keep labels concise (≤ 20 characters preferred).`;
}

// ─── API call ─────────────────────────────────────────────────────────────────

async function callClaude(messages, cfg) {
  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': cfg.apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: cfg.model || 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: buildSystemPrompt(),
      messages,
    }),
  });
  if (!resp.ok) throw new Error(`Claude API ${resp.status}: ${await resp.text()}`);
  const data = await resp.json();
  return data.content[0].text;
}

async function callOpenAI(messages, cfg) {
  const resp = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${cfg.apiKey}`,
    },
    body: JSON.stringify({
      model: cfg.model || 'gpt-4o',
      response_format: { type: 'json_object' },
      messages: [{ role: 'system', content: buildSystemPrompt() }, ...messages],
    }),
  });
  if (!resp.ok) throw new Error(`OpenAI API ${resp.status}: ${await resp.text()}`);
  const data = await resp.json();
  return data.choices[0].message.content;
}

// ─── Apply patch ──────────────────────────────────────────────────────────────

function applyPatch(patch) {
  if (!patch || !patch.action) throw new Error('Invalid patch: missing action');

  snapshot();  // save undo state before mutating

  if (patch.action === 'replace') {
    NODES.clear();
    EDGES.length = 0;
    (patch.nodes || []).forEach(n => {
      NODES.set(n.id, {
        id: n.id, label: n.label,
        x: 0, y: 0, width: 0, height: 0,
        collapsed: false,
        parentId: n.parentId ?? null,
        meta: n.meta || {},
      });
    });
    (patch.edges || []).forEach(e => EDGES.push(e));

  } else if (patch.action === 'append') {
    (patch.nodes || []).forEach(n => {
      NODES.set(n.id, {
        id: n.id, label: n.label,
        x: 0, y: 0, width: 0, height: 0,
        collapsed: false,
        parentId: n.parentId ?? null,
        meta: n.meta || {},
      });
    });
    (patch.edges || []).forEach(e => EDGES.push(e));

  } else if (patch.action === 'patch') {
    (patch.nodes || []).forEach(n => {
      const existing = NODES.get(n.id);
      if (existing) {
        if (n.label) existing.label = n.label;
        if (n.meta)  Object.assign(existing.meta, n.meta);
      }
    });
  }

  render(getRootId());
}

// ─── Conversation history ─────────────────────────────────────────────────────

const _history = [];  // { role, content }[]

export function getHistory() { return [..._history]; }
export function clearHistory() { _history.length = 0; }

// ─── Main chat entry point ────────────────────────────────────────────────────

export async function agentChat(userMsg) {
  const cfg = loadConfig();
  if (!cfg.apiKey) throw new Error('请先在设置面板填写 API Key');
  if (!cfg.provider) throw new Error('请选择 API 提供商（Claude / OpenAI）');

  _history.push({ role: 'user', content: userMsg });

  let rawResponse;
  if (cfg.provider === 'claude') {
    rawResponse = await callClaude([..._history], cfg);
  } else {
    rawResponse = await callOpenAI([..._history], cfg);
  }

  _history.push({ role: 'assistant', content: rawResponse });

  // Parse and apply
  let patch;
  try {
    // Strip potential markdown fences if model disobeys
    const cleaned = rawResponse.replace(/^```[a-z]*\n?/m, '').replace(/```$/m, '').trim();
    patch = JSON.parse(cleaned);
  } catch (err) {
    throw new Error(`模型返回了非 JSON 内容：${rawResponse.slice(0, 200)}`);
  }

  applyPatch(patch);
  return rawResponse;
}
