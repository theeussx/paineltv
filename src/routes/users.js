const express = require('express');
const router = express.Router();
const { addUser, listUsers, deleteUser } = require('../db/users');
const { requireAuth, requireAdmin, sanitizeUser } = require('../middleware/auth');
const { validateEmail, validatePassword } = require('../lib/validators');

// Blindagem: toda rota abaixo exige estar autenticado E ser admin.
// Não existe nenhum outro jeito de criar/listar/remover usuário na API.
router.use(requireAuth, requireAdmin);

// Lista todos os usuários (sem hash/salt de senha)
router.get('/', async (req, res) => {
  const users = await listUsers();
  res.json({ ok: true, users: users.map(sanitizeUser) });
});

// Cria um novo usuário. Só um admin logado pode chamar isso.
// role é opcional (default 'user'); só um admin pode promover outro admin.
router.post('/', async (req, res) => {
  try {
    const { email, password, name, role } = req.body;

    if (!validateEmail(email)) {
      return res.status(400).json({ ok: false, error: 'Email invalido' });
    }
    if (!validatePassword(password)) {
      return res.status(400).json({
        ok: false,
        error: 'Senha invalida. Use ao menos 8 caracteres com maiusculas, minusculas, numeros e simbolos.',
      });
    }
    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return res.status(400).json({ ok: false, error: 'Nome invalido' });
    }
    if (role && role !== 'user' && role !== 'admin') {
      return res.status(400).json({ ok: false, error: "role deve ser 'user' ou 'admin'" });
    }

    const createdUser = await addUser({ email, password, name, role: role || 'user' });
    return res.status(201).json({ ok: true, user: sanitizeUser(createdUser) });
  } catch (error) {
    return res.status(400).json({ ok: false, error: error.message || 'Erro ao cadastrar usuario' });
  }
});

// Remove um usuário. Um admin não pode se auto-remover por essa rota
// (evita ficar sem nenhum admin no sistema por engano).
router.delete('/:id', async (req, res) => {
  if (req.params.id === req.user.id) {
    return res.status(400).json({ ok: false, error: 'Você não pode remover a própria conta por aqui.' });
  }
  const removed = await deleteUser(req.params.id);
  if (!removed) return res.status(404).json({ ok: false, error: 'Usuário não encontrado' });
  res.json({ ok: true });
});

module.exports = router;
