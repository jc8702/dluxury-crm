import { runInitDB } from '../src/api-lib/_init.js';
import { handleAuth, handleUsers } from '../src/api-lib/auth.js';
import { handleClients, handleKanban, handleGoals } from '../src/api-lib/crm.js';
import { handleEstoque } from '../src/api-lib/estoque.js';
import { handleBillings } from '../src/api-lib/financeiro.js';
import { handleOrcamentos, handleOrcamentoTecnico, handleCondicoesPagamento } from '../src/api-lib/orcamentos.js';
// O CoPilot permanece opcional para evitar boots pesados
import { handleProjects, handleReports, handleEngineering, handleSKUs, handleSimulations } from '../src/api-lib/projects.js';
import { handleProduction } from '../src/api-lib/production.js';
import { handleAfterSales } from '../src/api-lib/after_sales.js';
import { handleCompras } from '../src/api-lib/compras.js';
import { handleAprovacao } from '../src/api-lib/aprovacao.js';
import { handleAgenda } from '../src/api-lib/agenda.js';
import { handleNotificacoes } from '../src/api-lib/notificacoes.js';
import { handlePlanoCorte } from '../src/api-lib/planocorte.js';

export default async function handler(req: any, res: any) {
  // CORS Setup
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const url = req.url || '';
  const cleanUrl = url.split('?')[0];

  // ROTA DE DIAGNÓSTICO
  if (cleanUrl.endsWith('/ping')) {
    return res.status(200).json({ success: true, message: 'pong (SISTEMA_TOTALMENTE_OPERACIONAL)' });
  }

  try {
    if (cleanUrl.startsWith('/api/auth')) return await handleAuth(req, res);
    if (cleanUrl.startsWith('/api/clients')) return await handleClients(req, res);
    if (cleanUrl.startsWith('/api/billings')) return await handleBillings(req, res);
    if (cleanUrl.startsWith('/api/estoque')) return await handleEstoque(req, res);
    if (cleanUrl.startsWith('/api/orcamentos')) return await handleOrcamentos(req, res);
    
    // Lazy load para módulos pesados de IA
    if (cleanUrl.startsWith('/api/ai-copilot')) {
      const { handleAICopilot } = await import('../src/api-lib/copilot.js');
      return await handleAICopilot(req, res);
    }
    if (cleanUrl.startsWith('/api/ai/parser')) {
      if (req.method !== 'POST') return res.status(405).end();
      const { handleAIParser } = await import('../src/api-lib/copilot.js');
      return await handleAIParser(req, res);
    }

    if (cleanUrl.startsWith('/api/condicoes-pagamento')) return await handleCondicoesPagamento(req, res);
    if (cleanUrl.startsWith('/api/goals')) return await handleGoals(req, res);
    if (cleanUrl.startsWith('/api/kanban')) return await handleKanban(req, res);
    if (cleanUrl.startsWith('/api/engineering')) return await handleEngineering(req, res);
    if (cleanUrl.startsWith('/api/skus')) return await handleSKUs(req, res);
    if (cleanUrl.startsWith('/api/reports')) return await handleReports(req, res);
    if (cleanUrl.startsWith('/api/orcamento-tecnico')) return await handleOrcamentoTecnico(req, res);
    if (cleanUrl.startsWith('/api/projects')) return await handleProjects(req, res);
    if (cleanUrl.startsWith('/api/production')) return await handleProduction(req, res);
    if (cleanUrl.startsWith('/api/simulations')) return await handleSimulations(req, res);
    if (cleanUrl.startsWith('/api/after-sales')) return await handleAfterSales(req, res);
    if (cleanUrl.startsWith('/api/users')) return await handleUsers(req, res);
    
    // Módulos ERP
    if (cleanUrl.startsWith('/api/compras')) return await handleCompras(req, res);
    if (cleanUrl.startsWith('/api/aprovacao')) return await handleAprovacao(req, res);
    if (cleanUrl.startsWith('/api/agenda')) return await handleAgenda(req, res);
    if (cleanUrl.startsWith('/api/notificacoes')) return await handleNotificacoes(req, res);
    if (cleanUrl.startsWith('/api/plano-corte')) return await handlePlanoCorte(req, res);
    
    if (cleanUrl.startsWith('/api/init-db')) {
      await runInitDB();
      return res.status(200).json({ success: true, message: 'Banco de dados inicializado com sucesso' });
    }

    return res.status(404).json({ success: false, error: 'Rota da API não encontrada', path: cleanUrl });
  } catch (err: any) {
    console.error('API Router Error:', err.message);
    return res.status(500).json({ success: false, error: 'Erro interno no servidor da API', details: err.message });
  }
}
