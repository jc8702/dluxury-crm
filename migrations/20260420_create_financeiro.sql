-- Migration: criar tabelas iniciais do módulo financeiro
-- Gerado automaticamente pelo assistente

BEGIN;

-- classes_financeiras
CREATE TABLE IF NOT EXISTS classes_financeiras (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo varchar(50) NOT NULL UNIQUE,
  nome varchar(255) NOT NULL,
  tipo varchar(20) NOT NULL,
  natureza varchar(20) NOT NULL,
  pai_id uuid REFERENCES classes_financeiras(id),
  ativa boolean DEFAULT true,
  dt_limite timestamp,
  permite_lancamento boolean DEFAULT true,
  criado_em timestamp DEFAULT now(),
  atualizado_em timestamp DEFAULT now()
);

-- contas_internas
CREATE TABLE IF NOT EXISTS contas_internas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome varchar(255) NOT NULL,
  tipo varchar(50) NOT NULL,
  banco_codigo varchar(10),
  agencia varchar(20),
  conta varchar(30),
  saldo_inicial numeric(15,2) DEFAULT 0,
  saldo_atual numeric(15,2) DEFAULT 0,
  data_saldo_inicial timestamp,
  ativa boolean DEFAULT true,
  criado_em timestamp DEFAULT now()
);

-- formas_pagamento
CREATE TABLE IF NOT EXISTS formas_pagamento (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome varchar(100) NOT NULL,
  tipo varchar(30) NOT NULL,
  taxa_percentual numeric(5,2) DEFAULT 0,
  prazo_compensacao_dias integer DEFAULT 0,
  ativa boolean DEFAULT true
);

-- titulos_receber
CREATE TABLE IF NOT EXISTS titulos_receber (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_titulo varchar(50) NOT NULL UNIQUE,
  cliente_id uuid NOT NULL,
  projeto_id uuid,
  orcamento_id uuid,
  valor_original numeric(15,2) NOT NULL,
  valor_liquido numeric(15,2) NOT NULL,
  valor_juros numeric(15,2) DEFAULT 0,
  valor_multa numeric(15,2) DEFAULT 0,
  valor_desconto numeric(15,2) DEFAULT 0,
  valor_aberto numeric(15,2) NOT NULL,
  data_emissao timestamp NOT NULL,
  data_vencimento timestamp NOT NULL,
  data_competencia timestamp NOT NULL,
  data_pagamento timestamp,
  classe_financeira_id uuid NOT NULL REFERENCES classes_financeiras(id),
  centro_custo_id uuid,
  forma_recebimento_id uuid NOT NULL,
  status varchar(30) NOT NULL,
  parcela integer NOT NULL,
  total_parcelas integer NOT NULL,
  observacoes text,
  criado_em timestamp DEFAULT now(),
  atualizado_em timestamp DEFAULT now()
);

-- titulos_pagar
CREATE TABLE IF NOT EXISTS titulos_pagar (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_titulo varchar(50) NOT NULL UNIQUE,
  fornecedor_id uuid NOT NULL,
  nota_fiscal varchar(100),
  pedido_compra_id uuid,
  valor_original numeric(15,2) NOT NULL,
  valor_liquido numeric(15,2) NOT NULL,
  valor_juros numeric(15,2) DEFAULT 0,
  valor_multa numeric(15,2) DEFAULT 0,
  valor_desconto numeric(15,2) DEFAULT 0,
  valor_aberto numeric(15,2) NOT NULL,
  data_emissao timestamp NOT NULL,
  data_vencimento timestamp NOT NULL,
  data_competencia timestamp NOT NULL,
  data_pagamento timestamp,
  classe_financeira_id uuid NOT NULL REFERENCES classes_financeiras(id),
  centro_custo_id uuid,
  forma_pagamento_id uuid NOT NULL,
  conta_bancaria_id uuid NOT NULL REFERENCES contas_internas(id),
  status varchar(30) NOT NULL,
  parcela integer NOT NULL,
  total_parcelas integer NOT NULL,
  tipo_despesa varchar(30),
  observacoes text,
  criado_em timestamp DEFAULT now(),
  atualizado_em timestamp DEFAULT now()
);

-- movimentacoes_tesouraria
CREATE TABLE IF NOT EXISTS movimentacoes_tesouraria (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo varchar(30) NOT NULL,
  conta_origem_id uuid REFERENCES contas_internas(id),
  conta_destino_id uuid REFERENCES contas_internas(id),
  valor numeric(15,2) NOT NULL,
  data_movimento timestamp NOT NULL,
  classe_financeira_id uuid REFERENCES classes_financeiras(id),
  descricao varchar(500) NOT NULL,
  comprovante_url varchar(500),
  conciliado boolean DEFAULT false,
  criado_em timestamp DEFAULT now()
);

-- baixas
CREATE TABLE IF NOT EXISTS baixas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo varchar(20) NOT NULL,
  titulo_id uuid NOT NULL,
  valor_baixa numeric(15,2) NOT NULL,
  valor_juros numeric(15,2) DEFAULT 0,
  valor_multa numeric(15,2) DEFAULT 0,
  valor_desconto numeric(15,2) DEFAULT 0,
  data_baixa timestamp NOT NULL,
  conta_interna_id uuid NOT NULL REFERENCES contas_internas(id),
  observacoes text,
  criado_em timestamp DEFAULT now()
);

-- contas_recorrentes
CREATE TABLE IF NOT EXISTS contas_recorrentes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  descricao varchar(255) NOT NULL,
  tipo varchar(20) NOT NULL,
  valor numeric(15,2) NOT NULL,
  dia_vencimento integer NOT NULL,
  classe_financeira_id uuid NOT NULL REFERENCES classes_financeiras(id),
  fornecedor_id uuid,
  forma_pagamento_id uuid,
  conta_bancaria_id uuid,
  ativa boolean DEFAULT true,
  criado_em timestamp DEFAULT now()
);

COMMIT;
