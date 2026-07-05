const express = require('express');
const router = express.Router();
const {
  listLocations,
  createLocation,
  deleteLocation,
  rotateToken,
  getLocationById,
} = require('../db/locations');
const { requireAuth, requireOwner } = require('../middleware/auth');
const agentHub = require('../ws/agentHub');

// Blindagem: só o owner (dono da plataforma) mexe em locais. Admin de
// local nem enxerga essa rota.
router.use(requireAuth, requireOwner);

router.get('/', async (req, res) => {
  const locations = await listLocations();
  const withStatus = locations.map((l) => ({
    id: l.id,
    name: l.name,
    createdAt: l.createdAt,
    online: agentHub.isOnline(l.id),
  }));
  res.json({ ok: true, locations: withStatus });
});

router.post('/', async (req, res) => {
  const { name } = req.body;
  if (!name || typeof name !== 'string' || name.trim().length < 2) {
    return res.status(400).json({ ok: false, error: 'Nome do local inválido' });
  }

  const { location, token } = await createLocation({ name });
  // O token cru só volta aqui, nessa resposta, uma única vez. Depois disso
  // só existe o hash no disco -- se perder, precisa rotacionar.
  res.status(201).json({
    ok: true,
    location: { id: location.id, name: location.name, createdAt: location.createdAt },
    token,
  });
});

router.post('/:id/rotate-token', async (req, res) => {
  const result = await rotateToken(req.params.id);
  if (!result) return res.status(404).json({ ok: false, error: 'Local não encontrado' });
  res.json({ ok: true, token: result.token });
});

router.delete('/:id', async (req, res) => {
  const location = await getLocationById(req.params.id);
  if (!location) return res.status(404).json({ ok: false, error: 'Local não encontrado' });
  await deleteLocation(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
