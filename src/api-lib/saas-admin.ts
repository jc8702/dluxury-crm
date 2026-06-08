import { sql, validateAuth } from './_db.js';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { config } from './config/validateEnv.js';
import { logger } from './logger.js';

const MASTER_TENANT_ID = '00000000-0000-0000-0000-000000000000';

export async function handleSaaSAdmin(req: any, res: any) {
  try {
    const auth = validateAuth(req);
    if (!auth.authorized || !auth.user) {
      return res.status(401).json({ success: false, error: 'Usuário não autenticado.' });
    }

    // Permitir apenas o administrador do tenant master
    const isMasterTenant = auth.user.tenantId === MASTER_TENANT_ID;
    const isAdmin = auth.user.role === 'admin';
    const isMasterAdminEmail = auth.user.email === config.ADMIN_DEFAULT_EMAIL;

    if (!isMasterTenant && !isMasterAdminEmail) {
      return res.status(403).json({
        success: false,
        error: 'Acesso negado. Apenas o administrador SaaS global tem acesso.',
      });
    }

    const cleanUrl = (req.url || '').split('?')[0];

    // GET /api/saas-admin/tenants -> Listar todos os tenants e assinaturas
    if (req.method === 'GET' && cleanUrl.endsWith('/tenants')) {
      const tenantsRes = await sql`
        SELECT 
          t.id, 
          t.nome, 
          t.subdominio, 
          t.dominio_personalizado, 
          t.plano_tier, 
          t.status as tenant_status, 
          t.created_at as tenant_created_at,
          s.id as subscription_id, 
          s.status as subscription_status, 
          s.plano as subscription_plano, 
          s.valor as subscription_valor, 
          s.dia_vencimento, 
          s.current_period_end
        FROM tenants t
        LEFT JOIN subscriptions s ON s.tenant_id = t.id
        ORDER BY t.created_at DESC
      `;

      return res.status(200).json({
        success: true,
        data: tenantsRes.map((t) => ({
          id: t.id,
          nome: t.nome,
          subdominio: t.subdominio,
          dominioPersonalizado: t.dominio_personalizado,
          planoTier: t.plano_tier,
          status: t.tenant_status,
          createdAt: t.tenant_created_at,
          subscription: t.subscription_id
            ? {
                id: t.subscription_id,
                status: t.subscription_status,
                plano: t.subscription_plano,
                valor: parseFloat(t.subscription_valor || '0'),
                diaVencimento: t.dia_vencimento,
                currentPeriodEnd: t.current_period_end,
              }
            : null,
        })),
      });
    }

    // PATCH /api/saas-admin/tenants -> Editar dados de um tenant / assinatura
    if (req.method === 'PATCH' && cleanUrl.endsWith('/tenants')) {
      const { tenantId, planoTier, status, currentPeriodEnd, diaVencimento, valor } = req.body;

      if (!tenantId) {
        return res.status(400).json({ success: false, error: 'ID do Tenant é obrigatório.' });
      }

      // Verificar se o tenant existe
      const existing = await sql`SELECT id FROM tenants WHERE id = ${tenantId}::uuid LIMIT 1`;
      if (existing.length === 0) {
        return res.status(404).json({ success: false, error: 'Tenant não encontrado.' });
      }

      // Atualizar dados na tabela tenants se enviados
      if (planoTier || status) {
        await sql`
          UPDATE tenants 
          SET 
            plano_tier = COALESCE(${planoTier}, plano_tier),
            status = COALESCE(${status}, status)
          WHERE id = ${tenantId}::uuid
        `;
      }

      // Atualizar ou criar assinatura correspondente
      const subExists =
        await sql`SELECT id FROM subscriptions WHERE tenant_id = ${tenantId}::uuid LIMIT 1`;

      if (subExists.length > 0) {
        await sql`
          UPDATE subscriptions
          SET
            status = COALESCE(${status}, status),
            plano = COALESCE(${planoTier}, plano),
            valor = COALESCE(${valor ? parseFloat(valor) : null}, valor),
            dia_vencimento = COALESCE(${diaVencimento ? parseInt(diaVencimento) : null}, dia_vencimento),
            current_period_end = COALESCE(${currentPeriodEnd ? new Date(currentPeriodEnd) : null}, current_period_end),
            updated_at = NOW()
          WHERE tenant_id = ${tenantId}::uuid
        `;
      } else {
        const subId = crypto.randomUUID();
        const valorCalculado = valor
          ? parseFloat(valor)
          : planoTier === 'basic'
            ? 97.0
            : planoTier === 'pro'
              ? 197.0
              : 397.0;
        await sql`
          INSERT INTO subscriptions (id, tenant_id, status, plano, valor, dia_vencimento, current_period_end)
          VALUES (
            ${subId}, 
            ${tenantId}::uuid, 
            COALESCE(${status}, 'active'), 
            COALESCE(${planoTier}, 'pro'), 
            ${valorCalculado}, 
            COALESCE(${diaVencimento ? parseInt(diaVencimento) : null}, 5), 
            COALESCE(${currentPeriodEnd ? new Date(currentPeriodEnd) : null}, NOW() + INTERVAL '14 days')
          )
        `;
      }

      return res
        .status(200)
        .json({ success: true, message: 'Dados do tenant e assinatura atualizados com sucesso.' });
    }

    // POST /api/saas-admin/users -> Cadastrar usuário para tenant arbitrário
    if (req.method === 'POST' && cleanUrl.endsWith('/users')) {
      const { tenantId, name, email, role, password } = req.body;

      if (!tenantId || !name || !email || !role || !password) {
        return res.status(400).json({
          success: false,
          error: 'Todos os campos são obrigatórios: tenantId, name, email, role, password.',
        });
      }

      const emailNormalized = email.trim().toLowerCase();

      // Verificar se o tenant existe
      const tenantCheck = await sql`SELECT id FROM tenants WHERE id = ${tenantId}::uuid LIMIT 1`;
      if (tenantCheck.length === 0) {
        return res.status(404).json({ success: false, error: 'Tenant de destino não encontrado.' });
      }

      // Verificar se o e-mail já existe globalmente
      const emailCheck = await sql`SELECT id FROM users WHERE email = ${emailNormalized} LIMIT 1`;
      if (emailCheck.length > 0) {
        return res
          .status(400)
          .json({ success: false, error: 'Este e-mail já está em uso por outro usuário.' });
      }

      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);
      const newUserId = crypto.randomUUID();

      await sql`
        INSERT INTO users (id, name, email, password_hash, role, tenant_id)
        VALUES (${newUserId}, ${name.trim().toUpperCase()}, ${emailNormalized}, ${passwordHash}, ${role}, ${tenantId}::uuid)
      `;

      return res.status(201).json({
        success: true,
        message: 'Usuário cadastrado com sucesso no tenant.',
        data: {
          id: newUserId,
          name: name.toUpperCase(),
          email: emailNormalized,
          role,
          tenantId,
        },
      });
    }

    // GET /api/saas-admin/users -> Listar usuários de um tenant específico
    if (req.method === 'GET' && cleanUrl.endsWith('/users')) {
      const tenantId = req.query.tenantId;

      if (!tenantId) {
        return res.status(400).json({ success: false, error: 'Parâmetro tenantId é obrigatório.' });
      }

      const usersRes = await sql`
        SELECT id, name, email, role, created_at, tenant_id 
        FROM users 
        WHERE tenant_id = ${tenantId}::uuid 
        ORDER BY name ASC
      `;

      return res.status(200).json({
        success: true,
        data: usersRes,
      });
    }

    return res
      .status(405)
      .json({ success: false, error: 'Método não permitido ou rota inexistente.' });
  } catch (err: any) {
    logger.error('[SAAS_ADMIN_ROUTE_ERROR]', err);
    return res
      .status(500)
      .json({ success: false, error: err.message || 'Erro interno na rota SaaS Admin.' });
  }
}
