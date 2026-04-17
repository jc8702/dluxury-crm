import { sql, validateAuth, extractAndVerifyToken } from './_db.js';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateText, generateObject, tool } from 'ai';
import { z } from 'zod';

const aiApiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GOOGLE_GENERATION_AI_API_KEY;
const google = createGoogleGenerativeAI({ 
  apiKey: aiApiKey,
});

// Cadeia de modelos Super Atualizada para Fallback
const modelFlash = google('gemini-1.5-flash');
const modelPro = google('gemini-1.5-pro');
const modelLegacy = google('gemini-1.5-flash');

async function listAvailableModels(key: string) {
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
    const data = await res.json();
    if (data.models) return data.models.map((m: any) => m.name.replace('models/', '')).join(', ');
    return 'Nenhum (Chave inválida ou sem permissão)';
  } catch (e) {
    return 'Erro ao consultar Google AI';
  }
}

async function generateBOM(payload: any) {
  const materiais = await sql`SELECT id, nome, categoria_id, preco_custo, unidade_uso FROM materiais WHERE ativo = true`;
  try {
    const { object } = await generateObject({
      model: modelPro,
      schema: z.object({
        itens: z.array(z.object({
          material_id: z.string().uuid().optional(),
          descricao: z.string(),
          quantidade: z.number(),
          dimensoes: z.string().optional(),
          justificativa: z.string()
        })),
        estimativa_custo_total: z.number(),
        dificuldade_producao: z.enum(['baixa', 'media', 'alta'])
      }),
      prompt: `Gere uma lista de materiais (BOM) para: ${payload.tipo} (Dimensões: L:${payload.medidas.L}, A:${payload.medidas.A}, P:${payload.medidas.P}). Materiais: ${JSON.stringify(materiais)}`
    });
    return object;
  } catch (error) {
    console.warn("Fallback on generateBOM due to error.");
    return { itens: [], estimativa_custo_total: 0, dificuldade_producao: 'media' };
  }
}

async function auditSKU(payload: any) {
  const existentes = await sql`SELECT nome, descricao, categoria_id FROM materiais WHERE ativo = true`;
  try {
    const { object } = await generateObject({
      model: modelPro,
      schema: z.object({
        is_duplicado: z.boolean(),
        similaridade_pct: z.number(),
        item_conflitante: z.string().optional(),
        categoria_sugerida: z.string(),
        recomendacao: z.string()
      }),
      prompt: `Verifique se o SKU "${payload.nome}" (${payload.descricao}) é duplicado. Itens: ${JSON.stringify(existentes)}`
    });
    return object;
  } catch (err) {
    return { is_duplicado: false, similaridade_pct: 0, categoria_sugerida: 'Geral', recomendacao: 'Falha na validação IA.' };
  }
}

async function purchaseSuggestion() {
  const estoque = await sql`
    SELECT m.nome, m.estoque_atual, m.estoque_minimo, m.unidade_compra,
           (SELECT COUNT(*) FROM movimentacoes_estoque WHERE material_id = m.id AND tipo = 'saida' AND criado_em > NOW() - INTERVAL '30 days') as consumo_30d
    FROM materiais m WHERE m.ativo = true AND m.estoque_atual <= m.estoque_minimo * 1.5
  `;
  try {
    const { object } = await generateObject({
      model: modelPro,
      schema: z.object({
        pedidos_sugeridos: z.array(z.object({
          material: z.string(),
          quantidade_sugerida: z.number(),
          prioridade: z.enum(['critica', 'alta', 'media']),
          motivo: z.string()
        }))
      }),
      prompt: `Analise o estoque e sugira compras: ${JSON.stringify(estoque)}`
    });
    return object;
  } catch(e) { return { pedidos_sugeridos: [] }; }
}

