import { sql } from './_db.js';
import bcrypt from 'bcryptjs';

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

  console.log('--- Iniciando Sincronização de Banco de Dados ---');

  // 1. Clients Table
  await safeSql(sql`
    CREATE TABLE IF NOT EXISTS clients (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      razao_social TEXT, nome TEXT, cnpj TEXT, cpf TEXT, nome_fantasia TEXT, porte TEXT, data_abertura TEXT, cnae_principal TEXT, cnae_secundario TEXT, natureza_juridica TEXT, logradouro TEXT, endereco TEXT, numero TEXT, complemento TEXT, cep TEXT, bairro TEXT, municipio TEXT, cidade TEXT, uf TEXT, email TEXT, telefone TEXT, situacao_cadastral TEXT, data_situacao_cadastral TEXT, motivo_situacao TEXT, codigo_erp TEXT, historico TEXT, observacoes TEXT, frequencia_compra TEXT, tipo_imovel TEXT, comodos_interesse TEXT, origem TEXT, status TEXT DEFAULT 'ativo', created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 2. Projects Table
  await safeSql(sql`
    CREATE TABLE IF NOT EXISTS projects (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      client_id TEXT, client_name TEXT, ambiente TEXT NOT NULL, descricao TEXT, valor_estimado DECIMAL(12,2), valor_final DECIMAL(12,2), prazo_entrega DATE, status TEXT NOT NULL DEFAULT 'lead', etapa_producao TEXT, responsavel TEXT, observacoes TEXT, visita_id TEXT, orcamento_id TEXT, created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
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
  await safeSql(sql`ALTER TABLE orcamentos ADD COLUMN IF NOT EXISTS materiais_consumidos JSONB DEFAULT '[]'`);
  await safeSql(sql`ALTER TABLE orcamentos ADD COLUMN IF NOT EXISTS visita_id TEXT`);
  await safeSql(sql`ALTER TABLE projects ADD COLUMN IF NOT EXISTS visita_id TEXT`);
  await safeSql(sql`ALTER TABLE projects ADD COLUMN IF NOT EXISTS orcamento_id TEXT`);
  await safeSql(sql`ALTER TABLE ordens_producao ADD COLUMN IF NOT EXISTS visita_id TEXT`);
  await safeSql(sql`ALTER TABLE ordens_producao ADD COLUMN IF NOT EXISTS projeto_id TEXT`);
  await safeSql(sql`ALTER TABLE ordens_producao ADD COLUMN IF NOT EXISTS orcamento_id TEXT`);
  await safeSql(sql`ALTER TABLE planos_corte ADD COLUMN IF NOT EXISTS visita_id TEXT`);
  await safeSql(sql`ALTER TABLE planos_corte ADD COLUMN IF NOT EXISTS projeto_id TEXT`);
  await safeSql(sql`ALTER TABLE planos_corte ADD COLUMN IF NOT EXISTS orcamento_id TEXT`);
  await safeSql(sql`ALTER TABLE planos_corte ADD COLUMN IF NOT EXISTS ordem_producao_id TEXT`);
  await safeSql(sql`ALTER TABLE eventos ADD COLUMN IF NOT EXISTS visita_id TEXT`);
  await safeSql(sql`ALTER TABLE eventos ADD COLUMN IF NOT EXISTS orcamento_id TEXT`);
  await safeSql(sql`ALTER TABLE materiais ADD COLUMN IF NOT EXISTS cfop TEXT`);
  await safeSql(sql`ALTER TABLE materiais ADD COLUMN IF NOT EXISTS ncm TEXT`);
  await safeSql(sql`ALTER TABLE materiais ADD COLUMN IF NOT EXISTS preco_venda NUMERIC`);
  await safeSql(sql`ALTER TABLE materiais ADD COLUMN IF NOT EXISTS margem_lucro NUMERIC`);

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
      await sql`INSERT INTO categorias_material (slug, nome, icone) VALUES ('chapas', 'Chapas', 'Layers'), ('fitas_borda', 'Fitas', 'Ruler'), ('fixacoes', 'Fixações', 'Pin')`;
    }
  } catch (e) {}

  // 9. Admin Seed
  try {
    const uc = await sql`SELECT count(*) as count FROM users`;
    if (uc.length && parseInt(uc[0].count, 10) === 0) {
      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash('admin123', salt);
      await sql`INSERT INTO users (name, email, password_hash, role) VALUES ('Administrador', 'admin@dluxury.com', ${hash}, 'admin')`;
    }
  } catch (e) {}

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
  await safeSql(sql`
    CREATE TABLE IF NOT EXISTS orcamentos (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      cliente_id TEXT, -- Flexível (TEXT ou UUID)
      projeto_id TEXT, -- Flexível (TEXT ou UUID)
      visita_id TEXT, -- Flexível (TEXT ou UUID)
      numero TEXT UNIQUE,
      status TEXT DEFAULT 'rascunho',
      valor_base DECIMAL(12,2),
      taxa_mensal DECIMAL(12,2),
      condicao_pagamento_id UUID,
      valor_final DECIMAL(12,2),
      prazo_entrega_dias INTEGER,
      prazo_tipo TEXT DEFAULT 'padrao',
      adicional_urgencia_pct DECIMAL(5,2) DEFAULT 0,
      observacoes TEXT,
      materiais_consumidos JSONB DEFAULT '[]',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await safeSql(sql`
    CREATE TABLE IF NOT EXISTS itens_orcamento (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      orcamento_id UUID REFERENCES orcamentos(id) ON DELETE CASCADE,
      descricao TEXT,
      ambiente TEXT,
      largura_cm DECIMAL(10,2),
      altura_cm DECIMAL(10,2),
      profundidade_cm DECIMAL(10,2),
      material TEXT,
      acabamento TEXT,
      quantidade INTEGER DEFAULT 1,
      valor_unitario DECIMAL(12,2),
      valor_total DECIMAL(12,2),
      erp_product_id UUID,
      erp_parametros JSONB DEFAULT '{}',
      criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 14. Production Orders Table
  await safeSql(sql`
    CREATE TABLE IF NOT EXISTS ordens_producao (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      op_id TEXT UNIQUE NOT NULL,
      produto TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'PRODUCAO',
      pecas INTEGER DEFAULT 0,
      orcamento_id TEXT,
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
      criado_em TIMESTAMPTZ DEFAULT NOW(),
      atualizado_em TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await safeSql(sql`
    CREATE TABLE IF NOT EXISTS historico_chamado (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      chamado_id UUID REFERENCES chamados_garantia(id) ON DELETE CASCADE,
      status_anterior TEXT,
      status_novo TEXT,
      observacao TEXT,
      criado_em TIMESTAMPTZ DEFAULT NOW()
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
      criado_em TIMESTAMPTZ DEFAULT NOW()
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
      orcamento_id TEXT,
      endereco TEXT,
      objetivo TEXT,
      status_visita TEXT,
      resultado_visita TEXT,
      responsavel_id TEXT NOT NULL,
      criado_por TEXT NOT NULL,
      cor TEXT,
      lembrete_minutos INTEGER,
      criado_em TIMESTAMPTZ DEFAULT NOW(),
      atualizado_em TIMESTAMPTZ DEFAULT NOW()
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
      alterado_em TIMESTAMPTZ DEFAULT NOW()
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
      criado_em TIMESTAMPTZ DEFAULT NOW()
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
      orcamento_id UUID,
      ordem_producao_id UUID,
      observacoes TEXT,
      criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
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
      localizacao VARCHAR(100) DEFAULT 'Geral',
      observacoes TEXT,
      disponivel BOOLEAN DEFAULT true,
      descartado BOOLEAN DEFAULT false,
      data_descarte TIMESTAMP WITH TIME ZONE,
      data_utilizacao TIMESTAMP WITH TIME ZONE,
      usuario_criou VARCHAR(100),
      usuario_atualizou VARCHAR(100),
      criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      metadata JSONB
    )
  `);

  // Seed default Chapas if empty
  try {
    const cc = await sql`SELECT count(*) as count FROM erp_chapas`;
    if (cc.length && parseInt(cc[0].count, 10) === 0) {
      await sql`INSERT INTO erp_chapas (sku, nome, largura_mm, altura_mm, espessura_mm, preco_unitario) VALUES 
        ('MDF-BRA-15', 'MDF Branco 15mm', 2750, 1830, 15, 280.00),
        ('MDF-BRA-18', 'MDF Branco 18mm', 2750, 1830, 18, 320.00),
        ('MDF-GRA-15', 'MDF Grafite 15mm', 2750, 1830, 15, 310.00)`;
    }
  } catch (e) {}

  console.log('--- Sincronização Concluída ---');

  return { success: true, message: 'Schema sincronizado com sucesso' };
}
