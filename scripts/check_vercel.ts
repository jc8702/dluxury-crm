import { neon } from '@neondatabase/serverless';

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) throw new Error('No DATABASE_URL');
const sql = neon(dbUrl);

async function check() {
  console.log('=== Verificando banco VERCEL ===');
  
  const col = await sql`
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns 
    WHERE table_name = 'eventos' AND column_name = 'objetivo'
  `;
  console.log('Coluna objetivo:', col[0]);

  const enums = await sql`
    SELECT typname, enumlabel 
    FROM pg_type t 
    JOIN pg_enum e ON t.oid = e.enumtypid  
    WHERE typname = 'tipo_objetivo'
  `;
  console.log('ENUMs:', enums);
  
  process.exit(0);
}
check();