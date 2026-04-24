import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
dotenv.config();

const sql = neon(process.env.DATABASE_URL);

async function checkDetailedData() {
  console.log('=== CLIENTS (amostra) ===');
  const clients = await sql`SELECT * FROM clients LIMIT 3`;
  console.log(JSON.stringify(clients, null, 2));

  console.log('\n=== FORNECEDORES (amostra) ===');
  const forn = await sql`SELECT * FROM fornecedores LIMIT 3`;
  console.log(JSON.stringify(forn, null, 2));

  console.log('\n=== MATERIAIS (amostra) ===');
  const mats = await sql`SELECT * FROM materiais LIMIT 3`;
  console.log(JSON.stringify(mats, null, 2));

  console.log('\n=== ERP_SKUS (amostra) ===');
  const skus = await sql`SELECT * FROM erp_skus LIMIT 3`;
  console.log(JSON.stringify(skus, null, 2));
  
  console.log('\n=== ORCAMENTOS (amostra) ===');
  const orc = await sql`SELECT * FROM orcamentos LIMIT 3`;
  console.log(JSON.stringify(orc, null, 2));
  
  console.log('\n=== USERS (amostra) ===');
  const users = await sql`SELECT * FROM users LIMIT 3`;
  console.log(JSON.stringify(users, null, 2));
}

checkDetailedData().catch(console.error);