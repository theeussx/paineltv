const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'please-change-this-secret';
const JWT_EXPIRATION = '2h';

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

function sanitizeUser(user) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
  };
}

module.exports = {
  hashPassword,
  verifyPassword,
  generateAuthToken,
  verifyAuthToken,
  requireAuth,
  sanitizeUser,
};
