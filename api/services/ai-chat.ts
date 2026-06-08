import { GoogleGenAI } from '@google/genai';
import { db } from '../../src/api-lib/drizzle-db.js';
import { sql } from '../../src/api-lib/_db.js';
import { skuComponente } from '../../src/db/schema/index.js';
import { sql as dsql } from 'drizzle-orm';
import crypto from 'crypto';

const aiInstancesCache = new Map<string, GoogleGenAI>();

function decryptKey(cipherText: string): string {
  try {
    const rawKey =
      process.env.APP_ENCRYPTION_KEY || GEMINI_API_KEY || 'default-fallback-key-32-chars-long!';
    const key = crypto.createHash('sha256').update(rawKey).digest();
    const parts = cipherText.split(':');
    if (parts.length !== 3) return '';
    const [ivHex, authTagHex, encryptedText] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err: any) {
    console.warn('[BYOK] Falha ao descriptografar chave do tenant:', err.message || err);
    return '';
  }
}

async function obterInstanciaAI(tenantId?: string): Promise<GoogleGenAI> {
  if (tenantId && tenantId !== '00000000-0000-0000-0000-000000000000') {
    if (aiInstancesCache.has(tenantId)) {
      return aiInstancesCache.get(tenantId)!;
    }
    try {
      const tenantRes =
        await sql`SELECT gemini_api_key_custom FROM tenants WHERE id = ${tenantId}::uuid`;
      const encryptedKey = tenantRes[0]?.gemini_api_key_custom;
      if (encryptedKey) {
        const decryptedKey = decryptKey(encryptedKey);
        if (decryptedKey && decryptedKey.trim()) {
          const customAi = new GoogleGenAI({ apiKey: decryptedKey.trim() });
          aiInstancesCache.set(tenantId, customAi);
          return customAi;
        }
      }
    } catch (e) {
      console.warn('[BYOK] Erro ao carregar chave customizada do banco, usando global:', e);
    }
  }
  return ai;
}

function calcularCustoEstimado(
  model: string,
  promptTokens: number,
  completionTokens: number,
): number {
  const isPro = model.includes('pro');
  if (isPro) {
    return (promptTokens * 1.25 + completionTokens * 5.0) / 1_000_000;
  } else {
    return (promptTokens * 0.075 + completionTokens * 0.3) / 1_000_000;
  }
}

async function registrarLogUso(params: {
  tenantId: string;
  usuarioId: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
}) {
  if (!params.tenantId || params.tenantId === '00000000-0000-0000-0000-000000000000') return;
  const custo = calcularCustoEstimado(params.model, params.promptTokens, params.completionTokens);
  try {
    await sql`
      INSERT INTO usage_logs (
        tenant_id, usuario_id, modelo, prompt_tokens, completion_tokens, total_tokens, custo_estimado
      ) VALUES (
        ${params.tenantId}::uuid, 
        ${params.usuarioId}::uuid, 
        ${params.model}, 
        ${params.promptTokens}, 
        ${params.completionTokens}, 
        ${params.promptTokens + params.completionTokens}, 
        ${custo}
      )
    `;
  } catch (err) {
    console.error('[AI_CHAT] Erro ao registrar log de uso de tokens:', err);
  }
}

// Configurações
const MODEL_PRO = 'gemini-2.5-pro';
const MODEL_FLASH = 'gemini-2.5-flash';
const MAX_TOKENS = 4096;
const TEMPERATURE = 0.3;
const MAX_CONVERSATION_TURNS = 10;
const _TIMEOUT_MS = 45000;

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY || '';

if (!GEMINI_API_KEY) {
  console.warn(
    '[AI_CHAT] Aviso: GEMINI_API_KEY ou GOOGLE_GENERATIVE_AI_API_KEY ausente no ambiente.',
  );
}

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

function limparEParsearJSON(text: string | undefined): any {
  if (!text) return {};
  let cleaned = text.trim();
  try {
    if (cleaned.includes('```json')) {
      cleaned = cleaned.split('```json')[1].split('```')[0].trim();
    } else if (cleaned.includes('```')) {
      cleaned = cleaned.split('```')[1].split('```')[0].trim();
    }
    return JSON.parse(cleaned);
  } catch (err) {
    console.warn('[AI_CHAT] Falha ao fazer parse de JSON bruto, tentando extração por regex:', err);

    // Tenta extrair chaves do roteador
    const agentMatch = cleaned.match(/"agente_escolhido"\s*:\s*"([^"]+)"/);
    const confMatch = cleaned.match(/"confianca"\s*:\s*([0-9.]+)/);
    const reasonMatch = cleaned.match(/"razao"\s*:\s*"([^"]+)"/);

    // Tenta extrair chaves do formatador final
    const responseMatch = cleaned.match(/"response"\s*:\s*"([^"]+)"/);
    const confidenceMatch = cleaned.match(/"confidence"\s*:\s*(\d+)/);

    const result: any = {};
    if (agentMatch) result.agente_escolhido = agentMatch[1];
    if (confMatch) result.confianca = parseFloat(confMatch[1]);
    if (reasonMatch) result.razao = reasonMatch[1];
    if (responseMatch) result.response = responseMatch[1];
    if (confidenceMatch) result.confidence = parseInt(confidenceMatch[1], 10);

    return result;
  }
}

