const express = require('express');
const router = express.Router();
const { getUserByEmail, addUser } = require('../db/users');
const {
  verifyPassword,
  generateAuthToken,
  requireAuth,
  sanitizeUser,
} = require('../middleware/auth');

function validateEmail(email) {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validatePassword(password) {
  return (
    typeof password === 'string' &&
    password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /[0-9]/.test(password) &&
    /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)
  );
}

router.post('/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    if (!validateEmail(email)) {
      return res.status(400).json({ ok: false, error: 'Email invalido' });
    }
    if (!validatePassword(password)) {
      return res.status(400).json({
        ok: false,
        error:
          'Senha invalida. Use ao menos 8 caracteres com maiusculas, minusculas, numeros e simbolos.',
      });
    }
    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return res.status(400).json({ ok: false, error: 'Nome invalido' });
    }

    const createdUser = await addUser({ email, password, name });
    const token = generateAuthToken({ id: createdUser.id, email: createdUser.email, name: createdUser.name });

    return res.status(201).json({ ok: true, token, user: sanitizeUser(createdUser) });
  } catch (error) {
    return res.status(400).json({ ok: false, error: error.message || 'Erro ao cadastrar usuario' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!validateEmail(email) || typeof password !== 'string' || password.length === 0) {
      return res.status(400).json({ ok: false, error: 'Email ou senha invalidos' });
    }

    const user = await getUserByEmail(email);
    if (!user || !verifyPassword(password, user.passwordSalt, user.passwordHash)) {
      return res.status(401).json({ ok: false, error: 'Email ou senha invalidos' });
    }

    const token = generateAuthToken({ id: user.id, email: user.email, name: user.name });
    return res.json({ ok: true, token, user: sanitizeUser(user) });
  } catch (error) {
    return res.status(500).json({ ok: false, error: 'Erro interno ao fazer login' });
  }
});

router.get('/me', requireAuth, async (req, res) => {
  return res.json({ ok: true, user: sanitizeUser(req.user) });
});

module.exports = router;
