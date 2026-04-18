import { runInitDB } from '../src/api-lib/_init.js';
import { handleAuth, handleUsers } from '../src/api-lib/auth.js';
import { handleClients, handleKanban, handleGoals } from '../src/api-lib/crm.js';
import { handleEstoque } from '../src/api-lib/estoque.js';
// ... (Modo de Reativação Gradual - Fase 2)

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const url = req.url || '';
  const cleanUrl = url.split('?')[0];

  // ROTA DE DIAGNÓSTICO
  if (cleanUrl.endsWith('/ping')) {
    return res.status(200).json({ success: true, message: 'pong (MODO DIAGNÓSTICO: CORE_CRM_LOADED)' });
  }

  try {
    // Rotas Core
    if (cleanUrl.startsWith('/api/auth')) return await handleAuth(req, res);
    if (cleanUrl.startsWith('/api/clients')) return await handleClients(req, res);
    if (cleanUrl.startsWith('/api/estoque')) return await handleEstoque(req, res);
    if (cleanUrl.startsWith('/api/goals')) return await handleGoals(req, res);
    if (cleanUrl.startsWith('/api/kanban')) return await handleKanban(req, res);
    if (cleanUrl.startsWith('/api/users')) return await handleUsers(req, res);

    if (cleanUrl.startsWith('/api/init-db')) {
      await runInitDB();
      return res.status(200).json({ success: true, message: 'Banco de dados inicializado com sucesso' });
    }

    return res.status(503).json({ 
      success: false, 
      error: 'Módulos Industriais em reativação',
      details: 'O Core CRM (Clientes/Estoque) foi reativado. Tentando agora o Industrial.'
    });
  } catch (err: any) {
    console.error('API Error:', err.message);
    return res.status(500).json({ success: false, error: 'Erro nos módulos Core CRM', details: err.message });
  }
}
