const { Pool } = require('pg');

if (!process.env.DATABASE_URL) {
  throw new Error(
    'DATABASE_URL não configurado. Defina no .env, ex: postgres://usuario:senha@localhost:5432/paineltv'
  );
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Blindagem: nunca deixa uma query travada pra sempre segurando a
  // conexão -- isso já aconteceu em produção com bancos gerenciados que
  // fecham conexão ociosa sem avisar.
  statement_timeout: 10_000,
  idleTimeoutMillis: 30_000,
});

pool.on('error', (err) => {
  // Erro em conexão ociosa no pool não deve derrubar o processo inteiro.
  console.error('⚠️  Erro no pool do PostgreSQL (ignorado):', err.message);
});

module.exports = pool;
