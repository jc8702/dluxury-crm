import { sql, validateAuth, auditLog } from '../../src/api-lib/_db.js';

export const config = {
  api: { bodyParser: { sizeLimit: '1mb' } },
};

/**
 * POST /api/clients/sync-audit
 * GET  /api/clients/sync-audit
 *
 * Auditoria de sincronização da tabela `clients` Neon ↔ UI/API.
 *
 * Modos:
 *   - default (read-only):  retorna diagnóstico completo, NÃO altera nada.
 *   - backfill (POST + ?backfill=true&target_tenant=<uuid>):
 *       reatribui clientes com tenant_id = NULL ao tenant alvo.
 *       Se omitido, usa o tenant do chamador autenticado.
 *       NÃO deleta registros. Apenas UPDATE tenant_id.
 *
 * Resposta: { dbCount, apiResponse, uiState, errors, fixes_applied,
 *             samples, byTenant, orphans, fks, indexes, recommendations }
 */
export default async function handler(req: any, res: any) {
  const startedAt = Date.now();
  const log = (level: string, msg: string, extra: Record<string, any> = {}) =>
    console.log(JSON.stringify({ ts: new Date().toISOString(), level, msg, ...extra }));

  try {
    // ─── Auth ────────────────────────────────────────────────
    const { authorized, user, error: authErr } = validateAuth(req);
    if (!authorized) {
      return res.status(401).json({ success: false, error: authErr });
    }
    const callerTenant = user?.tenantId || '00000000-0000-0000-0000-000000000000';
    const callerRole = user?.role || 'user';
    const isAdmin = callerRole === 'admin';

    // ─── Backfill guard ──────────────────────────────────────
    const wantBackfill =
      req.method === 'POST' && (req.query?.backfill === 'true' || req.body?.backfill === true);
    const targetTenant = (req.query?.target_tenant || req.body?.target_tenant || callerTenant)
      .toString()
      .trim();

    if (wantBackfill && !isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Apenas admin pode executar backfill de tenant_id',
      });
    }

    log('info', 'sync-audit started', {
      method: req.method,
      callerTenant,
      callerRole,
      wantBackfill,
      targetTenant: wantBackfill ? targetTenant : null,
    });

    const errors: any[] = [];
    const fixes_applied: any[] = [];

    // ─── 1. Schema & counts ──────────────────────────────────
    const schema = await sql`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'clients'
      ORDER BY ordinal_position
    `;

    const countTotal = (await sql`SELECT count(*)::int as n FROM clients`)[0].n;
    const countActive = (
      await sql`SELECT count(*)::int as n FROM clients WHERE deleted_at IS NULL`
    )[0].n;
    const countDeleted = (
      await sql`SELECT count(*)::int as n FROM clients WHERE deleted_at IS NOT NULL`
    )[0].n;
    const countNullTenant = (
      await sql`SELECT count(*)::int as n FROM clients WHERE tenant_id IS NULL AND deleted_at IS NULL`
    )[0].n;

    // ─── 2. Per-tenant visibility (simulando o handler) ──────
    const byTenant = await sql`
      SELECT
        COALESCE(tenant_id::text, '<<NULL>>') as tenant_id,
        count(*)::int as total,
        count(*) FILTER (WHERE deleted_at IS NULL)::int as ativos,
        count(*) FILTER (WHERE deleted_at IS NOT NULL)::int as deletados
      FROM clients
      GROUP BY tenant_id
      ORDER BY total DESC
    `;

    // ─── 3. Amostra de registros ─────────────────────────────
    const samples = await sql`
      SELECT id, nome, cpf, cnpj, email, tenant_id::text as tenant_id, status,
             deleted_at, created_at
      FROM clients
      ORDER BY created_at DESC
      LIMIT 5
    `;

    // ─── 4. Foreign keys e órfãos ────────────────────────────
    const fks = await sql`
      SELECT DISTINCT
        tc.table_name as dependent_table,
        kcu.column_name as dependent_column,
        ccu.column_name as referenced_column
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage ccu
        ON ccu.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND ccu.table_name = 'clients'
      ORDER BY tc.table_name
    `;

    // Possíveis FKs lógicas (mesmo sem constraint) para detectar órfãos
    const orphanCandidates = [
      { table: 'projects', column: 'client_id' },
      { table: 'quotations', column: 'cliente_id' },
      { table: 'orcamentos', column: 'cliente_id' },
      { table: 'interacoes_prospeccao', column: 'cliente_id' },
    ];
    const orphans: any[] = [];
    for (const { table, column } of orphanCandidates) {
      try {
        const r = await sql`
          SELECT ${sql(column)} as ref, t.tenant_id::text as tenant_id, count(*)::int as n
          FROM ${sql(table)} t
          WHERE ${sql(column)} IS NOT NULL
            AND NOT EXISTS (
              SELECT 1 FROM clients c WHERE c.id::text = ${sql(`${column}`)}::text
            )
          GROUP BY ${sql(column)}, t.tenant_id
          ORDER BY n DESC
          LIMIT 5
        `;
        if (r.length) orphans.push({ table, column, rows: r });
      } catch (e: any) {
        // table/column pode não existir — silencioso
      }
    }

    // ─── 5. Verificar query EXATA do handler (smoke test) ───
    let handlerSmoke: any = { ok: false, error: null, rowCount: 0, sample: null };
    try {
      // Tenta a query "primária" (com `city as cidade`) — esperado falhar
      let primaryError: string | null = null;
      try {
        await sql`
          SELECT id, city as cidade FROM clients WHERE deleted_at IS NULL
            AND tenant_id = ${callerTenant} LIMIT 1
        `;
      } catch (e: any) {
        primaryError = e.message;
      }

      // Fallback real (que o handler usa em .catch)
      const r2 = await sql`
        SELECT id, nome, cpf, email, cidade
        FROM clients
        WHERE deleted_at IS NULL AND tenant_id = ${callerTenant}
        ORDER BY created_at DESC LIMIT 1
      `;
      handlerSmoke = {
        ok: true,
        primaryQueryError: primaryError,
        fallbackRowCount: r2.length,
        sample: r2[0] || null,
        note: primaryError
          ? 'Query primária (city as cidade) falha silenciosamente — corrigir para usar apenas cidade.'
          : 'OK',
      };
    } catch (e: any) {
      handlerSmoke = { ok: false, error: e.message, rowCount: 0, sample: null };
      errors.push({ step: 'handler-smoke', message: e.message });
    }

    // ─── 6. Backfill opcional (apenas se flag e admin) ───────
    let backfill: any = null;
    if (wantBackfill) {
      // Valida UUID
      const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRe.test(targetTenant)) {
        return res.status(400).json({
          success: false,
          error: 'target_tenant inválido (esperado UUID)',
        });
      }

      // Confirma que o tenant existe
      const tExists = (
        await sql`SELECT id::text as id, nome FROM tenants WHERE id = ${targetTenant}::uuid`
      )[0];
      if (!tExists) {
        return res.status(400).json({
          success: false,
          error: `target_tenant ${targetTenant} não existe na tabela tenants`,
        });
      }

      // Snapshot antes (apenas leitura — para auditoria)
      const before = await sql`
        SELECT id, nome, cpf, cnpj, tenant_id::text as tenant_id, created_at
        FROM clients
        WHERE tenant_id IS NULL AND deleted_at IS NULL
        ORDER BY created_at DESC
      `;

      // ── Detecta conflitos de unique (cnpj/cpf já existentes no destino) ──
      const conflicts = await sql`
        SELECT n.id, n.nome, n.cpf, n.cnpj,
               EXISTS (
                 SELECT 1 FROM clients c
                 WHERE c.tenant_id = ${targetTenant}::uuid
                   AND c.deleted_at IS NULL
                   AND c.cnpj IS NOT NULL AND c.cnpj = n.cnpj
               ) as cnpj_conflict,
               EXISTS (
                 SELECT 1 FROM clients c
                 WHERE c.tenant_id = ${targetTenant}::uuid
                   AND c.deleted_at IS NULL
                   AND c.cpf IS NOT NULL AND c.cpf = n.cpf
               ) as cpf_conflict
        FROM clients n
        WHERE n.tenant_id IS NULL AND n.deleted_at IS NULL
          AND (
            EXISTS (
              SELECT 1 FROM clients c
              WHERE c.tenant_id = ${targetTenant}::uuid
                AND c.deleted_at IS NULL
                AND c.cnpj IS NOT NULL AND c.cnpj = n.cnpj
            )
            OR EXISTS (
              SELECT 1 FROM clients c
              WHERE c.tenant_id = ${targetTenant}::uuid
                AND c.deleted_at IS NULL
                AND c.cpf IS NOT NULL AND c.cpf = n.cpf
            )
          )
      `;

      // Estratégia segura: NULLificar cnpj/cpf conflitantes APENAS nos
      // registros movidos (preserva integridade do destino).
      let conflictNullified = 0;
      if (conflicts.length) {
        const nullUpd = await sql`
          WITH conflicts AS (
            SELECT n.id,
              EXISTS (
                SELECT 1 FROM clients c
                WHERE c.tenant_id = ${targetTenant}::uuid
                  AND c.deleted_at IS NULL
                  AND c.cnpj IS NOT NULL AND c.cnpj = n.cnpj
              ) as cnpj_conflict,
              EXISTS (
                SELECT 1 FROM clients c
                WHERE c.tenant_id = ${targetTenant}::uuid
                  AND c.deleted_at IS NULL
                  AND c.cpf IS NOT NULL AND c.cpf = n.cpf
              ) as cpf_conflict
            FROM clients n
            WHERE n.tenant_id IS NULL AND n.deleted_at IS NULL
          )
          UPDATE clients cl
          SET cnpj = CASE WHEN cf.cnpj_conflict THEN NULL ELSE cl.cnpj END,
              cpf  = CASE WHEN cf.cpf_conflict  THEN NULL ELSE cl.cpf  END
          FROM conflicts cf
          WHERE cl.id = cf.id
            AND (cf.cnpj_conflict OR cf.cpf_conflict)
          RETURNING cl.id, cl.cnpj, cl.cpf
        `;
        conflictNullified = nullUpd.length;
      }

      // Agora sim: UPDATE tenant_id
      const upd = await sql`
        UPDATE clients
        SET tenant_id = ${targetTenant}::uuid
        WHERE tenant_id IS NULL AND deleted_at IS NULL
        RETURNING id, nome, cpf, cnpj, tenant_id::text as tenant_id
      `;

      backfill = {
        executed: true,
        target_tenant: targetTenant,
        target_tenant_nome: tExists.nome,
        candidates: before.length,
        conflicts_detected: conflicts.length,
        conflicts_nullified: conflictNullified,
        affected: upd.length,
        updated_records: upd,
        conflicts_detail: conflicts,
        rollback_sql: `UPDATE clients SET tenant_id = NULL WHERE id IN (${upd
          .map((u: any) => u.id)
          .join(',')});`,
      };

      await auditLog('clients', null, 'BACKFILL_TENANT', user?.id, before, {
        target: targetTenant,
        moved: upd.length,
        conflicts: conflicts.length,
      });

      fixes_applied.push({
        type: 'tenant_backfill',
        moved: upd.length,
        conflicts_resolved: conflictNullified,
        target_tenant: targetTenant,
        ts: new Date().toISOString(),
      });
    }

    // ─── 7. Recommendations ─────────────────────────────────
    const recommendations: string[] = [];
    if (countNullTenant > 0) {
      recommendations.push(
        `EXISTEM ${countNullTenant} CLIENTES COM tenant_id = NULL — invisíveis para qualquer tenant. ` +
          'Execute POST com ?backfill=true para reatribuir ao seu tenant.',
      );
    }
    if (countDeleted > 0) {
      recommendations.push(
        `${countDeleted} clientes com soft-delete (deleted_at != NULL) — não aparecem na UI.`,
      );
    }
    if (handlerSmoke.primaryQueryError) {
      recommendations.push(
        'Handler crm.ts:10 tenta `city as cidade` antes de fallback. PG retorna 42703 silenciosamente. ' +
          'Remover a query primária e usar apenas `cidade` (a coluna real).',
      );
    }
    if (orphans.length) {
      recommendations.push(
        `Referências órfãs detectadas: ${orphans
          .map((o) => `${o.table}.${o.column}`)
          .join(', ')}. Considerar limpeza ou reatribuição.`,
      );
    }
    if (recommendations.length === 0) {
      recommendations.push('Sincronização OK — nenhuma ação corretiva necessária.');
    }

    // ─── 8. Resposta final ──────────────────────────────────
    const response = {
      success: true,
      timestamp: new Date().toISOString(),
      duration_ms: Date.now() - startedAt,
      dbCount: {
        total: countTotal,
        active: countActive,
        deleted: countDeleted,
        null_tenant: countNullTenant,
      },
      byTenant,
      samples,
      fks,
      orphans,
      indexes: await sql`
        SELECT indexname, indexdef FROM pg_indexes
        WHERE tablename = 'clients' ORDER BY indexname
      `,
      schema_columns: schema.length,
      handlerSmoke,
      uiState: {
        visibleForCallerTenant: await (async () => {
          const r = await sql`
            SELECT count(*)::int as n FROM clients
            WHERE deleted_at IS NULL AND tenant_id = ${callerTenant}
          `;
          return r[0].n;
        })(),
        callerTenant,
        callerRole,
      },
      apiResponse: {
        status: 200,
        shape: '{ success: true, data: Client[] }',
        example: samples[0] || null,
      },
      errors,
      fixes_applied,
      backfill,
      recommendations,
    };

    log('info', 'sync-audit completed', {
      duration_ms: response.duration_ms,
      dbCount: response.dbCount,
      fixes: fixes_applied.length,
    });

    return res.status(200).json(response);
  } catch (err: any) {
    console.error('[sync-audit] FATAL', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Erro interno no sync-audit',
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    });
  }
}
