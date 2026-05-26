const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Calcula a data limite de análise pulando fins de semana se for Fluxo Comum
 * - Simplificado: 72 horas corridas
 * - Comum: 15 dias úteis
 */
function calcularDataLimite(tipoEsteira) {
  const agora = new Date();
  if (tipoEsteira === 'SIMPLIFICADO') {
    const dataLimite = new Date(agora);
    dataLimite.setHours(agora.getHours() + 72); // 72 horas corridas
    return dataLimite;
  } else {
    // 15 dias úteis
    let diasUteisAdicionados = 0;
    const dataLimite = new Date(agora);
    while (diasUteisAdicionados < 15) {
      dataLimite.setDate(dataLimite.getDate() + 1);
      const diaSemana = dataLimite.getDay(); // 0: Domingo, 6: Sábado
      if (diaSemana !== 0 && diaSemana !== 6) {
        diasUteisAdicionados++;
      }
    }
    return dataLimite;
  }
}

/**
 * Verifica se o checklist de documentos do processo está completo e verificado manualmente
 */
async function verificarChecklistCompleto(processoId, tipoEsteira) {
  const documentos = await prisma.documentoChecklist.findMany({
    where: { processoId }
  });

  const tiposObrigatorios = ['RG', 'CPF', 'COMPROVANTE_RESIDENCIA', 'CADUNICO'];
  if (tipoEsteira === 'SIMPLIFICADO') {
    tiposObrigatorios.push('MPU'); // Medida Protetiva de Urgência
  }

  // Verifica se todos os obrigatórios estão presentes e marcados como "verificadoManualmente"
  for (const tipo of tiposObrigatorios) {
    const doc = documentos.find(d => d.tipoDocumento === tipo);
    if (!doc) return { completo: false, mensagem: `Documento obrigatório ausente: ${tipo}` };
    if (!doc.verificadoManualmente) {
      return { completo: false, mensagem: `Documento ${tipo} ainda não foi verificado manualmente pelo operador.` };
    }
  }

  return { completo: true };
}

/**
 * Transiciona o status do processo validando papéis e regras de negócio
 */
