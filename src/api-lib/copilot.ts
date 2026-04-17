import { sql, validateAuth, extractAndVerifyToken } from './_db.js';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateText, generateObject, tool } from 'ai';
import { z } from 'zod';

const aiApiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GOOGLE_GENERATION_AI_API_KEY;
const google = createGoogleGenerativeAI({ 
  apiKey: aiApiKey,
});

// Cadeia de modelos Super Atualizada para Fallback
const modelFlash = google('gemini-2.5-flash');
const modelPro = google('gemini-2.5-pro');
const modelLegacy = google('gemini-flash-latest');

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

const chatTools = {
  cadastrarProjeto: tool({
    description: 'Use esta função obrigatoriamente para CADASTRAR UM PROJETO no CRM.',
    parameters: z.object({
      client_name: z.string(),
      ambiente: z.string(),
      descricao: z.string()
    }),
    execute: async (args) => {
      try {
        const r = await sql`INSERT INTO projects (client_name, ambiente, descricao, status, valor_estimado, valor_final) VALUES (${args.client_name}, ${args.ambiente}, ${args.descricao}, 'lead', 0, 0) RETURNING id`;
        return { success: true, project_id: r[0].id, message: `Projeto estruturado e salvo com ID ${r[0].id}` };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }
  }),
  cadastrarMaterial: tool({
    description: 'Use esta função obrigatoriamente para CADASTRAR UM MATERIAL. Extraia o máximo de informações do texto do usuário.',
    parameters: z.object({
      nome: z.string().describe('Título curto e claro do material. Ex: MDF Branco Polar. NUNCA DEIXE VAZIO.'),
      descricao: z.string().describe('Ficha técnica completa (medidas, cor, fabricante, acabamento). NUNCA DEIXE VAZIO. Se não souber, use o texto bruto do usuário.'),
      unidade_uso: z.string().describe('Unidade de medida. Se não souber, use UN.'),
      preco_custo: z.number().describe('Preço de custo. Use 0 se não for informado.')
    }),
    execute: async (args) => {
      try {
        if (!args.nome || !args.descricao) {
           return { success: false, message: 'FALHA DE IA: Você não enviou o parâmetro nome ou descricao.' };
        }
        const lastSkuQuery = await sql`SELECT sku FROM materiais ORDER BY id DESC LIMIT 1`;
        let proximoSku = 'SKU-0001';
        if (lastSkuQuery.length > 0 && lastSkuQuery[0].sku) {
           const match = lastSkuQuery[0].sku.match(/\d+/);
           if (match) { proximoSku = `SKU-${(parseInt(match[0], 10) + 1).toString().padStart(4, '0')}`; }
        }
        const categorias = await sql`SELECT id FROM categorias_material LIMIT 1`;
        const catId = categorias.length > 0 ? categorias[0].id : null;
        const unidade = args.unidade_uso || 'UN';
        const preco = args.preco_custo || 0;
        const r = await sql`INSERT INTO materiais (sku, nome, descricao, unidade_uso, unidade_compra, preco_custo, margem_lucro, preco_venda, categoria_id, ativo, estoque_atual, estoque_minimo) VALUES (${proximoSku}, ${args.nome}, ${args.descricao}, ${unidade}, ${unidade}, ${preco}, 50, ${preco * 1.5}, ${catId}, true, 0, 0) RETURNING id`;
        return { success: true, sku_gerado: proximoSku, material_id: r[0].id, message: `Material ${args.nome} inserido no estoque com SKU: ${proximoSku}` };
      } catch (err: any) {
        return { success: false, message: `Erro fatal no Banco de Dados (Material): ${err.message}` };
      }
    }
  })
};

async function generateChatResponse(payload: any) {
  const systemPrompt = `Você é o D'Luxury Copilot, o cérebro operacional do CRM industrial...`;
  const messagesArray = (payload.history || []).map((m: any) => ({
    role: m.type === 'ai' ? 'assistant' : 'user',
    content: m.content
  }));
  messagesArray.push({ role: 'user', content: payload.message });
  
  const aiConfig: any = { tools: chatTools, maxSteps: 5, system: systemPrompt, messages: messagesArray };

  const extrairConteudo = (res: any) => {
    let final = res.text || '';
    const parseResult = (tr: any) => {
      const data = tr.result || tr.output;
      if (data && data.message) return `✔️ ${data.message}`;
      if (data && data.error) return `❌ ERRO: ${data.error}`;
      return '';
    };
    if (res.steps && res.steps.length > 0) {
       for (const step of res.steps) {
         if (step.text && !final.includes(step.text)) final += step.text + '\n';
         if (step.toolResults && step.toolResults.length > 0) {
            const logs = step.toolResults.map(parseResult).filter(Boolean).join('\n');
            if (logs) final += '\n' + logs;
         }
       }
    }
    return final.trim() || 'Processado com sucesso.';
  };

  try {
    const resFlash = await generateText({ model: modelFlash, ...aiConfig });
    return { content: extrairConteudo(resFlash) };
  } catch (errorFlash: any) {
    try {
      const resPro = await generateText({ model: modelPro, ...aiConfig });
      return { content: extrairConteudo(resPro) };
    } catch (errorPro: any) {
      const resLegacy = await generateText({ model: modelLegacy, system: systemPrompt, messages: messagesArray });
      return { content: extrairConteudo(resLegacy) };
    }
  }
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
