import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
dotenv.config();

const sql = neon(process.env.DATABASE_URL);

async function checkDetailedData() {
  console.log('=== CONTAGEM TOTAL ===');
  
  const clients = await sql`SELECT COUNT(*) as c FROM clients`;
  console.log('Clients:', clients[0].c);

  const forn = await sql`SELECT COUNT(*) as c FROM fornecedores`;
  console.log('Fornecedores:', forn[0].c);

  const mats = await sql`SELECT COUNT(*) as c FROM materiais`;
  console.log('Materiais:', mats[0].c);

  const skus = await sql`SELECT COUNT(*) as c FROM erp_skus`;
  console.log('ERP_SKUs:', skus[0].c);
  
  const orc = await sql`SELECT COUNT(*) as c FROM orcamentos`;
  console.log('Orcamentos:', orc[0].c);
  
  const users = await sql`SELECT COUNT(*) as c FROM users`;
  console.log('Users:', users[0].c);
  
  // Verificar se a tabela projects existe
  try {
    const proj = await sql`SELECT COUNT(*) as c FROM projects`;
    console.log('Projetos:', proj[0].c);
  } catch(e) {
    console.log('Projetos: TABELA NÃO EXISTE');
  }
  
  // Verificar se a tabela planos_de_corte existe
  try {
    const planos = await sql`SELECT COUNT(*) as c FROM planos_de_corte`;
    console.log('Planos de Corte:', planos[0].c);
  } catch(e) {
    console.log('Planos de Corte: TABELA NÃO EXISTE');
  }
}

checkDetailedData().catch(console.error);