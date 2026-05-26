const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function renderLogin(req, res) {
  if (req.session && req.session.userId) {
    return res.redirect('/dashboard');
  }
  res.render('login', { error: null, success: null });
}

async function login(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.render('login', { error: 'Preencha todos os campos.', success: null });
  }

  try {
    const usuario = await prisma.usuario.findUnique({
      where: { email }
    });

    if (!usuario) {
      return res.render('login', { error: 'E-mail ou senha incorretos.', success: null });
    }

    const senhaValida = await bcrypt.compare(password, usuario.senhaHash);
    if (!senhaValida) {
      return res.render('login', { error: 'E-mail ou senha incorretos.', success: null });
    }

    // Configurar a sessão
    req.session.userId = usuario.id;
    req.session.userNome = usuario.nome;
    req.session.userEmail = usuario.email;
    req.session.userRole = usuario.role;

    // Salvar explicitamente a sessão antes de redirecionar
    req.session.save((err) => {
      if (err) {
        console.error('Erro ao salvar sessão:', err);
        return res.render('login', { error: 'Erro de servidor ao iniciar sessão.', success: null });
      }
      res.redirect('/dashboard');
    });

  } catch (error) {
    console.error('Erro no login:', error);
    res.render('login', { error: 'Ocorreu um erro no servidor. Tente novamente.', success: null });
  }
}

async function logout(req, res) {
  req.session.destroy((err) => {
    if (err) {
      console.error('Erro ao destruir sessão:', err);
    }
    res.clearCookie('connect.sid');
    res.redirect('/login');
  });
}

module.exports = {
  renderLogin,
  login,
  logout
};
