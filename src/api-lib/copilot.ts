import { sql } from './_db.js';
import { withTenant, type TenantHandler } from './middleware/tenantMiddleware.js';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateText, generateObject } from 'ai';
import { z } from 'zod';
import { gerarProjetoCompleto, gerarOrdemProducao } from '../utils/industrialCopilot.js';

const aiApiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GOOGLE_GENERATION_AI_API_KEY;
const google = createGoogleGenerativeAI({ 
  apiKey: aiApiKey,
});

const modelFlash = google('gemini-2.0-flash');
const modelPro = google('gemini-2.0-flash');

async function generateBOM(payload: any, tenantId: string) {
  const materiais = await sql`SELECT id, nome, categoria_id, preco_custo, unidade_uso FROM materiais WHERE ativo = true AND tenant_id = ${tenantId}::uuid`;
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
  } catch {
    console.warn("Fallback on generateBOM due to error.");
    return { itens: [], estimativa_custo_total: 0, dificuldade_producao: 'media' };
  }
}

async function auditSKU(payload: any, tenantId: string) {
  const existentes = await sql`SELECT nome, descricao, categoria_id FROM materiais WHERE ativo = true AND tenant_id = ${tenantId}::uuid`;
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
  } catch {
    return { is_duplicado: false, similaridade_pct: 0, categoria_sugerida: 'GERAL', recomendacao: 'FALHA NA VALIDAÇÃO IA.' };
  }
}

async function purchaseSuggestion(tenantId: string) {
  const estoque = await sql`
    SELECT m.nome, m.estoque_atual, m.estoque_minimo, m.unidade_compra,
           (SELECT COUNT(*) FROM movimentacoes_estoque WHERE material_id = m.id AND tipo = 'saida' AND created_at > NOW() - INTERVAL '30 days') as consumo_30d
    FROM materiais m WHERE m.ativo = true AND m.estoque_atual <= m.estoque_minimo * 1.5 AND m.tenant_id = ${tenantId}::uuid
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
  } catch { return { pedidos_sugeridos: [] }; }
}

async function detectAnomalies(tenantId: string) {
  const dados = await sql`
    SELECT m.nome, m.preco_custo, 
           (SELECT AVG(quantidade) FROM movimentacoes_estoque WHERE material_id = m.id AND tipo = 'saida') as media_saida
    FROM materiais m WHERE m.ativo = true AND m.tenant_id = ${tenantId}::uuid
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
  } catch { return { anomalias: [] }; }
}

async function analyzeProposal(payload: any) {
  const cliente = payload.cliente || '';
  const itens = payload.itens || [];
  try {
    const { object } = await generateObject({
      model: modelPro,
      schema: z.object({
        viability_score: z.number().min(0).max(100),
        pontos_fortes: z.array(z.string()),
        pontos_fracos: z.array(z.string()),
        risco_factor: z.enum(['baixo', 'medio', 'alto']),
        sugestao_preco: z.number(),
        observacoes: z.string()
      }),
      prompt: `Analise esta proposta comercial:\n\nCliente: ${cliente}\nItens: ${JSON.stringify(itens)}\n\nConsidere: margens, complexidade, prazo e histórico do cliente.`
    });
    return object;
  } catch { return { viability_score: 50, pontos_fortes: [], pontos_fracos: [], risco_factor: 'medio', sugestao_preco: 0, observacoes: 'Erro na análise' }; }
}

async function translateDescription(payload: any) {
  const { text, targetLang } = payload;
  try {
    const { text: translated } = await generateText({
      model: modelFlash,
      prompt: `Traduza para ${targetLang || 'inglês'}: ${text}`
    });
    return { original: text, translated, lang: targetLang };
  } catch { return { original: text, translated: text, lang: targetLang }; }
}

async function generateProposalPDF(payload: any) {
  const { cliente, itens, total, validade } = payload;
  try {
    const { text } = await generateText({
      model: modelPro,
      prompt: `Gere um orçamento profissional em formato markdown para:\n\nCliente: ${cliente}\nItens: ${JSON.stringify(itens)}\nTotal: R$ ${total}\nValidade: ${validade}\n\nInclua: cabeçalho, descrição dos serviços, valores, condições.`
    });
    return { markdown: text, generated_at: new Date().toISOString() };
  } catch { return { markdown: 'Erro ao gerar PDF', generated_at: new Date().toISOString() }; }
}