async function transicionarStatus(processoId, novoStatus, usuarioId, usuarioRole, dadosExtras = {}) {
  const processo = await prisma.processoAuxilio.findUnique({
    where: { id: processoId },
    include: { beneficiaria: true }
  });

  if (!processo) {
    throw new Error('Processo não encontrado.');
  }

  const statusAnterior = processo.statusAtual;

  // Se já está suspenso ou encerrado, apenas ADMIN pode retirar desse estado
  if ((statusAnterior === 'SUSPENSO' || statusAnterior === 'ENCERRADO') && usuarioRole !== 'ADMIN') {
    throw new Error('Apenas o Administrador pode reativar um processo suspenso ou encerrado.');
  }

  // REGRA DE TRANSIÇÃO
  switch (novoStatus) {
    case 'TRIAGEM':
      // RASCUNHO -> TRIAGEM (Operador Entrada ao finalizar dados básicos)
      if (statusAnterior !== 'RASCUNHO' && statusAnterior !== 'RECURSO' && statusAnterior !== 'SUSPENSO') {
        throw new Error(`Não é possível transicionar de ${statusAnterior} para TRIAGEM.`);
      }
      if (usuarioRole !== 'OPERADOR_ENTRADA' && usuarioRole !== 'ADMIN') {
        throw new Error('Apenas Operadores de Entrada ou Admins podem enviar para Triagem.');
      }
      break;

    case 'ANALISE':
      // TRIAGEM -> ANALISE (Operador inicia análise após checar dados)
      if (statusAnterior !== 'TRIAGEM' && statusAnterior !== 'RASCUNHO') {
        throw new Error(`Não é possível transicionar de ${statusAnterior} para ANALISE.`);
      }
      if (usuarioRole !== 'OPERADOR_ENTRADA' && usuarioRole !== 'ADMIN') {
        throw new Error('Apenas Operadores ou Admins podem iniciar a fase de Análise.');
      }
      // Validar Checklist de Documentos antes de enviar para análise
      const checklist = await verificarChecklistCompleto(processo.id, processo.tipoEsteira);
      if (!checklist.completo) {
        throw new Error(`Checklist incompleto: ${checklist.mensagem}`);
      }
      break;

    case 'APROVADO':
      // ANALISE -> APROVADO
      if (statusAnterior !== 'ANALISE' && statusAnterior !== 'RECURSO') {
        throw new Error(`Não é possível aprovar um processo com status ${statusAnterior}.`);
      }
      
      // Validação baseada no fluxo
      if (processo.tipoEsteira === 'SIMPLIFICADO') {
        if (usuarioRole !== 'ANALISTA_SEDSODH' && usuarioRole !== 'ADMIN') {
          throw new Error('Apenas Analistas SEDSODH ou Admins podem aprovar processos judiciais/simplificados.');
        }
      } else {
        if (usuarioRole !== 'ASSISTENTE_SOCIAL_SUAS' && usuarioRole !== 'ADMIN') {
          throw new Error('Apenas Assistentes Sociais SUAS ou Admins podem aprovar processos comuns.');
        }
        // Exigência de Parecer Social para fluxo comum
        const parecerSocial = dadosExtras.parecerSocial || processo.parecerSocial;
        const parecerTecnico = dadosExtras.parecerTecnico || processo.parecerTecnico;
        if (!parecerSocial || !parecerTecnico) {
          throw new Error('O Parecer Social e o Relatório Técnico Descritivo são obrigatórios para aprovação no Fluxo Comum.');
        }
      }
      break;

    case 'INDEFERIDO':
      // ANALISE -> INDEFERIDO
      if (statusAnterior !== 'ANALISE' && statusAnterior !== 'RECURSO') {
        throw new Error(`Não é possível indeferir um processo com status ${statusAnterior}.`);
      }
      
      if (processo.tipoEsteira === 'SIMPLIFICADO') {
        if (usuarioRole !== 'ANALISTA_SEDSODH' && usuarioRole !== 'ADMIN') {
          throw new Error('Apenas Analistas SEDSODH ou Admins podem indeferir processos judiciais/simplificados.');
        }
      } else {
        if (usuarioRole !== 'ASSISTENTE_SOCIAL_SUAS' && usuarioRole !== 'ADMIN') {
          throw new Error('Apenas Assistentes Sociais SUAS ou Admins podem indeferir processos comuns.');
        }
        const parecerSocial = dadosExtras.parecerSocial || processo.parecerSocial;
        const parecerTecnico = dadosExtras.parecerTecnico || processo.parecerTecnico;
        if (!parecerSocial || !parecerTecnico) {
          throw new Error('O Parecer Social e o Relatório Técnico são obrigatórios para registrar o indeferimento no Fluxo Comum.');
        }
      }
      break;

    case 'RECURSO':
      // APROVADO ou INDEFERIDO -> RECURSO (Cidadã entra com recurso)
      if (statusAnterior !== 'INDEFERIDO' && statusAnterior !== 'APROVADO') {
        throw new Error('Apenas processos julgados (Aprovado/Indeferido) podem entrar em fase de Recurso.');
      }
      if (usuarioRole !== 'OPERADOR_ENTRADA' && usuarioRole !== 'ADMIN') {
        throw new Error('Apenas Operadores de Entrada ou Admins podem registrar a entrada de recursos.');
      }
      break;

    case 'APTO_PAGAMENTO':
      // APROVADO -> APTO_PAGAMENTO (Geração da folha financeira)
      if (statusAnterior !== 'APROVADO') {
        throw new Error('Apenas processos já aprovados podem ser habilitados para Apto para Pagamento.');
      }
      if (usuarioRole !== 'ADMIN' && usuarioRole !== 'GESTOR_SEMPI') {
        throw new Error('Apenas Administradores ou Gestores SEMPI podem marcar processos como Aptos para Pagamento.');
      }
      break;

    case 'SUSPENSO':
    case 'ENCERRADO':
      // Qualquer status pode ser suspenso/encerrado por Administradores
      if (usuarioRole !== 'ADMIN') {
        throw new Error('Apenas o Administrador do sistema pode suspender ou encerrar processos.');
      }
      break;

    default:
      throw new Error(`Status de destino '${novoStatus}' inválido.`);
  }

  // Prepara dados de atualização
  const updateData = {
    statusAtual: novoStatus
  };

  if (dadosExtras.parecerSocial !== undefined) {
    updateData.parecerSocial = dadosExtras.parecerSocial;
  }
  if (dadosExtras.parecerTecnico !== undefined) {
    updateData.parecerTecnico = dadosExtras.parecerTecnico;
  }

  // Realiza a transição no banco
  return prisma.processoAuxilio.update({
    where: { id: processoId },
    data: updateData,
    include: { beneficiaria: true }
  });
}

