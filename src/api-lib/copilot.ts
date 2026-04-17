import { sql, validateAuth, extractAndVerifyToken } from './_db.js';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateText, generateObject, tool } from 'ai';
import { z } from 'zod';
import { gerarProjetoCompleto } from '../utils/industrialCopilot.js';

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
// INTENT ROUTER ARCHITECTURE (ARIA 2.0 - CONSULTIVE COPILOT)
// ===============================

type IntentType = 
  | "SUGGEST_CREATE_SKU"   // Novo: Sugerir em vez de criar direto
  | "CONFIRM_ACTION"       // Novo: Interpretar "sim", "pode fazer"
  | "SEARCH_SKU"
  | "GET_LAST_SKU"
  | "SUGGEST_BOM"          // Novo: Gerar lista de materiais sugerida
  | "ANALYZE_STOCK"        // Novo: Análise de reposição
  | "LIST_BY_FAMILIA"
  | "UNKNOWN";

interface Entities {
  familia?: string;
  descricao?: string;
  unidade?: string;
  skuId?: string;
  projeto?: { tipo: string; medidas: { L: number; A: number; P: number }; gavetas?: number };
}

interface Intent {
  type: IntentType;
  entities: Entities;
}

/**
 * Lógica central de extração bruta do LLM com suporte a Histórico
 */
async function getRawLLMIntent(message: string, history: any[] = []): Promise<string> {
  const context = history.map(h => `${h.role === 'user' ? 'Usuário' : 'Copiloto'}: ${h.content}`).join('\n');
  
  const prompt = `Você é o COPILOTO INDUSTRIAL da D'Luxury, especialista em marcenaria.
  Sua função é interpretar a intenção do usuário no ERP.
  
  CONTEXTO RECENTE:
  ${context}

  MENSAGEM ATUAL: "${message}"

  INTENÇÕES E REGRAS:
  1. SUGGEST_CREATE_SKU: Usuário quer cadastrar algo. Ex: "cadastra mdf 15mm".
  2. CONFIRM_ACTION: Usuário confirma uma sugestão anterior: "sim", "pode", "ok".
  3. SUGGEST_BOM: Usuário descreveu um móvel com medidas ou componentes. Ex: "gaveteiro 600x700", "armário 2 portas".
  4. ANALYZE_STOCK: Pergunta sobre compra ou estoque. Ex: "o que preciso comprar?".
  5. SEARCH_SKU: Busca de itens: "tem parafuso?".

  RETORNE APENAS JSON PURO.
  Exemplo de SUGGEST_BOM: {"type": "SUGGEST_BOM", "entities": {"projeto": {"tipo": "gaveteiro", "medidas": {"L": 600, "A": 700, "P": 450}}}}`;

  const { text } = await generateText({
    model: modelFlash,
    prompt: prompt
  });
  return text;
}

/**
 * Endpoint Handler: Retorna apenas o texto bruto do LLM para o parser robusto.
 */
export async function handleAIParser(req: any, res: any) {
  try {
    const { message } = req.body;
    const text = await getRawLLMIntent(message);
    res.setHeader('Content-Type', 'text/plain');
    return res.status(200).send(text);
  } catch (err: any) {
    return res.status(500).send(`Erro interno no LLM: ${err.message}`);
  }
}

/**
 * Função Sanatizadora para evitar quebra de contrato
 */
function sanitizeIntent(raw: any): Intent {
  if (!raw || typeof raw !== "object") {
    return { type: "UNKNOWN", entities: {} };
  }
  return {
    type: raw.type || "UNKNOWN",
    entities: raw.entities || {}
  };
}

/**
 * Parser Robusto: Extrai JSON de texto sujo usando Regex
 */
async function parseIntent(message: string, history: any[] = []): Promise<Intent> {
  try {
    // Chamada direta para evitar problemas de fetch em ambiente serverless
    const text = await getRawLLMIntent(message, history);
    console.log("RAW LLM RESPONSE:", text);

    const jsonMatch = text.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      console.error("JSON não encontrado na resposta bruta:", text);
      return { type: "UNKNOWN", entities: {} };
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return sanitizeIntent(parsed);

  } catch (error) {
    console.error("Erro fatal no parseIntent:", error);
    return { type: "UNKNOWN", entities: {} };
  }
}

