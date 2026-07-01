const SamsungTv = require('samsung-tv-control').default || require('samsung-tv-control');
const BaseDriver = require('../BaseDriver');

/**
 * Driver para TVs Samsung Tizen (2016+), incluindo a linha
 * Crystal UHD TU8000. Usa a porta WebSocket 8002 (SSL) que o
 * firmware expõe pra apps de controle remoto, e a porta 8001
 * (HTTP) só pra checar se a TV está acordada/na rede.
 *
 * Na primeira conexão, a TV vai mostrar um popup pedindo permissão.
 * Depois de aceitar, o token fica salvo e as próximas conexões
 * não pedem confirmação de novo.
 */
class SamsungDriver extends BaseDriver {
  constructor(config) {
    super(config);

    // A lib exige um MAC no construtor mesmo que você não use
    // Wake-on-LAN ainda. Se não tiver, usamos um placeholder — só
    // o comando turnOn() (WOL) vai falhar até você preencher o MAC de verdade.
    this.mac = config.mac || null;
    this.token = config.token || null;

    this.tv = new SamsungTv({
      debug: false,
      ip: this.ip,
      mac: this.mac || '00:00:00:00:00:00',
      nameApp: 'TVManager', // nome que aparece no popup de autorização
      token: this.token || '',
      saveToken: false,
    });

    if (this.token) {
      this.tv.setToken(this.token);
    }
  }

  /**
   * Checa se a TV está acordada e respondendo na porta 8001 (HTTP).
   * Isso NÃO abre o popup de autorização — é só um "ping" de app.
   * Se a TV estiver desligada (modo eco/standby) ou o IP estiver
   * errado, isso vai dar false / erro de rede, não uma exceção fatal.
   */
  async connect() {
    try {
      const available = await this.tv.isAvailable();
      this.status = available ? 'online' : 'offline';
      if (!available) {
        throw new Error(
          `TV em ${this.ip} não respondeu na porta 8001. ` +
          `Verifique se o IP está correto (não é o do roteador) e se a TV está ligada.`
        );
      }
      return true;
    } catch (err) {
      this.status = 'offline';
      // erros de rede (ECONNREFUSED, ETIMEDOUT, EHOSTUNREACH) chegam aqui
      throw new Error(`Falha ao conectar em ${this.ip}: ${err.message || err}`);
    }
  }

  async isOnline() {
    try {
      await this.connect();
      return true;
    } catch {
      return false;
    }
  }

  /** Liga a TV via Wake-on-LAN (só funciona se a TV suportar/tiver WOL ativo). */
  async turnOn() {
    if (!this.mac) {
      throw new Error('Sem MAC address cadastrado para esta TV — Wake-on-LAN indisponível.');
    }
    return this.tv.turnOn();
  }

  /** Abre um app instalado na TV pelo appId (ver APP_IDS abaixo). */
  async openApp(appId) {
    return this.tv.openAppPromise(appId);
  }

  async powerToggle() {
    return this.sendKey('KEY_POWER');
  }

  async powerOff() {
    return this.sendKey('KEY_POWEROFF');
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

  async home() {
    return this.sendKey('KEY_HOME');
  }

  async back() {
    return this.sendKey('KEY_RETURN');
  }

  async source() {
    return this.sendKey('KEY_SOURCE');
  }

  /**
   * Envia uma tecla via WebSocket (porta 8002). Na primeira chamada,
   * é isso que dispara o popup de autorização na TV.
   */
  async sendKey(key) {
    return new Promise((resolve, reject) => {
      this.tv.sendKey(key, (err, res) => {
        if (err) return reject(err);
        resolve(res);
      });
    });
  }

  /**
   * Depois que o popup for aceito, o token fica disponível aqui.
   * Salve esse valor em TV_TOKEN no .env pra não pedir autorização
   * de novo nas próximas execuções.
   */
  setToken(token) {
    this.token = token;
    if (this.tv?.setToken) {
      this.tv.setToken(token || '');
    }
  }

  async getToken() {
    if (this.token) {
      return this.token;
    }
    try {
      const token = await this.tv.getTokenPromise();
      this.token = token;
      return token;
    } catch {
      return null;
    }
  }
}

module.exports = SamsungDriver;