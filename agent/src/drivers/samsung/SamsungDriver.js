const SamsungTv = require('samsung-tv-control').default || require('samsung-tv-control');
const BaseDriver = require('../BaseDriver');

const NAV_KEYS = {
  up: 'KEY_UP',
  down: 'KEY_DOWN',
  left: 'KEY_LEFT',
  right: 'KEY_RIGHT',
  enter: 'KEY_ENTER',
  home: 'KEY_HOME',
  back: 'KEY_RETURN',
  source: 'KEY_SOURCE',
};

// Ids de app mais usados na Smart Hub da Samsung.
const KNOWN_APPS = {
  netflix: '11101200001',
  youtube: '111299001912',
  primevideo: '3201512006785',
  disneyplus: '3201901017640',
  spotify: '3201606009684',
  globoplay: '3201601007250',
};

/**
 * Driver para TVs Samsung Tizen (2016+). Usa a porta WebSocket 8002 (SSL)
 * que o firmware expõe pra apps de controle remoto, e a porta 8001 (HTTP)
 * só pra checar se a TV está acordada/na rede.
 *
 * Na primeira conexão, a TV mostra um popup pedindo permissão. Depois de
 * aceitar, o token fica disponível via pair()/getPairingData() -- salve
 * isso (o central já persiste automaticamente) pra não pedir de novo.
 */
class SamsungDriver extends BaseDriver {
  constructor(descriptor) {
    super(descriptor);
    const token = this.pairingData.token || '';

    this.tv = new SamsungTv({
      debug: false,
      ip: this.ip,
      mac: this.mac || '00:00:00:00:00:00',
      nameApp: 'wardcontroll',
      token,
      saveToken: false,
    });
  }

  async isOnline() {
    try {
      return await this.tv.isAvailable();
    } catch {
      return false;
    }
  }

  /** Liga via Wake-on-LAN (só funciona se a TV tiver WOL ativo). */
  async turnOn() {
    if (!this.mac) {
      throw new Error('Sem MAC address cadastrado para esta TV — Wake-on-LAN indisponível.');
    }
    return this.tv.turnOn();
  }

  async powerToggle() {
    return this.sendKey('KEY_POWER');
  }

  async powerOff() {
    try {
      return await this.sendKey('KEY_POWER');
    } catch {
      return this.sendKey('KEY_POWEROFF');
    }
  }

  async volumeUp() {
    return this.sendKey('KEY_VOLUP');
  }

  async volumeDown() {
    return this.sendKey('KEY_VOLDOWN');
  }

  async mute() {
    return this.sendKey('KEY_MUTE');
  }

  async navUp() { return this.sendKey(NAV_KEYS.up); }
  async navDown() { return this.sendKey(NAV_KEYS.down); }
  async navLeft() { return this.sendKey(NAV_KEYS.left); }
  async navRight() { return this.sendKey(NAV_KEYS.right); }
  async navEnter() { return this.sendKey(NAV_KEYS.enter); }
  async navHome() { return this.sendKey(NAV_KEYS.home); }
  async navBack() { return this.sendKey(NAV_KEYS.back); }
  async navSource() { return this.sendKey(NAV_KEYS.source); }

  /** Envia uma tecla via WebSocket (porta 8002). Dispara o popup de autorização na 1ª vez. */
  async sendKey(key) {
    return new Promise((resolve, reject) => {
      this.tv.sendKey(key, (err, res) => {
        if (err) return reject(err);
        resolve(res);
      });
    });
  }

  async openApp(appName) {
    const appId = KNOWN_APPS[appName];
    if (!appId) throw new Error(`App "${appName}" desconhecido pra Samsung.`);
    return this.tv.openAppPromise(appId);
  }

  async pair() {
    try {
      const token = await this.tv.getTokenPromise();
      if (token) {
        this.pairingData = { ...this.pairingData, token };
        this.tv.setToken(token);
      }
      return this.pairingData;
    } catch (err) {
      throw new Error(
        'Não recebi token de pareamento. Confira se a TV está ligada e se você aceitou o popup de permissão.'
      );
    }
  }

  static getKnownApps() {
    return KNOWN_APPS;
  }
}

module.exports = SamsungDriver;
