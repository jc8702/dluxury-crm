import { HybridOptimizer } from '../../domain/services/HybridOptimizer';

interface WorkerInput {
  materiais: any[];
  kerf_mm: number;
}

self.onmessage = (e: MessageEvent<WorkerInput>) => {
  const { materiais, kerf_mm } = e.data;

  try {
    const inicio = performance.now();
    const layouts: any[] = [];
    let materiaisProcessados = 0;

    for (const material of materiais) {
      const pecasExpandidas: any[] = [];
      material.pecas.forEach((p: any) => {
        for (let i = 0; i < p.quantidade; i++) {
          pecasExpandidas.push({
            id: `${p.id}_${i}`,
            nome: p.nome,
            largura: p.largura_mm,
            altura: p.altura_mm,
            rotacionavel: p.rotacionavel !== false,
            fio_de_fita: p.fio_de_fita
          });
        }
      });

      const otimizador = new HybridOptimizer(material.largura_mm, material.altura_mm, kerf_mm);
      const pecasRestantes = [...pecasExpandidas];
      let indiceChapaAtual = 1;

      while (pecasRestantes.length > 0) {
        const resultado = otimizador.otimizar(pecasRestantes);
        if (resultado.pecas_posicionadas.length === 0) {
          throw new Error(`Peça "${pecasRestantes[0].nome}" não cabe na chapa.`);
        }

        layouts.push({
          chapa_sku: material.sku,
          indice_chapa: indiceChapaAtual++,
          largura_original_mm: material.largura_mm,
          altura_original_mm: material.altura_mm,
          pecas_posicionadas: resultado.pecas_posicionadas,
          area_aproveitada_mm2: resultado.area_usada,
          area_desperdicada_mm2: resultado.area_total - resultado.area_usada
        });

        resultado.pecas_posicionadas.forEach(pp => {
          const idx = pecasRestantes.findIndex(p => p.id === pp.peca_id);
          if (idx !== -1) pecasRestantes.splice(idx, 1);
        });
      }

      materiaisProcessados++;
      self.postMessage({ tipo: 'progresso', progresso: (materiaisProcessados / materiais.length) * 100 });
    }

    const fim = performance.now();
    const areaTotal = layouts.reduce((acc, l) => acc + (l.largura_original_mm * l.altura_original_mm), 0);
    const areaUsada = layouts.reduce((acc, l) => acc + l.area_aproveitada_mm2, 0);

    self.postMessage({
      tipo: 'resultado',
      resultado: {
        chapas_necessarias: layouts.length,
        aproveitamento_percentual: (areaUsada / areaTotal) * 100,
        layouts,
        tempo_calculo_ms: fim - inicio
      }
    });

  } catch (error: any) {
    self.postMessage({ tipo: 'erro', mensagem: error.message });
  }
};
