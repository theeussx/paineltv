#!/usr/bin/env node
/**
 * Cria (ou promove) o usuário administrador do painel.
 *
 * Por que um script e não uma rota HTTP?
 * Porque qualquer rota de criação de admin acessível pela rede é uma porta
 * de entrada. Rodando por aqui, só quem tem acesso ao terminal/servidor
 * (ou seja, você) consegue criar um admin.
 *
 * Uso:
 *   ADMIN_EMAIL=voce@exemplo.com ADMIN_PASSWORD='SenhaForte123!' ADMIN_NAME="Seu Nome" \
 *     node src/scripts/create-admin.js
 *
 * Se já existir um usuário com esse email, ele é promovido a admin
 * (útil pra corrigir o próprio usuário caso tenha sido criado como 'user').
 */
require('dotenv').config();
const readline = require('readline');
const { getUserByEmail, addUser } = require('../db/users');
const { validateEmail, validatePassword } = require('../lib/validators');
const fs = require('fs');
const path = require('path');

function ask(question, { hidden = false } = {}) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function promoteExistingUser(user) {
  const USERS_FILE = path.resolve(__dirname, '..', 'db', 'users.json');
  const users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
  const idx = users.findIndex((u) => u.id === user.id);
  users[idx].role = 'admin';
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
}

async function main() {
  let email = process.env.ADMIN_EMAIL;
  let password = process.env.ADMIN_PASSWORD;
  let name = process.env.ADMIN_NAME;

  if (!email) email = await ask('Email do admin: ');
  if (!validateEmail(email)) {
    console.error('❌ Email inválido.');
    process.exit(1);
  }

  const existing = await getUserByEmail(email);
  if (existing) {
    if (existing.role === 'admin') {
      console.log('ℹ️  Esse usuário já é admin. Nada a fazer.');
      process.exit(0);
    }
    await promoteExistingUser(existing);
    console.log(`✅ Usuário ${email} promovido a admin.`);
    process.exit(0);
  }

  if (!name) name = await ask('Nome do admin: ');
  if (!name || name.trim().length < 2) {
    console.error('❌ Nome inválido.');
    process.exit(1);
  }

  if (!password) password = await ask('Senha do admin (8+ chars, maiúscula, minúscula, número, símbolo): ');
  if (!validatePassword(password)) {
    console.error(
      '❌ Senha fraca. Use 8+ caracteres com maiúscula, minúscula, número e símbolo.'
    );
    process.exit(1);
  }

  const admin = await addUser({ email, password, name, role: 'admin' });
  console.log(`✅ Admin criado: ${admin.email} (id: ${admin.id})`);
  process.exit(0);
}

main().catch((err) => {
  console.error('Erro ao criar admin:', err.message || err);
  process.exit(1);
});
