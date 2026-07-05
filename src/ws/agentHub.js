const { WebSocketServer } = require('ws');
const crypto = require('crypto');
const { findLocationByToken } = require('../db/locations');

const AUTH_TIMEOUT_MS = 5000;
const COMMAND_TIMEOUT_MS = 15000;

/**
 * Mantém um WebSocket "vivo" por local (o agente que roda perto das TVs
 * daquele local). Quando o frontend pede uma ação numa TV, o central
 * não fala com a TV -- ele repassa a ordem pro agente certo por aqui,
 * e espera a resposta correlacionada por requestId.
 */
class AgentHub {
  constructor() {
    this.connections = new Map(); // locationId -> ws
    this.pending = new Map(); // requestId -> {resolve, reject, timeout}
  }

  attach(server) {
    this.wss = new WebSocketServer({ server, path: '/agent-ws' });
    this.wss.on('connection', (ws) => this._handleConnection(ws));
  }

  _handleConnection(ws) {
    let authenticated = false;
    let locationId = null;

    // Blindagem: se o agente não se autenticar em 5s, derruba a conexão.
    // Evita conexões penduradas ocupando memória/handles.
    const authTimer = setTimeout(() => {
      if (!authenticated) ws.close(4001, 'auth timeout');
    }, AUTH_TIMEOUT_MS);

    ws.on('message', async (raw) => {
      let msg;
      try {
        msg = JSON.parse(raw.toString());
      } catch {
        return; // ignora lixo
      }

      if (!authenticated) {
        if (msg.type !== 'auth' || typeof msg.token !== 'string') {
          ws.close(4002, 'esperado auth primeiro');
          return;
        }
        // Blindagem: o token é comparado por hash (nunca armazenado em
        // texto puro), então nem um dump do locations.json revela o
        // segredo que os agentes usam pra se autenticar.
        const location = await findLocationByToken(msg.token);
        if (!location) {
          ws.send(JSON.stringify({ type: 'auth_failed' }));
          ws.close(4003, 'token invalido');
          return;
        }

        authenticated = true;
        locationId = location.id;
        clearTimeout(authTimer);

        // Se já existia um agente conectado pra esse local, derruba o
        // antigo -- só uma conexão viva por local por vez.
        const existing = this.connections.get(locationId);
        if (existing && existing.readyState === existing.OPEN) {
          existing.close(4004, 'substituido por nova conexao');
        }
        this.connections.set(locationId, ws);
        ws.send(JSON.stringify({ type: 'auth_ok', locationName: location.name }));
        console.log(`🔌 Agente do local "${location.name}" conectado.`);
        return;
      }

      // Mensagens depois de autenticado: só tratamos respostas de comando.
      if (msg.type === 'result' && msg.requestId) {
        const pending = this.pending.get(msg.requestId);
        if (pending) {
          clearTimeout(pending.timeout);
          this.pending.delete(msg.requestId);
          if (msg.ok) pending.resolve(msg.data);
          else pending.reject(new Error(msg.error || 'Erro no agente'));
        }
      }
    });

    ws.on('close', () => {
      clearTimeout(authTimer);
      if (locationId && this.connections.get(locationId) === ws) {
        this.connections.delete(locationId);
        console.log(`🔌 Agente do local ${locationId} desconectou.`);
      }
    });

    ws.on('error', () => {
      // 'close' cuida da limpeza; só evita crash por erro não tratado.
    });
  }

  isOnline(locationId) {
    const ws = this.connections.get(locationId);
    return !!ws && ws.readyState === ws.OPEN;
  }

  onlineLocationIds() {
    return [...this.connections.entries()]
      .filter(([, ws]) => ws.readyState === ws.OPEN)
      .map(([id]) => id);
  }

  /**
   * Envia um comando pro agente do local e espera a resposta.
   * Rejeita se o local estiver offline ou se o agente não responder a
   * tempo (TV real pode estar lenta/travada -- não trava o painel).
   */
  sendCommand(locationId, action, payload = {}) {
    const ws = this.connections.get(locationId);
    if (!ws || ws.readyState !== ws.OPEN) {
      return Promise.reject(new Error('Local offline: o agente desse local não está conectado agora.'));
    }

    const requestId = crypto.randomUUID();
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pending.delete(requestId);
        reject(new Error('O agente não respondeu a tempo.'));
      }, COMMAND_TIMEOUT_MS);

      this.pending.set(requestId, { resolve, reject, timeout });
      ws.send(JSON.stringify({ type: 'cmd', requestId, action, payload }));
    });
  }
}

module.exports = new AgentHub();
