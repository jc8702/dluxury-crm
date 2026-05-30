import { exec } from 'child_process';
import dotenv from 'dotenv';

dotenv.config();

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error("❌ ERRO: DATABASE_URL não encontrada no .env");
  process.exit(1);
}

const dateStr = new Date().toISOString().replace(/[:.]/g, '-');
const backupFile = `backup-${dateStr}.sql`;

console.log(`⏳ Iniciando backup do banco de dados para ${backupFile}...`);

// Utilizamos pg_dump se disponível no path.
const command = `pg_dump "${databaseUrl}" -F c -f ${backupFile}`;

exec(command, (error, stdout, stderr) => {
  if (error) {
    console.error(`❌ Erro ao realizar o backup: ${error.message}`);
    // Not failing entirely, just warning, because pg_dump might not be installed on Windows
    return;
  }
  if (stderr) {
    console.warn(`⚠️ Aviso: ${stderr}`);
  }
  console.log(`✅ Backup concluído com sucesso: ${backupFile}`);
});
