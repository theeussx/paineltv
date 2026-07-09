const pool = require('./pool');

function mapRow(row) {
  return {
    id: row.id,
    locationId: row.location_id,
    name: row.name,
    brand: row.brand,
    ip: row.ip,
    mac: row.mac,
    pairingData: row.pairing_data || {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function listTvs(locationId) {
  const { rows } = await pool.query(
    'SELECT * FROM tvs WHERE location_id = $1 ORDER BY created_at ASC',
    [locationId]
  );
  return rows.map(mapRow);
}

async function getTv(locationId, id) {
  const { rows } = await pool.query('SELECT * FROM tvs WHERE id = $1 AND location_id = $2', [
    id,
    locationId,
  ]);
  return rows[0] ? mapRow(rows[0]) : null;
}

async function createTv(locationId, { name, brand, ip, mac }) {
  const { rows } = await pool.query(
    `INSERT INTO tvs (location_id, name, brand, ip, mac) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [locationId, name.trim(), brand.toLowerCase(), ip.trim(), mac ? mac.trim() : null]
  );
  return mapRow(rows[0]);
}

async function deleteTv(locationId, id) {
  const { rowCount } = await pool.query('DELETE FROM tvs WHERE id = $1 AND location_id = $2', [
    id,
    locationId,
  ]);
  return rowCount > 0;
}

/**
 * Atualiza os dados de pareamento de uma TV (token Samsung, client-key LG,
 * etc). O agente devolve isso depois de executar um comando que gera/renova
 * pareamento, e o central persiste aqui -- assim o pareamento sobrevive
 * mesmo se o agente reiniciar ou rodar em outra máquina.
 */
async function updatePairingData(locationId, id, pairingData) {
  const { rows } = await pool.query(
    `UPDATE tvs SET pairing_data = $1, updated_at = now() WHERE id = $2 AND location_id = $3 RETURNING *`,
    [JSON.stringify(pairingData), id, locationId]
  );
  return rows[0] ? mapRow(rows[0]) : null;
}

module.exports = {
  listTvs,
  getTv,
  createTv,
  deleteTv,
  updatePairingData,
};
