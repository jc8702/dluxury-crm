
import { runInitDB } from './src/api-lib/_init.js';
import dotenv from 'dotenv';
dotenv.config();

async function start() {
  console.log('Iniciando migração de emergência...');
  const result = await runInitDB();
  console.log('Resultado:', result);
  process.exit(0);
}

start().catch(err => {
  console.error('Falha na migração:', err);
  process.exit(1);
});
