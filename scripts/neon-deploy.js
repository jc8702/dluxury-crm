import { neon } from '@neondatabase/serverless';
import fs from 'fs';

const DATABASE_URL = "postgresql://neondb_owner:npg_Xp2nuVN0lrwH@ep-winter-unit-acsitpn6-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require";

async function run() {
  console.log('🚀 Iniciando Migrações no Neon (Modo Tagged Template)...');
  const sql = neon(DATABASE_URL);

  try {
    const scripts = [
      './src/db/migrations/phase5_indexes_and_constraints.sql',
      './src/db/migrations/phase5_industrial_stock.sql'
    ];

    for (const scriptPath of scripts) {
      console.log(`📦 Executando script completo: ${scriptPath}`);
      const content = fs.readFileSync(scriptPath, 'utf8');
      
      // Simular chamada de tagged template passando o array de strings
      // O driver neon espera (strings, ...values)
      await sql([content]);
      console.log(`✅ Script ${scriptPath} aplicado!`);
    }

    console.log('✅ Neon: Migrações concluídas com sucesso!');
  } catch (err) {
    console.error('❌ Neon: Erro durante a migração:', err.message);
    process.exit(1);
  }
}

run();