async function forecastDemand(_payload: any, tenantId: string) {
  const historico = await sql`
    SELECT DATE_TRUNC('month', created_at) as mes, SUM(valor_total) as receita
    FROM titulos_receber 
    WHERE created_at > NOW() - INTERVAL '12 months' AND status = 'recebido' AND tenant_id = ${tenantId}::uuid
    GROUP BY DATE_TRUNC('month', created_at)
    ORDER BY mes
  `;
  try {
    const { object } = await generateObject({
      model: modelPro,
      schema: z.object({
        previsao_proximo_mes: z.number(),
        tendencia: z.enum(['crescente', 'estavel', 'decrescente']),
        sazonalidade: z.array(z.object({ mes: z.string(), fator: z.number() })),
        recomendacoes: z.array(z.string())
      }),
      prompt: `Analise o histórico de vendas e faça previsão de demanda:\n\nHistórico: ${JSON.stringify(historico)}\n\nUse análise de série temporal simples.`
    });
    return object;
  } catch { return { previsao_proximo_mes: 0, tendencia: 'estavel', sazonalidade: [], recomendacoes: [] }; }
}

type IntentType = 
  | "SUGGEST_CREATE_SKU"
  | "CONFIRM_ACTION"
  | "SEARCH_SKU"
  | "GET_LAST_SKU"
  | "SUGGEST_BOM"
  | "ANALYZE_STOCK"
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

async function getRawLLMIntent(message: string, history: any[] = []): Promise<string> {
  const context = history.map(h => `${h.role === 'user' ? 'USUÁRIO' : 'COPILOTO'}: ${h.content}`).join('\n');
  
  const prompt = `Você é o COPILOTO INDUSTRIAL da D'Luxury, especialista em marcenaria.
  Sua função é interpretar a intenção do usuário no ERP.
  
  CONTEXTO RECENTE:
  ${context}

  MENSAGEM ATUAL: "${message}"

  INTENÇÕES E REGRAS:
  1. SUGGEST_CREATE_SKU: Usuário quer cadastrar algo. Ex: "cadastra mdf 15mm".
  2. CONFIRM_ACTION: Usuário confirma uma sugestão anterior: "sim", "pode", "ok", "gerar ordem de produção", "gerar op", "confirmar projeto", "fazer orçamento".
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

function sanitizeIntent(raw: any): Intent {
  if (!raw || typeof raw !== "object") {
    return { type: "UNKNOWN", entities: {} };
  }
  return {
    type: raw.type || "UNKNOWN",
    entities: raw.entities || {}
  };
}

async function parseIntent(message: string, history: any[] = []): Promise<Intent> {
  try {
    const text = await getRawLLMIntent(message, history);
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
  async checkDuplicity(descricao: string, tenantId: string) {
    const r = await sql`SELECT sku, nome FROM materiais WHERE nome ILIKE ${'%' + descricao + '%'} AND tenant_id = ${tenantId}::uuid LIMIT 1`;
    return r.length > 0 ? r[0] : null;
  },
  async create(data: Entities, tenantId: string) {
    let categoryId = 'OUT';
    const famLow = (data.familia || '').toLowerCase();
    if (famLow.includes('chapa') || famLow.includes('mdf') || famLow.includes('mdp')) categoryId = 'CHP';
    else if (famLow.includes('fita') || famLow.includes('borda') || famLow.includes('pvc')) categoryId = 'BRD';
    else if (famLow.includes('dobradiça') || famLow.includes('ferragem') || famLow.includes('puxador')) categoryId = 'FRG';
    else if (famLow.includes('parafuso') || famLow.includes('bucha') || famLow.includes('fix')) categoryId = 'FIX';
    else categoryId = (data.familia || 'GEN').substring(0, 3).toUpperCase();

    const lastSkuQuery = await sql`SELECT sku FROM materiais WHERE categoria_id = ${categoryId} AND tenant_id = ${tenantId}::uuid ORDER BY sku DESC LIMIT 1`;
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
        cfop, ncm, marca, tenant_id
      ) 
      VALUES (
        ${proximoSku}, ${data.descricao}, ${data.descricao}, ${data.unidade}, ${data.unidade}, 
        0, 50, 0, ${categoryId}, true,
        'GERAL', 1, 0, 0,
        '', '', 'D-Luxury', ${tenantId}::uuid
      )
    `;
    return { skuId: proximoSku, descricao: data.descricao, unidade: data.unidade };
  },
  async getLast(tenantId: string) {
    const r = await sql`SELECT sku as "skuId", nome as descricao FROM materiais WHERE tenant_id = ${tenantId}::uuid ORDER BY id DESC LIMIT 1`;
    return r.length > 0 ? r[0] : null;
  },
  async search(filtro: Entities, tenantId: string) {
    const searchString = '%' + (filtro.descricao || filtro.familia || '') + '%';
    const r = await sql`SELECT sku as "skuId", nome as descricao FROM materiais WHERE nome ILIKE ${searchString} AND tenant_id = ${tenantId}::uuid LIMIT 5`;
    return r;
  },
  async listByFamilia(familia: string, tenantId: string) {
    const famStr = familia.substring(0, 3).toUpperCase();
    const r = await sql`SELECT sku as "skuId", nome as descricao FROM materiais WHERE categoria_id = ${famStr} AND tenant_id = ${tenantId}::uuid LIMIT 5`;
    return r;
  }
};

