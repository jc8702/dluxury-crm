import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mocks do Banco de dados e dependências
vi.mock('../_db.js', () => ({
  sql: vi.fn().mockResolvedValue([]),
  validateAuth: () => ({ authorized: true }),
}));

vi.mock('../financeiro.js', () => ({
  bootstrapFinanceiro: () => Promise.resolve(),
}));

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

// Mock da biblioteca oficial do Google GenAI
const mockGenerateContent = vi.fn().mockImplementation(async (params) => {
  const config = params.config || {};
  const contents = params.contents || '';
  const systemInstruction = config.systemInstruction || '';
  const responseMimeType = config.responseMimeType || '';

  // 1. Roteador Semântico (rotearAgente)
  if (responseMimeType === 'application/json' && JSON.stringify(config.responseSchema).includes('agente_escolhido')) {
    const textContent = typeof contents === 'string' ? contents : JSON.stringify(contents);
    const userMessageMatch = textContent.match(/Mensagem atual do usuário:\s*"([^"]+)"/i);
    const userMessage = userMessageMatch ? userMessageMatch[1] : textContent;

    if (userMessage.toLowerCase().includes('folga') || userMessage.toLowerCase().includes('corrediça') || userMessage.toLowerCase().includes('marcenaria')) {
      return { text: JSON.stringify({ agente_escolhido: 'marcenaria', confianca: 0.95, razao: 'Dúvida de marcenaria' }) };
    }
    if (userMessage.toLowerCase().includes('faturamento') || userMessage.toLowerCase().includes('fluxo de caixa') || userMessage.toLowerCase().includes('caixa')) {
      return { text: JSON.stringify({ agente_escolhido: 'financeiro', confianca: 0.98, razao: 'Consulta financeira' }) };
    }
    if (userMessage.toLowerCase().includes('estoque') || userMessage.toLowerCase().includes('chapas')) {
      return { text: JSON.stringify({ agente_escolhido: 'producao', confianca: 0.92, razao: 'Estoque de chapas' }) };
    }
    if (userMessage.toUpperCase().includes('SKU') || userMessage.toUpperCase().includes('BALC-COZ')) {
      return { text: JSON.stringify({ agente_escolhido: 'engenharia', confianca: 0.99, razao: 'Análise de SKU' }) };
    }
    return { text: JSON.stringify({ agente_escolhido: 'marcenaria', confianca: 0.8, razao: 'Default' }) };
  }

  // 2. Formatador JSON Estruturado Final
  if (responseMimeType === 'application/json' && JSON.stringify(config.responseSchema).includes('response')) {
    const promptText = typeof contents === 'string' ? contents : JSON.stringify(contents);
    /* console.log('[MOCK_DEBUG] promptText:', promptText) */

    if (promptText.includes('BALC-COZ-1200-2P-2G-MDF18')) {
      return {
        text: JSON.stringify({
          response: `RELATÓRIO DE ENGENHARIA DE MÓVEIS\nSKU: BALC-COZ-1200-2P-2G-MDF18\nALERTAS DE SEGURANÇA:\n- Flambagem detectada no vão de 1200mm\n- Torção de Corrediça`,
          confidence: 95,
          sources: ['Validador SKU', 'Regras de Engenharia'],
          table_data: {
            headers: ['Parâmetro / Componente', 'Valor Identificado', 'Especificação / Status'],
            rows: [
              ['Categoria do móvel', 'Balcão', 'Especificação Padrão'],
              ['Material da estrutura', 'MDF', 'MDF 18mm']
            ]
          },
          suggestions: ['Verificar vão de estoque', 'Reforçar com travessa', 'Reduzir largura para 800mm']
        })
      };
    }

    if (promptText.includes('INVALID-SKU-FORMAT') || promptText.includes('Não foi possível analisar o SKU')) {
      return {
        text: JSON.stringify({
          response: 'Não foi possível analisar o SKU devido ao formato inválido.',
          confidence: 100,
          sources: ['Validador SKU'],
          suggestions: ['Consultar tabela de medidas padrão']
        })
      };
    }

    if (promptText.includes('13mm de cada lado')) {
      return {
        text: JSON.stringify({
          response: 'De acordo com o RAG de marcenaria, a folga padrão exigida para corrediça telescópica é de 13mm de cada lado.',
          confidence: 90,
          sources: ['RAG Marcenaria']
        })
      };
    }

    if (promptText.includes('Fluxo de caixa') || promptText.includes('Fluxo de Caixa')) {
      return {
        text: JSON.stringify({
          response: 'Fluxo de caixa do período atualizado.',
          confidence: 85,
          sources: ['Banco de Dados ERP']
        })
      };
    }

    if (promptText.includes('chapas') || promptText.includes('chapa')) {
      return {
        text: JSON.stringify({
          response: 'O estoque de chapas de MDF está normal.',
          confidence: 90,
          sources: ['Banco de Dados ERP'],
          suggestions: ['Ver materiais abaixo do mínimo']
        })
      };
    }

    return {
      text: JSON.stringify({
        response: 'Resposta formatada do assistente.',
        confidence: 80,
        sources: ['Conhecimento Geral']
      })
    };
  }

  const normSystem = systemInstruction.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  // 3. Loop de Tools (texto livre / function calls)
  if (normSystem.includes('engenh')) {
    const promptText = typeof contents === 'string' ? contents : JSON.stringify(contents);
    if (promptText.includes('BALC-COZ-1200-2P-2G-MDF18')) {
      return {
        text: `RELATÓRIO DE ENGENHARIA DE MÓVEIS\nSKU: BALC-COZ-1200-2P-2G-MDF18\nALERTAS DE SEGURANÇA:\n- Flambagem detectada no vão de 1200mm\n- Torção de Corrediça`
      };
    }
    if (promptText.includes('INVALID-SKU-FORMAT')) {
      return {
        text: 'Não foi possível analisar o SKU devido ao formato inválido.'
      };
    }
  }

  if (normSystem.includes('marcenaria')) {
    const promptText = typeof contents === 'string' ? contents : JSON.stringify(contents);
    // Se o modelo já recebeu o retorno da tool no histórico, responde final
    if (promptText.includes('13mm de cada lado')) {
      return {
        text: 'A folga padrão exigida para corrediça telescópica é de 13mm de cada lado.'
      };
    }
    // Caso contrário, faz a chamada da tool
    return {
      candidates: [{
        content: {
          role: 'model',
          parts: [{
            functionCall: {
              name: 'ragConhecimentoTecnico',
              args: { query: 'Qual é a folga necessária para instalar uma corrediça?' }
            }
          }]
        }
      }]
    };
  }

  if (normSystem.includes('financeiro')) {
    const promptText = typeof contents === 'string' ? contents : JSON.stringify(contents);
    if (promptText.includes('Fluxo de caixa') || promptText.includes('faturamento')) {
      return { text: 'Fluxo de caixa atualizado.' };
    }
    return {
      candidates: [{
        content: {
          role: 'model',
          parts: [{
            functionCall: {
              name: 'consultar_orcamentos',
              args: { status: 'APROVADO', limite: 5 }
            }
          }]
        }
      }]
    };
  }

  if (normSystem.includes('producao')) {
    const promptText = typeof contents === 'string' ? contents : JSON.stringify(contents);
    if (promptText.includes('estoque') || promptText.includes('chapas')) {
      return { text: 'estoque de chapas' };
    }
    return {
      candidates: [{
        content: {
          role: 'model',
          parts: [{
            functionCall: {
              name: 'buscar_materiais',
              args: { termo: 'chapa', limite: 5 }
            }
          }]
        }
      }]
    };
  }

  return { text: 'Resposta padrão do loop de tools.' };
});