/**
 * Criação completa do Processo de Auxílio e cadastro da Beneficiária
 */
async function criarProcessoCompleto({
  nome,
  cpf,
  nisCadunico,
  rendaPerCapitaDigitada,
  dadosBancariosManuais,
  bairro,
  cidade,
  dataNascimento,
  telefone,
  numeroProcessoSei,
  temMPU, // boolean indicating if MPU is manually verified/uploaded
  operadorId
}) {
  // 1. Validar se a beneficiária já existe pelo CPF
  let beneficiaria = await prisma.beneficiaria.findUnique({ where: { cpf } });

  if (beneficiaria) {
    // Se já existe beneficiária com processo ativo, lançar erro
    const processoAtivo = await prisma.processoAuxilio.findFirst({
      where: {
        beneficiariaId: beneficiaria.id,
        statusAtual: {
          notIn: ['ENCERRADO', 'SUSPENSO', 'INDEFERIDO']
        }
      }
    });

    if (processoAtivo) {
      throw new Error(`Esta cidadã já possui um processo ativo no sistema (Nº ${processoAtivo.numeroProcessoSei}) com status ${processoAtivo.statusAtual}.`);
    }
  } else {
    // Cadastrar beneficiária
    beneficiaria = await prisma.beneficiaria.create({
      data: {
        nome,
        cpf,
        nisCadunico,
        rendaPerCapitaDigitada: parseFloat(rendaPerCapitaDigitada),
        dadosBancariosManuais: JSON.stringify(dadosBancariosManuais),
        bairro,
        cidade,
        dataNascimento: new Date(dataNascimento),
        telefone,
        apiOrigemDados: false
      }
    });
  }

  // 2. Determinar tipo de esteira com base nos dados de MPU
  const tipoEsteira = temMPU ? 'SIMPLIFICADO' : 'COMUM';

  // 3. Calcular SLA da esteira correspondente
  const dataLimiteAnalise = calcularDataLimite(tipoEsteira);

  // 4. Criar Processo de Auxílio em status RASCUNHO
  const processo = await prisma.processoAuxilio.create({
    data: {
      numeroProcessoSei,
      beneficiariaId: beneficiaria.id,
      tipoEsteira,
      statusAtual: 'RASCUNHO', // Inicializa como Rascunho
      dataLimiteAnalise,
      operadorResponsavelId: operadorId
    }
  });

  // 5. Gerar registros de Checklist em branco para upload manual
  const tiposDocs = ['RG', 'CPF', 'COMPROVANTE_RESIDENCIA', 'CADUNICO'];
  if (tipoEsteira === 'SIMPLIFICADO') {
    tiposDocs.push('MPU');
  }

  for (const tipo of tiposDocs) {
    await prisma.documentoChecklist.create({
      data: {
        processoId: processo.id,
        tipoDocumento: tipo,
        arquivoStorageUrl: '', // Aguardando upload
        verificadoManualmente: false,
        ocrProcessado: false
      }
    });
  }

  return prisma.processoAuxilio.findUnique({
    where: { id: processo.id },
    include: { beneficiaria: true, documentos: true }
  });
}

/**
 * Edição completa do Processo de Auxílio e dos dados da Beneficiária
 */
