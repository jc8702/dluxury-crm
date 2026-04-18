// import { runInitDB } from '../src/api-lib/_init.js';
// import { handleAuth, handleUsers } from '../src/api-lib/auth.js';
// ... (Comentados para isolamento técnico)

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const url = req.url || '';
  const cleanUrl = url.split('?')[0];

  // ROTA DE DIAGNÓSTICO (ÚNICA ATIVA NO MODO DE SEGURANÇA)
  if (cleanUrl.endsWith('/ping')) {
    return res.status(200).json({ 
      success: true, 
      message: 'pong (MODO DE SEGURANÇA ATIVO)', 
      timestamp: new Date().toISOString(),
      env_check: {
        has_db: !!process.env.DATABASE_URL
      }
    });
  }

  return res.status(503).json({ 
    success: false, 
    error: 'Sistema em Manutenção Técnica para Diagnóstico',
    details: 'Aguarde alguns minutos enquanto isolamos a falha 500.'
  });
}
