const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Fornece dados estatísticos consolidados para o Gestor SEMPI e outros dashboards
 */
async function obterDadosRelatorio(req, res) {
  try {
    // 1. Distribuição por Bairro
    const bairrosRaw = await prisma.beneficiaria.groupBy({
      by: ['bairro'],
      _count: {
        id: true
      }
    });

    const distribuicaoBairro = bairrosRaw.map(b => ({
      bairro: b.bairro || 'Não Informado',
      quantidade: b._count.id
    })).sort((a, b) => b.quantidade - a.quantidade);

    // 2. Distribuição por Faixa Etária
    const beneficiarias = await prisma.beneficiaria.findMany({
      select: { dataNascimento: true }
    });

    const hoje = new Date();
    const faixasEtarias = {
      '18 a 25 anos': 0,
      '26 a 35 anos': 0,
      '36 a 50 anos': 0,
      'Mais de 50': 0
    };

    beneficiarias.forEach(b => {
      const nasc = new Date(b.dataNascimento);
      let idade = hoje.getFullYear() - nasc.getFullYear();
      const m = hoje.getMonth() - nasc.getMonth();
      if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) {
        idade--;
      }

      if (idade <= 25) faixasEtarias['18 a 25 anos']++;
      else if (idade <= 35) faixasEtarias['26 a 35 anos']++;
      else if (idade <= 50) faixasEtarias['36 a 50 anos']++;
      else faixasEtarias['Mais de 50']++;
    });

    const distribuicaoIdade = Object.keys(faixasEtarias).map(faixa => ({
      faixa,
      quantidade: faixasEtarias[faixa]
    }));

    // 3. Distribuição por Esteira de Processo
    const esteirasRaw = await prisma.processoAuxilio.groupBy({
      by: ['tipoEsteira'],
      _count: {
        id: true
      }
    });

    const distribuicaoEsteira = esteirasRaw.map(e => ({
      esteira: e.tipoEsteira,
      quantidade: e._count.id
    }));

    // 4. Ingressos de processos nos últimos meses
    const ingressos = await prisma.processoAuxilio.findMany({
      select: { dataCriacao: true },
      orderBy: { dataCriacao: 'asc' }
    });

    const evolucaoMensal = {};
    ingressos.forEach(p => {
      const data = new Date(p.dataCriacao);
      const chaveMes = data.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
      evolucaoMensal[chaveMes] = (evolucaoMensal[chaveMes] || 0) + 1;
    });

    const distribuicaoMensal = Object.keys(evolucaoMensal).map(mes => ({
      mes,
      quantidade: evolucaoMensal[mes]
    }));

    res.json({
      distribuicaoBairro,
      distribuicaoIdade,
      distribuicaoEsteira,
      distribuicaoMensal
    });

  } catch (error) {
    console.error('Erro ao buscar dados do relatório:', error);
    res.status(500).json({ error: 'Erro interno do servidor ao processar estatísticas.' });
  }
}

module.exports = {
  obterDadosRelatorio
};