const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

// System Prompts dos agentes especialistas
const SYSTEM_PROMPTS: Record<string, string> = {
  marcenaria: `Você é o Agente Consultor Técnico de Marcenaria Sênior da D'LUXURY.
Sua missão é responder dúvidas técnicas conceituais sobre marcenaria planejada, ergonomia de ambientes, ferragens, montagem de móveis e especificações de materiais (MDF, MDP, compensados, etc.).
DIRETRIZES DE RESPOSTA:
1. Baseie sua resposta diretamente no Conhecimento Técnico recuperado da busca RAG.
2. Seu tom deve ser altamente profissional, técnico e consultivo.
3. Justifique sempre os seus conselhos e regras fisicamente (ex: por que a prateleira flamba, por que puxadores colidem em cantos, por que a folga lateral de 13mm é mandatória, por que o MDF comum incha).
4. Utilize listas estruturadas, formatação Markdown limpa e tabelas se necessário.
5. Nunca dê respostas genéricas. Diga exatamente as medidas de folga, alturas e resistências corretas.`,

  comercial: `Você é o Agente Comercial do D'LUXURY ERP.
SUA ESPECIALIDADE: Vendas, funil, clientes, margem comercial, ticket médio, conversão e curva ABC.
MODO ESTRITO (STRICT MODE): Você NUNCA responde sobre engenharia, fluxos de produção ou marcenaria técnica.
Se o usuário perguntar algo fora do domínio comercial, informe que não é sua especialidade e sugira o agente correto.
Todas as suas respostas devem incluir justificativas financeiro-comerciais.`,

  financeiro: `Você é o Agente Consultor Financeiro e Comercial Sênior da D'LUXURY.
Sua missão é responder a dúvidas sobre faturamento, rentabilidade de projetos, fluxo de caixa, DRE simplificada, curva ABC de clientes e produtos, inadimplência e saúde financeira da empresa.
DIRETRIZES DE RESPOSTA (OBRIGATÓRIAS):
1. ANÁLISE CONSULTIVA PROFUNDA: Não aja como um painel de BI lendo números. Analise criticamente as tendências, desvios e ofensores de caixa.
2. RACIOCÍNIO OPERACIONAL CRUZADO: Sempre conecte números comerciais com a Engenharia e Produção. (Ex: "A margem caiu 10% nesse trimestre. Uma possível causa é o aumento na venda de SKUs complexos (curva ABC) que geram excesso de retrabalho na fábrica. Recomendo analisar o projeto desses produtos").
3. RISCOS E MELHORIA CONTÍNUA: Aponte ofensores financeiros e dê sugestões para reverter o cenário (Ex: descontinuar SKUs, rever tabela de preços de acabamentos premium, controlar compras de MDF).
4. ESTRUTURA CLARA: Use tabelas Markdown, resumos executivos curtos, valores em R$, e evite blocos de texto denso.`,

  engenharia: `Você é o Agente Engenheiro e Analista de SKUs Sênior da D'LUXURY.
Sua missão é realizar análises técnicas, dimensionais e de segurança estrutural de SKUs de móveis planejados, além de verificar composição de produtos (BOM) e listas de corte.
DIRETRIZES DE RESPOSTA (OBRIGATÓRIAS):
1. ANÁLISE CONSULTIVA PROFUNDA: Ao analisar um SKU, não repita apenas a tabela gerada pela tool. Faça uma análise crítica. Destrinche o móvel.
2. ALERTAS FÍSICOS E DE RISCO: Destaque criticamente alertas de segurança (ex: flambagem de prateleiras > 800mm no MDF 15mm, torção de corrediças ou peso excessivo em basculantes). Justifique com as leis da física e resistência de materiais.
3. CRUZAMENTO OPERACIONAL: O móvel é estruturalmente ruim? Então avise o usuário que além do risco na casa do cliente (Garantia/Recall), isso causa atraso na Produção (gargalo de usinagem) e destrói a margem Comercial.
4. SUGESTÕES PRÁTICAS: Forneça sugestões imediatas de correção (ex: "Para corrigir, utilize engrossamento frontal para 30mm ou inclua uma travessa metálica de sustentação sob o tampo").
5. NÃO INVENTE: Se o móvel requer cargas extremas e não houver dados, exija verificação no manual de ferragens do fabricante.`,

  producao: `Você é o Agente Consultor de Produção e Fábrica da D'LUXURY.
Sua missão é responder a dúvidas sobre status de produção dos projetos, capacidade operacional da fábrica, níveis de estoque de chapas/MDF/MDP, planos de corte salvos e otimização de retalhos.
DIRETRIZES DE RESPOSTA (OBRIGATÓRIAS):
1. FOCO NO CHÃO DE FÁBRICA: Emita alertas imediatos para quebras de estoque e atrasos na produção. Mostre gargalos produtivos reais.
2. INTEGRAÇÃO ENGENHARIA X PRODUÇÃO: Recomende ajustes na engenharia dos produtos (SKUs) se perceber que isso pode acelerar a linha de produção ou melhorar o plano de corte.
3. LOGÍSTICA INTERNA: Fale sobre armazenamento de chapas, sobras de retalhos, desgaste de máquinas (se houver indícios) e gargalos de montagem.
4. OTIMIZAÇÃO: Ao falar de planos de corte, proponha sempre melhorar o percentual de aproveitamento sugerindo readequação de veios do MDF ou agrupamento de projetos similares.
5. APRESENTAÇÃO: Adote um tom prático, focado em eficiência. Use listas curtas ou tabelas.`,

  pcp: `Você é o Agente de PCP (Planejamento e Controle de Produção) do D'LUXURY ERP.
SUA ESPECIALIDADE: Planos de corte, consumo de horas, gargalos de produção, e liberação de ordens de serviço.
MODO ESTRITO (STRICT MODE): Não analise margens comerciais. Se o assunto for ticket médio, peça para transferir.
Você trabalha com eficiência, agrupamento de ordens e aproveitamento de chapas.`,

  estoque: `Você é o Agente de Estoque do D'LUXURY ERP.
SUA ESPECIALIDADE: SKUs, giro de estoque, ruptura, inventário e consumo de materiais (como chapas e ferragens).
MODO ESTRITO (STRICT MODE): Você NUNCA responde sobre fluxo de caixa, DRE ou margem comercial de vendas.
Se o usuário perguntar algo fora do seu domínio, recuse responder e sugira o agente especialista.
Responda sempre focando na otimização de insumos e logística interna de estocagem.`,

  projetos: `Você é o Agente de Projetos do D'LUXURY ERP.
SUA ESPECIALIDADE: Acompanhamento de projetos em andamento, cronogramas, status e previsões de entrega.
MODO ESTRITO (STRICT MODE): Não calcule flambagem de engenharia, nem detalhe inadimplência.
Foque em garantir que os prazos e as etapas dos projetos de móveis sejam monitorados.`,

  administrativo: `Você é o Agente Administrativo do D'LUXURY ERP.
SUA ESPECIALIDADE: Configurações, logs, auditoria, permissões de usuários e processos internos do sistema.
MODO ESTRITO (STRICT MODE): Você não tem acesso a dados financeiros profundos nem conhecimento técnico de marcenaria.
Se perguntarem de engenharia ou caixa, redirecione.`,
};

