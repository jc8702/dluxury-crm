import { sql, validateAuth } from './_db.js';
import { AsaasService } from './asaas-service.js';

export async function handleCheckout(req: any, res: any) {
  try {
    const auth = validateAuth(req);
    if (!auth.authorized || !auth.user) {
      return res.status(401).json({ success: false, error: 'Usuário não autenticado.' });
    }

    const tenantId = auth.user.tenantId;
    if (!tenantId) {
      return res.status(400).json({ success: false, error: 'Tenant não identificado no token.' });
    }

    const cleanUrl = (req.url || '').split('?')[0];

    // GET /api/checkout/invoices -> Retorna histórico de faturas virtual / dinâmico
    if (req.method === 'GET' && cleanUrl.endsWith('/invoices')) {
      const subRes = await sql`
        SELECT created_at, plano, valor, status, dia_vencimento
        FROM subscriptions
        WHERE tenant_id = ${tenantId}::uuid
        LIMIT 1
      `;

      if (subRes.length === 0) {
        return res.status(200).json({ success: true, data: [] });
      }

      const sub = subRes[0];
      const invoices = [];
      const startDate = sub.created_at ? new Date(sub.created_at) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const diaVenc = sub.dia_vencimento || 5;
      const today = new Date();
      
      // Começar a gerar faturas a partir do primeiro mês de assinatura
      let currentDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, diaVenc);
      
      while (currentDate <= today || (currentDate.getMonth() === today.getMonth() && currentDate.getFullYear() === today.getFullYear())) {
        const isCurrentMonth = currentDate.getMonth() === today.getMonth() && currentDate.getFullYear() === today.getFullYear();
        
        let invoiceStatus = 'pago';
        if (sub.status === 'overdue' && isCurrentMonth) {
          invoiceStatus = 'pendente';
        } else if (sub.status === 'suspended') {
          invoiceStatus = 'cancelado';
        }
        
        invoices.push({
          id: `fat_${tenantId.substring(0, 4)}_${currentDate.getFullYear()}${(currentDate.getMonth() + 1).toString().padStart(2, '0')}`,
          competencia: `${(currentDate.getMonth() + 1).toString().padStart(2, '0')}/${currentDate.getFullYear()}`,
          valor: parseFloat(sub.valor || '197.00'),
          dataVencimento: currentDate.toISOString().split('T')[0],
          status: invoiceStatus,
          metodoPagamento: 'Boleto Bancário',
          linkPdf: `https://sandbox.asaas.com/i/mock_invoice_${currentDate.getFullYear()}_${currentDate.getMonth() + 1}`
        });
        
        currentDate.setMonth(currentDate.getMonth() + 1);
      }
      
      invoices.reverse();

      return res.status(200).json({
        success: true,
        data: invoices
      });
    }

    // POST /api/checkout/cancel -> Cancela a assinatura
    if (req.method === 'POST' && cleanUrl.endsWith('/cancel')) {
      await sql`
        UPDATE subscriptions 
        SET status = 'suspended', updated_at = NOW() 
        WHERE tenant_id = ${tenantId}::uuid
      `;
      
      await sql`
        UPDATE tenants 
        SET status = 'inativo' 
        WHERE id = ${tenantId}::uuid
      `;

      return res.status(200).json({
        success: true,
        message: 'Assinatura cancelada com sucesso.'
      });
    }

    // POST /api/checkout/gerar-boleto -> Simulação de emissão de boleto
    if (req.method === 'POST' && cleanUrl.endsWith('/gerar-boleto')) {
      const subRes = await sql`
        SELECT valor, dia_vencimento
        FROM subscriptions
        WHERE tenant_id = ${tenantId}::uuid
        LIMIT 1
      `;

      const sub = subRes[0] || { valor: 197.00 };

      return res.status(200).json({
        success: true,
        data: {
          codigoBarras: "34191.79001 01043.513184 91020.150008 7 90000000019700",
          linkPdf: "https://sandbox.asaas.com/i/mock_boleto_url",
          vencimento: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          valor: parseFloat(sub.valor || '197.00')
        }
      });
    }

    // GET /api/checkout -> Consultar dados de faturamento
    if (req.method === 'GET') {
      const subRes = await sql`
        SELECT id, status, plano, valor, dia_vencimento, current_period_end, asaas_customer_id, asaas_subscription_id 
        FROM subscriptions 
        WHERE tenant_id = ${tenantId}::uuid
        LIMIT 1
      `;

      if (subRes.length === 0) {
        return res.status(200).json({
          success: true,
          data: {
            status: 'trial',
            plano: 'pro',
            valor: 197.00,
            diasRestantes: 14,
            currentPeriodEnd: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
          }
        });
      }

      const sub = subRes[0];
      
      const periodEnd = sub.current_period_end ? new Date(sub.current_period_end) : new Date();
      const diffTime = periodEnd.getTime() - Date.now();
      const diasRestantes = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

      let invoiceUrl = null;
      if (sub.asaas_subscription_id) {
        invoiceUrl = `https://sandbox.asaas.com/i/${sub.asaas_subscription_id}`;
      }

      return res.status(200).json({
        success: true,
        data: {
          id: sub.id,
          status: sub.status, // active, trial, overdue, suspended, inactive
          plano: sub.plano, // basic, pro, enterprise
          valor: parseFloat(sub.valor),
          diaVencimento: sub.dia_vencimento,
          currentPeriodEnd: sub.current_period_end,
          diasRestantes,
          invoiceUrl
        }
      });
    }

    // POST /api/checkout -> Gerar ou recuperar link de pagamento do Asaas
    if (req.method === 'POST') {
      const subRes = await sql`
        SELECT status, plano, valor, asaas_customer_id, asaas_subscription_id
        FROM subscriptions
        WHERE tenant_id = ${tenantId}::uuid
        LIMIT 1
      `;

      if (subRes.length === 0) {
        return res.status(404).json({ success: false, error: 'Assinatura não encontrada para este tenant.' });
      }

      const sub = subRes[0];
      const asaas = new AsaasService();
      let invoiceUrl = '';

      if (sub.asaas_subscription_id && !sub.asaas_subscription_id.startsWith('sub_mock_') && !sub.asaas_subscription_id.startsWith('sub_fail_')) {
        try {
          const asaasSub = await asaas.consultarStatusAssinatura(sub.asaas_subscription_id);
          invoiceUrl = (asaasSub as any).invoiceUrl || `https://sandbox.asaas.com/i/${sub.asaas_subscription_id}`;
        } catch {
          invoiceUrl = `https://sandbox.asaas.com/i/${sub.asaas_subscription_id}`;
        }
      } else {
        try {
          const tenantRes = await sql`SELECT nome, email FROM tenants t JOIN users u ON u.tenant_id = t.id WHERE t.id = ${tenantId}::uuid AND u.role = 'admin' LIMIT 1`;
          const tenantNome = tenantRes[0]?.nome || 'Marcenaria CRM';
          const tenantEmail = tenantRes[0]?.email || 'comercial@marcenaria.com';

          const customer = await asaas.criarCliente({
            name: tenantNome,
            email: tenantEmail,
            externalReference: tenantId
          });

          const valorPlano = sub.plano === 'basic' ? 97.00 : sub.plano === 'pro' ? 197.00 : 397.00;
          const createdSub = await asaas.criarAssinatura({
            customer: customer.id,
            plano: sub.plano,
            valor: valorPlano,
            externalReference: tenantId
          });

          invoiceUrl = createdSub.invoiceUrl;

          await sql`
            UPDATE subscriptions SET 
              asaas_customer_id = ${customer.id},
              asaas_subscription_id = ${createdSub.id},
              updated_at = NOW()
            WHERE tenant_id = ${tenantId}::uuid
          `;
        } catch (err: any) {
          console.error('[RECREATE_ASAAS_SUB_ERROR]', err);
          invoiceUrl = `https://sandbox.asaas.com/i/mock_recreate_${sub.plano}`;
        }
      }

      return res.status(200).json({
        success: true,
        data: { invoiceUrl }
      });
    }

    return res.status(405).json({ success: false, error: 'Método não permitido.' });
  } catch (err: any) {
    console.error('[CHECKOUT_ROUTE_ERROR]', err);
    return res.status(500).json({ success: false, error: err.message || 'Erro interno no faturamento.' });
  }
}
