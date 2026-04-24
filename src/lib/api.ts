const API_BASE = '/api';
const TOKEN_KEY = 'dluxury_token';

export const setAuthToken = (token: string) => localStorage.setItem(TOKEN_KEY, token);
export const removeAuthToken = () => localStorage.removeItem(TOKEN_KEY);
export const hasAuthToken = () => !!localStorage.getItem(TOKEN_KEY);
const getToken = () => localStorage.getItem(TOKEN_KEY) || '';

export async function apiCall<T>(
  action: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' = 'GET',
  body?: unknown
): Promise<T> {
  const url = action.startsWith('/') ? action : `${API_BASE}/${action}`;
  const token = getToken();
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (import.meta.env.DEV) {
    console.log(`[API REQUEST] ${method} ${url}`, body);
  }

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    console.error(`[API ERROR] ${method} ${url}:`, json);
    throw new Error(json.error || json.message || `HTTP ${res.status}`);
  }

  const json: any = await res.json();
  
  // Log de auditoria para ambiente dev
  if (import.meta.env.DEV) {
    console.log(`[API RESPONSE] ${method} ${action}:`, json);
  }

  // Se a resposta seguir o padrão { success, data }, retornamos apenas o data
  if (json && typeof json === 'object' && 'success' in json) {
    if (json.success === false) {
      throw new Error(json.error || json.message || 'Erro desconhecido na API');
    }
    return json.data === undefined ? json : json.data;
  }

  return json;
}

