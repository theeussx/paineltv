const BaseDriver = require('../BaseDriver');

// Ids de canal (app) mais usados na Roku Channel Store.
const KNOWN_APPS = {
  netflix: '12',
  youtube: '837',
  primevideo: '13',
  disneyplus: '291097',
  spotify: '22297',
  globoplay: '303680',
};

/**
 * Driver Roku via ECP (External Control Protocol) -- HTTP puro, sem
 * autenticação, porta 8060. É o protocolo que TVs TCL/Hisense/Insignia
 * "Roku TV" usam nativamente. Se sua TCL roda Google TV em vez de Roku OS,
 * use o driver "androidtv" pra ela, não este.
 *
 * Doc oficial: https://developer.roku.com/docs/developer-program/debugging/external-control-api.md
 */
class RokuDriver extends BaseDriver {
  constructor(descriptor) {
    super(descriptor);
    this.baseUrl = `http://${this.ip}:8060`;
  }

  async _post(path) {
    const res = await fetch(`${this.baseUrl}${path}`, { method: 'POST', signal: AbortSignal.timeout(5000) });
    if (!res.ok) throw new Error(`Roku respondeu ${res.status} em ${path}`);
    return res;
  }

  async isOnline() {
    try {
      const res = await fetch(`${this.baseUrl}/query/device-info`, { signal: AbortSignal.timeout(4000) });
      return res.ok;
    } catch {
      return false;
    }
  }

  async turnOn() {
    // Roku TV não tem WOL padrão via ECP -- "Power" já liga se a TV tiver
    // "Fast TV Start" ativo. Sem isso, só WOL real (precisa de MAC + rede
    // que suporte, fora do escopo do ECP).
    return this._post('/keypress/PowerOn').catch(() => this._post('/keypress/Power'));
  }

  async powerOff() {
    return this._post('/keypress/PowerOff').catch(() => this._post('/keypress/Power'));
  }

  async powerToggle() {
    return this._post('/keypress/Power');
  }

  async volumeUp() {
    return this._post('/keypress/VolumeUp');
  }

  async volumeDown() {
    return this._post('/keypress/VolumeDown');
  }

  async mute() {
    return this._post('/keypress/VolumeMute');
  }

  async navUp() { return this._post('/keypress/Up'); }
  async navDown() { return this._post('/keypress/Down'); }
  async navLeft() { return this._post('/keypress/Left'); }
  async navRight() { return this._post('/keypress/Right'); }
  async navEnter() { return this._post('/keypress/Select'); }
  async navHome() { return this._post('/keypress/Home'); }
  async navBack() { return this._post('/keypress/Back'); }
  async navSource() { return this._post('/keypress/InputTuner'); }

  async sendKey(key) {
    return this._post(`/keypress/${key}`);
  }

  async openApp(appName) {
    const appId = KNOWN_APPS[appName];
    if (!appId) throw new Error(`App "${appName}" desconhecido pra Roku.`);
    return this._post(`/launch/${appId}`);
  }

  // Roku não precisa de pareamento -- ECP é aberto na rede local.

  static getKnownApps() {
    return KNOWN_APPS;
  }
}

module.exports = RokuDriver;
