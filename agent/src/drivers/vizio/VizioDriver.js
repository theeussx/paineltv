const SmartCast = require('vizio-smart-cast');
const BaseDriver = require('../BaseDriver');

// CODESET/CODE do key_command da Vizio. Volume (CODESET 5) é o único
// oficialmente documentado pelo exiva/Vizio_SmartCast_API com exemplo
// funcionando. Power e navegação abaixo são os valores mais citados por
// integrações de terceiros (Home Assistant, pyvizio) só que a Vizio nunca
// documentou oficialmente esses -- ⚠️ VALIDAR COM TV FÍSICA antes de
// confiar de olhos fechados, principalmente nav (up/down/left/right).
const KEYS = {
  volumeUp: { codeset: 5, code: 1 },
  volumeDown: { codeset: 5, code: 0 },
  mute: { codeset: 5, code: 4 },
  power: { codeset: 11, code: 2 }, // toggle
  powerOn: { codeset: 11, code: 1 },
  powerOff: { codeset: 11, code: 0 },
  up: { codeset: 3, code: 8 },
  down: { codeset: 3, code: 0 },
  left: { codeset: 3, code: 1 },
  right: { codeset: 3, code: 7 },
  enter: { codeset: 3, code: 2 },
  back: { codeset: 4, code: 0 },
  home: { codeset: 4, code: 8 },
  input: { codeset: 7, code: 1 },
};

const KNOWN_APPS = {
  netflix: '3',
  youtube: '6',
  primevideo: '9',
  disneyplus: 'Disney',
};

/**
 * Driver Vizio SmartCast. Pareamento em 2 etapas igual Android TV: a TV
 * mostra um PIN de 4 dígitos, você digita de volta.
 *
 * ⚠️ Precisa de validação com TV física — os códigos de navegação e
 * power não são documentados oficialmente pela Vizio (ver comentário
 * acima), só reverse-engineered pela comunidade.
 */
class VizioDriver extends BaseDriver {
  _client() {
    return new SmartCast(this.ip, this.pairingData.authToken || undefined);
  }

  async isOnline() {
    try {
      const res = await this._client().power.currentMode();
      return res?.STATUS?.RESULT === 'SUCCESS';
    } catch {
      return false;
    }
  }

  async _key({ codeset, code }) {
    return this._client().control.keyCommand(codeset, code, 'KEYPRESS');
  }

  async turnOn() { return this._key(KEYS.powerOn); }
  async powerOff() { return this._key(KEYS.powerOff); }
  async powerToggle() { return this._key(KEYS.power); }
  async volumeUp() { return this._key(KEYS.volumeUp); }
  async volumeDown() { return this._key(KEYS.volumeDown); }
  async mute() { return this._key(KEYS.mute); }
  async navUp() { return this._key(KEYS.up); }
  async navDown() { return this._key(KEYS.down); }
  async navLeft() { return this._key(KEYS.left); }
  async navRight() { return this._key(KEYS.right); }
  async navEnter() { return this._key(KEYS.enter); }
  async navHome() { return this._key(KEYS.home); }
  async navBack() { return this._key(KEYS.back); }
  async navSource() { return this._key(KEYS.input); }

  async sendKey(key) {
    const def = KEYS[key];
    if (!def) throw new Error(`Tecla "${key}" desconhecida pra Vizio.`);
    return this._key(def);
  }

  async openApp(appName) {
    const appId = KNOWN_APPS[appName];
    if (!appId) throw new Error(`App "${appName}" desconhecido pra Vizio.`);
    return this._client().app.launch(appId);
  }

  /**
   * Pareamento em 2 etapas: sem `code`, dispara o PIN na tela. Com
   * `code`, completa e retorna o authToken pra persistir.
   */
  async pair(code) {
    const client = this._client();
    if (code) {
      const response = await client.pairing.pair(code);
      const token = response?.ITEM?.AUTH_TOKEN;
      if (!token) throw new Error('TV não retornou token de pareamento — confira o PIN.');
      this.pairingData = { ...this.pairingData, authToken: token };
      return { pairingData: this.pairingData };
    }
    await client.pairing.initiate();
    return { pairingRequired: true };
  }

  static getKnownApps() {
    return KNOWN_APPS;
  }
}

module.exports = VizioDriver;
