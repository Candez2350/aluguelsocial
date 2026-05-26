# Walkthrough - Sistema Auxílio Aluguel (MVP)

Esta documentação fornece um guia detalhado sobre como executar, testar e navegar pelo **Sistema Auxílio Aluguel**, um MVP completo de esteira de tramitação e aprovação construído em arquitetura modular multipágina (**MPA**) com Node.js, Express, EJS, Prisma e SQLite.

---

## 🚀 Como Iniciar o Sistema

O banco de dados SQLite já está configurado, migrado e populado com contas de teste. Para iniciar o servidor local:

```bash
# Para iniciar o servidor em ambiente de desenvolvimento com auto-reload
npm run dev
```

O servidor estará ativo em: **[http://localhost:3000](http://localhost:3000)**

---

## 👥 Credenciais de Teste & Roles

Para simplificar a avaliação do sistema, incluímos um **Painel de Atalhos Rápidos** na tela de login. Basta clicar no botão do perfil correspondente para realizar o login imediato:

1. **ADMIN**
   - **E-mail:** `admin@aluguelsocial.gov.br`
   - **Senha:** `123456`
   - **Permissões:** Acesso global, cadastro de novos operadores e alteração do valor base do benefício.

2. **OPERADOR ENTRADA (Triagem)**
   - **E-mail:** `operador@aluguelsocial.gov.br`
   - **Senha:** `123456`
   - **Permissões:** Cadastro de cidadãs, preenchimento de MPUs, upload simulado de documentos e tramitação inicial (Rascunho -> Triagem -> Análise).

3. **ANALISTA SEDSODH (Judicial)**
   - **E-mail:** `analista@aluguelsocial.gov.br`
   - **Senha:** `123456`
   - **Permissões:** Visualiza e decide apenas processos da esteira **Judicial Simplificada**.

4. **ASSISTENTE SOCIAL SUAS (Comum)**
   - **E-mail:** `assistente@aluguelsocial.gov.br`
   - **Senha:** `123456`
   - **Permissões:** Visualiza e elabora pareceres sociais e laudos descritivos para processos da esteira **Comum**.

5. **GESTOR SEMPI (Monitoramento)**
   - **E-mail:** `gestor@aluguelsocial.gov.br`
   - **Senha:** `123456`
   - **Permissões:** Leitura exclusiva aos painéis analíticos, distribuição territorial e folha de pagamentos aptos.

---

## 🏗️ Lógica e Regras de Negócio Implementadas

### 1. Seleção Inteligente de Esteira (Triagem)
Ao realizar o cadastro de uma nova beneficiária, o sistema avalia a presença da flag **Medida Protetiva de Urgência (MPU)**:
- **COM MPU:** O processo é enquadrado na esteira **SIMPLIFICADO** (SLA limite de **72 horas corridas**).
- **SEM MPU:** O processo entra na esteira **COMUM** (SLA limite de **15 dias úteis**, calculados pulando fins de semana).

### 2. Máquina de Estados e Travas de Checklist
O processo tramita estritamente sob as seguintes transições lógicas:
`RASCUNHO` ➔ `TRIAGEM` ➔ `ANALISE` ➔ `APROVADO` / `INDEFERIDO` ➔ `RECURSO` ➔ `APTO_PAGAMENTO`.

- **Trava de Checklist:** O operador não consegue enviar o processo da `TRIAGEM` para `ANALISE` se todos os documentos obrigatórios (RG, CPF, Comprovante de Residência, CadÚnico e MPU se aplicável) não tiverem sido carregados e verificados individualmente.
- **Trava de Laudo SUAS:** O assistente social não consegue aprovar um processo da esteira Comum sem o preenchimento explícito do **Parecer Social** e do **Relatório Técnico Descritivo**.
- **Segurança de Transição:** Um analista judicial não consegue intervir em processos comuns e vice-versa.

### 3. Segurança Visual (Sigilo da Vítima)
Em conformidade com a proteção de dados de mulheres sob proteção de violência de gênero, dados confidenciais (nome completo, CPF, telefone) são renderizados sob um **filtro de desfoque (blur)** nativo e controlados por um botão de sigilo que permite revelar as informações pontualmente para os operadores sob auditoria visual.

---

## 📊 Gráficos Estatísticos Nativos (Gestor SEMPI)
O painel do Gestor exibe informativos estatísticos e demográficos renderizados em formato de barras interativas animadas construídas puramente com CSS e integradas à API Express, sem CDNs externas lentas:
- **Distribuição Territorial:** Contagem de beneficiárias ativas por bairros.
- **Evolução de Ingressos:** Volume de processos novos abertos.
- **Perfil Etário:** Demografia por faixa etária das atendidas.
- **Folha Financeira:** Exportação de planilha CSV com todos os dados bancários para pagamentos imediatos.

---

## ⚖️ Painel do Analista SEDSODH (Aprimorado & Unificado)
O painel de Análise Judicial agora dispõe de uma interface unificada focada em prioridade de julgamentos e controle inteligente de segurança:
- **Visibilidade Unificada de Esteiras:** O analista agora monitora de forma consolidada tanto os processos da esteira **Judicial Simplificada** quanto da **Esteira Comum**, tanto na fila de abertos quanto no histórico de tramitados.
- **Abas de Separação de Fila:** Permite alternar instantaneamente entre **Processos em Aberto (Ativos)** e o **Histórico de Tramitados (Julgados)**.
- **Busca em Tempo Real:** Campo de busca rápida no topo que filtra dinamicamente as tabelas pelo número SEI ou nome da cidadã conforme a digitação ocorre.
- **Cálculo Dinâmico e Representação de SLA por Esteira:**
  - **Esteira Simplificada:** Exibição em **Horas Restantes** (prazo de 72h, com alerta urgente para <=24h).
  - **Esteira Comum:** Exibição em **Dias Restantes** (prazo de 15 dias úteis, com alerta urgente para <=3 dias).
- **Travas Administrativas e de Segurança (Lockout):** Como os processos da esteira Comum requerem análise técnica especializada de assistência social:
  - Na tabela principal, os botões de ação rápidos são substituídos por um aviso visual discreto: `🔒 Apenas Visualização (SUAS)`.
  - No rodapé da gaveta lateral (drawer), os botões de deferir, indeferir ou analisar são completamente ocultados para processos comuns, sendo exibido o aviso: `🔒 Apenas Assistentes Sociais SUAS podem julgar processos da Esteira Comum.`, garantindo a estrita observância das regras de negócio.
- **Gaveta Deslizante de Detalhes (Slide-over Drawer):** Ao clicar em qualquer processo ou no botão "👁️ Detalhes", uma gaveta lateral premium se abre exibindo:
  1. Perfil completo da cidadã (Nome, CPF, NIS, Telefone, Bairro/Cidade) com suporte a sigilo visual (efeito de blur alternável).
  2. Idade calculada automaticamente a partir da data de nascimento.
  3. Representação visual estilizada de um cartão bancário digital contendo os dados bancários para a folha.
  4. Checklist com status visual individual dos documentos obrigatórios anexados.
  5. Identificação completa do operador responsável pelo cadastro inicial (Nome e E-mail).
  6. **Julgamento Contextual Seguro:** Botões rápidos de decisão (Deferir, Indeferir ou Iniciar Análise) gerados de forma condicional apenas para processos da esteira Simplificada.

---

## 📝 Painel do Operador de Entrada (Aprimorado)
O painel do Operador de Entrada foi totalmente readequado para qualidade de design corporativa e melhoria profunda na usabilidade:
- **Layout Premium Full-Width:** O formulário estático lateral foi removido, dando espaço completo de tela para visualização da esteira de processos.
- **Inscrição Dinâmica em Modal (`#cadastro-modal`):** Abertura instantânea por botão superior de destaque, estruturando o cadastro semântico das assistidas.
- **Edição Completa de Processos Ativos (`#edicao-modal`):** Um novo popup foi criado para preencher, alterar e salvar todos os campos cadastrais e dados bancários para processos ativos (que não estejam em estados locked de `ENCERRADO` ou `SUSPENSO`).
- **Recálculo Dinâmico de SLA e Esteira:** Ao editar e alterar a presença de Medida Protetiva de Urgência (MPU), o backend recalcula os prazos da esteira e remove/adiciona o documento obrigatório da MPU do checklist em tempo real.
- **Abas de Controle e Controle de Fluxo:** Nova barra de abas ("Todos", "📝 Rascunho / Triagem", "🚀 Em Análise", "✅ Julgados / Concluídos") facilitando o controle diário.
- **Resolução do Bug do Checklist:** Substituição das aspas de JSON injetadas diretamente nas chamadas dinâmicas do HTML por um `<textarea id="processos-json-data">` centralizado no cliente. Isso resolveu o bug estrutural que impedia a alteração de status do checklist e a tramitação para análise dos processos.

---

## 🏡 Painel do Assistente Social SUAS (Aprimorado)
O painel do Assistente Social foi completamente renovado com recursos avançados de usabilidade, visibilidade estendida e gestão de pareceres técnicos:
- **Visibilidade Estendida:** Agora exibe tanto os processos pendentes de análise quanto todo o histórico de processos já julgados e tramitados na esteira Comum.
- **Abas Premium de Navegação:**
  - `📥 Processos em Aberto`: Processos que aguardam parecer (`TRIAGEM`, `ANALISE`, `RECURSO`).
  - `✅ Histórico de Tramitados`: Histórico completo dos requerimentos finalizados.
- **Busca Rápida em Tempo Real:** Filtragem instantânea da tabela por número SEI ou nome da assistida.
- **Cálculo Preciso de SLA:** Prazos expressos em **Dias Restantes** (limite de 15 dias úteis), com alertas e badges de urgência inteligentes.
- **Gaveta Deslizante de Detalhes (Slide-over Drawer):** Apresenta o dossiê da cidadã com desfoque de privacidade (sigilo), checklist, dados bancários e a seção de **Laudo Social e Parecer Técnico** em tempo real.
- **Modal de Elaboração & Funcionalidade de Rascunho:**
  - O modal foi totalmente readequado para design corporativo com transições elásticas.
  - **💾 Salvar Rascunho:** Permite ao profissional preencher e salvar parcialmente o parecer e o relatório técnico sem mudar o status de análise do processo, salvando seu progresso na base de dados de forma segura.
  - **🔒 Segurança e Bloqueios:** Caso o processo já esteja julgado e finalizado, a edição é bloqueada nativamente, apresentando o parecer gravado em modo somente leitura.

---

## 🔒 Edição Condicional (Parecer Social Ausente) & Massa de Dados de Teste

Na Etapa 9, implementamos duas melhorias cruciais focadas na flexibilidade da esteira e no enriquecimento da experiência de teste:

### 1. Edição da Inscrição por Status (Dados Cadastrais e Bancários)
A edição das informações cadastrais e dados bancários da cidadã (Inscrição de Auxílio Aluguel) agora é permitida se, e somente se, o status do processo for **Rascunho** (`RASCUNHO`), **Recurso** (`RECURSO`), **Suspenso** (`SUSPENSO`) ou **Triagem** (`TRIAGEM`).
- **Operador de Entrada:** O botão "✏️ Editar" na listagem de processos é exibido estritamente para os processos que se encontram nestes quatro estados editáveis, ocultando-se em status avançados ou fechados (mesmo se o Parecer Social estiver ausente).
- **Backend Seguro:** O validador no serviço do backend (`editarProcessoCompleto`) rejeita e bloqueia qualquer tentativa de edição fora desses status autorizados, garantindo conformidade com a esteira do sistema.
- **Parecer Social SUAS:** A elaboração/edição do parecer social pelo Assistente Social continua disponível para processos em `ANALISE`, `RECURSO`, ou caso o parecer social histórico esteja ausente em processos finalizados.

### 2. Massa de Dados Enriquecida (15 Registros)
O banco de dados SQLite foi semeado do zero com **15 solicitações fictícias complexas** e representativas, ideais para testar todos os cantos da interface:
- **Cenários de SLA e Alertas:** Inclui processos ativos no prazo e casos emblemáticos com **SLA Expirado** (ex: `Rita Lee`, que apresenta visualmente a badge vermelha de atraso).
- **Casos de Teste da Edição Condicional:** Registros reais finalizados sem parecer social cadastrado (ex: `Tarsila do Amaral` em status `SUSPENSO` e `Lygia Clark` em status `ENCERRADO`) para validar o desbloqueio condicional de edição e redação de pareceres.
- **Cobertura Completa:** Contém processos em `RASCUNHO`, `TRIAGEM`, `ANALISE`, `APROVADO`, `INDEFERIDO`, `RECURSO`, `APTO_PAGAMENTO`, `SUSPENSO` e `ENCERRADO` distribuídos de forma equilibrada entre as esteiras **Comum** e **Simplificada/Judicial**.

---

## ⚡ Paginação Inteligente (section-card) & Consolidação do Sigilo Visual

Na Etapa 10, implementamos melhorias críticas de UI/UX focadas no controle do volume de exibição de dados e na unificação definitiva do sistema de proteção a dados sensíveis (sigilo):

### 1. Paginação Inteligente Flexível
Os painéis principais (**Analista SEDSODH**, **Assistente Social SUAS** e **Operador de Entrada**) foram integrados a um componente de rodapé de paginação premium:
- **Limite Padrão e Opções Flexíveis:** Ao carregar cada página, as tabelas exibem estritamente **5 itens** por página por padrão. O usuário dispõe de um seletor dropdown customizado para expandir a exibição para **10 ou 15 itens**.
- **Navegação Premium:** Botões estilizados "⬅️ Ant." e "Próx. ➡️" com transições de hover harmônicas, habilitados/desabilitados semântica e visualmente conforme a posição da página.
- **Contador Dinâmico de Progresso:** Um indicador claro (ex: `Exibindo 1-5 de 15 processos`) que se atualiza instantaneamente.
- **Integração Nativa com Filtros e Abas (Busca em Tempo Real):** A paginação foi acoplada de forma 100% reativa à função de busca `filterTable()`. Ao digitar na busca ou alternar entre abas, o sistema recalcula e reconstrói as páginas dinamicamente considerando apenas as linhas correspondentes correspondentes (com base no atributo virtual de controle `data-filtered-out`), reiniciando a navegação na página 1 de forma limpa e fluida.

### 2. Centralização Definitiva do Sigilo Visual (Zero Duplicação)
Corrigimos o bug que deixava o botão de sigilo visual (`btn-toggle-sigilo`) inerte nas visualizações:
- **Unificação no Footer Global:** O listener redundante de clique foi removido de `footer.ejs` e a função foi centralizada na declaração global `window.toggleSigilo = function(btn) { ... }`.
- **Simplificação e Limpeza nas Views:** Removemos as funções `toggleSigilo` redundantes de todas as views principais, o que reduziu linhas de código e eliminou o bug de duplo disparo que neutralizava o efeito de desfoque.
- **Integração de 100% das Telas:** Os painéis de **Administrador (Admin)** e **Gestor SEMPI** foram integrados à nova função global adicionando o atributo `onclick="event.stopPropagation(); toggleSigilo(this)"` em seus respectivos botões confidenciais, fazendo com que 100% das páginas usufruam da proteção visual nativa e consistente sem nenhuma linha de lógica JavaScript duplicada.
- **Aperfeiçoamento nas Ações do Drawer:** Adicionamos travas de propagação de clique no JavaScript para garantir que o clique no botão "Exibir" nas tabelas remova o blur local instantaneamente sem abrir indesejadamente a gaveta lateral de detalhes (slide-over drawer) ao mesmo tempo, proporcionando uma experiência de navegação impecável.

---

## 🌟 Upgrade Premium de UI/UX para Dashboards (Gestor & Admin)

Na **Etapa 12**, as páginas do **Gestor SEMPI** e do **Administrador** foram completamente reconstruídas para incorporar inteligência executiva de nível corporativo e recursos de controle global essenciais para Diretores, Superintendentes e Secretários:

### 1. Painel Analítico e Estratégico do Gestor (`gestor_sempi.ejs`)
O dashboard do Gestor foi estruturado em **4 Abas Dinâmicas** com layout impecável e fluidez de transições:

- **Cards de Métricas Executivas no Topo:**
  - **Folha Mensal Corrente:** Soma dos benefícios ativos na folha (processos em `APTO_PAGAMENTO` × `valorBase`), incluindo cálculo de impacto anual projetado.
  - **Índice de SLA Operacional:** Representa a taxa percentual de processos em dia vs processos atrasados na esteira regulamentar, exibindo o exato backlog de processos expirados.
  - **Urgência MPU:** Indicador em tempo real do número de vítimas com Medidas Protetivas ou prioridades judiciais ativas.
  - **Gargalos de Fila:** Contagem consolidada de requerimentos travados em processamento ativo (`TRIAGEM`, `ANALISE`, `RECURSO`).
- **Navegação de 4 Abas:**
  - **📊 Resumo Estratégico:** Notas de gestão analítica, estatísticas gerais do programa MDS/SUAS e alertas inteligentes de backlog para alta liderança.
  - **🗺️ Territórios & Perfil:** Gráficos CSS nuançados de barras verticais e horizontais, mostrando a distribuição geográfica das assistidas por bairro, evolução mensal de ingressos, perfil etário detalhado e divisão percentual de esteiras.
  - **💸 Fila Financeira:** Tabela dedicada a pagamentos com busca em tempo real, exportação imediata em planilha CSV compatível e ações céleres para suspender benefícios inconsistentes.
  - **⏱️ Gargalos & SLA:** Auditoria minuciosa da esteira regulamentar contendo indicação do prazo SLA restante por tipo de processo (horas para Simplificado e dias úteis para Comum), com **efeito de pulsar vermelho** e badges de criticidade para itens vencidos.
- **Gaveta Deslizante de Inspeção Lateral (Read-Only):**
  - Permite aos gestores examinar detalhadamente o perfil da cidadã sem alterar dados.
  - Apresenta um mockup elegante de **cartão de débito corporativo translúcido (Glassmorphism)** contendo os dados bancários simulados para conferência visual.
  - Exibe checklists de conformidade e o conteúdo textual completo de pareceres e relatórios técnicos.
- **Correção da Rota AJAX:**
  - Corrigido o bug da requisição de suspensão que tentava ler o parâmetro Express `req.params.id` no script frontend; agora utiliza de forma limpa a variável `${id}` local da chamada do cliente.

### 2. Painel de Controle e Override Administrativo (`admin.ejs`)
O painel do Administrador Geral foi reformulado em **3 Abas Técnicas** para centralização de controle operacional:

- **Navegação de 3 Abas:**
  - **📂 Controle Geral de Processos:** Tabela administrativa unificada de todos os processos do sistema com paginação flexível (5, 10 ou 15 itens), busca textual rápida, filtros por status e esteira, e ações imediatas de override.
  - **👥 Gestão de Operadores:** Grade refinada de **cartões de perfil dos colaboradores**. Cada cartão exibe um avatar visual circular estilizado com as iniciais do usuário, e-mail institucional, data de admissão no sistema e uma badge com a cor específica de sua permissão. Também conta com formulário seguro de cadastro e opção de exclusão.
  - **⚙️ Parâmetros do Sistema:** Configuração instantânea do **Valor Base do Benefício** da folha de pagamento. Ao alterar o valor e salvar, todos os cálculos financeiros do painel do Gestor se atualizam automaticamente.
- **Gaveta Lateral Administrativa com Overrides Dinâmicos:**
  - Exibe dossiê completo de cadastro de beneficiárias e dados de depósitos.
  - Oferece botões dedicados na parte inferior da gaveta para **ações de intervenção de segurança**: `🛑 Suspender Benefício`, `🔄 Reativar (Retornar à Triagem)` ou `📁 Arquivar/Encerrar`, permitindo aos administradores atuar instantaneamente em casos de irregularidades na esteira.

### 3. Validação Programática e Compilação
Para atestar a integridade das alterações de front-end:
- Desenvolvemos o script de testes `scratch/test_templates.js` que executa localmente o parser EJS simulando todas as variáveis de sessão, estatísticas financeiras, listas de documentos e arrays de processos complexos.
- **Resultado:** Ambos os arquivos compilam e renderizam com sucesso absoluto e sem warnings, garantindo o funcionamento do sistema em produção.