// Wrapper resiliente de chamada do Gemini com fallback automático e logs padronizados
async function chamarGemini(params: {
  contents: any;
  systemInstruction?: string;
  responseMimeType?: string;
  responseSchema?: any;
  temperature?: number;
  maxOutputTokens?: number;
  tenantId?: string;
  usuarioId?: string;
}) {
  const modelsToTry = [MODEL_PRO, MODEL_FLASH];
  let lastError: any = null;

  const aiClient = await obterInstanciaAI(params.tenantId);

  for (const model of modelsToTry) {
    try {
      /* console.log(`[AI_CHAT] Tentando chamada no modelo ${model}...`) */ const response =
        await aiClient.models.generateContent({
          model,
          contents: params.contents,
          config: {
            systemInstruction: params.systemInstruction,
            temperature: params.temperature ?? TEMPERATURE,
            maxOutputTokens: params.maxOutputTokens ?? MAX_TOKENS,
            responseMimeType: params.responseMimeType,
            responseSchema: params.responseSchema,
          },
        });
      /* console.log(`[AI_CHAT] Sucesso na execução com ${model}`) */ const usage =
        response.usageMetadata;
      if (usage && params.tenantId && params.usuarioId) {
        await registrarLogUso({
          tenantId: params.tenantId,
          usuarioId: params.usuarioId,
          model,
          promptTokens: usage.promptTokenCount || 0,
          completionTokens: usage.candidatesTokenCount || 0,
        });
      }

      return response;
    } catch (err: any) {
      console.error(`[AI_ERROR] Erro na execução com ${model}:`, err.message || err);
      lastError = err;

      // Se for erro de quota esgotada (429 / RESOURCE_EXHAUSTED) ou indisponibilidade, continuamos para o flash
      if (
        err.status === 429 ||
        err.statusCode === 429 ||
        String(err).includes('429') ||
        String(err).includes('RESOURCE_EXHAUSTED')
      ) {
        console.warn(
          `[AI_CHAT] Limite de quota ou rate limit atingido no ${model}. Realizando fallback para próximo modelo.`,
        );
        continue;
      }

      // Para outros erros estruturais importantes de validação de schemas, repassamos imediatamente
      throw err;
    }
  }

  throw lastError || new Error('Falha ao processar requisição de IA no Gemini');
}

