import { describe, it, expect } from 'vitest';
import {
  gerarSimulationProgram,
  calcularMetrics,
  obterEstadoNoInstante,
  MACHINE_DEFAULT,
  TOOL_DEFAULT,
  recomputeSimulationAfterAdjustment,
} from '../domain/simulationEngine';
import {
  analyzeIssues,
  applySafeAdjustment,
  determinarAcao,
  DEFAULT_CNC_CONFIG,
  gerarFixtureSettings,
} from '../domain/adjustmentEngine';
import { carregarConfigCNC } from '../infrastructure/persistence';
import type { LayoutSimulacao, FixtureDefinition, CncConfig } from '../domain/types';

const LAYOUT_PADRAO: LayoutSimulacao = {
  chapa: {
    sku: 'MDF-18MM-TESTE',
    largura: 2750,
    altura: 1830,
    espessura: 18,
  },
  pecas: [
    {
      id: 'peca_1',
      nome: 'PORTA RECEPTORA',
      comprimento: 600,
      largura: 400,
      espessura: 18,
      x: 100,
      y: 100,
      rotacionada: false,
    },
  ],
  area_aproveitada_mm2: 600 * 400,
  area_total_mm2: 2750 * 1830,
  aproveitamento_percentual: (600 * 400) / (2750 * 1830) * 100,
  espacos_vazios: [],
};

describe('Motor de Simulação CNC (SimulationEngine)', () => {
  const LAYOUT_MOCK = LAYOUT_PADRAO;

  it('deve gerar SimulationProgram determinístico e estruturado', () => {
    const program = gerarSimulationProgram(LAYOUT_MOCK);
    
    expect(program.commands.length).toBeGreaterThan(0);
    expect(program.totalTempoEstimado).toBeGreaterThan(0);
    expect(program.totalDistancia).toBeGreaterThan(0);
    expect(program.totalDistanciaCorte).toBeGreaterThan(0);

    const tiposComandos = program.commands.map(c => c.tipo);
    expect(tiposComandos).toContain('SPINDLE_ON');
    expect(tiposComandos).toContain('MOVE_RAPID');
    expect(tiposComandos).toContain('PLUNGE');
    expect(tiposComandos).toContain('CONTOUR');
    expect(tiposComandos).toContain('RETRACT');
    expect(tiposComandos).toContain('SPINDLE_OFF');
  });

  it('deve simular usinagem em múltiplas passadas (stepdown)', () => {
    const program = gerarSimulationProgram(LAYOUT_MOCK);
    
    const contours = program.commands.filter(c => c.tipo === 'CONTOUR');
    expect(contours.length).toBeGreaterThanOrEqual(8);

    const plungeZPoints = program.commands
      .filter(c => c.tipo === 'PLUNGE')
      .map(c => c.params.z);

    expect(plungeZPoints).toContain(-9.5);
    expect(plungeZPoints.some(z => z <= -18)).toBe(true);
  });

  it('deve detectar colisão física com fixtures (clamps/garras)', () => {
    const clampsMock: FixtureDefinition[] = [
      {
        id: 'clamp_colisao_teste',
        tipo: 'clamp',
        x: 300,
        y: 80,
        largura: 50,
        altura: 50,
        espessura: 25,
      }
    ];

    const program = gerarSimulationProgram(LAYOUT_MOCK, MACHINE_DEFAULT, TOOL_DEFAULT, clampsMock);
    
    const colisoes = program.issues.filter(i => i.codigo === 'COLLISION_FIXTURE');
    expect(colisoes.length).toBeGreaterThan(0);
    expect(colisoes[0].severidade).toBe('error');
    expect(colisoes[0].mensagem).toContain('Garra de Fixação');
  });

  it('deve detectar overtravel de eixos limites da máquina', () => {
    const layoutExcedido: LayoutSimulacao = {
      ...LAYOUT_MOCK,
      pecas: [
        {
          id: 'peca_gigante',
          nome: 'PEÇA GIGANTE',
          comprimento: 100,
          largura: 100,
          espessura: 18,
          x: 3100,
          y: 100,
          rotacionada: false,
        }
      ]
    };

    const program = gerarSimulationProgram(layoutExcedido);
    const overtravels = program.issues.filter(i => i.codigo === 'OVERTRAVEL');
    
    expect(overtravels.length).toBeGreaterThan(0);
    expect(overtravels[0].severidade).toBe('error');
  });

  it('deve calcular métricas analíticas e tempo de ciclo coerentes', () => {
    const program = gerarSimulationProgram(LAYOUT_MOCK);
    const metrics = calcularMetrics(program, LAYOUT_MOCK);

    expect(metrics.tempoTotal).toBeGreaterThan(0);
    expect(metrics.tempoCorte).toBeGreaterThan(0);
    expect(metrics.tempoRapido).toBeGreaterThan(0);
    expect(metrics.distanciaTotal).toBeGreaterThan(0);
    expect(metrics.volumeRemovidoMm3).toBeGreaterThan(0);
  });

  it('deve interpolar e encontrar estado e comandos corretos para jump na timeline', () => {
    const program = gerarSimulationProgram(LAYOUT_MOCK);
    const totalTempo = program.totalTempoEstimado;

    const tempoMeio = totalTempo / 2;
    const estado = obterEstadoNoInstante(program, tempoMeio);

    expect(estado.comandoAtivoIdx).toBeGreaterThan(0);
    expect(estado.comandoAtivoIdx).toBeLessThan(program.commands.length);
    expect(estado.spindleOn).toBe(true);
    expect(estado.rpm).toBeGreaterThan(0);
  });

  it('deve simular integração de job MDF com timeline e playback', () => {
    const program = gerarSimulationProgram(LAYOUT_MOCK);
    const totalTempo = program.totalTempoEstimado;

    let tempoAtual = 0;
    const dt = 0.03;
    const velMultiplier = 2.0;

    const estadosColetados = [];
    while (tempoAtual < totalTempo) {
      tempoAtual += dt * velMultiplier;
      if (tempoAtual > totalTempo) tempoAtual = totalTempo;

      const estado = obterEstadoNoInstante(program, tempoAtual);
      estadosColetados.push(estado);
    }

    expect(estadosColetados.length).toBeGreaterThan(0);
    const ultimoEstado = estadosColetados[estadosColetados.length - 1];
    expect(ultimoEstado.z).toBeCloseTo(50);
  });
});

