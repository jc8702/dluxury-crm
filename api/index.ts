import { ALLOWED_ORIGINS } from '../src/api-lib/config.js';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '50mb',
    },
  },
};

// Simple in-memory rate limiter
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

const RATE_LIMITS: Record<string, { max: number; windowMs: number }> = {
  '/api/auth': { max: 10, windowMs: 60_000 },       // 10 req/min para auth
  '/api/init-db': { max: 3, windowMs: 300_000 },    // 3 req/5min para init
  '/api/ai/chat': { max: 5, windowMs: 10_000 },     // 5 req/10s para chat de IA
  default: { max: 100, windowMs: 60_000 },          // 100 req/min default
};

function checkRateLimit(ip: string, path: string): { allowed: boolean; retryAfter?: number } {
  // Find matching rate limit rule
  let rule = RATE_LIMITS.default;
  for (const [prefix, r] of Object.entries(RATE_LIMITS)) {
    if (path.startsWith(prefix)) {
      rule = r;
      break;
    }
  }

  const now = Date.now();
  const key = `${ip}:${path.startsWith('/api/auth') ? 'auth' : path.startsWith('/api/init-db') ? 'init' : 'default'}`;
  const entry = rateLimitMap.get(key);

  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(key, { count: 1, resetTime: now + rule.windowMs });
    return { allowed: true };
  }

  entry.count++;
  if (entry.count > rule.max) {
    return { allowed: false, retryAfter: Math.ceil((entry.resetTime - now) / 1000) };
  }

  return { allowed: true };
}

function cleanupRateLimitMap() {
  const now = Date.now();
  for (const [key, entry] of rateLimitMap.entries()) {
    if (now > entry.resetTime) {
      rateLimitMap.delete(key);
    }
  }
}

// Note: setInterval removed for Vercel serverless compatibility.
// Rate limit map cleanup happens naturally as entries expire.

function getClientIP(req: any): string {
  const headers = req.headers || {};
  return headers['x-forwarded-for']?.split(',')[0]?.trim() 
    || headers['x-real-ip'] 
    || req.socket?.remoteAddress 
    || 'unknown';
}

function getCorsOrigin(req: any): string {
  const headers = req.headers || {};
  const requestOrigin = headers['origin'];
  if (requestOrigin && ALLOWED_ORIGINS.includes(requestOrigin)) {
    return requestOrigin;
  }
  return ALLOWED_ORIGINS[0] || '';
}

