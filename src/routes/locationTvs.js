const express = require('express');
const router = express.Router({ mergeParams: true });
const { requireAuth, requireLocationAccess } = require('../middleware/auth');
const agentHub = require('../ws/agentHub');
const tvsDb = require('../db/tvs');
const auditLogs = require('../db/auditLogs');

// Blindagem: precisa estar logado e só acessa TVs do próprio local
// (owner acessa qualquer local). O comando de verdade roda no agente,
// aqui é só o roteamento + persistência.
router.use(requireAuth, requireLocationAccess('locationId'));

function toDescriptor(tv) {
  return { id: tv.id, name: tv.name, brand: tv.brand, ip: tv.ip, mac: tv.mac, pairingData: tv.pairingData };
}

async function audit(req, { action, tvId = null, tvName = null, ok, errorMessage = null }) {
  await auditLogs.logAction({
    locationId: req.params.locationId,
    actorUserId: req.user.id,
    actorEmail: req.user.email,
    actorRole: req.user.role,
    action,
    tvId,
    tvName,
    ok,
    errorMessage,
    ipAddress: req.ip,
  });
}

// ---------- CRUD de TVs: direto no Postgres, agente nem participa ----------

router.get('/', async (req, res) => {
  try {
    const tvs = await tvsDb.listTvs(req.params.locationId);
    if (tvs.length === 0) return res.json({ ok: true, tvs: [] });

    // Pede o status "ao vivo" de todas de uma vez só (1 ida e volta pro
    // agente), sem precisar que o agente guarde nada.
    let statuses = {};
    try {
      const result = await agentHub.sendCommand(req.params.locationId, 'status.bulk', {
        tvs: tvs.map(toDescriptor),
      });
      statuses = result?.statuses || {};
    } catch {
      // Local offline: mostra a lista mesmo assim, só sem status ao vivo.
    }

    res.json({
      ok: true,
      tvs: tvs.map((tv) => ({
        id: tv.id,
        name: tv.name,
        brand: tv.brand,
        ip: tv.ip,
        mac: tv.mac,
        status: statuses[tv.id] || 'unknown',
      })),
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.post('/', async (req, res) => {
  const { name, brand, ip, mac } = req.body;
  if (!name || !brand || !ip) {
    return res.status(400).json({ ok: false, error: 'name, brand e ip são obrigatórios' });
  }
  try {
    const tv = await tvsDb.createTv(req.params.locationId, { name, brand, ip, mac });
    await audit(req, { action: 'tv.create', tvId: tv.id, tvName: tv.name, ok: true });
    res.status(201).json({ ok: true, tv });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  const tv = await tvsDb.getTv(req.params.locationId, req.params.id);
  const removed = await tvsDb.deleteTv(req.params.locationId, req.params.id);
  if (!removed) return res.status(404).json({ ok: false, error: 'TV não encontrada' });
  await audit(req, { action: 'tv.remove', tvId: req.params.id, tvName: tv?.name, ok: true });
  res.json({ ok: true });
});

// ---------- Ações que precisam do agente (a TV de verdade) ----------

async function withTv(req, res, action, handler) {
  const tv = await tvsDb.getTv(req.params.locationId, req.params.id);
  if (!tv) return res.status(404).json({ ok: false, error: 'TV não encontrada' });

  try {
    const result = await handler(tv);
    // Se o agente devolveu pairingData atualizado (ex: token novo), persiste.
    if (result?.pairingData) {
      await tvsDb.updatePairingData(req.params.locationId, tv.id, result.pairingData);
    }
    await audit(req, { action, tvId: tv.id, tvName: tv.name, ok: true });
    res.json({ ok: true, ...(result && typeof result === 'object' ? result : {}) });
  } catch (err) {
    const offline = /offline/i.test(err.message);
    await audit(req, { action, tvId: tv.id, tvName: tv.name, ok: false, errorMessage: err.message });
    res.status(offline ? 503 : 502).json({ ok: false, error: err.message });
  }
}

router.get('/apps/known', async (req, res) => {
  try {
    const brand = req.query.brand || 'samsung';
    const data = await agentHub.sendCommand(req.params.locationId, 'apps.known', { brand });
    res.json({ ok: true, ...data });
  } catch (err) {
    res.status(503).json({ ok: false, error: err.message });
  }
});

router.get('/:id/status', (req, res) =>
  withTv(req, res, 'tv.status', (tv) =>
    agentHub.sendCommand(req.params.locationId, 'status', { tv: toDescriptor(tv) })
  )
);

router.post('/:id/pair', (req, res) =>
  withTv(req, res, 'tv.pair', (tv) =>
    agentHub.sendCommand(req.params.locationId, 'pair', { tv: toDescriptor(tv), code: req.body?.code })
  )
);

router.post('/:id/power/:action', (req, res) =>
  withTv(req, res, `tv.power.${req.params.action}`, (tv) =>
    agentHub.sendCommand(req.params.locationId, 'power', { tv: toDescriptor(tv), action: req.params.action })
  )
);

router.post('/:id/volume/:direction', (req, res) =>
  withTv(req, res, `tv.volume.${req.params.direction}`, (tv) =>
    agentHub.sendCommand(req.params.locationId, 'volume', {
      tv: toDescriptor(tv),
      direction: req.params.direction,
    })
  )
);

router.post('/:id/nav/:action', (req, res) =>
  withTv(req, res, `tv.nav.${req.params.action}`, (tv) =>
    agentHub.sendCommand(req.params.locationId, 'nav', { tv: toDescriptor(tv), action: req.params.action })
  )
);

router.post('/:id/key/:key', (req, res) =>
  withTv(req, res, `tv.key.${req.params.key}`, (tv) =>
    agentHub.sendCommand(req.params.locationId, 'key', { tv: toDescriptor(tv), key: req.params.key })
  )
);

router.post('/:id/app/:appName', (req, res) =>
  withTv(req, res, `tv.app.${req.params.appName}`, (tv) =>
    agentHub.sendCommand(req.params.locationId, 'app', { tv: toDescriptor(tv), appName: req.params.appName })
  )
);

// ---------- Ações em lote e descoberta ----------

router.post('/bulk/power/:action', async (req, res) => {
  try {
    const tvs = await tvsDb.listTvs(req.params.locationId);
    const result = await agentHub.sendCommand(req.params.locationId, 'bulk.power', {
      tvs: tvs.map(toDescriptor),
      action: req.params.action,
    });
    await audit(req, { action: `tv.bulk.power.${req.params.action}`, ok: true });
    res.json({ ok: true, ...result });
  } catch (err) {
    await audit(req, { action: `tv.bulk.power.${req.params.action}`, ok: false, errorMessage: err.message });
    res.status(503).json({ ok: false, error: err.message });
  }
});

router.post('/bulk/volume/:level', async (req, res) => {
  try {
    const tvs = await tvsDb.listTvs(req.params.locationId);
    const result = await agentHub.sendCommand(req.params.locationId, 'bulk.volume', {
      tvs: tvs.map(toDescriptor),
      level: parseInt(req.params.level, 10),
    });
    await audit(req, { action: 'tv.bulk.volume', ok: true });
    res.json({ ok: true, ...result });
  } catch (err) {
    await audit(req, { action: 'tv.bulk.volume', ok: false, errorMessage: err.message });
    res.status(503).json({ ok: false, error: err.message });
  }
});

router.post('/discovery/scan', async (req, res) => {
  try {
    const data = await agentHub.sendCommand(req.params.locationId, 'discovery.scan');
    res.json({ ok: true, ...data });
  } catch (err) {
    res.status(503).json({ ok: false, error: err.message });
  }
});

module.exports = router;
