const SamsungDriver = require('./samsung/SamsungDriver');
const RokuDriver = require('./roku/RokuDriver');
const SonyDriver = require('./sony/SonyDriver');
const LgDriver = require('./lg/LgDriver');
const AndroidTvDriver = require('./androidtv/AndroidTvDriver');
const VizioDriver = require('./vizio/VizioDriver');

/**
 * Mapa marca -> classe do driver. "tcl" e "hisense" apontam pro driver
 * Roku porque a maioria global dessas TVs roda Roku OS -- se o modelo
 * específico rodar Google TV, cadastre com a marca "androidtv" em vez
 * de "tcl".
 */
const REGISTRY = {
  samsung: SamsungDriver,
  lg: LgDriver,
  roku: RokuDriver,
  tcl: RokuDriver,
  hisense: RokuDriver,
  sony: SonyDriver,
  androidtv: AndroidTvDriver,
  googletv: AndroidTvDriver,
  vizio: VizioDriver,
};

function createDriver(descriptor) {
  const brand = (descriptor.brand || '').toLowerCase();
  const DriverClass = REGISTRY[brand];
  if (!DriverClass) {
    throw new Error(
      `Marca "${descriptor.brand}" não suportada ainda. Marcas disponíveis: ${supportedBrands().join(', ')}`
    );
  }
  return new DriverClass(descriptor);
}

function supportedBrands() {
  return [...new Set(Object.keys(REGISTRY))];
}

function getKnownApps(brand) {
  const DriverClass = REGISTRY[(brand || '').toLowerCase()];
  if (!DriverClass) return {};
  return DriverClass.getKnownApps();
}

module.exports = { createDriver, supportedBrands, getKnownApps };
