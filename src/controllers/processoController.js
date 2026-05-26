const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const processoService = require('../services/processoService');

/**
 * Renderiza o dashboard dinâmico de acordo com a role do usuário logado
 */
async function renderDashboard(req, res) {
  const { userRole, userNome } = req.session;

  if (userRole === 'ADMIN') {
    return res.redirect('/admin/processos');
  }

  try {
    // Configurações Globais (como valor base)
    const configValorBase = await prisma.configuracao.findUnique({
      where: { chave: 'valor_base_beneficio' }
    });
    const valorBase = configValorBase ? parseFloat(configValorBase.valor) : 600.00;

    // Buscar estatísticas básicas para exibir no topo dos dashboards
    const estatisticas = {
      total: await prisma.processoAuxilio.count(),
      analise: await prisma.processoAuxilio.count({ where: { statusAtual: 'ANALISE' } }),
      aprovado: await prisma.processoAuxilio.count({ where: { statusAtual: 'APROVADO' } }),
      indeferido: await prisma.processoAuxilio.count({ where: { statusAtual: 'INDEFERIDO' } }),
      aptoPagamento: await prisma.processoAuxilio.count({ where: { statusAtual: 'APTO_PAGAMENTO' } }),
      simplificado: await prisma.processoAuxilio.count({ where: { tipoEsteira: 'SIMPLIFICADO' } }),
      comum: await prisma.processoAuxilio.count({ where: { tipoEsteira: 'COMUM' } })
    };

    // Obter lista de processos de acordo com a Role
    let processos = [];

    if (userRole === 'ADMIN' || userRole === 'GESTOR_SEMPI') {
      processos = await prisma.processoAuxilio.findMany({
        include: { beneficiaria: true, documentos: true },
        orderBy: { dataCriacao: 'desc' }
      });
    } else if (userRole === 'OPERADOR_ENTRADA') {
      // Operador vê tudo, com foco no que cadastrou ou precisa de documentos
      processos = await prisma.processoAuxilio.findMany({
        include: { beneficiaria: true, documentos: true },
        orderBy: { dataCriacao: 'desc' }
      });
    } else if (userRole === 'ANALISTA_SEDSODH') {
      // Analista vê toda a fila de processos (Simplificado e Comum) ativos e tramitados
      processos = await prisma.processoAuxilio.findMany({
        include: { 
          beneficiaria: true, 
          documentos: true,
          operadorResponsavel: {
            select: { nome: true, email: true }
          }
        },
        orderBy: { dataLimiteAnalise: 'asc' } // Fila com prioridade de SLA (mais urgentes primeiro)
      });
    } else if (userRole === 'ASSISTENTE_SOCIAL_SUAS') {
      // Assistente Social vê toda a fila de processos comuns (ativos e tramitados)
      processos = await prisma.processoAuxilio.findMany({
        where: {
          tipoEsteira: 'COMUM'
        },
        include: { 
          beneficiaria: true, 
          documentos: true,
          operadorResponsavel: {
            select: { nome: true, email: true }
          }
        },
        orderBy: { dataLimiteAnalise: 'asc' } // Ordenado por SLA
      });
    }

    // Renderiza a view modular específica
    const viewName = `dashboard/${userRole.toLowerCase()}`;
    
    res.render(viewName, {
      session: req.session,
      processos,
      estatisticas,
      valorBase,
      error: null,
      success: null
    });

  } catch (error) {
    console.error('Erro ao renderizar Dashboard:', error);
    res.status(500).render('error', {
      message: 'Erro ao carregar Dashboard',
      description: 'Ocorreu um erro ao recuperar as informações do banco de dados.',
      session: req.session
    });
  }
}

/**
 * Criação de uma nova candidata e seu respectivo processo
 */
async function criarProcesso(req, res) {
  const {
    nome,
    cpf,
    nisCadunico,
    rendaPerCapitaDigitada,
    bairro,
    cidade,
    dataNascimento,
    telefone,
    numeroProcessoSei,
    banco,
    agencia,
    conta,
    temMPU
  } = req.body;

  try {
    const dadosBancarios = { banco, agencia, conta };

    await processoService.criarProcessoCompleto({
      nome,
      cpf,
      nisCadunico,
      rendaPerCapitaDigitada,
      dadosBancariosManuais: dadosBancarios,
      bairro,
      cidade,
      dataNascimento,
      telefone,
      numeroProcessoSei,
      temMPU: temMPU === 'on' || temMPU === true,
      operadorId: req.session.userId
    });

    // Se a chamada for via AJAX, responder JSON
    if (req.xhr) {
      return res.json({ success: true, message: 'Processo e beneficiária cadastrados com sucesso!' });
    }

    res.redirect('/dashboard');
  } catch (error) {
    console.error('Erro ao criar processo:', error);
    if (req.xhr) {
      return res.status(400).json({ error: error.message });
    }
    
    // Obter dados novamente para renderizar a view com erro
    return res.status(400).render('dashboard/operador_entrada', {
      session: req.session,
      error: error.message,
      success: null
    });
  }
}