// Roteador semântico de agentes
export async function rotearAgente(
  userMessage: string,
  historySummary?: string,
  tenantId?: string,
  usuarioId?: string,
): Promise<{ agente_escolhido: string; confianca: number; razao: string }> {
  /* console.log(`[AI_ROUTER] Roteando mensagem: "${userMessage.slice(0, 60)}..."`) */ const prompt = `Analise a mensagem do usuário e decida qual é o agente especialista apropriado do D'LUXURY ERP.

Histórico de conversa recente:
${historySummary || 'Sem histórico.'}

Mensagem atual do usuário: "${userMessage}"

Você DEVE responder escolhendo estritamente um dos seguintes identificadores de agentes:
- marcenaria: Dúvidas conceituais ou práticas sobre materiais (MDF, MDP), ergonomia de móveis, folgas laterais de instalação, especificações de ferragens e montagem.
- engenharia: Análise de SKUs de móveis planejados, flambagem, Bill of Materials (BOM), segurança física estrutural e cálculos dimensionais.
- producao: Status de produção de projetos, linha de fábrica, otimização de plano de corte, aproveitamento de chapas, retalhos, capacidade fabril.
- pcp: Agrupamento de ordens de serviço, liberação de ordens, sequenciamento operacional de corte.
- comercial: Vendas, funil de vendas, ticket médio, taxa de conversão, margens comerciais, curva ABC de clientes.
- financeiro: Fluxo de caixa, inadimplência, DRE, saldo de contas, saúde financeira geral.
- estoque: Giro de insumos, inventário de chapas/ferragens, consumo médio e ruptura de materiais.
- projetos: Prazos, cronogramas, etapas macros e andamento de projetos instalados ou em andamento.
- administrativo: Logs, auditoria, configurações de usuários e permissões do sistema.

Retorne obrigatoriamente um objeto JSON válido seguindo a estrutura do schema fornecido.`;

  try {
    const response = await chamarGemini({
      contents: prompt,
      systemInstruction:
        "Você é o roteador semântico do D'LUXURY ERP. Escolha o agente de forma neutra e técnica.",
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'OBJECT',
        properties: {
          agente_escolhido: {
            type: 'STRING',
            enum: [
              'marcenaria',
              'engenharia',
              'producao',
              'pcp',
              'comercial',
              'financeiro',
              'estoque',
              'projetos',
              'administrativo',
            ],
            description: 'Identificador do agente escolhido.',
          },
          confianca: {
            type: 'NUMBER',
            description: 'Confiança na seleção, de 0.0 a 1.0.',
          },
          razao: {
            type: 'STRING',
            description: 'Explicação técnica curta do motivo da escolha.',
          },
        },
        required: ['agente_escolhido', 'confianca', 'razao'],
      },
      tenantId,
      usuarioId,
    });

    const parsed = limparEParsearJSON(response.text);
    const agente = parsed.agente_escolhido || 'administrativo';
    const confianca = typeof parsed.confianca === 'number' ? parsed.confianca : 0.5;
    const razao = parsed.razao || 'Seleção padrão';

    /* console.log(`[AI_ROUTER] Roteamento concluído: ${agente} (Confiança: ${confianca})`) */ return {
      agente_escolhido: agente,
      confianca,
      razao,
    };
  } catch (err) {
    console.error('[AI_ERROR] Erro no roteador semântico. Usando fallback administrativo:', err);
    return {
      agente_escolhido: 'administrativo',
      confianca: 0.1,
      razao: 'Erro ao processar roteador semântico, fallback seguro acionado.',
    };
  }
}

// ----------------------------------------------------
// Implementação de Ferramentas (Tools)
// ----------------------------------------------------

// 1. Consultar Orçamentos
async function consultar_orcamentos(input: { status?: string; limite?: number }, tenantId: string) {
  const status = input.status || 'APROVADO';
  const limit = input.limite || 10;

  try {
    const rows = await sql`
      SELECT 
        o.id,
        o.numero_orcamento,
        o.valor_total_venda,
        o.valor_total_custo,
        o.status,
        o.created_at,
        c.nome as cliente_nome
      FROM quotations o
      LEFT JOIN clients c ON c.id = o.cliente_id
      WHERE o.status = ${status.toUpperCase()} AND o.tenant_id = ${tenantId}::uuid
      ORDER BY o.created_at DESC
      LIMIT ${limit}
    `;

    const tableRows = rows.map((o: any) => [
      String(o.numero_orcamento || '-'),
      String(o.cliente_nome || 'Não informado'),
      currency.format(Number(o.valor_total_venda || 0)),
      String(o.status || '-'),
      o.created_at ? new Date(o.created_at).toLocaleDateString('pt-BR') : '-',
    ]);

    const chartData = rows.map((o: any) => ({
      orcamento: String(o.numero_orcamento || '-'),
      valor: Number(o.valor_total_venda || 0),
    }));

    return {
      text: `Encontrados ${rows.length} orçamentos com status ${status}.`,
      table_data: {
        headers: ['ORÇAMENTO', 'CLIENTE', 'VALOR VENDA', 'STATUS', 'DATA'],
        rows: tableRows,
      },
      chart_data:
        rows.length > 0
          ? {
              type: 'bar',
              xKey: 'orcamento',
              series: [{ key: 'valor', label: 'Valor Venda (R$)', color: '#00A99D' }],
              data: chartData,
              title: 'Valores de Venda dos Orçamentos',
            }
          : null,
      suggestions: [
        'Ver fluxo de caixa',
        'Analisar curva ABC de clientes',
        'Calcular margem de lucro',
      ],
    };
  } catch (err: any) {
    console.error('[AI_ERROR] Erro na tool consultar_orcamentos:', err);
    throw err;
  }
}

