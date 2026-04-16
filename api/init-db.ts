import { sql } from './lib/_db.js';
import bcrypt from 'bcryptjs';

export default async function handler(req: any, res: any) {
  try {
    // 1. Clients Table (backward compatible — keeps old columns + new PF columns)
    await sql`
      CREATE TABLE IF NOT EXISTS clients (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        razao_social TEXT,
        nome TEXT,
        cnpj TEXT,
        cpf TEXT,
        nome_fantasia TEXT,
        porte TEXT,
        data_abertura TEXT,
        cnae_principal TEXT,
        cnae_secundario TEXT,
        natureza_juridica TEXT,
        logradouro TEXT,
        endereco TEXT,
        numero TEXT,
        complemento TEXT,
        cep TEXT,
        bairro TEXT,
        municipio TEXT,
        cidade TEXT,
        uf TEXT,
        email TEXT,
        telefone TEXT,
        situacao_cadastral TEXT,
        data_situacao_cadastral TEXT,
        motivo_situacao TEXT,
        codigo_erp TEXT,
        historico TEXT,
        observacoes TEXT,
        frequencia_compra TEXT,
        tipo_imovel TEXT,
        comodos_interesse TEXT,
        origem TEXT,
        status TEXT DEFAULT 'ativo',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // 2. Projects Table (NEW for marcenaria)
    await sql`
      CREATE TABLE IF NOT EXISTS projects (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        client_id TEXT,
        client_name TEXT,
        ambiente TEXT NOT NULL,
        descricao TEXT,
        valor_estimado DECIMAL(12,2),
        valor_final DECIMAL(12,2),
        prazo_entrega DATE,
        status TEXT NOT NULL DEFAULT 'lead',
        etapa_producao TEXT,
        responsavel TEXT,
        observacoes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // 3. Billings Table
    await sql`
      CREATE TABLE IF NOT EXISTS billings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        nf TEXT,
        pedido TEXT,
        cliente TEXT,
        erp TEXT,
        descricao TEXT,
        tipo TEXT DEFAULT 'entrada',
        project_id TEXT,
        valor DECIMAL(12,2),
        data TEXT,
        categoria TEXT DEFAULT 'outros',
        status TEXT DEFAULT 'PAGO',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // 4. Kanban Items (Visits only now — projects migrated to projects table)
    await sql`
      CREATE TABLE IF NOT EXISTS kanban_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title TEXT NOT NULL,
        subtitle TEXT,
        label TEXT,
        status TEXT NOT NULL,
        type TEXT NOT NULL,
        contact_name TEXT,
        contact_role TEXT,
        email TEXT,
        phone TEXT,
        city TEXT,
        state TEXT,
        value DECIMAL(12,2),
        temperature TEXT,
        visit_date DATE,
        visit_time TEXT,
        visit_type TEXT,
        observations TEXT,
        project_id TEXT,
        date_time TIMESTAMP WITH TIME ZONE,
        visit_format TEXT,
        description TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // 5. Monthly Goals
    await sql`
      CREATE TABLE IF NOT EXISTS monthly_goals (
        period TEXT PRIMARY KEY,
        amount DECIMAL(12,2) NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // 6. System Logs
    await sql`
      CREATE TABLE IF NOT EXISTS system_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        type TEXT NOT NULL,
        severity TEXT NOT NULL,
        message TEXT NOT NULL,
        timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Add new columns if they don't exist (safe migrations)
    await sql`ALTER TABLE clients ADD COLUMN IF NOT EXISTS nome TEXT`.catch(() => {});
    await sql`ALTER TABLE clients ADD COLUMN IF NOT EXISTS cpf TEXT`.catch(() => {});
    await sql`ALTER TABLE clients ADD COLUMN IF NOT EXISTS endereco TEXT`.catch(() => {});
    await sql`ALTER TABLE clients ADD COLUMN IF NOT EXISTS cidade TEXT`.catch(() => {});
    await sql`ALTER TABLE clients ADD COLUMN IF NOT EXISTS tipo_imovel TEXT`.catch(() => {});
    await sql`ALTER TABLE clients ADD COLUMN IF NOT EXISTS comodos_interesse TEXT`.catch(() => {});
    await sql`ALTER TABLE clients ADD COLUMN IF NOT EXISTS origem TEXT`.catch(() => {});
    await sql`ALTER TABLE clients ADD COLUMN IF NOT EXISTS observacoes TEXT`.catch(() => {});
    await sql`ALTER TABLE clients ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'ativo'`.catch(() => {});
    await sql`ALTER TABLE billings ADD COLUMN IF NOT EXISTS descricao TEXT`.catch(() => {});
    await sql`ALTER TABLE billings ADD COLUMN IF NOT EXISTS tipo TEXT DEFAULT 'entrada'`.catch(() => {});
    await sql`ALTER TABLE billings ADD COLUMN IF NOT EXISTS project_id TEXT`.catch(() => {});
    await sql`ALTER TABLE billings ADD COLUMN IF NOT EXISTS categoria TEXT DEFAULT 'outros'`.catch(() => {});
    await sql`ALTER TABLE kanban_items ADD COLUMN IF NOT EXISTS project_id TEXT`.catch(() => {});
    await sql`ALTER TABLE orcamentos ADD COLUMN IF NOT EXISTS materiais_consumidos JSONB DEFAULT '[]'`.catch(() => {});

    // Migrações Fiscais e Precificação (Novo)
    await sql`ALTER TABLE materiais ADD COLUMN IF NOT EXISTS cfop TEXT`.catch(() => {});
    await sql`ALTER TABLE materiais ADD COLUMN IF NOT EXISTS ncm TEXT`.catch(() => {});
    await sql`ALTER TABLE materiais ADD COLUMN IF NOT EXISTS icms NUMERIC`.catch(() => {});
    await sql`ALTER TABLE materiais ADD COLUMN IF NOT EXISTS icms_st NUMERIC`.catch(() => {});
    await sql`ALTER TABLE materiais ADD COLUMN IF NOT EXISTS ipi NUMERIC`.catch(() => {});
    await sql`ALTER TABLE materiais ADD COLUMN IF NOT EXISTS pis NUMERIC`.catch(() => {});
    await sql`ALTER TABLE materiais ADD COLUMN IF NOT EXISTS cofins NUMERIC`.catch(() => {});
    await sql`ALTER TABLE materiais ADD COLUMN IF NOT EXISTS origem INTEGER DEFAULT 0`.catch(() => {});
    await sql`ALTER TABLE materiais ADD COLUMN IF NOT EXISTS preco_venda NUMERIC`.catch(() => {});
    await sql`ALTER TABLE materiais ADD COLUMN IF NOT EXISTS margem_lucro NUMERIC`.catch(() => {});
    await sql`ALTER TABLE materiais ADD COLUMN IF NOT EXISTS largura_mm NUMERIC`.catch(() => {});
    await sql`ALTER TABLE materiais ADD COLUMN IF NOT EXISTS altura_mm NUMERIC`.catch(() => {});
    await sql`ALTER TABLE materiais ADD COLUMN IF NOT EXISTS marca TEXT`.catch(() => {});

    await sql`ALTER TABLE itens_orcamento ADD COLUMN IF NOT EXISTS cfop TEXT`.catch(() => {});
    await sql`ALTER TABLE itens_orcamento ADD COLUMN IF NOT EXISTS ncm TEXT`.catch(() => {});
    await sql`ALTER TABLE itens_orcamento ADD COLUMN IF NOT EXISTS icms NUMERIC`.catch(() => {});
    await sql`ALTER TABLE itens_orcamento ADD COLUMN IF NOT EXISTS icms_st NUMERIC`.catch(() => {});
    await sql`ALTER TABLE itens_orcamento ADD COLUMN IF NOT EXISTS ipi NUMERIC`.catch(() => {});
    await sql`ALTER TABLE itens_orcamento ADD COLUMN IF NOT EXISTS pis NUMERIC`.catch(() => {});
    await sql`ALTER TABLE itens_orcamento ADD COLUMN IF NOT EXISTS cofins NUMERIC`.catch(() => {});
    await sql`ALTER TABLE itens_orcamento ADD COLUMN IF NOT EXISTS origem INTEGER DEFAULT 0`.catch(() => {});

    // ─── NOVAS TABELAS PARA COMPOSIÇÃO TÉCNICA ────────────────

    // 1. Ambientes do Orçamento
    await sql`
      CREATE TABLE IF NOT EXISTS orcamento_ambientes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        orcamento_id UUID REFERENCES orcamentos(id) ON DELETE CASCADE,
        nome TEXT NOT NULL,
        ordem INTEGER DEFAULT 0,
        criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // 2. Móveis do Ambiente
    await sql`
      CREATE TABLE IF NOT EXISTS orcamento_moveis (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        ambiente_id UUID REFERENCES orcamento_ambientes(id) ON DELETE CASCADE,
        nome TEXT NOT NULL,
        tipo_movel TEXT, -- armario, gaveteiro, painel, balcao, estante, bancada, nicho, outro
        largura_total_cm NUMERIC(8,2),
        altura_total_cm NUMERIC(8,2),
        profundidade_total_cm NUMERIC(8,2),
        observacoes TEXT,
        ordem INTEGER DEFAULT 0,
        criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // 3. Peças do Móvel (Chapas/Componentes)
    await sql`
      CREATE TABLE IF NOT EXISTS orcamento_pecas (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        movel_id UUID REFERENCES orcamento_moveis(id) ON DELETE CASCADE,
        material_id UUID REFERENCES materiais(id),
        sku TEXT NOT NULL,
        descricao_peca TEXT NOT NULL,
        largura_cm NUMERIC(8,2) NOT NULL,
        altura_cm NUMERIC(8,2) NOT NULL,
        quantidade INTEGER NOT NULL DEFAULT 1,
        m2_unitario NUMERIC(10,6),
        m2_total NUMERIC(10,6),
        fator_perda_pct NUMERIC(5,4) DEFAULT 0.10,
        m2_com_perda NUMERIC(10,6),
        preco_custo_m2 NUMERIC(10,4),
        custo_total_peca NUMERIC(10,2),
        metros_fita_borda NUMERIC(8,2) DEFAULT 0,
        fita_material_id UUID REFERENCES materiais(id),
        criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // 4. Ferragens e Acessórios
    await sql`
      CREATE TABLE IF NOT EXISTS orcamento_ferragens (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        movel_id UUID REFERENCES orcamento_moveis(id) ON DELETE CASCADE,
        material_id UUID REFERENCES materiais(id),
        sku TEXT NOT NULL,
        descricao TEXT,
        quantidade NUMERIC(8,2) NOT NULL,
        unidade TEXT NOT NULL,
        preco_custo_unitario NUMERIC(10,2),
        custo_total NUMERIC(10,2),
        criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // 5. Custos Extras (Mão de Obra, Frete, etc)
    await sql`
      CREATE TABLE IF NOT EXISTS orcamento_custos_extras (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        orcamento_id UUID REFERENCES orcamentos(id) ON DELETE CASCADE,
        descricao TEXT NOT NULL,
        tipo TEXT, -- mao_de_obra_producao, mao_de_obra_instalacao, frete, projeto, outro
        forma_calculo TEXT, -- valor_fixo, percentual_material, por_m2
        percentual_ou_valor NUMERIC(10,4),
        m2_total_referencia NUMERIC(10,4),
        valor_calculado NUMERIC(10,2),
        criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // 6. Configurações de Precificação (Global)
    await sql`
      CREATE TABLE IF NOT EXISTS configuracoes_precificacao (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        fator_perda_padrao NUMERIC(5,4) DEFAULT 0.10,
        markup_padrao NUMERIC(5,4) DEFAULT 1.80,
        aliquota_imposto NUMERIC(5,4) DEFAULT 0.00,
        mo_producao_pct_padrao NUMERIC(5,4) DEFAULT 0.30,
        mo_instalacao_pct_padrao NUMERIC(5,4) DEFAULT 0.15,
        margem_minima_alerta NUMERIC(5,4) DEFAULT 0.25,
        atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Seed Configuração Padrão se não existir
     try {
      const configCount = await sql`SELECT COUNT(*) as count FROM configuracoes_precificacao`;
      if (parseInt(configCount[0]?.count ?? '0', 10) === 0) {
        await sql`
          INSERT INTO configuracoes_precificacao (
            fator_perda_padrao, markup_padrao, aliquota_imposto, 
            mo_producao_pct_padrao, mo_instalacao_pct_padrao, margem_minima_alerta
          ) VALUES (0.10, 1.80, 0.00, 0.30, 0.15, 0.25)
        `;
      }
    } catch (err) { console.error('Seed config erro:', err); }


    // 7. Users Table
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // 8. Inventory Table
    await sql`
      CREATE TABLE IF NOT EXISTS inventory (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        unit TEXT NOT NULL,
        quantity DECIMAL(10,2) NOT NULL DEFAULT 0,
        min_quantity DECIMAL(10,2) NOT NULL DEFAULT 0,
        location TEXT,
        price DECIMAL(10,2) DEFAULT 0,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    // 9. Condições de Pagamento
    await sql`
      CREATE TABLE IF NOT EXISTS condicoes_pagamento (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        nome TEXT NOT NULL,
        n_parcelas INTEGER DEFAULT 1,
        ativo BOOLEAN DEFAULT true,
        criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Migração: se tabela já existia com coluna 'status' TEXT ao invés de 'ativo' BOOLEAN
    await sql`ALTER TABLE condicoes_pagamento ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT true`.catch(() => {});

    // Seed condições de pagamento padrão (não pode bloquear criação das tabelas seguintes)
    try {
      const condicoesCount = await sql`SELECT COUNT(*) as count FROM condicoes_pagamento`;
      if (parseInt(condicoesCount[0]?.count ?? '0', 10) === 0) {
        const condicoesSeed = [
          ['À Vista', 1], ['2x sem juros', 2], ['3x', 3], ['4x', 4],
          ['5x', 5], ['6x', 6], ['8x', 8], ['10x', 10], ['12x', 12],
          ['Cartão de Crédito', 1], ['Boleto 30/60/90', 3]
        ];
        for (const [nome, parcelas] of condicoesSeed) {
          await sql`INSERT INTO condicoes_pagamento (nome, n_parcelas) VALUES (${nome}, ${parcelas})`.catch(() => {});
        }
      }
    } catch (seedErr) {
      console.error('Seed condições falhou (não-bloqueante):', seedErr);
    }

    // 10. Orcamentos
    await sql`
      CREATE TABLE IF NOT EXISTS orcamentos (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        cliente_id UUID REFERENCES clients(id),
        projeto_id TEXT, -- Pode vir do novo projects(uuid) ou do kanban antigo (integer)
        numero TEXT UNIQUE NOT NULL,
        status TEXT DEFAULT 'rascunho',
        valor_base NUMERIC(12,2) DEFAULT 0,
        taxa_mensal NUMERIC(5,4) DEFAULT 0,
        condicao_pagamento_id UUID REFERENCES condicoes_pagamento(id),
        valor_final NUMERIC(12,2) DEFAULT 0,
        prazo_entrega_dias INTEGER DEFAULT 45,
        prazo_tipo TEXT DEFAULT 'padrao',
        adicional_urgencia_pct NUMERIC(5,4) DEFAULT 0.15,
        observacoes TEXT,
        materiais_consumidos JSONB DEFAULT '[]',
        criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // 11. Itens Orcamento
    await sql`
      CREATE TABLE IF NOT EXISTS itens_orcamento (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        orcamento_id UUID REFERENCES orcamentos(id) ON DELETE CASCADE,
        descricao TEXT,
        ambiente TEXT,
        largura_cm NUMERIC(10,2),
        altura_cm NUMERIC(10,2),
        profundidade_cm NUMERIC(10,2),
        material TEXT,
        acabamento TEXT,
        quantidade INTEGER DEFAULT 1,
        valor_unitario NUMERIC(12,2) DEFAULT 0,
        valor_total NUMERIC(12,2) DEFAULT 0
      )
    `;

    // 12. Fornecedores
    await sql`
      CREATE TABLE IF NOT EXISTS fornecedores (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        nome TEXT NOT NULL,
        cnpj TEXT,
        contato TEXT,
        telefone TEXT,
        email TEXT,
        cidade TEXT,
        estado TEXT,
        observacoes TEXT,
        ativo BOOLEAN DEFAULT true,
        criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // 13. Categorias de Material
    await sql`
      CREATE TABLE IF NOT EXISTS categorias_material (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        nome TEXT NOT NULL,
        slug TEXT UNIQUE NOT NULL,
        icone TEXT,
        criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // 14. Materiais
    await sql`
      CREATE TABLE IF NOT EXISTS materiais (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        sku TEXT UNIQUE NOT NULL,
        nome TEXT NOT NULL,
        descricao TEXT,
        categoria_id UUID REFERENCES categorias_material(id),
        subcategoria TEXT,
        unidade_compra TEXT NOT NULL,
        unidade_uso TEXT NOT NULL,
        fator_conversao NUMERIC(10,4) DEFAULT 1,
        estoque_atual NUMERIC(10,4) DEFAULT 0,
        estoque_minimo NUMERIC(10,4) DEFAULT 0,
        preco_custo NUMERIC(10,2) DEFAULT 0,
        fornecedor_principal TEXT,
        observacoes TEXT,
        ativo BOOLEAN DEFAULT true,
        criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // 15. Movimentações de Estoque
    await sql`
      CREATE TABLE IF NOT EXISTS movimentacoes_estoque (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        material_id UUID REFERENCES materiais(id),
        tipo TEXT NOT NULL,
        quantidade NUMERIC(10,4) NOT NULL,
        quantidade_uso NUMERIC(10,4),
        motivo TEXT,
        projeto_id UUID REFERENCES projects(id),
        orcamento_id UUID REFERENCES orcamentos(id),
        preco_unitario NUMERIC(10,2),
        valor_total NUMERIC(10,2),
        estoque_antes NUMERIC(10,4),
        estoque_depois NUMERIC(10,4),
        criado_por TEXT,
        criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Seed Categorias se vazio
    try {
      const catCountRes = await sql`SELECT count(*) as count FROM categorias_material`;
      if (parseInt(catCountRes[0].count, 10) === 0) {
        await sql`
          INSERT INTO categorias_material (slug, nome, icone) VALUES 
          ('chapas', 'Chapas (MDF/MDP/OSB)', 'Layers'),
          ('fitas_borda', 'Fitas de Borda', 'Ruler'),
          ('ferragens_dobradicas', 'Ferragens — Dobradiças', 'DoorOpen'),
          ('ferragens_corredicas', 'Ferragens — Corrediças e Trilhos', 'Dices'),
          ('fixacoes', 'Fixações (Parafusos/Cavilhas)', 'Pin'),
          ('puxadores', 'Puxadores e Perfis', 'Hand'),
          ('acabamentos', 'Acabamentos e Colas', 'Paintbrush'),
          ('vidros', 'Vidros e Espelhos', 'Layout')
        `;
      }
    } catch (err) { console.log('Cat Seed error:', err); }

    // Seed Materiais Iniciais se vazio
    try {
      const matCountRes = await sql`SELECT count(*) as count FROM materiais`;
      if (parseInt(matCountRes[0].count, 10) === 0) {
        const cats = await sql`SELECT id, slug FROM categorias_material`;
        const getCatId = (slug: string) => cats.find(c => c.slug === slug)?.id;

        const chapasId = getCatId('chapas');
        if (chapasId) {
          await sql`
            INSERT INTO materiais (sku, nome, categoria_id, unidade_compra, unidade_uso, fator_conversao) VALUES 
            ('CHP-MDF-15-BP-BRC-2750x1830', 'Chapa MDF 15mm BP Branco Polar 2750×1830mm', ${chapasId}, 'chapa', 'm2', 5.0325),
            ('CHP-MDF-18-BP-BRC-2750x1830', 'Chapa MDF 18mm BP Branco Polar 2750×1830mm', ${chapasId}, 'chapa', 'm2', 5.0325),
            ('CHP-MDF-18-BP-GFT-2750x1830', 'Chapa MDF 18mm BP Grafite 2750×1830mm', ${chapasId}, 'chapa', 'm2', 5.0325),
            ('CHP-MDF-18-CRU-2750x1830', 'Chapa MDF 18mm Cru 2750×1830mm', ${chapasId}, 'chapa', 'm2', 5.0325),
            ('CHP-MDP-15-BP-BRC-2750x1830', 'Chapa MDP 15mm BP Branco 2750×1830mm', ${chapasId}, 'chapa', 'm2', 5.0325),
            ('CHP-OSB-18-2440x1220', 'Chapa OSB 18mm 2440×1220mm', ${chapasId}, 'chapa', 'm2', 2.9768)
          `;
        }

        const fitasId = getCatId('fitas_borda');
        if (fitasId) {
          await sql`
            INSERT INTO materiais (sku, nome, categoria_id, unidade_compra, unidade_uso, fator_conversao) VALUES 
            ('FTA-PVC-22x05-BRC', 'Fita PVC 22mm×0,5mm Branco Polar', ${fitasId}, 'rolo 50m', 'm', 50),
            ('FTA-PVC-22x10-GFT', 'Fita PVC 22mm×1,0mm Grafite', ${fitasId}, 'rolo 50m', 'm', 50),
            ('FTA-PVC-35x10-NOG', 'Fita PVC 35mm×1,0mm Nogueira', ${fitasId}, 'rolo 50m', 'm', 50),
            ('FTA-ABS-22x15-PTO', 'Fita ABS 22mm×1,5mm Preto', ${fitasId}, 'rolo 50m', 'm', 50)
          `;
        }
        
        const dobId = getCatId('ferragens_dobradicas');
        if (dobId) {
          await sql`
            INSERT INTO materiais (sku, nome, categoria_id, unidade_compra, unidade_uso, fator_conversao) VALUES 
            ('FRG-DOB-35-110-NKL', 'Dobradiça 35mm 110° Níquel', ${dobId}, 'caixa c/20un', 'par', 10),
            ('FRG-DOB-35-165-PTO', 'Dobradiça 35mm 165° Preto', ${dobId}, 'caixa c/20un', 'par', 10),
            ('FRG-DOB-AMO-35-NKL', 'Dobradiça Amortecida 35mm Níquel', ${dobId}, 'caixa c/20un', 'par', 10)
          `;
        }

        const corId = getCatId('ferragens_corredicas');
        if (corId) {
          await sql`
            INSERT INTO materiais (sku, nome, categoria_id, unidade_compra, unidade_uso, fator_conversao) VALUES 
            ('FRG-COR-300-SFT-BRC', 'Corrediça Soft Close 300mm Branco', ${corId}, 'par', 'par', 1),
            ('FRG-COR-400-SFT-NKL', 'Corrediça Soft Close 400mm Níquel', ${corId}, 'par', 'par', 1),
            ('FRG-COR-450-SFT-NKL', 'Corrediça Soft Close 450mm Níquel', ${corId}, 'par', 'par', 1)
          `;
        }

        const fixId = getCatId('fixacoes');
        if (fixId) {
          await sql`
            INSERT INTO materiais (sku, nome, categoria_id, unidade_compra, unidade_uso, fator_conversao) VALUES 
            ('FIX-PAR-35x40-PZ', 'Parafuso MDF 3,5×40mm Zincado', ${fixId}, 'caixa c/200un', 'un', 200),
            ('FIX-PAR-40x50-PZ', 'Parafuso MDF 4,0×50mm Zincado', ${fixId}, 'caixa c/200un', 'un', 200),
            ('FIX-CAV-08x30', 'Cavilha Madeira 8mm×30mm', ${fixId}, 'caixa c/500un', 'un', 500),
            ('FIX-CON-MIN-ZNC', 'Conector Minifix Zincado', ${fixId}, 'caixa c/100un', 'un', 100),
            ('FIX-CAM-M6x15', 'Câmara Minifix M6×15mm', ${fixId}, 'caixa c/100un', 'un', 100)
          `;
        }

        const puxId = getCatId('puxadores');
        if (puxId) {
          await sql`
            INSERT INTO materiais (sku, nome, categoria_id, unidade_compra, unidade_uso, fator_conversao) VALUES 
            ('PUX-BAR-128-NKL', 'Puxador Barra 128mm Níquel Escovado', ${puxId}, 'un', 'un', 1),
            ('PUX-BAR-192-PTO', 'Puxador Barra 192mm Preto Fosco', ${puxId}, 'un', 'un', 1),
            ('PRF-ALM-270-BRC', 'Perfil Alumínio puxador 270cm Branco', ${puxId}, 'barra', 'barra', 1)
          `;
        }

        const acbId = getCatId('acabamentos');
        if (acbId) {
          await sql`
            INSERT INTO materiais (sku, nome, categoria_id, unidade_compra, unidade_uso, fator_conversao) VALUES 
            ('ACB-COL-EVA-1KG', 'Cola EVA para bordadeira 1kg', ${acbId}, 'un', 'kg', 1),
            ('ACB-SIL-300ML', 'Silicone Neutro Transparente 300ml', ${acbId}, 'un', 'un', 1),
            ('ACB-LIX-120', 'Lixa d''água grão 120', ${acbId}, 'un', 'un', 1),
            ('ACB-LIX-220', 'Lixa d''água grão 220', ${acbId}, 'un', 'un', 1)
          `;
        }
      }
    } catch (err) { console.log('Mat Seed error:', err); }

    // Seed Condições de Pagamento se vazio
    try {
      const condCountRes = await sql`SELECT count(*) as count FROM condicoes_pagamento`;
      if (parseInt(condCountRes[0].count, 10) === 0) {
        await sql`
          INSERT INTO condicoes_pagamento (nome, n_parcelas) VALUES 
          ('À vista (PIX/Dinheiro)', 1),
          ('50% entrada + 50% na entrega', 1),
          ('30/60 dias', 2),
          ('3x cartão', 3),
          ('4x cartão', 4),
          ('6x cartão', 6),
          ('12x cartão', 12)
        `;
      }
    } catch (err) {
      console.log('Seed error (ignoring):', err);
    }

    // Initialize Default Admin if users table is empty
    const usersCountRes = await sql`SELECT count(*) as count FROM users`;
    const usersCount = parseInt(usersCountRes[0].count, 10);
    
    if (usersCount === 0) {
      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash('admin123', salt);
      await sql`
        INSERT INTO users (name, email, password_hash, role)
        VALUES ('Administrador', 'admin@dluxury.com', ${hash}, 'admin')
      `;
      console.log('Default admin created: admin@dluxury.com / admin123');
    }

    return res.status(200).json({ success: true, message: 'D\'Luxury CRM database initialized' });
  } catch (e: any) {
    console.error('Initialization Error:', e);
    return res.status(500).json({ success: false, error: e.message, stack: e.stack });
  }
}
