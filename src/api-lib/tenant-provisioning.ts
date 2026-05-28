import { sql } from './_db.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { AsaasService } from './asaas-service.js';

const BLACKLIST_SUBDOMAINS = new Set([
  'admin', 'api', 'www', 'app', 'dashboard', 'login', 'signup', 
  'billing', 'support', 'default', 'dluxury', 'crm', 'mail', 'webmail'
]);

const JWT_SECRET = process.env.APP_JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('APP_JWT_SECRET environment variable is required');
}

export async function provisionarTenant(params: {
  empresa: string;
  subdominio: string;
  email: string;
  senha: string;
  nomeAdmin: string;
  plano: 'basic' | 'pro' | 'enterprise';
}) {
  const { empresa, subdominio, email, senha, nomeAdmin, plano } = params;

  // 1. Validações de Formato e Regras de Negócio
  if (!empresa || !empresa.trim()) {
    throw new Error('Nome da empresa é obrigatório.');
  }

  const subNormalized = subdominio.trim().toLowerCase();
  if (!/^[a-z0-9-]+$/.test(subNormalized)) {
    throw new Error('O subdomínio deve conter apenas letras minúsculas, números e hífens.');
  }
  if (subNormalized.length < 3 || subNormalized.length > 30) {
    throw new Error('O subdomínio deve ter entre 3 e 30 caracteres.');
  }
  if (BLACKLIST_SUBDOMAINS.has(subNormalized)) {
    throw new Error('Este subdomínio não está disponível para uso.');
  }

  const emailNormalized = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailNormalized)) {
    throw new Error('Formato de e-mail inválido.');
  }

  if (!senha || senha.length < 8) {
    throw new Error('A senha deve ter pelo menos 8 caracteres.');
  }

  if (!nomeAdmin || !nomeAdmin.trim()) {
    throw new Error('Nome do administrador é obrigatório.');
  }

  if (!['basic', 'pro', 'enterprise'].includes(plano)) {
    throw new Error('Plano inválido selecionado.');
  }

  // 2. Verificar se subdomínio ou e-mail já estão em uso
  const existingTenant = await sql`SELECT id FROM tenants WHERE subdominio = ${subNormalized} LIMIT 1`;
  if (existingTenant.length > 0) {
    throw new Error('Este subdomínio já está em uso.');
  }

  const existingUser = await sql`SELECT id FROM users WHERE email = ${emailNormalized} LIMIT 1`;
  if (existingUser.length > 0) {
    throw new Error('Este e-mail já está cadastrado.');
  }

  const tenantId = crypto.randomUUID();
  const subscriptionId = crypto.randomUUID();
  const userId = crypto.randomUUID();

  try {
    // 3. Criar Tenant
    await sql`
      INSERT INTO tenants (id, nome, subdominio, plano_tier, status)
      VALUES (${tenantId}, ${empresa.trim().toUpperCase()}, ${subNormalized}, ${plano}, 'ativo')
    `;

    // 4. Criar Configurações Padrão de Marcenaria para o Tenant
    await sql`
      INSERT INTO tenant_configs (tenant_id, espessura_padrao_mdf, largura_maxima_sem_travessa, folga_gaveta_telescopica, markup_padrao)
      VALUES (${tenantId}, 15, 800, 13.00, 1.50)
    `;

    // 4.1. Criar Cliente e Assinatura no Asaas
    let asaasCustomerId = null;
    let asaasSubscriptionId = null;
    let invoiceUrl = null;

    try {
      const asaas = new AsaasService();
      
      const customer = await asaas.criarCliente({
        name: empresa.trim().toUpperCase(),
        email: emailNormalized,
        externalReference: tenantId
      });
      asaasCustomerId = customer.id;

      const valorPlano = plano === 'basic' ? 97.00 : plano === 'pro' ? 197.00 : 397.00;
      const sub = await asaas.criarAssinatura({
        customer: asaasCustomerId,
        plano,
        valor: valorPlano,
        externalReference: tenantId
      });
      asaasSubscriptionId = sub.id;
      invoiceUrl = sub.invoiceUrl;
    } catch (asaasErr: any) {
      console.error('[ASAAS_PROVISIONING_WARNING] Falha na integração do Asaas. Prosseguindo com dados mock.', asaasErr.message);
      asaasCustomerId = `cus_mock_${crypto.randomUUID().substring(0, 8)}`;
      asaasSubscriptionId = `sub_mock_${crypto.randomUUID().substring(0, 8)}`;
      invoiceUrl = `https://sandbox.asaas.com/i/mock_${asaasSubscriptionId}`;
    }

    // 5. Criar Assinatura Local no Banco
    const valorPlano = plano === 'basic' ? 97.00 : plano === 'pro' ? 197.00 : 397.00;
    await sql`
      INSERT INTO subscriptions (id, tenant_id, asaas_customer_id, asaas_subscription_id, status, plano, valor, dia_vencimento, current_period_end)
      VALUES (${subscriptionId}, ${tenantId}, ${asaasCustomerId}, ${asaasSubscriptionId}, 'trial', ${plano}, ${valorPlano}, 5, NOW() + INTERVAL '14 days')
    `;

    // 6. Criar Usuário Admin
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(senha, salt);
    await sql`
      INSERT INTO users (id, name, email, password_hash, role, tenant_id)
      VALUES (${userId}, ${nomeAdmin.trim().toUpperCase()}, ${emailNormalized}, ${passwordHash}, 'admin', ${tenantId})
    `;

    // 7. Criar Categorias de Estoque Padrão para o Tenant
    const tenantShort = tenantId.substring(0, 8);
    await sql`
      INSERT INTO erp_categories (id, nome, ativo, tenant_id)
      VALUES 
        (${`CHP-${tenantShort}`}, 'CHAPAS', true, ${tenantId}),
        (${`FIT-${tenantShort}`}, 'FITAS DE BORDA', true, ${tenantId}),
        (${`FIX-${tenantShort}`}, 'FIXAÇÕES', true, ${tenantId}),
        (${`RET-${tenantShort}`}, 'RETALHO', true, ${tenantId})
    `;

    // 8. Gerar Token JWT
    const token = jwt.sign(
      {
        id: userId,
        email: emailNormalized,
        role: 'admin',
        name: nomeAdmin.trim().toUpperCase(),
        tenantId,
        planoTier: plano,
        subdominio: subNormalized
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return {
      token,
      tenantId,
      invoiceUrl,
      user: {
        id: userId,
        name: nomeAdmin.trim().toUpperCase(),
        email: emailNormalized,
        role: 'admin',
        tenantId,
        planoTier: plano,
        subdominio: subNormalized
      }
    };
  } catch (err: any) {
    // Rollback manual simples para evitar registros órfãos em caso de falha de conexão/inserção parcial
    console.error('[SIGNUP_PROVISIONING_ERROR]', err);
    await sql`DELETE FROM users WHERE tenant_id = ${tenantId}`.catch(() => {});
    await sql`DELETE FROM erp_categories WHERE tenant_id = ${tenantId}`.catch(() => {});
    await sql`DELETE FROM subscriptions WHERE tenant_id = ${tenantId}`.catch(() => {});
    await sql`DELETE FROM tenant_configs WHERE tenant_id = ${tenantId}`.catch(() => {});
    await sql`DELETE FROM tenants WHERE id = ${tenantId}`.catch(() => {});
    throw err;
  }
}

export async function handleSignup(req: any, res: any) {
  try {
    const cleanUrl = (req.url || '').split('?')[0];

    // GET /api/signup/check-subdomain?s=nome
    if (req.method === 'GET' && cleanUrl.endsWith('/check-subdomain')) {
      const subdomain = req.query.s;
      if (!subdomain || typeof subdomain !== 'string') {
        return res.status(400).json({ success: false, error: 'Subdomínio não informado.' });
      }
      const subNormalized = subdomain.trim().toLowerCase();
      if (!/^[a-z0-9-]+$/.test(subNormalized) || subNormalized.length < 3 || subNormalized.length > 30 || BLACKLIST_SUBDOMAINS.has(subNormalized)) {
        return res.status(200).json({ success: true, data: { disponivel: false } });
      }
      const existing = await sql`SELECT id FROM tenants WHERE subdominio = ${subNormalized} LIMIT 1`;
      return res.status(200).json({ success: true, data: { disponivel: existing.length === 0 } });
    }

    // POST /api/signup
    if (req.method === 'POST') {
      const body = req.body || {};
      const result = await provisionarTenant({
        empresa: body.empresa,
        subdominio: body.subdominio,
        email: body.email,
        senha: body.senha,
        nomeAdmin: body.nomeAdmin,
        plano: body.plano
      });

      return res.status(201).json({
        success: true,
        data: result
      });
    }

    return res.status(405).json({ success: false, error: 'Método não permitido.' });
  } catch (err: any) {
    return res.status(400).json({
      success: false,
      error: err.message || 'Erro ao criar conta.'
    });
  }
}