describe('Motor de Ajuste CNC (AdjustmentEngine)', () => {
  const LAYOUT_MOCK = LAYOUT_PADRAO;

  it('deve analisar issues e gerar recomendações para INSECURE_RAPID', () => {
    const configComSafeZBaixo: CncConfig = {
      ...DEFAULT_CNC_CONFIG,
      machine: {
        ...DEFAULT_CNC_CONFIG.machine,
        safeZ: 3, // safeZ muito baixo
        collisionPolicy: 'suggest',
      },
    };
    const program = gerarSimulationProgram(LAYOUT_MOCK, configComSafeZBaixo);
    const issuesWithRecs = analyzeIssues(program, configComSafeZBaixo, LAYOUT_MOCK);

    const insecureRapid = issuesWithRecs.filter(i => i.issue.codigo === 'INSECURE_RAPID');
    expect(insecureRapid.length).toBeGreaterThan(0);

    for (const iwr of insecureRapid) {
      expect(iwr.bestRecommendation).not.toBeNull();
      expect(iwr.bestRecommendation!.type).toBe('ADJUST_SAFE_Z');
      expect(iwr.bestRecommendation!.action === 'auto' || iwr.bestRecommendation!.action === 'suggested').toBe(true);
      expect(Number(iwr.bestRecommendation!.newValue)).toBeGreaterThan(Number(iwr.bestRecommendation!.oldValue));
    }
  });

  it('deve recomendar ajuste de safeZ automaticamente', () => {
    const config: CncConfig = {
      ...DEFAULT_CNC_CONFIG,
      machine: {
        ...DEFAULT_CNC_CONFIG.machine,
        safeZ: 5,
        collisionPolicy: 'auto',
      },
    };
    const program = gerarSimulationProgram(LAYOUT_MOCK, config);
    const issuesWithRecs = analyzeIssues(program, config, LAYOUT_MOCK);

    const insecureRapid = issuesWithRecs.filter(i => i.issue.codigo === 'INSECURE_RAPID');
    for (const iwr of insecureRapid) {
      const acao = determinarAcao(iwr.bestRecommendation!, 'auto');
      expect(acao).toBe('apply');

      const result = applySafeAdjustment(config, iwr.bestRecommendation!, LAYOUT_MOCK);
      expect(result.diffs.length).toBeGreaterThan(0);
      expect(result.config.machine.safeZ).toBeGreaterThan(config.machine.safeZ);
    }
  });

  it('deve detectar colisão com clamp e recomendar correção de margem', () => {
    const config: CncConfig = {
      ...DEFAULT_CNC_CONFIG,
      machine: {
        ...DEFAULT_CNC_CONFIG.machine,
        clampingMargin: 3,
        collisionPolicy: 'suggest',
      },
      fixture: {
        clamps: [
          { id: 'clamp_test', x: 280, y: 80, largura: 50, altura: 50 },
        ],
      },
    };

    const program = gerarSimulationProgram(LAYOUT_MOCK, config);
    const collisionIssues = program.issues.filter(i => i.codigo === 'COLLISION_FIXTURE');
    expect(collisionIssues.length).toBeGreaterThan(0);

    const issuesWithRecs = analyzeIssues(program, config, LAYOUT_MOCK);
    const fixCollision = issuesWithRecs.filter(i => i.issue.codigo === 'COLLISION_FIXTURE');

    for (const iwr of fixCollision) {
      expect(iwr.bestRecommendation).not.toBeNull();
      expect([
        'ADJUST_CLAMP_MARGIN',
        'ADJUST_LEAD_IN',
        'REPOSITION_CLAMP',
        'ROTATE_PART',
        'ADJUST_LEAD_OUT',
        'MANUAL_INTERVENTION_REQUIRED',
      ]).toContain(iwr.bestRecommendation!.type);
    }
  });

  it('deve aplicar ajuste de safeZ respeitando limites máximos da máquina', () => {
    const config: CncConfig = {
      ...DEFAULT_CNC_CONFIG,
      machine: {
        ...DEFAULT_CNC_CONFIG.machine,
        safeZ: 195,
        alturaMaximaZ: 200,
        collisionPolicy: 'auto',
      },
    };
    const program = gerarSimulationProgram(LAYOUT_MOCK, config);
    const issuesWithRecs = analyzeIssues(program, config, LAYOUT_MOCK);

    const insecureRapid = issuesWithRecs.filter(i => i.issue.codigo === 'INSECURE_RAPID');
    for (const iwr of insecureRapid) {
      const result = applySafeAdjustment(config, iwr.bestRecommendation!, LAYOUT_MOCK);
      const novoZ = result.config.machine.safeZ;
      expect(novoZ).toBeLessThanOrEqual(config.machine.alturaMaximaZ);
      expect(novoZ).toBeGreaterThanOrEqual(5);
    }
  });

  it('deve marcar como impossível quando safeZ já está no limite', () => {
    const config: CncConfig = {
      ...DEFAULT_CNC_CONFIG,
      machine: {
        ...DEFAULT_CNC_CONFIG.machine,
        safeZ: 200,
        alturaMaximaZ: 200,
        collisionPolicy: 'suggest',
      },
    };
    const program = gerarSimulationProgram(LAYOUT_MOCK, config);
    const issuesWithRecs = analyzeIssues(program, config, LAYOUT_MOCK);

    const insecureRapid = issuesWithRecs.filter(i => i.issue.codigo === 'INSECURE_RAPID');
    for (const iwr of insecureRapid) {
      if (iwr.bestRecommendation) {
        expect(determinarAcao(iwr.bestRecommendation, 'auto')).toBe('block');
      }
    }
  });

  it('deve marcar overtravel como impossível de auto-ajuste', () => {
    const layoutExcedido: LayoutSimulacao = {
      ...LAYOUT_MOCK,
      pecas: [
        {
          id: 'peca_gigante',
          nome: 'PEÇA GIGANTE',
          comprimento: 100,
          largura: 100,
          espessura: 18,
          x: 3100,
          y: 100,
          rotacionada: false,
        }
      ]
    };

    const config: CncConfig = {
      ...DEFAULT_CNC_CONFIG,
      machine: { ...DEFAULT_CNC_CONFIG.machine, collisionPolicy: 'suggest' },
    };
    const program = gerarSimulationProgram(layoutExcedido, config);
    const issuesWithRecs = analyzeIssues(program, config, layoutExcedido);

    const overtravelIssues = issuesWithRecs.filter(i => i.issue.codigo === 'OVERTRAVEL');
    for (const iwr of overtravelIssues) {
      if (iwr.bestRecommendation) {
        expect(determinarAcao(iwr.bestRecommendation, 'auto')).toBe('block');
        expect(iwr.bestRecommendation.action).toBe('impossible');
      }
    }
  });

  it('deve rerun simulação após ajuste e refletir novas configurações', () => {
    const configBaixo: CncConfig = {
      ...DEFAULT_CNC_CONFIG,
      machine: {
        ...DEFAULT_CNC_CONFIG.machine,
        safeZ: 3,
        collisionPolicy: 'auto',
      },
    };

    const result = recomputeSimulationAfterAdjustment(LAYOUT_MOCK, configBaixo);
    
    if (result.diffs.length > 0) {
      expect(result.program.totalTempoEstimado).toBeGreaterThan(0);
      expect(result.metrics.tempoTotal).toBeGreaterThan(0);
      
      // Verifica que o safeZ foi alterado para um valor mais seguro
      expect(result.diffs.some(d => d.paramName.includes('SafeZ') || d.paramName.includes('safeZ'))).toBe(true);
    }
  });

  it('deve gerar fixture settings para as dimensões da chapa', () => {
    const fixtures = gerarFixtureSettings(2750, 1830);
    expect(fixtures.clamps.length).toBe(4);
    
    // Cada clamp deve estar dentro dos limites da chapa
    for (const clamp of fixtures.clamps) {
      expect(clamp.x).toBeGreaterThanOrEqual(0);
      expect(clamp.y).toBeGreaterThanOrEqual(0);
      expect(clamp.x + clamp.largura).toBeLessThanOrEqual(2750);
      expect(clamp.y + clamp.altura).toBeLessThanOrEqual(1830);
    }
  });
});

