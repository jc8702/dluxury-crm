/**
 * WEB WORKER: ALGORITMO DE OTIMIZAÇÃO GUILLOTINE BFD
 */

import type { ChapaMaterial, ResultadoOtimizacao } from '../../domain/entities/CuttingPlan';
import { HybridOptimizer, RetalhoMaterial } from '../../domain/services/HybridOptimizer';

self.onmessage = (e: MessageEvent) => {
  const { materiais, kerf_mm, retalhos } = e.data;
  
  try {
    const inicio = performance.now();
    const resultado = otimizarTodasChapas(materiais, kerf_mm, retalhos || []);
    const fim = performance.now();
    
    resultado.tempo_calculo_ms = fim - inicio;
    self.postMessage({ tipo: 'resultado', resultado });
  } catch (err: any) {
    self.postMessage({ tipo: 'erro', mensagem: err.message });
  }
};

function otimizarTodasChapas(materiais: ChapaMaterial[], kerf: number, retalhosGlobais: RetalhoMaterial[]): ResultadoOtimizacao {
  const resultado: ResultadoOtimizacao = {
    chapas_necessarias: 0,
    aproveitamento_percentual: 0,
    layouts: [],
    tempo_calculo_ms: 0
  };

  const optimizer = new HybridOptimizer();

  for (const mat of materiais) {
    if (mat.pecas.length === 0) continue;

    // A otimização roda para cada tipo de material separadamente.
    // Filtrar retalhos aplicáveis a este material
    const retalhosAplicaveis = retalhosGlobais.filter(r => r.sku === mat.sku);
    
    const chapasBase = [mat];
    const matResult = optimizer.otimizar(mat.pecas, chapasBase, kerf, 50, retalhosAplicaveis);

    // Ajusta o índice das chapas para não sobrepor entre materiais diferentes
    const chapaOffset = resultado.layouts.length;
    matResult.layouts.forEach(l => {
      l.indice_chapa += chapaOffset;
    });

    resultado.layouts.push(...matResult.layouts);
    
    if (matResult.naoPosicionadas.length > 0) {
      console.warn(`Atenção: ${matResult.naoPosicionadas.length} peças não puderam ser posicionadas na chapa ${mat.sku}`);
    }
  }

  resultado.chapas_necessarias = resultado.layouts.length;
  
  // Recalcular aproveitamento global
  let areaTotalAproveitada = 0;
  let areaTotalChapas = 0;

  for (const layout of resultado.layouts) {
    areaTotalAproveitada += layout.area_aproveitada_mm2;
    areaTotalChapas += (layout.largura_original_mm || 0) * (layout.altura_original_mm || 0);
  }

  resultado.aproveitamento_percentual = areaTotalChapas > 0 ? (areaTotalAproveitada / areaTotalChapas) * 100 : 0;

  return resultado;
}
