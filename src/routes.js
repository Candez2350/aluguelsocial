const express = require('express');
const router = express.Router();

const authController = require('./controllers/authController');
const beneficiariaController = require('./controllers/beneficiariaController');
const processoController = require('./controllers/processoController');
const configController = require('./controllers/configController');
const relatorioController = require('./controllers/relatorioController');

const { requireAuth, requireRoles } = require('./middlewares/auth');

// --- ROTAS DE AUTENTICAÇÃO E PÁGINAS ---
router.get('/', (req, res) => res.redirect('/login'));
router.get('/login', authController.renderLogin);
router.post('/login', authController.login);
router.get('/logout', authController.logout);

// O dashboard carrega dinamicamente a view com base no perfil do usuário logado
router.get('/dashboard', requireAuth, processoController.renderDashboard);

// --- ROTAS DO ADMINISTRADOR GERAL (ISOLAMENTO POR ROTA) ---
router.get('/admin/processos', requireAuth, requireRoles('ADMIN'), processoController.renderAdminProcessos);
router.get('/admin/usuarios', requireAuth, requireRoles('ADMIN'), processoController.renderAdminUsuarios);
router.get('/admin/parametros', requireAuth, requireRoles('ADMIN'), processoController.renderAdminParametros);

// --- API: BENEFICIÁRIAS ---
router.get('/api/beneficiarias/cpf/:cpf', requireAuth, beneficiariaController.buscarPorCpf);
router.get('/api/beneficiarias/:id', requireAuth, beneficiariaController.obterDetalhes);

// --- API: PROCESSOS ---
router.post('/api/processos', requireAuth, requireRoles('OPERADOR_ENTRADA', 'ADMIN'), processoController.criarProcesso);
router.post('/api/processos/:id/status', requireAuth, processoController.atualizarStatus);
router.post('/api/processos/:id/editar', requireAuth, requireRoles('OPERADOR_ENTRADA', 'ADMIN'), processoController.editarProcesso);
router.post('/api/processos/:id/parecer', requireAuth, requireRoles('ASSISTENTE_SOCIAL_SUAS', 'ADMIN'), processoController.salvarParecerRascunho);

// --- API: DOCUMENTOS CHECKLIST ---
router.post('/api/documentos/:id', requireAuth, requireRoles('OPERADOR_ENTRADA', 'ADMIN'), processoController.gerenciarDocumento);

// --- API: CONFIGURAÇÕES E USUÁRIOS (ADMIN APENAS) ---
router.post('/api/config/valor', requireAuth, requireRoles('ADMIN'), configController.atualizarValorBeneficio);
router.get('/api/config/usuarios', requireAuth, requireRoles('ADMIN'), configController.listarUsuarios);
router.post('/api/config/usuarios', requireAuth, requireRoles('ADMIN'), configController.criarUsuario);
router.delete('/api/config/usuarios/:id', requireAuth, requireRoles('ADMIN'), configController.deletarUsuario);

// --- API: RELATÓRIOS E ESTATÍSTICAS ---
router.get('/api/relatorios/estatisticas', requireAuth, requireRoles('GESTOR_SEMPI', 'ADMIN'), relatorioController.obterDadosRelatorio);

module.exports = router;
