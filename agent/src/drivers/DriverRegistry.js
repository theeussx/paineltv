const SamsungDriver = require('./samsung/SamsungDriver');

/**
 * Mapa marca -> classe do driver. Quando você adicionar suporte a
 * LG (webOS) ou TCL/Android TV, é só criar o driver em
 * drivers/lg/LgDriver.js ou drivers/tcl/TclDriver.js, implementar
 * os mesmos métodos do BaseDriver, e registrar aqui embaixo.
 * Nenhum outro arquivo do sistema precisa mudar.
 */
const REGISTRY = {
  samsung: SamsungDriver,
  // lg: LgDriver,
  // tcl: TclDriver,
};

function createDriver(brand, config) {
  const DriverClass = REGISTRY[brand];
  if (!DriverClass) {
    throw new Error(
      `Marca "${brand}" não suportada ainda. Marcas disponíveis: ${Object.keys(REGISTRY).join(', ')}`
    );
  }
  return new DriverClass(config);
}

function supportedBrands() {
  return Object.keys(REGISTRY);
}

module.exports = { createDriver, supportedBrands };