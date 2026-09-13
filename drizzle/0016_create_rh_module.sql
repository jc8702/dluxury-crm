-- Migration 0009: Cria módulo RH & Folha Simplificada
-- Tabelas: colaboradores, folha_pagamentos, folha_itens, adiantamentos, presencas
-- + tenant_configs.rh_divisor_hora + seed classes 5.01/5.02
-- Idempotente: IF NOT EXISTS em todas as criações

-- ───────────────────────────────────────────────────────────────────
-- 1. colaboradores
-- ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS colaboradores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  nome varchar(255) NOT NULL,
  cpf varchar(14),
  telefone varchar(30),
  email varchar(255),
  tipo varchar(20) NOT NULL,
  vinculo varchar(20) NOT NULL DEFAULT 'informal',
  cargo varchar(100),
  salario_base numeric(12,2) NOT NULL,
  participacao_lucros numeric(5,2) DEFAULT '0',
  chave_pix varchar(100),
  data_admissao date,
  ativo boolean DEFAULT true,
  user_id uuid,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_colaboradores_tenant_id ON colaboradores(tenant_id);
CREATE INDEX IF NOT EXISTS idx_colaboradores_tenant_ativo ON colaboradores(tenant_id, ativo);

-- ───────────────────────────────────────────────────────────────────
-- 2. folha_pagamentos
-- ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS folha_pagamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  competencia varchar(7) NOT NULL,
  status varchar(20) NOT NULL DEFAULT 'rascunho',
  total_bruto numeric(12,2) DEFAULT '0',
  total_descontos numeric(12,2) DEFAULT '0',
  total_liquido numeric(12,2) DEFAULT '0',
  total_horas_extras numeric(12,2) DEFAULT '0',
  total_bonus numeric(12,2) DEFAULT '0',
  receita_mes numeric(12,2) DEFAULT '0',
  custos_mes numeric(12,2) DEFAULT '0',
  lucro_distribuivel numeric(12,2) DEFAULT '0',
  fechada_em timestamp,
  fechada_por uuid,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now(),
  CONSTRAINT uniq_folha_tenant_competencia UNIQUE (tenant_id, competencia)
);
CREATE INDEX IF NOT EXISTS idx_folha_tenant_competencia ON folha_pagamentos(tenant_id, competencia);

-- ───────────────────────────────────────────────────────────────────
-- 3. folha_itens
-- ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS folha_itens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  folha_id uuid NOT NULL REFERENCES folha_pagamentos(id) ON DELETE CASCADE,
  colaborador_id uuid NOT NULL REFERENCES colaboradores(id),
  salario_base numeric(12,2) NOT NULL,
  dias_trabalhados integer DEFAULT 30,
  faltas_dias numeric(4,1) DEFAULT '0',
  valor_faltas numeric(12,2) DEFAULT '0',
  horas_extras_qtd numeric(6,2) DEFAULT '0',
  horas_extras_tipo varchar(10) DEFAULT '50',
  horas_extras_previstas numeric(6,2) DEFAULT '0',
  valor_horas_extras numeric(12,2) DEFAULT '0',
  valor_horas_extras_previsto numeric(12,2) DEFAULT '0',
  bonus_producao numeric(12,2) DEFAULT '0',
  adiantamento numeric(12,2) DEFAULT '0',
  outros_descontos numeric(12,2) DEFAULT '0',
  outros_descricao text,
  valor_liquido numeric(12,2) NOT NULL,
  valor_liquido_previsto numeric(12,2),
  titulo_pagar_id uuid REFERENCES titulos_pagar(id)
);
CREATE INDEX IF NOT EXISTS idx_folha_itens_folha_id ON folha_itens(folha_id);
CREATE INDEX IF NOT EXISTS idx_folha_itens_colaborador_id ON folha_itens(colaborador_id);

-- ───────────────────────────────────────────────────────────────────
-- 4. adiantamentos
-- ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS adiantamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  colaborador_id uuid NOT NULL REFERENCES colaboradores(id) ON DELETE CASCADE,
  valor numeric(12,2) NOT NULL,
  data date NOT NULL,
  competencia_desconto varchar(7) NOT NULL,
  forma_pagamento_id uuid REFERENCES formas_pagamento(id),
  observacao text,
  status varchar(20) DEFAULT 'pendente',
  descontado_em_folha_id uuid REFERENCES folha_pagamentos(id),
  created_at timestamp DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_adiantamentos_tenant_competencia ON adiantamentos(tenant_id, competencia_desconto);
CREATE INDEX IF NOT EXISTS idx_adiantamentos_colaborador_id ON adiantamentos(colaborador_id);

-- ───────────────────────────────────────────────────────────────────
-- 5. presencas
-- ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS presencas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  colaborador_id uuid NOT NULL REFERENCES colaboradores(id) ON DELETE CASCADE,
  data date NOT NULL,
  status varchar(30) NOT NULL,
  observacao text,
  created_at timestamp DEFAULT now(),
  CONSTRAINT uniq_presencas_tenant_colab_data UNIQUE (tenant_id, colaborador_id, data)
);
CREATE INDEX IF NOT EXISTS idx_presencas_tenant_colab_data ON presencas(tenant_id, colaborador_id, data);

-- ───────────────────────────────────────────────────────────────────
-- 6. tenant_configs: colunas RH
-- ───────────────────────────────────────────────────────────────────
ALTER TABLE tenant_configs ADD COLUMN IF NOT EXISTS rh_divisor_hora integer DEFAULT 220;
ALTER TABLE tenant_configs ADD COLUMN IF NOT EXISTS rh_he_adicional_padrao numeric(5,2) DEFAULT '50';

-- ───────────────────────────────────────────────────────────────────
-- 7. Seed classes financeiras 5.01 e 5.02 (idempotente por código)
-- Observação: classes_financeiras.tenant_id pode ser NULL para seed global,
-- mas preferimos inserir por tenant existente se houver. Aqui criamos sementes
-- globais (tenant_id = NULL) que servirão de template; o bootstrapFinanceiro
-- irá clonar por tenant quando necessário. Para multi-tenant puro, o ideal é
-- tenant_id NOT NULL, então inserimos para cada tenant existente.
-- ───────────────────────────────────────────────────────────────────
DO $$
DECLARE
  t RECORD;
BEGIN
  FOR t IN SELECT id FROM tenants LOOP
    INSERT INTO classes_financeiras (codigo, nome, tipo, natureza, ativa, permite_lancamento, tenant_id)
    VALUES ('5.01', 'Folha de Pagamento', 'analitica', 'devedora', true, true, t.id)
    ON CONFLICT (codigo, tenant_id) DO NOTHING;

    INSERT INTO classes_financeiras (codigo, nome, tipo, natureza, ativa, permite_lancamento, tenant_id)
    VALUES ('5.02', 'Distribuição de Lucros', 'analitica', 'devedora', true, true, t.id)
    ON CONFLICT (codigo, tenant_id) DO NOTHING;
  END LOOP;
END $$;