async function editarProcessoCompleto(processoId, dados) {
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
  } = dados;

  // 1. Buscar o processo com seus relacionamentos
  const processo = await prisma.processoAuxilio.findUnique({
    where: { id: processoId },
    include: { beneficiaria: true, documentos: true }
  });

  if (!processo) {
    throw new Error('Processo não encontrado.');
  }

  // 2. Bloquear edição se o status do processo não for Rascunho, Recurso, Suspenso ou Triagem
  const statusPermitidos = ['RASCUNHO', 'RECURSO', 'SUSPENSO', 'TRIAGEM'];
  if (!statusPermitidos.includes(processo.statusAtual)) {
    throw new Error(`Não é possível editar este processo com status ${processo.statusAtual}. A edição é permitida apenas para processos em Rascunho, Recurso, Suspenso ou Triagem.`);
  }

  // 3. Validar se o CPF alterado pertence a outra beneficiaria
  const beneficiariaComCpf = await prisma.beneficiaria.findUnique({ where: { cpf } });
  if (beneficiariaComCpf && beneficiariaComCpf.id !== processo.beneficiariaId) {
    // Se o CPF já existe em outra cidadã, verificar se essa cidadã tem processo ativo
    const processoAtivo = await prisma.processoAuxilio.findFirst({
      where: {
        beneficiariaId: beneficiariaComCpf.id,
        statusAtual: {
          notIn: ['ENCERRADO', 'SUSPENSO', 'INDEFERIDO']
        }
      }
    });

    if (processoAtivo) {
      throw new Error(`Esta cidadã (CPF: ${cpf}) já possui um processo ativo no sistema (Nº ${processoAtivo.numeroProcessoSei}) com status ${processoAtivo.statusAtual}.`);
    }
  }

  // 4. Validar se o número do processo SEI alterado já existe em outro processo
  const processoComSei = await prisma.processoAuxilio.findUnique({ where: { numeroProcessoSei } });
  if (processoComSei && processoComSei.id !== processoId) {
    throw new Error(`O número do processo SEI ${numeroProcessoSei} já está cadastrado em outro processo.`);
  }

  // 5. Atualizar Beneficiária
  const dadosBancarios = { banco, agencia, conta };
  await prisma.beneficiaria.update({
    where: { id: processo.beneficiariaId },
    data: {
      nome,
      cpf,
      nisCadunico,
      rendaPerCapitaDigitada: parseFloat(rendaPerCapitaDigitada),
      dadosBancariosManuais: JSON.stringify(dadosBancarios),
      bairro,
      cidade,
      dataNascimento: new Date(dataNascimento),
      telefone
    }
  });

  // 6. Atualizar Processo (SEI e Esteira/SLA se MPU mudar)
  const isSimplificado = temMPU === 'on' || temMPU === true;
  const novoTipoEsteira = isSimplificado ? 'SIMPLIFICADO' : 'COMUM';

  const updateProcessoData = {
    numeroProcessoSei
  };

  if (novoTipoEsteira !== processo.tipoEsteira) {
    updateProcessoData.tipoEsteira = novoTipoEsteira;
    updateProcessoData.dataLimiteAnalise = calcularDataLimite(novoTipoEsteira);

    if (novoTipoEsteira === 'SIMPLIFICADO') {
      // Garantir documento MPU
      const temDocMpu = processo.documentos.some(d => d.tipoDocumento === 'MPU');
      if (!temDocMpu) {
        await prisma.documentoChecklist.create({
          data: {
            processoId: processo.id,
            tipoDocumento: 'MPU',
            arquivoStorageUrl: '',
            verificadoManualmente: false,
            ocrProcessado: false
          }
        });
      }
    } else {
      // Remover documento MPU se existir
      await prisma.documentoChecklist.deleteMany({
        where: {
          processoId: processo.id,
          tipoDocumento: 'MPU'
        }
      });
    }
  }

  return prisma.processoAuxilio.update({
    where: { id: processoId },
    data: updateProcessoData,
    include: { beneficiaria: true, documentos: true }
  });
}

module.exports = {
  calcularDataLimite,
  verificarChecklistCompleto,
  transicionarStatus,
  criarProcessoCompleto,
  editarProcessoCompleto
};
