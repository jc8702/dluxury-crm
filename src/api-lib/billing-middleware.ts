import { sql, validateAuth } from './_db.js';
import { logger } from './logger.js';

/**
 * Middleware para verificar o status da assinatura do tenant.
 * Bloqueia operações de modificação (POST, PUT, PATCH, DELETE) se o tenant estiver suspenso ou inadimplente há mais de 5 dias.
 * Permite GET livremente (modo Somente Leitura).
 * Ignora rotas de infraestrutura, autenticação e webhooks.
 */
export async function verifyBillingStatus(req: any, res: any): Promise<boolean> {
  const method = req.method;
  const url = req.url || '';
  const cleanUrl = url.split('?')[0];

  // Ignorar rotas de infraestrutura, auth, signup, checkout e webhooks
  if (
    cleanUrl.startsWith('/api/auth') ||
    cleanUrl.startsWith('/api/signup') ||
    cleanUrl.startsWith('/api/checkout') ||
    cleanUrl.startsWith('/api/init-db') ||
    cleanUrl.startsWith('/api/ping') ||
    cleanUrl.startsWith('/api/webhooks')
  ) {
    return true;
  }

  // Apenas operações de escrita são bloqueadas
  if (method === 'GET' || method === 'OPTIONS') {
    return true;
  }

  try {
    const auth = validateAuth(req);
    // Se a rota for protegida e a validação falhar, deixa o validador de auth do próprio handler lidar com isso (retornando 401)
    if (!auth.authorized || !auth.user) {
      return true;
    }

    const tenantId = req.tenantId || auth.user?.tenantId; // fallback: tenantMiddleware pode não ter executado ainda

    // Buscar a assinatura ativa do tenant
    const sub = (
      await sql`
      SELECT status, current_period_end 
      FROM subscriptions 
      WHERE tenant_id = ${tenantId}::uuid
      LIMIT 1
    `
    )[0];

    // Se não houver assinatura cadastrada, assume-se plano básico e deixa passar (ou pode ser criado um default)
    if (!sub) {
      return true;
    }

    // Se estiver explicitamente suspenso
    if (sub.status === 'suspended' || sub.status === 'inactive') {
      res.status(402).json({
        success: false,
        error: 'Assinatura suspensa por falta de pagamento. Acesso restrito a Somente Leitura.',
      });
      return false;
    }

    // Se estiver overdue (atrasado), verifica a tolerância de 5 dias
    if (sub.status === 'overdue') {
      const periodEnd = sub.current_period_end ? new Date(sub.current_period_end) : new Date();
      const diffTime = Date.now() - periodEnd.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      // Tolerância de 5 dias de graça
      if (diffDays > 5) {
        res.status(402).json({
          success: false,
          error:
            'Assinatura suspensa após tolerância de 5 dias de atraso. Regularize seu faturamento para reabilitar a escrita.',
        });
        return false;
      }
    }

    return true;
  } catch (err: any) {
    logger.error('[BILLING_MIDDLEWARE_ERROR]', err);
    // Em caso de falha de banco de dados no middleware, deixa passar para não parar a aplicação
    return true;
  }
}
