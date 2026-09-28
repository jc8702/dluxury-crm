import { sql } from './_db.js';
import { withTenant, type TenantHandler } from './middleware/tenantMiddleware.js';
import { logger } from './logger.js';

// Valores interpretados como PERCENTUAIS (ex.: 30 = 30%),
// alinhados a quotations.recalcularOrcamento (divide por 100).
const CAMPOS = [
  'fator_perda_padrao',
  'markup_padrao',
  'aliquota_imposto',
  'mo_producao_pct_padrao',
  'mo_instalacao_pct_padrao',
  'margem_minima_alerta',
] as const;

const handleQuotationTecnicoCore: TenantHandler = async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const type = req.query?.type || 'config';

    if (type !== 'config') {
      return res.status(501).json({
        success: false,
        error: `Tipo "${type}" não suportado. Use type=config.`,
      });
    }

    if (req.method === 'GET') {
      let rows = await sql`
        SELECT id, tenant_id,
          fator_perda_padrao::float8 AS fator_perda_padrao,
          markup_padrao::float8 AS markup_padrao,
          aliquota_imposto::float8 AS aliquota_imposto,
          mo_producao_pct_padrao::float8 AS mo_producao_pct_padrao,
          mo_instalacao_pct_padrao::float8 AS mo_instalacao_pct_padrao,
          margem_minima_alerta::float8 AS margem_minima_alerta
        FROM configuracoes_precificacao
        WHERE tenant_id = ${tenantId}::uuid
        LIMIT 1`;
      if (rows.length === 0) {
        rows = await sql`
          INSERT INTO configuracoes_precificacao (tenant_id)
          VALUES (${tenantId}::uuid)
          ON CONFLICT (tenant_id) DO UPDATE SET updated_at = configuracoes_precificacao.updated_at
          RETURNING id, tenant_id,
            fator_perda_padrao::float8 AS fator_perda_padrao,
            markup_padrao::float8 AS markup_padrao,
            aliquota_imposto::float8 AS aliquota_imposto,
            mo_producao_pct_padrao::float8 AS mo_producao_pct_padrao,
            mo_instalacao_pct_padrao::float8 AS mo_instalacao_pct_padrao,
            margem_minima_alerta::float8 AS margem_minima_alerta`;
      }
      return res.status(200).json({ success: true, data: rows[0] });
    }

    if (req.method === 'PATCH' || req.method === 'PUT' || req.method === 'POST') {
      await sql`
        INSERT INTO configuracoes_precificacao (tenant_id)
        VALUES (${tenantId}::uuid)
        ON CONFLICT (tenant_id) DO NOTHING`;

      const [atual] = await sql`
        SELECT fator_perda_padrao::float8 AS fator_perda_padrao,
          markup_padrao::float8 AS markup_padrao,
          aliquota_imposto::float8 AS aliquota_imposto,
          mo_producao_pct_padrao::float8 AS mo_producao_pct_padrao,
          mo_instalacao_pct_padrao::float8 AS mo_instalacao_pct_padrao,
          margem_minima_alerta::float8 AS margem_minima_alerta
        FROM configuracoes_precificacao
        WHERE tenant_id = ${tenantId}::uuid
        LIMIT 1`;
      if (!atual) {
        return res.status(404).json({ success: false, error: 'Configuração não encontrada' });
      }

      const body = req.body || {};
      const merged: Record<string, number> = {};
      for (const campo of CAMPOS) {
        const enviado = body[campo];
        const valor =
          enviado !== undefined && enviado !== null && enviado !== ''
            ? Number(enviado)
            : Number(atual[campo]);
        merged[campo] = Number.isFinite(valor) ? valor : Number(atual[campo]) || 0;
      }

      const [row] = await sql`
        UPDATE configuracoes_precificacao SET
          fator_perda_padrao = ${merged.fator_perda_padrao},
          markup_padrao = ${merged.markup_padrao},
          aliquota_imposto = ${merged.aliquota_imposto},
          mo_producao_pct_padrao = ${merged.mo_producao_pct_padrao},
          mo_instalacao_pct_padrao = ${merged.mo_instalacao_pct_padrao},
          margem_minima_alerta = ${merged.margem_minima_alerta},
          updated_at = NOW()
        WHERE tenant_id = ${tenantId}::uuid
        RETURNING id, tenant_id,
          fator_perda_padrao::float8 AS fator_perda_padrao,
          markup_padrao::float8 AS markup_padrao,
          aliquota_imposto::float8 AS aliquota_imposto,
          mo_producao_pct_padrao::float8 AS mo_producao_pct_padrao,
          mo_instalacao_pct_padrao::float8 AS mo_instalacao_pct_padrao,
          margem_minima_alerta::float8 AS margem_minima_alerta`;

      return res.status(200).json({ success: true, data: row });
    }

    return res.status(405).json({ success: false, error: 'Método não permitido' });
  } catch (err: any) {
    logger.error('[QUOTATION-TECNICO]', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

export const handleQuotationTecnico = withTenant(handleQuotationTecnicoCore);
