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
  listarCategorias: tool({
    description: 'Use esta função para listar as categorias e famílias industriais disponíveis ANTES de cadastrar um material, para saber qual ID usar.',
    parameters: z.object({}),
    execute: async () => {
      try {
        const result = await sql`
          SELECT c.id as cat_id, c.nome as categoria, f.id as fam_id, f.nome as familia
          FROM erp_categories c
          LEFT JOIN erp_families f ON f.categoria_id = c.id
          ORDER BY c.nome, f.nome
        `;
        return { success: true, data: result };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }
  }),
  cadastrarMaterial: tool({
    description: 'Use esta função para CADASTRAR UM NOVO MATERIAL/SKU no estoque.',
    parameters: z.object({
      nome: z.string().describe('Título claro do material. Ex: Chapa MDF 15mm Branco.'),
      descricao: z.string().describe('Detalhes complementares (medidas, fabricante).'),
      categoria_id: z.string().describe('ID da Categoria (ex: CHP). Use listarCategorias se não souber.').optional(),
      unidade_uso: z.string().optional().describe('Ex: UN, M2, ML'),
      preco_custo: z.number().optional()
    }),
    execute: async (args) => {
      try {
        const lastSkuQuery = await sql`SELECT sku FROM materiais ORDER BY id DESC LIMIT 1`;
        let proximoSku = 'SKU-0001';
        if (lastSkuQuery.length > 0 && lastSkuQuery[0].sku) {
           const match = lastSkuQuery[0].sku.match(/\d+/);
           if (match) { proximoSku = `SKU-${(parseInt(match[0], 10) + 1).toString().padStart(4, '0')}`; }
        }
        const unidade = args.unidade_uso || 'UN';
        const preco = args.preco_custo || 0;
        
        const r = await sql`
          INSERT INTO materiais (sku, nome, descricao, unidade_uso, unidade_compra, preco_custo, margem_lucro, preco_venda, categoria_id, ativo, estoque_atual, estoque_minimo) 
          VALUES (${proximoSku}, ${args.nome}, ${args.descricao}, ${unidade}, ${unidade}, ${preco}, 50, ${preco * 1.5}, ${args.categoria_id || null}, true, 0, 0) RETURNING id
        `;
        return { success: true, message: `Material ${args.nome} inserido com SKU: ${proximoSku}` };
      } catch (err: any) {
        return { success: false, message: `Erro ao cadastrar material: ${err.message}` };
      }
    }
  }),
  consultarFinanceiro: tool({
    description: 'Consulta o resumo financeiro atual (entradas, saídas e saldo).',
    parameters: z.object({}),
    execute: async () => {
      try {
        const result = await sql`
          SELECT 
            SUM(CASE WHEN tipo = 'entrada' AND status = 'PAGO' THEN valor ELSE 0 END) as total_entradas,
            SUM(CASE WHEN tipo = 'saida' AND status = 'PAGO' THEN valor ELSE 0 END) as total_saidas
          FROM billings
        `;
        const entradas = parseFloat(result[0].total_entradas || '0');
        const saidas = parseFloat(result[0].total_saidas || '0');
        return { success: true, resumo: { entradas, saidas, saldo: Math.round((entradas - saidas) * 100) / 100 } };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }
  }),
  consultarRelatorioABC: tool({
    description: 'Gera a curva ABC de clientes baseada no faturamento histórico.',
    parameters: z.object({}),
    execute: async () => {
      try {
        const result = await sql`
          SELECT cliente, SUM(valor) as total_faturado
          FROM billings
          WHERE tipo = 'entrada' AND status = 'PAGO' AND cliente IS NOT NULL
          GROUP BY cliente
          ORDER BY total_faturado DESC
          LIMIT 10
        `;
        return { success: true, top_clientes: result };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }
  })
};

async function generateChatResponse(payload: any) {
  const systemPrompt = `Você é o D'Luxury Copilot, o agente inteligente do CRM industrial.
Sua função é realizar ações diretas nos módulos do sistema (Financeiro, Estoque, Projetos, etc) executando as ferramentas disponíveis.
DIRETRIZES:
1. Se o usuário pedir para CADASTRAR algo (ex: material), não responda com texto explicativo. USE A FERRAMENTA 'cadastrarMaterial'. Preencha os campos com base no que foi dito; não seja excessivamente rígido pedindo dados que podem ser deduzidos de forma sensata.
2. Se perguntarem sobre FINANÇAS (saldo, caixa, faturamento), use a ferramenta 'consultarFinanceiro' para embasar sua resposta.
3. Se perguntarem sobre MELHORES CLIENTES ou CURVA ABC, use a ferramenta 'consultarRelatorioABC'.
4. Responda de forma direta e concisa. Informe ao usuário se você criou, operou ou pesquisou dados usando ferramentas. O usuário quer ver ações realizadas, não apenas conversas.`;
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