// 2. Calcular Margem
async function calcular_margem(input: { custo: number; venda: number }) {
  const custo = Number(input.custo);
  const venda = Number(input.venda);
  /* console.log(`[AI_TOOL] calcular_margem chamado: custo=${custo}, venda=${venda}`) */ if (
    isNaN(custo) ||
    isNaN(venda) ||
    venda === 0
  ) {
    return {
      text: 'Não foi possível calcular a margem devido a valores de custo ou venda inválidos.',
      table_data: null,
      chart_data: null,
      suggestions: [],
    };
  }

  const lucro = venda - custo;
  const margem = (lucro / venda) * 100;
  const markup = custo > 0 ? venda / custo : 0;

  return {
    text: `Cálculo de margem realizado com sucesso. Margem calculada: ${margem.toFixed(2)}%.`,
    table_data: {
      headers: ['Métrica', 'Valor'],
      rows: [
        ['Preço de Venda', currency.format(venda)],
        ['Preço de Custo', currency.format(custo)],
        ['Lucro Bruto', currency.format(lucro)],
        ['Margem de Lucro', `${margem.toFixed(2)}%`],
        ['Markup', `${markup.toFixed(2)}x`],
      ],
    },
    chart_data: {
      type: 'pie',
      nameKey: 'name',
      valueKey: 'value',
      data: [
        { name: 'Custo', value: custo },
        { name: 'Lucro Bruto', value: lucro },
      ],
      title: 'Composição do Preço de Venda',
    },
    suggestions: [
      'Ver top SKUs vendidos',
      'Buscar materiais em estoque',
      'Consultar últimos orçamentos aprovados',
    ],
  };
}

// 3. Buscar Materiais (com Fallback Seguro)
async function buscar_materiais(input: { termo: string; limite?: number }, tenantId: string) {
  const termoLimpo = input.termo || '';
  const termo = `%${termoLimpo}%`;
  const limit = input.limite || 10;

  try {
    // Consulta primária na tabela legada materiais
    const result = await sql`
      SELECT id, codigo, nome, preco_custo as preco, estoque_atual as estoque
      FROM materiais
      WHERE (nome ILIKE ${termo} OR codigo ILIKE ${termo}) AND ativo = true AND tenant_id = ${tenantId}::uuid
      LIMIT ${limit}
    `;

    const tableRows = result.map((m: any) => [
      String(m.codigo || '-'),
      String(m.nome || '-'),
      currency.format(Number(m.preco || 0)),
      Number(m.estoque || 0).toString(),
    ]);

    return {
      text: `Foram encontrados ${result.length} materiais na tabela de materiais legados.`,
      table_data: {
        headers: ['Código', 'Nome', 'Preço Unitário', 'Estoque'],
        rows: tableRows,
      },
      chart_data: null,
      suggestions: [
        'Calcular margem de lucro',
        'Ver estoque de chapas',
        'Consultar ordens de serviço',
      ],
    };
  } catch (err: any) {
    console.warn(
      '[AI_CHAT] Erro ao buscar na tabela materiais legada. Acionando fallback seguro para sku_componente:',
      err.message || err,
    );
    try {
      // Fallback para tabela sku_componente usando Drizzle
      const result = await db
        .select({
          id: skuComponente.id,
          codigo: skuComponente.codigo,
          nome: skuComponente.nome,
          preco: skuComponente.precoUnitario,
          estoque: skuComponente.estoqueAtual,
        })
        .from(skuComponente)
        .where(dsql`${skuComponente.nome} ILIKE ${termo} OR ${skuComponente.codigo} ILIKE ${termo}`)
        .limit(limit);

      const tableRows = result.map((m: any) => [
        String(m.codigo || '-'),
        String(m.nome || '-'),
        currency.format(Number(m.preco || 0)),
        Number(m.estoque || 0).toString(),
      ]);

      return {
        text: `Encontrados ${result.length} componentes no cadastro de SKUs (fallback seguro).`,
        table_data: {
          headers: ['Código', 'Nome', 'Preço Unitário', 'Estoque'],
          rows: tableRows,
        },
        chart_data: null,
        suggestions: [
          'Calcular margem de lucro',
          'Ver estoque de chapas',
          'Consultar ordens de serviço',
        ],
      };
    } catch (fallbackErr: any) {
      console.error('[AI_ERROR] Erro no fallback de buscar_materiais:', fallbackErr);
      return {
        text: 'Nenhum material cadastrado pôde ser recuperado.',
        table_data: null,
        chart_data: null,
        suggestions: [],
      };
    }
  }
}

