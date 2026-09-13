/**
 * calculations.ts — Fórmulas puras RH (testável, sem I/O)
 * Seção 5 do PLANO_RH.md
 */

export function toNum(v: unknown): number {
  if (v === null || v === undefined || v === '') return 0;
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** valorDia = salario_base / 30 */
export function calcValorDia(salarioBase: number): number {
  return round2(toNum(salarioBase) / 30);
}

/** valorHora = salario_base / divisor (220 default) */
export function calcValorHora(salarioBase: number, divisor = 220): number {
  const d = toNum(divisor) || 220;
  return round2(toNum(salarioBase) / d);
}

/**
 * faltas_dias = COUNT(falta) + 0.5*COUNT(meio_periodo)
 * falta_justificada / atestado / ferias / presente não descontam
 */
export function calcFaltasDias(presencas: Array<{ status: string }>): number {
  let total = 0;
  for (const p of presencas) {
    if (p.status === 'falta') total += 1;
    else if (p.status === 'meio_periodo') total += 0.5;
  }
  return round2(total);
}

/** valorFaltas = faltas_dias * valorDia */
export function calcValorFaltas(faltasDias: number, salarioBase: number): number {
  return round2(toNum(faltasDias) * calcValorDia(salarioBase));
}

/** valorHE = qtd * valorHora * (1 + adicional/100) */
export function calcValorHE(
  qtd: number,
  salarioBase: number,
  divisor = 220,
  adicional: number | string = 50,
): number {
  const add = toNum(adicional);
  const factor = 1 + add / 100;
  return round2(toNum(qtd) * calcValorHora(salarioBase, divisor) * factor);
}

export function calcLiquido(params: {
  salarioBase: number;
  valorFaltas: number;
  valorHorasExtras: number;
  bonusProducao: number;
  adiantamento: number;
  outrosDescontos: number;
}): number {
  const {
    salarioBase,
    valorFaltas,
    valorHorasExtras,
    bonusProducao,
    adiantamento,
    outrosDescontos,
  } = params;
  return round2(
    toNum(salarioBase) -
      toNum(valorFaltas) +
      toNum(valorHorasExtras) +
      toNum(bonusProducao) -
      toNum(adiantamento) -
      toNum(outrosDescontos),
  );
}

export function calcLiquidoPrevisto(params: {
  salarioBase: number;
  valorFaltas: number;
  valorHorasExtrasPrevisto: number;
  bonusProducao: number;
  adiantamento: number;
  outrosDescontos: number;
}): number {
  const {
    salarioBase,
    valorFaltas,
    valorHorasExtrasPrevisto,
    bonusProducao,
    adiantamento,
    outrosDescontos,
  } = params;
  return round2(
    toNum(salarioBase) -
      toNum(valorFaltas) +
      toNum(valorHorasExtrasPrevisto) +
      toNum(bonusProducao) -
      toNum(adiantamento) -
      toNum(outrosDescontos),
  );
}

/** disponivel = 50% salario - sum pendentes na competencia */
export function calcDisponivelAdiantamento(salarioBase: number, sumPendentes: number): number {
  return round2(toNum(salarioBase) * 0.5 - toNum(sumPendentes));
}

export function calcLucroDistribuivel(
  receitaMes: number,
  custosMes: number,
  totalFolhaColaboradores: number,
): number {
  return round2(toNum(receitaMes) - toNum(custosMes) - toNum(totalFolhaColaboradores));
}

export function calcLucroPorSocio(lucroDistribuivel: number, participacao: number): number {
  return round2(toNum(lucroDistribuivel) * (toNum(participacao) / 100));
}

/** 5º dia útil do mês seguinte à competência YYYY-MM */
export function quintoDiaUtilCompetencia(competencia: string): string {
  // competencia '2026-09' => vencimento 5º dia útil de 2026-10
  const [y, m] = competencia.split('-').map(Number);
  let year = y;
  let month = m; // 1..12, next month
  month += 1;
  if (month > 12) {
    month = 1;
    year += 1;
  }
  // encontra 5º dia útil (seg-sex)
  let diaUtil = 0;
  let dia = 1;
  let date = new Date(year, month - 1, dia);
  while (dia <= 31) {
    date = new Date(year, month - 1, dia);
    if (date.getMonth() !== month - 1) break;
    const dow = date.getDay(); // 0 dom, 6 sab
    if (dow !== 0 && dow !== 6) {
      diaUtil++;
      if (diaUtil === 5) break;
    }
    dia++;
  }
  const mm = String(month).padStart(2, '0');
  const dd = String(dia).padStart(2, '0');
  return `${year}-${mm}-${dd}`;
}

export function formatCompetenciaToRange(competencia: string): {
  inicio: string;
  fimExclusivo: string;
  prox: string;
} {
  const [y, m] = competencia.split('-').map(Number);
  const inicio = `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-01`;
  let ny = y;
  let nm = m + 1;
  if (nm > 12) {
    nm = 1;
    ny += 1;
  }
  const prox = `${String(ny).padStart(4, '0')}-${String(nm).padStart(2, '0')}-01`;
  return { inicio, fimExclusivo: prox, prox };
}
