import { describe, it, expect } from 'vitest';
import {
  gerarSimulationProgram,
  calcularMetrics,
  obterEstadoNoInstante,
  MACHINE_DEFAULT,
  TOOL_DEFAULT,
} from '../domain/simulationEngine';
import type { LayoutSimulacao, FixtureDefinition } from '../domain/types';

describe('Motor de Simulação CNC (SimulationEngine)', () => {
  const LAYOUT_MOCK: LayoutSimulacao = {
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

  it('deve gerar SimulationProgram determinístico e estruturado', () => {
    const program = gerarSimulationProgram(LAYOUT_MOCK);
    
    expect(program.commands.length).toBeGreaterThan(0);
    expect(program.totalTempoEstimado).toBeGreaterThan(0);
    expect(program.totalDistancia).toBeGreaterThan(0);
    expect(program.totalDistanciaCorte).toBeGreaterThan(0);

    // Deve conter comandos essenciais de máquina
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
    
    // Filtra comandos de contorno da peça
    const contours = program.commands.filter(c => c.tipo === 'CONTOUR');
    
    // A chapa tem 18mm, com stepdown padrão de 9.5mm, deve fazer em pelo menos 2 passadas
    // Cada passada executa 4 arestas (4 * 2 passadas = 8 comandos de contorno)
    expect(contours.length).toBeGreaterThanOrEqual(8);

    // Verifica se a profundidade (Z) em algum momento vai além de -18mm (Z real de corte)
    const plungeZPoints = program.commands
      .filter(c => c.tipo === 'PLUNGE')
      .map(c => c.params.z);

    expect(plungeZPoints).toContain(-9.5);
    expect(plungeZPoints.some(z => z <= -18)).toBe(true);
  });

  it('deve detectar colisão física com fixtures (clamps/garras)', () => {
    // Posiciona um clamp diretamente na rota de corte da peça_1
    // Peça_1 está de X:100 a X:700, Y:100 a Y:500.
    // Colocamos o clamp em X:300 Y:100
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
    
    // Filtra issues do tipo COLLISION_FIXTURE
    const colisoes = program.issues.filter(i => i.codigo === 'COLLISION_FIXTURE');
    expect(colisoes.length).toBeGreaterThan(0);
    expect(colisoes[0].severidade).toBe('error');
    expect(colisoes[0].mensagem).toContain('Garra de Fixação');
  });

  it('deve detectar overtravel de eixos limites da máquina', () => {
    // Força layout de chapa enorme que excede a mesa da máquina (MACHINE_DEFAULT é 3000 x 2000)
    // Colocamos uma peça em X:3200 Y:100
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

    // Meio do programa
    const tempoMeio = totalTempo / 2;
    const estado = obterEstadoNoInstante(program, tempoMeio);

    expect(estado.comandoAtivoIdx).toBeGreaterThan(0);
    expect(estado.comandoAtivoIdx).toBeLessThan(program.commands.length);
    expect(estado.spindleOn).toBe(true);
    expect(estado.rpm).toBeGreaterThan(0);
  });
});