async function handleSuggestCreateSKU(entities: Entities, tenantId: string) {
  if (!entities.descricao) return { message: "Qual item você deseja cadastrar?" };
  
  const similar = await SKUService.checkDuplicity(entities.descricao, tenantId);
  const suggestion = {
    familia: entities.familia || entities.descricao.split(' ')[0] || 'GERAL',
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

async function handleConfirmAction(history: any[], tenantId: string) {
  const lastAiMessage = [...history].reverse().find(m => m.role === 'assistant');
  if (!lastAiMessage) return { message: "O que você deseja confirmar? Não identifiquei uma sugestão pendente." };

  const content = lastAiMessage.content;
  const isBOM = content.includes("Engenharia") || content.includes("📐") || content.includes("Projeto") || content.includes("BOM");
  const isSKU = content.includes("Sugestão de Cadastro") || content.includes("material");

  if (isSKU) {
    const lines: string[] = String(lastAiMessage.content).split('\n');
    const descricao = lines.find((l: string) => l.includes("Descrição:"))?.split('** ')[1] || '';
    const familia = lines.find((l: string) => l.includes("Família:"))?.split('** ')[1] || '';
    const unidade = lines.find((l: string) => l.includes("Unidade:"))?.split('** ')[1] || 'UN';

    const sku = await SKUService.create({ descricao, familia, unidade }, tenantId);
    return { message: `✅ Perfeito! Item cadastrado com sucesso.\n\n**SKU:** ${sku.skuId}\n**Descrição:** ${sku.descricao}\n\n[EVENT_EMIT_SKU_CRIADO]` };
  }

  if (isBOM) {
    const userProjectMsg = [...history].reverse().find((m, i, arr) => m.role === 'user' && i > arr.indexOf(lastAiMessage));
    const msg = userProjectMsg?.content || "";
    
    const op = await gerarOrdemProducao(msg);

    await sql`
      INSERT INTO ordens_producao (op_id, produto, pecas, metadata, tenant_id)
      VALUES (${op.opId}, ${op.produto}, ${op.pecas.length}, ${JSON.stringify(op)}, ${tenantId}::uuid)
    `;

    let opReport = `✅ **Ordem de Produção Gerada: ${op.opId}**\n\n`;
    opReport += `**Produto:** ${op.produto}\n`;
    opReport += `**Status:** 🏭 PENDENTE (AGUARDANDO CORTE)\n\n`;
    
    opReport += `#### 📋 Resumo de Materiais Consolidados:\n`;
    const materiaisUnicos = [...new Set(op.pecas.map((p: any) => p.material))];
    materiaisUnicos.forEach(mat => {
       const qtd = op.pecas.filter((p: any) => p.material === mat).length;
       opReport += `- ${mat}: **${qtd} peças**\n`;
    });

    opReport += `\n**Ação:** Os dados foram enviados para o mapa de corte e separação de materiais.`;
    
    return { message: opReport };
  }

  return { message: "Confirmado! (Ação não mapeada especificamente)" };
}

async function handleSuggestBOM(entities: Entities, originalMessage: string) {
  const analise = await gerarProjetoCompleto(originalMessage);
  const { projeto, pecas, planoDeCorte, custo, venda, analise_financeira } = analise;

  let report = `### 📋 Engenharia de Projeto: ${projeto.tipo}\n`;
  report += `**Configuração:** ${projeto.largura} x ${projeto.altura} x ${projeto.profundidade} mm (MDF ${projeto.espessura}mm)\n`;
  report += `\n---\n\n`;

  report += `#### 🪚 Plano de Corte (Nesting Real)\n`;
  planoDeCorte.forEach((chapa: any) => {
    report += `- **Chapa #${chapa.chapaId}** (2750x1840): **${chapa.aproveitamento}%** de aproveitamento real\n`;
  });
  report += `\n---\n\n`;

  report += `#### 📏 Lista de Peças (CAD)\n`;
  report += `| Peça | Dimensões (mm) | Material | \n`;
  report += `| :--- | :--- | :--- | \n`;
  
  pecas.forEach((p: any) => {
    report += `| ${p.nome} | ${p.largura} x ${p.altura} | ${p.material} ${p.espessura}mm |\n`;
  });

  report += `\n---\n\n`;
  report += `#### 💰 Orçamento Industrial (Base Neon DB)\n`;
  if (analise_financeira) {
    report += `- **Custo Material (c/ Desperdício):** R$ ${analise_financeira.material.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n`;
    report += `- **Mão de Obra (MOD):** R$ ${analise_financeira.mod.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n`;
    report += `- **Custo Total Real:** R$ ${analise_financeira.total_custo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n\n`;
    report += `- **Preço de Venda Sugerido (Markup 2.8):** **R$ ${analise_financeira.preco_sugerido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}**\n`;
    report += `- **Margem Operacional:** ${analise_financeira.margem_contribuicao}%\n\n`;
  } else {
    report += `- **Custo Real:** R$ ${custo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n`;
    report += `- **Preço de Venda Sugerido:** R$ ${venda.preco.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n`;
  }

  if (analise.avisos.length > 0) {
    report += `\n⚠️ **Avisos de Engenharia:**\n`;
    analise.avisos.forEach(av => report += `- ${av}\n`);
  }

  report += `\n> **Ação Recomendada:** Deseja que eu gere os documentos de produção e o orçamento formal para este projeto?`;
  
  return { message: report };
}

async function handleAnalyzeStock(tenantId: string) {
  const criticos = await sql`SELECT sku, nome, estoque_atual, estoque_minimo FROM materiais WHERE estoque_atual <= estoque_minimo AND ativo = true AND tenant_id = ${tenantId}::uuid LIMIT 5`;
  
  if (criticos.length === 0) return { message: "✅ Estoque saudável! Nenhum item crítico identificado no momento." };

  let report = `### Sugestão de Reposição\n\nIdentifiquei itens em nível crítico:\n\n`;
  criticos.forEach((c: any) => {
    report += `- **${c.sku}**: ${c.nome} (Estoque: ${c.estoque_atual} | Mín: ${c.estoque_minimo})\n`;
  });
  
  report += `\nRecomendo gerar pedido de compra para estes itens hoje.`;
  return { message: report };
}

async function handleGetLast(tenantId: string) {
  const sku = await SKUService.getLast(tenantId);
  if (!sku) return { message: "Nenhum item encontrado no banco de dados." };
  return { message: `Último item cadastrado:\n\nSKU: ${sku.skuId}\nDescrição: ${sku.descricao}` };
}

async function handleSearch(entities: Entities, tenantId: string) {
  const r = await SKUService.search(entities, tenantId);
  if (!r || !r.length) return { message: "Nenhum item encontrado." };
  return { message: r.map((s: any) => `${s.skuId} - ${s.descricao}`).join("\n") };
}

async function handleListByFamilia(entities: Entities, tenantId: string) {
  if (!entities.familia) return { message: "Qual família deseja listar?" };
  const r = await SKUService.listByFamilia(entities.familia, tenantId);
  if (!r || !r.length) return { message: "Nenhum item encontrado." };
  return { message: r.map((s: any) => `${s.skuId} - ${s.descricao}`).join("\n") };
}

async function processUserMessage(message: string, history: any[] = [], tenantId: string) {
  try {
    const intent = await parseIntent(message, history);

    switch (intent.type) {
      case "SUGGEST_BOM":
        return await handleSuggestBOM(intent.entities, message);

      case "CONFIRM_ACTION":
        return await handleConfirmAction(history, tenantId);

      case "SUGGEST_CREATE_SKU":
        return await handleSuggestCreateSKU(intent.entities, tenantId);

      case "ANALYZE_STOCK":
        return await handleAnalyzeStock(tenantId);

      case "SEARCH_SKU":
        return await handleSearch(intent.entities, tenantId);

      default: {
        const vendas = await sql`SELECT SUM(valor_total) as total FROM titulos_receber WHERE status = 'recebido' AND created_at > NOW() - INTERVAL '30 days' AND tenant_id = ${tenantId}::uuid`;
        const estoque = await sql`SELECT nome, estoque_atual FROM materiais WHERE ativo = true AND tenant_id = ${tenantId}::uuid ORDER BY estoque_atual ASC LIMIT 5`;
        const clientes = await sql`SELECT nome FROM clientes WHERE tenant_id = ${tenantId}::uuid ORDER BY nome LIMIT 5`;
        const ops = await sql`SELECT op_id, produto, status FROM ordens_producao WHERE tenant_id = ${tenantId}::uuid ORDER BY created_at DESC LIMIT 5`;
        
        const dados = {
          vendasMes: vendas[0]?.total || 0,
          estoqueBaixo: estoque,
          clientes: clientes,
          ordensProducao: ops
        };

        const { text } = await generateText({
          model: modelFlash,
          prompt: `Você é o Copiloto Industrial da D'Luxury. 
          O usuário disse: "${message}". 
          Dados atuais do ERP: ${JSON.stringify(dados)}.
          Responda de forma profissional e útil.`
        });

        return { message: text };
      }
    }
    
  } catch (error) {
    console.error("Erro fatal no ProcessUserMessage:", error);
    return { message: "Desculpe, tive um problema técnico ao processar sua solicitação. Pode repetir?" };
  }
}

async function generateChatResponse(payload: any, tenantId: string) {
  const response = await processUserMessage(payload.message, payload.history || [], tenantId);
  return { content: response.message };
}

const handleAICopilotCore: TenantHandler = async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const user = req.tenantUser;
    if (req.method !== 'POST') return res.status(405).end();
    
    const { skill, payload } = req.body;
    let result;
    switch (skill) {
      case 'chat': 
        result = await generateChatResponse(payload, tenantId);
        return res.status(200).json({ success: true, data: result });
      case 'generate-bom': 
        result = await generateBOM(payload, tenantId);
        return res.status(200).json({ success: true, data: result });
      case 'audit-sku': 
        result = await auditSKU(payload, tenantId);
        return res.status(200).json({ success: true, data: result });
      case 'purchase-suggestion': 
        result = await purchaseSuggestion(tenantId);
        return res.status(200).json({ success: true, data: result });
      case 'detect-anomalies': 
        result = await detectAnomalies(tenantId);
        return res.status(200).json({ success: true, data: result });
      case 'analyze-proposal': 
        result = await analyzeProposal(payload);
        return res.status(200).json({ success: true, data: result });
      case 'translate': 
        result = await translateDescription(payload);
        return res.status(200).json({ success: true, data: result });
      case 'generate-pdf': 
        result = await generateProposalPDF(payload);
        return res.status(200).json({ success: true, data: result });
      case 'forecast-demand': 
        result = await forecastDemand(payload, tenantId);
        return res.status(200).json({ success: true, data: result });
      default:
        return res.status(400).json({ success: false, error: 'Skill de IA não reconhecida' });
    }
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

export const handleAICopilot = withTenant(handleAICopilotCore);