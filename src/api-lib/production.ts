import { sql } from './_db.js';

/**
 * MÓDULO MES (Manufacturing Execution System) - ARIA 4.0
 * Gestão de Produção em Tempo Real
 */

// --- 1. ROTAS DE CONTROLE ---

export async function handleProduction(req: any, res: any) {
  const method = req.method;
  const { id } = req.query || {};

  try {
    if (method === 'GET' && !id) return await listOPs(res);
    if (method === 'GET' && id === 'metrics') return await getProductionMetrics(res);
    if (method === 'POST') return await createOP(req, res);
    if (method === 'PATCH') return await updateOPStatus(req, res);
    
    return res.status(405).json({ success: false, error: 'Método não permitido' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

// --- 2. LÓGICA DE NEGÓCIO ---

/**
 * Lista todas as OPs
 */
async function listOPs(res: any) {
  const ops = await sql`SELECT * FROM ordens_producao ORDER BY created_at DESC`;
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

  return res.status(201).json({ success: true, data: novaOP });
}

/**
 * Atualiza o status da OP e gerencia os tempos de produção
 */
async function updateOPStatus(req: any, res: any) {
  const { op_id, status } = req.body;
  const fluxo = ["PENDENTE", "CORTE", "MONTAGEM", "FINALIZADA"];

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

  return res.status(200).json({ success: true, data: atualizada });
}

/**
 * Calcula métricas de produtividade (MES)
 */
async function getProductionMetrics(res: any) {
  const allOps = await sql`SELECT * FROM ordens_producao`;
  
  const finalizadas = allOps.filter(o => o.status === "FINALIZADA" && o.data_inicio && o.data_fim);
  
  // Cálculo de Lead Time Médio em minutos
  const tempos = finalizadas.map(o => {
    const inicio = new Date(o.data_inicio).getTime();
    const fim = new Date(o.data_fim).getTime();
    return (fim - inicio) / (1000 * 60);
  });

  const leadTimeMedio = tempos.length > 0 
    ? (tempos.reduce((a, b) => a + b, 0) / tempos.length) 
    : 0;

  const metrics = {
    totalOPs: allOps.length,
    finalizadas: finalizadas.length,
    emProducao: allOps.filter(o => o.status !== "PENDENTE" && o.status !== "FINALIZADA").length,
    leadTimeMedio: parseFloat(leadTimeMedio.toFixed(2)),
    taxaEficiencia: allOps.length > 0 ? (finalizadas.length / allOps.length) * 100 : 0
  };

  return res.status(200).json({ success: true, data: metrics });
}
