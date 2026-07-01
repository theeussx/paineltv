require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const authRoutes = require('./routes/auth');
const tvsRoutes = require('./routes/tvs');
const discoveryRoutes = require('./routes/discovery');
const tvManager = require('./services/TvManager');

const app = express();
app.use(helmet());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/tvs', tvsRoutes);
app.use('/api/discovery', discoveryRoutes);

app.get('/api/health', (req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 3001;

app.listen(PORT, async () => {
  console.log(`Backend rodando em http://localhost:${PORT}`);
  const count = tvManager.list().length;
  console.log(`📺 ${count} TV(s) cadastrada(s).`);
  if (count > 0) {
    console.log('Checando status inicial...');
    await tvManager.refreshAllStatus();
    for (const tv of tvManager.list()) {
      console.log(`  - ${tv.name} (${tv.ip}): ${tv.status}`);
    }
  } else {
    console.log('Nenhuma TV cadastrada ainda. Use o dashboard ou:');
    console.log(`  POST http://localhost:${PORT}/api/tvs`);
    console.log('  body: { "name": "TV Sala", "brand": "samsung", "ip": "192.168.x.x", "mac": "AA:BB:CC:DD:EE:FF" }');
  }
});

// Rede de segurança: nunca deixa o processo morrer por um erro de
// conexão com alguma TV. Loga o erro e segue rodando.
process.on('unhandledRejection', (err) => {
  console.log('⚠️  Erro não tratado (ignorado, servidor continua no ar):', err?.message || err);
});