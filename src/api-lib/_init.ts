import { sql } from './_db.js';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { config } from './config/validateEnv.js';
import { garantirSeedsFinanceiros } from './financeiro.js';

export async function runInitDB() {
  const safeSql = async (query: any) => {
    try {
      await query;
      return true;
    } catch (e: any) {
      console.error('SafeSQL Error:', e.message);
      return false;
    }
  };

  /* console.log('--- Iniciando Sincronização de Banco de Dados ---'); */

  // 0. Tenants e Configurações
  await safeSql(sql`
    CREATE TABLE IF NOT EXISTS tenants (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      nome VARCHAR(255) NOT NULL,
      subdominio VARCHAR(100) UNIQUE,
      dominio_personalizado VARCHAR(255) UNIQUE,
      plano_tier VARCHAR(50) DEFAULT 'basic' NOT NULL,
      status VARCHAR(20) DEFAULT 'ativo' NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
    )
  `);
  await safeSql(
    sql`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS dominio_personalizado VARCHAR(255) UNIQUE`,
  );

  await safeSql(sql`
    CREATE TABLE IF NOT EXISTS tenant_configs (
      tenant_id UUID PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
      espessura_padrao_mdf INTEGER DEFAULT 15 NOT NULL,
      largura_maxima_sem_travessa INTEGER DEFAULT 800 NOT NULL,
      folga_gaveta_telescopica NUMERIC(4,2) DEFAULT 13.00 NOT NULL,
      markup_padrao NUMERIC(5,2) DEFAULT 1.50 NOT NULL,
      gemini_api_key_custom TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
    )
  `);

  await safeSql(sql`
    CREATE TABLE IF NOT EXISTS subscriptions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
      asaas_customer_id VARCHAR(255),
      asaas_subscription_id VARCHAR(255),
      status VARCHAR(50) DEFAULT 'active' NOT NULL,
      plano VARCHAR(50) DEFAULT 'free' NOT NULL,
      valor DECIMAL(12,2) DEFAULT 0.00 NOT NULL,
      dia_vencimento INTEGER,
      current_period_end TIMESTAMP WITH TIME ZONE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
    )
  `);

  await safeSql(sql`
    CREATE TABLE IF NOT EXISTS usage_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
      usuario_id UUID NOT NULL,
      modelo VARCHAR(100) NOT NULL,
      prompt_tokens INTEGER DEFAULT 0 NOT NULL,
      completion_tokens INTEGER DEFAULT 0 NOT NULL,
      total_tokens INTEGER DEFAULT 0 NOT NULL,
      custo_estimado DECIMAL(15,8) DEFAULT 0.00000000 NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
    )
  `);

  // 1. Clients Table
  await safeSql(sql`
    CREATE TABLE IF NOT EXISTS clients (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      razao_social TEXT, nome TEXT, cnpj TEXT, cpf TEXT, nome_fantasia TEXT, porte TEXT, data_abertura TEXT, cnae_principal TEXT, cnae_secundario TEXT, natureza_juridica TEXT, logradouro TEXT, endereco TEXT, numero TEXT, complemento TEXT, cep TEXT, bairro TEXT, municipio TEXT, cidade TEXT, uf TEXT, email TEXT, telefone TEXT, situacao_cadastral TEXT, data_situacao_cadastral TEXT, motivo_situacao TEXT, codigo_erp TEXT, historico TEXT, observacoes TEXT, frequencia_compra TEXT, tipo_imovel TEXT, comodos_interesse TEXT, origem TEXT, status TEXT DEFAULT 'ativo', created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `);
  // Unique indexes tenant-scoped (global UNIQUE constraints removidas para isolar tenants)
  await safeSql(sql`DROP INDEX IF EXISTS clients_cnpj_idx`);
  await safeSql(sql`DROP INDEX IF EXISTS clients_cpf_idx`);
  await safeSql(
    sql`CREATE UNIQUE INDEX IF NOT EXISTS clients_tenant_cnpj_idx ON clients (tenant_id, cnpj) WHERE cnpj IS NOT NULL`,
  );
  await safeSql(
    sql`CREATE UNIQUE INDEX IF NOT EXISTS clients_tenant_cpf_idx ON clients (tenant_id, cpf) WHERE cpf IS NOT NULL`,
  );

  // 2. Projects Table
  await safeSql(sql`
    CREATE TABLE IF NOT EXISTS projects (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      client_id TEXT, client_name TEXT, ambiente TEXT NOT NULL, descricao TEXT, valor_estimado DECIMAL(12,2), valor_final DECIMAL(12,2), prazo_entrega DATE, status TEXT NOT NULL DEFAULT 'lead', etapa_producao TEXT, responsavel TEXT, observacoes TEXT, visita_id TEXT, quotation_id TEXT, created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 3. Billings Table
  await safeSql(sql`
    CREATE TABLE IF NOT EXISTS billings (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(), nf TEXT, pedido TEXT, cliente TEXT, erp TEXT, descricao TEXT, tipo TEXT DEFAULT 'entrada', project_id TEXT, valor DECIMAL(12,2), data TEXT, due_date DATE, categoria TEXT DEFAULT 'outros', status TEXT DEFAULT 'PAGO', created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await safeSql(sql`ALTER TABLE billings ADD COLUMN IF NOT EXISTS due_date DATE`);

  // 4. Kanban Items
  await safeSql(sql`
    CREATE TABLE IF NOT EXISTS kanban_items (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(), title TEXT NOT NULL, subtitle TEXT, label TEXT, status TEXT NOT NULL, type TEXT NOT NULL, contact_name TEXT, contact_role TEXT, email TEXT, phone TEXT, city TEXT, state TEXT, value DECIMAL(12,2), temperature TEXT, visit_date DATE, visit_time TEXT, visit_type TEXT, observations TEXT, project_id TEXT, date_time TIMESTAMP WITH TIME ZONE, visit_format TEXT, description TEXT, created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 5. Monthly Goals
  await safeSql(sql`
    CREATE TABLE IF NOT EXISTS monthly_goals (
      period TEXT PRIMARY KEY, amount DECIMAL(12,2) NOT NULL, updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 6. Migrations (safe)
  // [PROMPT 2 - 2026-06-04] ALTER TABLE quotations* REMOVIDOS: tabelas quotations, itens_orcamento,
  //   orcamento_ambientes, orcamento_moveis, orcamento_pecas, orcamento_ferragens, orcamento_custos_extras
  //   foram DROPPADAS em PROMPT 1. Schema canonico agora e `quotations` (Drizzle).
  await safeSql(sql`ALTER TABLE projects ADD COLUMN IF NOT EXISTS visita_id TEXT`);
  await safeSql(sql`ALTER TABLE projects ADD COLUMN IF NOT EXISTS quotation_id TEXT`);
  await safeSql(sql`ALTER TABLE ordens_producao ADD COLUMN IF NOT EXISTS visita_id TEXT`);
  await safeSql(sql`ALTER TABLE ordens_producao ADD COLUMN IF NOT EXISTS projeto_id TEXT`);
  await safeSql(sql`ALTER TABLE ordens_producao ADD COLUMN IF NOT EXISTS quotation_id TEXT`);
  await safeSql(sql`ALTER TABLE planos_de_corte ADD COLUMN IF NOT EXISTS visita_id TEXT`);
  await safeSql(sql`ALTER TABLE planos_de_corte ADD COLUMN IF NOT EXISTS projeto_id TEXT`);
  await safeSql(sql`ALTER TABLE planos_de_corte ADD COLUMN IF NOT EXISTS quotation_id TEXT`);
  await safeSql(sql`ALTER TABLE planos_de_corte ADD COLUMN IF NOT EXISTS ordem_producao_id TEXT`);
  await safeSql(
    sql`ALTER TABLE planos_de_corte ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE`,
  );
  // Migrações Plano de Corte / Industrial
  await safeSql(sql`ALTER TABLE erp_chapas ADD COLUMN IF NOT EXISTS estoque INTEGER DEFAULT 0`);
  await safeSql(
    sql`ALTER TABLE ordens_producao ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE`,
  );
  await safeSql(sql`ALTER TABLE retalhos_estoque ADD COLUMN IF NOT EXISTS sku VARCHAR(20) UNIQUE`);
  await safeSql(sql`ALTER TABLE eventos ADD COLUMN IF NOT EXISTS visita_id TEXT`);
  await safeSql(sql`ALTER TABLE eventos ADD COLUMN IF NOT EXISTS quotation_id TEXT`);
  await safeSql(sql`ALTER TABLE materiais ADD COLUMN IF NOT EXISTS cfop TEXT`);
  await safeSql(sql`ALTER TABLE materiais ADD COLUMN IF NOT EXISTS ncm TEXT`);
  await safeSql(sql`ALTER TABLE materiais ADD COLUMN IF NOT EXISTS preco_venda NUMERIC`);
  await safeSql(sql`ALTER TABLE materiais ADD COLUMN IF NOT EXISTS margem_lucro NUMERIC`);

  // Migrações de padronização de nomes de colunas (criado_em -> created_at)
  // [PROMPT 2 - 2026-06-04] RENAME COLUMN em quotations* REMOVIDOS: tabelas legadas não existem mais.
  await safeSql(sql`ALTER TABLE chamados_garantia RENAME COLUMN criado_em TO created_at`).catch(
    () => {},
  );
  await safeSql(sql`ALTER TABLE chamados_garantia RENAME COLUMN atualizado_em TO updated_at`).catch(
    () => {},
  );
  await safeSql(sql`ALTER TABLE notificacoes RENAME COLUMN criado_em TO created_at`).catch(
    () => {},
  );
  await safeSql(sql`ALTER TABLE eventos RENAME COLUMN criado_em TO created_at`).catch(() => {});
  await safeSql(sql`ALTER TABLE eventos RENAME COLUMN atualizado_em TO updated_at`).catch(() => {});
  await safeSql(sql`ALTER TABLE planos_de_corte RENAME COLUMN criado_em TO created_at`).catch(
    () => {},
  );
  await safeSql(sql`ALTER TABLE planos_de_corte RENAME COLUMN atualizado_em TO updated_at`).catch(
    () => {},
  );
  await safeSql(sql`ALTER TABLE retalhos_estoque RENAME COLUMN criado_em TO created_at`).catch(
    () => {},
  );
  await safeSql(sql`ALTER TABLE movimentacoes_estoque RENAME COLUMN criado_em TO created_at`).catch(
    () => {},
  );
  await safeSql(
    sql`ALTER TABLE movimentacoes_estoque RENAME COLUMN criado_por TO created_by`,
  ).catch(() => {});
  await safeSql(
    sql`ALTER TABLE movimentacoes_estoque ADD COLUMN IF NOT EXISTS projeto_id UUID`,
  ).catch(() => {});
  await safeSql(
    sql`ALTER TABLE movimentacoes_estoque ADD COLUMN IF NOT EXISTS quotation_id UUID`,
  ).catch(() => {});
  await safeSql(
    sql`ALTER TABLE movimentacoes_estoque ADD COLUMN IF NOT EXISTS preco_unitario NUMERIC(12,2)`,
  ).catch(() => {});
  await safeSql(
    sql`ALTER TABLE movimentacoes_estoque ADD COLUMN IF NOT EXISTS valor_total NUMERIC(12,2)`,
  ).catch(() => {});
  await safeSql(
    sql`ALTER TABLE movimentacoes_estoque ADD COLUMN IF NOT EXISTS estoque_antes NUMERIC(12,4)`,
  ).catch(() => {});
  await safeSql(
    sql`ALTER TABLE movimentacoes_estoque ADD COLUMN IF NOT EXISTS estoque_depois NUMERIC(12,4)`,
  ).catch(() => {});
  await safeSql(
    sql`ALTER TABLE movimentacoes_estoque ADD COLUMN IF NOT EXISTS created_by VARCHAR(100)`,
  ).catch(() => {});
  await safeSql(sql`ALTER TABLE movimentacoes_estoque ALTER COLUMN item_tipo DROP NOT NULL`).catch(
    () => {},
  );
  await safeSql(
    sql`ALTER TABLE movimentacoes_estoque ALTER COLUMN item_tipo SET DEFAULT 'material'`,
  ).catch(() => {});
  await safeSql(
    sql`ALTER TABLE movimentacoes_estoque ADD COLUMN IF NOT EXISTS nota_fiscal TEXT`,
  ).catch(() => {});
  await safeSql(sql`ALTER TABLE retalhos_estoque RENAME COLUMN atualizado_em TO updated_at`).catch(
    () => {},
  );
  await safeSql(sql`ALTER TABLE projects RENAME COLUMN criado_em TO created_at`).catch(() => {});
  await safeSql(sql`ALTER TABLE projects RENAME COLUMN atualizado_em TO updated_at`).catch(
    () => {},
  );
  await safeSql(sql`ALTER TABLE materiais RENAME COLUMN criado_em TO created_at`).catch(() => {});
  await safeSql(sql`ALTER TABLE materiais RENAME COLUMN atualizado_em TO updated_at`).catch(
    () => {},
  );
  await safeSql(sql`ALTER TABLE erp_product_bom RENAME COLUMN atualizado_em TO updated_at`).catch(
    () => {},
  );

  // Tabela Fornecedores (criação idempotente)
  await safeSql(sql`
    CREATE TABLE IF NOT EXISTS fornecedores (
      id SERIAL PRIMARY KEY,
      nome TEXT NOT NULL,
      cnpj TEXT,
      contato TEXT,
      telefone TEXT,
      email TEXT,
      cidade TEXT,
      estado TEXT,
      observacoes TEXT,
      ativo BOOLEAN DEFAULT true,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Migrações e padronizações da tabela fornecedores
  await safeSql(sql`ALTER TABLE fornecedores RENAME COLUMN criado_em TO created_at`).catch(
    () => {},
  );
  await safeSql(
    sql`ALTER TABLE fornecedores ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP`,
  ).catch(() => {});
  await safeSql(
    sql`ALTER TABLE fornecedores ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP`,
  ).catch(() => {});

  // Garantir que updated_at exista se não existir
  await safeSql(
    sql`ALTER TABLE projects ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP`,
  ).catch(() => {});
  // [PROMPT 2 - 2026-06-04] ALTER TABLE quotations ADD COLUMN updated_at REMOVIDO: tabela deletada.

  // 7. Users Table
  await safeSql(sql`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name TEXT NOT NULL, email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, role TEXT NOT NULL, created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 8. Categories & Materials Seed
  try {
    const cc = await sql`SELECT count(*) as count FROM categorias_material`;
    if (cc.length && parseInt(cc[0].count, 10) === 0) {
      await sql`INSERT INTO categorias_material (slug, nome, icone) VALUES ('chapas', 'CHAPAS', 'Layers'), ('fitas_borda', 'FITAS', 'Ruler'), ('fixacoes', 'FIXAÇÕES', 'Pin')`;
    }
  } catch {
    // Ignore error
  }

  // 9. Admin Seed
  try {
    const defaultTenantId = '00000000-0000-0000-0000-000000000000';
    // Garante que a coluna tenant_id existe antes de inserir/atualizar
    await safeSql(
      sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE`,
    );
    const uc = await sql`SELECT count(*) as count FROM users`;
    if (uc.length && parseInt(uc[0].count, 10) === 0) {
      const defaultPassword = process.env.ADMIN_DEFAULT_PASSWORD || crypto.randomUUID();
      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash(defaultPassword, salt);
      await sql`INSERT INTO users (name, email, password_hash, role, tenant_id) VALUES ('ADMINISTRADOR', ${config.ADMIN_DEFAULT_EMAIL}, ${hash}, 'admin', ${defaultTenantId})`;
      console.warn(
        `[SEED] Admin padrao criado com email '${config.ADMIN_DEFAULT_EMAIL}' e senha: ${defaultPassword}`,
      );
    } else {
      // Idempotente: garante que o admin existente tenha tenant_id (corrige DBs legados)
      await safeSql(
        sql`UPDATE users SET tenant_id = ${defaultTenantId} WHERE email = ${config.ADMIN_DEFAULT_EMAIL} AND tenant_id IS NULL`,
      );
    }
  } catch (err: any) {
    console.error('Erro no Seed do Admin:', err.message);
  }

  // 10. ERP Simulations Table
  await safeSql(sql`
    CREATE TABLE IF NOT EXISTS erp_simulations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(), cliente_id TEXT, cliente_nome TEXT, dados_simulacao JSONB NOT NULL, dados_input JSONB NOT NULL, created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 10.1 ERP SKUs for Engineering
  await safeSql(sql`
    CREATE TABLE IF NOT EXISTS erp_skus (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      sku_code TEXT UNIQUE NOT NULL,
      nome TEXT NOT NULL,
      unidade_medida TEXT DEFAULT 'UN',
      preco_base DECIMAL(12,2) DEFAULT 0.00,
      atributos JSONB DEFAULT '{}',
      ativo BOOLEAN DEFAULT true,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 11. New Industrial Taxonomy
  await safeSql(sql`
    CREATE TABLE IF NOT EXISTS erp_categories (
      id TEXT PRIMARY KEY,
      nome TEXT NOT NULL,
      ativo BOOLEAN DEFAULT true,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await safeSql(sql`
    CREATE TABLE IF NOT EXISTS erp_families (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      nome TEXT NOT NULL,
      categoria_id TEXT REFERENCES erp_categories(id),
      ativo BOOLEAN DEFAULT true,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Seed categoria Retalho
  await safeSql(
    sql`INSERT INTO erp_categories (id, nome) VALUES ('RET', 'RETALHO') ON CONFLICT (id) DO NOTHING`,
  );

  await safeSql(sql`
    CREATE TABLE IF NOT EXISTS erp_subfamilies (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      nome TEXT NOT NULL,
      familia_id UUID REFERENCES erp_families(id),
      ativo BOOLEAN DEFAULT true,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 13. Budgeting Tables
  // [PROMPT 2 - 2026-06-04] 7 CREATE TABLE IF NOT EXISTS (quotations, itens_orcamento,
  //   orcamento_ambientes, orcamento_moveis, orcamento_pecas, orcamento_ferragens,
  //   orcamento_custos_extras) REMOVIDOS: tabelas foram DROPPADAS em PROMPT 1.
  //   Schema canonico agora e `quotations` + `quotation_items` (Drizzle ORM em src/db/schema/quotations.ts).

  // 14. Production Orders Table
  await safeSql(sql`
    CREATE TABLE IF NOT EXISTS ordens_producao (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      op_id TEXT UNIQUE NOT NULL,
      produto TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'PRODUCAO',
      pecas INTEGER DEFAULT 0,
      quotation_id TEXT,
      projeto_id TEXT,
      visita_id TEXT,
      data_inicio TIMESTAMP WITH TIME ZONE,
      data_fim TIMESTAMP WITH TIME ZONE,
      tempo_previsto_corte INTEGER DEFAULT 0,
      tempo_previsto_montagem INTEGER DEFAULT 0,
      data_prevista_entrega TIMESTAMP WITH TIME ZONE,
      checklist JSONB DEFAULT '[]',
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 15. Engineering Modules Table
  await safeSql(sql`
    CREATE TABLE IF NOT EXISTS erp_product_bom (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      nome TEXT,
      codigo_modelo TEXT UNIQUE,
      descricao TEXT,
      regras_calculo JSONB DEFAULT '[]',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 16. POS-VENDA E GARANTIA
  await safeSql(sql`
    CREATE TABLE IF NOT EXISTS chamados_garantia (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      projeto_id TEXT, -- Alterado para TEXT para compatibilidade
      cliente_id TEXT, -- Alterado para TEXT para compatibilidade
      numero TEXT UNIQUE NOT NULL,
      titulo TEXT NOT NULL,
      descricao TEXT NOT NULL,
      tipo TEXT NOT NULL,
      prioridade TEXT DEFAULT 'normal',
      status TEXT DEFAULT 'aberto',
      data_abertura TIMESTAMPTZ DEFAULT NOW(),
      data_agendamento TIMESTAMPTZ,
      data_resolucao TIMESTAMPTZ,
      responsavel TEXT,
      custo_atendimento NUMERIC(10,2) DEFAULT 0,
      dentro_garantia BOOLEAN DEFAULT TRUE,
      solucao_aplicada TEXT,
      fotos_urls TEXT[],
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await safeSql(sql`
    CREATE TABLE IF NOT EXISTS historico_chamado (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      chamado_id UUID REFERENCES chamados_garantia(id) ON DELETE CASCADE,
      status_anterior TEXT,
      status_novo TEXT,
      observacao TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // 17. Notifications Table
  await safeSql(sql`
    CREATE TABLE IF NOT EXISTS notificacoes (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tipo TEXT NOT NULL,
      titulo TEXT NOT NULL,
      mensagem TEXT NOT NULL,
      prioridade TEXT DEFAULT 'normal',
      lida BOOLEAN DEFAULT FALSE,
      data_leitura TIMESTAMPTZ,
      referencia_tipo TEXT,
      referencia_id TEXT, -- Alterado para TEXT (Flexível)
      url_destino TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // 18. Calendar Table
  await safeSql(sql`
    CREATE TABLE IF NOT EXISTS eventos (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tipo TEXT NOT NULL,
      titulo TEXT NOT NULL,
      descricao TEXT,
      data_inicio TIMESTAMPTZ NOT NULL,
      data_fim TIMESTAMPTZ NOT NULL,
      dia_inteiro BOOLEAN DEFAULT FALSE,
      cliente_id TEXT, -- Alterado para TEXT para flexibilidade
      projeto_id TEXT,
      visita_id TEXT,
      quotation_id TEXT,
      endereco TEXT,
      objetivo TEXT,
      status_visita TEXT,
      resultado_visita TEXT,
      responsavel_id TEXT NOT NULL,
      created_by TEXT NOT NULL,
      cor TEXT,
      lembrete_minutos INTEGER,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await safeSql(sql`
    CREATE TABLE IF NOT EXISTS eventos_historico (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      evento_id TEXT NOT NULL,
      campo_alterado TEXT NOT NULL,
      valor_anterior TEXT,
      valor_novo TEXT,
      alterado_por TEXT NOT NULL,
      observacao TEXT,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // Migrações de segurança para tipos de coluna - AGRESSIVO
  try {
    await sql`ALTER TABLE eventos ALTER COLUMN cliente_id TYPE TEXT USING cliente_id::TEXT`;
    await sql`ALTER TABLE eventos ALTER COLUMN projeto_id TYPE TEXT USING projeto_id::TEXT`;
    await sql`ALTER TABLE eventos ALTER COLUMN criado_por TYPE TEXT USING criado_por::TEXT`;
    await sql`ALTER TABLE eventos ALTER COLUMN responsavel_id TYPE TEXT USING responsavel_id::TEXT`;

    await sql`ALTER TABLE eventos_historico ALTER COLUMN evento_id TYPE TEXT USING evento_id::TEXT`;
    await sql`ALTER TABLE eventos_historico ALTER COLUMN alterado_por TYPE TEXT USING alterado_por::TEXT`;
  } catch (err: any) {
    console.error('Erro Crítico na Migração de Tipos:', err.message);
  }

  await safeSql(sql`
    CREATE TABLE IF NOT EXISTS eventos_agenda (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      titulo TEXT NOT NULL,
      tipo TEXT NOT NULL,
      data_inicio TIMESTAMPTZ NOT NULL,
      data_fim TIMESTAMPTZ,
      dia_inteiro BOOLEAN DEFAULT FALSE,
      cliente_id TEXT, -- Flexível
      projeto_id TEXT, -- Flexível
      visita_id TEXT, -- Flexível
      chamado_id UUID REFERENCES chamados_garantia(id),
      responsavel TEXT NOT NULL,
      local TEXT,
      observacoes TEXT,
      status TEXT DEFAULT 'agendado',
      cor TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // 19. Industrial Cutting Plan
  await safeSql(sql`
    CREATE TABLE IF NOT EXISTS planos_de_corte (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      nome VARCHAR(255) NOT NULL,
      sku_engenharia VARCHAR(100),
      kerf_mm INTEGER DEFAULT 3,
      materiais JSONB NOT NULL,
      resultado JSONB,
      visita_id UUID,
      projeto_id UUID,
      quotation_id UUID,
      ordem_producao_id UUID,
      observacoes TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 20. ERP Chapas (Industrial Stock)
  await safeSql(sql`
    CREATE TABLE IF NOT EXISTS erp_chapas (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      sku VARCHAR(100) UNIQUE NOT NULL,
      nome VARCHAR(255) NOT NULL,
      largura_mm INTEGER NOT NULL,
      altura_mm INTEGER NOT NULL,
      espessura_mm INTEGER NOT NULL,
      preco_unitario DECIMAL(12,2),
      ativo BOOLEAN DEFAULT true,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 21. ERP SKUs Engineering
  await safeSql(sql`
    CREATE TABLE IF NOT EXISTS erp_skus_engenharia (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      sku VARCHAR(100) UNIQUE NOT NULL,
      nome VARCHAR(255) NOT NULL,
      componentes JSONB NOT NULL,
      versao INTEGER DEFAULT 1,
      ativo BOOLEAN DEFAULT true,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 22. Retalhos (Scraps) - NOVO SCHEMA BLOCO 2
  await safeSql(sql`
    CREATE TABLE IF NOT EXISTS retalhos_estoque (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      sku_chapa VARCHAR(100) NOT NULL,
      largura_mm INTEGER NOT NULL,
      altura_mm INTEGER NOT NULL,
      espessura_mm INTEGER NOT NULL,
      origem VARCHAR(50) NOT NULL DEFAULT 'manual',
      plano_corte_origem_id UUID REFERENCES planos_de_corte(id),
      utilizado_em_id UUID REFERENCES planos_de_corte(id),
      projeto_origem VARCHAR(255),
      localizacao VARCHAR(100) DEFAULT 'GERAL',
      observacoes TEXT,
      disponivel BOOLEAN DEFAULT true,
      descartado BOOLEAN DEFAULT false,
      data_descarte TIMESTAMP WITH TIME ZONE,
      data_utilizacao TIMESTAMP WITH TIME ZONE,
      usuario_criou VARCHAR(100),
      usuario_atualizou VARCHAR(100),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      metadata JSONB
    )
  `);

  // 23. Ordens de Produção (Fase 1 Kanban)
  await safeSql(sql`
    CREATE TABLE IF NOT EXISTS ordens_prod (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      quotation_id UUID NOT NULL,
      numero_op VARCHAR(50) UNIQUE NOT NULL,
      status VARCHAR(50) NOT NULL DEFAULT 'planejamento',
      prioridade INTEGER DEFAULT 5,
      data_inicio DATE,
      data_prazo DATE,
      data_conclusao DATE,
      observacoes TEXT,
      responsavel_id UUID,
      environment VARCHAR(100),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await safeSql(sql`ALTER TABLE ordens_prod ALTER COLUMN quotation_id DROP NOT NULL`);
  await safeSql(sql`ALTER TABLE ordens_prod ADD COLUMN IF NOT EXISTS projeto_id UUID`);

  await safeSql(sql`
    CREATE TABLE IF NOT EXISTS etapas_prod_kanban (
      id SERIAL PRIMARY KEY,
      operacao_prod_id UUID REFERENCES ordens_prod(id) ON DELETE CASCADE,
      etapa_numero INTEGER NOT NULL,
      etapa_nome VARCHAR(100) NOT NULL,
      status_kanban VARCHAR(50) NOT NULL DEFAULT 'a_fazer',
      ordem_display INTEGER DEFAULT 0,
      data_inicio DATE,
      data_conclusao DATE,
      responsavel_id UUID,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await safeSql(sql`
    CREATE TABLE IF NOT EXISTS movimento_kanban (
      id SERIAL PRIMARY KEY,
      etapa_kanban_id INTEGER REFERENCES etapas_prod_kanban(id) ON DELETE CASCADE,
      status_anterior VARCHAR(50),
      status_novo VARCHAR(50),
      usuario_id UUID,
      timestamp_movimento TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      nota TEXT
    )
  `);

  await safeSql(sql`
    CREATE TABLE IF NOT EXISTS eventos_calendario (
      id SERIAL PRIMARY KEY,
      usuario_id UUID NOT NULL,
      tipo_evento VARCHAR(50) NOT NULL,
      titulo VARCHAR(255) NOT NULL,
      descricao TEXT,
      data_evento DATE NOT NULL,
      hora_evento TIME,
      quotation_id UUID,
      operacao_prod_id UUID REFERENCES ordens_prod(id) ON DELETE SET NULL,
      cor_categoria VARCHAR(20) DEFAULT '#0D66CC',
      concluido BOOLEAN DEFAULT FALSE,
      notificacao_dias_antes INTEGER DEFAULT 0,
      notificacao_enviada BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Migrações de eventos_calendario (garantir colunas mesmo se tabela foi criada antes)
  await safeSql(
    sql`ALTER TABLE eventos_calendario ADD COLUMN IF NOT EXISTS quotation_id UUID`,
  ).catch(() => {});
  await safeSql(
    sql`ALTER TABLE eventos_calendario ADD COLUMN IF NOT EXISTS operacao_prod_id UUID`,
  ).catch(() => {});
  await safeSql(
    sql`ALTER TABLE eventos_calendario ADD COLUMN IF NOT EXISTS cor_categoria VARCHAR(20) DEFAULT '#0D66CC'`,
  ).catch(() => {});
  await safeSql(
    sql`ALTER TABLE eventos_calendario ADD COLUMN IF NOT EXISTS notificacao_dias_antes INTEGER DEFAULT 0`,
  ).catch(() => {});
  await safeSql(
    sql`ALTER TABLE eventos_calendario ADD COLUMN IF NOT EXISTS notificacao_enviada BOOLEAN DEFAULT FALSE`,
  ).catch(() => {});
  await safeSql(
    sql`ALTER TABLE notificacoes_calendario ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE`,
  ).catch(() => {});

  await safeSql(sql`
    CREATE TABLE IF NOT EXISTS notificacoes_calendario (

      id SERIAL PRIMARY KEY,
      evento_calendario_id INTEGER REFERENCES eventos_calendario(id) ON DELETE CASCADE,
      tipo_notificacao VARCHAR(50),
      mensagem TEXT,
      enviado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      lido BOOLEAN DEFAULT FALSE
    )
  `);

  // 24. Custos Reais de Produção (Fase 2)
  await safeSql(sql`
    CREATE TABLE IF NOT EXISTS custos_reais_op (
      id SERIAL PRIMARY KEY,
      operacao_prod_id UUID REFERENCES ordens_prod(id) ON DELETE CASCADE NOT NULL,
      quotation_id UUID REFERENCES quotations(id) ON DELETE CASCADE NOT NULL,
      custo_material_estimado DECIMAL(10, 2),
      custo_mao_obra_estimada DECIMAL(10, 2),
      tempo_horas_estimado DECIMAL(10, 2),
      custo_material_real DECIMAL(10, 2),
      custo_mao_obra_real DECIMAL(10, 2),
      tempo_horas_real DECIMAL(10, 2),
      custo_retrabalho DECIMAL(10, 2) DEFAULT 0,
      custo_desperdicio_material DECIMAL(10, 2) DEFAULT 0,
      custo_total_estimado DECIMAL(10, 2),
      custo_total_real DECIMAL(10, 2),
      variacao_custo DECIMAL(10, 2),
      variacao_percentual DECIMAL(5, 2),
      valor_venda DECIMAL(10, 2),
      margem_estimada DECIMAL(10, 2),
      margem_real DECIMAL(10, 2),
      margem_percentual_real DECIMAL(5, 2),
      descricao_desvios TEXT,
      responsavel_analise UUID,
      data_conclusao_op DATE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 25. Rentabilidade por Cliente
  await safeSql(sql`
    CREATE TABLE IF NOT EXISTS rentabilidade_cliente (
      id SERIAL PRIMARY KEY,
      cliente_id INT NOT NULL,
      total_orcamentos INT DEFAULT 0,
      total_pedidos INT DEFAULT 0,
      total_vendido DECIMAL(12, 2) DEFAULT 0,
      total_custos_reais DECIMAL(12, 2) DEFAULT 0,
      margem_total DECIMAL(12, 2) DEFAULT 0,
      margem_media_percentual DECIMAL(5, 2) DEFAULT 0,
      ticket_medio DECIMAL(10, 2) DEFAULT 0,
      operacoes_lucrativas INT DEFAULT 0,
      operacoes_prejuizadas INT DEFAULT 0,
      score_rentabilidade INT DEFAULT 0,
      ultimo_pedido_data DATE,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 26. Tendências de Preço
  await safeSql(sql`
    CREATE TABLE IF NOT EXISTS tendencias_preco (
      id SERIAL PRIMARY KEY,
      tipo_produto VARCHAR(100),
      data_analise DATE,
      preco_medio_mes DECIMAL(10, 2),
      preco_minimo DECIMAL(10, 2),
      preco_maximo DECIMAL(10, 2),
      margem_media_mes DECIMAL(5, 2),
      volume_vendas INT,
      variacao_preco_mes DECIMAL(5, 2),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 27. Conversas WhatsApp
  await safeSql(sql`
    CREATE TABLE IF NOT EXISTS conversas_whatsapp (
      id SERIAL PRIMARY KEY,
      quotation_id UUID REFERENCES quotations(id) ON DELETE CASCADE,
      operacao_prod_id UUID REFERENCES ordens_prod(id) ON DELETE CASCADE,
      numero_telefone VARCHAR(20) NOT NULL,
      contato_nome VARCHAR(255),
      ultima_mensagem TEXT,
      timestamp_ultima_msg TIMESTAMP WITH TIME ZONE,
      mensagens_nao_lidas INT DEFAULT 0,
      status_conversa VARCHAR(50) DEFAULT 'ativa',
      tags VARCHAR(500),
      data_criacao TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 28. Mensagens WhatsApp
  await safeSql(sql`
    CREATE TABLE IF NOT EXISTS mensagens_whatsapp (
      id SERIAL PRIMARY KEY,
      conversa_whatsapp_id INT REFERENCES conversas_whatsapp(id) ON DELETE CASCADE NOT NULL,
      usuario_id UUID,
      tipo_msg VARCHAR(50) NOT NULL,
      conteudo_msg TEXT NOT NULL,
      arquivo_url VARCHAR(500),
      timestamp_msg TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      lido BOOLEAN DEFAULT FALSE,
      whatsapp_msg_id VARCHAR(100) UNIQUE,
      status_entrega VARCHAR(50)
    )
  `);

  // 29. Modelos de Mensagens
  await safeSql(sql`
    CREATE TABLE IF NOT EXISTS modelos_msg_whatsapp (
      id SERIAL PRIMARY KEY,
      titulo VARCHAR(100) NOT NULL,
      conteudo_template TEXT NOT NULL,
      tipo_acionador VARCHAR(50),
      ativo BOOLEAN DEFAULT TRUE,
      criado_por UUID,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 30. Tabelas da Fase 3: Estoque Granular + Contratos
  await safeSql(sql`
    CREATE TABLE IF NOT EXISTS estoque_materiais_detalhado (
      id SERIAL PRIMARY KEY,
      sku_codigo VARCHAR(50) UNIQUE NOT NULL,
      descricao VARCHAR(255) NOT NULL,
      unidade_medida VARCHAR(20) DEFAULT 'un',
      quantidade_disponivel INTEGER DEFAULT 0,
      quantidade_em_transito INTEGER DEFAULT 0,
      quantidade_provisionado INTEGER DEFAULT 0,
      quantidade_defeituoso INTEGER DEFAULT 0,
      quantidade_vencido INTEGER DEFAULT 0,
      quantidade_minima INTEGER DEFAULT 10,
      quantidade_maxima INTEGER DEFAULT 500,
      lead_time_dias INTEGER DEFAULT 7,
      preco_custo_unitario DECIMAL(10, 2),
      valor_total_estoque DECIMAL(12, 2),
      fornecedor_id INTEGER,
      data_ultima_compra TIMESTAMP WITH TIME ZONE,
      data_proxima_reposicao TIMESTAMP WITH TIME ZONE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Migrações de colunas extras em estoque_materiais_detalhado (SKUs)
  await safeSql(
    sql`ALTER TABLE estoque_materiais_detalhado ADD COLUMN IF NOT EXISTS preco_custo DECIMAL(10,2)`,
  ).catch(() => {});
  await safeSql(
    sql`ALTER TABLE estoque_materiais_detalhado ADD COLUMN IF NOT EXISTS unidade_uso VARCHAR(20)`,
  ).catch(() => {});
  await safeSql(
    sql`ALTER TABLE estoque_materiais_detalhado ADD COLUMN IF NOT EXISTS fabricante VARCHAR(100)`,
  ).catch(() => {});
  await safeSql(
    sql`ALTER TABLE estoque_materiais_detalhado ADD COLUMN IF NOT EXISTS fornecedor_principal VARCHAR(100)`,
  ).catch(() => {});
  await safeSql(
    sql`ALTER TABLE estoque_materiais_detalhado ADD COLUMN IF NOT EXISTS categoria_taxonomia VARCHAR(50)`,
  ).catch(() => {});
  await safeSql(
    sql`ALTER TABLE estoque_materiais_detalhado ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT true`,
  ).catch(() => {});

  await safeSql(sql`
    CREATE TABLE IF NOT EXISTS movimento_estoque_granular (
      id SERIAL PRIMARY KEY,
      sku_codigo VARCHAR(50) REFERENCES estoque_materiais_detalhado(sku_codigo),
      operacao_prod_id UUID REFERENCES ordens_prod(id) ON DELETE SET NULL,
      quotation_id UUID REFERENCES quotations(id) ON DELETE SET NULL,
      tipo_movimento VARCHAR(50) NOT NULL,
      quantidade_movimento INTEGER NOT NULL,
      status_anterior VARCHAR(50),
      status_novo VARCHAR(50),
      saldo_anterior INTEGER,
      saldo_novo INTEGER,
      motivo_descricao TEXT,
      usuario_id UUID,
      timestamp_movimento TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await safeSql(sql`
    CREATE TABLE IF NOT EXISTS alertas_estoque (
      id SERIAL PRIMARY KEY,
      sku_codigo VARCHAR(50) REFERENCES estoque_materiais_detalhado(sku_codigo),
      tipo_alerta VARCHAR(50),
      quantidade_atual INTEGER,
      limite_alerta INTEGER,
      severidade VARCHAR(20),
      ativo BOOLEAN DEFAULT TRUE,
      data_alerta TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      data_resolucao TIMESTAMP WITH TIME ZONE,
      usuario_notificado_id UUID
    )
  `);

  await safeSql(sql`
    CREATE TABLE IF NOT EXISTS planejamento_reposicao (
      id SERIAL PRIMARY KEY,
      sku_codigo VARCHAR(50) REFERENCES estoque_materiais_detalhado(sku_codigo),
      quantidade_necessaria INTEGER,
      data_necessario_ate TIMESTAMP WITH TIME ZONE,
      operacao_prod_id UUID REFERENCES ordens_prod(id) ON DELETE SET NULL,
      status_planejamento VARCHAR(50),
      ordem_compra_id INTEGER,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await safeSql(sql`
    CREATE TABLE IF NOT EXISTS ordens_compra_granular (
      id SERIAL PRIMARY KEY,
      numero_oc VARCHAR(50) UNIQUE NOT NULL,
      fornecedor_id INTEGER,
      data_emissao TIMESTAMP WITH TIME ZONE,
      data_entrega_prevista TIMESTAMP WITH TIME ZONE,
      data_entrega_real TIMESTAMP WITH TIME ZONE,
      status_oc VARCHAR(50),
      valor_total DECIMAL(12, 2),
      observacoes TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await safeSql(sql`
    CREATE TABLE IF NOT EXISTS itens_oc_granular (
      id SERIAL PRIMARY KEY,
      ordem_compra_id INTEGER REFERENCES ordens_compra_granular(id) ON DELETE CASCADE NOT NULL,
      sku_codigo VARCHAR(50) REFERENCES estoque_materiais_detalhado(sku_codigo),
      quantidade_solicitada INTEGER,
      quantidade_recebida INTEGER DEFAULT 0,
      preco_unitario DECIMAL(10, 2),
      subtotal DECIMAL(12, 2)
    )
  `);

  await safeSql(sql`
    CREATE TABLE IF NOT EXISTS contrato_digital (
      id SERIAL PRIMARY KEY,
      quotation_id UUID REFERENCES quotations(id) ON DELETE CASCADE UNIQUE,
      numero_contrato VARCHAR(50) UNIQUE,
      data_criacao TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      data_documento TIMESTAMP WITH TIME ZONE,
      empresa_nome VARCHAR(255),
      empresa_cnpj VARCHAR(20),
      cliente_nome VARCHAR(255),
      cliente_cpf_cnpj VARCHAR(20),
      html_contrato TEXT,
      arquivo_pdf_url VARCHAR(500),
      status_assinatura VARCHAR(50) DEFAULT 'pendente',
      data_solicitacao_assinatura TIMESTAMP WITH TIME ZONE,
      id_assinatura_externa VARCHAR(100),
      url_assinatura VARCHAR(500),
      data_assinatura_empresa TIMESTAMP WITH TIME ZONE,
      data_assinatura_cliente TIMESTAMP WITH TIME ZONE,
      certificado_validade TIMESTAMP WITH TIME ZONE,
      documento_assinado_url VARCHAR(500),
      hash_documento VARCHAR(256),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await safeSql(sql`
    CREATE TABLE IF NOT EXISTS historico_assinatura_digital (
      id SERIAL PRIMARY KEY,
      contrato_id INTEGER REFERENCES contrato_digital(id) ON DELETE CASCADE NOT NULL,
      acao VARCHAR(100) NOT NULL,
      timestamp_acao TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      usuario_id UUID,
      detalhes TEXT
    )
  `);

  await safeSql(sql`
    CREATE TABLE IF NOT EXISTS mapeamento_sku (
      id SERIAL PRIMARY KEY,
      sku_promob VARCHAR(100) NOT NULL,
      sku_interno VARCHAR(50) REFERENCES estoque_materiais_detalhado(sku_codigo),
      nome_promob VARCHAR(255),
      nome_interno VARCHAR(255),
      confianca_match INTEGER DEFAULT 100,
      tipo_match VARCHAR(50),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      validado_por UUID,
      data_validation TIMESTAMP WITH TIME ZONE
    )
  `);

  await safeSql(sql`
    CREATE TABLE IF NOT EXISTS historico_sku_matching (
      id SERIAL PRIMARY KEY,
      quotation_id UUID REFERENCES quotations(id) ON DELETE CASCADE,
      sku_procurado VARCHAR(100) NOT NULL,
      skus_sugeridos VARCHAR(500),
      sku_selecionado VARCHAR(50),
      timestamp_matching TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      usuario_id UUID
    )
  `);

  // Seed default Estoque Detalhado se vazio
  try {
    const ec = await sql`SELECT count(*) as count FROM estoque_materiais_detalhado`;
    if (ec.length && parseInt(ec[0].count, 10) === 0) {
      const defaultTenantId = '00000000-0000-0000-0000-000000000000';
      await sql`INSERT INTO estoque_materiais_detalhado (tenant_id, sku_codigo, descricao, unidade_medida, quantidade_disponivel, quantidade_em_transito, quantidade_provisionado, quantidade_defeituoso, quantidade_vencido, quantidade_minima, quantidade_maxima, preco_custo_unitario, valor_total_estoque) VALUES 
        (${defaultTenantId}, 'MDF-BRA-15', 'MDF BRANCO 15MM', 'un', 45, 10, 5, 2, 0, 10, 100, 150.00, 9300.00),
        (${defaultTenantId}, 'MDF-BRA-18', 'MDF BRANCO 18MM', 'un', 8, 20, 0, 0, 0, 15, 100, 180.00, 5040.00),
        (${defaultTenantId}, 'COR-TELE-45', 'CORREDIÇA TELESCÓPICA 45CM', 'par', 120, 0, 30, 5, 0, 50, 500, 25.00, 3875.00),
        (${defaultTenantId}, 'DOB-RETA-35', 'DOBRADIÇA RETA 35MM', 'un', 250, 100, 80, 10, 0, 100, 1000, 4.50, 1980.00),
        (${defaultTenantId}, 'PAR-40X16', 'PARAFUSO 4.0 X 16MM', 'cx', 3, 5, 1, 0, 0, 5, 50, 45.00, 405.00)`;
    }
  } catch (err: any) {
    console.error('Erro no Seed de Estoque Granular:', err.message);
  }

  // Seed default Chapas if empty

  try {
    const cc = await sql`SELECT count(*) as count FROM erp_chapas`;
    if (cc.length && parseInt(cc[0].count, 10) === 0) {
      await sql`INSERT INTO erp_chapas (sku, nome, largura_mm, altura_mm, espessura_mm, preco_unitario) VALUES 
        ('MDF-BRA-15', 'MDF BRANCO 15MM', 2750, 1830, 15, 280.00),
        ('MDF-BRA-18', 'MDF BRANCO 18MM', 2750, 1830, 18, 320.00),
        ('MDF-GRA-15', 'MDF GRAFITE 15MM', 2750, 1830, 15, 310.00)`;
    }
  } catch {
    // Ignore error
  }

  // Hardening Migration (DESATIVADA em 2026-06-04 — PROMPT 1/PROMPT 2: tabelas legadas quotations* removidas; indices legacy não se aplicam mais)
  // Arquivo renomeado para .disabled; reabilitar somente apos refatoracao das queries quotations em contrato-digital.ts, aprovacao.ts, projects.ts, etc.
  // try {
  //   const { runHardeningMigration } = await import('./queries/hardening_migration.js.disabled');
  //   await runHardeningMigration();
  // } catch {
  //   // Ignore se falhar
  // }

  // Migração de tenant_id em lote para suporte retroativo
  const tabelasComTenant = [
    'clients',
    'projects',
    'billings',
    'kanban_items',
    'monthly_goals',
    'ordens_producao',
    'erp_product_bom',
    'chamados_garantia',
    'notificacoes',
    'eventos',
    'planos_de_corte',
    'erp_chapas',
    'erp_skus',
    'erp_skus_engenharia',
    'retalhos_estoque',
    'materiais',
    'movimentacoes_estoque',
    'fornecedores',
    'users',
    'classes_financeiras',
    'contas_internas',
    'titulos_receber',
    'titulos_pagar',
    'formas_pagamento',
    'condicoes_pagamento',
    'contas_recorrentes',
    'fechamentos_financeiros',
    'baixas',
    'movimentacoes_tesouraria',
    'counters',
    'erp_categories',
    'erp_simulations',
    'pedidos_compra',
    'pedido_compra_itens',
    'recebimentos_compra',
    'subscriptions',
    'usage_logs',
    'ordens_prod',
    'etapas_prod_kanban',
    'movimento_kanban',
    'eventos_calendario',
    'notificacoes_calendario',
    'custos_reais_op',
    'rentabilidade_cliente',
    'tendencias_preco',
    'conversas_whatsapp',
    'mensagens_whatsapp',
    'modelos_msg_whatsapp',
    'estoque_materiais_detalhado',
    'movimento_estoque_granular',
    'alertas_estoque',
    'planejamento_reposicao',
    'ordens_compra_granular',
    'itens_oc_granular',
    'contrato_digital',
    'historico_assinatura_digital',
    'mapeamento_sku',
    'historico_sku_matching',
    'erp_movimentacoes_industrial',
  ];

  for (const tabela of tabelasComTenant) {
    await safeSql(
      sql(
        `ALTER TABLE ${tabela} ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE` as any,
      ),
    );
  }

  // Criar Tenant Default e migrar dados nulos
  try {
    const defaultTenantId = '00000000-0000-0000-0000-000000000000';

    // 1. Criar o tenant default se não existir
    await sql`
      INSERT INTO tenants (id, nome, subdominio, plano_tier, status)
      VALUES (${defaultTenantId}, 'MARCENARIA DEFAULT', 'default', 'pro', 'ativo')
      ON CONFLICT (id) DO UPDATE SET subdominio = 'default'
    `;

    // 2. Criar a config padrão do tenant se não existir
    await sql`
      INSERT INTO tenant_configs (tenant_id, espessura_padrao_mdf, largura_maxima_sem_travessa, folga_gaveta_telescopica, markup_padrao)
      VALUES (${defaultTenantId}, 15, 800, 13.00, 1.50)
      ON CONFLICT (tenant_id) DO NOTHING
    `;

    // 2.5 Criar Plano de Contas padrão do tenant default se não existir
    await garantirSeedsFinanceiros(defaultTenantId);

    // 3. Atualizar registros nulos para o tenant default
    for (const tabela of tabelasComTenant) {
      await safeSql(
        sql(`UPDATE ${tabela} SET tenant_id = '${defaultTenantId}' WHERE tenant_id IS NULL` as any),
      );
    }
  } catch (err: any) {
    console.error('Erro na migração de dados do Tenant:', err.message);
  }

  // MÓDULO 9 — Prospecção Marcenaria
  await safeSql(sql`
    CREATE TABLE IF NOT EXISTS prospeccoes (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
      nome VARCHAR(255) NOT NULL,
      telefone VARCHAR(30),
      email VARCHAR(255),
      cidade VARCHAR(100),
      uf VARCHAR(2),
      status VARCHAR(50) NOT NULL DEFAULT 'novo_contato',
      temperatura VARCHAR(20) DEFAULT 'frio',
      origem VARCHAR(50) DEFAULT 'outro',
      interesse TEXT,
      orcamento_estimado NUMERIC(12,2),
      prazo_desejado_dias INTEGER,
      responsavel_id VARCHAR(100),
      responsavel_nome VARCHAR(255),
      cliente_id UUID,
      projeto_id UUID,
      budget BOOLEAN DEFAULT FALSE,
      authority BOOLEAN DEFAULT FALSE,
      need BOOLEAN DEFAULT FALSE,
      timeline BOOLEAN DEFAULT FALSE,
      motivo_perda TEXT,
      concorrente_perdeu VARCHAR(255),
      observacoes TEXT,
      convertido_em TIMESTAMP WITH TIME ZONE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      deleted_at TIMESTAMP WITH TIME ZONE
    )
  `);

  await safeSql(sql`
    CREATE TABLE IF NOT EXISTS interacoes_prospeccao (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      prospeccao_id UUID NOT NULL REFERENCES prospeccoes(id) ON DELETE CASCADE,
      tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
      tipo VARCHAR(50) NOT NULL,
      titulo VARCHAR(255),
      descricao TEXT,
      status_anterior VARCHAR(50),
      status_novo VARCHAR(50),
      realizado_por VARCHAR(255),
      data_interacao TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await safeSql(sql`CREATE INDEX IF NOT EXISTS prospeccoes_tenant_idx ON prospeccoes (tenant_id)`);
  await safeSql(
    sql`CREATE INDEX IF NOT EXISTS prospeccoes_status_idx ON prospeccoes (tenant_id, status)`,
  );
  await safeSql(
    sql`CREATE INDEX IF NOT EXISTS interacoes_prosp_idx ON interacoes_prospeccao (prospeccao_id)`,
  );

  /* console.log('--- Sincronização Concluída ---'); */

  return { success: true, message: 'Schema sincronizado com sucesso' };
}
