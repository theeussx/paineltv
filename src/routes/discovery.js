const express = require('express');
const router = express.Router();
const { scanForTvs } = require('../services/discovery');

/**
 * Varre a rede local procurando hosts com a porta 8001 aberta
 * (indício forte de TV Samsung Tizen). Pode levar alguns segundos
 * dependendo do tamanho da rede.
 */
router.get('/scan', async (req, res) => {
  try {
    const ips = await scanForTvs();
    res.json({ ok: true, found: ips.map((ip) => ({ ip, brand: 'samsung' })) });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;