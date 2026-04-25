/**
 * D'LUXURY INDUSTRIAL - CORE ENGINE
 * Algoritmo MaxRects BSSF (Best Short Side Fit)
 * Otimização de Plano de Corte de Nível Industrial
 */

export interface PecaInput {
  id: string;
  descricao: string;
  larguraMm: number;
  alturaMm: number;
  quantidade: number;
  podeRotacionar: boolean;
  ambiente?: string;
  movel?: string;
  corEtiqueta?: string;
  grupoMaterialId: string;
}

export interface ChapaSurface {
  id: string;
  tipo: 'inteira' | 'retalho';
  larguraMm: number;
  alturaMm: number;
  retalhoId?: string;
  custo: number;
}

export interface RetalhoEstoque {
  id: string;
  larguraMm: number;
  alturaMm: number;
  sku: string;
  materialId: string;
}

export interface GrupoMaterial {
  id: string;
  materialId: string;
  sku: string;
  nomeMaterial: string;
  larguraChapaMm: number;
  alturaChapaMm: number;
  espessuraMm: number;
  precoChapa: number;
  chapasAdicionaisManual: number;
  retalhosDisponiveis: RetalhoEstoque[];
  kerfMm: number;
}

export interface PecaPositionada {
  pecaId: string;
  descricao: string;
  ambiente?: string;
  movel?: string;
  superficieId: string;
  grupoMaterialId: string;
  x: number;
  y: number;
  largura: number;
  altura: number;
  rotacionada: boolean;
  corEtiqueta: string;
  numeroEtiqueta: number;
  areaMm2: number;
  custoProporcional: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Superficie {
  id: string;
  tipo: 'inteira' | 'retalho';
  largura: number;
  altura: number;
  espacosLivres: Rect[];
  pecasPositionadas: PecaPositionada[];
  aproveitamentoPct: number;
  custoTotal: number;
  retalhoId?: string;
}

export interface Sobra {
  id: string;
  superficieId: string;
  x: number;
  y: number;
  largura: number;
  altura: number;
  aproveitavel: boolean;
}

export interface ResultadoGrupo {
  grupoId: string;
  sku: string;
  superficies: Superficie[];
  totalChapasInteiras: number;
  totalRetalhosUsados: number;
  aproveitamentoMedio: number;
  sobrasAproveitaveis: Sobra[];
  custoTotal: number;
}

export interface ResultadoPlano {
  grupos: ResultadoGrupo[];
  totalPecasPositionadas: number;
  totalChapasInteiras: number;
  totalRetalhosUsados: number;
  aproveitamentoGeral: number;
  custoTotalMaterial: number;
  sobrasGeradas: Sobra[];
  tempoCalculoMs: number;
  pecasNaoEncaixadas: PecaInput[];
}

export function calcularPlanoCorte(
  pecas: PecaInput[],
  grupos: GrupoMaterial[],
  iteracoes: number = 3
): ResultadoPlano {
  const inicio = Date.now();
  const resultadosGrupos: ResultadoGrupo[] = [];
  let totalPecasEncaixadas = 0;
  const pecasNaoEncaixadas: PecaInput[] = [];

  for (const grupo of grupos) {
    const pecasDoGrupo = pecas.filter(p => p.grupoMaterialId === grupo.id);
    const pecasExpandidas = expandirPorQuantidade(pecasDoGrupo);

    let melhorResultado: ResultadoGrupo | null = null;
    let melhorAproveitamento = -1;

    for (let i = 0; i < iteracoes; i++) {
      const pecasOrdem = i === 0 
        ? [...pecasExpandidas].sort((a, b) => (b.larguraMm * b.alturaMm) - (a.larguraMm * a.alturaMm))
        : embaralharPecas(pecasExpandidas);

      const resultado = processarGrupo(pecasOrdem, grupo);
      
      if (resultado.aproveitamentoMedio > melhorAproveitamento) {
        melhorAproveitamento = resultado.aproveitamentoMedio;
        melhorResultado = resultado;
      }
    }

    if (melhorResultado) {
      resultadosGrupos.push(melhorResultado);
      totalPecasEncaixadas += melhorResultado.superficies.reduce((acc, s) => acc + s.pecasPositionadas.length, 0);
    }
  }

  const sobrasGeradas = resultadosGrupos.flatMap(g => g.sobrasAproveitaveis);
  
  // Numerar etiquetas sequencialmente
  let etiquetaSeq = 1;
  resultadosGrupos.forEach(g => {
    g.superficies.forEach(s => {
      s.pecasPositionadas.forEach(p => {
        p.numeroEtiqueta = etiquetaSeq++;
      });
    });
  });

  const totalChapas = resultadosGrupos.reduce((acc, g) => acc + g.totalChapasInteiras, 0);
  const totalRetalhos = resultadosGrupos.reduce((acc, g) => acc + g.totalRetalhosUsados, 0);
  const custoTotal = resultadosGrupos.reduce((acc, g) => acc + g.custoTotal, 0);
  const aproveitamentoGeral = resultadosGrupos.length > 0 
    ? resultadosGrupos.reduce((acc, g) => acc + g.aproveitamentoMedio, 0) / resultadosGrupos.length
    : 0;

  return {
    grupos: resultadosGrupos,
    totalPecasPositionadas: totalPecasEncaixadas,
    totalChapasInteiras: totalChapas,
    totalRetalhosUsados: totalRetalhos,
    aproveitamentoGeral,
    custoTotalMaterial: custoTotal,
    sobrasGeradas,
    tempoCalculoMs: Date.now() - inicio,
    pecasNaoEncaixadas
  };
}

function processarGrupo(pecas: PecaInput[], grupo: GrupoMaterial): ResultadoGrupo {
  const superficies: Superficie[] = [];
  const pecasRestantes = [...pecas];

  // 1. Tentar encaixar em retalhos primeiro
  for (const retalho of grupo.retalhosDisponiveis) {
    if (pecasRestantes.length === 0) break;
    
    const s = criarSuperficie(retalho.id, 'retalho', retalho.larguraMm, retalho.alturaMm, 0, retalho.id);
    const encaixadasIds = encaixarNaSuperficie(pecasRestantes, s, grupo.kerfMm, grupo.id);
    
    if (encaixadasIds.length > 0) {
      superficies.push(s);
      // Remover peças encaixadas
      encaixadasIds.forEach(id => {
        const idx = pecasRestantes.findIndex(r => r.id === id);
        if (idx !== -1) pecasRestantes.splice(idx, 1);
      });
    }
  }

  // 2. Usar chapas inteiras para o restante
  while (pecasRestantes.length > 0) {
    const s = criarSuperficie(`inteira-${superficies.length + 1}`, 'inteira', grupo.larguraChapaMm, grupo.alturaChapaMm, grupo.precoChapa);
    const encaixadasIds = encaixarNaSuperficie(pecasRestantes, s, grupo.kerfMm, grupo.id);
    
    if (encaixadasIds.length === 0) {
      // Peça não cabe nem em chapa vazia? Erro de input, mas vamos pular para não travar
      console.warn('Peça muito grande para a chapa:', pecasRestantes[0]);
      pecasRestantes.shift();
      continue;
    }

    superficies.push(s);
    encaixadasIds.forEach(id => {
      const idx = pecasRestantes.findIndex(r => r.id === id);
      if (idx !== -1) pecasRestantes.splice(idx, 1);
    });
  }

  // Chapas manuais extras
  for (let i = 0; i < grupo.chapasAdicionaisManual; i++) {
    superficies.push(criarSuperficie(`extra-${i}`, 'inteira', grupo.larguraChapaMm, grupo.alturaChapaMm, grupo.precoChapa));
  }

  const totalChapas = superficies.filter(s => s.tipo === 'inteira').length;
  const totalRetalhos = superficies.filter(s => s.tipo === 'retalho').length;
  const custoTotal = superficies.reduce((acc, s) => acc + s.custoTotal, 0);
  const aproveitamentoMedio = superficies.length > 0
    ? superficies.reduce((acc, s) => acc + s.aproveitamentoPct, 0) / superficies.length
    : 0;

  const sobras: Sobra[] = superficies.flatMap(s => 
    s.espacosLivres
      .filter(r => r.width >= 200 || r.height >= 200)
      .map(r => ({
        id: Math.random().toString(36).substring(7),
        superficieId: s.id,
        x: r.x,
        y: r.y,
        largura: r.width,
        altura: r.height,
        aproveitavel: true
      }))
  );

  return {
    grupoId: grupo.id,
    sku: grupo.sku,
    superficies,
    totalChapasInteiras: totalChapas,
    totalRetalhosUsados: totalRetalhos,
    aproveitamentoMedio,
    sobrasAproveitaveis: sobras,
    custoTotal
  };
}

function criarSuperficie(id: string, tipo: 'inteira' | 'retalho', w: number, h: number, custo: number, retalhoId?: string): Superficie {
  return {
    id,
    tipo,
    largura: w,
    altura: h,
    espacosLivres: [{ x: 0, y: 0, width: w, height: h }],
    pecasPositionadas: [],
    aproveitamentoPct: 0,
    custoTotal: custo,
    retalhoId
  };
}

function expandirPorQuantidade(pecas: PecaInput[]): PecaInput[] {
  return pecas.flatMap(p => Array(p.quantidade).fill(null).map((_, i) => ({ ...p, id: `${p.id}_${i}` })));
}

function embaralharPecas(pecas: PecaInput[]): PecaInput[] {
  const result = [...pecas];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Lógica MaxRects BSSF Core
 */
function encaixarNaSuperficie(pecas: PecaInput[], superficie: Superficie, kerf: number, grupoId: string): string[] {
  const encaixadas: string[] = [];

  for (const peca of pecas) {
    let bestFit: { rect: Rect; rot: boolean; score: number } | null = null;

    for (const freeRect of superficie.espacosLivres) {
      // Normal
      if (peca.larguraMm <= freeRect.width && peca.alturaMm <= freeRect.height) {
        const score = Math.min(freeRect.width - peca.larguraMm, freeRect.height - peca.alturaMm);
        if (!bestFit || score < bestFit.score) {
          bestFit = { rect: freeRect, rot: false, score };
        }
      }
      // Rotacionada
      if (peca.podeRotacionar && peca.alturaMm <= freeRect.width && peca.larguraMm <= freeRect.height) {
        const score = Math.min(freeRect.width - peca.alturaMm, freeRect.height - peca.larguraMm);
        if (!bestFit || score < bestFit.score) {
          bestFit = { rect: freeRect, rot: true, score };
        }
      }
    }

    if (bestFit) {
      const w = bestFit.rot ? peca.alturaMm : peca.larguraMm;
      const h = bestFit.rot ? peca.larguraMm : peca.alturaMm;

      const posPeca: PecaPositionada = {
        pecaId: peca.id.split('_')[0],
        descricao: peca.descricao,
        ambiente: peca.ambiente,
        movel: peca.movel,
        superficieId: superficie.id,
        grupoMaterialId: grupoId,
        x: bestFit.rect.x,
        y: bestFit.rect.y,
        largura: w,
        altura: h,
        rotacionada: bestFit.rot,
        corEtiqueta: peca.corEtiqueta || '#6B7280',
        numeroEtiqueta: 0,
        areaMm2: w * h,
        custoProporcional: 0 // Calculado post-process
      };

      superficie.pecasPositionadas.push(posPeca);
      dividirEspacos(superficie, posPeca, kerf);
      encaixadas.push(peca.id);
    }
  }

  // Calcular aproveitamento
  const areaPecas = superficie.pecasPositionadas.reduce((acc, p) => acc + (p.largura * p.altura), 0);
  superficie.aproveitamentoPct = (areaPecas / (superficie.largura * superficie.altura)) * 100;

  return encaixadas;
}

function dividirEspacos(superficie: Superficie, peca: PecaPositionada, kerf: number) {
  const newFreeRects: Rect[] = [];
  const pecaRect = { x: peca.x, y: peca.y, width: peca.largura + kerf, height: peca.altura + kerf };

  for (const freeRect of superficie.espacosLivres) {
    if (!intersect(freeRect, pecaRect)) {
      newFreeRects.push(freeRect);
      continue;
    }

    // Split
    if (pecaRect.x < freeRect.x + freeRect.width && pecaRect.x + pecaRect.width > freeRect.x) {
      // Top
      if (pecaRect.y > freeRect.y && pecaRect.y < freeRect.y + freeRect.height) {
        newFreeRects.push({ x: freeRect.x, y: freeRect.y, width: freeRect.width, height: pecaRect.y - freeRect.y });
      }
      // Bottom
      if (pecaRect.y + pecaRect.height < freeRect.y + freeRect.height) {
        newFreeRects.push({ x: freeRect.x, y: pecaRect.y + pecaRect.height, width: freeRect.width, height: freeRect.y + freeRect.height - (pecaRect.y + pecaRect.height) });
      }
    }
    if (pecaRect.y < freeRect.y + freeRect.height && pecaRect.y + pecaRect.height > freeRect.y) {
      // Left
      if (pecaRect.x > freeRect.x && pecaRect.x < freeRect.x + freeRect.width) {
        newFreeRects.push({ x: freeRect.x, y: freeRect.y, width: pecaRect.x - freeRect.x, height: freeRect.height });
      }
      // Right
      if (pecaRect.x + pecaRect.width < freeRect.x + freeRect.width) {
        newFreeRects.push({ x: pecaRect.x + pecaRect.width, y: freeRect.y, width: freeRect.x + freeRect.width - (pecaRect.x + pecaRect.width), height: freeRect.height });
      }
    }
  }

  // Limpar retângulos redundantes
  superficie.espacosLivres = limparRedundancias(newFreeRects);
}

function intersect(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

function limparRedundancias(rects: Rect[]): Rect[] {
  const result: Rect[] = [];
  for (let i = 0; i < rects.length; i++) {
    let keep = true;
    for (let j = 0; j < rects.length; j++) {
      if (i === j) continue;
      if (contais(rects[j], rects[i])) {
        keep = false;
        break;
      }
    }
    if (keep) result.push(rects[i]);
  }
  return result;
}

function contais(a: Rect, b: Rect): boolean {
  return a.x <= b.x && a.y <= b.y && a.x + a.width >= b.x + b.width && a.y + a.height >= b.y + b.height;
}
