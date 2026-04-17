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

  return { success: true, message: 'D\'Luxury CRM database initialized' };
}