/**
 * Atualiza o status de um processo (Maquina de Estados)
 */
async function atualizarStatus(req, res) {
  const { id } = req.params;
  const { status, parecerSocial, parecerTecnico } = req.body;

  try {
    const processoAtualizado = await processoService.transicionarStatus(
      id,
      status,
      req.session.userId,
      req.session.userRole,
      { parecerSocial, parecerTecnico }
    );

    if (req.xhr || req.headers.accept.includes('application/json')) {
      return res.json({
        success: true,
        message: `Processo atualizado para ${status} com sucesso!`,
        processo: processoAtualizado
      });
    }

    res.redirect('/dashboard');
  } catch (error) {
    console.error('Erro ao atualizar status:', error);
    if (req.xhr || req.headers.accept.includes('application/json')) {
      return res.status(400).json({ error: error.message });
    }
    
    res.status(400).render('error', {
      message: 'Erro na Transição de Status',
      description: error.message,
      session: req.session
    });
  }
}

/**
 * Simula o upload manual e verificação física de documentos pelo checklist
 */
async function gerenciarDocumento(req, res) {
  const { id: documentoId } = req.params;
  const { verificado } = req.body; // boolean

  try {
    const vManualmente = verificado === 'true' || verificado === true;

    // Atualizar o documento no banco
    const doc = await prisma.documentoChecklist.update({
      where: { id: documentoId },
      data: {
        verificadoManualmente: vManualmente,
        ocrProcessado: true, // Simula o OCR como concluído ao validar manualmente
        arquivoStorageUrl: vManualmente ? `/uploads/doc_${documentoId}.pdf` : ''
      },
      include: {
        processo: {
          include: { documentos: true }
        }
      }
    });

    res.json({
      success: true,
      message: `Documento ${doc.tipoDocumento} atualizado com sucesso!`,
      documento: doc
    });
  } catch (error) {
    console.error('Erro ao gerenciar documento:', error);
    res.status(500).json({ error: 'Erro ao processar verificação do documento.' });
  }
}

/**
 * Edição de processo e beneficiária (Operador de Entrada / Admin)
 */
async function editarProcesso(req, res) {
  const { id } = req.params;
  const {
    nome,
    cpf,
    nisCadunico,
    rendaPerCapitaDigitada,
    bairro,
    cidade,
    dataNascimento,
    telefone,
    numeroProcessoSei,
    banco,
    agencia,
    conta,
    temMPU
  } = req.body;

  try {
    const processoAtualizado = await processoService.editarProcessoCompleto(id, {
      nome,
      cpf,
      nisCadunico,
      rendaPerCapitaDigitada,
      bairro,
      cidade,
      dataNascimento,
      telefone,
      numeroProcessoSei,
      banco,
      agencia,
      conta,
      temMPU: temMPU === 'on' || temMPU === true
    });

    res.json({
      success: true,
      message: 'Processo e beneficiária atualizados com sucesso!',
      processo: processoAtualizado
    });
  } catch (error) {
    console.error('Erro ao editar processo:', error);
    res.status(400).json({ error: error.message });
  }
}

/**
 * Salvar rascunho de parecer do Assistente Social
 */
async function salvarParecerRascunho(req, res) {
  const { id } = req.params;
  const { parecerSocial, parecerTecnico } = req.body;

  try {
    const processo = await prisma.processoAuxilio.findUnique({
      where: { id },
      include: { beneficiaria: true }
    });

    if (!processo) {
      return res.status(404).json({ error: 'Processo não encontrado.' });
    }

    if (processo.tipoEsteira !== 'COMUM') {
      return res.status(400).json({ error: 'Este processo não pertence à esteira Comum.' });
    }

    const parecerAusente = !processo.parecerSocial || processo.parecerSocial.trim() === '';
    if (['APROVADO', 'INDEFERIDO', 'APTO_PAGAMENTO', 'SUSPENSO', 'ENCERRADO'].includes(processo.statusAtual) && !parecerAusente) {
      return res.status(400).json({ error: 'Não é possível editar o parecer de um processo já finalizado.' });
    }

    const processoAtualizado = await prisma.processoAuxilio.update({
      where: { id },
      data: {
        parecerSocial,
        parecerTecnico
      },
      include: { beneficiaria: true }
    });

    res.json({
      success: true,
      message: 'Rascunho do parecer salvo com sucesso!',
      processo: processoAtualizado
    });
  } catch (error) {
    console.error('Erro ao salvar rascunho de parecer:', error);
    res.status(400).json({ error: error.message });
  }
}

