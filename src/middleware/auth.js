const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRATION = '2h';

// Blindagem: nunca sobe o servidor com o segredo padrão. Um JWT_SECRET
// previsível permite forjar tokens (inclusive tokens de admin).
if (!JWT_SECRET || JWT_SECRET === 'please-change-this-secret') {
  throw new Error(
    'JWT_SECRET não configurado (ou está usando o valor padrão inseguro). ' +
      'Defina uma string aleatória longa em JWT_SECRET no seu .env antes de iniciar o servidor.'
  );
}

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const derived = crypto.scryptSync(password, salt, 64);
  return {
    salt,
    hash: derived.toString('hex'),
  };
}

function verifyPassword(password, salt, hash) {
  const derived = crypto.scryptSync(password, salt, 64);
  const hashBuffer = Buffer.from(hash, 'hex');
  return crypto.timingSafeEqual(hashBuffer, derived);
}

function generateAuthToken(payload) {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRATION,
  });
}

function verifyAuthToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

function getBearerToken(req) {
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (!authHeader || typeof authHeader !== 'string') {
    return null;
  }
  const [, token] = authHeader.split(' ');
  return token || null;
}

async function requireAuth(req, res, next) {
  const token = getBearerToken(req);
  if (!token) {
    return res.status(401).json({ ok: false, error: 'Autenticacao obrigatoria' });
  }

  try {
    const payload = verifyAuthToken(token);
    req.user = payload;
    next();
  } catch (error) {
    return res.status(401).json({ ok: false, error: 'Token invalido ou expirado' });
  }
}

/**
 * Blindagem: 'owner' é o dono da plataforma (você) e tem acesso de admin
 * em qualquer lugar. 'admin' é o admin de UM local só. Sempre usado DEPOIS
 * de requireAuth na cadeia de middlewares.
 */
function requireAdmin(req, res, next) {
  if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'owner')) {
    return res.status(403).json({ ok: false, error: 'Acesso restrito ao administrador' });
  }
  next();
}

/**
 * Blindagem: só o 'owner' pode criar/remover locais e ver o painel de
 * todos os locais. Isso é o que impede um admin de local virar owner
 * na marra chamando a rota certa.
 */
function requireOwner(req, res, next) {
  if (!req.user || req.user.role !== 'owner') {
    return res.status(403).json({ ok: false, error: 'Acesso restrito ao dono da plataforma' });
  }
  next();
}

/**
 * Blindagem central do multi-tenant: garante que quem está chamando uma
 * rota /api/locations/:locationId/... só acessa o local que é dele.
 * 'owner' passa sempre (ele enxerga todos os locais); 'admin'/'user' só
 * passam se o locationId do token bater com o da URL.
 *
 * Isso é o que impede o admin do Local A de, trocando o ID na URL, ver ou
 * mexer nas TVs/usuários do Local B.
 */
function requireLocationAccess(paramName = 'locationId') {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ ok: false, error: 'Autenticacao obrigatoria' });
    }
    if (req.user.role === 'owner') return next();

    const requestedLocationId = req.params[paramName];
    if (!req.user.locationId || req.user.locationId !== requestedLocationId) {
      return res.status(403).json({ ok: false, error: 'Você não tem acesso a este local' });
    }
    next();
  };
}

function sanitizeUser(user) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role || 'user',
    locationId: user.locationId ?? null,
  };
}

module.exports = {
  hashPassword,
  verifyPassword,
  generateAuthToken,
  verifyAuthToken,
  requireAuth,
  requireAdmin,
  requireOwner,
  requireLocationAccess,
  sanitizeUser,
};
