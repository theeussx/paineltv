#!/usr/bin/env node
/**
 * Cria (ou promove) o usuário 'owner' (dono da plataforma).
 *
 * Por que um script e não uma rota HTTP?
 * Porque qualquer rota de criação de admin acessível pela rede é uma porta
 * de entrada. Rodando por aqui, só quem tem acesso ao terminal/servidor
 * (ou seja, você) consegue criar um admin.
 *
 * Uso:
 *   OWNER_EMAIL=voce@exemplo.com OWNER_PASSWORD='SenhaForte123!' OWNER_NAME="Seu Nome" \
 *     node src/scripts/create-owner.js
 *
 * Se já existir um usuário com esse email, ele é promovido a owner
 * (útil se você criou seu usuário como admin de local por engano).
 */
require('dotenv').config();
const readline = require('readline');
const { getUserByEmail, addUser, promoteToOwner } = require('../db/users');
const { validateEmail, validatePassword } = require('../lib/validators');
const pool = require('../db/pool');

function ask(question, { hidden = false } = {}) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function main() {
  let email = process.env.OWNER_EMAIL;
  let password = process.env.OWNER_PASSWORD;
  let name = process.env.OWNER_NAME;

  if (!email) email = await ask('Email do owner: ');
  if (!validateEmail(email)) {
    console.error('❌ Email inválido.');
    process.exit(1);
  }

  const existing = await getUserByEmail(email);
  if (existing) {
    if (existing.role === 'owner') {
      console.log('ℹ️  Esse usuário já é owner. Nada a fazer.');
      process.exit(0);
    }
    await promoteToOwner(existing.id);
    console.log(`✅ Usuário ${email} promovido a owner.`);
    process.exit(0);
  }

  if (!name) name = await ask('Nome do owner: ');
  if (!name || name.trim().length < 2) {
    console.error('❌ Nome inválido.');
    process.exit(1);
  }

  if (!password) password = await ask('Senha do owner (8+ chars, maiúscula, minúscula, número, símbolo): ');
  if (!validatePassword(password)) {
    console.error(
      '❌ Senha fraca. Use 8+ caracteres com maiúscula, minúscula, número e símbolo.'
    );
    process.exit(1);
  }

  const owner = await addUser({ email, password, name, role: 'owner' });
  console.log(`✅ Owner criado: ${owner.email} (id: ${owner.id})`);
  process.exit(0);
}

main()
  .catch((err) => {
    console.error('Erro ao criar owner:', err.message || err);
    process.exit(1);
  })
  .finally(() => pool.end());
