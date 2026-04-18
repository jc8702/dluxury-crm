import { useState, useEffect, useCallback, useRef } from 'react';
import type { PlanoDeCorte, ChapaMaterial, ResultadoOtimizacao } from '../domain/entities/CuttingPlan';
import { planoDeCorteRepository } from '../infrastructure/api/planoDeCorteRepository';

const LOCAL_STORAGE_KEY = 'dluxury_plano_corte_draft';

export function usePlanoDeCorte(initialId?: string) {
  const [plano, setPlano] = useState<Partial<PlanoDeCorte>>({
    nome_plano: 'Novo Plano de Corte',
    kerf_mm: 3,
    materiais: []
  });
  const [resultado, setResultado] = useState<ResultadoOtimizacao | null>(null);
  const [loading, setLoading] = useState(false);
  const [calculando, setCalculando] = useState(false);
  const workerRef = useRef<Worker | null>(null);

  // 1. Carregar Dados Iniciais (API ou LocalStorage)
  useEffect(() => {
    async function load() {
      if (initialId) {
        setLoading(true);
        try {
          const p = await planoDeCorteRepository.buscarPorId(initialId);
          if (p) {
            setPlano(p);
            if (p.resultado) setResultado(p.resultado as any);
          }
        } finally {
          setLoading(false);
        }
      } else {
        const draft = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (draft) {
          const parsed = JSON.parse(draft);
          if (confirm('Encontramos um plano não salvo. Restaurar rascunho?')) {
            setPlano(parsed);
          } else {
            localStorage.removeItem(LOCAL_STORAGE_KEY);
          }
        }
      }
    }
    load();
  }, [initialId]);

  // 2. Persistência Local (Debounce)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!initialId && plano.materiais && plano.materiais.length > 0) {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(plano));
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [plano, initialId]);

  // 3. Gerenciamento do Web Worker
  const otimizar = useCallback(() => {
    if (!plano.materiais || plano.materiais.length === 0) {
      alert('Adicione pelo menos um material.');
      return;
    }

    setCalculando(true);
    
    // Iniciar Worker (padrão Vite)
    if (workerRef.current) workerRef.current.terminate();
    
    // Note: O caminho deve ser relativo ao arquivo que o consome ou resolvido pelo Vite
    workerRef.current = new Worker(
      new URL('../infrastructure/workers/otimizacao.worker.ts', import.meta.url),
      { type: 'module' }
    );

    workerRef.current.onmessage = (e) => {
      const { tipo, resultado: res, mensagem } = e.data;
      if (tipo === 'resultado') {
        setResultado(res);
        setCalculando(false);
      } else if (tipo === 'erro') {
        alert('Erro no cálculo: ' + mensagem);
        setCalculando(false);
      }
    };

    workerRef.current.postMessage({
      materiais: plano.materiais,
      kerf_mm: plano.kerf_mm
    });

    // Timeout de segurança (30s)
    setTimeout(() => {
      if (calculando) {
        workerRef.current?.terminate();
        setCalculando(false);
        alert('O cálculo demorou demais e foi cancelado.');
      }
    }, 30000);
  }, [plano]);

  // 4. Ações
  const addMaterial = (mat: ChapaMaterial) => {
    setPlano(prev => ({
      ...prev,
      materiais: [...(prev.materiais || []), mat]
    }));
  };

  const removeMaterial = (index: number) => {
    if (confirm('Deseja remover este material e todas as suas peças?')) {
      setPlano(prev => ({
        ...prev,
        materiais: prev.materiais?.filter((_, i) => i !== index)
      }));
    }
  };

  const updateMaterial = (index: number, updated: ChapaMaterial) => {
    setPlano(prev => ({
      ...prev,
      materiais: prev.materiais?.map((m, i) => i === index ? updated : m)
    }));
  };

  const salvar = async () => {
    if (!plano.nome_plano) return alert('Nome do plano obrigatório');
    setLoading(true);
    try {
      if (plano.id) {
        await planoDeCorteRepository.salvarResultado(plano.id, plano.materiais as any, resultado, {});
      } else {
        const novo = await planoDeCorteRepository.criar(plano);
        setPlano(novo);
        if (resultado) {
            await planoDeCorteRepository.salvarResultado(novo.id!, plano.materiais as any, resultado, {});
        }
      }
      localStorage.removeItem(LOCAL_STORAGE_KEY);
      alert('Plano salvo com sucesso!');
    } catch (e: any) {
      alert('Erro ao salvar: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAprovarProducao = async () => {
    if (!resultado) return;
    
    // Contar quantas chapas de cada SKU foram usadas
    const consumo: Record<string, number> = {};
    resultado.layouts.forEach(l => {
      consumo[l.chapa_sku] = (consumo[l.chapa_sku] || 0) + 1;
    });

    const payload = Object.entries(consumo).map(([sku, qtd]) => ({ sku, qtd }));
    
    setLoading(true);
    try {
      await planoDeCorteRepository.aprovarProducao(payload);
      alert('Produção aprovada com sucesso! O estoque foi reservado.');
    } catch (e: any) {
      alert('Erro na aprovação: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  return {
    plano,
    setPlano,
    resultado,
    loading,
    calculando,
    otimizar,
    addMaterial,
    removeMaterial,
    updateMaterial,
    salvar,
    handleAprovarProducao
  };
}
