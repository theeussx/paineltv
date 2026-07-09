/**
 * Contrato comum que TODO driver de marca (Samsung, LG, Roku/TCL, Sony,
 * Android TV, Vizio...) precisa implementar. O resto do sistema (rotas,
 * agente, dashboard) só fala com essa interface -- nunca sabe os detalhes
 * do protocolo por trás.
 *
 * `descriptor` vem do central (Postgres) com o formato:
 *   { id, name, brand, ip, mac, pairingData }
 * `pairingData` é um blob opaco por marca (token Samsung, client-key LG,
 * cert Android TV, PSK Sony...). Se um driver muda esse dado (ex: adquire
 * um token novo), ele expõe via getPairingData() e o agente devolve isso
 * pro central persistir.
 */
class BaseDriver {
  constructor(descriptor) {
    this.id = descriptor.id;
    this.ip = descriptor.ip;
    this.mac = descriptor.mac || null;
    this.name = descriptor.name || descriptor.ip;
    this.pairingData = descriptor.pairingData || {};
  }

  async isOnline() {
    throw new Error(`isOnline() não implementado para ${this.constructor.name}`);
  }

  async turnOn() {
    throw new Error(`turnOn() não implementado para ${this.constructor.name}`);
  }

  async powerOff() {
    throw new Error(`powerOff() não implementado para ${this.constructor.name}`);
  }

  async powerToggle() {
    throw new Error(`powerToggle() não implementado para ${this.constructor.name}`);
  }

  async volumeUp() {
    throw new Error(`volumeUp() não implementado para ${this.constructor.name}`);
  }

  async volumeDown() {
    throw new Error(`volumeDown() não implementado para ${this.constructor.name}`);
  }

  async mute() {
    throw new Error(`mute() não implementado para ${this.constructor.name}`);
  }

  async navUp() {
    throw new Error(`navUp() não implementado para ${this.constructor.name}`);
  }
  async navDown() {
    throw new Error(`navDown() não implementado para ${this.constructor.name}`);
  }
  async navLeft() {
    throw new Error(`navLeft() não implementado para ${this.constructor.name}`);
  }
  async navRight() {
    throw new Error(`navRight() não implementado para ${this.constructor.name}`);
  }
  async navEnter() {
    throw new Error(`navEnter() não implementado para ${this.constructor.name}`);
  }
  async navHome() {
    throw new Error(`navHome() não implementado para ${this.constructor.name}`);
  }
  async navBack() {
    throw new Error(`navBack() não implementado para ${this.constructor.name}`);
  }
  async navSource() {
    throw new Error(`navSource() não implementado para ${this.constructor.name}`);
  }

  /** Passthrough de tecla "crua", pro caso avançado de quem sabe o código exato. */
  async sendKey(key) {
    throw new Error(`sendKey() não implementado para ${this.constructor.name}`);
  }

  /** appName é genérico (ex: 'netflix','youtube') -- o driver traduz pro id da marca. */
  async openApp(appName) {
    throw new Error(`openApp() não implementado para ${this.constructor.name}`);
  }

  /**
   * Faz (ou refaz) o pareamento com a TV, se essa marca precisar (Samsung,
   * LG, Android TV, Vizio precisam; Roku e Sony com PSK não). Retorna o
   * pairingData atualizado pra persistir no central, ou {} se não se aplica.
   */
  async pair() {
    return {};
  }

  /** Dados de pareamento atuais, pra devolver ao central depois de qualquer operação. */
  getPairingData() {
    return this.pairingData;
  }

  /** Mapa de apps conhecidos dessa marca: { nomeGenerico: idNaMarca }. */
  static getKnownApps() {
    return {};
  }
}

module.exports = BaseDriver;
