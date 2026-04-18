import { runInitDB } from '../src/api-lib/_init.js';
// import { handleAuth, handleUsers } from '../src/api-lib/auth.js';
// ... (Modo de Reativação Gradual)

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const url = req.url || '';
  const cleanUrl = url.split('?')[0];

  // ROTA DE DIAGNÓSTICO
  if (cleanUrl.endsWith('/ping')) {
    return res.status(200).json({ success: true, message: 'pong (MODO DIAGNÓSTICO: DB_INIT_LOADED)' });
  }

  try {
    if (cleanUrl.startsWith('/api/init-db')) {
      await runInitDB();
      return res.status(200).json({ success: true, message: 'Banco de dados inicializado com sucesso' });
    }

    return res.status(503).json({ 
      success: false, 
      error: 'Módulos em reativação',
      details: 'A base do sistema (DB) foi reativada. Tentando agora o restante.'
    });
  } catch (err: any) {
    console.error('API Init Error:', err.message);
    return res.status(500).json({ success: false, error: 'Erro fatal na base da API', details: err.message });
  }
}
