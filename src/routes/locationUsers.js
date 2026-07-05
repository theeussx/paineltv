const express = require('express');
const router = express.Router({ mergeParams: true }); // mergeParams: precisa do :locationId do router pai
const { addUser, listUsers, deleteUser, getUserById } = require('../db/users');
const { getLocationById } = require('../db/locations');
const { requireAuth, requireAdmin, requireLocationAccess, sanitizeUser } = require('../middleware/auth');
const { validateEmail, validatePassword } = require('../lib/validators');

// Blindagem: precisa estar logado, ser admin (ou owner), E só pode
// mexer no local que é dele (owner passa livre, admin só no próprio).
router.use(requireAuth, requireAdmin, requireLocationAccess('locationId'));

router.get('/', async (req, res) => {
  const location = await getLocationById(req.params.locationId);
  if (!location) return res.status(404).json({ ok: false, error: 'Local não encontrado' });

  const users = await listUsers({ locationId: req.params.locationId });
  res.json({ ok: true, users: users.map(sanitizeUser) });
});

router.post('/', async (req, res) => {
  try {
    const location = await getLocationById(req.params.locationId);
    if (!location) return res.status(404).json({ ok: false, error: 'Local não encontrado' });

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
    // Blindagem: essa rota nunca cria 'owner' -- só 'user' ou 'admin' DESTE
    // local. 'owner' só existe via script de bootstrap no servidor.
    if (role && role !== 'user' && role !== 'admin') {
      return res.status(400).json({ ok: false, error: "role deve ser 'user' ou 'admin'" });
    }

    const createdUser = await addUser({
      email,
      password,
      name,
      role: role || 'user',
      locationId: req.params.locationId,
    });
    return res.status(201).json({ ok: true, user: sanitizeUser(createdUser) });
  } catch (error) {
    return res.status(400).json({ ok: false, error: error.message || 'Erro ao cadastrar usuario' });
  }
});

router.delete('/:userId', async (req, res) => {
  if (req.params.userId === req.user.id) {
    return res.status(400).json({ ok: false, error: 'Você não pode remover a própria conta por aqui.' });
  }
  // Blindagem: sem isso, um admin do Local A poderia adivinhar/descobrir
  // o id de um usuário do Local B e removê-lo trocando só a URL.
  const target = await getUserById(req.params.userId);
  if (!target || target.locationId !== req.params.locationId) {
    return res.status(404).json({ ok: false, error: 'Usuário não encontrado' });
  }
  const removed = await deleteUser(req.params.userId);
  if (!removed) return res.status(404).json({ ok: false, error: 'Usuário não encontrado' });
  res.json({ ok: true });
});

module.exports = router;
