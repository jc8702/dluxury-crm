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

    // 10. Orcamentos
    await sql`
      CREATE TABLE IF NOT EXISTS orcamentos (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        cliente_id UUID REFERENCES clients(id),
        projeto_id UUID REFERENCES projects(id),
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
    return res.status(500).json({ success: false, error: e.message });
  }
}
