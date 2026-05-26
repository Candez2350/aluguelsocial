const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

/**
 * Atualiza o valor base do benefício (Apenas ADMIN)
 */
async function atualizarValorBeneficio(req, res) {
  const { valor } = req.body;

  if (!valor || isNaN(parseFloat(valor))) {
    return res.status(400).json({ error: 'Valor do benefício inválido.' });
  }

  try {
    const valBrl = parseFloat(valor).toFixed(2);

    await prisma.configuracao.upsert({
      where: { chave: 'valor_base_beneficio' },
      update: { valor: valBrl },
      create: {
        chave: 'valor_base_beneficio',
        valor: valBrl
      }
    });

    res.json({ success: true, message: `Valor base do benefício atualizado para R$ ${valBrl} com sucesso!` });
  } catch (error) {
    console.error('Erro ao atualizar valor base:', error);
    res.status(500).json({ error: 'Erro interno do servidor.' });
  }
}

/**
 * Lista todos os usuários do sistema (Apenas ADMIN)
 */
async function listarUsuarios(req, res) {
  try {
    const usuarios = await prisma.usuario.findMany({
      select: {
        id: true,
        nome: true,
        email: true,
        role: true,
        dataCriacao: true
      },
      orderBy: { nome: 'asc' }
    });

    res.json(usuarios);
  } catch (error) {
    console.error('Erro ao listar usuários:', error);
    res.status(500).json({ error: 'Erro interno do servidor.' });
  }
}

/**
 * Cria um novo operador/analista/gestor no sistema (Apenas ADMIN)
 */
async function criarUsuario(req, res) {
  const { nome, email, senha, role } = req.body;

  if (!nome || !email || !senha || !role) {
    return res.status(400).json({ error: 'Todos os campos são obrigatórios.' });
  }

  const validRoles = ['ADMIN', 'OPERADOR_ENTRADA', 'ANALISTA_SEDSODH', 'ASSISTENTE_SOCIAL_SUAS', 'GESTOR_SEMPI'];
  if (!validRoles.includes(role)) {
    return res.status(400).json({ error: 'Perfil de usuário inválido.' });
  }

  try {
    // Verificar se o e-mail já existe
    const usuarioExistente = await prisma.usuario.findUnique({
      where: { email }
    });

    if (usuarioExistente) {
      return res.status(400).json({ error: 'E-mail de usuário já cadastrado.' });
    }

    const salt = await bcrypt.genSalt(10);
    const senhaHash = await bcrypt.hash(senha, salt);

    const novoUsuario = await prisma.usuario.create({
      data: {
        nome,
        email,
        senhaHash,
        role
      },
      select: {
        id: true,
        nome: true,
        email: true,
        role: true
      }
    });

    res.json({ success: true, message: `Usuário ${novoUsuario.nome} cadastrado com sucesso!`, usuario: novoUsuario });
  } catch (error) {
    console.error('Erro ao criar usuário:', error);
    res.status(500).json({ error: 'Erro interno do servidor.' });
  }
}

/**
 * Remove um usuário do sistema (Apenas ADMIN)
 */
async function deletarUsuario(req, res) {
  const { id } = req.params;

  if (id === req.session.userId) {
    return res.status(400).json({ error: 'Você não pode excluir o seu próprio usuário.' });
  }

  try {
    await prisma.usuario.delete({
      where: { id }
    });

    res.json({ success: true, message: 'Usuário excluído com sucesso!' });
  } catch (error) {
    console.error('Erro ao deletar usuário:', error);
    res.status(500).json({ error: 'Não foi possível excluir o usuário (pode haver registros vinculados).' });
  }
}

module.exports = {
  atualizarValorBeneficio,
  listarUsuarios,
  criarUsuario,
  deletarUsuario
};
