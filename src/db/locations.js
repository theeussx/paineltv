const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

const LOCATIONS_FILE = path.resolve(__dirname, 'locations.json');

async function ensureFile() {
  try {
    await fs.access(LOCATIONS_FILE);
  } catch {
    await fs.writeFile(LOCATIONS_FILE, JSON.stringify([]), 'utf8');
  }
}

async function readAll() {
  await ensureFile();
  const raw = await fs.readFile(LOCATIONS_FILE, 'utf8');
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

async function writeAll(locations) {
  await ensureFile();
  await fs.writeFile(LOCATIONS_FILE, JSON.stringify(locations, null, 2), 'utf8');
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

// Gera um token de site de alta entropia. Só é mostrado uma vez, na criação
// (ou na rotação). O que fica salvo em disco é sempre o hash, nunca o token cru
// — igual senha. Se alguém copiar o locations.json, não consegue se passar
// por um agente com isso.
function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

async function listLocations() {
  return readAll();
}

async function getLocationById(id) {
  const locations = await readAll();
  return locations.find((l) => l.id === id) || null;
}

// Usado pelo agentHub para autenticar uma conexão recebida.
async function findLocationByToken(token) {
  const tokenHash = hashToken(token);
  const locations = await readAll();
  return locations.find((l) => l.tokenHash === tokenHash) || null;
}

async function createLocation({ name }) {
  const locations = await readAll();
  const token = generateToken();
  const location = {
    id: crypto.randomUUID(),
    name: name.trim(),
    tokenHash: hashToken(token),
    createdAt: new Date().toISOString(),
  };
  locations.push(location);
  await writeAll(locations);
  // O token cru só existe aqui, na resposta desta função. Nunca mais é
  // recuperável depois -- se perder, precisa rotacionar.
  return { location, token };
}

async function rotateToken(id) {
  const locations = await readAll();
  const idx = locations.findIndex((l) => l.id === id);
  if (idx === -1) return null;
  const token = generateToken();
  locations[idx].tokenHash = hashToken(token);
  await writeAll(locations);
  return { location: locations[idx], token };
}

async function deleteLocation(id) {
  const locations = await readAll();
  const before = locations.length;
  const filtered = locations.filter((l) => l.id !== id);
  if (filtered.length === before) return false;
  await writeAll(filtered);
  return true;
}

module.exports = {
  listLocations,
  getLocationById,
  findLocationByToken,
  createLocation,
  rotateToken,
  deleteLocation,
};
