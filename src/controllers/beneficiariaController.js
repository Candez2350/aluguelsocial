const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Busca beneficiária por CPF (usado na triagem para preenchimento rápido ou validação)
 */
async function buscarPorCpf(req, res) {
  const { cpf } = req.params;

  if (!cpf) {
    return res.status(400).json({ error: 'CPF é obrigatório.' });
  }

  try {
    const beneficiaria = await prisma.beneficiaria.findUnique({
      where: { cpf },
      include: {
        processos: {
          orderBy: { dataCriacao: 'desc' }
        }
      }
    });

    if (!beneficiaria) {
      return res.status(404).json({ message: 'Cidadã não cadastrada.' });
    }

    res.json(beneficiaria);
  } catch (error) {
    console.error('Erro ao buscar CPF:', error);
    res.status(500).json({ error: 'Erro interno do servidor.' });
  }
}

/**
 * Retorna os detalhes de uma beneficiária específica
 */
async function obterDetalhes(req, res) {
  const { id } = req.params;

  try {
    const beneficiaria = await prisma.beneficiaria.findUnique({
      where: { id },
      include: { processos: true }
    });

    if (!beneficiaria) {
      return res.status(404).json({ error: 'Beneficiária não encontrada.' });
    }

    res.json(beneficiaria);
  } catch (error) {
    console.error('Erro ao obter beneficiária:', error);
    res.status(500).json({ error: 'Erro interno do servidor.' });
  }
}

module.exports = {
  buscarPorCpf,
  obterDetalhes
};
