import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateObject, generateText } from 'ai';
import { z } from 'zod';
import { sql, validateAuth } from './_db.js';
import { bootstrapFinanceiro } from './financeiro.js';
import { buildAnswerPrompt, buildDirectAnswerPrompt, buildRouterPrompt } from './system-prompt.js';
import { buildMemoryPrompt } from './system-prompt.js';

type Granularity = 'diario' | 'semanal' | 'mensal';
type Regime = 'caixa' | 'competencia';

type ChartSeries = { key: string; label: string; color?: string };

type ChartData =
  | { type: 'line' | 'bar'; xKey: string; series: ChartSeries[]; data: Array<Record<string, any>>; title?: string }
  | { type: 'pie'; nameKey: string; valueKey: string; data: Array<Record<string, any>>; title?: string };

type TableData = { headers: string[]; rows: (string | number)[][] };

type AiToolResult = {
  text: string;
  chart_data: ChartData | null;
  table_data: TableData | null;
  suggestions: string[];
  meta?: Record<string, any>;
};

type NormalizedMessage = { role: 'user' | 'assistant'; content: string };
type ToolCall = { name: ToolName; args: Record<string, any> };
type ExecutedTool = { name: ToolName; result: AiToolResult };
type ToolExecutionContext = {
  today: Date;
  message: string;
  context: Record<string, any>;
  history: NormalizedMessage[];
};

const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const numberFmt = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 });

const TOOL_CATALOG = {
  getFluxoCaixa: {
    description: 'Fluxo de caixa do período com receitas, despesas e saldo projetado.',
    hint: 'mes, ano, granularidade, regime',
  },
  getSaudeFinanceira: {
    description: 'Capital de giro, liquidez, inadimplência e alertas de saúde financeira.',
    hint: 'periodo_dias',
  },
  getDRE: {
    description: 'DRE simplificada com receita, custos, despesas e lucro.',
    hint: 'data_inicio, data_fim, regime',
  },
  getInadimplencia: {
    description: 'Aging de títulos vencidos e clientes inadimplentes.',
    hint: 'limite_dias',
  },
  getSaldosContas: {
    description: 'Saldos das contas internas e do caixa.',
    hint: 'data_referencia',
  },
  getTopSKUs: {
    description: 'Itens mais vendidos por valor ou quantidade.',
    hint: 'periodo_inicio, periodo_fim, limit, tipo',
  },
  getCurvaABCClientes: {
    description: 'Curva ABC de clientes por faturamento.',
    hint: 'periodo_inicio, periodo_fim',
  },
  getPerformanceVendas: {
    description: 'Performance comercial com conversão, ticket médio e evolução.',
    hint: 'periodo_inicio, periodo_fim, agrupamento',
  },
  getProdutosMaisLucrativos: {
    description: 'Produtos ou itens com maior margem bruta.',
    hint: 'periodo_inicio, periodo_fim, limit',
  },
  getProjetosAndamento: {
    description: 'Projetos em andamento com status, prazo e progresso.',
    hint: 'status',
  },
  getEstoqueChapas: {
    description: 'Posição de estoque de chapas e materiais correlatos.',
    hint: 'tipo',
  },
  getPlanosCorteSalvos: {
    description: 'Planos de corte salvos no ERP.',
    hint: 'projeto_id, limite',
  },
  getComparativoMensal: {
    description: 'Comparativo mensal de receita, despesa, lucro e ticket médio.',
    hint: 'mes_atual, ano_atual, meses_comparar',
  },
  getPrevisaoFaturamento: {
    description: 'Previsão de faturamento baseada em histórico e pipeline.',
    hint: 'meses_futuros',
  },
  getMargemPorTipoProjeto: {
    description: 'Margem por tipo de projeto ou ambiente.',
    hint: 'periodo_inicio, periodo_fim',
  },
} as const;

type ToolName = keyof typeof TOOL_CATALOG;

const TOOL_NAMES = Object.keys(TOOL_CATALOG) as unknown as [ToolName, ...ToolName[]];

const TOOL_ARG_SCHEMAS: Record<ToolName, z.ZodTypeAny> = {
  getFluxoCaixa: z.object({
    mes: z.number().int().min(1).max(12).optional(),
    ano: z.number().int().min(2000).max(2100).optional(),
    granularidade: z.enum(['diario', 'semanal', 'mensal']).optional(),
    regime: z.enum(['caixa', 'competencia']).optional(),
  }),
  getSaudeFinanceira: z.object({
    periodo_dias: z.number().int().min(7).max(365).optional(),
  }),
  getDRE: z.object({
    data_inicio: z.string().optional(),
    data_fim: z.string().optional(),
    regime: z.enum(['caixa', 'competencia']).optional(),
  }),
  getInadimplencia: z.object({
    limite_dias: z.number().int().min(0).max(365).optional(),
  }),
  getSaldosContas: z.object({
    data_referencia: z.string().optional(),
  }),
  getTopSKUs: z.object({
    periodo_inicio: z.string().optional(),
    periodo_fim: z.string().optional(),
    limit: z.number().int().min(1).max(50).optional(),
    tipo: z.enum(['quantidade', 'valor']).optional(),
  }),
  getCurvaABCClientes: z.object({
    periodo_inicio: z.string().optional(),
    periodo_fim: z.string().optional(),
  }),
  getPerformanceVendas: z.object({
    periodo_inicio: z.string().optional(),
    periodo_fim: z.string().optional(),
    agrupamento: z.enum(['dia', 'semana', 'mes']).optional(),
  }),
  getProdutosMaisLucrativos: z.object({
    periodo_inicio: z.string().optional(),
    periodo_fim: z.string().optional(),
    limit: z.number().int().min(1).max(50).optional(),
  }),
  getProjetosAndamento: z.object({
    status: z.array(z.string()).optional(),
  }),
  getEstoqueChapas: z.object({
    tipo: z.string().optional(),
  }),
  getPlanosCorteSalvos: z.object({
    projeto_id: z.string().optional(),
    limite: z.number().int().min(1).max(50).optional(),
  }),
  getComparativoMensal: z.object({
    mes_atual: z.number().int().min(1).max(12).optional(),
    ano_atual: z.number().int().min(2000).max(2100).optional(),
    meses_comparar: z.number().int().min(1).max(12).optional(),
  }),
  getPrevisaoFaturamento: z.object({
    meses_futuros: z.number().int().min(1).max(12).optional(),
  }),
  getMargemPorTipoProjeto: z.object({
    periodo_inicio: z.string().optional(),
    periodo_fim: z.string().optional(),
  }),
};

const aiApiKey =
  process.env.GEMINI_API_KEY ||
  process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
  process.env.GOOGLE_GENERATION_AI_API_KEY ||
  '';

const google = createGoogleGenerativeAI({ apiKey: aiApiKey || 'missing-gemini-key' });
const chatModel = aiApiKey ? google('gemini-2.0-flash') : null;

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '');
}

function safeNumber(value: any) {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function formatMoney(value: any) {
  return currency.format(safeNumber(value));
}

function formatPercent(value: any) {
  return `${numberFmt.format(safeNumber(value))}%`;
}

function formatDatePt(value: any) {
  const date = toDate(value);
  return isValidDate(date) ? date.toLocaleDateString('pt-BR') : '-';
}

function toDate(value: any) {
  if (value instanceof Date) return value;
  if (!value) return new Date('invalid');
  return new Date(value);
}

function isValidDate(value: Date) {
  return value instanceof Date && !Number.isNaN(value.getTime());
}

function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

function startOfMonth(month: number, year: number) {
  return new Date(year, month - 1, 1, 0, 0, 0, 0);
}

function endOfMonth(month: number, year: number) {
  return new Date(year, month, 0, 23, 59, 59, 999);
}

function addMonths(date: Date, delta: number) {
  return new Date(date.getFullYear(), date.getMonth() + delta, 1, 0, 0, 0, 0);
}

function monthLabel(month: number, year: number) {
  return new Date(year, month - 1, 1).toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric',
  });
}

function monthShortLabel(date: Date) {
  return date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }).toUpperCase();
}

function daysBetween(a: Date, b: Date) {
  const diff = a.getTime() - b.getTime();
  return Math.floor(diff / 86400000);
}

function startOfWeekMonday(date: Date) {
  const d = startOfDay(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

function getPeriodStart(date: Date, granularity: Granularity) {
  if (granularity === 'diario') return startOfDay(date);
  if (granularity === 'semanal') return startOfWeekMonday(date);
  return new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
}

function getPeriodLabel(date: Date, granularity: Granularity) {
  if (granularity === 'diario') {
    return date.toLocaleDateString('pt-BR');
  }
  if (granularity === 'semanal') {
    const end = new Date(date);
    end.setDate(end.getDate() + 6);
    return `${date.toLocaleDateString('pt-BR')} - ${end.toLocaleDateString('pt-BR')}`;
  }
  return monthShortLabel(date);
}

function groupByPeriod<T extends Record<string, any>>(
  rows: T[],
  granularity: Granularity,
  getDate: (row: T) => Date,
  mapper: (row: T) => Record<string, number>,
) {
  const buckets = new Map<string, { start: Date; data: Record<string, number> }>();

  for (const row of rows) {
    const date = getDate(row);
    if (!isValidDate(date)) continue;

    const start = getPeriodStart(date, granularity);
    const key = start.toISOString();
    if (!buckets.has(key)) {
      buckets.set(key, { start, data: {} });
    }

    const bucket = buckets.get(key)!;
    const mapped = mapper(row);
    for (const [metric, value] of Object.entries(mapped)) {
      bucket.data[metric] = (bucket.data[metric] || 0) + safeNumber(value);
    }
  }

  return Array.from(buckets.values())
    .sort((a, b) => a.start.getTime() - b.start.getTime())
    .map(({ start, data }) => ({ periodo: getPeriodLabel(start, granularity), periodo_inicio: start, ...data }));
}

function buildTable(headers: string[], rows: (string | number)[][]): TableData {
  return { headers, rows };
}

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values.map(v => v.trim()).filter(Boolean)));
}

