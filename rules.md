# Diretrizes Globais do Projeto - Sistema Auxílio Aluguel (MVP)

## 1. Escopo de Negócio e Limitações do MVP
- **Objetivo Principal:** O sistema é EXCLUSIVAMENTE uma esteira de tramitação, análise de elegibilidade e aprovação de processos de Auxílio Aluguel.
- **SEM PAGAMENTOS INTERNOS:** O sistema NÃO processa pagamentos, não integra com gateways e não gera transações bancárias. Ele apenas altera o status do processo para "Apto para Pagamento" e permite a exportação de dados para o setor financeiro externo.
- **SEM CONSUMO DE APIS EXTERNAS:** Todas as validações (TJRJ, CadÚnico, etc.) são baseadas em INPUTS MANUAIS digitados pelo operador na tela. As APIs e OCRs serão implementados no futuro; o código atual deve apenas simular a validação localmente.
- **Entregável:** O MVP deve ser 100% funcional (ponta a ponta) respeitando os fluxos de tela.

## 2. Stack Tecnológica e Arquitetura
- **Backend & Frontend:** Node.js (utilizar uma estrutura limpa e modular).
- **Banco de Dados:** Utilizar banco SQL local (PostgreSQL ou SQLite para desenvolvimento), mas estruturado com ORM (ex: Prisma ou Sequelize) utilizando UUID como chaves primárias, garantindo compatibilidade imediata para migração futura para o Supabase.
- **Padrão de Projeto:** Isolar as validações em camadas de serviço (Services) separadas dos controladores (Controllers), facilitando a futura substituição dos inputs manuais por chamadas de API.

## 3. Matriz de Roles (Perfis de Usuário) e Permissões
O sistema deve possuir sistema de login e controle de acesso estrito baseado em 5 funções:

1. **ADMIN:** Acesso total ao sistema, gerenciamento de usuários e configuração do valor base do benefício.
2. **OPERADOR_ENTRADA:** Cadastra a cidadã, digita os dados da Medida Protetiva (MPU), insere a renda e faz o upload manual dos documentos do checklist.
3. **ANALISTA_SEDSODH:** Visualiza a fila do "Fluxo Judicial Simplificado". Tem permissão apenas para checar os dados e clicar em "Aprovar" ou "Indeferir".
4. **ASSISTENTE_SOCIAL_SUAS:** Visualiza a fila do "Fluxo Comum". Tem permissão para preencher o parecer social e emitir parecer técnico descritivo.
5. **GESTOR_SEMPI:** Acesso exclusivo de leitura a dashboards e relatórios analíticos consolidados (perfil sociodemográfico, novos ingressos e distribuição territorial).

## 4. Máquina de Estados do Processo (Workflow)
O ciclo de vida do processo deve seguir estritamente estes status:
`RASCUNHO` -> `TRIAGEM` -> `ANALISE_SIMPLIFICADA` ou `ANALISE_COMUM` -> `APROVADO` ou `INDEFERIDO` -> `RECURSO` (se aplicável) -> `APTO_PAGAMENTO` -> `SUSPENSO/ENCERRADO`.

### Regras de Trava de Tempo (SLA):
- **Fluxo Simplificado:** Prazo de análise limite de até 72 horas.
- **Fluxo Comum:** Prazo de análise limite de até 15 dias úteis.
- O sistema deve exibir alertas visuais (Verde, Amarelo, Vermelho) nas filas de trabalho conforme o prazo se aproxima do fim.

## 5. Diretrizes de UI/UX e Identidade Visual
A interface deve ser limpa, focada em painéis de dados (dashboards) legíveis e scannáveis. As cores devem remeter ao Desenvolvimento Humano e Assistência Social (identidade inspirada no MDS/SUAS):
- **Cor Primária:** Azul Escuro Confiável (#1E3A8A ou similar) - Transmite segurança, institucionalidade e direito.
- **Cor Secundária/Destaque:** Laranja Social (#F97316 ou similar) - Cor calorosa que remete à assistência, acolhimento, energia e desenvolvimento humano.
- **Cores de Fundo:** Tonalidades leves de bege/cinza claro (#F8FAFC ou #F5F5F4) para evitar a fadiga visual dos assistentes sociais que operam o sistema o dia todo.
- **Segurança Visual:** Dados sensíveis da cidadã (como endereço atual do abrigo ou telefone) devem ter opção de "ocultar/exibir" em tela para proteger a integridade da vítima em conformidade com o sigilo exigido.

## 6. Instruções de Execução para o Agente (Economia de Tokens)
- **NÃO escreva múltiplos arquivos sem ordem.**
- Desenvolva por etapas: Primeiro as tabelas e migrations, depois as rotas de autenticação (JWT/Roles), depois a lógica de transição de status do processo, e por fim as telas de cada perfil.
- Se houver qualquer erro de compilação, PARE a execução imediatamente e peça minha instrução em formato texto antes de tentar reescrever o código.