async function detectAnomalies() {
  const dados = await sql`
    SELECT m.nome, m.preco_custo, 
           (SELECT AVG(quantidade) FROM movimentacoes_estoque WHERE material_id = m.id AND tipo = 'saida') as media_saida
    FROM materiais m WHERE m.ativo = true
  `;
  try {
    const { object } = await generateObject({
      model: modelPro,
      schema: z.object({
        anomalias: z.array(z.object({ item: z.string(), tipo_anomalia: z.string(), gravidade: z.enum(['baixa', 'media', 'critica']), detalhes: z.string() }))
      }),
      prompt: `Identifique anomalias nos dados: ${JSON.stringify(dados)}`
    });
    return object;
  } catch(e) { return { anomalias: [] }; }
}

// ===============================
// INTENT ROUTER ARCHITECTURE (ARIA 2.0)
// ===============================

type IntentType = "CREATE_SKU" | "UPDATE_SKU" | "DELETE_SKU" | "GET_LAST_SKU" | "SEARCH_SKU" | "LIST_BY_FAMILIA" | "UNKNOWN";

interface Entities {
  familia?: string;
  descricao?: string;
  unidade?: string;
  skuId?: string;
}

interface Intent {
  type: IntentType;
  entities: Entities;
}

async function parseIntent(message: string): Promise<Intent> {
  const { object } = await generateObject({
    model: modelPro,
    schema: z.object({
      type: z.enum(["CREATE_SKU", "UPDATE_SKU", "DELETE_SKU", "GET_LAST_SKU", "SEARCH_SKU", "LIST_BY_FAMILIA", "UNKNOWN"]),
      entities: z.object({
        familia: z.string().optional(),
        descricao: z.string().optional(),
        unidade: z.string().optional(),
        skuId: z.string().optional()
      })
    }),
    prompt: `Extraia a intenção da mensagem: "${message}". Identifique se é CREATE_SKU, GET_LAST_SKU, SEARCH_SKU ou LIST_BY_FAMILIA. Se for cadastro, extraia a familiaridade (ex: Parafuso), a descricao exata, e unidade.`
  });
  return object as Intent;
}

const SKUService = {
  async create(data: Entities) {
    let categoryId = 'OUT';
    const famLow = (data.familia || '').toLowerCase();
    if (famLow.includes('chapa') || famLow.includes('mdf') || famLow.includes('mdp')) categoryId = 'CHP';
    else if (famLow.includes('fita') || famLow.includes('borda') || famLow.includes('pvc')) categoryId = 'BRD';
    else if (famLow.includes('dobradiça') || famLow.includes('ferragem') || famLow.includes('puxador')) categoryId = 'FRG';
    else if (famLow.includes('parafuso') || famLow.includes('bucha') || famLow.includes('fix')) categoryId = 'FIX';
    else categoryId = (data.familia || 'GEN').substring(0, 3).toUpperCase();

    const lastSkuQuery = await sql`SELECT sku FROM materiais WHERE categoria_id = ${categoryId} ORDER BY sku DESC LIMIT 1`;
    let proximoSku = `${categoryId}-0001`;
    if (lastSkuQuery.length > 0 && lastSkuQuery[0].sku) {
       const match = lastSkuQuery[0].sku.match(/\d+/);
       if (match) { proximoSku = `${categoryId}-${(parseInt(match[0], 10) + 1).toString().padStart(4, '0')}`; }
    }
    
    await sql`
      INSERT INTO materiais (sku, nome, descricao, unidade_uso, unidade_compra, preco_custo, margem_lucro, preco_venda, categoria_id, ativo) 
      VALUES (${proximoSku}, ${data.descricao}, ${data.descricao}, ${data.unidade}, ${data.unidade}, 0, 50, 0, ${categoryId}, true)
    `;
    return { skuId: proximoSku, descricao: data.descricao, unidade: data.unidade };
  },
  async getLast() {
    const r = await sql`SELECT sku as "skuId", nome as descricao FROM materiais ORDER BY id DESC LIMIT 1`;
    return r.length > 0 ? r[0] : null;
  },
  async search(filtro: Entities) {
    const searchString = '%' + (filtro.descricao || filtro.familia || '') + '%';
    const r = await sql`SELECT sku as "skuId", nome as descricao FROM materiais WHERE nome ILIKE ${searchString} LIMIT 5`;
    return r;
  },
  async listByFamilia(familia: string) {
    const famStr = familia.substring(0, 3).toUpperCase();
    const r = await sql`SELECT sku as "skuId", nome as descricao FROM materiais WHERE categoria_id = ${famStr} LIMIT 5`;
    return r;
  }
};

