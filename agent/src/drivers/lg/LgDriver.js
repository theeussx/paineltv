const LGTV = require('lgtv2');
const BaseDriver = require('../BaseDriver');

const KNOWN_APPS = {
  netflix: 'netflix',
  youtube: 'youtube.leanback.v4',
  primevideo: 'amazon',
  disneyplus: 'com.disney.disneyplus-prod',
  spotify: 'spotify-beehive',
};

/**
 * Driver LG webOS via lgtv2 (protocolo SSAP sobre WebSocket, porta 3000/3001).
 *
 * ⚠️ Precisa de validação com TV física: a 1ª conexão faz a TV mostrar um
 * popup de permissão -- depois de aceitar, o `client-key` fica disponível
 * via pair()/getPairingData() e deve ser persistido (o central já faz isso
 * sozinho). Sem hardware LG na mão eu não consigo confirmar o comportamento
 * exato em modelos recentes (alguns exigem wss:// na porta 3001 em vez de
 * ws:// na 3000 -- se a conexão falhar, esse é o primeiro lugar pra checar).
 */
class LgDriver extends BaseDriver {
  _connect() {
    return new Promise((resolve, reject) => {
      const lgtv = LGTV({
        url: `ws://${this.ip}:3000`,
        clientKey: this.pairingData.clientKey || undefined,
        reconnect: false,
        timeout: 5000,
      });

      const onError = (err) => {
        cleanup();
        reject(err);
      };
      const onConnect = () => {
        cleanup();
        resolve(lgtv);
      };
      const cleanup = () => {
        lgtv.removeListener('error', onError);
        lgtv.removeListener('connect', onConnect);
      };

      lgtv.on('error', onError);
      lgtv.on('connect', onConnect);

      // Guarda a client-key assim que a TV emitir (acontece na 1ª vez que
      // o popup é aceito).
      lgtv.on('prompt', () => {
        console.log(`📺 LG em ${this.ip}: aceite o popup de permissão na TV.`);
      });
      lgtv.on('connecting', () => {});
    });
  }

  async _request(uri, payload) {
    const lgtv = await this._connect();
    return new Promise((resolve, reject) => {
      lgtv.request(uri, payload, (err, res) => {
        // Client-key pode ter sido gerada nesse momento (1ª conexão).
        if (lgtv.clientKey) this.pairingData = { ...this.pairingData, clientKey: lgtv.clientKey };
        lgtv.disconnect?.();
        if (err) return reject(err);
        resolve(res);
      });
    });
  }

  async isOnline() {
    try {
      await this._connect();
      return true;
    } catch {
      return false;
    }
  }

  async turnOn() {
    if (!this.mac) throw new Error('Sem MAC cadastrado — Wake-on-LAN indisponível.');
    throw new Error('Wake-on-LAN pra LG ainda não implementado neste driver — TV precisa ser ligada manualmente ou via WOL externo.');
  }

  async powerOff() {
    return this._request('ssap://system/turnOff');
  }

  async powerToggle() {
    return this.powerOff(); // webOS não expõe "toggle" -- ligar é só via WOL
  }

  async volumeUp() {
    return this._request('ssap://audio/volumeUp');
  }

  async volumeDown() {
    return this._request('ssap://audio/volumeDown');
  }

  async mute() {
    return this._request('ssap://audio/setMute', { mute: true });
  }

  async navUp() { return this._request('ssap://com.webos.service.ime/sendEnterKey').catch(() => this.sendKey('UP')); }
  async navDown() { return this.sendKey('DOWN'); }
  async navLeft() { return this.sendKey('LEFT'); }
  async navRight() { return this.sendKey('RIGHT'); }
  async navEnter() { return this.sendKey('ENTER'); }
  async navHome() { return this._request('ssap://system.launcher/launch', { id: 'com.webos.home' }); }
  async navBack() { return this.sendKey('BACK'); }
  async navSource() { return this._request('ssap://tv/switchInput', {}); }

  /**
   * webOS envia botões de navegação por um "pointer input socket" separado
   * (getPointerInputSocket), não pela mesma conexão de comando. Isso é o
   * ponto mais provável de precisar ajuste fino com a TV real na mão.
   */
  async sendKey(key) {
    const lgtv = await this._connect();
    return new Promise((resolve, reject) => {
      lgtv.getSocket('ssap://com.webos.service.networkinput/getPointerInputSocket', (err, sock) => {
        if (err) {
          lgtv.disconnect?.();
          return reject(err);
        }
        sock.send('button', { name: key });
        lgtv.disconnect?.();
        resolve();
      });
    });
  }

  async openApp(appName) {
    const id = KNOWN_APPS[appName];
    if (!id) throw new Error(`App "${appName}" desconhecido pra LG.`);
    return this._request('ssap://system.launcher/launch', { id });
  }

  async pair() {
    // A client-key é obtida como efeito colateral de qualquer _request
    // bem-sucedido (ver comentário lá em cima). Um jeito barato de forçar
    // isso é pedir as infos do sistema, que não muda nada na TV.
    await this._request('ssap://system/getSystemInfo').catch(() => {});
    return this.pairingData;
  }

  static getKnownApps() {
    return KNOWN_APPS;
  }
}

module.exports = LgDriver;
