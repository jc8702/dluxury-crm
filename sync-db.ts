import * as dotenv from 'dotenv';
dotenv.config();

const { runInitDB } = await import('./src/api-lib/_init.js');
runInitDB().then(r => { console.log(r); process.exit(0); }).catch(e => { console.error(e); process.exit(1); });
