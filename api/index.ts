import { ALLOWED_ORIGINS } from '../src/api-lib/config.js';

// Simple in-memory rate limiter
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

const RATE_LIMITS: Record<string, { max: number; windowMs: number }> = {
  '/api/auth': { max: 10, windowMs: 60_000 },       // 10 req/min para auth
  '/api/init-db': { max: 3, windowMs: 300_000 },    // 3 req/5min para init
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

// Cleanup old entries every 5 minutes
setInterval(cleanupRateLimitMap, 5 * 60_000);

function getClientIP(req: any): string {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() 
    || req.headers['x-real-ip'] 
    || req.socket?.remoteAddress 
    || 'unknown';
}

function getCorsOrigin(req: any): string {
  const requestOrigin = req.headers['origin'];
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

  // Rate limiting
  const clientIP = getClientIP(req);
  const cleanUrl = (req.url || '').split('?')[0];
  const rateResult = checkRateLimit(clientIP, cleanUrl);
  if (!rateResult.allowed) {
    res.setHeader('Retry-After', String(rateResult.retryAfter || 60));
    return res.status(429).json({ 
      success: false, 
      error: 'Muitas requisições. Tente novamente em alguns segundos.',
      retryAfter: rateResult.retryAfter 
    });
  }

  console.log(`[ROUTER] Request: ${req.method} ${cleanUrl} from ${clientIP}`);

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
    if (cleanUrl.startsWith('/api/financeiro')) {
      const { handleFinanceiro } = await import('../src/api-lib/financeiro.js');
      return await handleFinanceiro(req, res);
    }
    if (cleanUrl.startsWith('/api/estoque')) {
      const { handleEstoque } = await import('../src/api-lib/estoque.js');
      return await handleEstoque(req, res);
    }
    if (cleanUrl.startsWith('/api/orcamentos')) {
      const { handleOrcamentos } = await import('../src/api-lib/orcamentos.js');
      return await handleOrcamentos(req, res);
    }
    if (cleanUrl.startsWith('/api/ai/chat')) {
      const { handleAIChat } = await import('../src/api-lib/ai-chat.js');
      return await handleAIChat(req, res);
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
    if (cleanUrl.startsWith('/api/forn')) {
      const { handleEstoque } = await import('../src/api-lib/estoque.js');
      return await handleEstoque(req, res);
    }

    // Endpoint init-db - apenas em desenvolvimento
    if (cleanUrl.startsWith('/api/init-db')) {
      if (process.env.NODE_ENV === 'production') {
        return res.status(403).json({ success: false, error: 'Endpoint desabilitado em produção' });
      }
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