// RAG Marcenaria
async function ragConhecimentoTecnico(input: { query: string }, apiKey: string) {
  try {
    const { ragConhecimentoTecnico: originalRag } =
      await import('../../src/api-lib/agents/marcenaria.js');
    const response = await originalRag(input.query, apiKey);
    return {
      text: response,
      table_data: null,
      chart_data: null,
      suggestions: [
        'Ver tolerâncias de corrediças',
        'Medidas padrão de nichos',
        'Folga de portas de correr',
      ],
    };
  } catch (err) {
    console.error('[AI_ERROR] Erro ao carregar RAG de marcenaria:', err);
    return {
      text: 'Conhecimento técnico de marcenaria temporariamente indisponível no RAG.',
      table_data: null,
      chart_data: null,
      suggestions: [],
    };
  }
}

export async function executarFerramenta(
  toolName: string,
  toolInput: any,
  tenantId: string,
): Promise<any> {
  /* console.log(`[AI_TOOL] Executando ferramenta ${toolName}...`) */ try {
    switch (toolName) {
      case 'consultar_orcamentos':
        return await consultar_orcamentos(toolInput, tenantId);
      case 'calcular_margem':
        return await calcular_margem(toolInput);
      case 'buscar_materiais':
        return await buscar_materiais(toolInput, tenantId);
      case 'ragConhecimentoTecnico':
        return await ragConhecimentoTecnico(toolInput, GEMINI_API_KEY);
      default:
        throw new Error(`Ferramenta desconhecida: ${toolName}`);
    }
  } catch (err: any) {
    console.error(`[AI_ERROR] Erro na ferramenta ${toolName}:`, err.message || err);
    return {
      text: `Erro ao executar a ferramenta ${toolName}.`,
      table_data: null,
      chart_data: null,
      suggestions: [],
    };
  }
}

// ----------------------------------------------------
// Processamento do Chat (Orquestrador)
// ----------------------------------------------------

