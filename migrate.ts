import dotenv from 'dotenv';
dotenv.config();
import { runInitDB } from './src/api-lib/_init.ts';

async function main() {
  console.log('Iniciando migração de banco...');
  const res = await runInitDB();
  console.log('Resultado:', res);
  process.exit(0);
}

main().catch(err => {
  console.error('Erro na migração:', err);
  process.exit(1);
});
