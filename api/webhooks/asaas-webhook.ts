import { sql } from '../../src/api-lib/_db.js';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Método não permitido' });
  }

  // Token de segredo para validar a autenticidade do webhook do Asaas (opcional)
  const asaasToken = req.headers['asaas-access-token'];
  if (process.env.ASAAS_WEBHOOK_TOKEN && asaasToken !== process.env.ASAAS_WEBHOOK_TOKEN) {
    return res.status(401).json({ success: false, error: 'Não autorizado' });
  }

  const { event, subscription, payment } = req.body || {};
  console.log(`[ASAAS_WEBHOOK] Evento recebido: ${event}`);

  try {
    // 1. Assinatura criada ou atualizada
    if (event === 'SUBSCRIPTION_CREATED' || event === 'SUBSCRIPTION_UPDATED') {
      const asaasSubId = subscription;
      const customerId = req.body.customerId || req.body.customer;
      const status = req.body.status || 'active'; // active, suspended, deleted
      const plano = req.body.plan || 'pro';
      const valor = req.body.value || 0;
      const diaVencimento = req.body.dueDay || 10;
      
      // Encontrar o tenant correspondente pelo asaasCustomerId no banco
      const subRes = await sql`SELECT tenant_id FROM subscriptions WHERE asaas_customer_id = ${customerId} LIMIT 1`;
      let tenantId = subRes[0]?.tenant_id;
      
      if (!tenantId) {
        // Se for uma assinatura nova e o cliente não estiver associado no banco,
        // vinculamos ao primeiro tenant disponível (ou outro fluxo adequado)
        const firstTenant = await sql`SELECT id FROM tenants LIMIT 1`;
        tenantId = firstTenant[0]?.id;
      }

      if (tenantId) {
        const existingSub = await sql`SELECT id FROM subscriptions WHERE tenant_id = ${tenantId}::uuid LIMIT 1`;
        if (existingSub.length > 0) {
          await sql`
            UPDATE subscriptions SET 
              status = ${status === 'ACTIVE' ? 'active' : status === 'SUSPENDED' ? 'suspended' : 'inactive'},
              plano = ${plano},
              valor = ${valor},
              dia_vencimento = ${diaVencimento},
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
              ${status === 'ACTIVE' ? 'active' : status === 'SUSPENDED' ? 'suspended' : 'inactive'}, 
              ${plano}, 
              ${valor}, 
              ${diaVencimento}, 
              ${new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)}
            )
          `;
        }
      }
    }

    // 2. Pagamento efetuado (Libera o tenant)
    if (event === 'PAYMENT_RECEIVED' || event === 'PAYMENT_CONFIRMED') {
      const customerId = payment?.customer || req.body.customerId || req.body.customer;
      const asaasSubId = payment?.subscription || subscription;

      const subRes = await sql`
        SELECT tenant_id FROM subscriptions 
        WHERE asaas_customer_id = ${customerId} OR asaas_subscription_id = ${asaasSubId} 
        LIMIT 1
      `;
      const tenantId = subRes[0]?.tenant_id;

      if (tenantId) {
        // Renova por +30 dias de acesso
        const nextPeriodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        await sql`
          UPDATE subscriptions 
          SET 
            status = 'active', 
            current_period_end = ${nextPeriodEnd}, 
            updated_at = NOW() 
          WHERE tenant_id = ${tenantId}::uuid
        `;
      }
    }

    // 3. Assinatura atrasada (Overdue)
    if (event === 'PAYMENT_OVERDUE') {
      const customerId = payment?.customer || req.body.customerId || req.body.customer;
      const asaasSubId = payment?.subscription || subscription;

      const subRes = await sql`
        SELECT tenant_id FROM subscriptions 
        WHERE asaas_customer_id = ${customerId} OR asaas_subscription_id = ${asaasSubId} 
        LIMIT 1
      `;
      const tenantId = subRes[0]?.tenant_id;

      if (tenantId) {
        await sql`
          UPDATE subscriptions 
          SET 
            status = 'overdue', 
            updated_at = NOW() 
          WHERE tenant_id = ${tenantId}::uuid
        `;
      }
    }

    // 4. Assinatura cancelada ou desabilitada
    if (event === 'SUBSCRIPTION_DISABLED' || event === 'PAYMENT_DELETED') {
      const customerId = req.body.customerId || req.body.customer || payment?.customer;
      const asaasSubId = subscription || payment?.subscription;

      const subRes = await sql`
        SELECT tenant_id FROM subscriptions 
        WHERE asaas_customer_id = ${customerId} OR asaas_subscription_id = ${asaasSubId} 
        LIMIT 1
      `;
      const tenantId = subRes[0]?.tenant_id;

      if (tenantId) {
        await sql`
          UPDATE subscriptions 
          SET 
            status = 'inactive', 
            updated_at = NOW() 
          WHERE tenant_id = ${tenantId}::uuid
        `;
      }
    }

    return res.status(200).json({ success: true, message: 'Webhook processado com sucesso' });
  } catch (err: any) {
    console.error('[ASAAS_WEBHOOK_ERROR]', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
