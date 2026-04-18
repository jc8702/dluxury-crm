interface Peca {
  id: string;
  descricao: string;
  largura: number;  // mm
  altura: number;   // mm
  quantidade: number;
  virarFibra: boolean;
  ambiente?: string;
}

interface Chapa {
  largura: number;
  altura: number;
  kerf: number;
}

interface Espaco {
  x: number;
  y: number;
  largura: number;
  altura: number;
}

export interface PecaPositionada {
  pecaId: string;
  descricao: string;
  chapa: number;
  x: number;
  y: number;
  largura: number;
  altura: number;
  rotacionada: boolean;
  ambiente?: string;
}

export interface ResultadoCorte {
  pecasPositionadas: PecaPositionada[];
  totalChapas: number;
  aproveitamentoPct: number;
  areaUtilM2: number;
  areaDesperdicioM2: number;
  sobras: Array<{ chapa: number; x: number; y: number; largura: number; altura: number }>;
}

export function calcularPlanoCorte(
  pecasInput: Peca[],
  chapaInput: Chapa
): ResultadoCorte {
  // 1. Expandir peças pela quantidade
  const pecasParaProcessar: any[] = [];
  pecasInput.forEach(p => {
    for (let i = 0; i < p.quantidade; i++) {
      pecasParaProcessar.push({ ...p, area: p.largura * p.altura });
    }
  });

  // 2. Ordenar por área (Maior para Menor)
  pecasParaProcessar.sort((a, b) => b.area - a.area);

  const chapas: Array<{ espacos: Espaco[] }> = [];
  const pecasPositionadas: PecaPositionada[] = [];
  const kerf = chapaInput.kerf || 3;

  const adicionarChapa = () => {
    chapas.push({
      espacos: [{ x: 0, y: 0, largura: chapaInput.largura, altura: chapaInput.altura }]
    });
    return chapas.length - 1;
  };

  adicionarChapa(); // Iniciar primeira chapa

  pecasParaProcessar.forEach(peca => {
    let placed = false;

    for (let c = 0; c < chapas.length; c++) {
      const chapa = chapas[c];
      
      for (let i = 0; i < chapa.espacos.length; i++) {
        const espaco = chapa.espacos[i];
        
        // Tentativas: Normal e Rotacionada (se permitido)
        const orientations = peca.virarFibra ? [{ w: peca.largura, h: peca.altura, rot: false }] : [
          { w: peca.largura, h: peca.altura, rot: false },
          { w: peca.altura, h: peca.largura, rot: true }
        ];

        for (const orient of orientations) {
          if (orient.w <= espaco.largura && orient.h <= espaco.altura) {
            // Cabe!
            pecasPositionadas.push({
              pecaId: peca.id,
              descricao: peca.descricao,
              chapa: c + 1,
              x: espaco.x,
              y: espaco.y,
              largura: orient.w,
              altura: orient.h,
              rotacionada: orient.rot,
              ambiente: peca.ambiente
            });

            // Remover o espaço usado
            chapa.espacos.splice(i, 1);

            // Gerar novos espaços (Guillotine Split)
            // Split horizontal ou vertical? Vamos preferir o corte que gera o maior retângulo contínuo
            const dw = espaco.largura - orient.w;
            const dh = espaco.altura - orient.h;

            if (dw > dh) {
              // Split vertical primeiro
              if (dw > 0) chapa.espacos.push({ x: espaco.x + orient.w + kerf, y: espaco.y, largura: dw - kerf, altura: espaco.altura });
              if (dh > 0) chapa.espacos.push({ x: espaco.x, y: espaco.y + orient.h + kerf, largura: orient.w, altura: dh - kerf });
            } else {
              // Split horizontal primeiro
              if (dh > 0) chapa.espacos.push({ x: espaco.x, y: espaco.y + orient.h + kerf, largura: espaco.largura, altura: dh - kerf });
              if (dw > 0) chapa.espacos.push({ x: espaco.x + orient.w + kerf, y: espaco.y, largura: dw - kerf, altura: orient.h });
            }

            // Ordenar espaços por área para favorecer encaixes futuros
            chapa.espacos.sort((a, b) => (a.largura * a.altura) - (b.largura * b.altura));
            
            placed = true;
            break;
          }
        }
        if (placed) break;
      }
      if (placed) break;
    }

    if (!placed) {
      // Não coube em nenhuma chapa atual, criar nova
      const novaChapaIdx = adicionarChapa();
      const chapa = chapas[novaChapaIdx];
      const espaco = chapa.espacos[0]; // Primeira chapa sempre tem um espaço cheio

      // Tentar de novo na nova chapa (sabemos que cabe se largura/altura < chapa)
      // Nota: pecas > chapa devem ser tratadas como erro na UI
      const w = peca.largura;
      const h = peca.altura;

      pecasPositionadas.push({
        pecaId: peca.id,
        descricao: peca.descricao,
        chapa: novaChapaIdx + 1,
        x: espaco.x,
        y: espaco.y,
        largura: w,
        altura: h,
        rotacionada: false,
        ambiente: peca.ambiente
      });

      chapa.espacos.splice(0, 1);
      const dw = espaco.largura - w;
      const dh = espaco.altura - h;

      if (dw > dh) {
        if (dw > 0) chapa.espacos.push({ x: espaco.x + w + kerf, y: espaco.y, largura: dw - kerf, altura: espaco.altura });
        if (dh > 0) chapa.espacos.push({ x: espaco.x, y: espaco.y + h + kerf, largura: w, altura: dh - kerf });
      } else {
        if (dh > 0) chapa.espacos.push({ x: espaco.x, y: espaco.y + h + kerf, largura: espaco.largura, altura: dh - kerf });
        if (dw > 0) chapa.espacos.push({ x: espaco.x + w + kerf, y: espaco.y, largura: dw - kerf, altura: h });
      }
    }
  });

  // Cálculos finais
  const areaChapaM2 = (chapaInput.largura * chapaInput.altura) / 1000000;
  const areaTotalChapasM2 = chapas.length * areaChapaM2;
  const areaUtilM2 = pecasPositionadas.reduce((sum, p) => sum + (p.largura * p.altura), 0) / 1000000;
  
  const sobras: any[] = [];
  chapas.forEach((c, idx) => {
    c.espacos.forEach(e => {
      if (e.largura > 100 && e.altura > 100) { // Considerar sobras apenas maiores que 10cm
        sobras.push({ chapa: idx + 1, ...e });
      }
    });
  });

  return {
    pecasPositionadas,
    totalChapas: chapas.length,
    areaUtilM2,
    areaDesperdicioM2: areaTotalChapasM2 - areaUtilM2,
    aproveitamentoPct: (areaUtilM2 / areaTotalChapasM2) * 100,
    sobras
  };
}
