
export default async function handler(req: any, res: any) {
  // CORS Setup
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const url = req.url || '';
  const cleanUrl = url.split('?')[0];

  console.log(`[ROUTER] Request: ${req.method} ${cleanUrl}`);

  try {
    // Roteamento Dinâmico (Lazy Loading)
    if (cleanUrl.startsWith('/api/auth')) {
      const { handleAuth } = await import('../src/api-lib/auth.js');
      return await handleAuth(req, res);
    }
    if (cleanUrl.startsWith('/api/clients')) {
      const { handleClients } = await import('../src/api-lib/crm.js');
      return await handleClients(req, res);
    }
    if (cleanUrl.startsWith('/api/billings')) {
      const { handleBillings } = await import('../src/api-lib/financeiro.js');
      return await handleBillings(req, res);
    }
    if (cleanUrl.startsWith('/api/estoque')) {
      const { handleEstoque } = await import('../src/api-lib/estoque.js');
      return await handleEstoque(req, res);
    }
    if (cleanUrl.startsWith('/api/orcamentos')) {
      const { handleOrcamentos } = await import('../src/api-lib/orcamentos.js');
      return await handleOrcamentos(req, res);
    }
    if (cleanUrl.startsWith('/api/ai-copilot')) {
      const { handleAICopilot } = await import('../src/api-lib/copilot.js');
      return await handleAICopilot(req, res);
    }
    if (cleanUrl.startsWith('/api/ai/parser')) {
      if (req.method !== 'POST') return res.status(405).end();
      const { handleAIParser } = await import('../src/api-lib/copilot.js');
      return await handleAIParser(req, res);
    }
    if (cleanUrl.startsWith('/api/condicoes-pagamento')) {
      const { handleCondicoesPagamento } = await import('../src/api-lib/orcamentos.js');
      return await handleCondicoesPagamento(req, res);
    }
    if (cleanUrl.startsWith('/api/goals')) {
      const { handleGoals } = await import('../src/api-lib/crm.js');
      return await handleGoals(req, res);
    }
    if (cleanUrl.startsWith('/api/kanban')) {
      const { handleKanban } = await import('../src/api-lib/crm.js');
      return await handleKanban(req, res);
    }
    if (cleanUrl.startsWith('/api/engineering')) {
      const { handleEngineering } = await import('../src/api-lib/projects.js');
      return await handleEngineering(req, res);
    }
    if (cleanUrl.startsWith('/api/skus')) {
      const { handleSKUs } = await import('../src/api-lib/projects.js');
      return await handleSKUs(req, res);
    }
    if (cleanUrl.startsWith('/api/reports')) {
      const { handleReports } = await import('../src/api-lib/projects.js');
      return await handleReports(req, res);
    }
    if (cleanUrl.startsWith('/api/orcamento-tecnico')) {
      const { handleOrcamentoTecnico } = await import('../src/api-lib/orcamentos.js');
      return await handleOrcamentoTecnico(req, res);
    }
    if (cleanUrl.startsWith('/api/projects')) {
      const { handleProjects } = await import('../src/api-lib/projects.js');
      return await handleProjects(req, res);
    }
    if (cleanUrl.startsWith('/api/production')) {
      const { handleProduction } = await import('../src/api-lib/production.js');
      return await handleProduction(req, res);
    }
    if (cleanUrl.startsWith('/api/simulations')) {
      const { handleSimulations } = await import('../src/api-lib/projects.js');
      return await handleSimulations(req, res);
    }
    if (cleanUrl.startsWith('/api/after-sales')) {
      const { handleAfterSales } = await import('../src/api-lib/after_sales.js');
      return await handleAfterSales(req, res);
    }
    if (cleanUrl.startsWith('/api/users')) {
      const { handleUsers } = await import('../src/api-lib/auth.js');
      return await handleUsers(req, res);
    }
    if (cleanUrl.startsWith('/api/compras')) {
      const { handleCompras } = await import('../src/api-lib/compras.js');
      return await handleCompras(req, res);
    }
    if (cleanUrl.startsWith('/api/aprovacao')) {
      const { handleAprovacao } = await import('../src/api-lib/aprovacao.js');
      return await handleAprovacao(req, res);
    }
    if (cleanUrl.startsWith('/api/agenda')) {
      const { handleAgenda } = await import('../src/api-lib/agenda.js');
      return await handleAgenda(req, res);
    }
    if (cleanUrl.startsWith('/api/notificacoes')) {
      const { handleNotificacoes } = await import('../src/api-lib/notificacoes.js');
      return await handleNotificacoes(req, res);
    }
    if (cleanUrl.startsWith('/api/plano-corte')) {
      const { handlePlanoCorte } = await import('../src/api-lib/planocorte.js');
      return await handlePlanoCorte(req, res);
    }
    if (cleanUrl.startsWith('/api/chapas')) {
      const { handleChapas } = await import('../src/api-lib/planocorte.js');
      return await handleChapas(req, res);
    }
    if (cleanUrl.startsWith('/api/engenharia/skus')) {
      const { handleEngenhariaSKUs } = await import('../src/api-lib/planocorte.js');
      return await handleEngenhariaSKUs(req, res);
    }

    if (cleanUrl.startsWith('/api/init-db')) {
      const { runInitDB } = await import('../src/api-lib/_init.js');
      const result = await runInitDB();
      return res.status(200).json(result);
    }

    if (cleanUrl.startsWith('/api/ping')) {
      return res.status(200).json({ success: true, message: 'pong' });
    }

    console.warn(`[ROUTER] 404 - No route matched for: ${cleanUrl}`);
    return res.status(404).json({ success: false, error: 'Rota da API não encontrada', path: cleanUrl });
  } catch (err: any) {
    console.error('API Router Error:', err.message);
    return res.status(500).json({ success: false, error: 'Erro interno no servidor da API', details: err.message });
  }
}
