const pool = require('./pool');

function mapRow(row) {
  return {
    id: row.id,
    locationId: row.location_id,
    actorUserId: row.actor_user_id,
    actorEmail: row.actor_email,
    actorRole: row.actor_role,
    action: row.action,
    tvId: row.tv_id,
    tvName: row.tv_name,
    ok: row.ok,
    errorMessage: row.error_message,
    ipAddress: row.ip_address,
    createdAt: row.created_at,
  };
}

/**
 * Registra uma entrada de auditoria. Nunca lança erro pra fora -- um
 * problema no log não pode derrubar o comando real que o usuário pediu.
 * Isso roda "fire and forget" a partir do proxy de TVs.
 */
async function logAction({
  locationId,
  actorUserId,
  actorEmail,
  actorRole,
  action,
  tvId = null,
  tvName = null,
  ok,
  errorMessage = null,
  ipAddress = null,
}) {
  try {
    await pool.query(
      `INSERT INTO audit_logs
        (location_id, actor_user_id, actor_email, actor_role, action, tv_id, tv_name, ok, error_message, ip_address)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [locationId, actorUserId, actorEmail, actorRole, action, tvId, tvName, ok, errorMessage, ipAddress]
    );
  } catch (err) {
    console.error('⚠️  Falha ao gravar log de auditoria (ignorado):', err.message);
  }
}

/**
 * Lista logs de um local com paginação e filtros opcionais. Sempre
 * ordenado do mais recente pro mais antigo -- é assim que se lê auditoria.
 */
async function listLogs(locationId, { limit = 50, offset = 0, action, ok, from, to } = {}) {
  const conditions = ['location_id = $1'];
  const params = [locationId];

  if (action) {
    params.push(action);
    conditions.push(`action = $${params.length}`);
  }
  if (ok === true || ok === false) {
    params.push(ok);
    conditions.push(`ok = $${params.length}`);
  }
  if (from) {
    params.push(from);
    conditions.push(`created_at >= $${params.length}`);
  }
  if (to) {
    params.push(to);
    conditions.push(`created_at <= $${params.length}`);
  }

  const where = conditions.join(' AND ');

  const countResult = await pool.query(`SELECT COUNT(*)::int AS count FROM audit_logs WHERE ${where}`, params);

  params.push(limit);
  params.push(offset);
  const { rows } = await pool.query(
    `SELECT * FROM audit_logs WHERE ${where} ORDER BY created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  return { logs: rows.map(mapRow), total: countResult.rows[0].count };
}

module.exports = { logAction, listLogs };
