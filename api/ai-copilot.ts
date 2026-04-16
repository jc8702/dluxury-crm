import { google } from '@ai-sdk/google';
import { generateText, generateObject } from 'ai';
import { z } from 'zod';
import { sql, validateAuth } from './lib/_db.js';

export default async function handler(req: any, res: any) {
  const { authorized, error } = validateAuth(req);
  if (!authorized) return res.status(401).json({ error });

  if (req.method !== 'POST') return res.status(405).end();

  const { skill, payload } = req.body;
  const apiKey = process.env.GOOGLE_GENERATION_AI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ 
      error: 'Configuração de IA ausente. Defina GOOGLE_GENERATION_AI_API_KEY.' 
    });
  }

  // Configuração do Provedor Gemini
  const model = google('gemini-1.5-pro-latest');

  try {
    switch (skill) {
      case 'generate-bom':
        return await handleGenerateBOM(payload, model, res);
      case 'audit-sku':
        return await handleAuditSKU(payload, model, res);
      case 'purchase-advisor':
        return await handlePurchaseAdvisor(model, res);
      case 'anomaly-detection':
        return await handleAnomalyDetection(model, res);
      default:
        return res.status(400).json({ error: 'Skill não suportada' });
    }
  } catch (err: any) {
    console.error(`Erro na Skill IA [${skill}]:`, err);
    return res.status(500).json({ error: err.message });
  }
}

/**
 * SKILL: Geração de BOM via IA
 */
async function handleGenerateBOM(payload: any, model: any, res: any) {
  const { descricao, medidas } = payload; // ex: { L: 1200, A: 600, P: 400 }

  // 1. Buscar SKUs existentes para fornecer contexto à IA
  const skus = await sql`SELECT id, sku_code, nome, unidade_medida FROM erp_skus WHERE ativo = true LIMIT 50`;
  
  const { object } = await generateObject({
    model,
    schema: z.object({
      itens: z.array(z.object({
        sku_id: z.string(),
        componente_nome: z.string(),
        formula_quantidade: z.string(),
        formula_perda: z.string(),
        tipo_regra: z.enum(['FIXO', 'AREA', 'PERIMETRO', 'PARAMETRICO']),
        justificativa: z.string()
      }))
    }),
    prompt: `
      Você é um Engenheiro de Marcenaria Sênior. Sua tarefa é explodir a BOM (Bill of Materials) para o seguinte móvel:
      DESCRIÇÃO: ${descricao}
      MEDIDAS (mm): L=${medidas.L}, A=${medidas.A}, P=${medidas.P}

      Use EXCLUSIVAMENTE os SKUs abaixo do nosso catálogo:
      ${JSON.stringify(skus)}

      Instruções:
      1. Use a regra 'AREA' para chapas de MDF e fundos.
      2. Use a regra 'PERIMETRO' para fitas de borda.
      3. Use 'FIXO' para ferragens (dobradiças, puxadores).
      4. As fórmulas devem usar as variáveis L, A, P (em mm).
    `,
  });

  return res.status(200).json(object);
}

/**
 * SKILL: Auditoria de SKU
 */
async function handleAuditSKU(payload: any, model: any, res: any) {
  const { novoSku } = payload;
  const existingSkus = await sql`SELECT nome, atributos FROM erp_skus LIMIT 100`;

  const { text } = await generateText({
    model,
    prompt: `
      Analise o novo SKU abaixo e verifique se ele é uma duplicata lógica de algum item existente ou se está classificado incorretamente.
      
      NOVO ITEM: ${JSON.stringify(novoSku)}
      
      ITENS EXISTENTES: ${JSON.stringify(existingSkus)}
      
      Responda de forma técnica se há risco de duplicidade e sugira a Categoria e Família corretas.
    `,
  });

  return res.status(200).json({ audit: text });
}

/**
 * SKILL: Consultor de Compras
 */
async function handlePurchaseAdvisor(model: any, res: any) {
  const stockInfo = await sql`
    SELECT s.nome, s.sku_code, i.estoque_atual, i.estoque_reservado, abc.classe_abc
    FROM erp_skus s
    JOIN erp_inventory i ON i.sku_id = s.id
    LEFT JOIN bi_curva_abc_materiais abc ON abc.id = s.id
    WHERE (i.estoque_atual - i.estoque_reservado) < 10
  `;

  const { text } = await generateText({
    model,
    prompt: `
      Com base no estado do estoque abaixo e na importância econômica (Classe ABC), sugira uma ordem de compra priorizada.
      Dê ênfase máxima aos itens Classe A que estão com saldo disponível negativo ou próximo de zero.
      
      DADOS DE ESTOQUE: ${JSON.stringify(stockInfo)}
    `,
  });

  return res.status(200).json({ suggestions: text });
}

/**
 * SKILL: Detecção de Anomalias (Auditoria Industrial)
 */
async function handleAnomalyDetection(model: any, res: any) {
  // Buscar desvios técnicos significativos (> 10%)
  const anomalies = await sql`
    SELECT * FROM bi_desvio_producao 
    WHERE ABS(desvio_percentual) > 10 
    ORDER BY ABS(desvio_percentual) DESC 
    LIMIT 20
  `;

  if (anomalies.length === 0) {
    return res.status(200).json({ suggestions: "Nenhuma anomalia crítica detectada no consumo. A produção segue o planejamento técnico." });
  }

  const { text } = await generateText({
    model,
    prompt: `
      Você é um Auditor Industrial de Marcenaria. Analise os desvios de consumo detectados abaixo e apresente um diagnóstico de riscos.
      Identifique se o problema parece ser desperdício na oficina, erro de medida no projeto ou necessidade de ajuste no motor de cálculo.
      
      DADOS DE ANOMALIA: ${JSON.stringify(anomalies)}
      
      Gere um alerta curto e acionável para cada projeto com problemas graves.
    `,
  });

  return res.status(200).json({ suggestions: text });
}
