import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Lock, Unlock, RefreshCw } from 'lucide-react';
import { api } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { FolhaGrid } from '../modules/rh/components/FolhaGrid';
import { LucroSociosCard } from '../modules/rh/components/LucroSociosCard';
import { ReciboPreview } from '../modules/rh/components/ReciboPreview';
import type { StatusFolha } from '../modules/rh/domain/types';

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

const statusBadge = (status: StatusFolha) => {
  const map: Record<StatusFolha, { label: string; className: string }> = {
    rascunho: { label: 'Rascunho', className: 'bg-warning/20 text-warning-foreground' },
    fechada: { label: 'Fechada', className: 'bg-success/20 text-success' },
    paga: { label: 'Paga', className: 'bg-primary/20 text-primary' },
  };
  const s = map[status] || map.rascunho;
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-bold ${s.className}`}>{s.label}</span>
  );
};

export default function RHFolhaDetalhePage() {
  const { id } = useParams();
  const [folha, setFolha] = useState<any>(null);
  const [itens, setItens] = useState<any[]>([]);
  const [socios, setSocios] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedReciboItemId, setSelectedReciboItemId] = useState<string | null>(null);

  const loadFolha = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.rh.folhas.get(id);
      const f = data.folha || data;
      setFolha(f);
      setItens(data.itens || f.itens || []);

      // Extrair sócios dos itens (colaboradores tipo sócio)
      const socioItems = (data.itens || f.itens || []).filter(
        (it: any) => (it.colaborador_tipo ?? it.colaboradorTipo) === 'socio',
      );
      const socioList = socioItems.map((it: any) => ({
        colaboradorId: it.colaborador_id ?? it.colaboradorId,
        nome: it.colaborador_nome ?? it.colaboradorNome ?? '—',
        participacao: Number(it.participacao_lucros ?? it.participacaoLucros ?? 50),
        valor: 0, // Será calculado pelo LucroSociosCard
      }));
      setSocios(socioList);
    } catch (e: any) {
      setError(e.message || 'Erro ao carregar folha');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadFolha();
  }, [loadFolha]);

  const handleUpdateItem = async (folhaId: string, itemId: string, payload: any) => {
    const result = await api.rh.folhas.updateItem(folhaId, itemId, payload);
    // Recarregar dados atualizados
    await loadFolha();
    return result;
  };

  const handleFechar = async () => {
    if (!folha?.id) return;
    if (!confirm('Fechar folha? Isso gerará títulos a pagar para todos os colaboradores.')) return;
    setActionLoading(true);
    try {
      await api.rh.folhas.fechar(folha.id);
      await loadFolha();
    } catch (e: any) {
      alert(e.message || 'Erro ao fechar folha');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReabrir = async () => {
    if (!folha?.id) return;
    if (!confirm('Reabrir folha? Os títulos serão removidos se não foram baixados.')) return;
    setActionLoading(true);
    try {
      await api.rh.folhas.reabrir(folha.id);
      await loadFolha();
    } catch (e: any) {
      alert(e.message || 'Erro ao reabrir folha');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReciboClick = (itemId: string) => {
    setSelectedReciboItemId(itemId);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <RefreshCw className="animate-spin text-muted-foreground" size={24} />
      </div>
    );
  }

  if (error || !folha) {
    return (
      <div className="p-8 space-y-4">
        <Link to="/rh" className="text-sm text-primary hover:underline flex items-center gap-1">
          <ArrowLeft size={14} /> Voltar para Folhas
        </Link>
        <div className="p-4 rounded-lg bg-destructive/10 text-destructive">
          {error || 'Folha não encontrada'}
        </div>
      </div>
    );
  }

  const status = (folha.status || 'rascunho') as StatusFolha;
  const competencia = folha.competencia || '—';
  const receitaMes = Number(folha.receita_mes ?? folha.receitaMes ?? 0);
  const custosMes = Number(folha.custos_mes ?? folha.custosMes ?? 0);
  const totalLiquido = Number(folha.total_liquido ?? folha.totalLiquido ?? 0);
  const divisor = Number(folha.divisor ?? 220);

  // Total da folha excluindo sócios para cálculo do lucro distribuível
  const totalFolhaColaboradores = itens
    .filter((it: any) => (it.colaborador_tipo ?? it.colaboradorTipo) !== 'socio')
    .reduce((sum: number, it: any) => sum + Number(it.valor_liquido ?? it.valorLiquido ?? 0), 0);

  return (
    <div
      className="min-h-screen bg-background text-foreground p-6 md:p-8"
      data-testid="rh-folha-detalhe"
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <Link
            to="/rh"
            className="text-sm text-primary hover:underline flex items-center gap-1 mb-2"
          >
            <ArrowLeft size={14} /> Voltar para Folhas
          </Link>
          <h1 className="text-3xl font-black tracking-tight flex items-center gap-3">
            Folha {competencia}
            {statusBadge(status)}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Divisor HE: {divisor}h | Líquido Total:{' '}
            <span className="font-bold font-mono">{fmt(totalLiquido)}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          {status === 'rascunho' && (
            <Button
              onClick={handleFechar}
              disabled={actionLoading}
              className="gap-2 bg-success hover:bg-success/90 text-success-foreground"
              data-testid="btn-fechar-folha"
            >
              <Lock size={14} />
              {actionLoading ? 'Fechando...' : 'Fechar Folha'}
            </Button>
          )}
          {status === 'fechada' && (
            <Button
              onClick={handleReabrir}
              disabled={actionLoading}
              variant="secondary"
              className="gap-2"
              data-testid="btn-reabrir-folha"
            >
              <Unlock size={14} />
              {actionLoading ? 'Reabrindo...' : 'Reabrir Folha'}
            </Button>
          )}
        </div>
      </div>

      {/* Grid Folha */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-sm font-bold uppercase tracking-widest">
            Itens da Folha — {status === 'rascunho' ? 'Editável' : 'Somente leitura'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <FolhaGrid
            folhaId={folha.id}
            itens={itens}
            status={status}
            divisor={divisor}
            onUpdateItem={handleUpdateItem}
            onReciboClick={handleReciboClick}
            onItemsChanged={loadFolha}
          />
        </CardContent>
      </Card>

      {/* Lucro Sócios */}
      <LucroSociosCard
        receitaMes={receitaMes}
        custosMes={custosMes}
        totalFolha={totalFolhaColaboradores}
        socios={socios}
        folhaStatus={status}
      />

      {/* Modal Preview do Recibo */}
      {selectedReciboItemId && folha?.id && (
        <ReciboPreview
          folhaId={folha.id}
          itemId={selectedReciboItemId}
          onClose={() => setSelectedReciboItemId(null)}
        />
      )}
    </div>
  );
}
