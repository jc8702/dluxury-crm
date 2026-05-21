import { describe, it, expect, vi } from 'vitest';

// Mockando banco de dados e autenticação
vi.mock('../_db.js', () => ({
  sql: () => Promise.resolve([]),
  validateAuth: () => ({ authorized: true }),
}));

vi.mock('../financeiro.js', () => ({
  bootstrapFinanceiro: () => Promise.resolve(),
}));

// Mockando drizzle-db para teste de RAG
vi.mock('../drizzle-db.js', () => ({
  db: {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        orderBy: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([
            {
              titulo: 'Folga de corrediça telescópica',
              conteudo: 'A folga padrão exigida para corrediça telescópica é de 13mm de cada lado.',
              categoria: 'Ferragens'
            }
          ])
        })
      })
    })
  }
}));

import { handleAIChat } from '../ai-chat.js';

describe('Integração do Analisador de SKU com AI Chat', () => {
  it('deve processar mensagem de análise de SKU com sucesso', async () => {
    // Preparar objeto de requisição (req) mockado
    const req = {
      method: 'POST',
      body: {
        message: 'Analise o SKU BALC-COZ-1200-2P-2G-MDF18',
        conversation_history: [],
        context: {
          data_atual: '2026-05-21T12:00:00.000Z'
        }
      }
    };

    // Mockar objeto de resposta (res) para capturar o status e json retornado
    let responseStatus = 200;
    let responseData: any = null;

    const res = {
      status: (code: number) => {
        responseStatus = code;
        return res;
      },
      json: (data: any) => {
        responseData = data;
        return res;
      },
      end: () => res
    };

    // Executar o controller de chat
    await handleAIChat(req, res);

    // Verificar se respondeu com sucesso (200 OK)
    expect(responseStatus).toBe(200);
    expect(responseData).toBeDefined();

    const data = responseData;
    
    // Verificar se o texto de resposta contém informações do relatório de engenharia
    expect(data.text).toContain('RELATÓRIO DE ENGENHARIA DE MÓVEIS');
    expect(data.text).toContain('BALC-COZ-1200-2P-2G-MDF18');
    
    // Deve conter alertas críticos por ser muito largo (1200mm) em MDF 18mm (flambagem e torção de corrediça)
    expect(data.text).toContain('ALERTAS DE SEGURANÇA');
    expect(data.text).toContain('Flambagem');
    expect(data.text).toContain('Torção de Corrediça');

    // Verificar a estrutura da tabela retornada
    expect(data.table_data).toBeDefined();
    expect(data.table_data.headers).toEqual(['Parâmetro / Componente', 'Valor Identificado', 'Especificação / Status']);
    expect(data.table_data.rows.some((row: any) => row[0] === 'Categoria do móvel' && row[1] === 'Balcão')).toBe(true);
    expect(data.table_data.rows.some((row: any) => row[0] === 'Material da estrutura' && row[1] === 'MDF')).toBe(true);

    // Verificar sugestões e sugestões de follow-up inteligentes
    expect(data.suggestions).toBeDefined();
    expect(data.suggestions.length).toBeGreaterThan(0);
    expect(data.suggestions.some((s: string) => s.toLowerCase().includes('estoque') || s.toLowerCase().includes('vão') || s.toLowerCase().includes('corrediça'))).toBe(true);
  });

  it('deve lidar graciosamente com SKUs inválidos ou desconhecidos', async () => {
    const req = {
      method: 'POST',
      body: {
        message: 'Analise o sku INVALID-SKU-FORMAT',
        conversation_history: [],
        context: {
          data_atual: '2026-05-21T12:00:00.000Z'
        }
      }
    };

    let responseStatus = 200;
    let responseData: any = null;

    const res = {
      status: (code: number) => {
        responseStatus = code;
        return res;
      },
      json: (data: any) => {
        responseData = data;
        return res;
      },
      end: () => res
    };

    await handleAIChat(req, res);

    expect(responseStatus).toBe(200);
    expect(responseData.text).toContain('Não foi possível analisar o SKU');
    expect(responseData.suggestions).toContain('Consultar tabela de medidas padrão');
  });
});

describe('Arquitetura Multi-Agente & RAG de Marcenaria', () => {
  it('deve rotear conceitual de marcenaria para subagente de marcenaria e ativar RAG proativo', async () => {
    const req = {
      method: 'POST',
      body: {
        message: 'Qual é a folga necessária para instalar uma corrediça?',
        conversation_history: [],
        context: {
          data_atual: '2026-05-21T12:00:00.000Z'
        }
      }
    };

    let responseStatus = 200;
    let responseData: any = null;

    const res = {
      status: (code: number) => {
        responseStatus = code;
        return res;
      },
      json: (data: any) => {
        responseData = data;
        return res;
      },
      end: () => res
    };

    await handleAIChat(req, res);

    expect(responseStatus).toBe(200);
    
    // O texto deve conter as informações recuperadas do RAG mockado
    expect(responseData.text).toContain('Folga de corrediça telescópica');
    expect(responseData.text).toContain('13mm de cada lado');
  });

  it('deve classificar consultas de finanças para o subagente financeiro', async () => {
    const req = {
      method: 'POST',
      body: {
        message: 'Qual é o faturamento e fluxo de caixa deste mês?',
        conversation_history: [],
        context: {
          data_atual: '2026-05-21T12:00:00.000Z'
        }
      }
    };

    let responseStatus = 200;
    let responseData: any = null;

    const res = {
      status: (code: number) => {
        responseStatus = code;
        return res;
      },
      json: (data: any) => {
        responseData = data;
        return res;
      },
      end: () => res
    };

    await handleAIChat(req, res);

    expect(responseStatus).toBe(200);
    // Como o chatModel está nulo nos testes, o fallback offline roda.
    // O fallback offline detecta "fluxo de caixa" e retorna a ferramenta getFluxoCaixa.
    expect(responseData.text).toContain('Fluxo de caixa');
  });

  it('deve classificar consultas de estoque/produção para o subagente de produção', async () => {
    const req = {
      method: 'POST',
      body: {
        message: 'Como está o estoque de chapas de MDF?',
        conversation_history: [],
        context: {
          data_atual: '2026-05-21T12:00:00.000Z'
        }
      }
    };

    let responseStatus = 200;
    let responseData: any = null;

    const res = {
      status: (code: number) => {
        responseStatus = code;
        return res;
      },
      json: (data: any) => {
        responseData = data;
        return res;
      },
      end: () => res
    };

    await handleAIChat(req, res);

    expect(responseStatus).toBe(200);
    // Deve acionar o fallback de ferramentas getEstoqueChapas
    expect(responseData.text).toContain('chapas');
    expect(responseData.suggestions).toContain('Ver materiais abaixo do mínimo');
  });
});
