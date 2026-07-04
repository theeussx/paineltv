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
 * Blindagem: só deixa passar quem tem role 'admin' no token.
 * Sempre usado DEPOIS de requireAuth na cadeia de middlewares.
 * A checagem é feita no backend (nunca confiar em uma flag vinda do frontend).
 */
function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ ok: false, error: 'Acesso restrito ao administrador' });
  }
  next();
}

function sanitizeUser(user) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role || 'user',
  };
}

module.exports = {
  hashPassword,
  verifyPassword,
  generateAuthToken,
  verifyAuthToken,
  requireAuth,
  requireAdmin,
  sanitizeUser,
};
