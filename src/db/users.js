const pool = require('./pool');
const { hashPassword } = require('../middleware/auth');

function mapRow(row) {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    passwordHash: row.password_hash,
    passwordSalt: row.password_salt,
    role: row.role,
    locationId: row.location_id,
    createdAt: row.created_at,
  };
}

async function getUserByEmail(email) {
  const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);
  return rows[0] ? mapRow(rows[0]) : null;
}

async function getUserById(id) {
  const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
  return rows[0] ? mapRow(rows[0]) : null;
}

/**
 * role: 'owner' (dono da plataforma, sem locationId) | 'admin' (admin de um
 * local) | 'user' (usuário comum de um local). 'owner' NUNCA é setável por
 * essa função a partir de uma rota HTTP -- só o script create-owner.js cria
 * owner. Rotas sempre passam role 'user'/'admin' pra cá.
 */
async function addUser({ email, name, password, role = 'user', locationId = null }) {
  const existingUser = await getUserByEmail(email);
  if (existingUser) {
    throw new Error('Usuario ja cadastrado');
  }

  const normalizedRole = role === 'owner' ? 'owner' : role === 'admin' ? 'admin' : 'user';
  const { salt, hash } = hashPassword(password);

  const { rows } = await pool.query(
    `INSERT INTO users (email, name, password_hash, password_salt, role, location_id)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [
      email.toLowerCase(),
      name.trim(),
      hash,
      salt,
      normalizedRole,
      normalizedRole === 'owner' ? null : locationId,
    ]
  );
  return mapRow(rows[0]);
}

async function listUsers({ locationId } = {}) {
  if (!locationId) {
    const { rows } = await pool.query('SELECT * FROM users ORDER BY created_at ASC');
    return rows.map(mapRow);
  }
  const { rows } = await pool.query(
    'SELECT * FROM users WHERE location_id = $1 ORDER BY created_at ASC',
    [locationId]
  );
  return rows.map(mapRow);
}

async function countUsers() {
  const { rows } = await pool.query('SELECT COUNT(*)::int AS count FROM users');
  return rows[0].count;
}

async function deleteUser(id) {
  const { rowCount } = await pool.query('DELETE FROM users WHERE id = $1', [id]);
  return rowCount > 0;
}

/**
 * Promove um usuário existente a owner (usado só pelo script de bootstrap,
 * pra corrigir/promover um usuário que já existia como admin de local).
 */
async function promoteToOwner(id) {
  await pool.query("UPDATE users SET role = 'owner', location_id = NULL WHERE id = $1", [id]);
}

module.exports = {
  getUserByEmail,
  getUserById,
  addUser,
  listUsers,
  countUsers,
  deleteUser,
  promoteToOwner,
};