async function renderAdminProcessos(req, res) {
  try {
    const configValorBase = await prisma.configuracao.findUnique({
      where: { chave: 'valor_base_beneficio' }
    });
    const valorBase = configValorBase ? parseFloat(configValorBase.valor) : 600.00;

    const estatisticas = {
      total: await prisma.processoAuxilio.count(),
      analise: await prisma.processoAuxilio.count({ where: { statusAtual: 'ANALISE' } }),
      aprovado: await prisma.processoAuxilio.count({ where: { statusAtual: 'APROVADO' } }),
      indeferido: await prisma.processoAuxilio.count({ where: { statusAtual: 'INDEFERIDO' } }),
      aptoPagamento: await prisma.processoAuxilio.count({ where: { statusAtual: 'APTO_PAGAMENTO' } }),
      simplificado: await prisma.processoAuxilio.count({ where: { tipoEsteira: 'SIMPLIFICADO' } }),
      comum: await prisma.processoAuxilio.count({ where: { tipoEsteira: 'COMUM' } })
    };

    const processos = await prisma.processoAuxilio.findMany({
      include: { beneficiaria: true, documentos: true },
      orderBy: { dataCriacao: 'desc' }
    });

    res.render('dashboard/admin', {
      session: req.session,
      processos,
      estatisticas,
      valorBase,
      activeRoute: 'processos',
      error: null,
      success: null
    });
  } catch (error) {
    console.error('Erro ao renderizar admin/processos:', error);
    res.status(500).render('error', {
      message: 'Erro ao carregar Dashboard Admin',
      description: 'Ocorreu um erro ao recuperar as informações do banco de dados.',
      session: req.session
    });
  }
}

async function renderAdminUsuarios(req, res) {
  try {
    const configValorBase = await prisma.configuracao.findUnique({
      where: { chave: 'valor_base_beneficio' }
    });
    const valorBase = configValorBase ? parseFloat(configValorBase.valor) : 600.00;

    const estatisticas = {
      total: await prisma.processoAuxilio.count(),
      analise: await prisma.processoAuxilio.count({ where: { statusAtual: 'ANALISE' } }),
      aprovado: await prisma.processoAuxilio.count({ where: { statusAtual: 'APROVADO' } }),
      indeferido: await prisma.processoAuxilio.count({ where: { statusAtual: 'INDEFERIDO' } }),
      aptoPagamento: await prisma.processoAuxilio.count({ where: { statusAtual: 'APTO_PAGAMENTO' } }),
      simplificado: await prisma.processoAuxilio.count({ where: { tipoEsteira: 'SIMPLIFICADO' } }),
      comum: await prisma.processoAuxilio.count({ where: { tipoEsteira: 'COMUM' } })
    };

    const processos = await prisma.processoAuxilio.findMany({
      include: { beneficiaria: true, documentos: true },
      orderBy: { dataCriacao: 'desc' }
    });

    res.render('dashboard/admin', {
      session: req.session,
      processos,
      estatisticas,
      valorBase,
      activeRoute: 'usuarios',
      error: null,
      success: null
    });
  } catch (error) {
    console.error('Erro ao renderizar admin/usuarios:', error);
    res.status(500).render('error', {
      message: 'Erro ao carregar Dashboard Admin',
      description: 'Ocorreu um erro ao recuperar as informações do banco de dados.',
      session: req.session
    });
  }
}

async function renderAdminParametros(req, res) {
  try {
    const configValorBase = await prisma.configuracao.findUnique({
      where: { chave: 'valor_base_beneficio' }
    });
    const valorBase = configValorBase ? parseFloat(configValorBase.valor) : 600.00;

    const estatisticas = {
      total: await prisma.processoAuxilio.count(),
      analise: await prisma.processoAuxilio.count({ where: { statusAtual: 'ANALISE' } }),
      aprovado: await prisma.processoAuxilio.count({ where: { statusAtual: 'APROVADO' } }),
      indeferido: await prisma.processoAuxilio.count({ where: { statusAtual: 'INDEFERIDO' } }),
      aptoPagamento: await prisma.processoAuxilio.count({ where: { statusAtual: 'APTO_PAGAMENTO' } }),
      simplificado: await prisma.processoAuxilio.count({ where: { tipoEsteira: 'SIMPLIFICADO' } }),
      comum: await prisma.processoAuxilio.count({ where: { tipoEsteira: 'COMUM' } })
    };

    const processos = await prisma.processoAuxilio.findMany({
      include: { beneficiaria: true, documentos: true },
      orderBy: { dataCriacao: 'desc' }
    });

    res.render('dashboard/admin', {
      session: req.session,
      processos,
      estatisticas,
      valorBase,
      activeRoute: 'parametros',
      error: null,
      success: null
    });
  } catch (error) {
    console.error('Erro ao renderizar admin/parametros:', error);
    res.status(500).render('error', {
      message: 'Erro ao carregar Dashboard Admin',
      description: 'Ocorreu um erro ao recuperar as informações do banco de dados.',
      session: req.session
    });
  }
}

module.exports = {
  renderDashboard,
  renderAdminProcessos,
  renderAdminUsuarios,
  renderAdminParametros,
  criarProcesso,
  atualizarStatus,
  gerenciarDocumento,
  editarProcesso,
  salvarParecerRascunho
};