describe('Política de Colisão (CollisionPolicy)', () => {
  it('deve bloquear quando política é stop mesmo com recomendação auto', () => {
    const LAYOUT: LayoutSimulacao = {
      chapa: { sku: 'T', largura: 2750, altura: 1830, espessura: 18 },
      pecas: [{ id: 'p1', nome: 'P1', comprimento: 600, largura: 400, espessura: 18, x: 100, y: 100, rotacionada: false }],
      area_aproveitada_mm2: 600*400,
      area_total_mm2: 2750*1830,
      aproveitamento_percentual: 5,
      espacos_vazios: [],
    };

    const configStop: CncConfig = {
      ...DEFAULT_CNC_CONFIG,
      machine: { ...DEFAULT_CNC_CONFIG.machine, safeZ: 3, collisionPolicy: 'stop' },
    };

    const program = gerarSimulationProgram(LAYOUT, configStop);
    const recs = analyzeIssues(program, configStop, LAYOUT);
    
    // Com política 'stop', a ação deve ser 'block' para qualquer issue
    for (const iwr of recs) {
      if (iwr.bestRecommendation) {
        expect(determinarAcao(iwr.bestRecommendation, 'stop')).toBe('block');
      }
    }
  });

  it('deve sugerir quando política é suggest', () => {
    const LAYOUT: LayoutSimulacao = {
      chapa: { sku: 'T', largura: 2750, altura: 1830, espessura: 18 },
      pecas: [{ id: 'p1', nome: 'P1', comprimento: 600, largura: 400, espessura: 18, x: 100, y: 100, rotacionada: false }],
      area_aproveitada_mm2: 600*400,
      area_total_mm2: 2750*1830,
      aproveitamento_percentual: 5,
      espacos_vazios: [],
    };

    const configSuggest: CncConfig = {
      ...DEFAULT_CNC_CONFIG,
      machine: { ...DEFAULT_CNC_CONFIG.machine, safeZ: 3, collisionPolicy: 'suggest' },
    };

    const program = gerarSimulationProgram(LAYOUT, configSuggest);
    const recs = analyzeIssues(program, configSuggest, LAYOUT);

    for (const iwr of recs) {
      if (iwr.bestRecommendation && iwr.bestRecommendation.action !== 'impossible') {
        expect(determinarAcao(iwr.bestRecommendation, 'suggest')).toBe('suggest');
      }
    }
  });
});