vi.mock('@google/genai', () => {
  return {
    GoogleGenAI: class {
      models = {
        generateContent: mockGenerateContent
      };
    }
  };
});

// Importação do handler da API principal
import handler from '../../../api/index.js';

describe('Integração do Analisador de SKU com AI Chat (Serviço Gemini de Produção)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve processar mensagem de análise de SKU com sucesso', async () => {
    const req = {
      method: 'POST',
      url: '/api/ai/chat',
      socket: {
        remoteAddress: 'test-ip-' + Math.random()
      },
      body: {
        message: 'Analise o SKU BALC-COZ-1200-2P-2G-MDF18',
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
      setHeader: () => {},
      end: () => res
    };

    await handler(req, res);

    expect(responseStatus).toBe(200);
    expect(responseData).toBeDefined();

    const data = responseData;
    expect(data.text).toContain('RELATÓRIO DE ENGENHARIA DE MÓVEIS');
    expect(data.text).toContain('BALC-COZ-1200-2P-2G-MDF18');
    expect(data.text).toContain('ALERTAS DE SEGURANÇA');
    expect(data.text).toContain('Flambagem');
    expect(data.text).toContain('Torção de Corrediça');

    expect(data.table_data).toBeDefined();
    expect(data.table_data.headers).toEqual(['Parâmetro / Componente', 'Valor Identificado', 'Especificação / Status']);
    expect(data.table_data.rows.some((row: any) => row[0] === 'Categoria do móvel' && row[1] === 'Balcão')).toBe(true);
    expect(data.table_data.rows.some((row: any) => row[0] === 'Material da estrutura' && row[1] === 'MDF')).toBe(true);

    expect(data.suggestions).toBeDefined();
    expect(data.suggestions.length).toBeGreaterThan(0);
    expect(data.suggestions.some((s: string) => s.toLowerCase().includes('estoque') || s.toLowerCase().includes('vão') || s.toLowerCase().includes('corrediça'))).toBe(true);
  });

  it('deve lidar graciosamente com SKUs inválidos ou desconhecidos', async () => {
    const req = {
      method: 'POST',
      url: '/api/ai/chat',
      socket: {
        remoteAddress: 'test-ip-' + Math.random()
      },
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
      setHeader: () => {},
      end: () => res
    };

    await handler(req, res);

    expect(responseStatus).toBe(200);
    expect(responseData.text).toContain('Não foi possível analisar o SKU');
    expect(responseData.suggestions).toContain('Consultar tabela de medidas padrão');
  });
});

