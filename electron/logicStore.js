import path from 'node:path';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import { app } from 'electron';
import { v4 as uuidv4 } from 'uuid';

// Base directory for logic storage
const baseDir = () => path.join(app.getPath('userData'), 'logics');
const indexPath = () => path.join(baseDir(), 'index.json');
const logicFile = (id) => path.join(baseDir(), `${id}.json`);

async function ensureBaseDir() {
  const dir = baseDir();
  if (!fs.existsSync(dir)) await fsp.mkdir(dir, { recursive: true });
}

// Read index.json (ordered array of { id, name, stock?, order })
export async function readIndex() {
  try {
    await ensureBaseDir();
    const idxFile = indexPath();
    if (!fs.existsSync(idxFile)) return [];
    const raw = await fsp.readFile(idxFile, 'utf-8');
    const arr = JSON.parse(raw);
    if (Array.isArray(arr)) return normalizeIndex(arr);
    return [];
  } catch {
    return [];
  }
}

export async function writeIndex(items) {
  await ensureBaseDir();
  const idxFile = indexPath();
  const normalized = normalizeIndex(items);
  await fsp.writeFile(idxFile, JSON.stringify(normalized, null, 2), 'utf-8');
  return true;
}

function normalizeIndex(items) {
  const list = (items || []).filter(Boolean).map((it, idx) => ({
    id: it.id,
    name: it.name || 'Untitled',
    stock: it.stock || undefined,
    order: typeof it.order === 'number' ? it.order : idx,
  }));
  // sort by order then stable by name
  return list.sort((a,b)=> (a.order ?? 0) - (b.order ?? 0));
}

export async function listLogics() {
  return readIndex();
}

export async function createLogic(name) {
  await ensureBaseDir();
  const id = `logic-${uuidv4()}`;
  const meta = { id, name: name || 'Untitled', order: Number.MAX_SAFE_INTEGER };
  // create file with minimal structure
  const payload = { id, name: meta.name, data: {} };
  await fsp.writeFile(logicFile(id), JSON.stringify(payload, null, 2), 'utf-8');
  // append to index
  const idx = await readIndex();
  const next = [...idx, meta].map((m, i) => ({ ...m, order: i }));
  await writeIndex(next);
  return meta;
}

export async function loadLogic(id) {
  await ensureBaseDir();
  const file = logicFile(id);
  if (!fs.existsSync(file)) return null;
  const raw = await fsp.readFile(file, 'utf-8');
  const obj = JSON.parse(raw);
  return obj;
}

export async function saveLogic(logic) {
  if (!logic || !logic.id) throw new Error('Invalid logic');
  await ensureBaseDir();
  const file = logicFile(logic.id);
  // 기존 파일이 있으면 apiKeys 등 보존
  let prev = {};
  if (fs.existsSync(file)) {
    try { prev = JSON.parse(await fsp.readFile(file, 'utf-8')); } catch {}
  }
  const toSave = {
    id: logic.id,
    name: logic.name || 'Untitled',
    stock: logic.stock,
    data: logic.data || {},
    apiKeys: logic.apiKeys || prev.apiKeys || undefined,
  };
  await fsp.writeFile(file, JSON.stringify(toSave, null, 2), 'utf-8');
  // update index meta if name/stock changed or ensure exists
  const idx = await readIndex();
  const existIdx = idx.findIndex((m) => m.id === logic.id);
  if (existIdx >= 0) {
    idx[existIdx] = { ...idx[existIdx], name: toSave.name, stock: toSave.stock };
    await writeIndex(idx);
  } else {
    // insert at end
    await writeIndex([...idx, { id: logic.id, name: toSave.name, stock: toSave.stock, order: idx.length }]);
  }
  return true;
}

export async function deleteLogic(id) {
  await ensureBaseDir();
  const file = logicFile(id);
  // remove file if exists
  if (fs.existsSync(file)) {
    try { await fsp.unlink(file); } catch {}
  }
  // update index
  const idx = await readIndex();
  const next = idx.filter((m) => m.id !== id).map((m, i) => ({ ...m, order: i }));
  await writeIndex(next);
  return true;
}

export async function reorderLogics(ids) {
  // ids: array of logic ids in desired order
  const idx = await readIndex();
  const map = new Map(idx.map((m) => [m.id, m]));
  const ordered = ids.map((id, i) => {
    const m = map.get(id);
    return { id, name: m?.name || 'Untitled', stock: m?.stock, order: i };
  });
  // include any missing ids at the end (defensive)
  idx.forEach((m) => {
    if (!ids.includes(m.id)) ordered.push({ ...m, order: ordered.length });
  });
  await writeIndex(ordered);
  return true;
}

// ---------------- Per-logic API Keys helpers ----------------
export async function loadLogicApiKeys(id) {
  const obj = await loadLogic(id);
  if (!obj) return null;
  const keys = obj.apiKeys;
  if (keys && keys.accessKey && keys.secretKey) return keys;
  return null;
}

export async function saveLogicApiKeys(id, accessKey, secretKey) {
  if (!id) throw new Error('Invalid id');
  await ensureBaseDir();
  const file = logicFile(id);
  let obj = { id, name: 'Untitled', data: {} };
  if (fs.existsSync(file)) {
    try { obj = JSON.parse(await fsp.readFile(file, 'utf-8')); } catch {}
  }
  obj.apiKeys = { accessKey, secretKey };
  await fsp.writeFile(file, JSON.stringify(obj, null, 2), 'utf-8');
  return true;
}
