const crypto = require('crypto');
const pool = require('./pool');

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

function mapRow(row) {
  return {
    id: row.id,
    name: row.name,
    tokenHash: row.token_hash,
    createdAt: row.created_at,
  };
}

async function listLocations() {
  const { rows } = await pool.query('SELECT * FROM locations ORDER BY created_at ASC');
  return rows.map(mapRow);
}

async function getLocationById(id) {
  const { rows } = await pool.query('SELECT * FROM locations WHERE id = $1', [id]);
  return rows[0] ? mapRow(rows[0]) : null;
}

// Usado pelo agentHub pra autenticar uma conexão recebida.
async function findLocationByToken(token) {
  const tokenHash = hashToken(token);
  const { rows } = await pool.query('SELECT * FROM locations WHERE token_hash = $1', [tokenHash]);
  return rows[0] ? mapRow(rows[0]) : null;
}

async function createLocation({ name }) {
  const token = generateToken();
  const { rows } = await pool.query(
    'INSERT INTO locations (name, token_hash) VALUES ($1, $2) RETURNING *',
    [name.trim(), hashToken(token)]
  );
  // O token cru só existe aqui, na resposta desta função. Nunca mais é
  // recuperável depois -- se perder, precisa rotacionar.
  return { location: mapRow(rows[0]), token };
}

async function rotateToken(id) {
  const token = generateToken();
  const { rows } = await pool.query(
    'UPDATE locations SET token_hash = $1 WHERE id = $2 RETURNING *',
    [hashToken(token), id]
  );
  if (!rows[0]) return null;
  return { location: mapRow(rows[0]), token };
}

async function deleteLocation(id) {
  const { rowCount } = await pool.query('DELETE FROM locations WHERE id = $1', [id]);
  return rowCount > 0;
}

module.exports = {
  listLocations,
  getLocationById,
  findLocationByToken,
  createLocation,
  rotateToken,
  deleteLocation,
};
