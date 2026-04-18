import { sql } from './_db.js';
import bcrypt from 'bcryptjs';

export async function runInitDB() {
  // 1. Clients Table (backward compatible)
  await sql`
    CREATE TABLE IF NOT EXISTS clients (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      razao_social TEXT, nome TEXT, cnpj TEXT, cpf TEXT, nome_fantasia TEXT, porte TEXT, data_abertura TEXT, cnae_principal TEXT, cnae_secundario TEXT, natureza_juridica TEXT, logradouro TEXT, endereco TEXT, numero TEXT, complemento TEXT, cep TEXT, bairro TEXT, municipio TEXT, cidade TEXT, uf TEXT, email TEXT, telefone TEXT, situacao_cadastral TEXT, data_situacao_cadastral TEXT, motivo_situacao TEXT, codigo_erp TEXT, historico TEXT, observacoes TEXT, frequencia_compra TEXT, tipo_imovel TEXT, comodos_interesse TEXT, origem TEXT, status TEXT DEFAULT 'ativo', created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `;

  // 2. Projects Table
  await sql`
    CREATE TABLE IF NOT EXISTS projects (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      client_id TEXT, client_name TEXT, ambiente TEXT NOT NULL, descricao TEXT, valor_estimado DECIMAL(12,2), valor_final DECIMAL(12,2), prazo_entrega DATE, status TEXT NOT NULL DEFAULT 'lead', etapa_producao TEXT, responsavel TEXT, observacoes TEXT, created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `;

  // 3. Billings Table
  await sql`
    CREATE TABLE IF NOT EXISTS billings (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(), nf TEXT, pedido TEXT, cliente TEXT, erp TEXT, descricao TEXT, tipo TEXT DEFAULT 'entrada', project_id TEXT, valor DECIMAL(12,2), data TEXT, categoria TEXT DEFAULT 'outros', status TEXT DEFAULT 'PAGO', created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `;

  // 4. Kanban Items
  await sql`
    CREATE TABLE IF NOT EXISTS kanban_items (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(), title TEXT NOT NULL, subtitle TEXT, label TEXT, status TEXT NOT NULL, type TEXT NOT NULL, contact_name TEXT, contact_role TEXT, email TEXT, phone TEXT, city TEXT, state TEXT, value DECIMAL(12,2), temperature TEXT, visit_date DATE, visit_time TEXT, visit_type TEXT, observations TEXT, project_id TEXT, date_time TIMESTAMP WITH TIME ZONE, visit_format TEXT, description TEXT, created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `;

  // 5. Monthly Goals
  await sql`
    CREATE TABLE IF NOT EXISTS monthly_goals (
      period TEXT PRIMARY KEY, amount DECIMAL(12,2) NOT NULL, updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `;

  // 6. Migrations (safe)
  await sql`ALTER TABLE orcamentos ADD COLUMN IF NOT EXISTS materiais_consumidos JSONB DEFAULT '[]'`.catch(() => {});
  await sql`ALTER TABLE materiais ADD COLUMN IF NOT EXISTS cfop TEXT`.catch(() => {});
  await sql`ALTER TABLE materiais ADD COLUMN IF NOT EXISTS ncm TEXT`.catch(() => {});
  await sql`ALTER TABLE materiais ADD COLUMN IF NOT EXISTS preco_venda NUMERIC`.catch(() => {});
  await sql`ALTER TABLE materiais ADD COLUMN IF NOT EXISTS margem_lucro NUMERIC`.catch(() => {});

  // 7. Users Table
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name TEXT NOT NULL, email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, role TEXT NOT NULL, created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `;

  // 8. Categories & Materials Seed
  try {
    const cc = await sql`SELECT count(*) as count FROM categorias_material`;
    if (parseInt(cc[0].count, 10) === 0) {
      await sql`INSERT INTO categorias_material (slug, nome, icone) VALUES ('chapas', 'Chapas', 'Layers'), ('fitas_borda', 'Fitas', 'Ruler'), ('fixacoes', 'Fixações', 'Pin')`;
    }
  } catch (e) {}

  // 9. Admin Seed
  const uc = await sql`SELECT count(*) as count FROM users`;
  if (parseInt(uc[0].count, 10) === 0) {
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash('admin123', salt);
    await sql`INSERT INTO users (name, email, password_hash, role) VALUES ('Administrador', 'admin@dluxury.com', ${hash}, 'admin')`;
  }

  // 10. ERP Simulations Table
  await sql`
    CREATE TABLE IF NOT EXISTS erp_simulations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(), cliente_id TEXT, cliente_nome TEXT, dados_simulacao JSONB NOT NULL, dados_input JSONB NOT NULL, created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `;

  // 10.1 ERP SKUs for Engineering
  await sql`
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
  `;

  // 11. New Industrial Taxonomy
  await sql`
    CREATE TABLE IF NOT EXISTS erp_categories (
      id TEXT PRIMARY KEY,
      nome TEXT NOT NULL,
      ativo BOOLEAN DEFAULT true,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS erp_families (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      nome TEXT NOT NULL,
      categoria_id TEXT REFERENCES erp_categories(id),
      ativo BOOLEAN DEFAULT true,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS erp_subfamilies (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      nome TEXT NOT NULL,
      familia_id UUID REFERENCES erp_families(id),
      ativo BOOLEAN DEFAULT true,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `;

  // 12. Seed Industrial Taxonomy
  const categories = [
    { id: 'CHP', nome: 'Chapas' },
    { id: 'BRD', nome: 'Bordas e Acabamentos' },
    { id: 'FRG', nome: 'Ferragens' },
    { id: 'FIX', nome: 'Fixação e Montagem' },
    { id: 'INS', nome: 'Insumos de Produção' },
    { id: 'ILU', nome: 'Iluminação' },
    { id: 'ACS', nome: 'Acessórios Internos' },
    { id: 'EST', nome: 'Estruturas e Apoio' },
    { id: 'PRF', nome: 'Perfis e Alumínios' },
    { id: 'VID', nome: 'Vidros e Componentes' },
    { id: 'EMB', nome: 'Embalagem' },
    { id: 'FER', nome: 'Ferramentas' },
    { id: 'QUI', nome: 'Químicos e Tratamentos' }
  ];

  for (const cat of categories) {
    await sql`INSERT INTO erp_categories (id, nome) VALUES (${cat.id}, ${cat.nome}) ON CONFLICT (id) DO UPDATE SET nome = EXCLUDED.nome`;
  }

  const familyData: Record<string, string[]> = {
    'CHP': ['MDF Cru', 'MDF BP', 'MDP', 'Compensado', 'HDF', 'OSB', 'Chapas Especiais'],
    'BRD': ['Fita PVC', 'Fita ABS', 'Fita Melamínica', 'Perfil de Acabamento', 'Tapa Furo'],
    'FRG': ['Dobradiça', 'Corrediça', 'Puxador', 'Conector', 'Suporte', 'Rodízio', 'Fecho'],
    'FIX': ['Parafuso', 'Bucha', 'Cavilha', 'Minifix', 'Cantoneira', 'Prego'],
    'INS': ['Cola PVA', 'Cola Contato', 'Cola Hotmelt', 'Silicone', 'Fita Crepe', 'Lixa', 'Espuma Expansiva'],
    'ILU': ['Fita LED', 'Fonte', 'Driver', 'Sensor', 'Interruptor'],
    'ACS': ['Porta Talheres', 'Lixeira Embutida', 'Porta Temperos', 'Aramados', 'Divisores', 'Cabideiros'],
    'EST': ['Pé Regulável', 'Sapata', 'Nivelador', 'Mão Francesa'],
    'PRF': ['Perfil Alumínio', 'Perfil LED', 'Trilho', 'Moldura'],
    'VID': ['Vidro Comum', 'Vidro Temperado', 'Espelho', 'Ferragem para Vidro'],
    'EMB': ['Plástico Bolha', 'Stretch', 'Papelão', 'Fita Adesiva', 'Proteção Cantoneira'],
    'FER': ['Ferramenta Manual', 'Ferramenta Elétrica', 'Broca', 'Disco de Corte', 'Serra'],
    'QUI': ['Verniz', 'Selador', 'Tinta', 'Removedor', 'Produto Limpeza Técnica']
  };

  for (const [catId, families] of Object.entries(familyData)) {
    for (const famName of families) {
      const exists = await sql`SELECT id FROM erp_families WHERE categoria_id = ${catId} AND nome = ${famName}`;
      if (!exists.length) {
        await sql`INSERT INTO erp_families (nome, categoria_id) VALUES (${famName}, ${catId})`;
      }
    }
  }

  const subFamilyData: Record<string, string[]> = {
    'Dobradiça': ['Caneco 35mm', 'Reta', 'Curva', 'Super Curva', 'Com Amortecedor', 'Sem Amortecedor'],
    'Corrediça': ['Telescópica', 'Invisível', 'Push to Open', 'Amortecida'],
    'MDF BP': ['Madeirado', 'Unicolor', 'Texturizado']
  };

  for (const [famName, subFamilies] of Object.entries(subFamilyData)) {
    const fam = await sql`SELECT id FROM erp_families WHERE nome = ${famName}`;
    if (fam.length) {
      for (const subName of subFamilies) {
        const exists = await sql`SELECT id FROM erp_subfamilies WHERE familia_id = ${fam[0].id} AND nome = ${subName}`;
        if (!exists.length) {
          await sql`INSERT INTO erp_subfamilies (nome, familia_id) VALUES (${subName}, ${fam[0].id})`;
        }
      }
    }
  }

  // 13. Budgeting Tables (CRM/Industrial)
  await sql`
    CREATE TABLE IF NOT EXISTS orcamentos (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      cliente_id UUID REFERENCES clients(id),
      projeto_id UUID REFERENCES projects(id),
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
      criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `;

  await sql`
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
  `;

  // 14. Production Orders Table (MES)
  await sql`
    CREATE TABLE IF NOT EXISTS ordens_producao (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      op_id TEXT UNIQUE NOT NULL,
      produto TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'PENDENTE',
      pecas INTEGER DEFAULT 0,
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
  `;
  
  await sql`ALTER TABLE ordens_producao ADD COLUMN IF NOT EXISTS tempo_previsto_corte INTEGER DEFAULT 0`.catch(() => {});
  await sql`ALTER TABLE ordens_producao ADD COLUMN IF NOT EXISTS tempo_previsto_montagem INTEGER DEFAULT 0`.catch(() => {});
  await sql`ALTER TABLE ordens_producao ADD COLUMN IF NOT EXISTS data_prevista_entrega TIMESTAMP WITH TIME ZONE`.catch(() => {});
  await sql`ALTER TABLE ordens_producao ADD COLUMN IF NOT EXISTS checklist JSONB DEFAULT '[]'`.catch(() => {});

  // 15. Engineering Modules Table (BOM)
  await sql`
    CREATE TABLE IF NOT EXISTS erp_product_bom (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      nome TEXT,
      codigo_modelo TEXT UNIQUE,
      descricao TEXT,
      regras_calculo JSONB DEFAULT '[]',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `;
  await sql`ALTER TABLE erp_product_bom ADD COLUMN IF NOT EXISTS nome TEXT`.catch(() => {});
  await sql`ALTER TABLE erp_product_bom ADD COLUMN IF NOT EXISTS codigo_modelo TEXT`.catch(() => {});
  await sql`ALTER TABLE erp_product_bom ADD COLUMN IF NOT EXISTS descricao TEXT`.catch(() => {});
  await sql`ALTER TABLE erp_product_bom ADD COLUMN IF NOT EXISTS regras_calculo JSONB DEFAULT '[]'`.catch(() => {});
  await sql`ALTER TABLE erp_product_bom ADD COLUMN IF NOT EXISTS largura_padrao DECIMAL(10,2) DEFAULT 0`.catch(() => {});
  await sql`ALTER TABLE erp_product_bom ADD COLUMN IF NOT EXISTS altura_padrao DECIMAL(10,2) DEFAULT 0`.catch(() => {});
  await sql`ALTER TABLE erp_product_bom ADD COLUMN IF NOT EXISTS profundidade_padrao DECIMAL(10,2) DEFAULT 0`.catch(() => {});
  await sql`ALTER TABLE erp_product_bom ADD COLUMN IF NOT EXISTS horas_mo_padrao DECIMAL(10,2) DEFAULT 0`.catch(() => {});
  await sql`ALTER TABLE erp_product_bom ADD COLUMN IF NOT EXISTS valor_hora_padrao DECIMAL(10,2) DEFAULT 150`.catch(() => {});
  await sql`ALTER TABLE erp_product_bom ADD COLUMN IF NOT EXISTS preco_material_m3_padrao DECIMAL(12,2) DEFAULT 0`.catch(() => {});
  
  // Force Null em colunas legadas que bloqueiam o salvamento
  try {
    await sql`
      DO $$ 
      DECLARE r RECORD;
      BEGIN
          FOR r IN (SELECT column_name FROM information_schema.columns WHERE table_name = 'erp_product_bom' AND is_nullable = 'NO' AND column_name NOT IN ('id', 'nome', 'codigo_modelo')) 
          LOOP
              EXECUTE 'ALTER TABLE erp_product_bom ALTER COLUMN ' || quote_ident(r.column_name) || ' DROP NOT NULL';
          END LOOP;
      END $$;
    `;
  } catch (e) {}

  // [MODULO 1] PLANO DE CORTE
  await sql`
    CREATE TABLE IF NOT EXISTS planos_corte (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      projeto_id UUID REFERENCES projects(id),
      orcamento_id UUID REFERENCES orcamentos(id),
      nome TEXT NOT NULL,
      material_id UUID,
      sku TEXT NOT NULL,
      largura_chapa_mm NUMERIC(8,2) NOT NULL DEFAULT 2750,
      altura_chapa_mm NUMERIC(8,2) NOT NULL DEFAULT 1830,
      espessura_mm NUMERIC(5,2) NOT NULL DEFAULT 18,
      total_chapas_necessarias INTEGER,
      aproveitamento_pct NUMERIC(5,2),
      area_util_m2 NUMERIC(10,4),
      area_desperdicio_m2 NUMERIC(10,4),
      status TEXT DEFAULT 'rascunho',
      criado_em TIMESTAMPTZ DEFAULT NOW(),
      atualizado_em TIMESTAMPTZ DEFAULT NOW()
    )`.catch(() => {});

  await sql`
    CREATE TABLE IF NOT EXISTS plano_corte_pecas (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      plano_id UUID REFERENCES planos_corte(id) ON DELETE CASCADE,
      descricao TEXT NOT NULL,
      largura_mm NUMERIC(8,2) NOT NULL,
      altura_mm NUMERIC(8,2) NOT NULL,
      quantidade INTEGER NOT NULL DEFAULT 1,
      virar_fibra BOOLEAN DEFAULT FALSE,
      ambiente TEXT,
      movel TEXT,
      criado_em TIMESTAMPTZ DEFAULT NOW()
    )`.catch(() => {});

  await sql`
    CREATE TABLE IF NOT EXISTS plano_corte_resultado (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      plano_id UUID REFERENCES planos_corte(id) ON DELETE CASCADE,
      numero_chapa INTEGER NOT NULL,
      peca_id UUID REFERENCES plano_corte_pecas(id),
      pos_x_mm NUMERIC(8,2),
      pos_y_mm NUMERIC(8,2),
      rotacionada BOOLEAN DEFAULT FALSE,
      largura_final_mm NUMERIC(8,2),
      altura_final_mm NUMERIC(8,2)
    )`.catch(() => {});

  // [MODULO 3] POS-VENDA E GARANTIA
  await sql`
    CREATE TABLE IF NOT EXISTS chamados_garantia (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      projeto_id UUID REFERENCES projects(id),
      cliente_id UUID REFERENCES clients(id),
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
    )`.catch(() => {});

  await sql`
    CREATE TABLE IF NOT EXISTS historico_chamado (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      chamado_id UUID REFERENCES chamados_garantia(id) ON DELETE CASCADE,
      status_anterior TEXT,
      status_novo TEXT,
      observacao TEXT,
      criado_em TIMESTAMPTZ DEFAULT NOW()
    )`.catch(() => {});

  return { success: true, message: 'D\'Luxury CRM database initialized with industrial taxonomy and MES support' };
}
