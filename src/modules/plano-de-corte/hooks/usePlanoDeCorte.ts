import { useState, useEffect, useCallback, useRef } from 'react';
import type { PlanoDeCorte, ChapaMaterial, ResultadoOtimizacao } from '../domain/entities/CuttingPlan';
import { planoDeCorteRepository } from '../infrastructure/api/planoDeCorteRepository';
import { api } from '../../../lib/api';

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

  const updateMaterial = (index: number, updated: Partial<ChapaMaterial>) => {
    setPlano(prev => ({
      ...prev,
      materiais: prev.materiais?.map((m, i) => (i === index ? { ...m, ...updated } : m))
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
      // Criar Ordem de Produção no módulo de produção
      try {
        const ops = await api.production.list();
        const nextIndex = (Array.isArray(ops) ? ops.length : 0) + 1;
        const opId = `OP-${String(nextIndex).padStart(4, '0')}`;
        const produto = plano.nome_plano || `Plano de Corte ${opId}`;
        const totalPecas = resultado.layouts.reduce((acc: number, l: any) => acc + (l.pecas_posicionadas ? l.pecas_posicionadas.length : (l.layouts_pecas ? l.layouts_pecas.length : 0)), 0);
        const metadata = { plano_id: plano.id || null, materiais: plano.materiais || [], resultado };
        await apiCallCreateOP(opId, produto, totalPecas, metadata);
      } catch (e) {
        console.error('Erro ao criar OP automaticamente:', e);
      }
    } catch (e: any) {
      alert('Erro na aprovação: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const apiCallCreateOP = async (op_id: string, produto: string, pecas: number, metadata: any) => {
    // chama endpoint /api/production (POST)
    try {
      // Build a robust op_id: attempt to compute next number based on existing ops
      const existing = await api.production.list().catch(() => []);
      let maxNum = 0;
      if (Array.isArray(existing)) {
        for (const o of existing) {
          const m = String(o.op_id || '').match(/OP-(\d+)/i);
          if (m) {
            const n = Number(m[1]);
            if (Number.isFinite(n) && n > maxNum) maxNum = n;
          }
        }
      }
      const next = maxNum + 1;
      const finalOpId = `OP-${String(next).padStart(4, '0')}`;

      const res = await fetch('/api/production', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ op_id: finalOpId, produto, pecas, metadata })
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || 'Erro ao criar OP');
      }
      // Notify other parts of the UI to refresh production lists (kanban)
      try { window.dispatchEvent(new CustomEvent('op_created', { detail: { op_id: finalOpId } })); } catch (e) {}
      // Also create a kanban card to surface the OP in the global Kanban (Aguardando)
      try {
        await api.kanban.create({
          title: finalOpId,
          subtitle: produto,
          label: `${pecas} peças`,
          // usar status PENDENTE para alinhar com o filtro do módulo de Produção
          status: 'PENDENTE',
          type: 'production',
          observations: JSON.stringify({ op_id: finalOpId, plano_id: metadata?.plano_id || null }),
          date_time: new Date().toISOString()
        });
      } catch (e) {
        console.warn('Falha ao criar card no kanban:', e);
      }
      return true;
    } catch (err) {
      console.error('apiCallCreateOP error', err);
      return false;
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