function parseMaybeJson(value: any) {
  if (!value) return null;
  if (typeof value === 'object') return value;
  if (typeof value !== 'string') return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function resolveMonthYearFromMessage(message: string, baseDate: Date) {
  const text = normalizeText(message);
  const months = [
    'janeiro', 'fevereiro', 'marco', 'abril', 'maio', 'junho',
    'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
  ];

  if (/m[eê]s passado/.test(text)) {
    const ref = addMonths(baseDate, -1);
    return { mes: ref.getMonth() + 1, ano: ref.getFullYear() };
  }

  if (/este m[eê]s|esse m[eê]s|m[eê]s atual/.test(text)) {
    return { mes: baseDate.getMonth() + 1, ano: baseDate.getFullYear() };
  }

  for (let i = 0; i < months.length; i++) {
    if (text.includes(months[i])) {
      const yearMatch = text.match(/(20\d{2})/);
      return { mes: i + 1, ano: yearMatch ? Number(yearMatch[1]) : baseDate.getFullYear() };
    }
  }

  return { mes: baseDate.getMonth() + 1, ano: baseDate.getFullYear() };
}

function defaultMonthRange(today: Date) {
  return {
    start: startOfMonth(today.getMonth() + 1, today.getFullYear()),
    end: endOfMonth(today.getMonth() + 1, today.getFullYear()),
  };
}

function sanitizeContext(context: Record<string, any>) {
  const entries = Object.entries(context || {})
    .filter(([key, value]) => value !== undefined && value !== null && key !== 'token');
  if (entries.length === 0) return 'Nenhum contexto adicional informado.';
  return entries.map(([key, value]) => `${key}: ${typeof value === 'string' ? value : JSON.stringify(value)}`).join('\n');
}

function normalizeHistory(history: any[]): NormalizedMessage[] {
  return (Array.isArray(history) ? history : [])
    .slice(-20)
    .map((item) => {
      const role: NormalizedMessage['role'] = item?.role === 'assistant' || item?.role === 'ai' ? 'assistant' : 'user';
      const content = typeof item?.content === 'string'
        ? item.content
        : Array.isArray(item?.parts)
          ? item.parts.map((part: any) => part?.text || '').join(' ')
          : typeof item?.text === 'string'
            ? item.text
            : '';
      return { role, content: content.trim() };
    })
    .filter((item) => item.content.length > 0);
}

function historyToText(history: NormalizedMessage[]) {
  if (!history.length) return 'Sem histórico.';
  return history.map((m) => `${m.role === 'user' ? 'Usuário' : 'Dlux'}: ${m.content}`).join('\n');
}

function extractRelevantToolResults(executed: ExecutedTool[]) {
  const primary = executed.find((entry) => entry.result.chart_data || entry.result.table_data) || executed[0];
  const chart_data = primary?.result.chart_data ?? null;
  const table_data = primary?.result.table_data ?? null;
  const suggestions = uniqueStrings(executed.flatMap((entry) => entry.result.suggestions || []));
  const text = primary?.result.text || '';
  return { primary, chart_data, table_data, suggestions, text };
}

function normalizePeriodArgs(periodoInicio?: string, periodoFim?: string, today = new Date()) {
  const defaultRange = defaultMonthRange(today);
  const start = periodoInicio ? toDate(periodoInicio) : defaultRange.start;
  const end = periodoFim ? toDate(periodoFim) : defaultRange.end;
  return {
    start: isValidDate(start) ? startOfDay(start) : defaultRange.start,
    end: isValidDate(end) ? endOfDay(end) : defaultRange.end,
  };
}

function statusProgress(status: string) {
  const s = normalizeText(status || '');
  if (!s) return 0;
  if (['concluded', 'concluido', 'finalizado'].includes(s)) return 100;
  if (['installation', 'instalacao'].includes(s)) return 90;
  if (['production', 'em_producao'].includes(s)) return 80;
  if (['contract', 'contrato'].includes(s)) return 65;
  if (['budget', 'orcamento'].includes(s)) return 55;
  if (['design', 'projeto'].includes(s)) return 45;
  if (['measure', 'medicao'].includes(s)) return 30;
  if (['briefing'].includes(s)) return 20;
  if (['lead'].includes(s)) return 10;
  return 50;
}

function classifyExpenseCode(code: string) {
  const normalized = String(code || '').trim();
  if (normalized.startsWith('1.3.2')) return 'financeira';
  if (normalized.startsWith('2.1') || normalized.startsWith('2.2') || normalized.startsWith('2.4')) return 'custo';
  if (normalized.startsWith('2.3') || normalized.startsWith('2.5')) return 'comercial';
  if (normalized.startsWith('2.6')) return 'administrativa';
  return 'administrativa';
}

function makeSuggestions(kind: ToolName) {
  const suggestions: Record<ToolName, string[]> = {
    getFluxoCaixa: ['Comparar com o mês passado', 'Detalhar títulos vencidos', 'Ver DRE do período'],
    getSaudeFinanceira: ['Ver inadimplência', 'Comparar com o mês anterior', 'Analisar contas em aberto'],
    getDRE: ['Comparar com outro período', 'Listar maiores despesas', 'Ver margem por tipo de projeto'],
    getInadimplencia: ['Detalhar títulos vencidos', 'Gerar lista de cobrança', 'Ver fluxo de recebimentos'],
    getSaldosContas: ['Ver fluxo de caixa', 'Analisar capital de giro', 'Conferir contas a pagar'],
    getTopSKUs: ['Ver curva ABC de clientes', 'Abrir margem por projeto', 'Comparar com o período anterior'],
    getCurvaABCClientes: ['Ver clientes inadimplentes', 'Comparar faturamento mensal', 'Aprofundar top clientes'],
    getPerformanceVendas: ['Comparar com o mês passado', 'Ver ticket médio por tipo de projeto', 'Analisar conversão'],
    getProdutosMaisLucrativos: ['Ver top SKUs vendidos', 'Comparar margem por tipo de projeto', 'Ver custos diretos'],
    getProjetosAndamento: ['Filtrar por status', 'Ver previsão de faturamento', 'Abrir plano de corte'],
    getEstoqueChapas: ['Ver materiais abaixo do mínimo', 'Abrir plano de compras', 'Conferir consumo recente'],
    getPlanosCorteSalvos: ['Abrir o plano mais recente', 'Comparar aproveitamento', 'Gerar nova análise de corte'],
    getComparativoMensal: ['Ver DRE do período', 'Comparar com o trimestre anterior', 'Analisar ticket médio'],
    getPrevisaoFaturamento: ['Comparar com o realizado', 'Ver projetos em andamento', 'Abrir fluxo de caixa projetado'],
    getMargemPorTipoProjeto: ['Comparar com o mês passado', 'Ver SKUs mais lucrativos', 'Analisar projetos em andamento'],
  };
  return suggestions[kind];
}

function toolText(parts: string[]) {
  return parts.filter(Boolean).join('\n');
}

function isGreetingMessage(message: string) {
  const text = normalizeText(message).trim();
  return /^(oi|ola|bom dia|boa tarde|boa noite|e ai|e aí|ei|hello|hi)\b/.test(text);
}

function buildOfflineFallbackText(message: string) {
  const text = normalizeText(message);
  if (isGreetingMessage(message)) {
    return 'Olá. Posso consultar fluxo de caixa, DRE, inadimplência, estoque, projetos, vendas e faturamento. Me diga o que você quer ver.';
  }
  if (text.includes('obrigad')) {
    return 'Por nada. Se quiser, posso continuar consultando os dados do ERP.';
  }
  return 'Posso consultar fluxo de caixa, DRE, inadimplência, estoque, projetos, vendas e faturamento. Faça a pergunta de forma mais específica para eu buscar os dados.';
}

function normalizeMemorySummary(value: any) {
  const text = String(value || '')
    .replace(/\r/g, '')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  if (!text) return '';
  return text.slice(0, 900);
}

async function updatePersistentMemory(params: {
  existingMemory: string;
  message: string;
  assistantText: string;
  context: Record<string, any>;
  toolResultsSummary: string;
  today: Date;
}) {
  const existingMemory = normalizeMemorySummary(params.existingMemory);
  if (!chatModel) return existingMemory;

  try {
    const contextSummary = sanitizeContext(params.context);
    const { text } = await generateText({
      model: chatModel,
      prompt: buildMemoryPrompt({
        currentDate: params.today.toISOString(),
        memorySummary: existingMemory,
        contextSummary,
        userMessage: params.message,
        assistantMessage: params.assistantText,
        toolResultsSummary: params.toolResultsSummary,
      }),
    });

    return normalizeMemorySummary(text) || existingMemory;
  } catch {
    return existingMemory;
  }
}

async function getFluxoCaixa(args: any, ctx: ToolExecutionContext): Promise<AiToolResult> {
  const { mes, ano } = resolveMonthYearFromMessage(ctx.message, ctx.today);
  const selectedMonth = safeNumber(args?.mes) || mes;
  const selectedYear = safeNumber(args?.ano) || ano;
  const granularidade: Granularity = (args?.granularidade || 'mensal') as Granularity;
  const regime: Regime = (args?.regime || 'caixa') as Regime;
  const range = { start: startOfMonth(selectedMonth, selectedYear), end: endOfMonth(selectedMonth, selectedYear) };

  const receitas = regime === 'competencia'
    ? await sql`
        SELECT valor_aberto::numeric as valor, data_competencia as data_ref
        FROM titulos_receber
        WHERE deletado = false
          AND LOWER(COALESCE(status, '')) <> 'cancelado'
          AND data_competencia BETWEEN ${range.start} AND ${range.end}
      `
    : await sql`
        SELECT valor_aberto::numeric as valor, COALESCE(data_pagamento, data_vencimento) as data_ref
        FROM titulos_receber
        WHERE deletado = false
          AND LOWER(COALESCE(status, '')) <> 'cancelado'
          AND COALESCE(data_pagamento, data_vencimento) BETWEEN ${range.start} AND ${range.end}
      `;

  const despesas = regime === 'competencia'
    ? await sql`
        SELECT valor_aberto::numeric as valor, data_competencia as data_ref
        FROM titulos_pagar
        WHERE deletado = false
          AND LOWER(COALESCE(status, '')) <> 'cancelado'
          AND data_competencia BETWEEN ${range.start} AND ${range.end}
      `
    : await sql`
        SELECT valor_aberto::numeric as valor, COALESCE(data_pagamento, data_vencimento) as data_ref
        FROM titulos_pagar
        WHERE deletado = false
          AND LOWER(COALESCE(status, '')) <> 'cancelado'
          AND COALESCE(data_pagamento, data_vencimento) BETWEEN ${range.start} AND ${range.end}
      `;

  const transactions = [
    ...receitas.map((row: any) => ({ date: toDate(row.data_ref), receitas: safeNumber(row.valor), despesas: 0 })),
    ...despesas.map((row: any) => ({ date: toDate(row.data_ref), receitas: 0, despesas: safeNumber(row.valor) })),
  ];

  let periodRows = groupByPeriod(
    transactions,
    granularidade,
    (row) => row.date,
    (row) => ({ receitas: row.receitas, despesas: row.despesas }),
  );

  if (periodRows.length === 0) {
    periodRows = [{ periodo: monthLabel(selectedMonth, selectedYear), periodo_inicio: range.start, receitas: 0, despesas: 0 } as any];
  }

  const saldoInicial = await sql`SELECT COALESCE(SUM(saldo_atual::numeric), 0) as total FROM contas_internas WHERE ativa = true`;
  const saldoBase = safeNumber(saldoInicial[0]?.total);

  let acumulado = saldoBase;
  const chartData = periodRows.map((row: any) => {
    acumulado += safeNumber(row.receitas) - safeNumber(row.despesas);
    return {
      periodo: row.periodo,
      receitas: safeNumber(row.receitas),
      despesas: safeNumber(row.despesas),
      saldo: acumulado,
    };
  });

  const totalReceitas = chartData.reduce((sum, row) => sum + safeNumber(row.receitas), 0);
  const totalDespesas = chartData.reduce((sum, row) => sum + safeNumber(row.despesas), 0);
  const saldoFinal = saldoBase + totalReceitas - totalDespesas;

  const vencidosReceber = await sql`
    SELECT COALESCE(SUM(valor_aberto::numeric), 0) as total
    FROM titulos_receber
    WHERE deletado = false
      AND LOWER(COALESCE(status, '')) IN ('aberto', 'pago_parcial')
      AND data_vencimento < CURRENT_DATE
  `;
  const vencidosPagar = await sql`
    SELECT COALESCE(SUM(valor_aberto::numeric), 0) as total
    FROM titulos_pagar
    WHERE deletado = false
      AND LOWER(COALESCE(status, '')) IN ('aberto', 'pago_parcial')
      AND data_vencimento < CURRENT_DATE
  `;

  const overdueReceber = safeNumber(vencidosReceber[0]?.total);
  const overduePagar = safeNumber(vencidosPagar[0]?.total);

  const tableRows = chartData.map((row) => [
    row.periodo,
    formatMoney(row.receitas),
    formatMoney(row.despesas),
    formatMoney(row.saldo),
  ]);

  return {
    text: toolText([
      `Fluxo de caixa de ${monthLabel(selectedMonth, selectedYear)}.`,
      `Receitas: ${formatMoney(totalReceitas)}.`,
      `Despesas: ${formatMoney(totalDespesas)}.`,
      `Saldo projetado: ${formatMoney(saldoFinal)}.`,
      `Vencidos a receber: ${formatMoney(overdueReceber)} | Vencidos a pagar: ${formatMoney(overduePagar)}.`,
    ]),
    chart_data: {
      type: 'line',
      xKey: 'periodo',
      series: [
        { key: 'receitas', label: 'Receitas', color: '#00A99D' },
        { key: 'despesas', label: 'Despesas', color: '#E2AC00' },
        { key: 'saldo', label: 'Saldo', color: '#8B5CF6' },
      ],
      data: chartData,
      title: 'Fluxo de Caixa',
    },
    table_data: buildTable(['Período', 'Receitas', 'Despesas', 'Saldo'], tableRows),
    suggestions: makeSuggestions('getFluxoCaixa'),
    meta: { saldo_inicial: saldoBase, saldo_final: saldoFinal, vencidos_receber: overdueReceber, vencidos_pagar: overduePagar },
  };
}

async function getSaudeFinanceira(args: any): Promise<AiToolResult> {
  const periodoDias = safeNumber(args?.periodo_dias) || 30;
  const saldoTotal = await sql`SELECT COALESCE(SUM(saldo_atual::numeric), 0) as total FROM contas_internas WHERE ativa = true`;
  const aReceber = await sql`
    SELECT COALESCE(SUM(valor_aberto::numeric), 0) as total
    FROM titulos_receber
    WHERE deletado = false
      AND LOWER(COALESCE(status, '')) IN ('aberto', 'pago_parcial')
  `;
  const aPagar = await sql`
    SELECT COALESCE(SUM(valor_aberto::numeric), 0) as total
    FROM titulos_pagar
    WHERE deletado = false
      AND LOWER(COALESCE(status, '')) IN ('aberto', 'pago_parcial')
  `;
  const estoque = await sql`
    SELECT COALESCE(SUM(estoque_atual::numeric * COALESCE(preco_custo::numeric, 0)), 0) as total
    FROM materiais
    WHERE ativo = true
  `;
  const vencidosReceber = await sql`
    SELECT COALESCE(SUM(valor_aberto::numeric), 0) as total
    FROM titulos_receber
    WHERE deletado = false
      AND LOWER(COALESCE(status, '')) IN ('aberto', 'pago_parcial')
      AND data_vencimento < CURRENT_DATE
  `;
  const vencidosPagar = await sql`
    SELECT COALESCE(SUM(valor_aberto::numeric), 0) as total
    FROM titulos_pagar
    WHERE deletado = false
      AND LOWER(COALESCE(status, '')) IN ('aberto', 'pago_parcial')
      AND data_vencimento < CURRENT_DATE
  `;

  const prazoRecebimento = await sql`
    SELECT COALESCE(AVG(EXTRACT(DAY FROM data_vencimento - data_emissao)), 0) as media
    FROM titulos_receber
    WHERE deletado = false
      AND data_emissao >= CURRENT_DATE - INTERVAL '12 months'
  `;
  const prazoPagamento = await sql`
    SELECT COALESCE(AVG(EXTRACT(DAY FROM data_vencimento - data_emissao)), 0) as media
    FROM titulos_pagar
    WHERE deletado = false
      AND data_emissao >= CURRENT_DATE - INTERVAL '12 months'
  `;

  const saldo = safeNumber(saldoTotal[0]?.total);
  const receber = safeNumber(aReceber[0]?.total);
  const pagar = safeNumber(aPagar[0]?.total);
  const valorEstoque = safeNumber(estoque[0]?.total);
  const vencidoReceber = safeNumber(vencidosReceber[0]?.total);
  const vencidoPagar = safeNumber(vencidosPagar[0]?.total);

  const capitalGiro = saldo + receber + valorEstoque - pagar;
  const liquidezCorrente = pagar > 0 ? (saldo + receber + valorEstoque) / pagar : saldo + receber + valorEstoque;
  const inadimplencia = receber > 0 ? (vencidoReceber / receber) * 100 : 0;
  const analise = capitalGiro < 0 || liquidezCorrente < 1
    ? 'critica'
    : inadimplencia > 10 || liquidezCorrente < 1.5
      ? 'atencao'
      : 'positiva';

  const alertas = [
    inadimplencia > 10 ? 'Inadimplência acima de 10%' : '',
    capitalGiro < 0 ? 'Capital de giro negativo' : 'Capital de giro saudável',
    liquidezCorrente < 1 ? 'Liquidez abaixo de 1,0' : '',
  ].filter(Boolean);

  return {
    text: toolText([
      `Saúde financeira analisada nos últimos ${periodoDias} dias.`,
      `Capital de giro: ${formatMoney(capitalGiro)}.`,
      `Liquidez corrente: ${numberFmt.format(liquidezCorrente)}x.`,
      `Inadimplência: ${formatPercent(inadimplencia)}.`,
      `Prazo médio de recebimento: ${numberFmt.format(safeNumber(prazoRecebimento[0]?.media))} dias.`,
      `Prazo médio de pagamento: ${numberFmt.format(safeNumber(prazoPagamento[0]?.media))} dias.`,
    ]),
    chart_data: null,
    table_data: buildTable(
      ['Indicador', 'Valor'],
      [
        ['Capital de giro', formatMoney(capitalGiro)],
        ['Liquidez corrente', `${numberFmt.format(liquidezCorrente)}x`],
        ['Inadimplência', formatPercent(inadimplencia)],
        ['Saldo em contas', formatMoney(saldo)],
        ['A receber', formatMoney(receber)],
        ['A pagar', formatMoney(pagar)],
        ['Estoque', formatMoney(valorEstoque)],
      ],
    ),
    suggestions: makeSuggestions('getSaudeFinanceira'),
    meta: { capital_giro: capitalGiro, liquidez_corrente: liquidezCorrente, inadimplencia_percentual: inadimplencia, analise, alertas },
  };
}

async function getDRE(args: any): Promise<AiToolResult> {
  const today = new Date();
  const start = args?.data_inicio ? startOfDay(toDate(args.data_inicio)) : startOfMonth(today.getMonth() + 1, today.getFullYear());
  const end = args?.data_fim ? endOfDay(toDate(args.data_fim)) : endOfDay(today);
  const regime: Regime = (args?.regime || 'competencia') as Regime;

  const receitaRows = regime === 'caixa'
    ? await sql`
        SELECT t.valor_original::numeric as valor, COALESCE(t.valor_desconto::numeric, 0) as desconto, COALESCE(cf.codigo, '9.9') as codigo, COALESCE(cf.nome, 'SEM CLASSE') as nome
        FROM titulos_receber t
        LEFT JOIN classes_financeiras cf ON cf.id = t.classe_financeira_id
        WHERE t.deletado = false
          AND LOWER(COALESCE(t.status, '')) IN ('pago', 'recebido')
          AND COALESCE(t.data_pagamento, t.data_vencimento) BETWEEN ${start} AND ${end}
      `
    : await sql`
        SELECT t.valor_original::numeric as valor, COALESCE(t.valor_desconto::numeric, 0) as desconto, COALESCE(cf.codigo, '9.9') as codigo, COALESCE(cf.nome, 'SEM CLASSE') as nome
        FROM titulos_receber t
        LEFT JOIN classes_financeiras cf ON cf.id = t.classe_financeira_id
        WHERE t.deletado = false
          AND LOWER(COALESCE(t.status, '')) <> 'cancelado'
          AND COALESCE(t.data_competencia, t.data_vencimento) BETWEEN ${start} AND ${end}
      `;

  const despesaRows = regime === 'caixa'
    ? await sql`
        SELECT t.valor_original::numeric as valor, COALESCE(t.valor_desconto::numeric, 0) as desconto, COALESCE(cf.codigo, '9.9') as codigo, COALESCE(cf.nome, 'SEM CLASSE') as nome
        FROM titulos_pagar t
        LEFT JOIN classes_financeiras cf ON cf.id = t.classe_financeira_id
        WHERE t.deletado = false
          AND LOWER(COALESCE(t.status, '')) IN ('pago')
          AND COALESCE(t.data_pagamento, t.data_vencimento) BETWEEN ${start} AND ${end}
      `
    : await sql`
        SELECT t.valor_original::numeric as valor, COALESCE(t.valor_desconto::numeric, 0) as desconto, COALESCE(cf.codigo, '9.9') as codigo, COALESCE(cf.nome, 'SEM CLASSE') as nome
        FROM titulos_pagar t
        LEFT JOIN classes_financeiras cf ON cf.id = t.classe_financeira_id
        WHERE t.deletado = false
          AND LOWER(COALESCE(t.status, '')) <> 'cancelado'
          AND COALESCE(t.data_competencia, t.data_vencimento) BETWEEN ${start} AND ${end}
      `;

  const receitaBruta = receitaRows.reduce((sum: number, row: any) => sum + safeNumber(row.valor), 0);
  const deducoes = receitaRows.reduce((sum: number, row: any) => sum + safeNumber(row.desconto), 0);
  const receitaLiquida = receitaBruta - deducoes;

  let cmv = 0;
  let despesasComerciais = 0;
  let despesasAdministrativas = 0;
  let despesasFinanceiras = 0;

  for (const row of despesaRows as any[]) {
    const categoria = classifyExpenseCode(row.codigo);
    const value = safeNumber(row.valor);
    if (categoria === 'custo') cmv += value;
    if (categoria === 'comercial') despesasComerciais += value;
    if (categoria === 'administrativa') despesasAdministrativas += value;
    if (categoria === 'financeira') despesasFinanceiras += value;
  }

  const despesasOperacionais = despesasComerciais + despesasAdministrativas;
  const ebitda = receitaLiquida - cmv - despesasOperacionais;
  const resultadoFinanceiro = 0 - despesasFinanceiras;
  const lucroLiquido = ebitda + resultadoFinanceiro;

  const margemBruta = receitaLiquida > 0 ? (1 - cmv / receitaLiquida) * 100 : 0;
  const margemLiquida = receitaLiquida > 0 ? (lucroLiquido / receitaLiquida) * 100 : 0;

  const chartData = [
    {
      linha: 'Receita líquida',
      valor: receitaLiquida,
      complemento: receitaBruta,
    },
    { linha: 'CMV', valor: cmv, complemento: 0 },
    { linha: 'Despesas operacionais', valor: despesasOperacionais, complemento: 0 },
    { linha: 'Lucro líquido', valor: lucroLiquido, complemento: 0 },
  ];

  return {
    text: toolText([
      `DRE de ${formatDatePt(start)} a ${formatDatePt(end)} (${regime}).`,
      `Receita bruta: ${formatMoney(receitaBruta)}.`,
      `Receita líquida: ${formatMoney(receitaLiquida)}.`,
      `CMV: ${formatMoney(cmv)}.`,
      `EBITDA: ${formatMoney(ebitda)}.`,
      `Lucro líquido: ${formatMoney(lucroLiquido)} (${formatPercent(margemLiquida)}).`,
    ]),
    chart_data: {
      type: 'bar',
      xKey: 'linha',
      series: [{ key: 'valor', label: 'Valor', color: '#00A99D' }],
      data: chartData,
      title: 'DRE',
    },
    table_data: buildTable(
      ['Linha', 'Valor'],
      [
        ['Receita bruta', formatMoney(receitaBruta)],
        ['Deduções', formatMoney(deducoes)],
        ['Receita líquida', formatMoney(receitaLiquida)],
        ['CMV', formatMoney(cmv)],
        ['Despesas comerciais', formatMoney(despesasComerciais)],
        ['Despesas administrativas', formatMoney(despesasAdministrativas)],
        ['EBITDA', formatMoney(ebitda)],
        ['Resultado financeiro', formatMoney(resultadoFinanceiro)],
        ['Lucro líquido', formatMoney(lucroLiquido)],
        ['Margem bruta', formatPercent(margemBruta)],
        ['Margem líquida', formatPercent(margemLiquida)],
      ],
    ),
    suggestions: makeSuggestions('getDRE'),
    meta: { receita_bruta: receitaBruta, receita_liquida: receitaLiquida, cmv, despesas_operacionais: despesasOperacionais, ebitda, lucro_liquido: lucroLiquido },
  };
}

async function getInadimplencia(args: any): Promise<AiToolResult> {
  const limiteDias = safeNumber(args?.limite_dias) || 0;
  const overdue = await sql`
    SELECT
      t.numero_titulo,
      t.cliente_id,
      t.valor_aberto::numeric as valor,
      t.data_vencimento,
      COALESCE(c.nome, 'CLIENTE SEM NOME') as cliente_nome,
      COALESCE(c.telefone, '') as telefone
    FROM titulos_receber t
    LEFT JOIN clients c ON c.id::text = t.cliente_id::text
    WHERE t.deletado = false
      AND LOWER(COALESCE(t.status, '')) IN ('aberto', 'pago_parcial')
      AND t.data_vencimento < CURRENT_DATE - (${limiteDias} * INTERVAL '1 day')
    ORDER BY t.data_vencimento ASC
  `;

  const openTotal = await sql`
    SELECT COALESCE(SUM(valor_aberto::numeric), 0) as total
    FROM titulos_receber
    WHERE deletado = false
      AND LOWER(COALESCE(status, '')) IN ('aberto', 'pago_parcial')
  `;

  const totalVencido = overdue.reduce((sum: number, row: any) => sum + safeNumber(row.valor), 0);
  const totalAberto = safeNumber(openTotal[0]?.total);
  const percentualTotal = totalAberto > 0 ? (totalVencido / totalAberto) * 100 : 0;

  const buckets = [
    { faixa: '0-30 dias', min: 0, max: 30, valor: 0, titulos: 0 },
    { faixa: '31-60 dias', min: 31, max: 60, valor: 0, titulos: 0 },
    { faixa: '61-90 dias', min: 61, max: 90, valor: 0, titulos: 0 },
    { faixa: '90+ dias', min: 91, max: 9999, valor: 0, titulos: 0 },
  ];

  const today = startOfDay(new Date());
  const rankedClients = new Map<string, { cliente: string; valor: number; dias_atraso: number; telefone: string }>();

  for (const row of overdue as any[]) {
    const dias = Math.max(0, daysBetween(today, toDate(row.data_vencimento)));
    const bucket = buckets.find((b) => dias >= b.min && dias <= b.max);
    if (bucket) {
      bucket.valor += safeNumber(row.valor);
      bucket.titulos += 1;
    }

    const key = String(row.cliente_nome || 'CLIENTE SEM NOME');
    const existing = rankedClients.get(key) || { cliente: key, valor: 0, dias_atraso: dias, telefone: String(row.telefone || '') };
    existing.valor += safeNumber(row.valor);
    existing.dias_atraso = Math.max(existing.dias_atraso, dias);
    rankedClients.set(key, existing);
  }

  const clientes = Array.from(rankedClients.values()).sort((a, b) => b.valor - a.valor).slice(0, 10);
  const detailRows = overdue.slice(0, 20).map((row: any) => {
    const dias = Math.max(0, daysBetween(startOfDay(new Date()), toDate(row.data_vencimento)));
    return [
      String(row.numero_titulo || '-'),
      String(row.cliente_nome || 'CLIENTE SEM NOME'),
      formatDatePt(row.data_vencimento),
      `${dias} dias`,
      formatMoney(row.valor),
      String(row.telefone || '-'),
    ];
  });

  const faixaRows = buckets.map((bucket) => ({
    faixa: bucket.faixa,
    valor: bucket.valor,
    percentual: totalVencido > 0 ? (bucket.valor / totalVencido) * 100 : 0,
    titulos: bucket.titulos,
  }));

  return {
    text: toolText([
      `Inadimplência atual: ${formatMoney(totalVencido)} (${formatPercent(percentualTotal)} do total em aberto).`,
      overdue.length > 0 ? `Títulos vencidos listados: ${overdue.length}.` : 'Nenhum título vencido encontrado.',
      clientes.length > 0 ? `Maior cliente inadimplente: ${clientes[0].cliente} com ${formatMoney(clientes[0].valor)}.` : 'Nenhum cliente inadimplente encontrado.',
    ]),
    chart_data: {
      type: 'bar',
      xKey: 'faixa',
      series: [{ key: 'valor', label: 'Valor', color: '#E2AC00' }],
      data: faixaRows,
      title: 'Aging de Inadimplência',
    },
    table_data: buildTable(
      ['Título', 'Cliente', 'Vencimento', 'Atraso', 'Valor', 'Contato'],
      detailRows,
    ),
    suggestions: makeSuggestions('getInadimplencia'),
    meta: { total_vencido: totalVencido, percentual_total: percentualTotal, faixas: faixaRows, clientes_inadimplentes: clientes, titulos_vencidos: overdue.length },
  };
}

async function getSaldosContas(args: any): Promise<AiToolResult> {
  const dataReferencia = args?.data_referencia ? toDate(args.data_referencia) : new Date();
  const contas = await sql`
    SELECT id, nome, tipo, saldo_atual::numeric as saldo
    FROM contas_internas
    WHERE ativa = true
    ORDER BY nome ASC
  `;

  const saldoTotal = contas.reduce((sum: number, row: any) => sum + safeNumber(row.saldo), 0);

  return {
    text: toolText([
      `Saldo total em ${dataReferencia.toLocaleDateString('pt-BR')}: ${formatMoney(saldoTotal)}.`,
      contas.length > 0 ? `Conta com maior saldo: ${String(contas[0].nome)}.` : 'Nenhuma conta ativa encontrada.',
    ]),
    chart_data: {
      type: 'bar',
      xKey: 'nome',
      series: [{ key: 'saldo', label: 'Saldo', color: '#00A99D' }],
      data: contas.map((row: any) => ({ nome: row.nome, saldo: safeNumber(row.saldo) })),
      title: 'Saldos por Conta',
    },
    table_data: buildTable(
      ['Conta', 'Tipo', 'Saldo'],
      contas.map((row: any) => [String(row.nome), String(row.tipo), formatMoney(row.saldo)]),
    ),
    suggestions: makeSuggestions('getSaldosContas'),
    meta: { saldo_total: saldoTotal, contas: contas.map((row: any) => ({ nome: row.nome, tipo: row.tipo, saldo: safeNumber(row.saldo) })) },
  };
}

async function getTopSKUs(args: any, ctx: ToolExecutionContext): Promise<AiToolResult> {
  const { start, end } = normalizePeriodArgs(args?.periodo_inicio, args?.periodo_fim, ctx.today);
  const limit = Math.min(Math.max(safeNumber(args?.limit) || 10, 1), 50);
  const tipo = (args?.tipo || 'valor') as 'quantidade' | 'valor';

  const rows = await sql`
    SELECT
      COALESCE(NULLIF(TRIM(io.material), ''), NULLIF(TRIM(io.descricao), ''), 'ITEM') as nome,
      io.quantidade::numeric as quantidade,
      COALESCE(io.valor_total::numeric, io.valor_unitario::numeric * io.quantidade::numeric, 0) as valor_total
    FROM orcamentos o
    JOIN itens_orcamento io ON io.orcamento_id = o.id
    WHERE LOWER(COALESCE(o.status, '')) = 'aprovado'
      AND COALESCE(o.updated_at, o.created_at) BETWEEN ${start} AND ${end}
  `;

  const grouped = new Map<string, { nome: string; quantidade: number; valor_total: number }>();
  for (const row of rows as any[]) {
    const key = String(row.nome || 'ITEM');
    const existing = grouped.get(key) || { nome: key, quantidade: 0, valor_total: 0 };
    existing.quantidade += safeNumber(row.quantidade);
    existing.valor_total += safeNumber(row.valor_total);
    grouped.set(key, existing);
  }

  const sorted = Array.from(grouped.values()).sort((a, b) => (tipo === 'quantidade' ? b.quantidade - a.quantidade : b.valor_total - a.valor_total)).slice(0, limit);
  const total = sorted.reduce((sum, row) => sum + (tipo === 'quantidade' ? row.quantidade : row.valor_total), 0);

  return {
    text: toolText([
      `Top ${limit} itens mais vendidos no período de ${formatDatePt(start)} a ${formatDatePt(end)}.`,
      sorted.length > 0 ? `Líder: ${sorted[0].nome}.` : 'Nenhum item encontrado no período.',
    ]),
    chart_data: {
      type: 'bar',
      xKey: 'nome',
      series: [{ key: tipo === 'quantidade' ? 'quantidade' : 'valor_total', label: tipo === 'quantidade' ? 'Quantidade' : 'Valor', color: '#8B5CF6' }],
      data: sorted.map((row) => ({
        nome: row.nome,
        quantidade: row.quantidade,
        valor_total: row.valor_total,
        percentual_total: total > 0 ? ((tipo === 'quantidade' ? row.quantidade : row.valor_total) / total) * 100 : 0,
      })),
      title: 'Top SKUs',
    },
    table_data: buildTable(
      ['Item', 'Quantidade', 'Valor total', '%'],
      sorted.map((row) => [row.nome, row.quantidade, formatMoney(row.valor_total), formatPercent(total > 0 ? ((tipo === 'quantidade' ? row.quantidade : row.valor_total) / total) * 100 : 0)]),
    ),
    suggestions: makeSuggestions('getTopSKUs'),
    meta: { periodo: `${formatDatePt(start)} - ${formatDatePt(end)}`, total_itens: sorted.length, total_valor: total },
  };
}

async function getCurvaABCClientes(args: any, ctx: ToolExecutionContext): Promise<AiToolResult> {
  const { start, end } = normalizePeriodArgs(args?.periodo_inicio, args?.periodo_fim, ctx.today);
  const rows = await sql`
    SELECT
      COALESCE(NULLIF(TRIM(c.nome), ''), 'CLIENTE SEM NOME') as cliente,
      SUM(o.valor_final::numeric) as valor
    FROM orcamentos o
    LEFT JOIN clients c ON c.id::text = o.cliente_id::text
    WHERE LOWER(COALESCE(o.status, '')) = 'aprovado'
      AND COALESCE(o.updated_at, o.created_at) BETWEEN ${start} AND ${end}
    GROUP BY 1
    ORDER BY valor DESC
  `;

  const total = rows.reduce((sum: number, row: any) => sum + safeNumber(row.valor), 0);
  let cumulative = 0;
  const ranked = (rows as any[]).map((row) => {
    const valor = safeNumber(row.valor);
    const percentual = total > 0 ? (valor / total) * 100 : 0;
    cumulative += percentual;
    const classe = cumulative <= 80 ? 'A' : cumulative <= 95 ? 'B' : 'C';
    return { cliente: row.cliente, valor, percentual, percentual_acumulado: cumulative, classe };
  });

  const classes = {
    A: ranked.filter((item) => item.classe === 'A'),
    B: ranked.filter((item) => item.classe === 'B'),
    C: ranked.filter((item) => item.classe === 'C'),
  };

  const resumoClasses = [
    { classe: 'A', valor: classes.A.reduce((sum, item) => sum + item.valor, 0) },
    { classe: 'B', valor: classes.B.reduce((sum, item) => sum + item.valor, 0) },
    { classe: 'C', valor: classes.C.reduce((sum, item) => sum + item.valor, 0) },
  ];

  return {
    text: toolText([
      `Curva ABC de clientes no período de ${formatDatePt(start)} a ${formatDatePt(end)}.`,
      `Classe A: ${classes.A.length} clientes.`,
      `Classe B: ${classes.B.length} clientes.`,
      `Classe C: ${classes.C.length} clientes.`,
    ]),
    chart_data: {
      type: 'bar',
      xKey: 'classe',
      series: [{ key: 'valor', label: 'Valor', color: '#00A99D' }],
      data: resumoClasses,
      title: 'Curva ABC',
    },
    table_data: buildTable(
      ['Cliente', 'Valor', '%', '% acumulado', 'Classe'],
      ranked.map((row) => [row.cliente, formatMoney(row.valor), formatPercent(row.percentual), formatPercent(row.percentual_acumulado), row.classe]),
    ),
    suggestions: makeSuggestions('getCurvaABCClientes'),
    meta: { total_clientes: ranked.length, valor_total_periodo: total, classes: { A: classes.A.length, B: classes.B.length, C: classes.C.length } },
  };
}

async function getPerformanceVendas(args: any, ctx: ToolExecutionContext): Promise<AiToolResult> {
  const { start, end } = normalizePeriodArgs(args?.periodo_inicio, args?.periodo_fim, ctx.today);
  const agrupamento = (args?.agrupamento || 'mes') as 'dia' | 'semana' | 'mes';
  const granularity: Granularity = agrupamento === 'dia' ? 'diario' : agrupamento === 'semana' ? 'semanal' : 'mensal';

  const rows = await sql`
    SELECT
      o.numero,
      o.status,
      o.valor_final::numeric as valor_final,
      COALESCE(o.updated_at, o.created_at) as data_ref
    FROM orcamentos o
    WHERE COALESCE(o.updated_at, o.created_at) BETWEEN ${start} AND ${end}
  `;

  const grouped = groupByPeriod(
    rows as any[],
    granularity,
    (row) => toDate(row.data_ref),
    (row) => ({
      valor_final: normalizeText(String(row.status || '')) === 'aprovado' ? safeNumber(row.valor_final) : 0,
      orcamentos: 1,
      aprovados: normalizeText(String(row.status || '')) === 'aprovado' ? 1 : 0,
    }),
  ).map((row) => ({
    periodo: row.periodo,
    valor: safeNumber((row as any).valor_final),
    orcamentos: safeNumber((row as any).orcamentos),
    aprovados: safeNumber((row as any).aprovados),
  }));

  const totalValor = grouped.reduce((sum, row) => sum + row.valor, 0);
  const totalOrcamentos = grouped.reduce((sum, row) => sum + row.orcamentos, 0);
  const totalAprovados = grouped.reduce((sum, row) => sum + row.aprovados, 0);
  const ticketMedio = totalAprovados > 0 ? totalValor / totalAprovados : 0;
  const taxaConversao = totalOrcamentos > 0 ? (totalAprovados / totalOrcamentos) * 100 : 0;

  return {
    text: toolText([
      `Performance de vendas no período de ${formatDatePt(start)} a ${formatDatePt(end)}.`,
      `Faturamento aprovado: ${formatMoney(totalValor)}.`,
      `Ticket médio: ${formatMoney(ticketMedio)}.`,
      `Conversão: ${formatPercent(taxaConversao)}.`,
    ]),
    chart_data: {
      type: 'line',
      xKey: 'periodo',
      series: [
        { key: 'valor', label: 'Valor aprovado', color: '#00A99D' },
        { key: 'orcamentos', label: 'Orçamentos', color: '#E2AC00' },
      ],
      data: grouped,
      title: 'Performance de Vendas',
    },
    table_data: buildTable(
      ['Período', 'Valor aprovado', 'Orçamentos', 'Aprovados', 'Conversão'],
      grouped.map((row) => [row.periodo, formatMoney(row.valor), row.orcamentos, row.aprovados, formatPercent(row.orcamentos > 0 ? (row.aprovados / row.orcamentos) * 100 : 0)]),
    ),
    suggestions: makeSuggestions('getPerformanceVendas'),
    meta: { valor_total: totalValor, quantidade_orcamentos: totalOrcamentos, ticket_medio: ticketMedio, taxa_conversao: taxaConversao, evolucao: grouped },
  };
}

async function getProdutosMaisLucrativos(args: any, ctx: ToolExecutionContext): Promise<AiToolResult> {
  const { start, end } = normalizePeriodArgs(args?.periodo_inicio, args?.periodo_fim, ctx.today);
  const limit = Math.min(Math.max(safeNumber(args?.limit) || 10, 1), 50);

  const rows = await sql`
    SELECT
      COALESCE(NULLIF(TRIM(io.material), ''), NULLIF(TRIM(io.descricao), ''), 'ITEM') as nome,
      io.quantidade::numeric as quantidade,
      COALESCE(io.valor_total::numeric, io.valor_unitario::numeric * io.quantidade::numeric, 0) as receita_total,
      COALESCE(m.preco_custo::numeric, io.valor_unitario::numeric * 0.6, 0) as custo_unitario
    FROM orcamentos o
    JOIN itens_orcamento io ON io.orcamento_id = o.id
    LEFT JOIN materiais m ON LOWER(TRIM(m.nome)) = LOWER(TRIM(io.material))
    WHERE LOWER(COALESCE(o.status, '')) = 'aprovado'
      AND COALESCE(o.updated_at, o.created_at) BETWEEN ${start} AND ${end}
  `;

  const grouped = new Map<string, { nome: string; quantidade: number; receita_total: number; custo_total: number; lucro_bruto: number; margem: number }>();

  for (const row of rows as any[]) {
    const nome = String(row.nome || 'ITEM');
    const quantidade = safeNumber(row.quantidade);
    const receita = safeNumber(row.receita_total);
    const custoUnit = safeNumber(row.custo_unitario);
    const custo = custoUnit > 0 ? custoUnit * quantidade : receita * 0.6;
    const existing = grouped.get(nome) || { nome, quantidade: 0, receita_total: 0, custo_total: 0, lucro_bruto: 0, margem: 0 };
    existing.quantidade += quantidade;
    existing.receita_total += receita;
    existing.custo_total += custo;
    existing.lucro_bruto = existing.receita_total - existing.custo_total;
    existing.margem = existing.receita_total > 0 ? (existing.lucro_bruto / existing.receita_total) * 100 : 0;
    grouped.set(nome, existing);
  }

  const ordered = Array.from(grouped.values()).sort((a, b) => b.lucro_bruto - a.lucro_bruto).slice(0, limit);

  return {
    text: toolText([
      `Produtos mais lucrativos no período de ${formatDatePt(start)} a ${formatDatePt(end)}.`,
      ordered.length > 0 ? `Mais rentável: ${ordered[0].nome} com ${formatMoney(ordered[0].lucro_bruto)} de lucro bruto.` : 'Nenhum item encontrado no período.',
    ]),
    chart_data: {
      type: 'bar',
      xKey: 'nome',
      series: [{ key: 'lucro_bruto', label: 'Lucro bruto', color: '#8B5CF6' }],
      data: ordered,
      title: 'Produtos Mais Lucrativos',
    },
    table_data: buildTable(
      ['Item', 'Quantidade', 'Receita', 'Custo', 'Lucro bruto', 'Margem'],
      ordered.map((row) => [row.nome, row.quantidade, formatMoney(row.receita_total), formatMoney(row.custo_total), formatMoney(row.lucro_bruto), formatPercent(row.margem)]),
    ),
    suggestions: makeSuggestions('getProdutosMaisLucrativos'),
    meta: { produtos: ordered },
  };
}

async function getProjetosAndamento(args: any, ctx: ToolExecutionContext): Promise<AiToolResult> {
  const requestedStatuses = Array.isArray(args?.status) ? args.status.map((s: any) => normalizeText(String(s))) : [];
  const rows = await sql`
    SELECT
      id,
      client_name,
      ambiente,
      descricao,
      valor_estimado::numeric as valor_estimado,
      valor_final::numeric as valor_final,
      prazo_entrega,
      status,
      responsavel,
      observacoes,
      created_at,
      updated_at
    FROM projects
    ORDER BY updated_at DESC, created_at DESC
  `;

  const filtered = (rows as any[]).filter((row) => {
    const status = normalizeText(String(row.status || ''));
    if (requestedStatuses.length > 0) return requestedStatuses.includes(status);
    return !['concluded', 'concluido'].includes(status);
  });

  const today = startOfDay(ctx.today);
  const data = filtered.slice(0, 20).map((row) => {
    const prazo = toDate(row.prazo_entrega);
    const dias = isValidDate(prazo) ? daysBetween(startOfDay(prazo), today) : 0;
    const progress = statusProgress(String(row.status || ''));
    return {
      id: row.id,
      cliente: row.client_name,
      ambiente: row.ambiente,
      descricao: row.descricao,
      status: row.status,
      valor: safeNumber(row.valor_final || row.valor_estimado),
      prazo_entrega: isValidDate(prazo) ? prazo.toISOString() : null,
      dias_ate_entrega: dias,
      percentual_concluido: progress,
    };
  });

  return {
    text: toolText([
      `Projetos em andamento: ${data.length}.`,
      data.length > 0 ? `Mais próximo da entrega: ${data.slice().sort((a, b) => a.dias_ate_entrega - b.dias_ate_entrega)[0].descricao || data[0].ambiente}.` : 'Nenhum projeto em andamento encontrado.',
    ]),
    chart_data: null,
    table_data: buildTable(
      ['Cliente', 'Projeto', 'Status', 'Valor', 'Prazo', 'Dias', '%'],
      data.map((row) => [row.cliente || '-', row.descricao || row.ambiente || '-', row.status, formatMoney(row.valor), row.prazo_entrega ? formatDatePt(row.prazo_entrega) : '-', row.dias_ate_entrega, formatPercent(row.percentual_concluido)]),
    ),
    suggestions: makeSuggestions('getProjetosAndamento'),
    meta: { total_projetos: data.length, projetos: data },
  };
}

async function getEstoqueChapas(args: any): Promise<AiToolResult> {
  const tipo = normalizeText(String(args?.tipo || ''));
  const rows = await sql`
    SELECT id, sku, nome, estoque_atual::numeric as estoque_atual, estoque_minimo::numeric as estoque_minimo, preco_custo::numeric as preco_custo, unidade_uso
    FROM materiais
    WHERE ativo = true
  `;

  const filtered = (rows as any[]).filter((row) => {
    const name = normalizeText(String(row.nome || ''));
    const sku = normalizeText(String(row.sku || ''));
    const category = normalizeText(String(row.categoria_id || ''));
    if (!tipo) {
      return name.includes('mdf') || name.includes('mdp') || name.includes('compens') || category.includes('chp') || category.includes('chapa');
    }
    return name.includes(tipo) || sku.includes(tipo) || category.includes(tipo);
  });

  const mapped = filtered.map((row) => {
    const estoqueAtual = safeNumber(row.estoque_atual);
    const estoqueMinimo = safeNumber(row.estoque_minimo);
    const valorUnitario = safeNumber(row.preco_custo);
    const valorTotal = estoqueAtual * valorUnitario;
    const status = estoqueAtual <= estoqueMinimo * 0.5 ? 'critico' : estoqueAtual <= estoqueMinimo ? 'baixo' : 'ok';
    return {
      sku: row.sku,
      nome: row.nome,
      quantidade: estoqueAtual,
      valor_unitario: valorUnitario,
      valor_total: valorTotal,
      ponto_reposicao: estoqueMinimo,
      status,
      unidade: row.unidade_uso,
    };
  });

  const alertas = mapped.filter((item) => item.status !== 'ok').map((item) => `${item.nome} abaixo do ponto de reposição`);
  const valorTotalEstoque = mapped.reduce((sum, item) => sum + item.valor_total, 0);

  return {
    text: toolText([
      `Estoque de chapas avaliado: ${mapped.length} itens.`,
      `Valor total do estoque: ${formatMoney(valorTotalEstoque)}.`,
      alertas.length > 0 ? `Alertas: ${alertas[0]}.` : 'Nenhum alerta crítico encontrado.',
    ]),
    chart_data: {
      type: 'bar',
      xKey: 'nome',
      series: [{ key: 'quantidade', label: 'Quantidade', color: '#00A99D' }],
      data: mapped.slice().sort((a, b) => a.quantidade - b.quantidade).slice(0, 12),
      title: 'Estoque de Chapas',
    },
    table_data: buildTable(
      ['SKU', 'Item', 'Qtd', 'Ponto', 'Valor total', 'Status'],
      mapped.map((row) => [row.sku, row.nome, row.quantidade, row.ponto_reposicao, formatMoney(row.valor_total), row.status]),
    ),
    suggestions: makeSuggestions('getEstoqueChapas'),
    meta: { valor_total_estoque: valorTotalEstoque, itens: mapped, alertas },
  };
}

async function getPlanosCorteSalvos(args: any): Promise<AiToolResult> {
  const limit = Math.min(Math.max(safeNumber(args?.limite) || 10, 1), 50);
  try {
    const rows = await sql`
      SELECT id, nome, sku_engenharia, materiais, resultado, created_at, updated_at
      FROM planos_de_corte
      ORDER BY created_at DESC
      LIMIT ${limit}
    `;

    const mapped = (rows as any[]).map((row) => {
      const resultado = parseMaybeJson(row.resultado);
      const materiais = parseMaybeJson(row.materiais) || [];
      const layouts = Array.isArray(resultado?.layouts) ? resultado.layouts : [];
      const kpis = resultado?.kpis || resultado?.KPIs || {};
      const chapasNecessarias = safeNumber(kpis.chapas_necessarias) || safeNumber(kpis.chapas) || layouts.length || materiais.length || 0;
      const aproveitamento = safeNumber(kpis.aproveitamento_medio) || safeNumber(kpis.aproveitamento) || safeNumber(resultado?.aproveitamento) || 0;

      return {
        id: row.id,
        nome: row.nome,
        sku_engenharia: row.sku_engenharia,
        chapas_necessarias: chapasNecessarias,
        aproveitamento,
        created_at: row.created_at,
      };
    });

    return {
      text: toolText([
        `Planos de corte salvos encontrados: ${mapped.length}.`,
        mapped.length > 0 ? `Plano mais recente: ${mapped[0].nome}.` : 'Nenhum plano salvo encontrado.',
      ]),
      chart_data: {
        type: 'bar',
        xKey: 'nome',
        series: [{ key: 'aproveitamento', label: 'Aproveitamento %', color: '#E2AC00' }],
        data: mapped.map((row) => ({ ...row })),
        title: 'Planos de Corte',
      },
      table_data: buildTable(
        ['Plano', 'SKU', 'Chapas', 'Aproveitamento', 'Created at'],
        mapped.map((row) => [row.nome, row.sku_engenharia || '-', row.chapas_necessarias, formatPercent(row.aproveitamento), formatDatePt(row.created_at)]),
      ),
      suggestions: makeSuggestions('getPlanosCorteSalvos'),
      meta: { total: mapped.length, planos: mapped },
    };
  } catch {
    return {
      text: 'Nenhum plano de corte pôde ser lido no momento.',
      chart_data: null,
      table_data: buildTable(['Plano', 'SKU', 'Chapas', 'Aproveitamento', 'Criado em'], []),
      suggestions: makeSuggestions('getPlanosCorteSalvos'),
      meta: { total: 0, planos: [] },
    };
  }
}

async function getComparativoMensal(args: any, ctx: ToolExecutionContext): Promise<AiToolResult> {
  const currentMonth = safeNumber(args?.mes_atual) || (ctx.today.getMonth() + 1);
  const currentYear = safeNumber(args?.ano_atual) || ctx.today.getFullYear();
  const monthsToCompare = Math.min(Math.max(safeNumber(args?.meses_comparar) || 3, 1), 12);
  const monthRefs = Array.from({ length: monthsToCompare }, (_, idx) => {
    const ref = new Date(currentYear, currentMonth - 1 - (monthsToCompare - 1 - idx), 1);
    return { mes: ref.getMonth() + 1, ano: ref.getFullYear(), start: startOfMonth(ref.getMonth() + 1, ref.getFullYear()), end: endOfMonth(ref.getMonth() + 1, ref.getFullYear()) };
  });

  const revenueRows = await sql`
    SELECT valor_aberto::numeric as valor, data_competencia as data_ref
    FROM titulos_receber
    WHERE deletado = false
      AND LOWER(COALESCE(status, '')) <> 'cancelado'
      AND data_competencia BETWEEN ${monthRefs[0].start} AND ${monthRefs[monthRefs.length - 1].end}
  `;
  const expenseRows = await sql`
    SELECT valor_aberto::numeric as valor, data_competencia as data_ref
    FROM titulos_pagar
    WHERE deletado = false
      AND LOWER(COALESCE(status, '')) <> 'cancelado'
      AND data_competencia BETWEEN ${monthRefs[0].start} AND ${monthRefs[monthRefs.length - 1].end}
  `;
  const projectRows = await sql`
    SELECT created_at as data_ref, valor_final::numeric as valor_final, valor_base::numeric as valor_base
    FROM projects
    WHERE created_at BETWEEN ${monthRefs[0].start} AND ${monthRefs[monthRefs.length - 1].end}
  `;
  const budgetRows = await sql`
    SELECT COALESCE(o.updated_at, o.created_at) as data_ref, o.valor_final::numeric as valor_final
    FROM orcamentos o
    WHERE LOWER(COALESCE(o.status, '')) = 'aprovado'
      AND COALESCE(o.updated_at, o.created_at) BETWEEN ${monthRefs[0].start} AND ${monthRefs[monthRefs.length - 1].end}
  `;

  const monthly = monthRefs.map((monthRef) => {
    const receitas = revenueRows.filter((row: any) => {
      const d = toDate(row.data_ref);
      return d.getMonth() + 1 === monthRef.mes && d.getFullYear() === monthRef.ano;
    }).reduce((sum: number, row: any) => sum + safeNumber(row.valor), 0);

    const despesas = expenseRows.filter((row: any) => {
      const d = toDate(row.data_ref);
      return d.getMonth() + 1 === monthRef.mes && d.getFullYear() === monthRef.ano;
    }).reduce((sum: number, row: any) => sum + safeNumber(row.valor), 0);

    const projetos = projectRows.filter((row: any) => {
      const d = toDate(row.data_ref);
      return d.getMonth() + 1 === monthRef.mes && d.getFullYear() === monthRef.ano;
    });

    const orcamentos = budgetRows.filter((row: any) => {
      const d = toDate(row.data_ref);
      return d.getMonth() + 1 === monthRef.mes && d.getFullYear() === monthRef.ano;
    });

    const aprovados = orcamentos.length;
    const valorAprovado = orcamentos.reduce((sum: number, row: any) => sum + safeNumber(row.valor_final), 0);
    const ticketMedio = aprovados > 0 ? valorAprovado / aprovados : 0;

    return {
      periodo: monthLabel(monthRef.mes, monthRef.ano),
      receitas,
      despesas,
      lucro: receitas - despesas,
      ticket_medio: ticketMedio,
      quantidade_projetos: projetos.length,
      quantidade_orcamentos: orcamentos.length,
    };
  });

  return {
    text: toolText([
      `Comparativo mensal dos últimos ${monthsToCompare} meses.`,
      monthly.length > 0 ? `Último período: ${monthly[monthly.length - 1].periodo}.` : 'Sem dados comparativos disponíveis.',
    ]),
    chart_data: {
      type: 'line',
      xKey: 'periodo',
      series: [
        { key: 'receitas', label: 'Receitas', color: '#00A99D' },
        { key: 'despesas', label: 'Despesas', color: '#E2AC00' },
        { key: 'lucro', label: 'Lucro', color: '#8B5CF6' },
      ],
      data: monthly,
      title: 'Comparativo Mensal',
    },
    table_data: buildTable(
      ['Período', 'Receitas', 'Despesas', 'Lucro', 'Ticket médio', 'Projetos'],
      monthly.map((row) => [row.periodo, formatMoney(row.receitas), formatMoney(row.despesas), formatMoney(row.lucro), formatMoney(row.ticket_medio), row.quantidade_projetos]),
    ),
    suggestions: makeSuggestions('getComparativoMensal'),
    meta: { comparativo: monthly },
  };
}

async function getPrevisaoFaturamento(args: any, ctx: ToolExecutionContext): Promise<AiToolResult> {
  const monthsFuture = Math.min(Math.max(safeNumber(args?.meses_futuros) || 3, 1), 12);
  const historyMonths = 6;
  const monthRefs = Array.from({ length: historyMonths }, (_, idx) => {
    const ref = addMonths(ctx.today, -(historyMonths - 1 - idx));
    return { mes: ref.getMonth() + 1, ano: ref.getFullYear(), start: startOfMonth(ref.getMonth() + 1, ref.getFullYear()), end: endOfMonth(ref.getMonth() + 1, ref.getFullYear()) };
  });

  const revenueRows = await sql`
    SELECT COALESCE(data_pagamento, data_competencia) as data_ref, valor_original::numeric as valor
    FROM titulos_receber
    WHERE deletado = false
      AND LOWER(COALESCE(status, '')) IN ('pago', 'recebido')
      AND COALESCE(data_pagamento, data_competencia) BETWEEN ${monthRefs[0].start} AND ${monthRefs[monthRefs.length - 1].end}
  `;

  const budgetRows = await sql`
    SELECT COALESCE(o.updated_at, o.created_at) as data_ref, o.valor_final::numeric as valor_final, o.cliente_id, o.id as orcamento_id
    FROM orcamentos o
    WHERE LOWER(COALESCE(o.status, '')) = 'aprovado'
      AND COALESCE(o.updated_at, o.created_at) BETWEEN ${monthRefs[0].start} AND ${monthRefs[monthRefs.length - 1].end}
  `;

  const currentRevenue = revenueRows.filter((row: any) => {
    const d = toDate(row.data_ref);
    return d.getMonth() === ctx.today.getMonth() && d.getFullYear() === ctx.today.getFullYear();
  }).reduce((sum: number, row: any) => sum + safeNumber(row.valor), 0);

  const monthlyHistory = monthRefs.map((monthRef) => {
    const realized = revenueRows.filter((row: any) => {
      const d = toDate(row.data_ref);
      return d.getMonth() + 1 === monthRef.mes && d.getFullYear() === monthRef.ano;
    }).reduce((sum: number, row: any) => sum + safeNumber(row.valor), 0);

    const approved = budgetRows.filter((row: any) => {
      const d = toDate(row.data_ref);
      return d.getMonth() + 1 === monthRef.mes && d.getFullYear() === monthRef.ano;
    }).reduce((sum: number, row: any) => sum + safeNumber(row.valor_final), 0);

    return {
      periodo: monthLabel(monthRef.mes, monthRef.ano),
      realizado: realized,
      previsto: realized + approved,
    };
  });

  const recentAverage = monthlyHistory.slice(-3).reduce((sum, row) => sum + safeNumber(row.realizado), 0) / Math.max(1, Math.min(3, monthlyHistory.length));
  const pipeline = budgetRows.reduce((sum: number, row: any) => sum + safeNumber(row.valor_final), 0);
  const forecastBase = recentAverage + pipeline * 0.5;

  const futureSeries = Array.from({ length: monthsFuture }, (_, idx) => {
    const ref = addMonths(ctx.today, idx + 1);
    return {
      periodo: monthLabel(ref.getMonth() + 1, ref.getFullYear()),
      realizado: null,
      previsto: forecastBase * (1 + idx * 0.05),
    };
  });

  const chartData = [...monthlyHistory.slice(-3), ...futureSeries.slice(0, monthsFuture)];
  const nextMonthForecast = futureSeries[0]?.previsto || forecastBase;

  return {
    text: toolText([
      `Previsão de faturamento montada com ${monthsFuture} meses à frente.`,
      `Mês atual realizado: ${formatMoney(currentRevenue)}.`,
      `Base de previsão: ${formatMoney(forecastBase)}.`,
      `Pipeline aprovado não faturado: ${formatMoney(pipeline)}.`,
    ]),
    chart_data: {
      type: 'line',
      xKey: 'periodo',
      series: [
        { key: 'realizado', label: 'Realizado', color: '#00A99D' },
        { key: 'previsto', label: 'Previsto', color: '#8B5CF6' },
      ],
      data: chartData,
      title: 'Previsão de Faturamento',
    },
    table_data: buildTable(
      ['Período', 'Realizado', 'Previsto'],
      chartData.map((row) => [row.periodo, row.realizado !== null ? formatMoney(row.realizado) : '-', formatMoney(row.previsto)]),
    ),
    suggestions: makeSuggestions('getPrevisaoFaturamento'),
    meta: { mes_atual: { realizado: currentRevenue, previsto: forecastBase }, proximo_mes: { previsto: nextMonthForecast } },
  };
}

async function getMargemPorTipoProjeto(args: any, ctx: ToolExecutionContext): Promise<AiToolResult> {
  const { start, end } = normalizePeriodArgs(args?.periodo_inicio, args?.periodo_fim, ctx.today);
  const rows = await sql`
    SELECT
      COALESCE(NULLIF(TRIM(p.ambiente), ''), 'GERAL') as tipo,
      COUNT(*) as quantidade,
      SUM(o.valor_final::numeric) as receita_total,
      SUM(o.valor_base::numeric) as custo_total
    FROM orcamentos o
    LEFT JOIN projects p ON p.id::text = o.projeto_id::text
    WHERE LOWER(COALESCE(o.status, '')) = 'aprovado'
      AND COALESCE(o.updated_at, o.created_at) BETWEEN ${start} AND ${end}
    GROUP BY 1
    ORDER BY receita_total DESC
  `;

  const mapped = (rows as any[]).map((row) => {
    const receita = safeNumber(row.receita_total);
    const custo = safeNumber(row.custo_total);
    const margem = receita > 0 ? ((receita - custo) / receita) * 100 : 0;
    const ticketMedio = safeNumber(row.quantidade) > 0 ? receita / safeNumber(row.quantidade) : 0;
    return { tipo: row.tipo, quantidade: safeNumber(row.quantidade), receita_total: receita, custo_total: custo, margem, ticket_medio: ticketMedio };
  });

  return {
    text: toolText([
      `Margem por tipo de projeto no período de ${formatDatePt(start)} a ${formatDatePt(end)}.`,
      mapped.length > 0 ? `Melhor margem: ${mapped[0].tipo}.` : 'Nenhum projeto encontrado no período.',
    ]),
    chart_data: {
      type: 'bar',
      xKey: 'tipo',
      series: [{ key: 'margem', label: 'Margem %', color: '#00A99D' }],
      data: mapped,
      title: 'Margem por Tipo de Projeto',
    },
    table_data: buildTable(
      ['Tipo', 'Qtd', 'Receita', 'Custo', 'Margem', 'Ticket médio'],
      mapped.map((row) => [row.tipo, row.quantidade, formatMoney(row.receita_total), formatMoney(row.custo_total), formatPercent(row.margem), formatMoney(row.ticket_medio)]),
    ),
    suggestions: makeSuggestions('getMargemPorTipoProjeto'),
    meta: { tipos: mapped },
  };
}

const TOOL_HANDLERS: Record<ToolName, (args: any, ctx: ToolExecutionContext) => Promise<AiToolResult>> = {
  getFluxoCaixa,
  getSaudeFinanceira,
  getDRE,
  getInadimplencia,
  getSaldosContas,
  getTopSKUs,
  getCurvaABCClientes,
  getPerformanceVendas,
  getProdutosMaisLucrativos,
  getProjetosAndamento,
  getEstoqueChapas,
  getPlanosCorteSalvos,
  getComparativoMensal,
  getPrevisaoFaturamento,
  getMargemPorTipoProjeto,
};

function buildToolGuide() {
  return TOOL_NAMES
    .map((name) => `- ${name}: ${TOOL_CATALOG[name].description} (args: ${TOOL_CATALOG[name].hint})`)
    .join('\n');
}

function inferFallbackCalls(message: string, today: Date): ToolCall[] {
  const text = normalizeText(message);
  const monthYear = resolveMonthYearFromMessage(message, today);
  const start = startOfMonth(monthYear.mes, monthYear.ano).toISOString();
  const end = endOfMonth(monthYear.mes, monthYear.ano).toISOString();

  if (text.includes('fluxo de caixa') || (text.includes('caixa') && text.includes('fluxo'))) {
    return [{ name: 'getFluxoCaixa', args: { mes: monthYear.mes, ano: monthYear.ano, granularidade: 'mensal', regime: 'caixa' } }];
  }
  if (text.includes('saude financeira') || text.includes('saúde financeira') || text.includes('capital de giro') || text.includes('liquidez')) {
    return [{ name: 'getSaudeFinanceira', args: {} }];
  }
  if (text.includes('dre') || text.includes('margem bruta') || text.includes('lucro líquido') || text.includes('lucro liquido')) {
    return [{ name: 'getDRE', args: { data_inicio: start, data_fim: end, regime: text.includes('caixa') ? 'caixa' : 'competencia' } }];
  }
  if (text.includes('inadimpl')) {
    return [{ name: 'getInadimplencia', args: {} }];
  }
  if (text.includes('saldo') && text.includes('cont')) {
    return [{ name: 'getSaldosContas', args: {} }];
  }
  if (text.includes('top') && (text.includes('sku') || text.includes('produto') || text.includes('vendid'))) {
    return [{ name: 'getTopSKUs', args: { periodo_inicio: start, periodo_fim: end, limit: 10, tipo: text.includes('quantidade') ? 'quantidade' : 'valor' } }];
  }
  if (text.includes('curva abc') || text.includes('abc de clientes')) {
    return [{ name: 'getCurvaABCClientes', args: { periodo_inicio: start, periodo_fim: end } }];
  }
  if (text.includes('performance') || text.includes('conversao') || text.includes('conversão') || text.includes('ticket medio') || text.includes('ticket médio') || text.includes('vendas')) {
    return [{ name: 'getPerformanceVendas', args: { periodo_inicio: start, periodo_fim: end, agrupamento: 'mes' } }];
  }
  if (text.includes('mais lucrat') || text.includes('margem por produto') || text.includes('produtos mais lucrativos')) {
    return [{ name: 'getProdutosMaisLucrativos', args: { periodo_inicio: start, periodo_fim: end, limit: 10 } }];
  }
  if (text.includes('projeto') && (text.includes('andamento') || text.includes('aberto') || text.includes('em producao') || text.includes('em produção'))) {
    return [{ name: 'getProjetosAndamento', args: {} }];
  }
  if (text.includes('estoque') && (text.includes('chapa') || text.includes('mdf') || text.includes('mdp') || text.includes('compens'))) {
    return [{ name: 'getEstoqueChapas', args: { tipo: text.includes('mdf') ? 'MDF' : text.includes('mdp') ? 'MDP' : text.includes('compens') ? 'COMPENSADO' : '' } }];
  }
  if (text.includes('plano de corte') || text.includes('corte salvo')) {
    return [{ name: 'getPlanosCorteSalvos', args: { limite: 10 } }];
  }
  if (text.includes('comparativo') || text.includes('comparar')) {
    return [{ name: 'getComparativoMensal', args: { mes_atual: monthYear.mes, ano_atual: monthYear.ano, meses_comparar: 3 } }];
  }
  if (text.includes('previs') || text.includes('forecast') || text.includes('faturamento futuro')) {
    return [{ name: 'getPrevisaoFaturamento', args: { meses_futuros: 3 } }];
  }
  if (text.includes('margem') && text.includes('tipo de projeto')) {
    return [{ name: 'getMargemPorTipoProjeto', args: { periodo_inicio: start, periodo_fim: end } }];
  }

  return [];
}

async function selectRoutePlan(message: string, history: NormalizedMessage[], memorySummary: string, context: Record<string, any>, today: Date) {
  if (!chatModel) {
    return {
      response_mode: inferFallbackCalls(message, today).length > 0 ? 'tools' : 'direct',
      needs_clarification: false,
      clarification_question: null,
      tool_calls: inferFallbackCalls(message, today),
    };
  }

  try {
    const historySummary = historyToText(history);
    const contextSummary = sanitizeContext(context);
    const { object } = await generateObject({
      model: chatModel,
      schema: z.object({
        response_mode: z.enum(['direct', 'tools', 'clarify']).default('tools'),
        needs_clarification: z.boolean(),
        clarification_question: z.string().nullable().optional(),
        tool_calls: z.array(
          z.object({
            name: z.enum(TOOL_NAMES),
            args: z.record(z.string(), z.any()).default({}),
          }),
        ).default([]),
      }),
      prompt: buildRouterPrompt({
        currentDate: today.toISOString(),
        memorySummary,
        contextSummary,
        historySummary,
        message,
        toolGuide: buildToolGuide(),
      }),
    });

    const selected = object as { response_mode?: 'direct' | 'tools' | 'clarify'; needs_clarification: boolean; clarification_question?: string | null; tool_calls: ToolCall[] };
    if (selected.response_mode === 'direct') {
      selected.needs_clarification = false;
      selected.clarification_question = null;
      selected.tool_calls = [];
      return selected;
    }

    if (selected.response_mode === 'clarify') {
      selected.tool_calls = [];
      selected.needs_clarification = true;
      if (!selected.clarification_question) {
        selected.clarification_question = 'Pode me dar mais detalhes para eu buscar a resposta certa?';
      }
      return selected;
    }

    if (!selected.tool_calls || selected.tool_calls.length === 0) {
      const fallback = inferFallbackCalls(message, today);
      if (fallback.length > 0) {
        selected.tool_calls = fallback;
      }
    }

    if (!selected.tool_calls || selected.tool_calls.length === 0) {
      selected.response_mode = 'direct';
      selected.needs_clarification = false;
      selected.clarification_question = null;
    }

    return selected;
  } catch {
    return {
      response_mode: inferFallbackCalls(message, today).length > 0 ? 'tools' : 'direct',
      needs_clarification: false,
      clarification_question: null,
      tool_calls: inferFallbackCalls(message, today),
    };
  }
}

async function executePlan(plan: { tool_calls: ToolCall[] }, ctx: ToolExecutionContext): Promise<ExecutedTool[]> {
  const normalizedCalls = plan.tool_calls
    .filter((call) => TOOL_HANDLERS[call.name])
    .map((call) => ({
      name: call.name,
      args: TOOL_ARG_SCHEMAS[call.name].parse(call.args || {}),
    }));

  const uniqueCalls = normalizedCalls.filter((call, index, self) => index === self.findIndex((item) => item.name === call.name && JSON.stringify(item.args) === JSON.stringify(call.args)));

  const results = await Promise.all(uniqueCalls.map(async (call) => {
    const result = await TOOL_HANDLERS[call.name](call.args, ctx);
    return { name: call.name, result };
  }));

  return results;
}

async function generateFinalText(message: string, history: NormalizedMessage[], memorySummary: string, context: Record<string, any>, today: Date, executed: ExecutedTool[]) {
  if (!chatModel) {
    return executed[0]?.result.text || buildOfflineFallbackText(message);
  }

  const historySummary = historyToText(history);
  const contextSummary = sanitizeContext(context);

  if (!executed.length) {
    try {
      const { text } = await generateText({
        model: chatModel,
      prompt: buildDirectAnswerPrompt({
        currentDate: today.toISOString(),
        memorySummary,
        contextSummary,
        historySummary,
        message,
      }),
      });

      return (text || '').trim() || buildOfflineFallbackText(message);
    } catch {
      return buildOfflineFallbackText(message);
    }
  }

  const toolResultsSummary = JSON.stringify(
    executed.map((entry) => ({
      tool: entry.name,
      result: {
        text: entry.result.text,
        chart_data: entry.result.chart_data,
        table_data: entry.result.table_data,
        suggestions: entry.result.suggestions,
        meta: entry.result.meta,
      },
    })),
    null,
    2,
  );

  try {
    const { text } = await generateText({
      model: chatModel,
      prompt: buildAnswerPrompt({
        currentDate: today.toISOString(),
        memorySummary,
        contextSummary,
        historySummary,
        message,
        toolResultsSummary,
      }),
    });

    return (text || '').trim() || executed[0]?.result.text || buildOfflineFallbackText(message);
  } catch {
    return executed[0]?.result.text || buildOfflineFallbackText(message);
  }
}

export async function handleAIChat(req: any, res: any) {
  try {
    const { authorized, error } = validateAuth(req);
    if (!authorized) return res.status(401).json({ success: false, error });
    if (req.method !== 'POST') return res.status(405).end();

    await bootstrapFinanceiro();

    const body = req.body || {};
    const message = String(body.message || '').trim();
    if (!message) {
      return res.status(400).json({ success: false, error: 'Mensagem vazia' });
    }

    const history = normalizeHistory(body.conversation_history || body.history || []);
    const context = (body.context || {}) as Record<string, any>;
    const memorySummary = normalizeMemorySummary(body.memory_summary || body.memory || '');
    const today = context.data_atual ? toDate(context.data_atual) : new Date();
    const executionContext: ToolExecutionContext = { today, message, context, history };

    const plan = await selectRoutePlan(message, history, memorySummary, context, today);
    if (plan.needs_clarification && plan.clarification_question && (!plan.tool_calls || plan.tool_calls.length === 0)) {
      return res.status(200).json({
        success: true,
        data: {
          text: plan.clarification_question,
          chart_data: null,
          table_data: null,
          suggestions: [],
          conversation_id: crypto.randomUUID(),
        },
      });
    }

    const executed = await executePlan(plan, executionContext);
    const extracted = extractRelevantToolResults(executed);
    const text = await generateFinalText(message, history, memorySummary, context, today, executed);
    const updatedMemory = await updatePersistentMemory({
      existingMemory: memorySummary,
      message,
      assistantText: text,
      context,
      toolResultsSummary: JSON.stringify(
        executed.map((entry) => ({
          tool: entry.name,
          result: {
            text: entry.result.text,
            chart_data: entry.result.chart_data,
            table_data: entry.result.table_data,
            suggestions: entry.result.suggestions,
            meta: entry.result.meta,
          },
        })),
        null,
        2,
      ),
      today,
    });

    return res.status(200).json({
      success: true,
      data: {
        text,
        content: text,
        chart_data: extracted.chart_data,
        table_data: extracted.table_data,
        suggestions: extracted.suggestions,
        memory_summary: updatedMemory,
        conversation_id: crypto.randomUUID(),
      },
    });
  } catch (err: any) {
    console.error('DLUX_CHAT_ERROR:', err);
    return res.status(500).json({ success: false, error: err.message || 'Erro ao processar mensagem' });
  }
}
