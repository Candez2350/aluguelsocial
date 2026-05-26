/**
 * Middleware para proteger rotas e validar perfis de usuário (roles)
 */

function requireAuth(req, res, next) {
  if (!req.session || !req.session.userId) {
    if (req.xhr || req.path.startsWith('/api/')) {
      return res.status(401).json({ error: 'Não autenticado. Por favor, faça login.' });
    }
    return res.redirect('/login');
  }
  next();
}

function requireRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.session || !req.session.userId) {
      if (req.xhr || req.path.startsWith('/api/')) {
        return res.status(401).json({ error: 'Não autenticado.' });
      }
      return res.redirect('/login');
    }

    const { userRole } = req.session;
    if (!allowedRoles.includes(userRole)) {
      if (req.xhr || req.path.startsWith('/api/')) {
        return res.status(403).json({ error: 'Acesso negado. Perfil não autorizado.' });
      }
      return res.status(403).render('error', {
        message: 'Acesso Negado',
        description: `O seu perfil (${userRole}) não tem permissão para acessar esta área.`,
        session: req.session
      });
    }
    next();
  };
}

module.exports = {
  requireAuth,
  requireRoles
};
