require('dotenv').config();
const WebSocket = require('ws');
const { createDriver, getKnownApps } = require('./src/drivers/DriverRegistry');
const { scanForTvs } = require('./src/services/discovery');

const CENTRAL_WS_URL = process.env.CENTRAL_WS_URL;
const SITE_TOKEN = process.env.SITE_TOKEN;

if (!CENTRAL_WS_URL || !SITE_TOKEN) {
  console.error('❌ Configure CENTRAL_WS_URL e SITE_TOKEN no .env antes de rodar o agente.');
  process.exit(1);
}

/**
 * O agente NÃO guarda nenhum estado próprio -- o central (Postgres) é a
 * fonte de verdade de quais TVs existem. Cada comando chega com o
 * "descritor" completo da TV (brand/ip/mac/pairingData), e o agente só
 * cria o driver certo na hora, executa, e devolve o resultado (mais o
 * pairingData atualizado, se mudou).
 */
async function handleCommand(action, payload) {
  switch (action) {
    case 'status.bulk': {
      const statuses = {};
      await Promise.all(
        (payload.tvs || []).map(async (tv) => {
          try {
            const driver = createDriver(tv);
            statuses[tv.id] = (await driver.isOnline()) ? 'online' : 'offline';
          } catch {
            statuses[tv.id] = 'offline';
          }
        })
      );
      return { statuses };
    }

    case 'status': {
      const driver = createDriver(payload.tv);
      const online = await driver.isOnline();
      return { status: online ? 'online' : 'offline' };
    }

    case 'pair': {
      const driver = createDriver(payload.tv);
      const result = await driver.pair(payload.code);
      return result;
    }

    case 'power': {
      const driver = createDriver(payload.tv);
      if (payload.action === 'toggle') await driver.powerToggle();
      else if (payload.action === 'off') await driver.powerOff();
      else if (payload.action === 'on') await driver.turnOn();
      else throw new Error('ação de power inválida');
      return { pairingData: driver.getPairingData() };
    }

    case 'volume': {
      const driver = createDriver(payload.tv);
      if (payload.direction === 'up') await driver.volumeUp();
      else if (payload.direction === 'down') await driver.volumeDown();
      else if (payload.direction === 'mute') await driver.mute();
      else throw new Error('direction inválida');
      return { pairingData: driver.getPairingData() };
    }

    case 'nav': {
      const driver = createDriver(payload.tv);
      const map = {
        up: 'navUp',
        down: 'navDown',
        left: 'navLeft',
        right: 'navRight',
        enter: 'navEnter',
        home: 'navHome',
        back: 'navBack',
        source: 'navSource',
      };
      const method = map[payload.action];
      if (!method) throw new Error('ação de navegação inválida');
      await driver[method]();
      return { pairingData: driver.getPairingData() };
    }

    case 'key': {
      const driver = createDriver(payload.tv);
      await driver.sendKey(payload.key);
      return { pairingData: driver.getPairingData() };
    }

    case 'app': {
      const driver = createDriver(payload.tv);
      await driver.openApp(payload.appName);
      return { pairingData: driver.getPairingData() };
    }

    case 'apps.known':
      return { apps: getKnownApps(payload.brand) };

    case 'bulk.power': {
      const results = [];
      for (const tv of payload.tvs || []) {
        try {
          const driver = createDriver(tv);
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
      for (const tv of payload.tvs || []) {
        try {
          const driver = createDriver(tv);
          for (let i = 0; i < 40; i++) await driver.volumeDown();
          for (let i = 0; i < payload.level; i++) await driver.volumeUp();
          results.push({ id: tv.id, name: tv.name, ok: true });
        } catch (err) {
          results.push({ id: tv.id, name: tv.name, ok: false, error: err.message });
        }
      }
      return { results };
    }

    case 'discovery.scan': {
      const found = await scanForTvs();
      return { found };
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
      console.log(`✅ Autenticado como "${msg.locationName}". Agente pronto (sem estado próprio).`);
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

console.log('📺 Agente iniciado (sem estado próprio -- TVs vivem no central).');
connect();
