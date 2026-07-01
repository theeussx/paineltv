const test = require('node:test');
const assert = require('node:assert/strict');

const tvManager = require('../src/services/TvManager');
const store = require('../src/db/store');

test('saveToken atualiza o driver em memória', () => {
  const tv = store.addTv({
    name: 'TV Teste',
    brand: 'samsung',
    ip: '192.168.0.10',
    mac: '00:00:00:00:00:00',
  });

  const driver = {
    token: '',
    setToken(token) {
      this.token = token;
    },
  };

  tvManager.drivers.set(tv.id, driver);
  tvManager.saveToken(tv.id, 'abc-token');

  assert.equal(driver.token, 'abc-token');
  store.removeTv(tv.id);
});
