import { useState, useCallback, useRef, useEffect } from 'react';
import { CuttingMapper } from '../../domain/services/CuttingMapper';
import { retalhosRepository } from '../repositories/RetalhosRepository';
import type { PecaInput, GrupoMaterial, ResultadoPlano } from '../../../../utils/planodeCorte';

export function useCuttingWorker() {
  const [isCalculating, setIsCalculating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [resultado, setResultado] = useState<ResultadoPlano | null>(null);
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
      }
    };
  }, []);

  const calcular = useCallback(async (pecas: PecaInput[], grupos: GrupoMaterial[]): Promise<ResultadoPlano> => {
    if (pecas.length === 0 || grupos.length === 0) {
      throw new Error('Peças ou grupos não informados');
    }

    setIsCalculating(true);
    setProgress(0);
    setError(null);
    setResultado(null);

    const inicio = performance.now();

    try {
      // 1. BUSCAR RETALHOS NO ESTOQUE (Prioridade Bloco 2)
      const chapasComRetalhos: any[] = [];
      
      for (const grupo of grupos) {
        // Buscar retalhos do material do grupo
        let retalhos: any[] = [];
        try {
          retalhos = await retalhosRepository.buscarRetalhosDisponiveis({
            sku_chapa: grupo.sku, // Usar SKU para busca
            espessura_mm: grupo.espessuraMm
          });
        } catch (fetchErr) {
          console.warn(`[CuttingPlan] Falha ao buscar retalhos para ${grupo.sku}:`, fetchErr);
        }

        // Ordenar retalhos: menor área primeiro para liberar espaço (Decision 4)
        const retalhosOrdenados = (retalhos || []).sort((a, b) => 
          (a.largura_mm * a.altura_mm) - (b.largura_mm * b.altura_mm)
        );

        retalhosOrdenados.forEach(r => {
          chapasComRetalhos.push({
            id: r.id,
            largura: r.largura_mm,
            altura: r.altura_mm,
            isRetalho: true,
            sku: r.sku_chapa,
            grupoId: grupo.id // Vincular retalho ao grupo de material
          });
        });

        // Adicionar chapa padrão do grupo
        chapasComRetalhos.push({
          id: grupo.id,
          largura: grupo.larguraChapaMm,
          altura: grupo.alturaChapaMm,
          isRetalho: false,
          sku: grupo.materialId,
          grupoId: grupo.id
        });
      }

      // 2. INICIAR WORKER
      return new Promise((resolve, reject) => {
        if (!workerRef.current) {
          workerRef.current = new Worker(
            new URL('../workers/otimizacao.worker.ts', import.meta.url),
            { type: 'module' }
          );
        }

        const worker = workerRef.current;

        worker.onmessage = (e) => {
          const { type, payload, error: err, progress: p } = e.data;

          if (type === 'PROGRESS') {
            setProgress(p);
          } else if (type === 'SUCCESS') {
            const fim = performance.now();
            const tempoTotal = Math.round(fim - inicio);

            const resultadoERP = CuttingMapper.toERPResultado(payload, grupos, pecas, tempoTotal);
            setResultado(resultadoERP);
            setIsCalculating(false);
            resolve(resultadoERP);
          } else if (type === 'ERROR') {
            setError(err);
            setIsCalculating(false);
            reject(new Error(err));
          }
        };

        const pecasEngine = CuttingMapper.toEnginePecas(pecas);

        worker.postMessage({
          pecas: pecasEngine,
          chapas: chapasComRetalhos,
          config: {
            kerf: 3,
            iteracoes: 50,
            algoritmo: 'HYBRID'
          }
        });
      });
    } catch (e: any) {
      setError(e.message);
      setIsCalculating(false);
      throw e;
    }
  }, []);

  const cancelar = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
      setIsCalculating(false);
      setProgress(0);
    }
  }, []);

  return {
    calcular,
    cancelar,
    isCalculating,
    progress,
    error,
    resultado
  };
}
