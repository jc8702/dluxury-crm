import { describe, it, expect } from 'vitest';
import { exportarCNC, salvarArquivoCNC } from './ExportarCNC.js';
import type { LayoutChapa } from '../../domain/entities/CuttingPlan';

const mockLayout: LayoutChapa = {
  chapa_sku: 'CHP-MDF-15-BRANCO',
  largura_original_mm: 2750,
  altura_original_mm: 1850,
  espessura_mm: 15,
  aproveitamento_pct: 78.5,
  pecas_posicionadas: [
    {
      nome: 'Lateral Armário',
      largura: 600,
      altura: 1800,
      x: 50,
      y: 50,
      rotacao: 0,
    },
    {
      nome: 'Prateleira',
      largura: 800,
      altura: 250,
      x: 700,
      y: 50,
      rotacao: 0,
    },
  ],
  retalhos_gerados: [],
};

describe('exportarCNC', () => {
  it('deve gerar cabeçalho com informações da chapa', () => {
    const gcode = exportarCNC(mockLayout);
    expect(gcode).toContain('CHP-MDF-15-BRANCO');
    expect(gcode).toContain('2750×1850mm');
    expect(gcode).toContain('Peças: 2');
  });

  it('deve incluir comandos de inicialização G21, G90, G17', () => {
    const gcode = exportarCNC(mockLayout);
    expect(gcode).toContain('G21');
    expect(gcode).toContain('G90');
    expect(gcode).toContain('G17');
  });

  it('deve incluir M03 (liga spindle) e M05 (desliga)', () => {
    const gcode = exportarCNC(mockLayout);
    expect(gcode).toContain('M03');
    expect(gcode).toContain('M05');
    expect(gcode).toContain('M30');
  });

  it('deve gerar caminho de corte para cada peça (G01 X/Y)', () => {
    const gcode = exportarCNC(mockLayout);
    const matches = gcode.match(/G01 X[\d.-]+ Y[\d.-]+/g) || [];
    expect(matches.length).toBeGreaterThan(0);
  });

  it('deve calcular passadas baseado em profundidadeTotal e profundidadePasso', () => {
    const gcode = exportarCNC(mockLayout);
    expect(gcode).toContain('Passada 1/2');
    expect(gcode).toContain('Passada 2/2');
  });

  it('deve aceitar config customizada', () => {
    const gcode = exportarCNC(mockLayout, {
      velocidadeCorte: 6000,
      profundidadeTotal: -20,
      profundidadePasso: 5,
      velocidadeMergulho: 1500,
      alturaSeguranca: 15,
      spindleRPM: 20000,
      leadInMm: 8,
    });
    expect(gcode).toContain('S20000');
    expect(gcode).toContain('Z15');
  });

  it('deve usar config padrão quando nenhuma for passada', () => {
    const gcode = exportarCNC(mockLayout);
    expect(gcode).toContain('S18000');
  });

  it('deve respeitar profundidadeTotal mesmo com múltiplas passadas', () => {
    const gcode = exportarCNC(mockLayout, {
      velocidadeCorte: 4500,
      profundidadeTotal: -18,
      profundidadePasso: 9,
      velocidadeMergulho: 1200,
      alturaSeguranca: 10,
      spindleRPM: 18000,
      leadInMm: 5,
    });
    expect(gcode).toContain('Z-18.00');
  });

  it('deve gerar G-code para layout vazio (zero peças)', () => {
    const empty: LayoutChapa = { ...mockLayout, pecas_posicionadas: [] };
    const gcode = exportarCNC(empty);
    expect(gcode).toContain('Peças: 0');
    expect(gcode).toContain('M30');
  });

  it('deve terminar com retorno de segurança Z50 e home X0 Y0', () => {
    const gcode = exportarCNC(mockLayout);
    expect(gcode).toContain('Z50');
    expect(gcode).toContain('X0 Y0');
  });
});

describe('salvarArquivoCNC', () => {
  it('deve executar sem erro em ambiente jsdom', () => {
    expect(() => salvarArquivoCNC('G0 X0', 'test.nc')).not.toThrow();
  });

  it('deve aceitar nome de arquivo customizado (default = plano-corte.nc)', () => {
    expect(() => salvarArquivoCNC('G0 X0', 'custom-name.nc')).not.toThrow();
  });

  it('deve aceitar gcode grande', () => {
    const gcode = 'G0 X0\nG1 X10\nG0 Z10\n'.repeat(1000);
    expect(() => salvarArquivoCNC(gcode, 'large.nc')).not.toThrow();
  });
});