async function handleCreateSKU(entities: Entities) {
  if (!entities.descricao) return { message: "Qual a especificação do item? (ex: 6x30, branco, 18mm)" };
  if (!entities.familia) entities.familia = entities.descricao.split(' ')[0] || 'Genérico';
  if (!entities.unidade) entities.unidade = 'UN';

  const sku = await SKUService.create(entities);
  return {
    message: `✅ Item cadastrado com sucesso\n\nSKU: ${sku.skuId}\nDescrição: ${sku.descricao}\nUnidade: ${sku.unidade}\n\n[EVENT_EMIT_SKU_CRIADO]`
  };
}

async function handleGetLast() {
  const sku = await SKUService.getLast();
  if (!sku) return { message: "Nenhum item encontrado no banco de dados." };
  return { message: `Último item cadastrado:\n\nSKU: ${sku.skuId}\nDescrição: ${sku.descricao}` };
}

async function handleSearch(entities: Entities) {
  const r = await SKUService.search(entities);
  if (!r || !r.length) return { message: "Nenhum item encontrado." };
  return { message: r.map((s: any) => `${s.skuId} - ${s.descricao}`).join("\n") };
}

async function handleListByFamilia(entities: Entities) {
  if (!entities.familia) return { message: "Qual família deseja listar?" };
  const r = await SKUService.listByFamilia(entities.familia);
  if (!r || !r.length) return { message: "Nenhum item encontrado." };
  return { message: r.map((s: any) => `${s.skuId} - ${s.descricao}`).join("\n") };
}

async function processUserMessage(message: string) {
  try {
    const intent = await parseIntent(message);
    const entities = intent.entities || {};
    if (entities.unidade) entities.unidade = entities.unidade.toUpperCase().trim();
    
    switch (intent.type) {
      case "CREATE_SKU": return await handleCreateSKU(entities);
      case "GET_LAST_SKU": return await handleGetLast();
      case "SEARCH_SKU": return await handleSearch(entities);
      case "LIST_BY_FAMILIA": return await handleListByFamilia(entities);
      default: return { message: "Não entendi a solicitação. Pode reformular a instrução operacional?" };
    }
  } catch (error) {
    console.error("Erro no agente NLU:", error);
    return { message: "Erro de processamento interno NLU." };
  }
}

async function generateChatResponse(payload: any) {
  const response = await processUserMessage(payload.message);
  return { content: response.message };
}


export async function handleAICopilot(req: any, res: any) {
  try {
    const { authorized, error } = validateAuth(req);
    if (!authorized) return res.status(401).json({ success: false, error });
    if (req.method !== 'POST') return res.status(405).end();
    
    const { skill, payload } = req.body;
    let result;
    switch (skill) {
      case 'chat': 
        result = await generateChatResponse(payload);
        return res.status(200).json({ success: true, data: result });
      case 'generate-bom': 
        result = await generateBOM(payload);
        return res.status(200).json({ success: true, data: result });
      case 'audit-sku': 
        result = await auditSKU(payload);
        return res.status(200).json({ success: true, data: result });
      case 'purchase-suggestion': 
        result = await purchaseSuggestion();
        return res.status(200).json({ success: true, data: result });
      case 'detect-anomalies': 
        result = await detectAnomalies();
        return res.status(200).json({ success: true, data: result });
      default: 
        return res.status(400).json({ success: false, error: 'Skill de IA não reconhecida' });
    }
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
}
