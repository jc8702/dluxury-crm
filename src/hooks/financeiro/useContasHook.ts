import { useEffect, useState, useCallback } from 'react';
import { useConfirm } from '../../hooks/useConfirm';
import { useToast } from '../../context/ToastContext';
import { api } from '../../lib/api';
import type {
  ContaInterna,
  ExtratoPayload,
  Fechamento,
  FormTransferencia,
  TipoContaInterna,
} from '../../modules/financeiro/domain/types';

export interface ContaForm {
  nome: string;
  tipo: TipoContaInterna;
  banco_codigo: string;
  agencia: string;
  conta: string;
  saldo_inicial: number;
}

export function useContasHook() {
  const [ConfirmDialogElement, confirm] = useConfirm();
  const { success, error } = useToast();

  const [contas, setContas] = useState<ContaInterna[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState<ContaInterna | null>(null);

  const [form, setForm] = useState<ContaForm>({
    nome: '',
    tipo: 'conta_corrente',
    banco_codigo: '',
    agencia: '',
    conta: '',
    saldo_inicial: 0,
  });

  const [extrato, setExtrato] = useState<ExtratoPayload | null>(null);
  const [showExtrato, setShowExtrato] = useState(false);
  const [extratoLoading, setExtratoLoading] = useState(false);
  const [extratoContaNome, setExtratoContaNome] = useState('');

  const [showTransferencia, setShowTransferencia] = useState(false);
  const [transferForm, setTransferForm] = useState<FormTransferencia>({
    conta_origem_id: '',
    conta_destino_id: '',
    valor: '',
    data_movimento: new Date().toISOString().split('T')[0],
    descricao: '',
  });
  const [transferLoading, setTransferLoading] = useState(false);
  const [transferErro, setTransferErro] = useState('');

  const [showFechamento, setShowFechamento] = useState(false);
  const [fechamentos, setFechamentos] = useState<Fechamento[]>([]);
  const [fechamentoForm, setFechamentoForm] = useState({
    mes: new Date().getMonth() + 1,
    ano: new Date().getFullYear(),
    status: 'fechado' as const,
    observacoes: '',
  });

  const normalizeList = (value: any) => (Array.isArray(value) ? value : value?.data || []);

  const fetchContas = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.financeiro.contasInternas.list();
      setContas(res || []);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchContas();
  }, [fetchContas]);

  const fetchFechamentos = useCallback(async () => {
    try {
      const res = await api.financeiro.fechamentos.list();
      setFechamentos(normalizeList(res));
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    if (showFechamento) fetchFechamentos();
  }, [showFechamento, fetchFechamentos]);

  const saveFechamento = async () => {
    try {
      await api.financeiro.fechamentos.save(fechamentoForm);
      fetchFechamentos();
      success('Período atualizado com sucesso!');
    } catch (e: any) {
      error(e.message || 'Erro ao salvar fechamento');
    }
  };

  const openNew = () => {
    setEditing(null);
    setForm({
      nome: '',
      tipo: 'conta_corrente',
      banco_codigo: '',
      agencia: '',
      conta: '',
      saldo_inicial: 0,
    });
    setIsOpen(true);
  };

  const openEdit = (c: ContaInterna) => {
    setEditing(c);
    setForm({
      nome: c.nome,
      tipo: c.tipo,
      banco_codigo: c.banco_codigo || '',
      agencia: c.agencia || '',
      conta: c.conta || '',
      saldo_inicial: c.saldo_inicial,
    });
    setIsOpen(true);
  };

  const save = async () => {
    try {
      if (editing) await api.financeiro.contasInternas.update({ id: editing.id, ...form });
      else await api.financeiro.contasInternas.create(form);
      setIsOpen(false);
      fetchContas();
      success('Conta salva com sucesso!');
    } catch (e: any) {
      error(e.message || 'Erro ao salvar conta');
    }
  };

  const doDelete = async (id: string, nome: string) => {
    const isConfirmed = await confirm({
      title: 'EXCLUIR CONTA',
      description: `CONFIRMA A EXCLUSÃO DA CONTA "${nome.toUpperCase()}"?\nESTA OPERAÇÃO É IRREVERSÍVEL.`,
    });
    if (!isConfirmed) return;
    try {
      await api.financeiro.contasInternas.delete(id);
      fetchContas();
      success('Conta removida do sistema.');
    } catch (e: any) {
      error(e.message || 'Falha ao excluir');
    }
  };

  const openExtrato = async (conta: ContaInterna) => {
    setExtratoContaNome(conta.nome);
    setExtratoLoading(true);
    setShowExtrato(true);
    try {
      const token = localStorage.getItem('dluxury_token') || '';
      const res = await window.fetch(
        `/api/financeiro/contas-internas?action=extrato&id=${conta.id}`,
        {
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        },
      );
      const json = await res.json();
      const payload = json.data ?? json;
      setExtrato(payload);
    } catch (e) {
      console.error('Erro ao carregar extrato:', e);
      setExtrato(null);
    }
    setExtratoLoading(false);
  };

  const doTransferencia = async () => {
    setTransferErro('');
    if (!transferForm.conta_origem_id || !transferForm.conta_destino_id) {
      setTransferErro('Selecione a conta de origem e destino.');
      return;
    }
    if (transferForm.conta_origem_id === transferForm.conta_destino_id) {
      setTransferErro('Origem e destino não podem ser a mesma conta.');
      return;
    }
    if (!transferForm.valor || Number(transferForm.valor) <= 0) {
      setTransferErro('Informe um valor válido.');
      return;
    }
    setTransferLoading(true);
    try {
      const token = localStorage.getItem('dluxury_token') || '';
      const res = await window.fetch('/api/financeiro/tesouraria?action=transferencia', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...transferForm, valor: Number(transferForm.valor) }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Erro na transferência');
      setShowTransferencia(false);
      setTransferForm({
        conta_origem_id: '',
        conta_destino_id: '',
        valor: '',
        data_movimento: new Date().toISOString().split('T')[0],
        descricao: '',
      });
      fetchContas();
      success('Transferência realizada com sucesso!');
    } catch (e: any) {
      setTransferErro(e.message || 'Erro ao realizar transferência');
    }
    setTransferLoading(false);
  };

  return {
    ConfirmDialogElement,
    contas,
    loading,
    isOpen,
    editing,
    form,
    extrato,
    showExtrato,
    extratoLoading,
    extratoContaNome,
    showTransferencia,
    transferForm,
    transferLoading,
    transferErro,
    showFechamento,
    fechamentos,
    fechamentoForm,
    saveFechamento,
    openNew,
    openEdit,
    save,
    doDelete,
    openExtrato,
    doTransferencia,
    setIsOpen,
    setForm,
    setEditing,
    setShowExtrato,
    setExtrato,
    fetchContas,
    setShowTransferencia,
    setTransferForm,
    setTransferErro,
    setShowFechamento,
    setFechamentoForm,
    setFechamentos,
  };
}