const SKUService = {
  async checkDuplicity(descricao: string) {
    const searchString = `%${descricao.split(' ')[0]}%${descricao.split(' ').slice(-1)}%`;
    const r = await sql`SELECT sku, nome FROM materiais WHERE nome ILIKE ${'%' + descricao + '%'} LIMIT 1`;
    return r.length > 0 ? r[0] : null;
  },
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
      INSERT INTO materiais (
        sku, nome, descricao, unidade_uso, unidade_compra, 
        preco_custo, margem_lucro, preco_venda, categoria_id, ativo,
        subcategoria, fator_conversao, estoque_minimo, estoque_atual,
        cfop, ncm, marca
      ) 
      VALUES (
        ${proximoSku}, ${data.descricao}, ${data.descricao}, ${data.unidade}, ${data.unidade}, 
        0, 50, 0, ${categoryId}, true,
        'Geral', 1, 0, 0,
        '', '', 'D-Luxury'
      )
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

async function handleSuggestCreateSKU(entities: Entities) {
  if (!entities.descricao) return { message: "Qual item você deseja cadastrar?" };
  
  const similar = await SKUService.checkDuplicity(entities.descricao);
  const suggestion = {
    familia: entities.familia || entities.descricao.split(' ')[0] || 'Geral',
    descricao: entities.descricao,
    unidade: entities.unidade || 'UN'
  };

  let message = `### Sugestão de Cadastro\n\n`;
  message += `**Família:** ${suggestion.familia}\n`;
  message += `**Descrição:** ${suggestion.descricao}\n`;
  message += `**Unidade:** ${suggestion.unidade}\n\n`;

  if (similar) {
     message += `⚠️ **Aviso de Duplicidade:**\nEncontrei um item semelhante: \`${similar.sku} - ${similar.nome}\`.\n\nDeseja usar o existente ou criar este novo?`;
  } else {
     message += `Deseja que eu realize o cadastro deste item com estas informações?`;
  }

  return { message };
}

async function handleConfirmAction(history: any[]) {
  // Pega a última mensagem do assistente para saber o que está sendo confirmado
  const lastAiMessage = [...history].reverse().find(m => m.role === 'assistant');
  if (!lastAiMessage) return { message: "O que você deseja confirmar? Não identifiquei uma sugestão pendente." };

  if (lastAiMessage.content.includes("Sugestão de Cadastro")) {
    const lines = lastAiMessage.content.split('\n');
    const descricao = lines.find(l => l.includes("Descrição:"))?.split('** ')[1] || '';
    const familia = lines.find(l => l.includes("Família:"))?.split('** ')[1] || '';
    const unidade = lines.find(l => l.includes("Unidade:"))?.split('** ')[1] || 'UN';

    const sku = await SKUService.create({ descricao, familia, unidade });
    return { message: `✅ Perfeito! Item cadastrado com sucesso.\n\n**SKU:** ${sku.skuId}\n**Descrição:** ${sku.descricao}\n\n[EVENT_EMIT_SKU_CRIADO]` };
  }

  if (lastAiMessage.content.includes("Sugestão de materiais")) {
    return { message: "Entendido! Criando orçamento com base nesta lista de materiais... (Ação simulada para o módulo de Orçamentos)" };
  }

  return { message: "Confirmado! (Ação não mapeada especificamente)" };
}

async function handleSuggestBOM(entities: Entities, originalMessage: string) {
  const analise = gerarProjetoCompleto(originalMessage);
  const { projeto, pecas, planoDeCorte, custo, venda } = analise;

  let report = `### 📋 Engenharia de Projeto: ${projeto.tipo}\n`;
  report += `**Configuração:** ${projeto.largura} x ${projeto.altura} x ${projeto.profundidade} mm (MDF ${projeto.espessura}mm)\n`;
  report += `\n---\n\n`;

  report += `#### 🪚 Plano de Corte (Nesting)\n`;
  planoDeCorte.forEach(chapa => {
    report += `- **Chapa #${chapa.chapaId}** (2750x1850): **${chapa.aproveitamento}%** de aproveitamento\n`;
  });
  report += `\n---\n\n`;

  report += `#### 📏 Lista de Peças (CAD)\n`;
  report += `| Peça | Dimensões (mm) | Material | \n`;
  report += `| :--- | :--- | :--- | \n`;
  
  pecas.forEach(p => {
    report += `| ${p.nome} | ${p.largura} x ${p.altura} | ${p.material} ${p.espessura}mm |\n`;
  });

  report += `\n---\n\n`;
  report += `#### 💰 Orçamento Industrial\n`;
  report += `- **Custo Real (Materiais + Ferragens):** R$ ${custo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n`;
  report += `- **Preço de Venda Sugerido:** R$ ${venda.preco.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n`;
  report += `- **Margem Operacional:** ${venda.margem}%\n\n`;

  report += `> **Ação Recomendada:** Deseja que eu gere os documentos de produção e o orçamento formal para este projeto?`;
  
  return { message: report };
}

async function handleAnalyzeStock() {
  const criticos = await sql`SELECT sku, nome, estoque_atual, estoque_minimo FROM materiais WHERE estoque_atual <= estoque_minimo AND ativo = true LIMIT 5`;
  
  if (criticos.length === 0) return { message: "✅ Estoque saudável! Nenhum item crítico identificado no momento." };

  let report = `### Sugestão de Reposição\n\nIdentifiquei itens em nível crítico:\n\n`;
  criticos.forEach((c: any) => {
    report += `- **${c.sku}**: ${c.nome} (Estoque: ${c.estoque_atual} | Mín: ${c.estoque_minimo})\n`;
  });
  
  report += `\nRecomendo gerar pedido de compra para estes itens hoje.`;
  return { message: report };
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

async function processUserMessage(message: string, history: any[] = []) {
  try {
    let intent = await parseIntent(message, history);
    
    const cleanDesc = (text: string) => {
      return text
        .replace(/^(cadastra|cadastrar|crie|cria|adiciona|adicionar|incluir|inclua|por favor|para mim|agora)[:\s]*/i, '')
        .trim();
    };

    const msgLow = message.toLowerCase();

    // FALLBACK ROBUSTO: Se o NLU vacilar, as keywords de marcenaria assumem
    if (intent.type === "UNKNOWN" || intent.type === "SEARCH_SKU") {
      if (msgLow.match(/\d+\s*x\s*\d+/) || msgLow.includes("gaveteiro") || msgLow.includes("armário") || msgLow.includes("balcão")) {
        intent.type = "SUGGEST_BOM";
      } else if (msgLow.includes("parafuso") || msgLow.includes("prego") || msgLow.includes("bucha") || msgLow.includes("fix-")) {
        if (msgLow.includes("cadastra") || msgLow.includes("cria")) {
          intent = { type: "SUGGEST_CREATE_SKU", entities: { familia: "Parafuso", descricao: cleanDesc(message), unidade: "CENTO" } };
        } else {
          intent.type = "SEARCH_SKU";
        }
      } else if (msgLow.includes("comprar") || msgLow.includes("estoque") || msgLow.includes("crítico")) {
        intent.type = "ANALYZE_STOCK";
      }
    }

    if (intent.entities?.descricao) intent.entities.descricao = cleanDesc(intent.entities.descricao);

    switch (intent.type) {
      case "SUGGEST_CREATE_SKU": return await handleSuggestCreateSKU(intent.entities);
      case "CONFIRM_ACTION": return await handleConfirmAction(history);
      case "SUGGEST_BOM": return await handleSuggestBOM(intent.entities, message);
      case "ANALYZE_STOCK": return await handleAnalyzeStock();
      case "GET_LAST_SKU": return await handleGetLast();
      case "SEARCH_SKU": return await handleSearch(intent.entities);
      case "LIST_BY_FAMILIA": return await handleListByFamilia(intent.entities);
      default: return { message: "Sou seu Copiloto Industrial. Posso sugerir cadastros, calcular materiais (BOM) ou analisar seu estoque. Como posso acelerar seu trabalho agora?" };
    }
  } catch (error) {
    console.error("Erro crítico no agente NLU:", error);
    return { message: "Erro de processamento central da inteligência." };
  }
}

async function generateChatResponse(payload: any) {
  const response = await processUserMessage(payload.message, payload.history || []);
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
