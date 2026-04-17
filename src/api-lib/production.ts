import { sql } from './_db.js';
import { calcularPrevisaoEntrega } from './_productionForecasting.js';

/**
 * MÓDULO MES (Manufacturing Execution System) - ARIA 4.0
 * Gestão de Produção em Tempo Real
 */

// --- 1. ROTAS DE CONTROLE ---

export async function handleProduction(req: any, res: any) {
  const method = req.method;
  const url = req.url || '';
  
  // Extração robusta de ID/Sub-rota (suporta ?id=X ou /api/production/metrics)
  let { id } = req.query || {};
  if (!id && url.includes('/production/')) {
    id = url.split('/production/')[1].split('?')[0];
  }

  try {
    // Garantia de migração (v6 hotfix)
    await sql`ALTER TABLE ordens_producao ADD COLUMN IF NOT EXISTS tempo_previsto_corte INTEGER DEFAULT 0`.catch(() => {});
    await sql`ALTER TABLE ordens_producao ADD COLUMN IF NOT EXISTS tempo_previsto_montagem INTEGER DEFAULT 0`.catch(() => {});
    await sql`ALTER TABLE ordens_producao ADD COLUMN IF NOT EXISTS data_prevista_entrega TIMESTAMP WITH TIME ZONE`.catch(() => {});

    if (method === 'GET' && (!id || id === 'list')) return await listOPs(res);
    if (method === 'GET' && id === 'metrics') return await getProductionMetrics(res);
    if (method === 'POST') return await createOP(req, res);
    if (method === 'PATCH') return await updateOPStatus(req, res);
    
    return res.status(405).json({ success: false, error: 'Método não permitido' });
  } catch (err: any) {
    console.error('PRODUCTION_HANDLER_ERROR:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}

// --- 2. LÓGICA DE NEGÓCIO ---

/**
 * Sincroniza as previsões de entrega de toda a fila ativa
 */
async function syncQueueForecasting() {
  const allOps = await sql`SELECT * FROM ordens_producao WHERE status != 'FINALIZADA' ORDER BY created_at ASC`;
  if (allOps.length === 0) return;

  const previstos = calcularPrevisaoEntrega(allOps as any);

  for (const op of previstos) {
    await sql`
      UPDATE ordens_producao 
      SET data_prevista_entrega = ${new Date(op.data_prevista_entrega as number)},
          tempo_previsto_corte = ${op.tempo_previsto_corte},
          tempo_previsto_montagem = ${op.tempo_previsto_montagem}
      WHERE op_id = ${op.op_id}
    `;
  }
}

async function listOPs(res: any) {
  const ops = await sql`SELECT * FROM ordens_producao ORDER BY created_at DESC`;
  
  // Auto-sync: se detectarmos OPs ativas sem previsão, força o cálculo global
  const precisaSincronizar = ops.some(o => o.status !== 'FINALIZADA' && !o.data_prevista_entrega);
  if (precisaSincronizar) {
    console.log('AUTO-SYNC: Detectadas OPs sem previsão. Sincronizando fila...');
    await syncQueueForecasting();
    const opsAtualizadas = await sql`SELECT * FROM ordens_producao ORDER BY created_at DESC`;
    return res.status(200).json({ success: true, data: opsAtualizadas });
  }

  return res.status(200).json({ success: true, data: ops });
}

/**
 * Cria uma nova OP (Geralmente chamada pelo Agente ou Vendas)
 */
async function createOP(req: any, res: any) {
  const { op_id, produto, pecas, metadata } = req.body;

  if (!op_id || !produto) {
    return res.status(400).json({ success: false, error: 'Dados insuficientes para criar OP' });
  }

  const [novaOP] = await sql`
    INSERT INTO ordens_producao (op_id, produto, pecas, metadata)
    VALUES (${op_id}, ${produto}, ${pecas || 0}, ${JSON.stringify(metadata || {})})
    RETURNING *
  `;

  // Atualizar fila
  await syncQueueForecasting();

  return res.status(201).json({ success: true, data: novaOP });
}

/**
 * Atualiza o status da OP e gerencia os tempos de produção
 */
async function updateOPStatus(req: any, res: any) {
  const { op_id, status } = req.body;

  // Busca estado atual
  const [op] = await sql`SELECT * FROM ordens_producao WHERE op_id = ${op_id}`;
  if (!op) return res.status(404).json({ success: false, error: 'OP não encontrada' });

  let data_inicio = op.data_inicio;
  let data_fim = op.data_fim;

  // Se começou agora (moveu de PENDENTE)
  if (!data_inicio && status !== "PENDENTE") {
    data_inicio = new Date();
  }

  // Se finalizou
  if (status === "FINALIZADA") {
    data_fim = new Date();
  }

  const [atualizada] = await sql`
    UPDATE ordens_producao 
    SET status = ${status}, 
        data_inicio = ${data_inicio}, 
        data_fim = ${data_fim}, 
        updated_at = CURRENT_TIMESTAMP
    WHERE op_id = ${op_id}
    RETURNING *
  `;

  // Recalcular fila se mudou status (pode afetar gargalos)
  await syncQueueForecasting();

  return res.status(200).json({ success: true, data: atualizada });
}

/**
 * Calcula métricas de produtividade (MES)
 */
async function getProductionMetrics(res: any) {
  const allOps = await sql`SELECT * FROM ordens_producao`;
  const agora = Date.now();
  
  const finalizadas = allOps.filter(o => o.status === "FINALIZADA" && o.data_inicio && o.data_fim);
  const pendentes = allOps.filter(o => o.status !== "FINALIZADA");
  
  // Cálculo de Lead Time Médio em minutos (histórico)
  const tempos = finalizadas.map(o => {
    const inicio = new Date(o.data_inicio).getTime();
    const fim = new Date(o.data_fim).getTime();
    return (fim - inicio) / (1000 * 60);
  });

  const leadTimeMedio = tempos.length > 0 
    ? (tempos.reduce((a, b) => a + b, 0) / tempos.length) 
    : 0;

  // Novas métricas de previsão
  const opsAtrasadas = pendentes.filter(o => 
    o.data_prevista_entrega && new Date(o.data_prevista_entrega).getTime() < agora
  ).length;

  const totalMinutosFila = pendentes.reduce((acc, o) => 
    acc + (o.tempo_previsto_corte || 0) + (o.tempo_previsto_montagem || 0), 0
  );

  const metrics = {
    totalOPs: allOps.length,
    finalizadas: finalizadas.length,
    emProducao: allOps.filter(o => o.status !== "PENDENTE" && o.status !== "FINALIZADA").length,
    leadTimeMedio: parseFloat(leadTimeMedio.toFixed(2)),
    taxaEficiencia: allOps.length > 0 ? (finalizadas.length / allOps.length) * 100 : 0,
    // Previsão
    opsAtrasadas,
    filaTotalDias: parseFloat((totalMinutosFila / 480).toFixed(1)) // Carga diária
  };

  return res.status(200).json({ success: true, data: metrics });
}
