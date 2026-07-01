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

async function addUser({ email, name, password }) {
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
    createdAt: new Date().toISOString(),
  };

  const users = await readUsers();
  users.push(user);
  await writeUsers(users);
  return user;
}

module.exports = {
  getUserByEmail,
  getUserById,
  addUser,
};
