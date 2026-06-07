import { sql } from './_db.js';
import { withTenant, type TenantHandler } from './middleware/tenantMiddleware.js';

const handleRentabilidadeCore: TenantHandler = async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const user = req.tenantUser;
    const method = req.method;
    const url = req.url || '';

    // ────────────────────────────────────────────────────────────────────────────────
    // GET /api/rentabilidade/kpi
    // ────────────────────────────────────────────────────────────────────────────────
    if (method === 'GET' && url.includes('/kpi')) {
      const { periodo, data_inicio, data_fim } = req.query;

      const dataInicio = data_inicio
        ? new Date(data_inicio)
        : new Date(new Date().setMonth(new Date().getMonth() - 1));
      const dataFim = data_fim ? new Date(data_fim) : new Date();

      // Período anterior (para cálculo de variação)
      const diffMs = dataFim.getTime() - dataInicio.getTime();
      const dataInicioAnterior = new Date(dataInicio.getTime() - diffMs);

      // Query período atual
      const currentResult = await sql`
        SELECT 
          COALESCE(SUM(cr.valor_venda), 0) as receita_total,
          COALESCE(SUM(cr.custo_total_real), 0) as custo_total,
          COALESCE(SUM(cr.margem_real), 0) as margem_total,
          COALESCE(AVG(cr.margem_percentual_real), 0) as margem_media_percentual
        FROM custos_reais_op cr
        WHERE cr.tenant_id = ${tenantId}::uuid
          AND cr.data_conclusao_op BETWEEN ${dataInicio.toISOString().split('T')[0]}::date AND ${dataFim.toISOString().split('T')[0]}::date
      `;

      // Query período anterior
      const prevResult = await sql`
        SELECT 
          COALESCE(SUM(cr.valor_venda), 0) as receita_total,
          COALESCE(SUM(cr.custo_total_real), 0) as custo_total,
          COALESCE(SUM(cr.margem_real), 0) as margem_total,
          COALESCE(AVG(cr.margem_percentual_real), 0) as margem_media_percentual
        FROM custos_reais_op cr
        WHERE cr.tenant_id = ${tenantId}::uuid
          AND cr.data_conclusao_op BETWEEN ${dataInicioAnterior.toISOString().split('T')[0]}::date AND ${dataInicio.toISOString().split('T')[0]}::date
      `;

      const current = currentResult[0] || {
        receita_total: 0,
        custo_total: 0,
        margem_total: 0,
        margem_media_percentual: 0,
      };
      const prev = prevResult[0] || {
        receita_total: 0,
        custo_total: 0,
        margem_total: 0,
        margem_media_percentual: 0,
      };

      const cReceita = parseFloat(current.receita_total);
      const cCustos = parseFloat(current.custo_total);
      const cMargem = parseFloat(current.margem_total);
      const cMargemPct = parseFloat(current.margem_media_percentual);

      const pReceita = parseFloat(prev.receita_total);
      const pCustos = parseFloat(prev.custo_total);
      const pMargem = parseFloat(prev.margem_total);
      const pMargemPct = parseFloat(prev.margem_media_percentual);

      return res.status(200).json({
        success: true,
        receita_total: cReceita,
        custo_total: cCustos,
        margem_total: cMargem,
        margem_media_percentual: cMargemPct,
        variacao_receita: pReceita > 0 ? ((cReceita - pReceita) / pReceita) * 100 : 0,
        variacao_custos: pCustos > 0 ? ((cCustos - pCustos) / pCustos) * 100 : 0,
        variacao_margem: pMargem > 0 ? ((cMargem - pMargem) / pMargem) * 100 : 0,
        variacao_margem_percentual: cMargemPct - pMargemPct,
      });
    }

    // ────────────────────────────────────────────────────────────────────────────────
    // GET /api/rentabilidade/projetos
    // ────────────────────────────────────────────────────────────────────────────────
    if (method === 'GET' && url.includes('/projetos')) {
      const { cliente } = req.query;

      let queryStr = `
        SELECT 
          cr.id,
          cr.quotation_id,
          op.op_id as numero_op,
          o.numero_orcamento,
          c.nome as cliente,
          cr.valor_venda,
          cr.custo_total_estimado,
          cr.custo_total_real,
          cr.custo_material_real,
          cr.custo_mao_obra_real,
          cr.custo_retrabalho,
          cr.custo_desperdicio_material,
          cr.tempo_horas_real,
          cr.margem_real,
          cr.margem_percentual_real,
          cr.descricao_desvios,
          CASE 
            WHEN cr.custo_total_estimado > 0 
            THEN ((cr.custo_total_real - cr.custo_total_estimado) / cr.custo_total_estimado * 100)
            ELSE 0
          END as variacao_custo_percentual,
          CASE 
            WHEN cr.margem_percentual_real > 30 THEN 'lucrativo'
            WHEN cr.margem_percentual_real > 0 THEN 'equilibrio'
            ELSE 'prejuizo'
          END as status
        FROM custos_reais_op cr
        JOIN ordens_producao op ON cr.operacao_prod_id = op.id
        JOIN quotations o ON cr.quotation_id = o.id
        LEFT JOIN clients c ON o.cliente_id::text = c.id::text AND c.tenant_id = o.tenant_id
        WHERE cr.tenant_id = $1::uuid
      `;

      const params: any[] = [tenantId];

      if (cliente) {
        params.push(`%${cliente}%`);
        queryStr += ` AND c.nome ILIKE $2`;
      }

      queryStr += ` ORDER BY cr.margem_percentual_real DESC`;

      const rows = await sql(queryStr as any, ...params);

      return res.status(200).json({
        success: true,
        projetos: rows.map((r: any) => ({
          id: r.id,
          quotation_id: r.quotation_id,
          numero_op: r.numero_op,
          numero_orcamento: r.numero_orcamento,
          cliente: r.cliente || 'Cliente Avulso',
          valor_venda: parseFloat(r.valor_venda || 0),
          custo_total_estimado: parseFloat(r.custo_total_estimado || 0),
          custo_total_real: parseFloat(r.custo_total_real || 0),
          custo_material_real: parseFloat(r.custo_material_real || 0),
          custo_mao_obra_real: parseFloat(r.custo_mao_obra_real || 0),
          custo_retrabalho: parseFloat(r.custo_retrabalho || 0),
          custo_desperdicio_material: parseFloat(r.custo_desperdicio_material || 0),
          tempo_horas_real: parseFloat(r.tempo_horas_real || 0),
          margem_real: parseFloat(r.margem_real || 0),
          margem_percentual: parseFloat(r.margem_percentual_real || 0),
          variacao_custo_percentual: parseFloat(r.variacao_custo_percentual || 0),
          status: r.status,
          descricao_desvios: r.descricao_desvios,
        })),
      });
    }

    // ────────────────────────────────────────────────────────────────────────────────
    // GET /api/rentabilidade/alertas
    // ────────────────────────────────────────────────────────────────────────────────
    if (method === 'GET' && url.includes('/alertas')) {
      const alertas = await sql`
        SELECT 
          cr.quotation_id,
          op.numero_op,
          c.nome as cliente,
          CASE 
            WHEN cr.custo_total_estimado > 0 
            THEN ((cr.custo_total_real - cr.custo_total_estimado) / cr.custo_total_estimado * 100)
            ELSE 0
          END as variacao_percentual,
          cr.margem_percentual_real,
          cr.descricao_desvios
        FROM custos_reais_op cr
        JOIN ordens_prod op ON cr.operacao_prod_id = op.id
        JOIN quotations o ON cr.quotation_id = o.id
        LEFT JOIN clients c ON o.cliente_id::text = c.id::text AND c.tenant_id = o.tenant_id
        WHERE cr.tenant_id = ${tenantId}::uuid
          AND (
            (cr.custo_total_estimado > 0 AND ((cr.custo_total_real - cr.custo_total_estimado) / cr.custo_total_estimado * 100) > 20)
            OR cr.margem_percentual_real < 0
          )
        ORDER BY variacao_percentual DESC
        LIMIT 10
      `;

      return res.status(200).json({
        success: true,
        alertas: alertas.map((r: any) => ({
          quotation_id: r.quotation_id,
          numero_op: r.numero_op,
          cliente: r.cliente || 'Cliente Avulso',
          variacao_percentual: parseFloat(r.variacao_percentual || 0),
          margem_percentual_real: parseFloat(r.margem_percentual_real || 0),
          descricao_desvios: r.descricao_desvios || '',
        })),
      });
    }

    // ────────────────────────────────────────────────────────────────────────────────
    // GET /api/rentabilidade/por-cliente
    // ────────────────────────────────────────────────────────────────────────────────
    if (method === 'GET' && url.includes('/por-cliente')) {
      const clientes = await sql`
        SELECT 
          c.nome as cliente,
          c.id as cliente_id,
          COUNT(DISTINCT cr.quotation_id) as total_pedidos,
          COALESCE(SUM(cr.valor_venda), 0) as total_vendido,
          COALESCE(SUM(cr.custo_total_real), 0) as total_custos_reais,
          COALESCE(SUM(cr.margem_real), 0) as margem_total,
          COALESCE(AVG(cr.margem_percentual_real), 0) as margem_media_percentual,
          COALESCE(SUM(CASE WHEN cr.margem_percentual_real > 0 THEN 1 ELSE 0 END), 0) as operacoes_lucrativas,
          COALESCE(SUM(CASE WHEN cr.margem_percentual_real < 0 THEN 1 ELSE 0 END), 0) as operacoes_prejuizadas,
          GREATEST(1, LEAST(10, CAST(ROUND(COALESCE(AVG(cr.margem_percentual_real), 0) / 5) AS INT))) as score_rentabilidade,
          MAX(cr.data_conclusao_op) as ultimo_pedido_data
        FROM clients c
        JOIN quotations o ON o.cliente_id::text = c.id::text AND c.tenant_id = o.tenant_id
        JOIN custos_reais_op cr ON o.id = cr.quotation_id
        WHERE c.tenant_id = ${tenantId}::uuid
        GROUP BY c.nome, c.id
        ORDER BY margem_total DESC
      `;

      return res.status(200).json({
        success: true,
        clientes: clientes.map((r: any) => ({
          cliente: r.cliente,
          cliente_id: r.cliente_id,
          total_pedidos: parseInt(r.total_pedidos || 0),
          total_vendido: parseFloat(r.total_vendido || 0),
          total_custos_reais: parseFloat(r.total_custos_reais || 0),
          margem_total: parseFloat(r.margem_total || 0),
          margem_media_percentual: parseFloat(r.margem_media_percentual || 0),
          operacoes_lucrativas: parseInt(r.operacoes_lucrativas || 0),
          operacoes_prejuizadas: parseInt(r.operacoes_prejuizadas || 0),
          score_rentabilidade: parseInt(r.score_rentabilidade || 0),
          ultimo_pedido_data: r.ultimo_pedido_data,
        })),
      });
    }

    // ────────────────────────────────────────────────────────────────────────────────
    // GET /api/rentabilidade/grafico-margem
    // ────────────────────────────────────────────────────────────────────────────────
    if (method === 'GET' && url.includes('/grafico-margem')) {
      const dados = await sql`
        SELECT 
          TO_CHAR(cr.data_conclusao_op, 'MM/YYYY') as mes_ano,
          AVG(cr.margem_estimada) as margem_estimada,
          AVG(cr.margem_real) as margem_real
        FROM custos_reais_op cr
        WHERE cr.tenant_id = ${tenantId}::uuid
          AND cr.data_conclusao_op >= CURRENT_DATE - INTERVAL '12 months'
        GROUP BY TO_CHAR(cr.data_conclusao_op, 'MM/YYYY'), DATE_TRUNC('month', cr.data_conclusao_op)
        ORDER BY DATE_TRUNC('month', cr.data_conclusao_op) ASC
      `;

      return res.status(200).json({
        success: true,
        dados: dados.map((r: any) => ({
          mes: r.mes_ano,
          margem_estimada: parseFloat(r.margem_estimada || 0),
          margem_real: parseFloat(r.margem_real || 0),
        })),
      });
    }

    // ────────────────────────────────────────────────────────────────────────────────
    // POST /api/rentabilidade/salvar (Para salvar/atualizar custos reais de uma OP)
    // ────────────────────────────────────────────────────────────────────────────────
    if (method === 'POST' && url.includes('/salvar')) {
      const {
        id,
        custo_material_real,
        custo_mao_obra_real,
        tempo_horas_real,
        custo_retrabalho,
        custo_desperdicio_material,
        descricao_desvios,
      } = req.body;

      if (!id) {
        return res
          .status(400)
          .json({ success: false, error: 'ID do registro de rentabilidade é obrigatório' });
      }

      // 1. Obter registro original
      const [original] = await sql`
        SELECT * FROM custos_reais_op WHERE id = ${id} AND tenant_id = ${tenantId}::uuid
      `;

      if (!original) {
        return res
          .status(404)
          .json({ success: false, error: 'Registro de rentabilidade não encontrado' });
      }

      // 2. Calcular novos valores
      const cMat =
        custo_material_real !== undefined
          ? parseFloat(custo_material_real)
          : parseFloat(original.custo_material_real || 0);
      const cMao =
        custo_mao_obra_real !== undefined
          ? parseFloat(custo_mao_obra_real)
          : parseFloat(original.custo_mao_obra_real || 0);
      const cRet =
        custo_retrabalho !== undefined
          ? parseFloat(custo_retrabalho)
          : parseFloat(original.custo_retrabalho || 0);
      const cDes =
        custo_desperdicio_material !== undefined
          ? parseFloat(custo_desperdicio_material)
          : parseFloat(original.custo_desperdicio_material || 0);

      const tHoras =
        tempo_horas_real !== undefined
          ? parseFloat(tempo_horas_real)
          : parseFloat(original.tempo_horas_real || 0);

      const totalReal = cMat + cMao + cRet + cDes;
      const totalEstimado = parseFloat(original.custo_total_estimado || 0);

      const varCusto = totalReal - totalEstimado;
      const varPct = totalEstimado > 0 ? (varCusto / totalEstimado) * 100 : 0;

      const venda = parseFloat(original.valor_venda || 0);
      const mReal = venda - totalReal;
      const mRealPct = venda > 0 ? (mReal / venda) * 100 : 0;

      // 3. Atualizar no banco
      const [updated] = await sql`
        UPDATE custos_reais_op
        SET custo_material_real = ${cMat},
            custo_mao_obra_real = ${cMao},
            tempo_horas_real = ${tHoras},
            custo_retrabalho = ${cRet},
            custo_desperdicio_material = ${cDes},
            custo_total_real = ${totalReal},
            variacao_custo = ${varCusto},
            variacao_percentual = ${varPct},
            margem_real = ${mReal},
            margem_percentual_real = ${mRealPct},
            descricao_desvios = ${descricao_desvios || null},
            responsavel_analise = ${user.id}::uuid,
            updated_at = NOW()
        WHERE id = ${id} AND tenant_id = ${tenantId}::uuid
        RETURNING *
      `;

      return res.status(200).json({ success: true, data: updated });
    }

    return res.status(405).json({ success: false, error: 'Método não permitido' });
  } catch (err: any) {
    console.error('[RENTABILIDADE_ERROR]', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

export const handleRentabilidade = withTenant(handleRentabilidadeCore);

// ────────────────────────────────────────────────────────────────────────────────
// Função Helper: Chamada ao finalizar uma Ordem de Produção (para alimentar a tabela)
// ────────────────────────────────────────────────────────────────────────────────
export async function autoCreateCustosReaisOP(opId: string, tenantId: string) {
  try {
    // 1. Obter dados da OP
    const [op] = await sql`
      SELECT op.*, o.valor_total_custo, o.valor_total_venda, o.margem_lucro_percentual
      FROM ordens_prod op
      JOIN quotations o ON op.quotation_id = o.id
      WHERE op.id = ${opId}::uuid AND op.tenant_id = ${tenantId}::uuid
    `;

    if (!op) return;

    const valorVenda = parseFloat(op.valor_total_venda || 0);
    const custoEstimado = parseFloat(op.valor_total_custo || 0);
    const margemEstimada = valorVenda - custoEstimado;
    const margemEstimadaPct = op.margem_lucro_percentual
      ? parseFloat(op.margem_lucro_percentual)
      : valorVenda > 0
        ? (margemEstimada / valorVenda) * 100
        : 0;

    // Divisão estimada padrão: 60% materiais, 40% mão de obra
    const matEstimado = custoEstimado * 0.6;
    const maoEstimado = custoEstimado * 0.4;
    // Tempo estimado padrão (ex: 1 hora a cada R$ 100 de mão de obra, mínimo de 4h)
    const tempoEstimado = Math.max(4, Math.round(maoEstimado / 100));

    // Verificar se já existe registro
    const [existing] = await sql`
      SELECT id FROM custos_reais_op 
      WHERE operacao_prod_id = ${opId}::uuid AND tenant_id = ${tenantId}::uuid
    `;

    if (existing) {
      // Apenas atualizar valores base se necessário
      await sql`
        UPDATE custos_reais_op
        SET valor_venda = ${valorVenda},
            custo_total_estimado = ${custoEstimado},
            margem_estimada = ${margemEstimada},
            data_conclusao_op = CURRENT_DATE,
            updated_at = NOW()
        WHERE id = ${existing.id}
      `;
    } else {
      // Inserir registro inicial
      await sql`
        INSERT INTO custos_reais_op (
          tenant_id, operacao_prod_id, quotation_id,
          custo_material_estimado, custo_mao_obra_estimada, tempo_horas_estimado,
          custo_material_real, custo_mao_obra_real, tempo_horas_real,
          custo_total_estimado, custo_total_real, variacao_custo, variacao_percentual,
          valor_venda, margem_estimada, margem_real, margem_percentual_real,
          data_conclusao_op
        ) VALUES (
          ${tenantId}::uuid, ${opId}::uuid, ${op.quotation_id}::uuid,
          ${matEstimado}, ${maoEstimado}, ${tempoEstimado},
          ${matEstimado}, ${maoEstimado}, ${tempoEstimado}, -- Inicialmente os custos reais são iguais aos estimados
          ${custoEstimado}, ${custoEstimado}, 0, 0,
          ${valorVenda}, ${margemEstimada}, ${margemEstimada}, ${margemEstimadaPct},
          CURRENT_DATE
        )
      `;
    }

    // ────────────────────────────────────────────────────────────────────────────────
    // Atualizar Rentabilidade do Cliente de forma agregada
    // ────────────────────────────────────────────────────────────────────────────────
    const [clienteRes] = await sql`
      SELECT cliente_id FROM quotations WHERE id = ${op.quotation_id}::uuid
    `;
    if (clienteRes && clienteRes.cliente_id) {
      const clienteId = parseInt(clienteRes.cliente_id);

      // Calcular estatísticas agregadas do cliente
      const stats = await sql`
        SELECT 
          COUNT(DISTINCT cr.quotation_id) as total_pedidos,
          SUM(cr.valor_venda) as total_vendido,
          SUM(cr.custo_total_real) as total_custos_reais,
          SUM(cr.margem_real) as margem_total,
          AVG(cr.margem_percentual_real) as margem_media_percentual,
          SUM(CASE WHEN cr.margem_percentual_real > 0 THEN 1 ELSE 0 END) as operacoes_lucrativas,
          SUM(CASE WHEN cr.margem_percentual_real < 0 THEN 1 ELSE 0 END) as operacoes_prejuizadas,
          MAX(cr.data_conclusao_op) as ultimo_pedido_data
        FROM custos_reais_op cr
        JOIN quotations o ON cr.quotation_id = o.id
        WHERE o.cliente_id::text = ${clienteId}::text AND cr.tenant_id = ${tenantId}::uuid
      `;

      const currentStats = stats[0];
      if (currentStats) {
        const totalPedidos = parseInt(currentStats.total_pedidos || 0);
        const totalVendido = parseFloat(currentStats.total_vendido || 0);
        const ticketMedio = totalPedidos > 0 ? totalVendido / totalPedidos : 0;
        const margemPct = parseFloat(currentStats.margem_media_percentual || 0);

        // Score de Rentabilidade: Margem percentual dividida por 5 (limitada entre 1 e 10)
        const score = Math.max(1, Math.min(10, Math.round(margemPct / 5)));

        // Buscar total orçamentos (incluindo não aprovados)
        const [totalOrc] = await sql`
          SELECT COUNT(*) as count FROM quotations 
          WHERE cliente_id::text = ${clienteId}::text AND tenant_id = ${tenantId}::uuid
        `;

        const totalOrcamentos = parseInt(totalOrc?.count || 0);

        // Upsert RentabilidadeCliente
        const [existingRent] = await sql`
          SELECT id FROM rentabilidade_cliente 
          WHERE cliente_id = ${clienteId} AND tenant_id = ${tenantId}::uuid
        `;

        if (existingRent) {
          await sql`
            UPDATE rentabilidade_cliente
            SET total_orcamentos = ${totalOrcamentos},
                total_pedidos = ${totalPedidos},
                total_vendido = ${totalVendido},
                total_custos_reais = ${parseFloat(currentStats.total_custos_reais || 0)},
                margem_total = ${parseFloat(currentStats.margem_total || 0)},
                margem_media_percentual = ${margemPct},
                ticket_medio = ${ticketMedio},
                operacoes_lucrativas = ${parseInt(currentStats.operacoes_lucrativas || 0)},
                operacoes_prejuizadas = ${parseInt(currentStats.operacoes_prejuizadas || 0)},
                score_rentabilidade = ${score},
                ultimo_pedido_data = ${currentStats.ultimo_pedido_data},
                updated_at = NOW()
            WHERE id = ${existingRent.id}
          `;
        } else {
          await sql`
            INSERT INTO rentabilidade_cliente (
              tenant_id, cliente_id, total_orcamentos, total_pedidos,
              total_vendido, total_custos_reais, margem_total, margem_media_percentual,
              ticket_medio, operacoes_lucrativas, operacoes_prejuizadas, score_rentabilidade,
              ultimo_pedido_data
            ) VALUES (
              ${tenantId}::uuid, ${clienteId}, ${totalOrcamentos}, ${totalPedidos},
              ${totalVendido}, ${parseFloat(currentStats.total_custos_reais || 0)}, ${parseFloat(currentStats.margem_total || 0)}, ${margemPct},
              ${ticketMedio}, ${parseInt(currentStats.operacoes_lucrativas || 0)}, ${parseInt(currentStats.operacoes_prejuizadas || 0)}, ${score},
              ${currentStats.ultimo_pedido_data}
            )
          `;
        }
      }
    }
  } catch (err) {
    console.error('Error autoCreateCustosReaisOP:', err);
  }
}
