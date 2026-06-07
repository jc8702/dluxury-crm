import { useEffect, useState, useCallback } from 'react';
import { api } from '../../lib/api';
import { useToast } from '../../context/ToastContext';
import { useConfirm } from '../../hooks/useConfirm';
import type { Titulo, ContaInterna } from '../../modules/financeiro/domain/types';

export function useTitulosPagarHook() {
  const { success, error, warning } = useToast();
  const [ConfirmDialogElement, confirmAction] = useConfirm();
  const [rows, setRows] = useState<Titulo[]>([]);
  const [page, setPage] = useState(1);
  const [perPage] = useState(10);
  const [total, setTotal] = useState(0);
  const [suppliersMap, setSuppliersMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [baixaModal, setBaixaModal] = useState<Titulo | null>(null);
  const [reciboModal, setReciboModal] = useState<Titulo | null>(null);
  const [contas, setContas] = useState<ContaInterna[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loteModal, setLoteModal] = useState(false);
  const [loteData, setLoteData] = useState({
    conta_interna_id: '',
    data_baixa: new Date().toISOString().split('T')[0],
    observacoes: '',
  });
  const [loteLoading, setLoteLoading] = useState(false);
  const [editModal, setEditModal] = useState<Titulo | null>(null);
  const [isWizardOpen, setIsWizardOpen] = useState(false);

  const [stats, setStats] = useState({
    totalAberto: 0,
    totalVencido: 0,
    totalPago: 0,
  });

  const load = useCallback(
    async (p = 1) => {
      setLoading(true);
      try {
        const res = await api.financeiro.titulosPagar.list({ page: p, perPage });
        let dataRows: any[] = [];

        if (Array.isArray(res)) {
          dataRows = res;
          setTotal(res.length);
        } else if (res && res.rows) {
          dataRows = res.rows;
          setTotal(res.total || 0);
        } else {
          dataRows = [];
          setTotal(0);
        }

        setRows(dataRows);

        let aberto = 0,
          vencido = 0,
          pago = 0;
        const hoje = new Date();
        dataRows.forEach((r) => {
          const valor = Number(r.valor_aberto) || 0;
          if (r.status === 'pago') {
            pago += Number(r.valor_original);
          } else {
            aberto += valor;
            if (new Date(r.data_vencimento) < hoje) vencido += valor;
          }
        });
        setStats({ totalAberto: aberto, totalVencido: vencido, totalPago: pago });

        const suppliers = await api.suppliers.list();
        const map: Record<string, string> = {};
        (suppliers || []).forEach((s: any) => {
          map[s.id] = s.nome || s.name || `${s.id}`;
        });
        setSuppliersMap(map);

        const cts = await api.financeiro.contasInternas.list();
        setContas(cts || []);
      } catch (err: any) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    },
    [perPage],
  );

  useEffect(() => {
    load(page);
  }, [page, load]);

  const confirmarBaixa = async () => {
    try {
      const contaId = (document.getElementById('conta-interna-id-pagar') as HTMLSelectElement)
        .value;
      if (!contaId) throw new Error('Selecione uma conta');

      await api.financeiro.titulosPagar.baixar(baixaModal!.id, {
        valor_baixa: baixaModal!.valor_aberto,
        conta_interna_id: contaId,
        data_baixa: new Date(),
      });
      setBaixaModal(null);
      load(page);
      success('Pagamento registrado com sucesso!');
    } catch (err: any) {
      error(err.message || 'Erro ao registrar pagamento');
    }
  };

  const doDelete = async (id: string) => {
    const isConfirmed = await confirmAction({
      title: 'Excluir Título',
      description: 'Confirma exclusão do título?',
    });
    if (!isConfirmed) return;
    try {
      await api.financeiro.titulosPagar.delete(id);
      load(page);
    } catch (err: any) {
      error(err.message || 'Erro ao excluir');
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllAbertos = () => {
    const ids = rows.filter((r) => r.status === 'aberto').map((r: any) => r.id);
    setSelectedIds(new Set(ids));
  };

  const handleBaixaLote = async () => {
    if (!loteData.conta_interna_id) {
      warning('Selecione a conta de pagamento');
      return;
    }
    if (selectedIds.size === 0) {
      warning('Nenhum título selecionado');
      return;
    }
    setLoteLoading(true);
    let ok = 0,
      fail = 0;
    for (const id of selectedIds) {
      try {
        await api.financeiro.titulosPagar.baixar(id, {
          conta_interna_id: loteData.conta_interna_id,
          data_baixa: loteData.data_baixa,
          observacoes: loteData.observacoes || 'Baixa em lote',
        });
        ok++;
      } catch {
        fail++;
      }
    }
    setLoteLoading(false);
    setLoteModal(false);
    setSelectedIds(new Set());
    success(`${ok} títulos pagos com sucesso.${fail > 0 ? ` ${fail} falharam.` : ''}`);
    load(page);
  };

  const saveEdit = async () => {
    try {
      await api.financeiro.titulosPagar.update(editModal!.id, {
        numero_titulo: editModal!.numero_titulo,
        valor_original: editModal!.valor_original,
        data_vencimento: editModal!.data_vencimento,
        taxa_financeira: editModal!.taxa_financeira,
        valor_custo_financeiro: editModal!.valor_custo_financeiro,
        status: editModal!.status,
      });
      setEditModal(null);
      load(page);
      success('Alterações salvas com sucesso');
    } catch (err: any) {
      error(err.message || 'Erro ao salvar alterações');
    }
  };

  const handleDeleteBatch = async (fornecedorId: string) => {
    const isConfirmed = await confirmAction({
      title: 'ELIMINAÇÃO EM MASSA',
      description: 'DESEJA REALMENTE EXCLUIR TODOS OS TÍTULOS DESTE FORNECEDOR?',
    });
    if (!isConfirmed) return;
    try {
      await api.financeiro.titulosPagar.deleteBatch(fornecedorId);
      load(page);
    } catch (err: any) {
      error(err.message || 'Erro ao excluir lote');
    }
  };

  return {
    ConfirmDialogElement,
    rows,
    page,
    perPage,
    total,
    suppliersMap,
    loading,
    baixaModal,
    reciboModal,
    contas,
    expandedGroups,
    selectedIds,
    loteModal,
    loteData,
    loteLoading,
    editModal,
    isWizardOpen,
    stats,
    setPage,
    load,
    confirmarBaixa,
    doDelete,
    toggleSelect,
    selectAllAbertos,
    handleBaixaLote,
    saveEdit,
    handleDeleteBatch,
    setBaixaModal,
    setReciboModal,
    setExpandedGroups,
    setSelectedIds,
    setLoteModal,
    setLoteData,
    setEditModal,
    setIsWizardOpen,
  };
}
