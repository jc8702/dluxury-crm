/**
 * WEB WORKER: ALGORITMO DE OTIMIZAÇÃO GUILLOTINE BFD
 */

import type {
  ChapaMaterial,
  PecaCorte,
  ResultadoOtimizacao,
  LayoutChapa,
  PecaPosicionada,
} from '../../domain/entities/CuttingPlan';

self.onmessage = (e: MessageEvent) => {
  const { materiais, kerf_mm } = e.data;
  
  try {
    const inicio = performance.now();
    const resultado = otimizar(materiais, kerf_mm);
    const fim = performance.now();
    
    resultado.tempo_calculo_ms = fim - inicio;
    self.postMessage({ tipo: 'resultado', resultado });
  } catch (err: any) {
    self.postMessage({ tipo: 'erro', mensagem: err.message });
  }
};

function otimizar(materiais: ChapaMaterial[], kerf: number): ResultadoOtimizacao {
  let layouts: LayoutChapa[] = [];
  let areaTotalAproveitada = 0;
  let areaTotalMateriais = 0;

  for (const mat of materiais) {
    // 1. Preparar lista de peças individuais (expandindo quantidade)
    let todasAsPecas: PecaCorte[] = [];
    mat.pecas.forEach(p => {
      for (let i = 0; i < p.quantidade; i++) {
        todasAsPecas.push({ ...p, id: `${p.id}_${i}` });
      }
    });

    // 2. Ordenar por área decrescente (BFD)
    todasAsPecas.sort((a, b) => (b.largura_mm * b.altura_mm) - (a.largura_mm * a.altura_mm));

    let chapasEscalonadas: LayoutChapa[] = [];
    let chapasAtuais: { largura: number, altura: number, espacos: { x: number, y: number, w: number, h: number }[] }[] = [];

    todasAsPecas.forEach(peca => {
      let posicionada = false;

      // Tentar em chapas já abertas
      for (let i = 0; i < chapasAtuais.length; i++) {
        const res = tentarPosicionar(peca, chapasAtuais[i], kerf);
        if (res) {
          chapasEscalonadas[i].pecas_posicionadas.push(res);
          posicionada = true;
          break;
        }
      }

      // Se não posicionou, abrir nova chapa
      if (!posicionada) {
        const nova = { largura: mat.largura_mm, altura: mat.altura_mm, espacos: [{ x: 0, y: 0, w: mat.largura_mm, h: mat.altura_mm }] };
        const res = tentarPosicionar(peca, nova, kerf);
        if (res) {
          chapasAtuais.push(nova);
          chapasEscalonadas.push({
            chapa_sku: mat.sku,
            indice_chapa: chapasAtuais.length,
            pecas_posicionadas: [res],
            area_aproveitada_mm2: 0,
            area_desperdicada_mm2: 0
          });
        } else {
            throw new Error(`Peça "${peca.nome}" (${peca.largura_mm}x${peca.altura_mm}) é maior que a chapa (${mat.largura_mm}x${mat.altura_mm})`);
        }
      }
    });

    // Calcular áreas para o material
    chapasEscalonadas.forEach((layout, idx) => {
      const areaAproveitada = layout.pecas_posicionadas.reduce((acc, p) => acc + (p.largura * p.altura), 0);
      const areaChapa = mat.largura_mm * mat.altura_mm;
      layout.area_aproveitada_mm2 = areaAproveitada;
      layout.area_desperdicada_mm2 = areaChapa - areaAproveitada;
      
      areaTotalAproveitada += areaAproveitada;
      areaTotalMateriais += areaChapa;
    });

    layouts = [...layouts, ...chapasEscalonadas];
  }

  return {
    chapas_necessarias: layouts.length,
    aproveitamento_percentual: areaTotalMateriais > 0 ? (areaTotalAproveitada / areaTotalMateriais) * 100 : 0,
    layouts,
    tempo_calculo_ms: 0
  };
}

function tentarPosicionar(peca: PecaCorte, chapa: any, kerf: number): PecaPosicionada | null {
  for (let i = 0; i < chapa.espacos.length; i++) {
    const space = chapa.espacos[i];
    
    // Tentar rotações se a peça permitir (assumimos true por padrão na marcenaria se não especificado)
    const rotacoes = peca.rotacionavel !== false ? [false, true] : [false];
    
    for (const rot of rotacoes) {
      const w = rot ? peca.altura_mm : peca.largura_mm;
      const h = rot ? peca.largura_mm : peca.altura_mm;

      if (w <= space.w && h <= space.h) {
        // Encontrou espaço!
        const result: PecaPosicionada = {
          peca_id: peca.id,
          nome: peca.nome,
          x: space.x,
          y: space.y,
          largura: w,
          altura: h,
          rotacionada: rot
        };

        // Quebra o espaço (Guillotine Split)
        // Escolhe o split que minimiza um dos lados (ajuda a manter espaços maiores)
        const dw = space.w - w;
        const dh = space.h - h;

        chapa.espacos.splice(i, 1);
        
        if (dw > dh) {
          // Split vertical primeiro
          if (w < space.w) chapa.espacos.push({ x: space.x + w + kerf, y: space.y, w: space.w - w - kerf, h: space.h });
          if (h < space.h) chapa.espacos.push({ x: space.x, y: space.y + h + kerf, w: w, h: space.h - h - kerf });
        } else {
          // Split horizontal primeiro
          if (h < space.h) chapa.espacos.push({ x: space.x, y: space.y + h + kerf, w: space.w, h: space.h - h - kerf });
          if (w < space.w) chapa.espacos.push({ x: space.x + w + kerf, y: space.y, w: space.w - w - kerf, h: h });
        }

        return result;
      }
    }
  }
  return null;
}
