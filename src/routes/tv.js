const express = require('express');
const router = express.Router();

/**
 * Recebe o driver já conectado via req.app.locals.tv (setado no index.js).
 * Em fases futuras isso vira um Map de várias TVs (id -> driver).
 */

router.get('/status', async (req, res) => {
  const tv = req.app.locals.tv;
  const online = await tv.isOnline();
  res.json({ name: tv.name, ip: tv.ip, status: online ? 'online' : 'offline' });
});

router.get('/token', async (req, res) => {
  const tv = req.app.locals.tv;
  try {
    const token = await tv.getToken();
    if (!token) {
      return res.status(404).json({
        ok: false,
        error: 'Nenhum token retornado. A TV precisa estar ligada e já ter aceitado a autorização.',
      });
    }
    console.log('🔑 Token da TV:', token);
    console.log('   Cole isso em TV_TOKEN= no seu .env');
    res.json({ ok: true, token });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.post('/power/toggle', async (req, res) => {
  try {
    await req.app.locals.tv.powerToggle();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.post('/volume/:direction', async (req, res) => {
  const { direction } = req.params; // 'up' | 'down' | 'mute'
  const tv = req.app.locals.tv;
  try {
    if (direction === 'up') await tv.volumeUp();
    else if (direction === 'down') await tv.volumeDown();
    else if (direction === 'mute') await tv.mute();
    else return res.status(400).json({ ok: false, error: 'direction inválida' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.post('/key/:key', async (req, res) => {
  try {
    await req.app.locals.tv.sendKey(req.params.key);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
