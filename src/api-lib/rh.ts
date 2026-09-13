import { sql } from './_db.js';
import { withTenant, type TenantHandler } from './middleware/tenantMiddleware.js';
import { z } from 'zod';
import { logger } from './logger.js';
import { hasFeature } from '../lib/features.js';
import * as calc from '../modules/rh/domain/calculations.js';

function isAdmin(role?: string): boolean {
  if (!role) return false;
  const r = String(role).toLowerCase();
  return r === 'admin' || r === 'administrator';
}

function requireAdmin(req: any, res: any): boolean {
  const role = req.tenantUser?.role;
  if (!isAdmin(role)) {
    res.status(403).json({ success: false, error: 'Acesso restrito a administradores' });
    return false;
  }
  return true;
}

async function getDivisor(tenantId: string): Promise<number> {
  try {
    const rows =
      await sql`SELECT rh_divisor_hora FROM tenant_configs WHERE tenant_id = ${tenantId}::uuid LIMIT 1`;
    const v = rows[0]?.rh_divisor_hora;
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? n : 220;
  } catch {
    return 220;
  }
}

function competenciaRange(competencia: string) {
  const { inicio, fimExclusivo } = calc.formatCompetenciaToRange(competencia);
  return { inicio, fim: fimExclusivo };
}

async function computeReceitaMes(tenantId: string, competencia: string): Promise<number> {
  const { inicio, fim } = competenciaRange(competencia);
  const rows = await sql`
    SELECT COALESCE(SUM(valor_liquido::numeric),0) as total
    FROM titulos_receber
    WHERE tenant_id = ${tenantId}::uuid
      AND data_pagamento >= ${inicio}::date
      AND data_pagamento < ${fim}::date
      AND status = 'pago' AND deletado = false
  `;
  return Number(rows[0]?.total || 0);
}

async function computeCustosMes(tenantId: string, competencia: string): Promise<number> {
  const { inicio, fim } = competenciaRange(competencia);
  // exclui classes 5.01/5.02 para não duplicar folha
  const rows = await sql`
    SELECT COALESCE(SUM(t.valor_liquido::numeric),0) as total
    FROM titulos_pagar t
    LEFT JOIN classes_financeiras cf ON t.classe_financeira_id = cf.id
    WHERE t.tenant_id = ${tenantId}::uuid
      AND t.data_pagamento >= ${inicio}::date
      AND t.data_pagamento < ${fim}::date
      AND t.status = 'pago' AND t.deletado = false
      AND (cf.codigo IS NULL OR cf.codigo NOT IN ('5.01','5.02'))
  `;
  return Number(rows[0]?.total || 0);
}

async function sumAdiantamentosPendentes(
  tenantId: string,
  colaboradorId: string,
  competencia: string,
): Promise<number> {
  const rows = await sql`
    SELECT COALESCE(SUM(valor::numeric),0) as total
    FROM adiantamentos
    WHERE tenant_id = ${tenantId}::uuid
      AND colaborador_id = ${colaboradorId}::uuid
      AND competencia_desconto = ${competencia}
      AND status = 'pendente'
  `;
  return Number(rows[0]?.total || 0);
}

async function ensureRhFeature(req: any, res: any): Promise<boolean> {
  const tier = (req.planoTier || 'basic') as any;
  if (!hasFeature(tier, 'rh')) {
    // fallback: also check financeiro? rh is pro/enterprise per plano
    // allow pro/enterprise only
    if (tier !== 'pro' && tier !== 'enterprise') {
      res.status(403).json({
        success: false,
        error: 'Funcionalidade RH disponível apenas para planos Pro/Enterprise',
      });
      return false;
    }
  }
  return true;
}

// Zod schemas
const colaboradorSchema = z.object({
  nome: z.string().min(2, 'Nome obrigatório'),
  cpf: z.string().optional().nullable(),
  telefone: z.string().optional().nullable(),
  email: z.string().email('Email inválido').optional().nullable().or(z.literal('')),
  tipo: z.enum(['socio', 'colaborador_fixo']),
  vinculo: z.enum(['informal', 'mei', 'clt']).default('informal'),
  cargo: z.string().optional().nullable(),
  salario_base: z
    .number()
    .positive('Salário deve ser >0')
    .or(z.string().transform((v) => Number(v)))
    .pipe(z.number().positive()),
  participacao_lucros: z
    .number()
    .min(0)
    .max(100)
    .optional()
    .default(0)
    .or(z.string().transform((v) => Number(v)))
    .pipe(z.number().min(0).max(100)),
  chave_pix: z.string().optional().nullable(),
  data_admissao: z.string().optional().nullable(),
  ativo: z.boolean().optional().default(true),
  user_id: z.string().uuid().optional().nullable(),
});

const presencaBulkSchema = z.object({
  presencas: z
    .array(
      z.object({
        colaborador_id: z.string().uuid(),
        data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        status: z.enum([
          'presente',
          'falta',
          'falta_justificada',
          'meio_periodo',
          'ferias',
          'atestado',
        ]),
        observacao: z.string().optional().nullable(),
        hora_saida: z
          .string()
          .regex(/^\d{1,2}:\d{2}$/, 'hora_saida deve ser HH:MM')
          .optional()
          .nullable(),
        hora_retorno: z
          .string()
          .regex(/^\d{1,2}:\d{2}$/, 'hora_retorno deve ser HH:MM')
          .optional()
          .nullable(),
        horas_falta_minutos: z.number().min(0).max(1440).optional().nullable(),
      }),
    )
    .min(1),
});

const adiantamentoSchema = z.object({
  colaborador_id: z.string().uuid(),
  valor: z
    .number()
    .positive()
    .or(z.string().transform((v) => Number(v)))
    .pipe(z.number().positive()),
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  competencia_desconto: z.string().regex(/^\d{4}-\d{2}$/),
  forma_pagamento_id: z.string().uuid().optional().nullable(),
  observacao: z.string().optional().nullable(),
  force: z.boolean().optional(), // override >50%
  justificativa: z.string().optional().nullable(),
});

const folhaCreateSchema = z.object({
  competencia: z.string().regex(/^\d{4}-\d{2}$/, 'Competência deve ser YYYY-MM'),
});

const itemUpdateSchema = z.object({
  horas_extras_qtd: z
    .number()
    .min(0)
    .optional()
    .or(z.string().transform((v) => Number(v)))
    .pipe(z.number().min(0).optional()),
  horas_extras_previstas: z
    .number()
    .min(0)
    .optional()
    .or(z.string().transform((v) => Number(v)))
    .pipe(z.number().min(0).optional()),
  horas_extras_tipo: z.enum(['50', '100']).optional(),
  bonus_producao: z
    .number()
    .min(0)
    .optional()
    .or(z.string().transform((v) => Number(v)))
    .pipe(z.number().min(0).optional()),
  outros_descontos: z
    .number()
    .min(0)
    .optional()
    .or(z.string().transform((v) => Number(v)))
    .pipe(z.number().min(0).optional()),
  outros_descricao: z.string().optional().nullable(),
});

