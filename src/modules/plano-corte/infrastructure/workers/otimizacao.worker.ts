import { HybridOptimizer } from '../../domain/services/HybridOptimizer';
import type { Peca, ResultadoOtimizacao } from '../../domain/types';

interface WorkerInput {
  pecas: Peca[];
  chapas: { 
    id: string; 
    largura: number; 
    altura: number; 
    isRetalho?: boolean; 
    grupoId: string; 
  }[];
  config: {
    kerf: number;
    iteracoes: number;
    algoritmo: string;
  };
}

self.onmessage = (e: MessageEvent<WorkerInput>) => {
  const { pecas, chapas, config } = e.data;

  try {
    const resultados: ResultadoOtimizacao[] = [];
    let pecasRestantes = [...pecas];
    const totalPecasInicial = pecas.length;

    for (const chapa of chapas) {
      if (pecasRestantes.length === 0) break;

      const optimizer = new HybridOptimizer(chapa.largura, chapa.altura, config.kerf);
      const res = optimizer.otimizar(pecasRestantes, config.iteracoes);

      if (res.pecas_posicionadas.length > 0) {
        res.chapa_id = chapa.id;
        res.grupo_id = chapa.grupoId;
        res.is_retalho = chapa.isRetalho || false;
        
        resultados.push(res);

        // Remover peças encaixadas
        const idsEncaixados = new Set(res.pecas_posicionadas.map(p => p.peca_id));
        pecasRestantes = pecasRestantes.filter(p => !idsEncaixados.has(p.id));
      }

      // Reportar progresso
      const porcentagem = Math.round(((totalPecasInicial - pecasRestantes.length) / totalPecasInicial) * 100);
      self.postMessage({ type: 'PROGRESS', progress: porcentagem });
    }

    self.postMessage({
      type: 'SUCCESS',
      payload: resultados
    });

  } catch (error: any) {
    self.postMessage({
      type: 'ERROR',
      error: error.message
    });
  }
};
