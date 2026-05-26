As tabelas conterão campos de controle de auditoria manual e "flags" que permitirão automações futuras.

Entidade: Beneficiaria
id (UUID, Primary Key)
nome (VARCHAR)
cpf (VARCHAR, Unique)
nis_cadunico (VARCHAR)
renda_per_capita_digitada (NUMERIC)
dados_bancarios_manuais (JSONB) -> Guarda banco, agência, conta digitados para exportação
api_origem_dados (BOOLEAN, Default: FALSE) -> Futuro gancho para indicar se veio via integração

Entidade: Processo_Auxilio
id (UUID, Primary Key)
numero_processo_sei (VARCHAR) 
beneficiaria_id (UUID, Foreign Key)
tipo_esteira (ENUM: SIMPLIFICADO, COMUM) 
status_atual (ENUM: TRAGEM, ANALISE, APROVADO, INDEFERIDO, RECURSO, APTO_PAGAMENTO, SUSPENSO) 
data_criacao (TIMESTAMP)
data_limite_analise (TIMESTAMP) -> Calculada pelo sistema com base no tipo de esteira (72h ou 15 dias)
operador_responsavel_id (UUID)

Entidade: Documento_Checklist
id (UUID, Primary Key)
processo_id (UUID, Foreign Key)
tipo_documento (ENUM: RG, CPF, COMPROVANTE_RESIDENCIA, MPU, CADUNICO) 
arquivo_storage_url (VARCHAR) -> Caminho do PDF no servidor
verificado_manualmente (BOOLEAN, Default: FALSE)
ocr_processado (BOOLEAN, Default: FALSE) -> Deixado pronto para a fase futura