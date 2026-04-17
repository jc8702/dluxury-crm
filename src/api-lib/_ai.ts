import { generateObject, generateText } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { z } from 'zod';
import { sql } from './_db.js';

const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GOOGLE_GENERATION_AI_API_KEY;
const google = createGoogleGenerativeAI({ apiKey });
const model = google('gemini-1.5-pro');

/**
 * SKILL 1: GERAR BOM AUTOMATICAMENTE
 * Transforma tipo de móvel e dimensões em lista de peças e materiais.
 */
export async function generateBOM(payload: { tipo: string; medidas: { L: number; A: number; P: number }; observacoes?: string }) {
  // Buscar materiais disponíveis para dar contexto à IA
  const materiais = await sql`SELECT id, nome, categoria_id, preco_custo, unidade_uso FROM materiais WHERE ativo = true`;

  const { object } = await generateObject({
    model,
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
    prompt: `Você é um engenheiro de produção de móveis sob medida. 
    Gere uma lista de materiais (BOM) para o seguinte item:
    Tipo: ${payload.tipo}
    Dimensões: Largura ${payload.medidas.L}mm, Altura ${payload.medidas.A}mm, Profundidade ${payload.medidas.P}mm.
    Observações: ${payload.observacoes || 'Nenhuma'}
    
    Materiais Disponíveis no ERP:
    ${JSON.stringify(materiais)}
    
    Retorne a lista exata de chapas (MDF), fitas de borda e ferragens necessárias.`
  });

  return object;
}

/**
 * SKILL 2: VALIDAR CADASTRO DE SKU
 * Detecta duplicidade semântica e sugere classificação.
 */
export async function auditSKU(payload: { nome: string; descricao: string; categoria_id?: string }) {
  const existentes = await sql`SELECT nome, descricao, categoria_id FROM materiais WHERE ativo = true`;

  const { object } = await generateObject({
    model,
    schema: z.object({
      is_duplicado: z.boolean(),
      similaridade_pct: z.number(),
      item_conflitante: z.string().optional(),
      categoria_sugerida: z.string(),
      recomendacao: z.string()
    }),
    prompt: `Verifique se o novo SKU abaixo é duplicado ou muito similar a algum item já existente no estoque.
    Novo SKU: ${payload.nome} (${payload.descricao})
    
    Itens em Estoque:
    ${JSON.stringify(existentes)}
    
    Analise nomes similares (ex: "Chapa MDF" vs "MDF Chapa") e descrições técnicas.`
  });

  return object;
}

/**
 * SKILL 3: SUGERIR COMPRA
 * Baseado em estoque atual vs mínimo e consumo.
 */
export async function purchaseSuggestion() {
  const estoque = await sql`
    SELECT m.nome, m.estoque_atual, m.estoque_minimo, m.unidade_compra,
           (SELECT COUNT(*) FROM movimentacoes_estoque WHERE material_id = m.id AND tipo = 'saida' AND criado_em > NOW() - INTERVAL '30 days') as consumo_30d
    FROM materiais m 
    WHERE m.ativo = true AND m.estoque_atual <= m.estoque_minimo * 1.5
  `;

  const { object } = await generateObject({
    model,
    schema: z.object({
      pedidos_sugeridos: z.array(z.object({
        material: z.string(),
        quantidade_sugerida: z.number(),
        prioridade: z.enum(['critica', 'alta', 'media']),
        motivo: z.string()
      }))
    }),
    prompt: `Aja como um gestor de compras industrial. Analise os dados de estoque abaixo e sugira um plano de reposição.
    Dados:
    ${JSON.stringify(estoque)}
    
    Considere que se o estoque atual for menor que o mínimo, a prioridade é crítica.`
  });

  return object;
}

/**
 * SKILL 4: DETECTAR ANOMALIAS
 * Analisa desvios de consumo e erros de cadastro.
 */
export async function detectAnomalies() {
  const dados = await sql`
    SELECT m.nome, m.preco_custo, 
           (SELECT AVG(quantidade) FROM movimentacoes_estoque WHERE material_id = m.id AND tipo = 'saida') as media_saida,
           (SELECT MAX(quantidade) FROM movimentacoes_estoque WHERE material_id = m.id AND tipo = 'saida') as max_saida
    FROM materiais m 
    WHERE m.ativo = true
  `;

  const { object } = await generateObject({
    model,
    schema: z.object({
      anomalias: z.array(z.object({
        item: z.string(),
        tipo_anomalia: z.string(),
        gravidade: z.enum(['baixa', 'media', 'critica']),
        detalhes: z.string()
      }))
    }),
    prompt: `Analise as movimentações históricas e identifique comportamentos anômalos.
    Dados de referência:
    ${JSON.stringify(dados)}
    
    Considere anomalia: saídas muito acima da média ou variações de preço bruscas.`
  });

  return object;
}

/**
 * SKILL: CONVERSA LIVRE (CHAT)
 * Processa mensagens genéricas sobre o sistema e marcenaria.
 */
export async function generateChatResponse(payload: { message: string, history?: any[] }) {
  try {
    const flashModel = google('gemini-1.5-flash');
    const { text } = await generateText({
      model: flashModel,
      prompt: `Você é o D'Luxury Copilot, um especialista em ERP Industrial e marcenaria sob medida de alto padrão.
      Seu objetivo é ajudar o usuário com dúvidas sobre o sistema, produção de móveis, materiais e orçamentos.
      
      Histórico da conversa:
      ${JSON.stringify(payload.history || [])}
      
      Pergunta do Usuário: ${payload.message}
      
      Responda de forma direta, técnica e elegante.`
    });

    return { content: text };
  } catch (error: any) {
    console.error('CHAT_ERROR:', error);
    throw new Error(`Falha na IA: ${error.message}`);
  }
}