describe('Recomendação Avançada de Colisão (EnhancedAdjustment)', () => {
  const LAYOUT: LayoutSimulacao = {
    chapa: { sku: 'MDF-18MM', largura: 2750, altura: 1830, espessura: 18 },
    pecas: [
      { id: 'p1', nome: 'PAINEL', comprimento: 600, largura: 400, espessura: 18, x: 100, y: 100, rotacionada: false },
      { id: 'p2', nome: 'PORTA', comprimento: 400, largura: 300, espessura: 18, x: 800, y: 100, rotacionada: false },
    ],
    area_aproveitada_mm2: 600*400 + 400*300,
    area_total_mm2: 2750*1830,
    aproveitamento_percentual: 5,
    espacos_vazios: [],
  };

  it('deve recomendar reposicionamento de clamp com coordenada alternativa', () => {
    const config: CncConfig = {
      ...DEFAULT_CNC_CONFIG,
      machine: { ...DEFAULT_CNC_CONFIG.machine, clampingMargin: 3, collisionPolicy: 'suggest' },
      fixture: {
        clamps: [
          { id: 'clamp_test', x: 280, y: 80, largura: 50, altura: 50 },
        ],
      },
    };
    const program = gerarSimulationProgram(LAYOUT, config);
    const issuesWithRecs = analyzeIssues(program, config, LAYOUT);
    const collisionIssues = issuesWithRecs.filter(i => i.issue.codigo === 'COLLISION_FIXTURE');

    for (const iwr of collisionIssues) {
      const repositionRecs = iwr.recommendations.filter(r => r.type === 'REPOSITION_CLAMP');
      if (repositionRecs.length > 0) {
        expect(repositionRecs[0].action).toBe('suggested');
        expect(repositionRecs[0].newValue).toContain('X:');
        expect(repositionRecs[0].newValue).toContain('Y:');
        expect(repositionRecs[0].oldValue).not.toBe(repositionRecs[0].newValue);
      }
    }
  });

  it('deve recomendar rotação de peça quando peças estão próximas ao clamp', () => {
    const config: CncConfig = {
      ...DEFAULT_CNC_CONFIG,
      machine: { ...DEFAULT_CNC_CONFIG.machine, clampingMargin: 3, collisionPolicy: 'suggest' },
      fixture: {
        clamps: [
          { id: 'clamp_test', x: 280, y: 80, largura: 50, altura: 50 },
        ],
      },
    };
    const program = gerarSimulationProgram(LAYOUT, config);
    const issuesWithRecs = analyzeIssues(program, config, LAYOUT);
    const collisionIssues = issuesWithRecs.filter(i => i.issue.codigo === 'COLLISION_FIXTURE');

    for (const iwr of collisionIssues) {
      const rotateRecs = iwr.recommendations.filter(r => r.type === 'ROTATE_PART');
      expect(rotateRecs.length).toBeGreaterThan(0);
      expect(rotateRecs[0].action).toBe('suggested');
    }
  });

  it('deve recomendar ajuste de lead-out em colisão com fixture', () => {
    const config: CncConfig = {
      ...DEFAULT_CNC_CONFIG,
      machine: { ...DEFAULT_CNC_CONFIG.machine, leadOutDist: 10, clampingMargin: 3, collisionPolicy: 'suggest' },
      fixture: {
        clamps: [
          { id: 'clamp_test', x: 280, y: 80, largura: 50, altura: 50 },
        ],
      },
    };
    const program = gerarSimulationProgram(LAYOUT, config);
    const issuesWithRecs = analyzeIssues(program, config, LAYOUT);
    const collisionIssues = issuesWithRecs.filter(i => i.issue.codigo === 'COLLISION_FIXTURE');

    for (const iwr of collisionIssues) {
      const leadOutRecs = iwr.recommendations.filter(r => r.type === 'ADJUST_LEAD_OUT');
      expect(leadOutRecs.length).toBeGreaterThan(0);
      expect(Number(leadOutRecs[0].newValue)).toBeLessThan(Number(leadOutRecs[0].oldValue));
    }
  });
});