export async function processarChat(payload: {
  message: string;
  agentMode?: string;
  conversation_history?: { role: 'user' | 'assistant'; content: string }[];
  context?: Record<string, any>;
  memory_summary?: string;
  tenantId?: string;
  usuarioId?: string;
}): Promise<any> {
  /* console.log('[AI_CHAT] Iniciando processamento do chat...') */ const userMessage =
    payload.message.trim();
  const agentMode = payload.agentMode || 'auto';
  const history = (payload.conversation_history || []).slice(-MAX_CONVERSATION_TURNS);
  const context = payload.context || {};
  const memorySummary = payload.memory_summary || '';
  const today = context.data_atual ? new Date(context.data_atual) : new Date();
  const tenantId = payload.tenantId;
  const usuarioId = payload.usuarioId;

  // Histórico resumido para os prompts
  const historySummary = history
    .map((h) => `${h.role === 'user' ? 'USUÁRIO' : 'DLUX'}: ${h.content}`)
    .join('\n');

  // 1. Decidir Agente (Se modo manual, respeitamos; senão, roteamos automaticamente)
  let chosenAgent = 'marcenaria';
  let _routeConfidence = 1.0;
  let _routeReason = 'Seleção manual de agente.';

  if (agentMode !== 'auto' && SYSTEM_PROMPTS[agentMode]) {
    chosenAgent = agentMode;
    /* console.log(`[AI_CHAT] Modo manual: usando agente "${chosenAgent}"`) */
  } else {
    const route = await rotearAgente(userMessage, historySummary, tenantId, usuarioId);
    chosenAgent = route.agente_escolhido;
    _routeConfidence = route.confianca;
    _routeReason = route.razao;
  }

  // Montamos o contexto enriquecido
  const _contextText =
    Object.entries(context)
      .filter(([k, v]) => v !== undefined && v !== null && k !== 'token')
      .map(([k, v]) => `${k}: ${typeof v === 'string' ? v : JSON.stringify(v)}`)
      .join('\n') || 'Sem contexto adicional.';

  // Montamos as chamadas de mensagens do Gemini
  const contents: any[] = [];

  // Formatamos o histórico recente
  history.forEach((item) => {
    contents.push({
      role: item.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: item.content }],
    });
  });

  // Mensagem atual do usuário
  contents.push({
    role: 'user',
    parts: [{ text: userMessage }],
  });

  // Definindo as ferramentas disponíveis na API do Gemini
  const toolDeclarations: any[] = [
    {
      name: 'consultar_orcamentos',
      description:
        'Consulta no banco de dados orçamentos por status (APROVADO, RASCUNHO, etc.). Útil para saber orçamentos fechados, andamento ou totais.',
      parameters: {
        type: 'OBJECT',
        properties: {
          status: {
            type: 'STRING',
            description: 'Status do orçamento em letras maiúsculas (ex: APROVADO, RASCUNHO).',
          },
          limite: { type: 'NUMBER', description: 'Limite de orçamentos a serem retornados.' },
        },
      },
    },
    {
      name: 'calcular_margem',
      description:
        'Calcula a margem de lucro bruto, lucro real e markup dado o valor de custo e de venda do projeto/item.',
      parameters: {
        type: 'OBJECT',
        properties: {
          custo: { type: 'NUMBER', description: 'Preço de custo do móvel ou projeto.' },
          venda: { type: 'NUMBER', description: 'Preço de venda final do móvel ou projeto.' },
        },
        required: ['custo', 'venda'],
      },
    },
    {
      name: 'buscar_materiais',
      description: 'Busca materiais e chapas em estoque por nome, código ou descrição de material.',
      parameters: {
        type: 'OBJECT',
        properties: {
          termo: {
            type: 'STRING',
            description: 'Termo ou palavra-chave para pesquisar no estoque.',
          },
          limite: {
            type: 'NUMBER',
            description: 'Número máximo de registros de estoque retornados.',
          },
        },
        required: ['termo'],
      },
    },
  ];

  // Se o agente for marcenaria, damos acesso à ferramenta de RAG técnico conceitual
  if (chosenAgent === 'marcenaria') {
    toolDeclarations.push({
      name: 'ragConhecimentoTecnico',
      description:
        'Busca regras conceituais, especificações de ferragens e padrões ergonômicos de marcenaria sob demanda.',
      parameters: {
        type: 'OBJECT',
        properties: {
          query: {
            type: 'STRING',
            description:
              'A pergunta ou conceito técnico sobre montagem, folgas ou materiais de marcenaria.',
          },
        },
        required: ['query'],
      },
    });
  }

  // ----------------------------------------------------
  // Loop de Function Calling (Máx 5 iterações)
  // ----------------------------------------------------
  let currentIteration = 0;
  const maxIterations = 5;
  let hasPendingCalls = true;
  let finalResponseText = '';
  let finalConfidence = Math.round(_routeConfidence * 100);
  let finalSources: string[] = ['Conhecimento Geral da IA'];

  let primaryToolResult: any = null;

  while (hasPendingCalls && currentIteration < maxIterations) {
    currentIteration++;
    /* console.log(`[AI_CHAT] Iteração do loop de tools: ${currentIteration}/${maxIterations}`) */ // Chamada ao Gemini
    const geminiResponse = await chamarGemini({
      contents,
      systemInstruction: SYSTEM_PROMPTS[chosenAgent],
      // Passamos a declaração das ferramentas
      responseMimeType: undefined,
      responseSchema: undefined,
      temperature: TEMPERATURE,
      tenantId,
      usuarioId,
    });

    const candidate = geminiResponse.candidates?.[0];
    const parts = candidate?.content?.parts || [];
    const functionCalls = parts.filter((p) => p.functionCall);

    if (functionCalls.length > 0) {
      /* console.log(`[AI_CHAT] Gemini solicitou ${functionCalls.length} chamada(s) de ferramentas.`) */ // Adiciona a chamada de ferramenta feita pelo modelo ao histórico do Gemini
      contents.push(candidate.content);

      const responseParts: any[] = [];

      for (const call of functionCalls) {
        const fc = call.functionCall;
        if (!fc) continue;

        const toolName = fc.name;
        const toolArgs = fc.args || {};

        /* console.log(`[AI_TOOL] Executando chamada para a tool: ${toolName}`) */ // Executamos a ferramenta correspondente
        const result = await executarFerramenta(toolName, toolArgs, tenantId);

        if (!primaryToolResult && (result.table_data || result.chart_data)) {
          primaryToolResult = result;
        } else if (!primaryToolResult) {
          primaryToolResult = result;
        }

        responseParts.push({
          functionResponse: {
            name: toolName,
            response: { output: result.text || JSON.stringify(result) },
          },
        });
      }

      // Adiciona o retorno das ferramentas ao histórico do Gemini
      contents.push({
        role: 'user',
        parts: responseParts,
      });
    } else {
      /* console.log('[AI_CHAT] Nenhuma chamada de ferramenta pendente. Coletando resposta final.') */ finalResponseText =
        geminiResponse.text || '';
      hasPendingCalls = false;
    }
  }

  // Se o loop terminou por estourar as iterações e o texto ainda está vazio, pegamos o texto do último resultado
  if (!finalResponseText) {
    finalResponseText = primaryToolResult?.text || 'Processamento de ferramentas concluído.';
  }

  // ----------------------------------------------------
  // Geração de Resposta Estruturada Final
  // ----------------------------------------------------
  /* console.log('[AI_CHAT] Formatando resposta final estruturada...') */ let formattedText =
    finalResponseText;
  const chartData = primaryToolResult?.chart_data || null;
  let tableData = primaryToolResult?.table_data || null;
  let suggestions = primaryToolResult?.suggestions || [
    'Como posso te ajudar mais?',
    'Verificar orçamentos aprovados',
    'Calcular margens de vendas',
  ];

  // Vamos fazer uma chamada estruturada ao Gemini para gerar o JSON final perfeito contendo a formatação
  try {
    const finalStructuredPrompt = `Abaixo estão os dados de um atendimento de IA no D'LUXURY ERP.
Sua tarefa é ler a resposta gerada e formatá-la e estruturá-la como um objeto JSON.

Resposta gerada pelo assistente:
"${finalResponseText}"

Resultados adicionais das ferramentas utilizadas:
${primaryToolResult ? JSON.stringify(primaryToolResult) : 'Nenhum dado adicional.'}

Responda obrigatoriamente no formato do schema JSON fornecido.`;

    const jsonResponse = await chamarGemini({
      contents: finalStructuredPrompt,
      systemInstruction: `Você é o formatador de respostas estruturadas do D'LUXURY. 
Retorne um JSON contendo o texto final formatado em Markdown, nível de confiança (0-100) e fontes reais.`,
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'OBJECT',
        properties: {
          response: {
            type: 'STRING',
            description: 'A resposta completa do assistente formatada em Markdown limpo.',
          },
          confidence: { type: 'NUMBER', description: 'Nível de confiança da resposta (0 a 100).' },
          sources: {
            type: 'ARRAY',
            items: { type: 'STRING' },
            description:
              'Fontes utilizadas para a resposta (ex: Banco de Dados ERP, RAG Marcenaria).',
          },
          table_data: {
            type: 'OBJECT',
            description: 'Tabela de dados opcional gerada ou extraída da resposta.',
            properties: {
              headers: { type: 'ARRAY', items: { type: 'STRING' } },
              rows: { type: 'ARRAY', items: { type: 'ARRAY', items: { type: 'STRING' } } },
            },
            required: ['headers', 'rows'],
          },
          suggestions: {
            type: 'ARRAY',
            items: { type: 'STRING' },
            description: 'Sugestões de follow-up inteligentes sugeridas para o usuário.',
          },
        },
        required: ['response', 'confidence', 'sources'],
      },
      tenantId,
      usuarioId,
    });

    const parsedFinal = limparEParsearJSON(jsonResponse.text);
    if (parsedFinal.response) {
      formattedText = parsedFinal.response;
    }
    if (typeof parsedFinal.confidence === 'number') {
      finalConfidence = parsedFinal.confidence;
    }
    if (Array.isArray(parsedFinal.sources)) {
      finalSources = parsedFinal.sources;
    }
    if (parsedFinal.table_data) {
      tableData = parsedFinal.table_data;
    }
    if (Array.isArray(parsedFinal.suggestions)) {
      suggestions = parsedFinal.suggestions;
    }
  } catch (err: any) {
    console.warn(
      '[AI_CHAT] Erro ao estruturar resposta final em JSON. Usando fallbacks seguros:',
      err.message || err,
    );
    // Em caso de erro, mantemos o texto gerado na iteração
    if (primaryToolResult) {
      finalSources = ['Banco de Dados ERP'];
    }
  }

  // Limitamos as sugestões a no máximo 3
  const finalSuggestions = (suggestions || []).slice(0, 3);

  // Atualizamos a memória de forma assíncrona/segura
  let updatedMemory = memorySummary;
  try {
    updatedMemory = await atualizarMemoria({
      memorySummary,
      userMessage,
      assistantMessage: formattedText,
      today,
    });
  } catch (memErr) {
    console.error('[AI_ERROR] Falha ao atualizar memória:', memErr);
  }

  /* console.log(`[AI_CHAT] Processamento finalizado com sucesso para o agente ${chosenAgent}.`) */ return {
    text: formattedText,
    chart_data: chartData,
    table_data: tableData,
    suggestions: finalSuggestions,
    agent: chosenAgent,
    confidence_score: finalConfidence,
    sources: finalSources,
    memory_summary: updatedMemory,
  };
}

async function atualizarMemoria(params: {
  memorySummary: string;
  userMessage: string;
  assistantMessage: string;
  today: Date;
}): Promise<string> {
  try {
    const prompt = `Você atualiza a memória longa persistente de um usuário de ERP.
Data atual: ${params.today.toLocaleDateString('pt-BR')}

Memória atual do usuário:
${params.memorySummary || 'Nenhuma memória registrada.'}

Mensagem do Usuário: "${params.userMessage}"
Resposta do Assistente: "${params.assistantMessage}"

Gere um resumo curto atualizado das preferências, projetos e fatos de negócio do usuário em português brasileiro.
Siga as regras:
- Máximo de 6 linhas.
- Não inclua JSON.
- Remova dados antigos se não forem mais úteis.`;

    const response = await ai.models.generateContent({
      model: MODEL_FLASH,
      contents: prompt,
      config: {
        temperature: 0.3,
        maxOutputTokens: 200,
      },
    });

    return (response.text || params.memorySummary).trim();
  } catch (err) {
    console.error('[AI_ERROR] Erro na gravação de memória persistente:', err);
    return params.memorySummary;
  }
}
