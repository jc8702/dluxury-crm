import { db } from '../drizzle-db.js';
import { conhecimentoMarcenaria } from '../../db/schema/conhecimento.js';
import { sql } from 'drizzle-orm';
import { z } from 'zod';

async function getEmbeddingForQuery(text: string, apiKey: string): Promise<number[]> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${apiKey}`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'models/text-embedding-004',
      content: {
        parts: [{ text }]
      }
    })
  });

  if (!response.ok) {
    throw new Error(`Erro na API do Gemini de Embeddings: ${response.status}`);
  }

  const result = await response.json() as any;
  return result?.embedding?.values || [];
}

function getSimulatedQueryEmbedding(text: string): number[] {
  const vector: number[] = [];
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0;
  }
  let seedVal = Math.abs(hash) || 1;
  for (let i = 0; i < 768; i++) {
    seedVal = (seedVal * 9301 + 49297) % 233280;
    const value = (seedVal / 233280) * 2 - 1;
    vector.push(value);
  }
  const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
  return vector.map(val => val / magnitude);
}

export async function ragConhecimentoTecnico(query: string, apiKey: string): Promise<string> {
  if (!db) {
    return 'Erro: Conexão com o banco de dados indisponível.';
  }

  try {
    let embedding: number[];
    try {
      embedding = await getEmbeddingForQuery(query, apiKey);
    } catch {
      embedding = getSimulatedQueryEmbedding(query);
    }

    const embeddingString = `[${embedding.join(',')}]`;
    const results = await db
      .select({
        titulo: conhecimentoMarcenaria.titulo,
        conteudo: conhecimentoMarcenaria.conteudo,
        categoria: conhecimentoMarcenaria.categoria,
      })
      .from(conhecimentoMarcenaria)
      .orderBy(sql`${conhecimentoMarcenaria.embedding} <=> ${embeddingString}::vector`)
      .limit(3);

    if (results.length === 0) {
      return 'Nenhum conhecimento técnico encontrado para esta busca na base de dados.';
    }

    return results
      .map(r => `### Tópico: ${r.titulo} (Categoria: ${r.categoria})\n${r.conteudo}`)
      .join('\n\n');
  } catch (err: any) {
    console.error('RAG Error:', err);
    return `Erro ao realizar a busca RAG: ${err.message}`;
  }
}

export const marcenariaAgent = {
  name: 'marcenaria',
  description: 'Consultor Técnico de Marcenaria Planejada, Ergonomia e Materiais (RAG)',
  systemPrompt: `Você é o Agente Consultor Técnico de Marcenaria Sênior da D'LUXURY.
Sua missão é responder dúvidas técnicas conceituais sobre marcenaria planejada, ergonomia de ambientes, ferragens, montagem de móveis e especificações de materiais (MDF, MDP, compensados, etc.).

DIRETRIZES DE RESPOSTA:
1. Baseie sua resposta diretamente no Conhecimento Técnico recuperado da busca RAG.
2. Seu tom deve ser altamente profissional, técnico e consultivo.
3. Justifique sempre os seus conselhos e regras fisicamente (ex: por que a prateleira flamba, por que puxadores colidem em cantos, por que a folga lateral de 13mm é mandatória, por que o MDF comum incha).
4. Utilize listas estruturadas, formatação Markdown limpa e tabelas se necessário.
5. Nunca dê respostas genéricas. Diga exatamente as medidas de folga, alturas e resistências corretas.
`,
  tools: {
    ragConhecimentoTecnico: {
      description: 'Busca diretrizes e regras técnicas na base de RAG sobre marcenaria, ergonomia, folgas, ferragens e materiais.',
      schema: z.object({
        query: z.string().describe('A dúvida conceitual técnica do usuário sobre marcenaria ou ergonomia'),
      }),
      execute: async (args: { query: string }, ctx: { apiKey: string }) => {
        const text = await ragConhecimentoTecnico(args.query, ctx.apiKey);
        return {
          text,
          chart_data: null,
          table_data: null,
          suggestions: [
            'Verificar medidas padrão de nichos',
            'Consultar tolerâncias de corrediças',
            'Analisar resistência de prateleiras',
          ],
        };
      }
    }
  }
};
