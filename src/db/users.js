const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const { hashPassword } = require('../middleware/auth');

const USERS_FILE = path.resolve(__dirname, 'users.json');

async function ensureUsersFile() {
  try {
    await fs.access(USERS_FILE);
  } catch (error) {
    await fs.writeFile(USERS_FILE, JSON.stringify([]), 'utf8');
  }
}

async function readUsers() {
  await ensureUsersFile();
  const raw = await fs.readFile(USERS_FILE, 'utf8');
  try {
    return JSON.parse(raw);
  } catch (error) {
    return [];
  }
}

async function writeUsers(users) {
  await ensureUsersFile();
  await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
}

async function getUserByEmail(email) {
  const users = await readUsers();
  return users.find((user) => user.email.toLowerCase() === email.toLowerCase()) || null;
}

async function getUserById(id) {
  const users = await readUsers();
  return users.find((user) => user.id === id) || null;
}

/**
 * role: 'owner' (dono da plataforma, sem locationId) | 'admin' (admin de um
 * local) | 'user' (usuário comum de um local). 'owner' NUNCA é setável por
 * essa função a partir de uma rota HTTP -- só o script create-admin.js cria
 * owner. Rotas sempre passam role 'user'/'admin' pra cá.
 */
async function addUser({ email, name, password, role = 'user', locationId = null }) {
  const existingUser = await getUserByEmail(email);
  if (existingUser) {
    throw new Error('Usuario ja cadastrado');
  }

  const userId = crypto.randomUUID();
  const { salt, hash } = hashPassword(password);
  const user = {
    id: userId,
    email: email.toLowerCase(),
    name: name.trim(),
    passwordHash: hash,
    passwordSalt: salt,
    role: role === 'owner' ? 'owner' : role === 'admin' ? 'admin' : 'user',
    locationId: role === 'owner' ? null : locationId,
    createdAt: new Date().toISOString(),
  };

  const users = await readUsers();
  users.push(user);
  await writeUsers(users);
  return user;
}

async function listUsers({ locationId } = {}) {
  const users = await readUsers();
  if (!locationId) return users;
  return users.filter((user) => user.locationId === locationId);
}

async function countUsers() {
  const users = await readUsers();
  return users.length;
}

async function deleteUser(id) {
  const users = await readUsers();
  const before = users.length;
  const filtered = users.filter((user) => user.id !== id);
  if (filtered.length === before) return false;
  await writeUsers(filtered);
  return true;
}

module.exports = {
  getUserByEmail,
  getUserById,
  addUser,
  listUsers,
  countUsers,
  deleteUser,
};
