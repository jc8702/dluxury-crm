import { sql } from '../../src/api-lib/_db.js';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Método não permitido' });
  }

  // Token de segredo para validar a autenticidade do webhook do Asaas
  const asaasToken = req.headers['asaas-access-token'];
  if (process.env.ASAAS_WEBHOOK_TOKEN && asaasToken !== process.env.ASAAS_WEBHOOK_TOKEN) {
    return res.status(401).json({ success: false, error: 'Não autorizado' });
  }

  const { event, subscription, payment } = req.body || {};
  console.log(`[ASAAS_WEBHOOK] Evento recebido: ${event}`);

  // Extração de parâmetros de identificação
  const customerId = payment?.customer || req.body.customerId || req.body.customer || req.body.subscription?.customer;
  const asaasSubId = payment?.subscription || subscription || req.body.subscription?.id;
  const externalReference = req.body.subscription?.externalReference || req.body.payment?.externalReference || req.body.externalReference;

  try {
    // Resolução segura e unificada do tenant_id
    let tenantId: string | null = null;

    // 1. Procurar nas assinaturas ativas por correspondência com IDs do Asaas
    if (customerId || asaasSubId) {
      const subRes = await sql`
        SELECT tenant_id FROM subscriptions 
        WHERE asaas_customer_id = ${customerId} OR asaas_subscription_id = ${asaasSubId} 
        LIMIT 1
      `;
      if (subRes.length > 0) {
        tenantId = subRes[0].tenant_id;
      }
    }

    // 2. Fallback seguro: se não localizou mas temos externalReference (UUID de tenant)
    if (!tenantId && externalReference && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(externalReference)) {
      const tenantRes = await sql`SELECT id FROM tenants WHERE id = ${externalReference}::uuid LIMIT 1`;
      if (tenantRes.length > 0) {
        tenantId = tenantRes[0].id;
      }
    }

    if (!tenantId) {
      console.warn(`[ASAAS_WEBHOOK] Ignorando evento ${event}: Tenant não localizado. Customer: ${customerId}, Sub: ${asaasSubId}, Ref: ${externalReference}`);
      // Retorna 200 para evitar retentativas infinitas do Asaas para dados de teste órfãos
      return res.status(200).json({ success: false, error: 'Tenant correspondente não encontrado.' });
    }

    // 1. Assinatura criada ou atualizada
    if (event === 'SUBSCRIPTION_CREATED' || event === 'SUBSCRIPTION_UPDATED') {
      const status = req.body.subscription?.status || req.body.status || 'ACTIVE';
      const plano = req.body.subscription?.plan || req.body.plan || 'pro';
      const valor = req.body.subscription?.value || req.body.value || 197.00;
      const diaVencimento = req.body.subscription?.dueDay || req.body.dueDay || 5;

      const existingSub = await sql`SELECT id FROM subscriptions WHERE tenant_id = ${tenantId}::uuid LIMIT 1`;
      const dbStatus = status === 'ACTIVE' ? 'active' : status === 'SUSPENDED' ? 'suspended' : 'inactive';

      if (existingSub.length > 0) {
        await sql`
          UPDATE subscriptions SET 
            status = ${dbStatus},
            plano = ${plano},
            valor = ${valor},
            dia_vencimento = ${diaVencimento},
            asaas_customer_id = COALESCE(asaas_customer_id, ${customerId}),
            asaas_subscription_id = COALESCE(asaas_subscription_id, ${asaasSubId}),
            updated_at = NOW()
          WHERE tenant_id = ${tenantId}::uuid
        `;
      } else {
        await sql`
          INSERT INTO subscriptions (
            tenant_id, asaas_customer_id, asaas_subscription_id, status, plano, valor, dia_vencimento, current_period_end
          ) VALUES (
            ${tenantId}::uuid, 
            ${customerId}, 
            ${asaasSubId}, 
            ${dbStatus}, 
            ${plano}, 
            ${valor}, 
            ${diaVencimento}, 
            NOW() + INTERVAL '30 days'
          )
        `;
      }
      console.log(`[ASAAS_WEBHOOK] Assinatura atualizada no banco. Tenant: ${tenantId}, Status: ${dbStatus}`);
    }

    // 2. Pagamento efetuado / Recebido (Renova acesso por +30 dias)
    if (event === 'PAYMENT_RECEIVED' || event === 'PAYMENT_CONFIRMED') {
      const nextPeriodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      await sql`
        UPDATE subscriptions 
        SET 
          status = 'active', 
          current_period_end = ${nextPeriodEnd}, 
          updated_at = NOW() 
        WHERE tenant_id = ${tenantId}::uuid
      `;
      console.log(`[ASAAS_WEBHOOK] Pagamento recebido, acesso renovado até ${nextPeriodEnd.toLocaleDateString()}. Tenant: ${tenantId}`);
    }

    // 3. Pagamento atrasado (Overdue)
    if (event === 'PAYMENT_OVERDUE') {
      await sql`
        UPDATE subscriptions 
        SET 
          status = 'overdue', 
          updated_at = NOW() 
        WHERE tenant_id = ${tenantId}::uuid
      `;
      console.warn(`[ASAAS_WEBHOOK] Cobrança vencida detectada. Tenant: ${tenantId}`);
    }

    // 4. Assinatura cancelada, deletada ou desabilitada
    if (event === 'SUBSCRIPTION_DISABLED' || event === 'PAYMENT_DELETED' || event === 'SUBSCRIPTION_DELETED') {
      await sql`
        UPDATE subscriptions 
        SET 
          status = 'inactive', 
          updated_at = NOW() 
        WHERE tenant_id = ${tenantId}::uuid
      `;
      console.log(`[ASAAS_WEBHOOK] Assinatura cancelada/desativada. Tenant: ${tenantId}`);
    }

    return res.status(200).json({ success: true, message: 'Webhook processado com sucesso' });
  } catch (err: any) {
    console.error('[ASAAS_WEBHOOK_ERROR]', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
