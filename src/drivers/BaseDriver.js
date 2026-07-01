/**
 * Todo driver de TV (Samsung, LG, TCL, AndroidTV...) deve implementar
 * esses métodos. Assim o resto do sistema (rotas, dashboard) nunca
 * precisa saber qual marca está por trás.
 */
class BaseDriver {
  constructor(config) {
    this.ip = config.ip;
    this.name = config.name || config.ip;
    this.status = 'unknown'; // 'online' | 'offline' | 'unknown'
    this.token = config.token || null;
  }

  async connect() {
    throw new Error('connect() não implementado');
  }

  async powerOff() {
    throw new Error('powerOff() não implementado');
  }

  async setVolume(level) {
    throw new Error('setVolume() não implementado');
  }

  async sendKey(key) {
    throw new Error('sendKey() não implementado');
  }

  async isOnline() {
    throw new Error('isOnline() não implementado');
  }

  setToken(token) {
    this.token = token;
  }
}

module.exports = BaseDriver;