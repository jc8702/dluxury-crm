import { sql } from './lib/_db.js';

export default async function handler(req: any, res: any) {
  try {
    // 1. Clients Table
    await sql`
      CREATE TABLE IF NOT EXISTS clients (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        razao_social TEXT NOT NULL,
        cnpj TEXT,
        nome_fantasia TEXT,
        porte TEXT,
        data_abertura TEXT,
        cnae_principal TEXT,
        cnae_secundario TEXT,
        natureza_juridica TEXT,
        logradouro TEXT,
        numero TEXT,
        complemento TEXT,
        cep TEXT,
        bairro TEXT,
        municipio TEXT,
        uf TEXT,
        email TEXT,
        telefone TEXT,
        situacao_cadastral TEXT,
        data_situacao_cadastral TEXT,
        motivo_situacao TEXT,
        codigo_erp TEXT,
        historico TEXT,
        frequencia_compra TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // 2. Billings Table
    await sql`
      CREATE TABLE IF NOT EXISTS billings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        nf TEXT NOT NULL,
        pedido TEXT,
        cliente TEXT,
        erp TEXT,
        valor DECIMAL(12,2),
        data TEXT,
        status TEXT DEFAULT 'FATURADO',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // 3. Kanban Items (Projects & Visits)
    await sql`
      CREATE TABLE IF NOT EXISTS kanban_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title TEXT NOT NULL,
        subtitle TEXT,
        label TEXT,
        status TEXT NOT NULL,
        type TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // 4. Monthly Goals
    await sql`
      CREATE TABLE IF NOT EXISTS monthly_goals (
        period TEXT PRIMARY KEY,
        amount DECIMAL(12,2) NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // 5. Logs
    await sql`
      CREATE TABLE IF NOT EXISTS system_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        type TEXT NOT NULL,
        severity TEXT NOT NULL,
        message TEXT NOT NULL,
        timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `;

    return res.status(200).json({ success: true, message: 'Database initialized successfully' });
  } catch (e: any) {
    console.error('Initialization Error:', e);
    return res.status(500).json({ success: false, error: e.message });
  }
}
