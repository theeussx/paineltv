const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const { getUserByEmail } = require('../db/users');
const {
  verifyPassword,
  generateAuthToken,
  requireAuth,
  sanitizeUser,
} = require('../middleware/auth');

// Blindagem contra brute-force: no máximo 10 tentativas de login por IP
// a cada 15 minutos. As respostas de erro continuam genéricas (não revelam
// se o email existe ou não).
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: 'Muitas tentativas de login. Tente novamente mais tarde.' },
});

const { validateEmail } = require('../lib/validators');

// Blindagem: NÃO existe mais auto-cadastro público. Criar usuário agora é
// uma ação de admin (ver /api/users em routes/users.js). O único jeito de
// existir o primeiro admin é via script de bootstrap (scripts/create-admin.js),
// nunca por um endpoint HTTP aberto.

router.post('/login', loginLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!validateEmail(email) || typeof password !== 'string' || password.length === 0) {
      return res.status(400).json({ ok: false, error: 'Email ou senha invalidos' });
    }

    const user = await getUserByEmail(email);
    if (!user || !verifyPassword(password, user.passwordSalt, user.passwordHash)) {
      return res.status(401).json({ ok: false, error: 'Email ou senha invalidos' });
    }

    const token = generateAuthToken({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role || 'user',
      locationId: user.locationId ?? null,
    });
    return res.json({ ok: true, token, user: sanitizeUser(user) });
  } catch (error) {
    return res.status(500).json({ ok: false, error: 'Erro interno ao fazer login' });
  }
});

router.get('/me', requireAuth, async (req, res) => {
  return res.json({ ok: true, user: sanitizeUser(req.user) });
});

module.exports = router;
