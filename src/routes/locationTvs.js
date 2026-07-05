const express = require('express');
const router = express.Router({ mergeParams: true });
const { requireAuth, requireLocationAccess } = require('../middleware/auth');
const agentHub = require('../ws/agentHub');

// Blindagem: precisa estar logado e só acessa TVs do próprio local
// (owner acessa qualquer local). O comando de verdade roda no agente,
// aqui é só o roteamento.
router.use(requireAuth, requireLocationAccess('locationId'));

async function proxy(req, res, action, payload = {}) {
  try {
    const data = await agentHub.sendCommand(req.params.locationId, action, payload);
    res.json({ ok: true, ...(data && typeof data === 'object' ? data : { data }) });
  } catch (err) {
    const offline = /offline/i.test(err.message);
    res.status(offline ? 503 : 502).json({ ok: false, error: err.message });
  }
}

router.get('/', (req, res) => proxy(req, res, 'list'));

router.post('/', (req, res) => {
  const { name, brand, ip, mac } = req.body;
  if (!name || !brand || !ip) {
    return res.status(400).json({ ok: false, error: 'name, brand e ip são obrigatórios' });
  }
  proxy(req, res, 'create', { name, brand, ip, mac });
});

router.delete('/:id', (req, res) => proxy(req, res, 'remove', { id: req.params.id }));

router.get('/apps/known', (req, res) => proxy(req, res, 'apps.known'));

router.post('/bulk/power/:action', (req, res) => proxy(req, res, 'bulk.power', { action: req.params.action }));

router.post('/bulk/volume/:level', (req, res) =>
  proxy(req, res, 'bulk.volume', { level: parseInt(req.params.level, 10) })
);

router.get('/:id/status', (req, res) => proxy(req, res, 'status', { id: req.params.id }));

router.get('/:id/token', (req, res) => proxy(req, res, 'token', { id: req.params.id }));

router.post('/:id/power/:action', (req, res) =>
  proxy(req, res, 'power', { id: req.params.id, action: req.params.action })
);

router.post('/:id/volume/:direction', (req, res) =>
  proxy(req, res, 'volume', { id: req.params.id, direction: req.params.direction })
);

router.post('/:id/nav/:action', (req, res) => proxy(req, res, 'nav', { id: req.params.id, action: req.params.action }));

router.post('/:id/key/:key', (req, res) => proxy(req, res, 'key', { id: req.params.id, key: req.params.key }));

router.post('/:id/app/:appName', (req, res) =>
  proxy(req, res, 'app', { id: req.params.id, appName: req.params.appName })
);

router.post('/discovery/scan', (req, res) => proxy(req, res, 'discovery.scan'));

module.exports = router;