export default async function handler(req: any, res: any) {
  // CORS - restringir a origens conhecidas
  const corsOrigin = getCorsOrigin(req);
  if (corsOrigin) {
    res.setHeader('Access-Control-Allow-Origin', corsOrigin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') return res.status(200).end();

  // Obter informacoes de autenticacao para chave de rate limit isolada por tenant/usuario
  const { validateAuth } = await import('../src/api-lib/_db.js');
  const auth = validateAuth(req);
  const clientIP = getClientIP(req);
  const rateKey = auth.authorized && auth.user ? `${auth.user.tenantId || '00000000-0000-0000-0000-000000000000'}:${auth.user.id}` : clientIP;

  // Rate limiting
  const cleanUrl = (req.url || '').split('?')[0];
  const rateResult = checkRateLimit(rateKey, cleanUrl);
  if (!rateResult.allowed) {
    res.setHeader('Retry-After', String(rateResult.retryAfter || 60));
    return res.status(429).json({ 
      success: false, 
      error: 'Muitas requisições. Tente novamente em alguns segundos.',
      retryAfter: rateResult.retryAfter 
    });
  }

  // console.log(`[ROUTER] Request: ${req.method} ${cleanUrl} from ${clientIP}`);

  try {
    // Resolver tenant a partir do domínio (Host header)
    const { resolveTenantByDomain } = await import('../src/api-lib/_db.js');
    const hostHeader = (req.headers && req.headers['host']) || '';
    req.tenantFromDomain = await resolveTenantByDomain(hostHeader);

    // Verificar status de faturamento (Bloqueio 402 se inadimplente)
    const { verifyBillingStatus } = await import('../src/api-lib/billing-middleware.js');
    const allowedByBilling = await verifyBillingStatus(req, res);
    if (!allowedByBilling) return;

    // Verificar Feature Gates (Bloqueio 403 se funcionalidade ausente no plano)
    const { verifyFeatureGate } = await import('../src/api-lib/feature-gate-middleware.js');
    const allowedByFeatureGate = await verifyFeatureGate(req, res);
    if (!allowedByFeatureGate) return;

    // Roteamento Dinâmico (Lazy Loading)
    if (cleanUrl.startsWith('/api/signup')) {
      const { handleSignup } = await import('../src/api-lib/tenant-provisioning.js');
      return await handleSignup(req, res);
    }
    if (cleanUrl.startsWith('/api/checkout')) {
      const { handleCheckout } = await import('../src/api-lib/checkout.js');
      return await handleCheckout(req, res);
    }
    if (cleanUrl.startsWith('/api/auth')) {
      const { handleAuth } = await import('../src/api-lib/auth.js');
      return await handleAuth(req, res);
    }
    if (cleanUrl.startsWith('/api/clients')) {
      const { handleClients } = await import('../src/api-lib/crm.js');
      return await handleClients(req, res);
    }
    if (cleanUrl.startsWith('/api/financeiro')) {
      const { handleFinanceiro } = await import('../src/api-lib/financeiro.js');
      return await handleFinanceiro(req, res);
    }
    if (cleanUrl.startsWith('/api/estoque')) {
      const { handleEstoque } = await import('../src/api-lib/estoque.js');
      return await handleEstoque(req, res);
    }
    // Rotas de Orçamentos (Ordem de especificidade)
    if (cleanUrl.startsWith('/api/orcamentos/importar-itens')) {
      const { handleImportarItensOrcamento } = await import('./orcamentos/importar-itens.js');
      return await handleImportarItensOrcamento(req, res);
    }
    if (cleanUrl.startsWith('/api/orcamentos-pro')) {
      const { handleOrcamentosPro } = await import('../src/api-lib/orcamentos_pro.js');
      return await handleOrcamentosPro(req, res);
    }
    if (cleanUrl.startsWith('/api/orcamentos/export-pdf')) {
      const { default: handler } = await import('./orcamentos/exportar-pdf.js');
      return await handler(req, res);
    }
    if (cleanUrl.startsWith('/api/orcamentos')) {
      const { handleOrcamentos } = await import('../src/api-lib/orcamentos.js');
      return await handleOrcamentos(req, res);
    }
    if (cleanUrl.startsWith('/api/orcamento-tecnico')) {
      const { handleOrcamentoTecnico } = await import('../src/api-lib/orcamentos.js');
      return await handleOrcamentoTecnico(req, res);
    }
    if (cleanUrl.startsWith('/api/ai/chat')) {
      if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Método não permitido' });
      }

      const body = req.body || {};
      const message = body.message;
      const agentMode = body.agentMode || 'auto';
      const conversation_history = body.conversation_history || [];
      const context = body.context || {};
      const memory_summary = body.memory_summary || '';

      // Validação
      if (!message || typeof message !== 'string' || !message.trim()) {
        return res.status(400).json({ success: false, error: 'Mensagem inválida ou vazia' });
      }

      if (message.length > 4000) {
        return res.status(400).json({ success: false, error: 'Mensagem muito longa (máximo 4000 caracteres)' });
      }

      // Enriquecer contexto com data pt-BR
      const enrichedContext = {
        ...context,
        data_atual: context.data_atual || new Date().toISOString()
      };

      try {
        const { processarChat } = await import('./services/ai-chat.js');
        
        // Timeout de 45 segundos usando Promise.race
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => {
            const err = new Error('TIMEOUT_ERROR');
            (err as any).status = 408;
            reject(err);
          }, 45000);
        });

        const tenantId = auth.user?.tenantId || '00000000-0000-0000-0000-000000000000';
        const usuarioId = auth.user?.id || '00000000-0000-0000-0000-000000000000';

        const chatPromise = processarChat({
          message: message.trim(),
          agentMode,
          conversation_history: conversation_history.slice(-10),
          context: enrichedContext,
          memory_summary,
          tenantId,
          usuarioId
        });

        const result = await Promise.race([chatPromise, timeoutPromise]) as any;
        
        res.setHeader('X-Agent', result.agent || 'administrativo');
        return res.status(200).json(result);
      } catch (err: any) {
        console.error('[AI_CHAT_ROUTE_ERROR]', err);
        
        const status = err.status || err.statusCode || 500;
        const errMsg = err.message || '';
        
        if (errMsg === 'TIMEOUT_ERROR' || status === 408) {
          return res.status(408).json({
            success: false,
            error: 'Tempo limite de resposta excedido. A IA demorou mais de 45 segundos para responder.'
          });
        }
        
        if (status === 429 || errMsg.includes('429') || errMsg.includes('RESOURCE_EXHAUSTED')) {
          return res.status(429).json({
            success: false,
            error: 'Muitas requisições. O limite de cota da API da IA foi excedido. Tente novamente mais tarde.'
          });
        }
        
        if (status === 503 || errMsg.includes('503') || errMsg.includes('UNAVAILABLE') || errMsg.includes('indisponivel')) {
          return res.status(503).json({
            success: false,
            error: 'Serviço temporariamente indisponível. Tente novamente em instantes.'
          });
        }

        return res.status(status >= 400 && status < 600 ? status : 500).json({
          success: false,
          error: err.message || 'Erro interno ao processar chat com IA'
        });
      }
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
      const { handleFinanceiro } = await import('../src/api-lib/financeiro.js');
      return await handleFinanceiro(req, res);
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
    if (cleanUrl.startsWith('/api/retalhos')) {
      const { handleRetalhos } = await import('../src/api-lib/retalhos.js');
      return await handleRetalhos(req, res);
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
    if (cleanUrl.startsWith('/api/plano-corte/importar-desenho')) {
      const { handleImportarDesenho } = await import('../src/api-lib/planocorte.js');
      return await handleImportarDesenho(req, res);
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
    if (cleanUrl.startsWith('/api/billings')) {
      const { handleFinanceiro } = await import('../src/api-lib/financeiro.js');
      return await handleFinanceiro(req, res);
    }
    if (cleanUrl.startsWith('/api/importar-projeto')) {
      const { handleImportarProjeto } = await import('../src/api-lib/importacao-projetos.js');
      return await handleImportarProjeto(req, res);
    }
    if (cleanUrl.startsWith('/api/match-skus')) {
      const { handleMatchSKUs } = await import('../src/api-lib/match-skus.js');
      return await handleMatchSKUs(req, res);
    }
    if (cleanUrl.startsWith('/api/forn')) {
      const { handleEstoque } = await import('../src/api-lib/estoque.js');
      return await handleEstoque(req, res);
    }

    // Endpoint init-db - requer header x-init-key
    if (cleanUrl.startsWith('/api/init-db')) {
      const initKey = req.headers['x-init-key'];
      if (!initKey || initKey !== process.env.APP_INIT_KEY) {
        return res.status(403).json({ success: false, error: 'Acesso negado' });
      }
      const { runInitDB } = await import('../src/api-lib/_init.js');
      const result = await runInitDB();
      return res.status(200).json(result);
    }

    if (cleanUrl.startsWith('/api/webhooks/asaas')) {
      const { default: handler } = await import('./webhooks/asaas-webhook.js');
      return await handler(req, res);
    }

    if (cleanUrl.startsWith('/api/resolve-dominio')) {
      const host = req.query.host || req.headers['host'] || '';
      const tenant = await resolveTenantByDomain(host);
      return res.status(200).json({ success: true, tenant: tenant ? { nome: tenant.nome, subdominio: tenant.subdominio } : null });
    }

    // Endpoint para configurar domínio personalizado (admin)
    if (cleanUrl.startsWith('/api/dominio') && req.method === 'POST') {
      const { sql } = await import('../src/api-lib/_db.js');
      const auth = validateAuth(req);
      if (!auth.authorized || auth.user?.role !== 'admin') {
        return res.status(403).json({ success: false, error: 'Apenas admin pode configurar domínio' });
      }
      const { tenantId, dominio } = req.body;
      if (!tenantId || !dominio) {
        return res.status(400).json({ success: false, error: 'tenantId e dominio são obrigatórios' });
      }
      await sql`UPDATE tenants SET dominio_personalizado = ${dominio} WHERE id = ${tenantId}::uuid`;
      return res.status(200).json({ success: true, message: 'Domínio atualizado' });
    }

    if (cleanUrl.startsWith('/api/ping')) {
      return res.status(200).json({ success: true, message: 'pong' });
    }

    console.warn(`[ROUTER] 404 - No route matched for: ${cleanUrl}`);
    return res.status(404).json({ success: false, error: 'Rota da API não encontrada', path: cleanUrl });
  } catch (err: any) {
    console.error('API Router Error:', err);
    return res.status(500).json({ 
      success: false, 
      error: err.message || 'Erro interno no servidor da API'
    });
  }
}
