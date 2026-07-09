const { AndroidRemote, RemoteKeyCode, RemoteDirection } = require('androidtv-remote');
const BaseDriver = require('../BaseDriver');

const KNOWN_APPS = {
  netflix: 'https://www.netflix.com/title',
  youtube: 'https://www.youtube.com',
  primevideo: 'https://app.primevideo.com',
  disneyplus: 'https://www.disneyplus.com',
  spotify: 'https://open.spotify.com',
};

// Sessões de pareamento em andamento, uma por IP -- assim uma chamada
// 'pair' sem código (que dispara o PIN na tela) e a chamada seguinte 'pair'
// COM código (que a pessoa digitou) conseguem se encontrar, mesmo sendo
// duas mensagens HTTP/WS totalmente separadas no tempo.
const pendingPairings = new Map();

/**
 * Driver Android TV / Google TV via protocolo "Android TV Remote v2"
 * (TLS + certificado, portas 6466/6467). Esse é o único driver com
 * pareamento em DUAS etapas, porque a TV mostra um PIN de 6 dígitos que
 * um humano precisa digitar de volta -- não dá pra automatizar isso.
 *
 * ⚠️ Precisa de validação com TV física — a lib é usada por vários
 * projetos (inclusive Home Assistant), mas eu não tenho como confirmar
 * o comportamento exato sem um Android TV/Google TV real na mão.
 *
 * Fluxo:
 *   1. chama pair() sem código -> TV mostra o PIN -> retorna {pairingRequired:true}
 *   2. chama pair(code) com o PIN que a pessoa leu na tela -> retorna
 *      {pairingData: {cert}} pra persistir
 */
class AndroidTvDriver extends BaseDriver {
  _certOptions() {
    // A lib espera o certificado no formato {cert, key} (strings PEM).
    // Guardamos isso dentro de pairingData.cert.
    return this.pairingData.cert || {};
  }

  async _connectRemote() {
    const remote = new AndroidRemote(this.ip, {
      pairing_port: 6467,
      remote_port: 6466,
      name: 'wardcontroll',
      cert: this._certOptions(),
    });

    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Tempo esgotado conectando no Android TV.')), 8000);
      remote.on('ready', () => {
        clearTimeout(timeout);
        resolve();
      });
      remote.on('error', (err) => {
        clearTimeout(timeout);
        reject(err);
      });
      remote.start().catch(reject);
    });

    return remote;
  }

  async isOnline() {
    let remote;
    try {
      remote = await this._connectRemote();
      return true;
    } catch {
      return false;
    } finally {
      remote?.stop?.();
    }
  }

  async _withRemote(fn) {
    const remote = await this._connectRemote();
    try {
      return await fn(remote);
    } finally {
      remote.stop?.();
    }
  }

  async turnOn() {
    return this._withRemote((r) => r.sendKey(RemoteKeyCode.KEYCODE_POWER, RemoteDirection.SHORT));
  }
  async powerOff() {
    return this._withRemote((r) => r.sendKey(RemoteKeyCode.KEYCODE_POWER, RemoteDirection.SHORT));
  }
  async powerToggle() {
    return this._withRemote((r) => r.sendKey(RemoteKeyCode.KEYCODE_POWER, RemoteDirection.SHORT));
  }
  async volumeUp() {
    return this._withRemote((r) => r.sendKey(RemoteKeyCode.KEYCODE_VOLUME_UP, RemoteDirection.SHORT));
  }
  async volumeDown() {
    return this._withRemote((r) => r.sendKey(RemoteKeyCode.KEYCODE_VOLUME_DOWN, RemoteDirection.SHORT));
  }
  async mute() {
    return this._withRemote((r) => r.sendKey(RemoteKeyCode.KEYCODE_MUTE, RemoteDirection.SHORT));
  }
  async navUp() { return this._withRemote((r) => r.sendKey(RemoteKeyCode.KEYCODE_DPAD_UP, RemoteDirection.SHORT)); }
  async navDown() { return this._withRemote((r) => r.sendKey(RemoteKeyCode.KEYCODE_DPAD_DOWN, RemoteDirection.SHORT)); }
  async navLeft() { return this._withRemote((r) => r.sendKey(RemoteKeyCode.KEYCODE_DPAD_LEFT, RemoteDirection.SHORT)); }
  async navRight() { return this._withRemote((r) => r.sendKey(RemoteKeyCode.KEYCODE_DPAD_RIGHT, RemoteDirection.SHORT)); }
  async navEnter() { return this._withRemote((r) => r.sendKey(RemoteKeyCode.KEYCODE_DPAD_CENTER, RemoteDirection.SHORT)); }
  async navHome() { return this._withRemote((r) => r.sendKey(RemoteKeyCode.KEYCODE_HOME, RemoteDirection.SHORT)); }
  async navBack() { return this._withRemote((r) => r.sendKey(RemoteKeyCode.KEYCODE_BACK, RemoteDirection.SHORT)); }
  async navSource() { return this._withRemote((r) => r.sendKey(RemoteKeyCode.KEYCODE_TV_INPUT, RemoteDirection.SHORT)); }

  async sendKey(key) {
    const code = RemoteKeyCode[key];
    if (!code) throw new Error(`Tecla "${key}" desconhecida pra Android TV.`);
    return this._withRemote((r) => r.sendKey(code, RemoteDirection.SHORT));
  }

  async openApp(appName) {
    const link = KNOWN_APPS[appName];
    if (!link) throw new Error(`App "${appName}" desconhecido pra Android TV.`);
    return this._withRemote((r) => r.sendAppLink(link));
  }

  /**
   * Pareamento em 2 etapas (ver comentário da classe). Sem `code`, inicia
   * a sessão e espera a TV mostrar o PIN. Com `code`, completa usando a
   * sessão que ficou pendente da chamada anterior.
   */
  async pair(code) {
    if (code) {
      const pending = pendingPairings.get(this.ip);
      if (!pending) {
        throw new Error('Nenhum pareamento em andamento pra essa TV. Inicie de novo sem código.');
      }
      pending.remote.sendCode(code);
      const cert = await pending.done;
      pendingPairings.delete(this.ip);
      this.pairingData = { ...this.pairingData, cert };
      return { pairingData: this.pairingData };
    }

    const remote = new AndroidRemote(this.ip, {
      pairing_port: 6467,
      remote_port: 6466,
      name: 'wardcontroll',
      cert: {},
    });

    const donePromise = new Promise((resolve, reject) => {
      remote.on('secret', () => {
        // Só sinaliza que o PIN foi pedido -- quem resolve de vez é o
        // sendCode() lá em cima, quando o código chegar.
      });
      remote.on('ready', () => resolve(remote.getCertificate()));
      remote.on('error', reject);
    });

    pendingPairings.set(this.ip, { remote, done: donePromise });
    remote.start().catch(() => {});

    // Espera só o suficiente pro evento 'secret' disparar (TV mostrar o PIN).
    await new Promise((resolve) => setTimeout(resolve, 2000));
    return { pairingRequired: true };
  }

  static getKnownApps() {
    return KNOWN_APPS;
  }
}

module.exports = AndroidTvDriver;
