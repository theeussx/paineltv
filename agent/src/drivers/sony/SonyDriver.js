const BaseDriver = require('../BaseDriver');

// Códigos IRCC (infravermelho sobre IP) dos botões mais usados. Sony
// documenta a lista completa em "IRCC Categories" no Bravia Professional
// Display / Android TV API docs.
const IRCC_CODES = {
  power: 'AAAAAQAAAAEAAAAVAw==',
  volumeUp: 'AAAAAQAAAAEAAAASAw==',
  volumeDown: 'AAAAAQAAAAEAAAATAw==',
  mute: 'AAAAAQAAAAEAAAAUAw==',
  up: 'AAAAAQAAAAEAAAB0Aw==',
  down: 'AAAAAQAAAAEAAAB1Aw==',
  left: 'AAAAAQAAAAEAAAA0Aw==',
  right: 'AAAAAQAAAAEAAAAzAw==',
  confirm: 'AAAAAQAAAAEAAABlAw==',
  home: 'AAAAAQAAAAEAAABgAw==',
  back: 'AAAAAgAAAJcAAAAjAw==',
  input: 'AAAAAQAAAAEAAAAlAw==',
};

const KNOWN_APPS = {
  netflix: 'com.netflix.ninja',
  youtube: 'com.google.android.youtube.tv',
  primevideo: 'com.amazon.amazonvideo.livingroom',
  disneyplus: 'com.disney.disneyplus',
};

/**
 * Driver Sony Bravia (linhas com Android TV/Google TV também respondem
 * essa API, além do endpoint simples de sistema). Precisa de uma "Pre-Shared
 * Key" configurada uma vez na TV em:
 *   Configurações > Rede e Internet > Configurações de controle remoto
 *   doméstico > Autenticação > Pre-Shared Key
 * Guarde essa chave em pairingData.psk ao cadastrar a TV.
 */
class SonyDriver extends BaseDriver {
  constructor(descriptor) {
    super(descriptor);
    this.psk = this.pairingData.psk || null;
    this.baseUrl = `http://${this.ip}`;
  }

  _headers() {
    const headers = { 'Content-Type': 'application/json' };
    if (this.psk) headers['X-Auth-PSK'] = this.psk;
    return headers;
  }

  async _rpc(endpoint, method, params = [{}]) {
    const res = await fetch(`${this.baseUrl}/sony/${endpoint}`, {
      method: 'POST',
      headers: this._headers(),
      body: JSON.stringify({ method, params, id: 1, version: '1.0' }),
      signal: AbortSignal.timeout(5000),
    });
    const data = await res.json().catch(() => ({}));
    if (data.error) throw new Error(`Sony respondeu erro: ${JSON.stringify(data.error)}`);
    return data.result;
  }

  async _ircc(code) {
    const body =
      '<?xml version="1.0"?><s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/" s:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/"><s:Body><u:X_SendIRCC xmlns:u="urn:schemas-sony-com:service:IRCC:1"><IRCCCode>' +
      code +
      '</IRCCCode></u:X_SendIRCC></s:Body></s:Envelope>';
    const res = await fetch(`${this.baseUrl}/sony/ircc`, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml; charset=UTF-8',
        SOAPACTION: '"urn:schemas-sony-com:service:IRCC:1#X_SendIRCC"',
        ...(this.psk ? { 'X-Auth-PSK': this.psk } : {}),
      },
      body,
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) throw new Error(`Sony IRCC respondeu ${res.status}`);
  }

  async isOnline() {
    try {
      const result = await this._rpc('system', 'getPowerStatus');
      return !!result;
    } catch {
      return false;
    }
  }

  async turnOn() {
    if (!this.mac) throw new Error('Sem MAC cadastrado — Wake-on-LAN indisponível pra ligar via rede.');
    // Bravia moderna aceita WOL se "Configuração de Ligar por Rede" estiver
    // ativa nas configurações da TV. O envio do pacote WOL fica a cargo de
    // uma lib externa (não incluída aqui) -- ou use o IRCC de power como
    // fallback se a TV já estiver em standby "rápido".
    return this._ircc(IRCC_CODES.power);
  }

  async powerOff() {
    try {
      return await this._rpc('system', 'setPowerStatus', [{ status: false }]);
    } catch {
      return this._ircc(IRCC_CODES.power);
    }
  }

  async powerToggle() {
    return this._ircc(IRCC_CODES.power);
  }

  async volumeUp() {
    return this._ircc(IRCC_CODES.volumeUp);
  }

  async volumeDown() {
    return this._ircc(IRCC_CODES.volumeDown);
  }

  async mute() {
    return this._ircc(IRCC_CODES.mute);
  }

  async navUp() { return this._ircc(IRCC_CODES.up); }
  async navDown() { return this._ircc(IRCC_CODES.down); }
  async navLeft() { return this._ircc(IRCC_CODES.left); }
  async navRight() { return this._ircc(IRCC_CODES.right); }
  async navEnter() { return this._ircc(IRCC_CODES.confirm); }
  async navHome() { return this._ircc(IRCC_CODES.home); }
  async navBack() { return this._ircc(IRCC_CODES.back); }
  async navSource() { return this._ircc(IRCC_CODES.input); }

  async sendKey(key) {
    const code = IRCC_CODES[key];
    if (!code) throw new Error(`Tecla "${key}" desconhecida pra Sony.`);
    return this._ircc(code);
  }

  async openApp(appName) {
    const uri = KNOWN_APPS[appName];
    if (!uri) throw new Error(`App "${appName}" desconhecido pra Sony.`);
    return this._rpc('appControl', 'setActiveApp', [{ uri }]);
  }

  static getKnownApps() {
    return KNOWN_APPS;
  }
}

module.exports = SonyDriver;