// Core handler
const handleRHCore: TenantHandler = async (req, res) => {
  const tenantId = req.tenantId as string;
  const user = req.tenantUser;

  if (!(await ensureRhFeature(req, res))) return;
  // we still check admin per endpoint where needed, but overall RH is admin only per F6
  // For now enforce admin for all except dashboard maybe?
  // We'll enforce per route.

  // bootstrap: ensure classes and configs exist (seed already, mas garantir)
  try {
    await sql`ALTER TABLE tenant_configs ADD COLUMN IF NOT EXISTS rh_divisor_hora integer DEFAULT 220`.catch(
      () => {},
    );
    await sql`ALTER TABLE tenant_configs ADD COLUMN IF NOT EXISTS rh_he_adicional_padrao numeric(5,2) DEFAULT '50'`.catch(
      () => {},
    );
  } catch (e) {
    // ignora se colunas já existirem
    void e;
  }

  const fullUrl = req.url || '';
  const urlPath = fullUrl.split('?')[0];
  // remove /api/rh prefix
  const clean = urlPath.replace(/^\/api\/rh/, '') || '/';
  const parts = clean.split('/').filter(Boolean); // e.g., ['colaboradores','id']
  const resource = parts[0] || '';
  const id = parts[1];
  const sub = parts[2];
  const sub2 = parts[3];

  // query params already in req.query (parsed by api/index? not always)
  // Ensure req.query exists
  if (!req.query) {
    const qs = fullUrl.split('?')[1] || '';
    req.query = Object.fromEntries(new URLSearchParams(qs));
  }

  try {
    // ── COLABORADORES ──
    if (resource === 'colaboradores') {
      if (req.method === 'GET' && !id) {
        if (!requireAdmin(req, res)) return;
        const rows = await sql`
          SELECT id, tenant_id, nome, cpf, telefone, email, tipo, vinculo, cargo,
                 salario_base, participacao_lucros, chave_pix, data_admissao, ativo, user_id, created_at, updated_at
          FROM colaboradores WHERE tenant_id = ${tenantId}::uuid ORDER BY nome ASC
        `;
        return res.status(200).json({ success: true, data: rows });
      }
      if (req.method === 'POST' && !id) {
        if (!requireAdmin(req, res)) return;
        const parsed = colaboradorSchema.safeParse(req.body);
        if (!parsed.success) {
          return res.status(400).json({ success: false, error: parsed.error.issues[0].message });
        }
        const d = parsed.data;
        // valida tipo
        if (d.tipo === 'socio' && (d.participacao_lucros ?? 0) > 100) {
          return res.status(400).json({ success: false, error: 'Participação lucros máximo 100%' });
        }
        const result = await sql`
          INSERT INTO colaboradores (tenant_id, nome, cpf, telefone, email, tipo, vinculo, cargo, salario_base, participacao_lucros, chave_pix, data_admissao, ativo, user_id)
          VALUES (${tenantId}::uuid, ${d.nome}, ${d.cpf || null}, ${d.telefone || null}, ${d.email || null}, ${d.tipo}, ${d.vinculo || 'informal'}, ${d.cargo || null}, ${d.salario_base}, ${d.participacao_lucros || 0}, ${d.chave_pix || null}, ${d.data_admissao || null}::date, ${d.ativo ?? true}, ${d.user_id || null}::uuid)
          RETURNING *
        `;
        // audit
        try {
          await sql`INSERT INTO audit_logs (tenant_id, user_id, entity_type, entity_id, action, data_after) VALUES (${tenantId}::uuid, ${user.id}::uuid, 'colaboradores', ${result[0].id}::uuid, 'create_colaborador', ${JSON.stringify(result[0])}::jsonb)`;
        } catch (e) {
          void e;
        }
        return res.status(201).json({ success: true, data: result[0] });
      }
      if ((req.method === 'PATCH' || req.method === 'PUT') && id) {
        if (!requireAdmin(req, res)) return;
        const existing = (
          await sql`SELECT id FROM colaboradores WHERE id = ${id}::uuid AND tenant_id = ${tenantId}::uuid`
        )[0];
        if (!existing)
          return res.status(404).json({ success: false, error: 'Colaborador não encontrado' });
        const body = req.body || {};
        // allow partial update
        // validate salario if present
        if (body.salario_base !== undefined && Number(body.salario_base) <= 0) {
          return res.status(400).json({ success: false, error: 'Salário deve ser >0' });
        }
        if (
          body.participacao_lucros !== undefined &&
          (Number(body.participacao_lucros) < 0 || Number(body.participacao_lucros) > 100)
        ) {
          return res.status(400).json({ success: false, error: 'Participação 0-100' });
        }
        if (body.tipo !== undefined && !['socio', 'colaborador_fixo'].includes(body.tipo)) {
          return res.status(400).json({ success: false, error: 'Tipo inválido' });
        }
        const result = await sql`
          UPDATE colaboradores SET
            nome = COALESCE(${body.nome ?? null}, nome),
            cpf = COALESCE(${body.cpf ?? null}, cpf),
            telefone = COALESCE(${body.telefone ?? null}, telefone),
            email = COALESCE(${body.email ?? null}, email),
            tipo = COALESCE(${body.tipo ?? null}, tipo),
            vinculo = COALESCE(${body.vinculo ?? null}, vinculo),
            cargo = COALESCE(${body.cargo ?? null}, cargo),
            salario_base = COALESCE(${body.salario_base ?? null}::numeric, salario_base),
            participacao_lucros = COALESCE(${body.participacao_lucros ?? null}::numeric, participacao_lucros),
            chave_pix = COALESCE(${body.chave_pix ?? null}, chave_pix),
            data_admissao = COALESCE(${body.data_admissao ?? null}::date, data_admissao),
            ativo = COALESCE(${body.ativo ?? null}::boolean, ativo),
            user_id = COALESCE(${body.user_id ?? null}::uuid, user_id),
            updated_at = NOW()
          WHERE id = ${id}::uuid AND tenant_id = ${tenantId}::uuid
          RETURNING *
        `;
        try {
          await sql`INSERT INTO audit_logs (tenant_id, user_id, entity_type, entity_id, action, data_after) VALUES (${tenantId}::uuid, ${user.id}::uuid, 'colaboradores', ${id}::uuid, 'update_colaborador', ${JSON.stringify(result[0])}::jsonb)`;
        } catch (e) {
          void e;
        }
        return res.status(200).json({ success: true, data: result[0] });
      }
      if (req.method === 'DELETE' && id) {
        if (!requireAdmin(req, res)) return;
        // check if tem folha
        const hasFolha = (
          await sql`SELECT 1 FROM folha_itens fi JOIN folha_pagamentos fp ON fi.folha_id = fp.id WHERE fi.colaborador_id = ${id}::uuid AND fp.tenant_id = ${tenantId}::uuid LIMIT 1`
        )[0];
        if (hasFolha) {
          await sql`UPDATE colaboradores SET ativo = false, updated_at = NOW() WHERE id = ${id}::uuid AND tenant_id = ${tenantId}::uuid`;
          try {
            await sql`INSERT INTO audit_logs (tenant_id, user_id, entity_type, entity_id, action) VALUES (${tenantId}::uuid, ${user.id}::uuid, 'colaboradores', ${id}::uuid, 'soft_delete_colaborador_ativo_false')`;
          } catch (e) {
            void e;
          }
          return res
            .status(200)
            .json({ success: true, message: 'Colaborador possui folha, marcado como inativo' });
        }
        await sql`DELETE FROM colaboradores WHERE id = ${id}::uuid AND tenant_id = ${tenantId}::uuid`;
        try {
          await sql`INSERT INTO audit_logs (tenant_id, user_id, entity_type, entity_id, action) VALUES (${tenantId}::uuid, ${user.id}::uuid, 'colaboradores', ${id}::uuid, 'delete_colaborador')`;
        } catch (e) {
          void e;
        }
        return res.status(200).json({ success: true });
      }
      return res
        .status(405)
        .json({ success: false, error: 'Método não permitido em colaboradores' });
    }

    // ── PRESENÇAS ──
    if (resource === 'presencas') {
      if (req.method === 'GET') {
        if (!requireAdmin(req, res)) return;
        const colaboradorId = req.query?.colaborador_id || req.query?.colaboradorId;
        const mes = req.query?.mes; // YYYY-MM
        if (!colaboradorId || !mes) {
          return res
            .status(400)
            .json({ success: false, error: 'colaborador_id e mes (YYYY-MM) são obrigatórios' });
        }
        const { inicio, fimExclusivo: fim } = calc.formatCompetenciaToRange(mes);
        const rows = await sql`
          SELECT id, tenant_id, colaborador_id, data, status, observacao, hora_saida, hora_retorno, horas_falta_minutos, created_at
          FROM presencas
          WHERE tenant_id = ${tenantId}::uuid
            AND colaborador_id = ${colaboradorId}::uuid
            AND data >= ${inicio}::date AND data < ${fim}::date
          ORDER BY data ASC
        `;
        return res.status(200).json({ success: true, data: rows });
      }
      if (req.method === 'PUT') {
        if (!requireAdmin(req, res)) return;
        const parsed = presencaBulkSchema.safeParse(req.body);
        if (!parsed.success) {
          return res.status(400).json({ success: false, error: parsed.error.issues[0].message });
        }
        const entries = parsed.data.presencas;
        // valida data não futura distante (>30 dias futuro)
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);
        const limite = new Date(hoje);
        limite.setDate(limite.getDate() + 30);
        for (const e of entries) {
          const d = new Date(e.data);
          if (d > limite) {
            return res
              .status(400)
              .json({ success: false, error: `Data ${e.data} muito no futuro (limite 30 dias)` });
          }
          // verifica colaborador pertence ao tenant
          const col = (
            await sql`SELECT id FROM colaboradores WHERE id = ${e.colaborador_id}::uuid AND tenant_id = ${tenantId}::uuid`
          )[0];
          if (!col)
            return res.status(400).json({
              success: false,
              error: `Colaborador ${e.colaborador_id} não pertence ao tenant`,
            });
        }
        // upsert em transação — cálculo automático horas_falta_minutos a partir de hora_saida/retorno
        const inserted: any[] = [];
        for (const e of entries) {
          // cálculo automático se ambos horários fornecidos, senão usa explicit ou 0
          let minutos = 0;
          if (e.horas_falta_minutos !== undefined && e.horas_falta_minutos !== null) {
            minutos = Math.max(0, Math.min(1440, Number(e.horas_falta_minutos) || 0));
          } else if (e.hora_saida && e.hora_retorno) {
            minutos = calc.calcFaltaHorasMinutos(e.hora_saida, e.hora_retorno);
          }
          const r = await sql`
            INSERT INTO presencas (tenant_id, colaborador_id, data, status, observacao, hora_saida, hora_retorno, horas_falta_minutos)
            VALUES (${tenantId}::uuid, ${e.colaborador_id}::uuid, ${e.data}::date, ${e.status}, ${e.observacao || null}, ${e.hora_saida || null}, ${e.hora_retorno || null}, ${minutos})
            ON CONFLICT (tenant_id, colaborador_id, data) DO UPDATE SET status = EXCLUDED.status, observacao = EXCLUDED.observacao, hora_saida = EXCLUDED.hora_saida, hora_retorno = EXCLUDED.hora_retorno, horas_falta_minutos = EXCLUDED.horas_falta_minutos
            RETURNING *
          `;
          inserted.push(r[0]);
        }
        return res.status(200).json({ success: true, data: inserted });
      }
      return res.status(405).json({ success: false, error: 'Método não permitido em presencas' });
    }

    // ── ADIANTAMENTOS ──
    if (resource === 'adiantamentos') {
      if (req.method === 'GET') {
        if (!requireAdmin(req, res)) return;
        const competencia = req.query?.competencia;
        // drizzle tag cannot do dynamic filter easily, use Pool style? Use `sql` string building fallback to Pool?
        // Use raw pool via sql.query? Instead use conditional queries with separate branches
        if (competencia && status) {
          const rows =
            await sql`SELECT a.*, c.nome as colaborador_nome, c.salario_base FROM adiantamentos a JOIN colaboradores c ON a.colaborador_id = c.id WHERE a.tenant_id = ${tenantId}::uuid AND a.competencia_desconto = ${competencia} AND a.status = ${status} ORDER BY a.data DESC`;
          return res.status(200).json({ success: true, data: rows });
        } else if (competencia) {
          const rows =
            await sql`SELECT a.*, c.nome as colaborador_nome, c.salario_base FROM adiantamentos a JOIN colaboradores c ON a.colaborador_id = c.id WHERE a.tenant_id = ${tenantId}::uuid AND a.competencia_desconto = ${competencia} ORDER BY a.data DESC`;
          return res.status(200).json({ success: true, data: rows });
        } else if (status) {
          const rows =
            await sql`SELECT a.*, c.nome as colaborador_nome, c.salario_base FROM adiantamentos a JOIN colaboradores c ON a.colaborador_id = c.id WHERE a.tenant_id = ${tenantId}::uuid AND a.status = ${status} ORDER BY a.data DESC`;
          return res.status(200).json({ success: true, data: rows });
        } else {
          const rows =
            await sql`SELECT a.*, c.nome as colaborador_nome, c.salario_base FROM adiantamentos a JOIN colaboradores c ON a.colaborador_id = c.id WHERE a.tenant_id = ${tenantId}::uuid ORDER BY a.data DESC`;
          return res.status(200).json({ success: true, data: rows });
        }
      }
      if (req.method === 'POST') {
        if (!requireAdmin(req, res)) return;
        const parsed = adiantamentoSchema.safeParse(req.body);
        if (!parsed.success) {
          return res.status(400).json({ success: false, error: parsed.error.issues[0].message });
        }
        const d = parsed.data;
        // verifica colaborador
        const col = (
          await sql`SELECT id, salario_base, nome FROM colaboradores WHERE id = ${d.colaborador_id}::uuid AND tenant_id = ${tenantId}::uuid`
        )[0];
        if (!col)
          return res.status(404).json({ success: false, error: 'Colaborador não encontrado' });
        const salario = Number(col.salario_base);
        const sumPendente = await sumAdiantamentosPendentes(
          tenantId,
          d.colaborador_id,
          d.competencia_desconto,
        );
        const limite = salario * 0.5;
        const disponivel = limite - sumPendente;
        if (d.valor > disponivel && !d.force) {
          return res.status(400).json({
            success: false,
            error: `Limite excedido. Salário R$${salario.toFixed(2)} → limite 50% R$${limite.toFixed(2)}. Já usado R$${sumPendente.toFixed(2)}. Disponível R$${disponivel.toFixed(2)}. Solicitado R$${d.valor.toFixed(2)}.`,
            disponivel,
            limite,
            usado: sumPendente,
          });
        }
        if (d.valor > disponivel && d.force) {
          if (!d.justificativa || d.justificativa.trim().length < 5) {
            return res
              .status(400)
              .json({ success: false, error: 'Override >50% exige justificativa (mín 5 chars)' });
          }
          // audit override
          try {
            await sql`INSERT INTO audit_logs (tenant_id, user_id, entity_type, entity_id, action, data_after) VALUES (${tenantId}::uuid, ${user.id}::uuid, 'adiantamentos', ${d.colaborador_id}::uuid, 'override_adiantamento_50', ${JSON.stringify({ valor: d.valor, disponivel, justificativa: d.justificativa })}::jsonb)`;
          } catch (e) {
            void e;
          }
        }
        const result = await sql`
          INSERT INTO adiantamentos (tenant_id, colaborador_id, valor, data, competencia_desconto, forma_pagamento_id, observacao, status)
          VALUES (${tenantId}::uuid, ${d.colaborador_id}::uuid, ${d.valor}, ${d.data}::date, ${d.competencia_desconto}, ${d.forma_pagamento_id || null}::uuid, ${d.observacao || null}, 'pendente')
          RETURNING *
        `;
        return res.status(201).json({ success: true, data: result[0] });
      }
      return res
        .status(405)
        .json({ success: false, error: 'Método não permitido em adiantamentos' });
    }

    // ── FOLHAS ──
    if (resource === 'folhas') {
      // GET /folhas
      if (req.method === 'GET' && !id) {
        if (!requireAdmin(req, res)) return;
        const rows = await sql`
          SELECT id, tenant_id, competencia, status, total_bruto, total_descontos, total_liquido, total_horas_extras, total_bonus, receita_mes, custos_mes, lucro_distribuivel, fechada_em, fechada_por, created_at, updated_at
          FROM folha_pagamentos WHERE tenant_id = ${tenantId}::uuid ORDER BY competencia DESC
        `;
        return res.status(200).json({ success: true, data: rows });
      }
      // POST /folhas {competencia}
      if (req.method === 'POST' && !id) {
        if (!requireAdmin(req, res)) return;
        const parsed = folhaCreateSchema.safeParse(req.body);
        if (!parsed.success)
          return res.status(400).json({ success: false, error: parsed.error.issues[0].message });
        const competencia = parsed.data.competencia;
        const exists = (
          await sql`SELECT id FROM folha_pagamentos WHERE tenant_id = ${tenantId}::uuid AND competencia = ${competencia} LIMIT 1`
        )[0];
        if (exists)
          return res.status(400).json({ success: false, error: `Folha ${competencia} já existe` });
        // busca colaboradores ativos
        const cols =
          await sql`SELECT id, nome, tipo, salario_base, participacao_lucros FROM colaboradores WHERE tenant_id = ${tenantId}::uuid AND ativo = true ORDER BY nome ASC`;
        if (cols.length === 0)
          return res.status(400).json({ success: false, error: 'Nenhum colaborador ativo' });
        const divisor = await getDivisor(tenantId);
        const receitaMes = await computeReceitaMes(tenantId, competencia);
        const custosMes = await computeCustosMes(tenantId, competencia);

        // calcula itens
        const itensPayload: any[] = [];
        let totalBruto = 0,
          totalDescontos = 0,
          totalLiquido = 0,
          totalHE = 0,
          totalBonus = 0;
        // para lucro distribuível precisamos separar socios
        let totalFolhaColabs = 0;

        for (const c of cols) {
          const salario = Number(c.salario_base);
          totalBruto += salario;
          // faltas (dias) + horas falta parciais
          const { inicio, fimExclusivo: fim } = calc.formatCompetenciaToRange(competencia);
          const presRows =
            await sql`SELECT status, hora_saida, hora_retorno, horas_falta_minutos FROM presencas WHERE tenant_id = ${tenantId}::uuid AND colaborador_id = ${c.id}::uuid AND data >= ${inicio}::date AND data < ${fim}::date`;
          const faltasDias = calc.calcFaltasDias(presRows as any);
          const valorFaltas = calc.calcValorFaltas(faltasDias, salario);
          const horasFaltaMinutos = calc.calcTotalFaltaMinutos(presRows as any[]);
          const valorFaltaHoras = calc.calcValorFaltaHoras(horasFaltaMinutos, salario, divisor);
          const adiantamento = await sumAdiantamentosPendentes(tenantId, c.id, competencia);
          const horasQtd = 0;
          const horasPrev = 0;
          const valorHE = calc.calcValorHE(horasQtd, salario, divisor, 50);
          const valorHEPrev = calc.calcValorHE(horasPrev, salario, divisor, 50);
          const bonus = 0;
          const outros = 0;
          const liquido = calc.calcLiquido({
            salarioBase: salario,
            valorFaltas,
            valorFaltaHoras,
            valorHorasExtras: valorHE,
            bonusProducao: bonus,
            adiantamento,
            outrosDescontos: outros,
          });
          const liquidoPrev = calc.calcLiquidoPrevisto({
            salarioBase: salario,
            valorFaltas,
            valorFaltaHoras,
            valorHorasExtrasPrevisto: valorHEPrev,
            bonusProducao: bonus,
            adiantamento,
            outrosDescontos: outros,
          });
          itensPayload.push({
            colaboradorId: c.id,
            salarioBase: salario,
            diasTrabalhados: 30,
            faltasDias,
            valorFaltas,
            horasFaltaMinutos,
            valorFaltaHoras,
            horasExtrasQtd: horasQtd,
            horasExtrasPrevistas: horasPrev,
            valorHorasExtras: valorHE,
            valorHorasExtrasPrevisto: valorHEPrev,
            bonusProducao: bonus,
            adiantamento,
            outrosDescontos: outros,
            outrosDescricao: null,
            valorLiquido: liquido,
            valorLiquidoPrevisto: liquidoPrev,
            tipo: c.tipo,
          });
          totalDescontos += valorFaltas + valorFaltaHoras + adiantamento + outros;
          totalLiquido += liquido;
          totalHE += valorHE;
          totalBonus += bonus;
          if (c.tipo !== 'socio') totalFolhaColabs += liquido;
        }
        const lucro = calc.calcLucroDistribuivel(receitaMes, custosMes, totalFolhaColabs);
        // cria folha
        const folha = (
          await sql`
          INSERT INTO folha_pagamentos (tenant_id, competencia, status, total_bruto, total_descontos, total_liquido, total_horas_extras, total_bonus, receita_mes, custos_mes, lucro_distribuivel)
          VALUES (${tenantId}::uuid, ${competencia}, 'rascunho', ${totalBruto}, ${totalDescontos}, ${totalLiquido}, ${totalHE}, ${totalBonus}, ${receitaMes}, ${custosMes}, ${lucro})
          RETURNING *
        `
        )[0];
        // cria itens
        for (const it of itensPayload) {
          await sql`
            INSERT INTO folha_itens (folha_id, colaborador_id, salario_base, dias_trabalhados, faltas_dias, valor_faltas, horas_falta_minutos, valor_falta_horas, horas_extras_qtd, horas_extras_tipo, horas_extras_previstas, valor_horas_extras, valor_horas_extras_previsto, bonus_producao, adiantamento, outros_descontos, outros_descricao, valor_liquido, valor_liquido_previsto)
            VALUES (${folha.id}::uuid, ${it.colaboradorId}::uuid, ${it.salarioBase}, ${it.diasTrabalhados}, ${it.faltasDias}, ${it.valorFaltas}, ${it.horasFaltaMinutos}, ${it.valorFaltaHoras}, ${it.horasExtrasQtd}, '50', ${it.horasExtrasPrevistas}, ${it.valorHorasExtras}, ${it.valorHorasExtrasPrevisto}, ${it.bonusProducao}, ${it.adiantamento}, ${it.outrosDescontos}, ${it.outrosDescricao}, ${it.valorLiquido}, ${it.valorLiquidoPrevisto})
          `;
        }
        // retorna folha com itens
        const itens = await sql`
          SELECT fi.*, c.nome as colaborador_nome, c.tipo as colaborador_tipo
          FROM folha_itens fi JOIN colaboradores c ON fi.colaborador_id = c.id
          WHERE fi.folha_id = ${folha.id}::uuid
          ORDER BY c.nome ASC
        `;
        try {
          await sql`INSERT INTO audit_logs (tenant_id, user_id, entity_type, entity_id, action, data_after) VALUES (${tenantId}::uuid, ${user.id}::uuid, 'folha_pagamentos', ${folha.id}::uuid, 'create_folha', ${JSON.stringify({ competencia })}::jsonb)`;
        } catch (e) {
          void e;
        }
        return res.status(201).json({ success: true, data: { ...folha, itens } });
      }

      // GET /folhas/:id
      if (req.method === 'GET' && id && !sub) {
        if (!requireAdmin(req, res)) return;
        const folha = (
          await sql`SELECT * FROM folha_pagamentos WHERE id = ${id}::uuid AND tenant_id = ${tenantId}::uuid`
        )[0];
        if (!folha) return res.status(404).json({ success: false, error: 'Folha não encontrada' });
        const itens = await sql`
          SELECT fi.*, c.nome as colaborador_nome, c.tipo as colaborador_tipo, c.salario_base as col_salario_base
          FROM folha_itens fi JOIN colaboradores c ON fi.colaborador_id = c.id
          WHERE fi.folha_id = ${id}::uuid ORDER BY c.nome ASC
        `;
        // lucro ao vivo: recalcula receita/custos atuais
        const receitaAoVivo = await computeReceitaMes(tenantId, folha.competencia);
        const custosAoVivo = await computeCustosMes(tenantId, folha.competencia);
        // total folha colaboradores (tipo != socio)
        let totalFolhaColabs = 0;
        for (const it of itens)
          if ((it as any).colaborador_tipo !== 'socio')
            totalFolhaColabs += Number((it as any).valor_liquido);
        const lucroAoVivo = calc.calcLucroDistribuivel(
          receitaAoVivo,
          custosAoVivo,
          totalFolhaColabs,
        );
        // bonus hint: ordens_prod entregues no mês
        const { inicio: i2, fimExclusivo: f2 } = calc.formatCompetenciaToRange(folha.competencia);
        let projetosEntregues = 0;
        try {
          const ord =
            await sql`SELECT COUNT(*)::int as total FROM ordens_prod WHERE tenant_id = ${tenantId}::uuid AND data_conclusao >= ${i2}::date AND data_conclusao < ${f2}::date`;
          projetosEntregues = Number(ord[0]?.total || 0);
        } catch (e) {
          void e;
        }
        // adiantamentos pendentes por competencia (para UI)
        const adiantamentos =
          await sql`SELECT * FROM adiantamentos WHERE tenant_id = ${tenantId}::uuid AND competencia_desconto = ${folha.competencia} ORDER BY created_at DESC`;
        const presencas =
          await sql`SELECT * FROM presencas WHERE tenant_id = ${tenantId}::uuid AND data >= ${i2}::date AND data < ${f2}::date ORDER BY data ASC`;
        return res.status(200).json({
          success: true,
          data: {
            folha: {
              ...folha,
              receita_ao_vivo: receitaAoVivo,
              custos_ao_vivo: custosAoVivo,
              lucro_ao_vivo: lucroAoVivo,
              projetosEntregues,
            },
            itens,
            adiantamentos,
            presencas,
          },
        });
      }

      // PUT /folhas/:id/itens/:itemId
      if ((req.method === 'PUT' || req.method === 'PATCH') && id && sub === 'itens' && sub2) {
        if (!requireAdmin(req, res)) return;
        const folha = (
          await sql`SELECT * FROM folha_pagamentos WHERE id = ${id}::uuid AND tenant_id = ${tenantId}::uuid`
        )[0];
        if (!folha) return res.status(404).json({ success: false, error: 'Folha não encontrada' });
        if (folha.status !== 'rascunho')
          return res
            .status(400)
            .json({ success: false, error: 'Só é possível editar itens de folha em rascunho' });
        const parsed = itemUpdateSchema.safeParse(req.body);
        if (!parsed.success)
          return res.status(400).json({ success: false, error: parsed.error.issues[0].message });
        const d = parsed.data;
        const item = (
          await sql`SELECT fi.*, c.salario_base as sal_base, c.nome FROM folha_itens fi JOIN colaboradores c ON fi.colaborador_id = c.id WHERE fi.id = ${sub2}::uuid AND fi.folha_id = ${id}::uuid`
        )[0];
        if (!item) return res.status(404).json({ success: false, error: 'Item não encontrado' });
        const divisor = await getDivisor(tenantId);
        const salario = Number(item.salario_base);
        const valorFaltas = Number(item.valor_faltas);
        const valorFaltaHoras = Number(
          (item as any).valor_falta_horas || (item as any).valorFaltaHoras || 0,
        );
        const adiantamento = Number(item.adiantamento);
        const horasQtd =
          d.horas_extras_qtd !== undefined
            ? Number(d.horas_extras_qtd)
            : Number(item.horas_extras_qtd);
        const horasPrev =
          d.horas_extras_previstas !== undefined
            ? Number(d.horas_extras_previstas)
            : Number(item.horas_extras_previstas);
        const tipoHE = d.horas_extras_tipo || item.horas_extras_tipo || '50';
        const bonus =
          d.bonus_producao !== undefined ? Number(d.bonus_producao) : Number(item.bonus_producao);
        const outros =
          d.outros_descontos !== undefined
            ? Number(d.outros_descontos)
            : Number(item.outros_descontos);
        const outrosDesc =
          d.outros_descricao !== undefined ? d.outros_descricao : item.outros_descricao;
        const valorHE = calc.calcValorHE(horasQtd, salario, divisor, tipoHE);
        const valorHEPrev = calc.calcValorHE(horasPrev, salario, divisor, tipoHE);
        const liquido = calc.calcLiquido({
          salarioBase: salario,
          valorFaltas,
          valorFaltaHoras,
          valorHorasExtras: valorHE,
          bonusProducao: bonus,
          adiantamento,
          outrosDescontos: outros,
        });
        const liquidoPrev = calc.calcLiquidoPrevisto({
          salarioBase: salario,
          valorFaltas,
          valorFaltaHoras,
          valorHorasExtrasPrevisto: valorHEPrev,
          bonusProducao: bonus,
          adiantamento,
          outrosDescontos: outros,
        });
        const updated = (
          await sql`
          UPDATE folha_itens SET
            horas_extras_qtd = ${horasQtd},
            horas_extras_previstas = ${horasPrev},
            horas_extras_tipo = ${tipoHE},
            valor_horas_extras = ${valorHE},
            valor_horas_extras_previsto = ${valorHEPrev},
            bonus_producao = ${bonus},
            outros_descontos = ${outros},
            outros_descricao = ${outrosDesc},
            valor_liquido = ${liquido},
            valor_liquido_previsto = ${liquidoPrev}
          WHERE id = ${sub2}::uuid AND folha_id = ${id}::uuid
          RETURNING *
        `
        )[0];
        // recalcula totais folha
        const todos =
          await sql`SELECT valor_liquido, valor_liquido_previsto, valor_horas_extras, bonus_producao, valor_faltas, valor_falta_horas, adiantamento, outros_descontos FROM folha_itens WHERE folha_id = ${id}::uuid`;
        let totalBruto = 0,
          totalDescontos = 0,
          totalLiquido = 0,
          totalHE = 0,
          totalBonus = 0;
        // totalBruto = sum salario_base
        const sumSal =
          await sql`SELECT SUM(salario_base::numeric) as total FROM folha_itens WHERE folha_id = ${id}::uuid`;
        totalBruto = Number(sumSal[0]?.total || 0);
        for (const r of todos) {
          totalDescontos +=
            Number(r.valor_faltas) +
            Number((r as any).valor_falta_horas || 0) +
            Number(r.adiantamento) +
            Number(r.outros_descontos);
          totalLiquido += Number(r.valor_liquido);
          totalHE += Number(r.valor_horas_extras);
          totalBonus += Number(r.bonus_producao);
        }
        // recalc lucro
        const receitaMes = await computeReceitaMes(tenantId, folha.competencia);
        const custosMes = await computeCustosMes(tenantId, folha.competencia);
        // total folha colaboradores
        const folhaColabRows = await sql`
          SELECT SUM(fi.valor_liquido::numeric) as total
          FROM folha_itens fi JOIN colaboradores c ON fi.colaborador_id = c.id
          WHERE fi.folha_id = ${id}::uuid AND c.tipo != 'socio' AND c.tenant_id = ${tenantId}::uuid
        `;
        const totalFolhaColabs = Number(folhaColabRows[0]?.total || 0);
        const lucro = calc.calcLucroDistribuivel(receitaMes, custosMes, totalFolhaColabs);
        await sql`
          UPDATE folha_pagamentos SET total_bruto=${totalBruto}, total_descontos=${totalDescontos}, total_liquido=${totalLiquido}, total_horas_extras=${totalHE}, total_bonus=${totalBonus}, receita_mes=${receitaMes}, custos_mes=${custosMes}, lucro_distribuivel=${lucro}, updated_at=NOW()
          WHERE id=${id}::uuid AND tenant_id=${tenantId}::uuid
        `;
        try {
          await sql`INSERT INTO audit_logs (tenant_id, user_id, entity_type, entity_id, action, data_after) VALUES (${tenantId}::uuid, ${user.id}::uuid, 'folha_itens', ${sub2}::uuid, 'override_item_folha', ${JSON.stringify({ horasQtd, horasPrev, tipoHE, bonus, outros, liquido, liquidoPrev })}::jsonb)`;
        } catch (e) {
          void e;
        }
        return res.status(200).json({ success: true, data: updated });
      }

      // POST /folhas/:id/fechar
      if (req.method === 'POST' && id && sub === 'fechar') {
        if (!requireAdmin(req, res)) return;
        const folha = (
          await sql`SELECT * FROM folha_pagamentos WHERE id = ${id}::uuid AND tenant_id = ${tenantId}::uuid`
        )[0];
        if (!folha) return res.status(404).json({ success: false, error: 'Folha não encontrada' });
        if (folha.status !== 'rascunho')
          return res.status(400).json({ success: false, error: 'Folha já está fechada' });
        const itens = await sql`
          SELECT fi.*, c.nome as colaborador_nome, c.tipo as colaborador_tipo, c.salario_base as sal_col
          FROM folha_itens fi JOIN colaboradores c ON fi.colaborador_id = c.id
          WHERE fi.folha_id = ${id}::uuid
        `;
        if (itens.length === 0)
          return res.status(400).json({ success: false, error: 'Folha sem itens' });
        const divisor = await getDivisor(tenantId);
        // recalcula cada item para garantir consistência
        for (const it of itens) {
          const salario = Number(it.salario_base);
          const horasQtd = Number(it.horas_extras_qtd);
          const horasPrev = Number(it.horas_extras_previstas);
          const tipoHE = it.horas_extras_tipo || '50';
          const valorHE = calc.calcValorHE(horasQtd, salario, divisor, tipoHE);
          const valorHEPrev = calc.calcValorHE(horasPrev, salario, divisor, tipoHE);
          const valorFaltas = Number(it.valor_faltas);
          const valorFaltaHoras = Number((it as any).valor_falta_horas || 0);
          const bonus = Number(it.bonus_producao);
          const adiantamento = Number(it.adiantamento);
          const outros = Number(it.outros_descontos);
          const liquido = calc.calcLiquido({
            salarioBase: salario,
            valorFaltas,
            valorFaltaHoras,
            valorHorasExtras: valorHE,
            bonusProducao: bonus,
            adiantamento,
            outrosDescontos: outros,
          });
          const liquidoPrev = calc.calcLiquidoPrevisto({
            salarioBase: salario,
            valorFaltas,
            valorFaltaHoras,
            valorHorasExtrasPrevisto: valorHEPrev,
            bonusProducao: bonus,
            adiantamento,
            outrosDescontos: outros,
          });
          await sql`UPDATE folha_itens SET valor_horas_extras=${valorHE}, valor_horas_extras_previsto=${valorHEPrev}, valor_liquido=${liquido}, valor_liquido_previsto=${liquidoPrev} WHERE id=${it.id}::uuid`;
        }
        // recalcula totals + lucro
        const sumSal =
          await sql`SELECT SUM(salario_base::numeric) as total FROM folha_itens WHERE folha_id = ${id}::uuid`;
        const totalBruto = Number(sumSal[0]?.total || 0);
        const todos =
          await sql`SELECT valor_faltas, adiantamento, outros_descontos, valor_liquido, valor_horas_extras, bonus_producao FROM folha_itens WHERE folha_id = ${id}::uuid`;
        let totalDescontos = 0,
          totalLiquido = 0,
          totalHE = 0,
          totalBonus = 0;
        for (const r of todos) {
          totalDescontos +=
            Number(r.valor_faltas) + Number(r.adiantamento) + Number(r.outros_descontos);
          totalLiquido += Number(r.valor_liquido);
          totalHE += Number(r.valor_horas_extras);
          totalBonus += Number(r.bonus_producao);
        }
        const receitaMes = await computeReceitaMes(tenantId, folha.competencia);
        const custosMes = await computeCustosMes(tenantId, folha.competencia);
        const folhaColabRows =
          await sql`SELECT SUM(fi.valor_liquido::numeric) as total FROM folha_itens fi JOIN colaboradores c ON fi.colaborador_id = c.id WHERE fi.folha_id=${id}::uuid AND c.tipo!='socio'`;
        const totalFolhaColabs = Number(folhaColabRows[0]?.total || 0);
        const lucro = calc.calcLucroDistribuivel(receitaMes, custosMes, totalFolhaColabs);
        // busca conta e forma e classes
        const conta = (
          await sql`SELECT id FROM contas_internas WHERE tenant_id=${tenantId}::uuid AND deletado=false LIMIT 1`
        )[0];
        const forma = (
          await sql`SELECT id FROM formas_pagamento WHERE tenant_id=${tenantId}::uuid AND deletado=false LIMIT 1`
        )[0];
        const classeFolha = (
          await sql`SELECT id FROM classes_financeiras WHERE tenant_id=${tenantId}::uuid AND codigo='5.01' LIMIT 1`
        )[0];
        const classeLucro = (
          await sql`SELECT id FROM classes_financeiras WHERE tenant_id=${tenantId}::uuid AND codigo='5.02' LIMIT 1`
        )[0];
        if (!conta || !forma || !classeFolha) {
          return res.status(400).json({
            success: false,
            error: 'Configure conta bancária, forma de pagamento e classes 5.01/5.02',
          });
        }
        const vencimento = calc.quintoDiaUtilCompetencia(folha.competencia);
        // transação criar titulos
        // Use Pool transaction via sql.begin? Using Pool transaction pattern with sql.begin manual cannot mix global sql; we will use sequential inserts with audit
        // For simplicity, do not use real transaction but try to handle rollback manually; if error, leave.
        // Create titulos for each colaborador
        for (const it of itens) {
          // refetch updated liquido
          const refreshed = (
            await sql`SELECT valor_liquido FROM folha_itens WHERE id=${it.id}::uuid`
          )[0];
          const valor = Number(refreshed.valor_liquido);
          const nomeSafe =
            String(it.colaborador_nome)
              .normalize('NFD')
              .replace(/[^a-zA-Z0-9]/g, '')
              .substring(0, 20)
              .toUpperCase() || 'COLAB';
          const numero = `RH-${folha.competencia}-${nomeSafe}-${it.id.substring(0, 4)}`;
          const titulo = (
            await sql`
            INSERT INTO titulos_pagar (numero_titulo, fornecedor_id, valor_original, valor_liquido, valor_aberto, data_emissao, data_vencimento, data_competencia, classe_financeira_id, forma_pagamento_id, conta_bancaria_id, status, parcela, total_parcelas, observacoes, tenant_id)
            VALUES (${numero}, 0, ${valor}, ${valor}, ${valor}, NOW(), ${vencimento}::date, ${vencimento}::date, ${classeFolha.id}::uuid, ${forma.id}::uuid, ${conta.id}::uuid, 'aberto', 1, 1, ${'Folha ' + folha.competencia + ' - ' + it.colaborador_nome}, ${tenantId}::uuid)
            RETURNING id
          `
          )[0];
          await sql`UPDATE folha_itens SET titulo_pagar_id=${titulo.id}::uuid WHERE id=${it.id}::uuid`;
        }
        // adiantamentos descontado
        await sql`UPDATE adiantamentos SET status='descontado', descontado_em_folha_id=${id}::uuid WHERE tenant_id=${tenantId}::uuid AND competencia_desconto=${folha.competencia} AND status='pendente'`;
        // distribuição lucros se lucro >0
        if (lucro > 0 && classeLucro) {
          const socios =
            await sql`SELECT id, nome, participacao_lucros FROM colaboradores WHERE tenant_id=${tenantId}::uuid AND tipo='socio' AND ativo=true`;
          for (const s of socios) {
            const part = Number(s.participacao_lucros || 50);
            const valorSocio = calc.calcLucroPorSocio(lucro, part);
            if (valorSocio <= 0) continue;
            const nomeSafe = String(s.nome)
              .normalize('NFD')
              .replace(/[^a-zA-Z0-9]/g, '')
              .substring(0, 20)
              .toUpperCase();
            const numero = `RH-LUCRO-${folha.competencia}-${nomeSafe}`;
            await sql`
              INSERT INTO titulos_pagar (numero_titulo, fornecedor_id, valor_original, valor_liquido, valor_aberto, data_emissao, data_vencimento, data_competencia, classe_financeira_id, forma_pagamento_id, conta_bancaria_id, status, parcela, total_parcelas, observacoes, tenant_id)
              VALUES (${numero}, 0, ${valorSocio}, ${valorSocio}, ${valorSocio}, NOW(), ${vencimento}::date, ${vencimento}::date, ${classeLucro.id}::uuid, ${forma.id}::uuid, ${conta.id}::uuid, 'aberto', 1, 1, ${'Lucro ' + folha.competencia + ' - ' + s.nome + ' ' + part + '%'}, ${tenantId}::uuid)
            `;
          }
        }
        // fecha folha
        await sql`UPDATE folha_pagamentos SET status='fechada', fechada_em=NOW(), fechada_por=${user.id}::uuid, total_bruto=${totalBruto}, total_descontos=${totalDescontos}, total_liquido=${totalLiquido}, total_horas_extras=${totalHE}, total_bonus=${totalBonus}, receita_mes=${receitaMes}, custos_mes=${custosMes}, lucro_distribuivel=${lucro}, updated_at=NOW() WHERE id=${id}::uuid AND tenant_id=${tenantId}::uuid`;
        try {
          await sql`INSERT INTO audit_logs (tenant_id, user_id, entity_type, entity_id, action, data_after) VALUES (${tenantId}::uuid, ${user.id}::uuid, 'folha_pagamentos', ${id}::uuid, 'fechar_folha', ${JSON.stringify({ competencia: folha.competencia, totalLiquido, lucro })}::jsonb)`;
        } catch (e) {
          void e;
        }
        const updatedFolha = (await sql`SELECT * FROM folha_pagamentos WHERE id=${id}::uuid`)[0];
        return res.status(200).json({ success: true, data: updatedFolha });
      }

      // POST /folhas/:id/reabrir
      if (req.method === 'POST' && id && sub === 'reabrir') {
        if (!requireAdmin(req, res)) return;
        const folha = (
          await sql`SELECT * FROM folha_pagamentos WHERE id=${id}::uuid AND tenant_id=${tenantId}::uuid`
        )[0];
        if (!folha) return res.status(404).json({ success: false, error: 'Folha não encontrada' });
        if (folha.status !== 'fechada')
          return res
            .status(400)
            .json({ success: false, error: 'Só folha fechada pode ser reaberta' });
        // verifica nenhum título baixado (status pago)
        const titulos =
          await sql`SELECT tp.id, tp.status FROM folha_itens fi JOIN titulos_pagar tp ON fi.titulo_pagar_id = tp.id WHERE fi.folha_id=${id}::uuid`;
        for (const t of titulos)
          if (t.status === 'pago' || t.status === 'pago_parcial') {
            return res.status(400).json({
              success: false,
              error: 'Não é possível reabrir: existe título já baixado/pago',
            });
          }
        // also check lucros titles? Find by numero like RH-LUCRO-competencia
        const lucroTitulos =
          await sql`SELECT id, status FROM titulos_pagar WHERE tenant_id=${tenantId}::uuid AND numero_titulo LIKE ${'RH-LUCRO-' + folha.competencia + '%'} AND deletado=false`;
        for (const t of lucroTitulos)
          if (t.status === 'pago')
            return res
              .status(400)
              .json({ success: false, error: 'Não é possível reabrir: título de lucro já pago' });
        // soft delete titulos folha (deletado true)
        for (const t of titulos)
          await sql`UPDATE titulos_pagar SET deletado=true, excluido_em=NOW() WHERE id=${t.id}::uuid`;
        for (const t of lucroTitulos)
          await sql`UPDATE titulos_pagar SET deletado=true, excluido_em=NOW() WHERE id=${t.id}::uuid`;
        await sql`UPDATE folha_itens SET titulo_pagar_id=NULL WHERE folha_id=${id}::uuid`;
        await sql`UPDATE adiantamentos SET status='pendente', descontado_em_folha_id=NULL WHERE descontado_em_folha_id=${id}::uuid`;
        await sql`UPDATE folha_pagamentos SET status='rascunho', fechada_em=NULL, fechada_por=NULL, updated_at=NOW() WHERE id=${id}::uuid`;
        try {
          await sql`INSERT INTO audit_logs (tenant_id, user_id, entity_type, entity_id, action) VALUES (${tenantId}::uuid, ${user.id}::uuid, 'folha_pagamentos', ${id}::uuid, 'reabrir_folha')`;
        } catch (e) {
          void e;
        }
        const updated = (await sql`SELECT * FROM folha_pagamentos WHERE id=${id}::uuid`)[0];
        return res.status(200).json({ success: true, data: updated });
      }

      // GET /folhas/:id/recibo/:itemId/pdf -> stub
      if (req.method === 'GET' && id && sub === 'recibo') {
        // parts: folhas / :id / recibo / :itemId / pdf
        const itemId = sub2;
        const pdfPart = parts[4];
        if (pdfPart === 'pdf' && itemId) {
          if (!requireAdmin(req, res)) return;
          const item = (
            await sql`SELECT fi.*, c.nome as colaborador_nome, c.cpf, c.cargo FROM folha_itens fi JOIN colaboradores c ON fi.colaborador_id=c.id WHERE fi.id=${itemId}::uuid AND fi.folha_id=${id}::uuid`
          )[0];
          if (!item) return res.status(404).json({ success: false, error: 'Item não encontrado' });
          const folha = (await sql`SELECT * FROM folha_pagamentos WHERE id=${id}::uuid`)[0];
          // For now return JSON stub, frontend generates PDF; backend can return data
          return res.status(200).json({
            success: true,
            data: {
              folha,
              item,
              message:
                'PDF geração via frontend jspdf. Use endpoint /api/rh/folhas/:id/recibo/:itemId/pdf para blob. Stub F2.',
            },
          });
        }
      }

      return res.status(404).json({ success: false, error: 'Rota folha não encontrada' });
    }

    // ── DASHBOARD ──
    if (resource === 'dashboard') {
      if (!requireAdmin(req, res)) return;
      const mes = (req.query?.mes as string) || new Date().toISOString().slice(0, 7);
      const divisor = await getDivisor(tenantId);
      // custo total folha mes
      let custoTotal = 0,
        custoPrevisto = 0,
        totalHE = 0,
        totalHEPrev = 0;
      const folhaMes = (
        await sql`SELECT * FROM folha_pagamentos WHERE tenant_id=${tenantId}::uuid AND competencia=${mes} LIMIT 1`
      )[0];
      if (folhaMes) {
        custoTotal = Number(folhaMes.total_liquido);
        // previsto: sum valor_liquido_previsto
        const sumPrev =
          await sql`SELECT COALESCE(SUM(valor_liquido_previsto::numeric),0) as total FROM folha_itens WHERE folha_id=${folhaMes.id}::uuid`;
        custoPrevisto = Number(sumPrev[0]?.total || custoTotal);
        totalHE = Number(folhaMes.total_horas_extras);
        const sumHEPrev =
          await sql`SELECT COALESCE(SUM(valor_horas_extras_previsto::numeric),0) as total FROM folha_itens WHERE folha_id=${folhaMes.id}::uuid`;
        totalHEPrev = Number(sumHEPrev[0]?.total || 0);
      } else {
        // estimativa: colaboradores ativos sem folha
        const cols =
          await sql`SELECT id, salario_base FROM colaboradores WHERE tenant_id=${tenantId}::uuid AND ativo=true`;
        for (const c of cols) {
          const salario = Number(c.salario_base);
          const adiant = await sumAdiantamentosPendentes(tenantId, c.id, mes);
          const { inicio: i3, fimExclusivo: f3 } = calc.formatCompetenciaToRange(mes);
          const pres =
            await sql`SELECT status FROM presencas WHERE tenant_id=${tenantId}::uuid AND colaborador_id=${c.id}::uuid AND data >= ${i3}::date AND data < ${f3}::date`;
          const dias = calc.calcFaltasDias(pres as any);
          const vFaltas = calc.calcValorFaltas(dias, salario);
          const liq = calc.calcLiquido({
            salarioBase: salario,
            valorFaltas: vFaltas,
            valorHorasExtras: 0,
            bonusProducao: 0,
            adiantamento: adiant,
            outrosDescontos: 0,
          });
          custoTotal += liq;
          custoPrevisto += liq;
        }
      }
      const receitaMes = await computeReceitaMes(tenantId, mes);
      const custosMes = await computeCustosMes(tenantId, mes);
      // total folha colaboradores (para percentual)
      let totalFolhaColabs = custoTotal;
      if (folhaMes) {
        const rows =
          await sql`SELECT SUM(fi.valor_liquido::numeric) as total FROM folha_itens fi JOIN colaboradores c ON fi.colaborador_id=c.id WHERE fi.folha_id=${folhaMes.id}::uuid AND c.tipo!='socio'`;
        totalFolhaColabs = Number(rows[0]?.total || custoTotal);
      }
      const lucro = calc.calcLucroDistribuivel(receitaMes, custosMes, totalFolhaColabs);
      const perc = receitaMes > 0 ? (custoTotal / receitaMes) * 100 : 0;
      // adiantamentos no mes
      const adiRows =
        await sql`SELECT COALESCE(SUM(valor::numeric),0) as total FROM adiantamentos WHERE tenant_id=${tenantId}::uuid AND competencia_desconto=${mes} AND status != 'cancelado'`;
      const totalAdiant = Number(adiRows[0]?.total || 0);
      // historico 6m
      const hist = await sql`
        SELECT competencia, total_liquido, receita_mes FROM folha_pagamentos
        WHERE tenant_id=${tenantId}::uuid
        ORDER BY competencia DESC LIMIT 6
      `;
      const historico6m = hist
        .map((h: any) => ({
          competencia: h.competencia,
          totalLiquido: Number(h.total_liquido),
          receitaMes: Number(h.receita_mes),
        }))
        .reverse();
      // por socio
      let porSocio: any[] = [];
      if (lucro > 0) {
        const socios =
          await sql`SELECT id, nome, participacao_lucros FROM colaboradores WHERE tenant_id=${tenantId}::uuid AND tipo='socio' AND ativo=true`;
        porSocio = socios.map((s: any) => ({
          colaboradorId: s.id,
          nome: s.nome,
          participacao: Number(s.participacao_lucros || 50),
          valor: calc.calcLucroPorSocio(lucro, Number(s.participacao_lucros || 50)),
        }));
      }
      return res.status(200).json({
        success: true,
        data: {
          competencia: mes,
          custoTotalFolha: custoTotal,
          custoTotalPrevisto: custoPrevisto,
          totalHorasExtras: totalHE,
          totalHorasExtrasPrevisto: totalHEPrev,
          totalAdiantamentos: totalAdiant,
          lucroDistribuivel: lucro,
          receitaMes,
          custosMes,
          percentualFolhaReceita: Math.round(perc * 100) / 100,
          historico6m,
          porSocio,
          divisor,
        },
      });
    }

    return res.status(404).json({ success: false, error: 'Recurso RH não encontrado' });
  } catch (err: any) {
    logger.error('[RH ERROR]', { error: err.message, stack: err.stack });
    return res.status(500).json({ success: false, error: err.message || 'Erro interno RH' });
  }
};

export const handleRH = withTenant(handleRHCore);
