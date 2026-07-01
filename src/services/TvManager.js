const store = require('../db/store');
const { createDriver } = require('../drivers/DriverRegistry');

/**
 * Mantém um driver "vivo" (instância em memória) para cada TV
 * cadastrada no banco. As rotas nunca falam direto com o banco ou
 * com os drivers — sempre passam por aqui.
 */
class TvManager {
  constructor() {
    this.drivers = new Map(); // id -> instância do driver
    this._loadAll();
  }

  _loadAll() {
    for (const tv of store.listTvs()) {
      this._instantiate(tv);
    }
  }

  _instantiate(tv) {
    try {
      const driver = createDriver(tv.brand, {
        ip: tv.ip,
        mac: tv.mac,
        name: tv.name,
        token: tv.token,
      });
      this.drivers.set(tv.id, driver);
    } catch (err) {
      console.log(`⚠️  Não consegui criar driver para "${tv.name}":`, err.message);
    }
  }

  list() {
    return store.listTvs().map((tv) => ({
      ...tv,
      token: undefined, // não expõe o token pro frontend
      status: this.drivers.get(tv.id)?.status || 'unknown',
    }));
  }

  get(id) {
    const tv = store.getTv(id);
    if (!tv) return null;
    return { tv, driver: this.drivers.get(id) };
  }

  add({ name, brand, ip, mac }) {
    const tv = store.addTv({ name, brand, ip, mac });
    this._instantiate(tv);
    return tv;
  }

  remove(id) {
    this.drivers.delete(id);
    return store.removeTv(id);
  }

  async refreshStatus(id) {
    const driver = this.drivers.get(id);
    if (!driver) return 'unknown';
    const online = await driver.isOnline();
    return online ? 'online' : 'offline';
  }

  async refreshAllStatus() {
    const ids = [...this.drivers.keys()];
    await Promise.all(ids.map((id) => this.refreshStatus(id)));
  }

  saveToken(id, token) {
    store.updateTv(id, { token });
  }
}

// Uma instância única compartilhada por toda a aplicação.
module.exports = new TvManager();