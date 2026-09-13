import { describe, it, expect } from 'vitest';
import * as calc from './calculations';

describe('RH Domain Calculations (Fórmulas puras)', () => {
  it('toNum e round2 devem normalizar números corretamente', () => {
    expect(calc.toNum(null)).toBe(0);
    expect(calc.toNum(undefined)).toBe(0);
    expect(calc.toNum('')).toBe(0);
    expect(calc.toNum('123.45')).toBe(123.45);
    expect(calc.toNum(NaN)).toBe(0);
    expect(calc.round2(10.555)).toBe(10.56);
    expect(calc.round2(10.554)).toBe(10.55);
  });

  it('calcValorDia deve calcular salario_base / 30', () => {
    expect(calc.calcValorDia(3000)).toBe(100);
    expect(calc.calcValorDia(2500)).toBe(83.33);
  });

  it('calcValorHora deve respeitar o divisor configurado (padrão 220)', () => {
    expect(calc.calcValorHora(2200, 220)).toBe(10);
    expect(calc.calcValorHora(2200, 200)).toBe(11);
  });

  it('calcFaltasDias deve somar falta inteira e meio_periodo, ignorando justificadas', () => {
    const presencas = [
      { status: 'falta' },
      { status: 'falta' },
      { status: 'meio_periodo' },
      { status: 'falta_justificada' },
      { status: 'atestado' },
      { status: 'presente' },
    ];
    expect(calc.calcFaltasDias(presencas)).toBe(2.5);
  });

  it('calcValorFaltas deve multiplicar dias por valor do dia', () => {
    expect(calc.calcValorFaltas(2, 3000)).toBe(200);
    expect(calc.calcValorFaltas(1.5, 3000)).toBe(150);
  });

  it('calcValorHE deve calcular horas extras com adicionais (50%, 100%)', () => {
    // 2200 salário, 220 divisor = R$ 10/h.
    // 10 horas a 50% = 10 * 10 * 1.5 = 150
    expect(calc.calcValorHE(10, 2200, 220, 50)).toBe(150);
    // 10 horas a 100% = 10 * 10 * 2.0 = 200
    expect(calc.calcValorHE(10, 2200, 220, 100)).toBe(200);
  });

  it('calcLiquido e calcLiquidoPrevisto devem calcular corretamente descontos e acréscimos', () => {
    const resReal = calc.calcLiquido({
      salarioBase: 3000,
      valorFaltas: 100,
      valorHorasExtras: 300,
      bonusProducao: 200,
      adiantamento: 500,
      outrosDescontos: 50,
    });
    // 3000 - 100 + 300 + 200 - 500 - 50 = 2850
    expect(resReal).toBe(2850);

    const resPrev = calc.calcLiquidoPrevisto({
      salarioBase: 3000,
      valorFaltas: 100,
      valorHorasExtrasPrevisto: 150,
      bonusProducao: 200,
      adiantamento: 500,
      outrosDescontos: 50,
    });
    // 3000 - 100 + 150 + 200 - 500 - 50 = 2700
    expect(resPrev).toBe(2700);
  });

  it('calcDisponivelAdiantamento deve limitar a 50% do salário menos pendentes', () => {
    expect(calc.calcDisponivelAdiantamento(3000, 500)).toBe(1000);
    expect(calc.calcDisponivelAdiantamento(3000, 1500)).toBe(0);
    expect(calc.calcDisponivelAdiantamento(3000, 1600)).toBe(-100);
  });

  it('calcLucroDistribuivel e calcLucroPorSocio', () => {
    // Receita: 100.000, Custos: 40.000, Folha Colaboradores: 20.000 -> Lucro: 40.000
    const lucro = calc.calcLucroDistribuivel(100000, 40000, 20000);
    expect(lucro).toBe(40000);

    // Socio 1: 60% = 24.000
    expect(calc.calcLucroPorSocio(lucro, 60)).toBe(24000);
    // Socio 2: 40% = 16.000
    expect(calc.calcLucroPorSocio(lucro, 40)).toBe(16000);
  });

  it('quintoDiaUtilCompetencia deve identificar o 5º dia útil do mês seguinte', () => {
    // Competencia 2026-09 -> Outubro de 2026
    // 1/10 (Qui)=1, 2/10 (Sex)=2, 3/10 (Sab), 4/10 (Dom), 5/10 (Seg)=3, 6/10 (Ter)=4, 7/10 (Qua)=5
    expect(calc.quintoDiaUtilCompetencia('2026-09')).toBe('2026-10-07');
  });

  it('formatCompetenciaToRange deve gerar intervalo de datas', () => {
    const range = calc.formatCompetenciaToRange('2026-12');
    expect(range.inicio).toBe('2026-12-01');
    expect(range.fimExclusivo).toBe('2027-01-01');
  });
});
