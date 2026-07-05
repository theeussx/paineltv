require('dotenv').config();
const WebSocket = require('ws');
const tvManager = require('./src/services/TvManager');
const { scanForTvs } = require('./src/services/discovery');
const { APPS } = require('samsung-tv-control');

const CENTRAL_WS_URL = process.env.CENTRAL_WS_URL;
const SITE_TOKEN = process.env.SITE_TOKEN;

if (!CENTRAL_WS_URL || !SITE_TOKEN) {
  console.error('❌ Configure CENTRAL_WS_URL e SITE_TOKEN no .env antes de rodar o agente.');
  process.exit(1);
}

const NAV_KEY_MAP = {
  up: 'KEY_UP',
  down: 'KEY_DOWN',
  left: 'KEY_LEFT',
  right: 'KEY_RIGHT',
  enter: 'KEY_ENTER',
  home: 'KEY_HOME',
  back: 'KEY_RETURN',
  source: 'KEY_SOURCE',
};

/**
 * Executa a ação pedida pelo central, usando exatamente a mesma lógica que
 * as rotas HTTP antigas usavam (TvManager + drivers). Isso roda sempre
 * aqui, na rede local das TVs -- o central nunca fala direto com elas.
 */
async function handleCommand(action, payload) {
  switch (action) {
    case 'list':
      return { tvs: await tvManager.listWithStatus() };

    case 'create': {
      const { name, brand, ip, mac } = payload;
      const tv = tvManager.add({ name, brand, ip, mac });
      return { tv };
    }

    case 'remove': {
      const removed = tvManager.remove(payload.id);
      if (!removed) throw new Error('TV não encontrada');
      return {};
    }

    case 'apps.known':
      return { apps: APPS };

    case 'bulk.power': {
      const results = [];
      for (const tv of tvManager.list()) {
        const { driver } = tvManager.get(tv.id);
        if (!driver) continue;
        try {
          if (payload.action === 'on') await driver.turnOn();
          else await driver.powerOff();
          results.push({ id: tv.id, name: tv.name, ok: true });
        } catch (err) {
          results.push({ id: tv.id, name: tv.name, ok: false, error: err.message });
        }
      }
      return { results };
    }

    case 'bulk.volume': {
      const results = [];
      for (const tv of tvManager.list()) {
        const { driver } = tvManager.get(tv.id);
        if (!driver) continue;
        try {
          for (let i = 0; i < 40; i++) await driver.volumeDown();
          for (let i = 0; i < payload.level; i++) await driver.volumeUp();
          results.push({ id: tv.id, name: tv.name, ok: true });
        } catch (err) {
          results.push({ id: tv.id, name: tv.name, ok: false, error: err.message });
        }
      }
      return { results };
    }

    case 'status': {
      const entry = tvManager.get(payload.id);
      if (!entry?.tv) throw new Error('TV não encontrada');
      if (!entry.driver) throw new Error('Driver desta TV falhou ao inicializar');
      const online = await entry.driver.isOnline();
      return { name: entry.tv.name, ip: entry.tv.ip, status: online ? 'online' : 'offline' };
    }

    case 'token': {
      const entry = tvManager.get(payload.id);
      if (!entry?.tv) throw new Error('TV não encontrada');
      if (!entry.driver) throw new Error('Driver desta TV falhou ao inicializar');
      const token = await entry.driver.getToken();
      if (!token) throw new Error('Nenhum token retornado. A TV precisa estar ligada e a autorização já aceita.');
      tvManager.saveToken(entry.tv.id, token);
      return { token };
    }

    case 'power': {
      const entry = tvManager.get(payload.id);
      if (!entry?.driver) throw new Error('TV/driver não encontrado');
      if (payload.action === 'toggle') await entry.driver.powerToggle();
      else if (payload.action === 'off') await entry.driver.powerOff();
      else if (payload.action === 'on') await entry.driver.turnOn();
      else throw new Error('ação de power inválida');
      return {};
    }

    case 'volume': {
      const entry = tvManager.get(payload.id);
      if (!entry?.driver) throw new Error('TV/driver não encontrado');
      if (payload.direction === 'up') await entry.driver.volumeUp();
      else if (payload.direction === 'down') await entry.driver.volumeDown();
      else if (payload.direction === 'mute') await entry.driver.mute();
      else throw new Error('direction inválida');
      return {};
    }

    case 'nav': {
      const entry = tvManager.get(payload.id);
      if (!entry?.driver) throw new Error('TV/driver não encontrado');
      const key = NAV_KEY_MAP[payload.action];
      if (!key) throw new Error('ação de navegação inválida');
      await entry.driver.sendKey(key);
      return {};
    }

    case 'key': {
      const entry = tvManager.get(payload.id);
      if (!entry?.driver) throw new Error('TV/driver não encontrado');
      await entry.driver.sendKey(payload.key);
      return {};
    }

    case 'app': {
      const entry = tvManager.get(payload.id);
      if (!entry?.driver) throw new Error('TV/driver não encontrado');
      const appId = APPS[payload.appName];
      if (!appId) throw new Error(`App "${payload.appName}" desconhecido.`);
      await entry.driver.openApp(appId);
      return {};
    }

    case 'discovery.scan': {
      const ips = await scanForTvs();
      return { ips };
    }

    default:
      throw new Error(`Ação desconhecida: ${action}`);
  }
}

let ws = null;
let reconnectDelay = 1000; // cresce até 30s, com backoff exponencial
const MAX_RECONNECT_DELAY = 30000;

function connect() {
  console.log(`🔗 Conectando em ${CENTRAL_WS_URL}/agent-ws ...`);
  ws = new WebSocket(`${CENTRAL_WS_URL}/agent-ws`);

  ws.on('open', () => {
    ws.send(JSON.stringify({ type: 'auth', token: SITE_TOKEN }));
  });

  ws.on('message', async (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      return;
    }

    if (msg.type === 'auth_ok') {
      reconnectDelay = 1000; // reseta o backoff depois de logar com sucesso
      console.log(`✅ Autenticado como "${msg.locationName}". Agente pronto.`);
      return;
    }

    if (msg.type === 'auth_failed') {
      console.error('❌ Token rejeitado pelo central. Confira o SITE_TOKEN no .env.');
      return;
    }

    if (msg.type === 'cmd') {
      try {
        const data = await handleCommand(msg.action, msg.payload || {});
        ws.send(JSON.stringify({ type: 'result', requestId: msg.requestId, ok: true, data }));
      } catch (err) {
        ws.send(
          JSON.stringify({ type: 'result', requestId: msg.requestId, ok: false, error: err.message })
        );
      }
    }
  });

  ws.on('close', () => {
    console.log(`🔌 Desconectado do central. Tentando de novo em ${reconnectDelay / 1000}s...`);
    scheduleReconnect();
  });

  ws.on('error', (err) => {
    console.error('Erro de conexão:', err.message);
  });
}

function scheduleReconnect() {
  setTimeout(connect, reconnectDelay);
  reconnectDelay = Math.min(reconnectDelay * 2, MAX_RECONNECT_DELAY);
}

console.log(`📺 ${tvManager.list().length} TV(s) cadastrada(s) neste local.`);
connect();
