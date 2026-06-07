import { useState, useEffect, useCallback } from 'react';
import { useToast } from '../../context/ToastContext';

export interface Prospeccao {
  id: string;
  nome: string;
  telefone?: string;
  email?: string;
  cidade?: string;
  uf?: string;
  status: string;
  temperatura: string;
  origem: string;
  interesse?: string;
  orcamento_estimado?: number;
  prazo_desejado_dias?: number;
  responsavel_nome?: string;
  budget: boolean;
  authority: boolean;
  need: boolean;
  timeline: boolean;
  motivo_perda?: string;
  observacoes?: string;
  created_at: string;
  updated_at: string;
  ultimas_interacoes?: any[];
}

export interface Metrics {
  funil: Array<{ status: string; total: string; valor_total: string }>;
  resumo: {
    total: number;
    ganhos: number;
    perdidos: number;
    ativos: number;
    taxaConversao: number;
    cicloMedioDias: number | null;
    ticketMedio: number | null;
  };
  origens: Array<{ origem: string; total: string; ganhos: string }>;
}

export function useProspeccaoHook() {
  const { showToast } = useToast();
  const [leads, setLeads] = useState<Prospeccao[]>([]);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<Prospeccao | null>(null);
  const [view, setView] = useState<'kanban' | 'lista'>('kanban');
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterTemp, setFilterTemp] = useState('');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterStatus) params.set('status', filterStatus);
      if (filterTemp) params.set('temperatura', filterTemp);
      if (search) params.set('search', search);

      const [leadsRes, metricsRes] = await Promise.all([
        fetch(`/api/prospeccao?${params}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('dluxury_token')}` },
        }).then((r) => r.json()),
        fetch('/api/prospeccao/metrics', {
          headers: { Authorization: `Bearer ${localStorage.getItem('dluxury_token')}` },
        }).then((r) => r.json()),
      ]);

      if (leadsRes.success) setLeads(leadsRes.data || []);
      if (metricsRes.success) setMetrics(metricsRes.data);
    } catch {
      showToast('Erro ao carregar prospecções', 'error');
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterTemp, search, showToast]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const handleSave = async (data: Partial<Prospeccao>) => {
    try {
      const token = localStorage.getItem('dluxury_token');
      if (editTarget) {
        const r = await fetch(`/api/prospeccao/${editTarget.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(data),
        }).then((r) => r.json());
        if (!r.success) throw new Error(r.error);
        showToast('Prospecção atualizada!', 'success');
      } else {
        const r = await fetch('/api/prospeccao', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(data),
        }).then((r) => r.json());
        if (!r.success) throw new Error(r.error);
        showToast('Lead criado com sucesso!', 'success');
      }
      setShowModal(false);
      setEditTarget(null);
      fetchAll();
    } catch (e: any) {
      showToast(e.message || 'Erro ao salvar', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir este lead permanentemente?')) return;
    try {
      const r = await fetch(`/api/prospeccao/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('dluxury_token')}` },
      }).then((r) => r.json());
      if (!r.success) throw new Error(r.error);
      showToast('Lead removido', 'info');
      fetchAll();
    } catch (e: any) {
      showToast(e.message || 'Erro ao excluir', 'error');
    }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      const r = await fetch(`/api/prospeccao/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('dluxury_token')}`,
        },
        body: JSON.stringify({ status: newStatus }),
      }).then((r) => r.json());
      if (!r.success) throw new Error(r.error);
      showToast(`Status alterado`, 'success');
      fetchAll();
    } catch (e: any) {
      showToast(e.message || 'Erro', 'error');
    }
  };

  return {
    leads,
    metrics,
    loading,
    showModal,
    editTarget,
    view,
    setView,
    search,
    setSearch,
    filterStatus,
    setFilterStatus,
    filterTemp,
    setFilterTemp,
    setShowModal,
    setEditTarget,
    fetchAll,
    handleSave,
    handleDelete,
    handleStatusChange,
  };
}
