const express = require('express');
const router = express.Router({ mergeParams: true });
const { requireAuth, requireAdmin, requireLocationAccess } = require('../middleware/auth');
const auditLogs = require('../db/auditLogs');

// Blindagem: só admin do próprio local (ou owner) lê a auditoria dele.
router.use(requireAuth, requireAdmin, requireLocationAccess('locationId'));

router.get('/', async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
  const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);
  const { action, ok, from, to } = req.query;

  try {
    const result = await auditLogs.listLogs(req.params.locationId, {
      limit,
      offset,
      action: action || undefined,
      ok: ok === 'true' ? true : ok === 'false' ? false : undefined,
      from: from || undefined,
      to: to || undefined,
    });
    res.json({ ok: true, ...result, limit, offset });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
