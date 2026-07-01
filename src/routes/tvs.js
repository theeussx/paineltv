const express = require('express');
const router = express.Router();
const tvManager = require('../services/TvManager');
const { APPS } = require('samsung-tv-control');

/**
 * Middleware: carrega a TV + driver pelo :id da URL e injeta em
 * req.tvEntry. Se não existir, responde 404 direto.
 */
function loadTv(req, res, next) {
  const entry = tvManager.get(req.params.id);
  if (!entry || !entry.tv) {
    return res.status(404).json({ ok: false, error: 'TV não encontrada' });
  }
  if (!entry.driver) {
    return res.status(500).json({ ok: false, error: 'Driver desta TV falhou ao inicializar' });
  }
  req.tvEntry = entry;
  next();
}

// ---------- Listagem / cadastro (Fase 6) ----------

router.get('/', (req, res) => {
  res.json({ ok: true, tvs: tvManager.list() });
});

router.post('/', (req, res) => {
  const { name, brand, ip, mac } = req.body;
  if (!name || !brand || !ip) {
    return res.status(400).json({ ok: false, error: 'name, brand e ip são obrigatórios' });
  }
  try {
    const tv = tvManager.add({ name, brand, ip, mac });
    res.status(201).json({ ok: true, tv });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
});

router.delete('/:id', (req, res) => {
  const removed = tvManager.remove(req.params.id);
  if (!removed) return res.status(404).json({ ok: false, error: 'TV não encontrada' });
  res.json({ ok: true });
});

// Lista os apps conhecidos que dá pra abrir (Fase 4)
router.get('/apps/known', (req, res) => {
  res.json({ ok: true, apps: APPS });
});

// ---------- Ações em massa (Fase 6) ----------

router.post('/bulk/power/:action', async (req, res) => {
  const { action } = req.params; // 'on' | 'off'
  const results = [];
  for (const tv of tvManager.list()) {
    const { driver } = tvManager.get(tv.id);
    if (!driver) continue;
    try {
      if (action === 'on') await driver.turnOn();
      else await driver.powerOff();
      results.push({ id: tv.id, name: tv.name, ok: true });
    } catch (err) {
      results.push({ id: tv.id, name: tv.name, ok: false, error: err.message });
    }
  }
  res.json({ ok: true, results });
});

router.post('/bulk/volume/:level', async (req, res) => {
  const level = parseInt(req.params.level, 10);
  const results = [];
  for (const tv of tvManager.list()) {
    const { driver } = tvManager.get(tv.id);
    if (!driver) continue;
    try {
      // A API Tizen não tem "set absoluto" direto pelo protocolo de teclas;
      // aproximamos zerando o volume e subindo N vezes.
      for (let i = 0; i < 40; i++) await driver.volumeDown();
      for (let i = 0; i < level; i++) await driver.volumeUp();
      results.push({ id: tv.id, name: tv.name, ok: true });
    } catch (err) {
      results.push({ id: tv.id, name: tv.name, ok: false, error: err.message });
    }
  }
  res.json({ ok: true, results });
});

// ---------- Por TV específica ----------

router.get('/:id/status', loadTv, async (req, res) => {
  const { tv, driver } = req.tvEntry;
  const online = await driver.isOnline();
  res.json({ ok: true, name: tv.name, ip: tv.ip, status: online ? 'online' : 'offline' });
});

router.get('/:id/token', loadTv, async (req, res) => {
  const { tv, driver } = req.tvEntry;
  try {
    const token = await driver.getToken();
    if (!token) {
      return res.status(404).json({
        ok: false,
        error: 'Nenhum token retornado. A TV precisa estar ligada e a autorização já aceita.',
      });
    }
    tvManager.saveToken(tv.id, token);
    res.json({ ok: true, token });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.post('/:id/power/toggle', loadTv, async (req, res) => {
  try {
    await req.tvEntry.driver.powerToggle();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.post('/:id/power/off', loadTv, async (req, res) => {
  try {
    await req.tvEntry.driver.powerOff();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.post('/:id/power/on', loadTv, async (req, res) => {
  try {
    await req.tvEntry.driver.turnOn();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.post('/:id/volume/:direction', loadTv, async (req, res) => {
  const { direction } = req.params;
  const driver = req.tvEntry.driver;
  try {
    if (direction === 'up') await driver.volumeUp();
    else if (direction === 'down') await driver.volumeDown();
    else if (direction === 'mute') await driver.mute();
    else return res.status(400).json({ ok: false, error: 'direction inválida' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Navegação: up/down/left/right/enter/home/back/source
router.post('/:id/nav/:action', loadTv, async (req, res) => {
  const { action } = req.params;
  const driver = req.tvEntry.driver;
  const map = {
    up: 'KEY_UP',
    down: 'KEY_DOWN',
    left: 'KEY_LEFT',
    right: 'KEY_RIGHT',
    enter: 'KEY_ENTER',
    home: 'KEY_HOME',
    back: 'KEY_RETURN',
    source: 'KEY_SOURCE',
  };
  const key = map[action];
  if (!key) return res.status(400).json({ ok: false, error: 'ação de navegação inválida' });
  try {
    await driver.sendKey(key);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.post('/:id/key/:key', loadTv, async (req, res) => {
  try {
    await req.tvEntry.driver.sendKey(req.params.key);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Abrir app conhecido (YouTube, Netflix, Spotify...) — Fase 4
router.post('/:id/app/:appName', loadTv, async (req, res) => {
  const appId = APPS[req.params.appName];
  if (!appId) {
    return res.status(400).json({
      ok: false,
      error: `App "${req.params.appName}" desconhecido. Use GET /api/tvs/apps/known pra ver os disponíveis.`,
    });
  }
  try {
    await req.tvEntry.driver.openApp(appId);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;