export const api = {
  auth: {
    login: (credentials: any) => apiCall<any>('auth?action=login', 'POST', credentials),
    register: (data: any) => apiCall<any>('auth?action=register', 'POST', data),
    me: () => apiCall<any>('auth?action=me'),
  },
  clients: {
    list: () => apiCall<any[]>('clients'),
    create: (data: any) => apiCall<any>('clients', 'POST', data),
    update: (id: string, data: any) => apiCall<any>(`clients?id=${id}`, 'PATCH', data),
    delete: (id: string) => apiCall<any>(`clients?id=${id}`, 'DELETE'),
  },
  estoque: {
    list: (params?: any) => apiCall<any[]>(`estoque${params?.q ? `?q=${params.q}` : ''}`),
    create: (data: any) => apiCall<any>('estoque', 'POST', data),
    update: (id: string, data: any) => apiCall<any>(`estoque?id=${id}`, 'PATCH', data),
    getMovimentacoes: (materialId?: string) => apiCall<any[]>(`estoque?type=movimentacoes${materialId ? `&material_id=${materialId}` : ''}`),
    addMovimentacao: (data: any) => apiCall<any>('estoque?type=movimentacoes', 'POST', data),
    fornecedores: {
        list: () => apiCall<any[]>('estoque?type=fornecedores'),
        create: (data: any) => apiCall<any>('estoque?type=fornecedores', 'POST', data),
        update: (id: string, data: any) => apiCall<any>(`estoque?type=fornecedores&id=${id}`, 'PATCH', data),
        delete: (id: string) => apiCall<any>(`estoque?type=fornecedores&id=${id}`, 'DELETE'),
    }
  },
  orcamentos: {
    list: () => apiCall<any[]>('orcamentos'),
    get: (id: string) => apiCall<any>(`orcamentos?id=${id}`),
    create: (data: any) => apiCall<any>('orcamentos', 'POST', data),
    update: (id: string, data: any) => apiCall<any>(`orcamentos?id=${id}`, 'PATCH', data),
    delete: (id: string) => apiCall<any>(`orcamentos?id=${id}`, 'DELETE'),
  },
  projects: {
    list: () => apiCall<any[]>('projects'),
    create: (data: any) => apiCall<any>('projects', 'POST', data),
    update: (id: string, data: any) => apiCall<any>(`projects?id=${id}`, 'PATCH', data),
    delete: (id: string) => apiCall<any>(`projects?id=${id}`, 'DELETE'),
  },
  compras: {
    listPedidos: () => apiCall<any[]>('compras?type=pedidos'),
    listBySupplier: (fornecedorId: string) => apiCall<any[]>(`compras?type=pedidos&fornecedor_id=${fornecedorId}`),
    getPedido: (id: string) => apiCall<any>(`compras?type=pedidos&id=${id}`),
    createPedido: (data: any) => apiCall<any>('compras?type=pedidos', 'POST', data),
    updatePedido: (id: string, data: any) => apiCall<any>(`compras?type=pedidos&id=${id}`, 'PATCH', data),
    addItem: (data: any) => apiCall<any>('compras?type=itens', 'POST', data),
    removeItem: (id: string) => apiCall<any>(`compras?type=itens&id=${id}`, 'DELETE'),
    registrarRecebimento: (data: any) => apiCall<any>('compras?type=recebimento', 'POST', data),
    getSugestoes: () => apiCall<any[]>('compras?type=sugestao'),
    getHistoricoPrecos: (materialId: string) => apiCall<any[]>(`compras?type=historico_precos&material_id=${materialId}`),
  },
  aprovacao: {
    gerarLink: (orcamentoId: string) => apiCall<any>('aprovacao?action=gerar', 'POST', { orcamento_id: orcamentoId }),
    getPublico: (token: string) => apiCall<any>(`aprovacao?token=${token}`),
    aprovar: (token: string, data: { nome: string }) => apiCall<any>(`aprovacao?token=${token}&action=aprovar`, 'POST', data),
    recusar: (token: string, data: { motivo: string }) => apiCall<any>(`aprovacao?token=${token}&action=recusar`, 'POST', data),
  },
  agenda: {
    list: (params: any = {}) => {
      const qs = new URLSearchParams(params).toString();
      return apiCall<any[]>(`agenda${qs ? `?${qs}` : ''}`);
    },
    listKanban: () => apiCall<any>('agenda?action=kanban'),
    create: (data: any) => apiCall<any>('agenda', 'POST', data),
    update: (id: string, data: any) => apiCall<any>(`agenda?id=${id}`, 'PATCH', data),
    move: (id: string, status: string) => apiCall<any>(`agenda?id=${id}&action=mover`, 'PATCH', { status_visita: status }),
    realize: (id: string, resultado: string) => apiCall<any>(`agenda?id=${id}&action=realizar`, 'PATCH', { resultado_visita: resultado }),
    delete: (id: string) => apiCall<any>(`agenda?id=${id}`, 'DELETE'),
    syncVisitas: () => apiCall<any>('agenda?action=sincronizar', 'POST'),
  },
  notificacoes: {
    list: (unreadOnly = false) => apiCall<any[]>(`notificacoes?unread=${unreadOnly}`),
    getCount: () => apiCall<number>('notificacoes?action=contar'),
    markRead: (id: string) => apiCall<any>(`notificacoes?id=${id}`, 'PUT'),
    markAllRead: () => apiCall<any>('notificacoes?action=marcar-todas', 'PUT'),
    generate: () => apiCall<any>('notificacoes?action=gerar', 'POST'),
  },
  engineering: {
    list: () => apiCall<any[]>('engineering'),
    create: (data: any) => apiCall<any>('engineering', 'POST', data),
    update: (id: string, data: any) => apiCall<any>(`engineering?id=${id}`, 'PATCH', data),
    delete: (id: string) => apiCall<any>(`engineering?id=${id}`, 'DELETE'),
  },
  skus: {
    list: () => apiCall<any[]>('skus'),
    create: (data: any) => apiCall<any>('skus', 'POST', data),
  },
  production: {
    list: () => apiCall<any[]>('production'),
    updateStatus: (op_id: string, status: string) => apiCall<any>('production', 'PATCH', { op_id, status }),
    updateDetails: (data: any) => apiCall<any>('production?id=details', 'PATCH', data),
    getMetrics: () => apiCall<any>('production/metrics'),
    delete: (op_id: string) => apiCall<any>(`production?op_id=${encodeURIComponent(op_id)}`, 'DELETE'),
  },
  reports: {
    get: (type: string, projectId?: string) => apiCall<any[]>(`reports?type=${type}${projectId ? `&projectId=${projectId}` : ''}`),
  },
  billings: {
    list: () => apiCall<any[]>('billings'),
    create: (data: any) => apiCall<any>('billings', 'POST', data),
    update: (id: string, data: any) => apiCall<any>(`billings?id=${id}`, 'PATCH', data),
    delete: (id: string) => apiCall<any>(`billings?id=${id}`, 'DELETE'),
  },
  kanban: {
    list: () => apiCall<any[]>('kanban'),
    create: (data: any) => apiCall<any>('kanban', 'POST', data),
    updateStatus: (id: string, status: string, extra: any = {}) => apiCall<any>(`kanban?id=${id}`, 'PATCH', { status, ...extra }),
  },
  goals: {
    list: () => apiCall<Record<string, number>>('goals'),
    update: (period: string, amount: number) => apiCall<any>('goals', 'POST', { period, amount }),
  },
  condicoesPagamento: {
    list: () => apiCall<any[]>('condicoes-pagamento'),
    create: (data: any) => apiCall<any>('condicoes-pagamento', 'POST', data),
    update: (id: string, data: any) => apiCall<any>(`condicoes-pagamento?id=${id}`, 'PATCH', data),
    delete: (id: string) => apiCall<any>(`condicoes-pagamento?id=${id}`, 'DELETE'),
  },
  users: {
    list: () => apiCall<any[]>('users'),
    update: (data: any) => apiCall<any>('users', 'PATCH', data),
    delete: (id: string) => apiCall<any>(`users?id=${id}`, 'DELETE'),
  },
  orcamentoTecnico: {
    getTree: (orcamentoId: string) => apiCall<any>(`orcamento-tecnico?type=tree&orcamento_id=${orcamentoId}`),
    getConfig: () => apiCall<any>('orcamento-tecnico?type=config'),
    updateConfig: (data: any) => apiCall<any>('orcamento-tecnico?type=config', 'PATCH', data),
    addEntity: (type: string, parentIdKey: string, parentId: string, data: any) => apiCall<any>(`orcamento-tecnico?type=${type}&${parentIdKey}=${parentId}`, 'POST', data),
    updateEntity: (type: string, id: string, data: any) => apiCall<any>(`orcamento-tecnico?type=${type}&id=${id}`, 'PATCH', data),
    deleteEntity: (type: string, id: string) => apiCall<any>(`orcamento-tecnico?type=${type}&id=${id}`, 'DELETE'),
  },
  suppliers: {
    list: () => apiCall<any[]>('estoque?type=fornecedores'),
  },
  financeiro: {
    classesFinanceiras: {
      list: () => apiCall<any[]>('financeiro/classes'),
      create: (data: any) => apiCall<any>('financeiro/classes', 'POST', data),
      update: (data: any) => apiCall<any>('financeiro/classes', 'PUT', data),
      delete: (id: string) => apiCall<any>(`financeiro/classes?id=${id}`, 'DELETE'),
    },
    classes: { 
      list: () => apiCall<any[]>('financeiro/classes'), // Mantido para retrocompatibilidade
    },
    contasInternas: {
      list: () => apiCall<any[]>('financeiro/contas-internas'),
      create: (data: any) => apiCall<any>('financeiro/contas-internas', 'POST', data),
      update: (data: any) => apiCall<any>(`financeiro/contas-internas?id=${data.id}`, 'PUT', data),
      delete: (id: string) => apiCall<any>(`financeiro/contas-internas?id=${id}`, 'DELETE'),
      extrato: (id: string) => apiCall<any>(`financeiro/contas-internas/${id}/extrato`),
    },
    formasPagamento: {
      list: () => apiCall<any[]>('financeiro/formas-pagamento'),
      create: (data: any) => apiCall<any>('financeiro/formas-pagamento', 'POST', data),
      update: (data: any) => apiCall<any>('financeiro/formas-pagamento', 'PUT', data),
    },
    condicoesPagamento: {
      list: () => apiCall<any[]>('financeiro/condicoes-pagamento'),
      create: (data: any) => apiCall<any>('financeiro/condicoes-pagamento', 'POST', data),
      update: (data: any) => apiCall<any>('financeiro/condicoes-pagamento', 'PUT', data),
    },
    titulosReceber: {
      list: (params: any = {}) => {
        const qs = new URLSearchParams(params).toString();
        return apiCall<any>(`financeiro/titulos-receber${qs ? `?${qs}` : ''}`);
      },
      create: (data: any) => apiCall<any>('financeiro/titulos-receber', 'POST', data),
      preview: (data: any) => apiCall<any>('financeiro/titulos-receber?action=preview', 'POST', data),
      update: (id: string, data: any) => apiCall<any>(`financeiro/titulos-receber?id=${id}`, 'PATCH', data),
      delete: (id: string) => apiCall<any>(`financeiro/titulos-receber?id=${id}`, 'DELETE'),
      deleteBatch: (cliente_id: string) => apiCall<any>(`financeiro/titulos-receber?action=delete_group&cliente_id=${cliente_id}`, 'DELETE'),
      baixar: (id: string, data: any) => apiCall<any>(`financeiro/titulos-receber/${id}/baixar`, 'POST', data),
    },
    titulosPagar: {
      list: (params: any = {}) => {
        const qs = new URLSearchParams(params).toString();
        return apiCall<any>(`financeiro/titulos-pagar${qs ? `?${qs}` : ''}`);
      },
      create: (data: any) => apiCall<any>('financeiro/titulos-pagar', 'POST', data),
      preview: (data: any) => apiCall<any>('financeiro/titulos-pagar?action=preview', 'POST', data),
      update: (id: string, data: any) => apiCall<any>(`financeiro/titulos-pagar?id=${id}`, 'PATCH', data),
      delete: (id: string) => apiCall<any>(`financeiro/titulos-pagar?id=${id}`, 'DELETE'),
      deleteBatch: (fornecedor_id: string) => apiCall<any>(`financeiro/titulos-pagar?action=delete_group&fornecedor_id=${fornecedor_id}`, 'DELETE'),
      baixar: (id: string, data: any) => apiCall<any>(`financeiro/titulos-pagar?id=${id}&action=baixar`, 'POST', data),
    },
    conferencia: {
      toggle: (data: any) => apiCall<any>('financeiro/conferencia', 'POST', data),
    },
    fechamentos: {
      list: () => apiCall<any[]>('financeiro/fechamentos'),
      save: (data: any) => apiCall<any>('financeiro/fechamentos', 'POST', data),
    },
    tesouraria: {
      list: () => apiCall<any[]>('financeiro/tesouraria'),
      transferencia: (data: any) => apiCall<any>('financeiro/tesouraria/transferencia', 'POST', data),
      movimento: (data: any) => apiCall<any>('financeiro/tesouraria/movimento', 'POST', data),
    },
    fluxoCaixa: {
      get: (params: any = {}) => {
        const qs = new URLSearchParams(params).toString();
        return apiCall<any>(`financeiro/fluxo-caixa${qs ? `?${qs}` : ''}`);
      }
    },
    relatorios: {
      dre: (params: any = {}) => {
        const qs = new URLSearchParams(params).toString();
        return apiCall<any>(`financeiro/relatorios?type=dre${qs ? `&${qs}` : ''}`);
      },
      aging: (params: any = {}) => {
        const qs = new URLSearchParams(params).toString();
        return apiCall<any>(`financeiro/relatorios?type=aging${qs ? `&${qs}` : ''}`);
      },
      dashboard: () => apiCall<any>('financeiro/relatorios?type=dashboard'),
      projetado: (days = 30) => apiCall<any>(`financeiro/relatorios?type=projetado&days=${days}`),
      rentabilidade: (params: any = {}) => {
        const qs = new URLSearchParams(params).toString();
        return apiCall<any>(`financeiro/relatorios?type=rentabilidade${qs ? `&${qs}` : ''}`);
      },
      capitalGiro: () => apiCall<any>('financeiro/relatorios?type=capital_giro'),
    },
    contasRecorrentes: {
      list: () => apiCall<any[]>('financeiro/contas-recorrentes'),
      create: (data: any) => apiCall<any>('financeiro/contas-recorrentes', 'POST', data),
      update: (data: any) => apiCall<any>('financeiro/contas-recorrentes', 'PUT', data),
      delete: (id: string) => apiCall<any>(`financeiro/contas-recorrentes?id=${id}`, 'DELETE'),
      gerarMes: (mes: number, ano: number) => apiCall<any>(`financeiro/contas-recorrentes/gerar-mes?mes=${mes}&ano=${ano}`, 'POST'),
    },

  },
  estoqueCategorias: {
    list: () => apiCall<any[]>('estoque?type=categories'),
    create: (data: any) => apiCall<any>('estoque?type=categories', 'POST', data),
  },
  ai: {
    chat: (payload: any) => apiCall<any>('ai/chat', 'POST', payload),
    generateBOM: (payload: any) => apiCall<any>('ai-copilot', 'POST', { skill: 'generate-bom', payload }),
    auditSKU: (payload: any) => apiCall<any>('ai-copilot', 'POST', { skill: 'audit-sku', payload }),
    purchaseSuggestion: () => apiCall<any>('ai-copilot', 'POST', { skill: 'purchase-suggestion' }),
    detectAnomalies: () => apiCall<any>('ai-copilot', 'POST', { skill: 'detect-anomalies' }),
    analyzeProposal: (payload: any) => apiCall<any>('ai-copilot', 'POST', { skill: 'analyze-proposal', payload }),
    translate: (payload: any) => apiCall<any>('ai-copilot', 'POST', { skill: 'translate', payload }),
    generatePDF: (payload: any) => apiCall<any>('ai-copilot', 'POST', { skill: 'generate-pdf', payload }),
    forecastDemand: (payload: any) => apiCall<any>('ai-copilot', 'POST', { skill: 'forecast-demand', payload }),
  },
  planoCorte: {
    list: () => apiCall<any[]>('plano-corte?action=listar_planos_corte'),
    get: (id: string) => apiCall<any>(`plano-corte?action=buscar_plano_completo&id=${id}`),
    save: (data: any) => apiCall<any>('plano-corte?action=salvar_resultado_corte', 'POST', data),
    create: (data: any) => apiCall<any>('plano-corte?action=criar_plano', 'POST', data),
  },
  cuttingPlan: {
    list: () => apiCall<any[]>('production?type=cutting_plan_list'),
    save: (data: any) => apiCall<any>('production?type=cutting_plan', 'POST', data),
  },
  afterSales: {
    list: () => apiCall<any[]>('after-sales'),
    getStats: () => apiCall<any>('after-sales?stats=true'),
    create: (data: any) => apiCall<any>('after-sales', 'POST', data),
    update: (data: any) => apiCall<any>('after-sales', 'PATCH', data),
  }
};
