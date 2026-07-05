require('dotenv').config();
const http = require('http');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const authRoutes = require('./routes/auth');
const locationsRoutes = require('./routes/locations');
const locationUsersRoutes = require('./routes/locationUsers');
const locationTvsRoutes = require('./routes/locationTvs');
const agentHub = require('./ws/agentHub');
const { listUsers } = require('./db/users');

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
// mergeParams nas rotas filhas -- por isso montamos com :locationId aqui.
// IMPORTANTE: essas duas linhas precisam vir ANTES de '/api/locations'
// puro, senão o Express casa tudo que começa com /api/locations/... no
// router genérico (que exige requireOwner) antes de chegar aqui.
app.use('/api/locations/:locationId/users', locationUsersRoutes);
app.use('/api/locations/:locationId/tvs', locationTvsRoutes);
app.use('/api/locations', locationsRoutes);

app.get('/api/health', (req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 3001;

// O central agora é só HTTP (Express) + WebSocket (agentes) no mesmo
// servidor, então precisa de um http.Server "cru" pra anexar os dois.
const server = http.createServer(app);
agentHub.attach(server);

server.listen(PORT, async () => {
  console.log(`Backend central rodando em http://localhost:${PORT}`);
  console.log(`WebSocket de agentes em ws://localhost:${PORT}/agent-ws`);

  const users = await listUsers();
  const hasOwner = users.some((u) => u.role === 'owner');
  if (!hasOwner) {
    console.log('⚠️  Nenhum owner cadastrado ainda. Crie o primeiro com:');
    console.log('   node src/scripts/create-admin.js');
  }
});

// Rede de segurança: nunca deixa o processo morrer por um erro de
// conexão com algum agente. Loga o erro e segue rodando.
process.on('unhandledRejection', (err) => {
  console.log('⚠️  Erro não tratado (ignorado, servidor continua no ar):', err?.message || err);
});
