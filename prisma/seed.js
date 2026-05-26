const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Iniciando o seeding do banco de dados enriquecido...');

  // 1. Limpar banco de dados existente para evitar duplicidade
  await prisma.documentoChecklist.deleteMany();
  await prisma.processoAuxilio.deleteMany();
  await prisma.beneficiaria.deleteMany();
  await prisma.usuario.deleteMany();
  await prisma.configuracao.deleteMany();

  // 2. Criar Configurações Padrão
  await prisma.configuracao.create({
    data: {
      chave: 'valor_base_beneficio',
      valor: '600.00',
    },
  });

  // 3. Criar Usuários padrão
  const salt = await bcrypt.genSalt(10);
  const senhaPadraoHash = await bcrypt.hash('123456', salt);

  const usuarios = [
    {
      nome: 'Ana Administradora (ADMIN)',
      email: 'admin@aluguelsocial.gov.br',
      senhaHash: senhaPadraoHash,
      role: 'ADMIN',
    },
    {
      nome: 'Otávio Operador (OPERADOR_ENTRADA)',
      email: 'operador@aluguelsocial.gov.br',
      senhaHash: senhaPadraoHash,
      role: 'OPERADOR_ENTRADA',
    },
    {
      nome: 'Arthur Analista (ANALISTA_SEDSODH)',
      email: 'analista@aluguelsocial.gov.br',
      senhaHash: senhaPadraoHash,
      role: 'ANALISTA_SEDSODH',
    },
    {
      nome: 'Sara Assistente Social (ASSISTENTE_SOCIAL_SUAS)',
      email: 'assistente@aluguelsocial.gov.br',
      senhaHash: senhaPadraoHash,
      role: 'ASSISTENTE_SOCIAL_SUAS',
    },
    {
      nome: 'Gabriela Gestora (GESTOR_SEMPI)',
      email: 'gestor@aluguelsocial.gov.br',
      senhaHash: senhaPadraoHash,
      role: 'GESTOR_SEMPI',
    },
  ];

  for (const u of usuarios) {
    const user = await prisma.usuario.create({ data: u });
    console.log(`Usuário criado: ${user.nome} (${user.role})`);
  }

  // 4. Cadastrar Operador Responsável
  const operador = await prisma.usuario.findFirst({
    where: { role: 'OPERADOR_ENTRADA' }
  });

  // 5. Massa com 15 beneficiárias estruturadas
  let beneficiariasMassa = [
    {
      nome: 'Maria da Silva',
      cpf: '123.456.789-00',
      nisCadunico: '12345678901',
      rendaPerCapitaDigitada: 150.00,
      dadosBancariosManuais: JSON.stringify({ banco: '001', agencia: '1234', conta: '56789-0' }),
      bairro: 'Centro',
      cidade: 'Rio de Janeiro',
      dataNascimento: new Date('1985-05-15'),
      telefone: '(21) 98888-7777',
      apiOrigemDados: false,
      // Detalhes do Processo a ser gerado
      esteira: 'SIMPLIFICADO',
      status: 'ANALISE',
      slaDiasDeslocamento: 0, // no prazo
      slaHorasDeslocamento: 72, // 72h futuras
      parecerSocial: null,
      parecerTecnico: null,
      docsVerificados: false,
    },
    {
      nome: 'Ana Souza',
      cpf: '234.567.890-11',
      nisCadunico: '23456789012',
      rendaPerCapitaDigitada: 250.00,
      dadosBancariosManuais: JSON.stringify({ banco: '104', agencia: '4321', conta: '98765-4' }),
      bairro: 'Copacabana',
      cidade: 'Rio de Janeiro',
      dataNascimento: new Date('1990-10-22'),
      telefone: '(21) 97777-6666',
      apiOrigemDados: true,
      esteira: 'COMUM',
      status: 'ANALISE',
      slaDiasDeslocamento: 15,
      slaHorasDeslocamento: 0,
      parecerSocial: null,
      parecerTecnico: null,
      docsVerificados: false,
    },
    {
      nome: 'Juliana Barbosa',
      cpf: '345.678.901-22',
      nisCadunico: '34567890123',
      rendaPerCapitaDigitada: 120.00,
      dadosBancariosManuais: JSON.stringify({ banco: '341', agencia: '5678', conta: '12345-6' }),
      bairro: 'Bangu',
      cidade: 'Rio de Janeiro',
      dataNascimento: new Date('1993-02-08'),
      telefone: '(21) 96666-5555',
      apiOrigemDados: false,
      esteira: 'COMUM',
      status: 'APROVADO',
      slaDiasDeslocamento: 15,
      slaHorasDeslocamento: 0,
      parecerSocial: 'Beneficiária cumpre todos os requisitos sociais. Residência anterior em área de risco.',
      parecerTecnico: 'Recomendo deferimento imediato.',
      docsVerificados: true,
    },
    {
      nome: 'Clarice Lispector',
      cpf: '456.789.012-33',
      nisCadunico: '45678901234',
      rendaPerCapitaDigitada: 100.00,
      dadosBancariosManuais: JSON.stringify({ banco: '237', agencia: '8765', conta: '43210-9' }),
      bairro: 'Leme',
      cidade: 'Rio de Janeiro',
      dataNascimento: new Date('1970-12-10'),
      telefone: '(21) 95555-4444',
      apiOrigemDados: false,
      esteira: 'COMUM',
      status: 'RASCUNHO',
      slaDiasDeslocamento: 15,
      slaHorasDeslocamento: 0,
      parecerSocial: null,
      parecerTecnico: null,
      docsVerificados: false,
    },
    {
      nome: 'Dona Florinda',
      cpf: '567.890.123-44',
      nisCadunico: '56789012345',
      rendaPerCapitaDigitada: 300.00,
      dadosBancariosManuais: JSON.stringify({ banco: '033', agencia: '2233', conta: '44556-7' }),
      bairro: 'Botafogo',
      cidade: 'Rio de Janeiro',
      dataNascimento: new Date('1968-04-05'),
      telefone: '(21) 94444-3333',
      apiOrigemDados: false,
      esteira: 'SIMPLIFICADO',
      status: 'TRIAGEM',
      slaDiasDeslocamento: 0,
      slaHorasDeslocamento: 72,
      parecerSocial: null,
      parecerTecnico: null,
      docsVerificados: false,
    },
    {
      nome: 'Rita Lee',
      cpf: '678.901.234-55',
      nisCadunico: '67890123456',
      rendaPerCapitaDigitada: 80.00,
      dadosBancariosManuais: JSON.stringify({ banco: '748', agencia: '9988', conta: '11223-3' }),
      bairro: 'Ipanema',
      cidade: 'Rio de Janeiro',
      dataNascimento: new Date('1947-12-31'),
      telefone: '(21) 93333-2222',
      apiOrigemDados: false,
      esteira: 'COMUM',
      status: 'ANALISE',
      slaDiasDeslocamento: -2, // Estourado (atrasado)
      slaHorasDeslocamento: 0,
      parecerSocial: null,
      parecerTecnico: null,
      docsVerificados: false,
    },
    {
      nome: 'Elza Soares',
      cpf: '789.012.345-66',
      nisCadunico: '78901234567',
      rendaPerCapitaDigitada: 90.00,
      dadosBancariosManuais: JSON.stringify({ banco: '001', agencia: '8877', conta: '99887-1' }),
      bairro: 'Padre Miguel',
      cidade: 'Rio de Janeiro',
      dataNascimento: new Date('1930-06-23'),
      telefone: '(21) 92222-1111',
      apiOrigemDados: false,
      esteira: 'COMUM',
      status: 'APTO_PAGAMENTO',
      slaDiasDeslocamento: 15,
      slaHorasDeslocamento: 0,
      parecerSocial: 'Atendimento e visita social atestam alta vulnerabilidade socioeconômica e habitacional.',
      parecerTecnico: 'Parecer favorável pela concessão do benefício de Auxílio Aluguel.',
      docsVerificados: true,
    },
    {
      nome: 'Chiquinha',
      cpf: '890.123.456-77',
      nisCadunico: '89012345678',
      rendaPerCapitaDigitada: 180.00,
      dadosBancariosManuais: JSON.stringify({ banco: '104', agencia: '3344', conta: '22334-5' }),
      bairro: 'Tijuca',
      cidade: 'Rio de Janeiro',
      dataNascimento: new Date('1995-03-09'),
      telefone: '(21) 91111-0000',
      apiOrigemDados: false,
      esteira: 'SIMPLIFICADO',
      status: 'INDEFERIDO',
      slaDiasDeslocamento: 0,
      slaHorasDeslocamento: 72,
      parecerSocial: null,
      parecerTecnico: null,
      docsVerificados: true,
    },
    {
      nome: 'Clementina de Jesus',
      cpf: '901.234.567-88',
      nisCadunico: '90123456789',
      rendaPerCapitaDigitada: 50.00,
      dadosBancariosManuais: JSON.stringify({ banco: '341', agencia: '5566', conta: '77889-2' }),
      bairro: 'Madureira',
      cidade: 'Rio de Janeiro',
      dataNascimento: new Date('1901-02-07'),
      telefone: '(21) 90000-9999',
      apiOrigemDados: false,
      esteira: 'COMUM',
      status: 'RECURSO',
      slaDiasDeslocamento: 15,
      slaHorasDeslocamento: 0,
      parecerSocial: 'Solicitante reitera a necessidade do auxílio após indeferimento inicial. Apresentou novos comprovantes de vulnerabilidade social.',
      parecerTecnico: 'Parecer social favorável sob regime recursal.',
      docsVerificados: true,
    },
    {
      nome: 'Tarsila do Amaral',
      cpf: '012.345.678-99',
      nisCadunico: '01234567890',
      rendaPerCapitaDigitada: 220.00,
      dadosBancariosManuais: JSON.stringify({ banco: '237', agencia: '4455', conta: '66778-9' }),
      bairro: 'Jardins',
      cidade: 'Rio de Janeiro',
      dataNascimento: new Date('1886-09-01'),
      telefone: '(21) 99999-8888',
      apiOrigemDados: false,
      esteira: 'COMUM',
      status: 'SUSPENSO',
      slaDiasDeslocamento: 15,
      slaHorasDeslocamento: 0,
      parecerSocial: null, // Caso de teste: ausente para permitir edição!
      parecerTecnico: null,
      docsVerificados: false,
    },
    {
      nome: 'Anita Malfatti',
      cpf: '123.045.678-90',
      nisCadunico: '12304567890',
      rendaPerCapitaDigitada: 210.00,
      dadosBancariosManuais: JSON.stringify({ banco: '033', agencia: '1122', conta: '33445-5' }),
      bairro: 'Santa Teresa',
      cidade: 'Rio de Janeiro',
      dataNascimento: new Date('1889-12-02'),
      telefone: '(21) 98888-0000',
      apiOrigemDados: false,
      esteira: 'COMUM',
      status: 'ENCERRADO',
      slaDiasDeslocamento: 15,
      slaHorasDeslocamento: 0,
      parecerSocial: 'Processo encerrado por decurso de prazo de pagamento ou atualização cadastral.',
      parecerTecnico: 'Parecer técnico finalizado e homologado sem pendências.',
      docsVerificados: true,
    },
    {
      nome: 'Carolina Maria de Jesus',
      cpf: '234.056.789-01',
      nisCadunico: '23405678901',
      rendaPerCapitaDigitada: 60.00,
      dadosBancariosManuais: JSON.stringify({ banco: '104', agencia: '9911', conta: '22331-4' }),
      bairro: 'Canindé',
      cidade: 'Rio de Janeiro',
      dataNascimento: new Date('1914-03-14'),
      telefone: '(21) 97777-1111',
      apiOrigemDados: false,
      esteira: 'SIMPLIFICADO',
      status: 'APROVADO',
      slaDiasDeslocamento: 0,
      slaHorasDeslocamento: 72,
      parecerSocial: null,
      parecerTecnico: null,
      docsVerificados: true,
    },
    {
      nome: 'Zuzu Angel',
      cpf: '345.067.890-12',
      nisCadunico: '34506789012',
      rendaPerCapitaDigitada: 130.00,
      dadosBancariosManuais: JSON.stringify({ banco: '341', agencia: '7722', conta: '88339-1' }),
      bairro: 'Leblon',
      cidade: 'Rio de Janeiro',
      dataNascimento: new Date('1921-06-05'),
      telefone: '(21) 96666-2222',
      apiOrigemDados: false,
      esteira: 'SIMPLIFICADO',
      status: 'APTO_PAGAMENTO',
      slaDiasDeslocamento: 0,
      slaHorasDeslocamento: 72,
      parecerSocial: null,
      parecerTecnico: null,
      docsVerificados: true,
    },
    {
      nome: 'Nise da Silveira',
      cpf: '456.078.901-23',
      nisCadunico: '45607890123',
      rendaPerCapitaDigitada: 140.00,
      dadosBancariosManuais: JSON.stringify({ banco: '001', agencia: '2233', conta: '55667-8' }),
      bairro: 'Engenho de Dentro',
      cidade: 'Rio de Janeiro',
      dataNascimento: new Date('1905-02-15'),
      telefone: '(21) 95555-3333',
      apiOrigemDados: false,
      esteira: 'COMUM',
      status: 'INDEFERIDO',
      slaDiasDeslocamento: 15,
      slaHorasDeslocamento: 0,
      parecerSocial: 'Família possui renda per capita superior ao limite regulamentar de meio salário mínimo, mesmo após novos cálculos.',
      parecerTecnico: 'Parecer técnico pelo indeferimento.',
      docsVerificados: true,
    },
    {
      nome: 'Lygia Clark',
      cpf: '567.089.012-34',
      nisCadunico: '56708901234',
      rendaPerCapitaDigitada: 170.00,
      dadosBancariosManuais: JSON.stringify({ banco: '237', agencia: '5544', conta: '33221-0' }),
      bairro: 'Flamengo',
      cidade: 'Rio de Janeiro',
      dataNascimento: new Date('1920-10-23'),
      telefone: '(21) 94444-4444',
      apiOrigemDados: false,
      esteira: 'COMUM',
      status: 'ENCERRADO',
      slaDiasDeslocamento: 15,
      slaHorasDeslocamento: 0,
      parecerSocial: null, // Caso de teste: ausente para permitir edição!
      parecerTecnico: null,
      docsVerificados: false,
    }
  ];

  // Gerar programaticamente mais 85 beneficiárias para atingir um total de 100 registros
  const firstNames = [
    'Maria', 'Ana', 'Francisca', 'Antônia', 'Adriana', 'Juliana', 'Marcia', 'Fernanda', 'Patrícia', 
    'Aline', 'Sandra', 'Camila', 'Amanda', 'Bruna', 'Jessica', 'Letícia', 'Luciana', 'Vanessa', 
    'Mariana', 'Gabriela', 'Vera', 'Rita', 'Sônia', 'Sandra', 'Regina', 'Eliane', 'Cristiane',
    'Daniela', 'Beatriz', 'Luana', 'Tatiane', 'Priscila', 'Renata', 'Clarice'
  ];
  const middleNames = [
    'Aparecida', 'de Souza', 'dos Santos', 'Silva', 'Oliveira', 'Pereira', 'Rodrigues', 'Almeida', 
    'Nascimento', 'Costa', 'Gomes', 'Martins', 'Araújo', 'Melo', 'Barbosa', 'Ribeiro', 'Cardoso',
    'de Carvalho', 'Mendes', 'Vieira', 'Freitas'
  ];
  const lastNames = [
    'Silva', 'Santos', 'Oliveira', 'Souza', 'Rodrigues', 'Ferreira', 'Alves', 'Pereira', 'Lima', 
    'Gomes', 'Costa', 'Ribeiro', 'Martins', 'Carvalho', 'Almeida', 'Lopes', 'Soares', 'Fernandes',
    'Teixeira', 'Pinto', 'Mendes', 'Barros'
  ];

  function generateCPF(index) {
    const base = String(index).padStart(9, '0');
    const digits = String((index * 13) % 99).padStart(2, '0');
    return `${base.substring(0,3)}.${base.substring(3,6)}.${base.substring(6,9)}-${digits}`;
  }

  function generateNIS(index) {
    return `1${String(index).padStart(10, '0')}`;
  }

  for (let i = 0; i < 85; i++) {
    const index = i + 100; // Offset para evitar colisões
    const first = firstNames[Math.floor(Math.random() * firstNames.length)];
    const middle = middleNames[Math.floor(Math.random() * middleNames.length)];
    const last = lastNames[Math.floor(Math.random() * lastNames.length)];
    const nome = `${first} ${middle} ${last}`;

    const cpf = generateCPF(index);
    const nisCadunico = generateNIS(index);

    const rendaPerCapitaDigitada = Math.round((Math.random() * 300 + 40) * 100) / 100;
    const banco = ['001', '104', '341', '237', '033'][Math.floor(Math.random() * 5)];
    const agencia = String(Math.floor(Math.random() * 8999) + 1000);
    const conta = `${String(Math.floor(Math.random() * 89999) + 10000)}-${Math.floor(Math.random() * 9)}`;
    const dadosBancariosManuais = JSON.stringify({ banco, agencia, conta });

    const bairros = [
      'Centro', 'Copacabana', 'Bangu', 'Leme', 'Botafogo', 'Ipanema', 'Padre Miguel', 'Tijuca', 
      'Madureira', 'Santa Teresa', 'Flamengo', 'Leblon', 'Engenho de Dentro', 'Campo Grande', 
      'Méier', 'Jacarepaguá', 'Barra da Tijuca', 'Rocinha', 'Vidigal', 'Penha', 'Olaria', 'Bonsucesso'
    ];
    const bairro = bairros[Math.floor(Math.random() * bairros.length)];
    const cidade = 'Rio de Janeiro';

    const birthYear = new Date().getFullYear() - (Math.floor(Math.random() * 62) + 18);
    const birthMonth = Math.floor(Math.random() * 12);
    const birthDay = Math.floor(Math.random() * 28) + 1;
    const dataNascimento = new Date(birthYear, birthMonth, birthDay);

    const telefone = `(21) 9${Math.floor(Math.random() * 8999) + 1000}-${Math.floor(Math.random() * 8999) + 1000}`;
    const apiOrigemDados = Math.random() > 0.8;

    const esteiras = ['SIMPLIFICADO', 'COMUM'];
    const esteira = esteiras[Math.floor(Math.random() * esteiras.length)];

    const statuses = ['RASCUNHO', 'TRIAGEM', 'ANALISE', 'APROVADO', 'INDEFERIDO', 'RECURSO', 'APTO_PAGAMENTO', 'SUSPENSO', 'ENCERRADO'];
    const status = statuses[Math.floor(Math.random() * statuses.length)];

    const slaDiasDeslocamento = Math.floor(Math.random() * 20) - 5;
    const slaHorasDeslocamento = Math.floor(Math.random() * 72);

    let parecerSocial = null;
    let parecerTecnico = null;
    let docsVerificados = false;

    if (['APROVADO', 'APTO_PAGAMENTO', 'ENCERRADO'].includes(status)) {
      parecerSocial = 'Parecer social gerado automaticamente atestando vulnerabilidade socioeconômica.';
      parecerTecnico = 'Parecer técnico favorável pela concessão.';
      docsVerificados = true;
    } else if (status === 'INDEFERIDO') {
      parecerSocial = 'Beneficiária não cumpriu os requisitos do edital.';
      parecerTecnico = 'Indeferido por não conformidade dos requisitos.';
      docsVerificados = true;
    } else if (status === 'RECURSO') {
      parecerSocial = 'Interposição de recurso em análise.';
      parecerTecnico = 'Recurso cadastrado pela beneficiária.';
      docsVerificados = true;
    }

    beneficiariasMassa.push({
      nome,
      cpf,
      nisCadunico,
      rendaPerCapitaDigitada,
      dadosBancariosManuais,
      bairro,
      cidade,
      dataNascimento,
      telefone,
      apiOrigemDados,
      esteira,
      status,
      slaDiasDeslocamento,
      slaHorasDeslocamento,
      parecerSocial,
      parecerTecnico,
      docsVerificados
    });
  }

  for (let i = 0; i < beneficiariasMassa.length; i++) {
    const item = beneficiariasMassa[i];
    
    // Criar Beneficiária
    const beneficiaria = await prisma.beneficiaria.create({
      data: {
        nome: item.nome,
        cpf: item.cpf,
        nisCadunico: item.nisCadunico,
        rendaPerCapitaDigitada: item.rendaPerCapitaDigitada,
        dadosBancariosManuais: item.dadosBancariosManuais,
        bairro: item.bairro,
        cidade: item.cidade,
        dataNascimento: item.dataNascimento,
        telefone: item.telefone,
        apiOrigemDados: item.apiOrigemDados,
      }
    });

    // Calcular data limite baseada nos deslocamentos do seed
    const dataLimite = new Date();
    if (item.esteira === 'SIMPLIFICADO') {
      dataLimite.setHours(dataLimite.getHours() + item.slaHorasDeslocamento);
    } else {
      dataLimite.setDate(dataLimite.getDate() + item.slaDiasDeslocamento);
    }

    // Criar Processo
    const processo = await prisma.processoAuxilio.create({
      data: {
        numeroProcessoSei: `SEI-${String(i + 1).padStart(5, '0')}`,
        beneficiariaId: beneficiaria.id,
        tipoEsteira: item.esteira,
        statusAtual: item.status,
        dataLimiteAnalise: dataLimite,
        operadorResponsavelId: operador.id,
        parecerSocial: item.parecerSocial,
        parecerTecnico: item.parecerTecnico,
      }
    });

    // Criar Checklist de Documentos
    const docs = ['RG', 'CPF', 'COMPROVANTE_RESIDENCIA', 'CADUNICO'];
    if (item.esteira === 'SIMPLIFICADO') {
      docs.push('MPU');
    }

    for (const d of docs) {
      await prisma.documentoChecklist.create({
        data: {
          processoId: processo.id,
          tipoDocumento: d,
          arquivoStorageUrl: `/uploads/${processo.id}_${d.toLowerCase()}.pdf`,
          verificadoManualmente: item.docsVerificados,
          ocrProcessado: true,
        }
      });
    }

    console.log(`[SEED] Cadastrado: ${item.nome} | Processo ${processo.numeroProcessoSei} (${item.esteira} - ${item.status})`);
  }

  console.log('Seeding enriquecido concluído com sucesso!');
}

main()
  .catch((e) => {
    console.error('Erro durante o seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