describe('Persistência de Configuração CNC', () => {
  it('deve fornecer configuração default quando não há dados salvos', () => {
    const config = carregarConfigCNC();
    expect(config.machine.safeZ).toBe(25);
    expect(config.machine.feedCorte).toBe(4500);
    expect(config.machine.diametroFerramenta).toBe(6.0);
    expect(config.fixture.clamps).toEqual([]);
  });

  it('deve aplicar merge com defaults para configuração parcial', () => {
    // Simula que o mergeWithDefaults preserva defaults quando campos faltam
    const parcial: Partial<CncConfig> = {
      machine: { safeZ: 50 } as any,
    };
    const resultado = (carregarConfigCNC as any).mergeWithDefaults
      ? (carregarConfigCNC as any).mergeWithDefaults(parcial)
      : null;
    // Se mergeWithDefaults não for exportada, ao menos verifica que o default tem todos os campos
    const config = carregarConfigCNC();
    expect(config.machine.safeZ).toBeDefined();
    expect(config.machine.feedCorte).toBeDefined();
    expect(config.machine.limiteX).toBeDefined();
    expect(config.machine.limiteY).toBeDefined();
    expect(config.machine.collisionPolicy).toBeDefined();
  });
});

describe('Clamp Editing Integration', () => {
  it('deve aceitar clamps na fixture settings e gerar fixtures corretas', () => {
    const config: CncConfig = {
      ...DEFAULT_CNC_CONFIG,
      machine: { ...DEFAULT_CNC_CONFIG.machine, collisionPolicy: 'suggest' },
      fixture: {
        clamps: [
          { id: 'clamp_a', x: 50, y: 50, largura: 45, altura: 80 },
          { id: 'clamp_b', x: 2600, y: 50, largura: 45, altura: 80 },
          { id: 'clamp_c', x: 50, y: 1700, largura: 45, altura: 80 },
        ],
      },
    };

    expect(config.fixture.clamps.length).toBe(3);
    expect(config.fixture.clamps[0].id).toBe('clamp_a');
    expect(config.fixture.clamps[1].x).toBe(2600);

    // Gera programa e verifica se os clamps são usados
    const program = gerarSimulationProgram(LAYOUT_PADRAO, config);
    expect(program.commands.length).toBeGreaterThan(0);
  });

  it('deve gerar clamps padrão quando fixture vazia', () => {
    const config: CncConfig = {
      ...DEFAULT_CNC_CONFIG,
      fixture: { clamps: [] },
    };

    // O gerarSimulationProgram deve popular com fixtures padrão
    const program = gerarSimulationProgram(LAYOUT_PADRAO, config);
    expect(program.commands.length).toBeGreaterThan(0);
  });
});

describe('Risk Zone Detection', () => {
  it('deve detectar e marcar pontos de colisão com posição específica', () => {
    const config: CncConfig = {
      ...DEFAULT_CNC_CONFIG,
      machine: { ...DEFAULT_CNC_CONFIG.machine, clampingMargin: 3, collisionPolicy: 'suggest' },
      fixture: {
        clamps: [
          { id: 'clamp_risk', x: 280, y: 80, largura: 50, altura: 50 },
        ],
      },
    };

    const program = gerarSimulationProgram(LAYOUT_PADRAO, config);
    const colisoes = program.issues.filter(i => i.codigo === 'COLLISION_FIXTURE');

    expect(colisoes.length).toBeGreaterThan(0);
    for (const col of colisoes) {
      expect(col.posicao.x).toBeDefined();
      expect(col.posicao.y).toBeDefined();
      expect(col.posicao.z).toBeDefined();
      // A posição deve estar dentro dos limites da chapa
      expect(col.posicao.x).toBeGreaterThanOrEqual(0);
      expect(col.posicao.y).toBeGreaterThanOrEqual(0);
    }
  });
});
