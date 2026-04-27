import type { 
  PecaInput, 
  GrupoMaterial, 
  ResultadoPlano, 
  ResultadoGrupo as ResultadoGrupoERP,
  Superficie as SuperficieERP,
  PecaPositionada as PecaPositionadaERP,
  Sobra as SobraERP
} from '../../../../utils/planodeCorte';

import type { 
  Peca as PecaEngine, 
  ResultadoOtimizacao as ResultadoEngine,
  PecaPosicionada as PecaPosicionadaEngine,
  Sobra as SobraEngine
} from '../types';

export class CuttingMapper {
  
  static toEnginePecas(pecasERP: PecaInput[]): PecaEngine[] {
    return pecasERP.flatMap(p => {
      const pecas: PecaEngine[] = [];
      for (let i = 0; i < p.quantidade; i++) {
        pecas.push({
          id: `${p.id}_${i}`,
          nome: p.descricao,
          largura: p.larguraMm,
          altura: p.alturaMm,
          rotacionavel: p.podeRotacionar,
          // Metadados extras que queremos preservar
          metadata: {
            originalId: p.id,
            ambiente: p.ambiente,
            movel: p.movel,
            corEtiqueta: p.corEtiqueta
          }
        } as any);
      }
      return pecas;
    });
  }

  static toERPResultado(
    engineResults: ResultadoEngine[], 
    gruposERP: GrupoMaterial[],
    pecasERP: PecaInput[],
    tempoTotal: number
  ): ResultadoPlano {
    
    let totalPecasPositionadas = 0;
    let etiquetaSeq = 1;

    const gruposResultados: ResultadoGrupoERP[] = engineResults.map(res => {
      const grupoERP = gruposERP.find(g => g.id === res.grupo_id);
      const isRetalho = res.is_retalho || false;
      const larguraOriginal = isRetalho ? (res.area_total / res.area_total) : (grupoERP?.larguraChapaMm || 2750); // Simplificado para o mapper
      
      const superficies: SuperficieERP[] = [{
        id: `${isRetalho ? 'retalho' : 'inteira'}-${res.chapa_id}`,
        tipo: isRetalho ? 'retalho' : 'inteira',
        largura: res.largura_chapa || 2750,
        altura: res.altura_chapa || 1830,
        espacosLivres: [],
        pecasPositionadas: res.pecas_posicionadas.map(p => {
          totalPecasPositionadas++;
          const [originalId] = p.peca_id.split('_');
          const pecaOriginal = pecasERP.find(po => po.id === originalId);

          return {
            pecaId: originalId,
            descricao: pecaOriginal?.descricao || 'Peça',
            ambiente: pecaOriginal?.ambiente,
            movel: pecaOriginal?.movel,
            superficieId: `${isRetalho ? 'retalho' : 'inteira'}-${res.chapa_id}`,
            grupoMaterialId: res.chapa_id,
            x: p.x,
            y: p.y,
            largura: p.largura,
            altura: p.altura,
            rotacionada: p.rotacionada,
            corEtiqueta: pecaOriginal?.corEtiqueta || '#6B7280',
            numeroEtiqueta: etiquetaSeq++,
            areaMm2: p.largura * p.altura,
            custoProporcional: 0
          };
        }),
        aproveitamentoPct: res.aproveitamento,
        custoTotal: isRetalho ? 0 : (grupoERP?.precoChapa || 0)
      }];

      return {
        grupoId: grupoERP?.id || 'unknown',
        sku: grupoERP?.sku || 'MDF',
        superficies: superficies,
        totalChapasInteiras: isRetalho ? 0 : 1,
        totalRetalhosUsados: isRetalho ? 1 : 0,
        aproveitamentoMedio: res.aproveitamento,
        sobrasAproveitaveis: res.sobras.map(s => ({
          id: Math.random().toString(36).substring(7),
          superficieId: superficies[0].id,
          x: s.x,
          y: s.y,
          largura: s.largura,
          altura: s.altura,
          aproveitavel: s.aproveitavel
        })),
        custoTotal: isRetalho ? 0 : (grupoERP?.precoChapa || 0)
      };
    });

    // Consolidar resultados por grupo (se houver múltiplas chapas do mesmo material)
    // No momento o worker retorna um array de resultados, onde cada um é uma chapa.
    // O ERP agrupa por GrupoMaterial.
    
    const gruposUnicosMap = new Map<string, ResultadoGrupoERP>();
    
    gruposResultados.forEach(gr => {
      if (gruposUnicosMap.has(gr.grupoId)) {
        const existing = gruposUnicosMap.get(gr.grupoId)!;
        existing.superficies.push(...gr.superficies);
        existing.totalChapasInteiras += gr.totalChapasInteiras;
        existing.sobrasAproveitaveis.push(...gr.sobrasAproveitaveis);
        existing.custoTotal += gr.custoTotal;
        // Recalcular aproveitamento médio
        existing.aproveitamentoMedio = existing.superficies.reduce((acc, s) => acc + s.aproveitamentoPct, 0) / existing.superficies.length;
      } else {
        gruposUnicosMap.set(gr.grupoId, gr);
      }
    });

    const finalGrupos = Array.from(gruposUnicosMap.values());

    return {
      grupos: finalGrupos,
      totalPecasPositionadas,
      totalChapasInteiras: finalGrupos.reduce((acc, g) => acc + g.totalChapasInteiras, 0),
      totalRetalhosUsados: finalGrupos.reduce((acc, g) => acc + g.totalRetalhosUsados, 0),
      aproveitamentoGeral: finalGrupos.reduce((acc, g) => acc + g.aproveitamentoMedio, 0) / (finalGrupos.length || 1),
      custoTotalMaterial: finalGrupos.reduce((acc, g) => acc + g.custoTotal, 0),
      sobrasGeradas: finalGrupos.flatMap(g => g.sobrasAproveitaveis),
      tempoCalculoMs: tempoTotal,
      pecasNaoEncaixadas: [] // O motor deveria retornar isso, mas por enquanto vamos deixar vazio
    };
  }
}