describe('Arquitetura Multi-Agente & RAG de Marcenaria (Serviço Gemini de Produção)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve rotear conceitual de marcenaria para subagente de marcenaria e ativar RAG proativo', async () => {
    const req = {
      method: 'POST',
      url: '/api/ai/chat',
      socket: {
        remoteAddress: 'test-ip-' + Math.random()
      },
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
      setHeader: () => {},
      end: () => res
    };

    await handler(req, res);

    expect(responseStatus).toBe(200);
    expect(responseData.text).toContain('folga padrão');
    expect(responseData.text).toContain('13mm de cada lado');
  });

  it('deve classificar consultas de finanças para o subagente financeiro', async () => {
    const req = {
      method: 'POST',
      url: '/api/ai/chat',
      socket: {
        remoteAddress: 'test-ip-' + Math.random()
      },
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
      setHeader: () => {},
      end: () => res
    };

    await handler(req, res);

    expect(responseStatus).toBe(200);
    expect(responseData.text).toContain('Fluxo de caixa');
  });

  it('deve classificar consultas de estoque/produção para o subagente de produção', async () => {
    const req = {
      method: 'POST',
      url: '/api/ai/chat',
      socket: {
        remoteAddress: 'test-ip-' + Math.random()
      },
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
      setHeader: () => {},
      end: () => res
    };

    await handler(req, res);

    expect(responseStatus).toBe(200);
    expect(responseData.text).toContain('chapas');
    expect(responseData.suggestions).toContain('Ver materiais abaixo do mínimo');
  });
});

describe('Validações de Entrada e Controle de Rate Limit (Serviço Gemini de Produção)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve rejeitar mensagens vazias com erro 400', async () => {
    const req = {
      method: 'POST',
      url: '/api/ai/chat',
      socket: {
        remoteAddress: 'test-ip-' + Math.random()
      },
      body: {
        message: '   ',
        conversation_history: [],
        context: {}
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
      setHeader: () => {},
      end: () => res
    };

    await handler(req, res);

    expect(responseStatus).toBe(400);
    expect(responseData.error).toBe('Mensagem inválida ou vazia');
  });

  it('deve rejeitar mensagens com mais de 4000 caracteres com erro 400', async () => {
    const req = {
      method: 'POST',
      url: '/api/ai/chat',
      socket: {
        remoteAddress: 'test-ip-' + Math.random()
      },
      body: {
        message: 'A'.repeat(4001),
        conversation_history: [],
        context: {}
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
      setHeader: () => {},
      end: () => res
    };

    await handler(req, res);

    expect(responseStatus).toBe(400);
    expect(responseData.error).toBe('Mensagem muito longa (máximo 4000 caracteres)');
  });

  it('deve disparar erro 429 (Rate Limit) após 5 requisições rápidas do mesmo usuário', async () => {
    const userId = `test-user-${Date.now()}`;
    const makeRequest = async () => {
      const req = {
        method: 'POST',
        url: '/api/ai/chat',
        socket: {
          remoteAddress: userId
        },
        body: {
          message: 'Olá, IA',
          conversation_history: [],
          context: {
            usuario_id: userId
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
        setHeader: () => {},
        end: () => res
      };

      await handler(req, res);
      return { status: responseStatus, data: responseData };
    };

    // Fazer 5 requisições rápidas (dentro do limite permitido)
    for (let i = 0; i < 5; i++) {
      const result = await makeRequest();
      expect(result.status).toBe(200);
    }

    // A 6ª requisição deve estourar o limite de 5 a cada 10 segundos
    const blockedResult = await makeRequest();
    expect(blockedResult.status).toBe(429);
    expect(blockedResult.data.error).toContain('Muitas requisições');
    expect(blockedResult.data.retryAfter).toBeDefined();
  });
});
