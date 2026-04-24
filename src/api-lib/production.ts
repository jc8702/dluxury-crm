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
    await sql`ALTER TABLE ordens_producao ADD COLUMN IF NOT EXISTS checklist JSONB DEFAULT '[]'`.catch(() => {});
    await sql`ALTER TABLE ordens_producao ADD COLUMN IF NOT EXISTS visita_id TEXT`.catch(() => {});
    await sql`ALTER TABLE ordens_producao ADD COLUMN IF NOT EXISTS projeto_id TEXT`.catch(() => {});
    await sql`ALTER TABLE ordens_producao ADD COLUMN IF NOT EXISTS orcamento_id TEXT`.catch(() => {});

    if (method === 'GET' && (!id || id === 'list')) return await listOPs(res);
    if (method === 'GET' && id === 'metrics') return await getProductionMetrics(res);
    if (method === 'POST') return await createOP(req, res);
    if (method === 'PATCH' && id === 'details') return await updateOPDetails(req, res);
    if (method === 'PATCH') return await updateOPStatus(req, res);
    if (method === 'DELETE') return await deleteOP(req, res);
    
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
  const { op_id, produto, pecas, metadata, checklist, visita_id, projeto_id, orcamento_id } = req.body;

  console.log('[CREATE_OP] Received:', { op_id, produto, pecas, visita_id, projeto_id, orcamento_id });

  if (!op_id || !produto) {
    console.error('[CREATE_OP] Missing required fields:', { op_id, produto });
    return res.status(400).json({ success: false, error: 'Dados insuficientes para criar OP' });
  }

  try {
    const defaultChecklist = [
      { id: `chk-${Math.random().toString(36).substr(2,8)}`, task: 'CORTE', completed: false },
      { id: `chk-${Math.random().toString(36).substr(2,8)}`, task: 'FITA DE BORDA', completed: false },
      { id: `chk-${Math.random().toString(36).substr(2,8)}`, task: 'FURAÇÕES', completed: false }
    ];

    const checklistToSave = Array.isArray(checklist) && checklist.length > 0 ? checklist : defaultChecklist;

    const [novaOP] = await sql`
      INSERT INTO ordens_producao (op_id, produto, pecas, status, metadata, checklist, visita_id, projeto_id, orcamento_id)
      VALUES (${op_id}, ${produto}, ${pecas || 0}, 'PRODUCAO', ${JSON.stringify(metadata || {})}, ${JSON.stringify(checklistToSave)}, ${visita_id || null}, ${projeto_id || null}, ${orcamento_id || null})
      RETURNING *
    `;

    console.log('[CREATE_OP] Created:', novaOP);

    // Atualizar fila
    await syncQueueForecasting();

    return res.status(201).json({ success: true, data: novaOP });
  } catch (err: any) {
    console.error('[CREATE_OP] Error:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
}

/**
 * Atualiza detalhes da OP (checklist, produto, pecas)
 */
async function updateOPDetails(req: any, res: any) {
  const { op_id, produto, pecas, checklist, metadata } = req.body;

  // Merge update: update fields that are provided. Keep existing otherwise.
  const [existing] = await sql`SELECT * FROM ordens_producao WHERE op_id = ${op_id}`;
  if (!existing) return res.status(404).json({ success: false, error: 'OP não encontrada' });

  const newProduto = produto !== undefined ? produto : existing.produto;
  const newPecas = pecas !== undefined ? pecas : existing.pecas;
  const newChecklist = checklist !== undefined ? JSON.stringify(checklist || []) : existing.checklist;
  const newMetadata = metadata !== undefined ? JSON.stringify(metadata) : existing.metadata;

  const [atualizada] = await sql`
    UPDATE ordens_producao 
    SET produto = ${newProduto},
        pecas = ${newPecas},
        checklist = ${newChecklist},
        metadata = ${newMetadata},
        updated_at = CURRENT_TIMESTAMP
    WHERE op_id = ${op_id}
    RETURNING *
  `;

  // If changed peças, recalcula previsões
  await syncQueueForecasting();

  try { window.dispatchEvent(new CustomEvent('op_updated', { detail: { op_id } })); } catch (e) {}

  return res.status(200).json({ success: true, data: atualizada });
}

/**
 * Exclui uma OP e remove o card do kanban se existir
 */
  async function deleteOP(req: any, res: any) {
  const { op_id } = req.query || req.body || {};
  if (!op_id) return res.status(400).json({ success: false, error: 'op_id é obrigatório' });

  const [existing] = await sql`SELECT * FROM ordens_producao WHERE op_id = ${op_id}`;
  if (!existing) return res.status(404).json({ success: false, error: 'OP não encontrada' });

  await sql`DELETE FROM ordens_producao WHERE op_id = ${op_id}`;

  // Try to remove kanban item(s) referencing this OP
  // Prefer explicit op_id field (if present), fallback to searching observations text
  await sql`DELETE FROM kanban_items WHERE op_id = ${op_id} OR observations::text LIKE ${'%' + op_id + '%'} `.catch(() => {});

  try { window.dispatchEvent(new CustomEvent('op_deleted', { detail: { op_id } })); } catch (e) {}

  return res.status(200).json({ success: true, data: { op_id } });
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

  // Defensive validation: do not allow advancing if checklist or piece-level checks are incomplete
  if (status && status !== op.status) {
    // Load checklist and metadata
    const checklist = Array.isArray(op.checklist) ? op.checklist : (op.checklist ? JSON.parse(op.checklist) : []);
    const metadata = op.metadata ? (typeof op.metadata === 'string' ? JSON.parse(op.metadata) : op.metadata) : {};

    const checklistComplete = checklist.length === 0 || checklist.every((i: any) => i.completed);
    // piece-level checks: expect metadata.pecas as array with optional operator_checked boolean
    let piecesComplete = true;
    try {
      const pecas = Array.isArray(metadata.pecas) ? metadata.pecas : [];
      for (const p of pecas) {
        if (p && p.operator_checked === false) { piecesComplete = false; break; }
      }
    } catch (e) {}

    // If attempting to advance to next productive stage (not allowing revert to PENDENTE), block if incomplete
    const fluxo: string[] = ["PENDENTE", "CORTE", "MONTAGEM", "FINALIZADA"];
    const idxFrom = fluxo.indexOf(op.status);
    const idxTo = fluxo.indexOf(status);
    if (idxTo > idxFrom) {
      if (!checklistComplete || !piecesComplete) {
        return res.status(400).json({ success: false, error: 'Não é possível avançar: checklist e/ou peças pendentes' });
      }
    }
  }

  // Se começou agora (moveu de PENDENTE para qualquer etapa produtiva)
  if (!data_inicio && status !== "PENDENTE") {
    data_inicio = new Date();
  }

  // Se voltou para PENDENTE, reseta início
  if (status === "PENDENTE") {
    data_inicio = null;
  }

  // Se finalizou
  if (status === "FINALIZADA") {
    data_fim = new Date();
  } else {
    // Se saiu de FINALIZADA (reabriu), reseta fim
    data_fim = null;
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

  // Recalcular fila se mudou status (pode afetar gargalos e datas)
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
