const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DB_FILE = path.join(__dirname, '..', '..', 'data', 'tvs.json');

/**
 * "Banco de dados" simples em JSON. Não é pra escala de produção,
 * mas resolve bem pra uma coleção de TVs de uma casa/comunidade e
 * não exige nenhuma dependência nativa (importante pro ambiente
 * Termux/Android, onde compilar módulos nativos costuma dar dor
 * de cabeça).
 *
 * Formato do arquivo: { "tvs": [ {id, name, brand, ip, mac, token, createdAt}, ... ] }
 */
function ensureDbFile() {
  const dir = path.dirname(DB_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify({ tvs: [] }, null, 2));
  }
}

function readDb() {
  ensureDbFile();
  const raw = fs.readFileSync(DB_FILE, 'utf-8');
  try {
    return JSON.parse(raw);
  } catch {
    return { tvs: [] };
  }
}

function writeDb(data) {
  ensureDbFile();
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

function listTvs() {
  return readDb().tvs;
}

function getTv(id) {
  return readDb().tvs.find((t) => t.id === id) || null;
}

function addTv({ name, brand, ip, mac, token }) {
  const db = readDb();
  const tv = {
    id: crypto.randomUUID(),
    name,
    brand,
    ip,
    mac,
    token: token || null,
    createdAt: new Date().toISOString(),
  };
  db.tvs.push(tv);
  writeDb(db);
  return tv;
}

function updateTv(id, patch) {
  const db = readDb();
  const idx = db.tvs.findIndex((t) => t.id === id);
  if (idx === -1) return null;
  db.tvs[idx] = { ...db.tvs[idx], ...patch };
  writeDb(db);
  return db.tvs[idx];
}

function removeTv(id) {
  const db = readDb();
  const before = db.tvs.length;
  db.tvs = db.tvs.filter((t) => t.id !== id);
  writeDb(db);
  return db.tvs.length < before;
}

module.exports = { listTvs, getTv, addTv, updateTv, removeTv };