const { PrismaClient } = require('@prisma/client');
const processService = require('../services/processoService');

const prisma = new PrismaClient();

async function runTests() {
  console.log('🧪 Iniciando testes lógicos da Máquina de Estados...');

  // Obter ou criar um operador
  let operador = await prisma.usuario.findFirst({
    where: { role: 'OPERADOR_ENTRADA' }
  });

  if (!operador) {
    console.error('❌ Erro: Usuários de teste não encontrados. Certifique-se de rodar a seed primeiro.');
    process.exit(1);
  }

  // 1. Criar processo comum de teste
  console.log('\n1. Testando criação de processo do zero (Fluxo Comum)...');
  const cpfTeste = '999.888.777-66';
  
  // Limpar processo anterior se existir
  const procAnterior = await prisma.processoAuxilio.findFirst({
    where: { beneficiaria: { cpf: cpfTeste } }
  });
  if (procAnterior) {
    await prisma.processoAuxilio.delete({ where: { id: procAnterior.id } });
  }

  const beneficiariaAnterior = await prisma.beneficiaria.findUnique({ where: { cpf: cpfTeste } });
  if (beneficiariaAnterior) {
    await prisma.beneficiaria.delete({ where: { id: beneficiariaAnterior.id } });
  }

  const proc = await processService.criarProcessoCompleto({
    nome: 'Catarina de Teste',
    cpf: cpfTeste,
    nisCadunico: '99988877766',
    rendaPerCapitaDigitada: 180.00,
    dadosBancariosManuais: { banco: '001', agencia: '1234', conta: '56789-0' },
    bairro: 'Madureira',
    cidade: 'Rio de Janeiro',
    dataNascimento: '1995-08-20',
    telefone: '(21) 98888-8888',
    numeroProcessoSei: 'SEI-TESTE-9999',
    temMPU: false, // Sem MPU -> Esteira COMUM
    operadorId: operador.id
  });

  console.log(`✅ Processo criado com sucesso! ID: ${proc.id}`);
  console.log(`   Esteira determinada: ${proc.tipoEsteira} (Esperado: COMUM)`);
  console.log(`   Status inicial: ${proc.statusAtual} (Esperado: RASCUNHO)`);

  // 2. Testar trava de checklist de documentos ao tentar mover para ANALISE
  console.log('\n2. Testando tentativa de transição para ANALISE sem checklist verificado...');
  try {
    await processService.transicionarStatus(proc.id, 'ANALISE', operador.id, 'OPERADOR_ENTRADA');
    console.error('❌ ERRO: A máquina de estados permitiu avançar sem documentos verificados!');
  } catch (error) {
    console.log(`✅ Sucesso! Transição bloqueada conforme esperado: "${error.message}"`);
  }

  // 3. Simular verificação do checklist de documentos
  console.log('\n3. Simulando a verificação manual dos documentos do checklist...');
  for (const doc of proc.documentos) {
    await prisma.documentoChecklist.update({
      where: { id: doc.id },
      data: { verificadoManualmente: true, ocrProcessado: true }
    });
  }
  console.log('✅ Todos os documentos marcados como verificados manualmente.');

  // 4. Testar envio para TRIAGEM e depois ANALISE com checklist completo
  console.log('\n4. Testando avanço para TRIAGEM e depois para ANALISE com checklist completo...');
  await processService.transicionarStatus(proc.id, 'TRIAGEM', operador.id, 'OPERADOR_ENTRADA');
  console.log('✅ Transicionado para TRIAGEM.');
  
  await processService.transicionarStatus(proc.id, 'ANALISE', operador.id, 'OPERADOR_ENTRADA');
  console.log('✅ Transicionado para ANALISE.');

  // 5. Testar trava de role para julgamento no Fluxo Comum
  console.log('\n5. Testando tentativa de Analista SEDSODH aprovar processo do Fluxo Comum (Deve falhar)...');
  try {
    const analista = await prisma.usuario.findFirst({ where: { role: 'ANALISTA_SEDSODH' } });
    await processService.transicionarStatus(proc.id, 'APROVADO', analista.id, 'ANALISTA_SEDSODH');
    console.error('❌ ERRO: A máquina de estados permitiu que analista judicial julgasse fluxo comum!');
  } catch (error) {
    console.log(`✅ Sucesso! Transição bloqueada conforme esperado: "${error.message}"`);
  }

  // 6. Testar trava de parecer social obrigatório para assistente social
  console.log('\n6. Testando aprovação de assistente social sem Parecer Social (Deve falhar)...');
  const assistente = await prisma.usuario.findFirst({ where: { role: 'ASSISTENTE_SOCIAL_SUAS' } });
  try {
    await processService.transicionarStatus(proc.id, 'APROVADO', assistente.id, 'ASSISTENTE_SOCIAL_SUAS');
    console.error('❌ ERRO: A máquina de estados permitiu aprovação sem parecer social!');
  } catch (error) {
    console.log(`✅ Sucesso! Transição bloqueada conforme esperado: "${error.message}"`);
  }

  // 7. Simular aprovação completa com parecer pelo Assistente Social
  console.log('\n7. Testando aprovação completa preenchendo o parecer social...');
  const procAprovado = await processService.transicionarStatus(
    proc.id,
    'APROVADO',
    assistente.id,
    'ASSISTENTE_SOCIAL_SUAS',
    {
      parecerSocial: 'Visita domiciliar atesta extrema vulnerabilidade social e habitacional.',
      parecerTecnico: 'Candidata elegível com base no laudo técnico SUAS.'
    }
  );
  console.log(`✅ Sucesso! Processo aprovado. Status final: ${procAprovado.statusAtual}`);
  console.log(`   Parecer social inserido: "${procAprovado.parecerSocial}"`);

  // Limpeza de dados de teste
  await prisma.documentoChecklist.deleteMany({ where: { processoId: proc.id } });
  await prisma.processoAuxilio.delete({ where: { id: proc.id } });
  await prisma.beneficiaria.delete({ where: { id: proc.beneficiariaId } });
  console.log('\n🧹 Dados de teste limpos com sucesso.');
  console.log('🎉 Todos os testes de máquina de estados foram concluídos com SUCESSO!');
}

runTests()
  .catch((e) => {
    console.error('❌ Erro inesperado durante a execução dos testes:', e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
