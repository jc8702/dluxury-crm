import { sql, validateAuth } from './_db.js';
import { PlanTier, hasFeature, PLAN_LIMITS } from '../lib/features.js';

/**
 * Middleware para validar o Feature Gate e os limites do plano comercial do tenant.
 * Bloqueia chamadas de API se o plano do tenant não cobrir a funcionalidade ou exceder o limite de usuários.
 */
export async function verifyFeatureGate(req: any, res: any): Promise<boolean> {
  const method = req.method;
  const url = req.url || '';
  const cleanUrl = url.split('?')[0];

  // Ignorar rotas de infraestrutura básica, login, signup, checkout e webhooks
  if (
    (cleanUrl.startsWith('/api/auth') && req.query.action !== 'register') ||
    cleanUrl.startsWith('/api/signup') ||
    cleanUrl.startsWith('/api/checkout') ||
    cleanUrl.startsWith('/api/init-db') ||
    cleanUrl.startsWith('/api/ping') ||
    cleanUrl.startsWith('/api/resolve-dominio') ||
    cleanUrl.startsWith('/api/webhooks')
  ) {
    return true;
  }

  try {
    const auth = validateAuth(req);
    // Se a rota for protegida e a validação falhar, deixa o validador de auth do próprio handler lidar com isso (retornando 401)
    if (!auth.authorized || !auth.user) {
      return true;
    }

    const tenantId = auth.user.tenantId;
    if (!tenantId) {
      return true;
    }

    // 1. Buscar o plano atual do tenant de forma robusta e dinâmica do banco de dados (Neon)
    const tenantRes = await sql`
      SELECT plano_tier FROM tenants 
      WHERE id = ${tenantId}::uuid
      LIMIT 1
    `;

    // Se não encontrar o tenant, assume plano básico
    const planoTier = (tenantRes[0]?.plano_tier || 'basic') as PlanTier;

    // 2. Mapeamento de endpoints para recursos (features)
    let requiredFeature: string | null = null;

    if (cleanUrl.startsWith('/api/ai') || cleanUrl.startsWith('/api/ai-copilot')) {
      requiredFeature = 'ia';
    } else if (cleanUrl.startsWith('/api/simulations')) {
      requiredFeature = 'simulador_cnc';
    } else if (
      cleanUrl.startsWith('/api/plano-corte') ||
      cleanUrl.startsWith('/api/chapas') ||
      cleanUrl.startsWith('/api/retalhos') ||
      cleanUrl.startsWith('/api/aprovacao')
    ) {
      requiredFeature = 'plano_corte';
    } else if (
      cleanUrl.startsWith('/api/financeiro') ||
      cleanUrl.startsWith('/api/condicoes-pagamento') ||
      cleanUrl.startsWith('/api/billings')
    ) {
      requiredFeature = 'financeiro';
    } else if (cleanUrl.startsWith('/api/whatsapp')) {
      requiredFeature = 'whatsapp';
    } else if (
      cleanUrl.startsWith('/api/orcamentos/export-xml') ||
      cleanUrl.startsWith('/api/export-xml')
    ) {
      requiredFeature = 'export-xml';
    } else if (cleanUrl.startsWith('/api/features')) {
      requiredFeature = null; // always allowed (self-check)
    }

    // 3. Validação do Feature Gate
    if (requiredFeature && !hasFeature(planoTier, requiredFeature)) {
      res.status(403).json({
        success: false,
        error: `Acesso negado. A funcionalidade '${requiredFeature}' não está inclusa no seu plano comercial atual (${planoTier.toUpperCase()}). Faça um upgrade para acessar.`,
      });
      return false;
    }

    // 4. Validação de Limites de Usuários no Cadastro
    const isUserCreation =
      (cleanUrl.startsWith('/api/auth') && req.query.action === 'register') ||
      (cleanUrl.startsWith('/api/users') && method === 'POST');

    if (isUserCreation) {
      const countRes = await sql`
        SELECT COUNT(*)::integer as total 
        FROM users 
        WHERE tenant_id = ${tenantId}::uuid
      `;
      const currentUsers = countRes[0]?.total || 0;
      const limit = PLAN_LIMITS[planoTier]?.maxUsers || 2;

      if (currentUsers >= limit) {
        res.status(403).json({
          success: false,
          error: `Limite de usuários excedido. Seu plano atual (${planoTier.toUpperCase()}) permite no máximo ${limit} usuários.`,
        });
        return false;
      }
    }

    return true;
  } catch (err: any) {
    console.error('[FEATURE_GATE_MIDDLEWARE_ERROR]', err);
    // Em caso de falha de infraestrutura interna, deixa prosseguir para evitar paralisar o sistema
    return true;
  }
}
