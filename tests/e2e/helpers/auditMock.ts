import type { Page } from '@playwright/test';
import { FAKE_USER } from './auth';

/**
 * Mock genérico para todas as APIs — evita 500 do backend ausente e isola erros de render.
 * Extraído de full-audit.spec.ts para reuso nos testes de regressão visual (TSK-15).
 */
export async function mockAllAPIs(page: Page) {
  await page.route('**/api/**', async (route) => {
    const url = route.request().url();
    if (url.includes('/api/auth')) {
      if (url.includes('action=me') || url.endsWith('/api/auth/me')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: { user: FAKE_USER } }),
        });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: { user: FAKE_USER } }),
      });
      return;
    }
    const method = route.request().method();
    if (method !== 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: { id: `mock-${Date.now()}` } }),
      });
      return;
    }
    let data: any = [];
    const extra: any = {};
    if (url.includes('/api/prospeccao/metrics')) {
      data = {
        funil: [],
        resumo: {
          total: 0,
          ganhos: 0,
          perdidos: 0,
          ativos: 0,
          taxaConversao: 0,
          cicloMedioDias: null,
          ticketMedio: null,
        },
        origens: [],
      };
    } else if (url.includes('/api/prospeccao')) {
      data = [];
    } else if (url.includes('/api/saas-admin/tenants')) {
      data = [];
    } else if (url.includes('/api/checkout/invoices')) {
      data = [];
    } else if (url.includes('/api/checkout')) {
      data = {
        status: 'ativo',
        plano: 'enterprise',
        valor: 197,
        currentPeriodEnd: new Date().toISOString(),
      };
    } else if (url.includes('/api/rentabilidade/kpi')) {
      data = {
        receita_total: 0,
        custo_total: 0,
        margem_total: 0,
        margem_media_percentual: 0,
        variacao_receita: 0,
        variacao_custos: 0,
        variacao_margem: 0,
        variacao_margem_percentual: 0,
      };
    } else if (url.includes('/api/rentabilidade/projetos')) {
      data = { projetos: [] };
    } else if (url.includes('/api/rentabilidade/alertas')) {
      data = { alertas: [] };
    } else if (url.includes('/api/rentabilidade/por-cliente')) {
      data = { clientes: [] };
    } else if (url.includes('/api/rentabilidade/grafico-margem')) {
      data = { dados: [] };
    } else if (url.includes('/api/rentabilidade')) {
      data = {
        receita_total: 0,
        custo_total: 0,
        margem_total: 0,
        margem_media_percentual: 0,
        variacao_receita: 0,
        variacao_custos: 0,
        variacao_margem: 0,
        variacao_margem_percentual: 0,
      };
    } else if (url.includes('/api/kanban/board')) {
      data = { a_fazer: [], em_progresso: [], bloqueado: [], concluido: [] };
    } else if (url.includes('/api/kanban')) {
      data = [];
    } else if (url.includes('/api/retalhos')) {
      data = [];
    } else if (url.includes('/api/financeiro')) {
      if (url.includes('capital_giro')) {
        data = [];
      } else if (url.includes('dashboard')) {
        data = {
          a_pagar_30d: 0,
          vencidos_total: 0,
          capital_de_giro: 0,
          a_receber_30d: 0,
          proximos_vencimentos: [],
          top5_inadimplentes: [],
          despesas_por_classe: [],
          contas: [],
          saldo_total: 0,
        };
      } else if (url.includes('aging')) {
        data = { summary: [], details: [] };
      } else if (url.includes('rentabilidade')) {
        data = { resumo: {}, detalhes: [] };
      } else if (url.includes('fluxo-caixa')) {
        data = { entradas: [], saidas: [] };
      } else if (url.includes('relatorios')) {
        data = { summary: [], details: [], dados: [] };
      } else {
        data = [];
      }
    } else if (url.includes('/api/estoque')) {
      data = [];
    } else if (
      url.includes('/api/quotations') ||
      url.includes('/api/production') ||
      url.includes('/api/projects') ||
      url.includes('/api/clients') ||
      url.includes('/api/agenda') ||
      url.includes('/api/notificacoes') ||
      url.includes('/api/compras') ||
      url.includes('/api/engineering') ||
      url.includes('/api/skus') ||
      url.includes('/api/reports') ||
      url.includes('/api/finance')
    ) {
      data = [];
    }
    if (url.includes('page=') || url.includes('pagination')) {
      extra.pagination = { page: 1, total: 0, pages: 1, limit: 5 };
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data, ...extra }),
    });
  });
}

// Rotas extraídas de src/App.tsx (HashRouter -> prefixo #/)
export const ROUTES: { route: string; label: string }[] = [
  { route: 'painel', label: 'Dashboard' },
  { route: 'clientes', label: 'Clientes' },
  { route: 'quotations', label: 'Orçamentos (Quotations)' },
  { route: 'projetos', label: 'Projetos' },
  { route: 'producao', label: 'Produção' },
  { route: 'plano-de-corte', label: 'Plano de Corte Industrial' },
  { route: 'plano-de-corte-demo', label: 'Plano de Corte (Demo)' },
  { route: 'simulador-corte', label: 'Simulador de Corte' },
  { route: 'simulador-producao', label: 'Simulador de Produção' },
  { route: 'visitas', label: 'Visitas' },
  { route: 'calendario', label: 'Calendário' },
  { route: 'pos-venda', label: 'Pós-Venda' },
  { route: 'estoque', label: 'Estoque' },
  { route: 'fornecedores', label: 'Fornecedores' },
  { route: 'engenharia', label: 'Engenharia' },
  { route: 'pecas', label: 'SKUs / Peças' },
  { route: 'relatorios', label: 'Relatórios' },
  { route: 'financeiro', label: 'Financeiro (Home)' },
  { route: 'financeiro/classes', label: 'Financeiro > Classes' },
  { route: 'financeiro/contas', label: 'Financeiro > Contas' },
  { route: 'financeiro/formas', label: 'Financeiro > Formas de Pagamento' },
  { route: 'financeiro/condicoes', label: 'Financeiro > Condições' },
  { route: 'financeiro/titulos-receber', label: 'Financeiro > Títulos a Receber' },
  { route: 'financeiro/titulos-receber/wizard', label: 'Financeiro > Wizard Receber' },
  { route: 'financeiro/titulos-pagar', label: 'Financeiro > Títulos a Pagar' },
  { route: 'financeiro/titulos-pagar/wizard', label: 'Financeiro > Wizard Pagar' },
  { route: 'financeiro/dre', label: 'Financeiro > DRE' },
  { route: 'financeiro/aging', label: 'Financeiro > Aging' },
  { route: 'financeiro/fluxo-caixa', label: 'Financeiro > Fluxo de Caixa' },
  { route: 'financeiro/recorrentes', label: 'Financeiro > Recorrentes' },
  { route: 'financeiro/conciliacao', label: 'Financeiro > Conciliação' },
  { route: 'financeiro/rentabilidade', label: 'Financeiro > Rentabilidade' },
  { route: 'configuracoes', label: 'Configurações' },
  { route: 'notificacoes', label: 'Notificações' },
  { route: 'compras', label: 'Compras' },
  { route: 'prospeccao', label: 'Prospecção (Marcenaria)' },
  { route: 'retalhos', label: 'Retalhos' },
  { route: 'rh', label: 'RH' },
  { route: 'saas-admin', label: 'SaaS Admin' },
];
