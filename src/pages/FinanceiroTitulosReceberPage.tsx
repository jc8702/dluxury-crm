import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import Modal from '../components/ui/Modal';
import { 
  FiPlus, 
  FiFilter, 
  FiCheckCircle, 
  FiTrash2, 
  FiArrowUpRight, 
  FiArrowDownLeft,
  FiCalendar,
  FiUser,
  FiCreditCard,
  FiMoreVertical
} from 'react-icons/fi';

export default function FinanceiroTitulosReceberPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [total, setTotal] = useState(0);
  const [clientsMap, setClientsMap] = useState<Record<string,string>>({});
  const [loading, setLoading] = useState(false);
  const [baixaModal, setBaixaModal] = useState<any>(null);
  const [contas, setContas] = useState<any[]>([]);

  // Totais para o header
  const [stats, setStats] = useState({
    totalAberto: 0,
    totalVencido: 0,
    totalRecebido: 0
  });

  const load = async (p = 1) => {
    setLoading(true);
    try {
      const res = await api.financeiro.titulosReceber.list({ page: p, perPage });
      let dataRows: any[] = [];
      
      // O apiCall já extrai o .data se existir, então res deve ser o array ou objeto
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

      // Calcular stats básicos
      let aberto = 0;
      let vencido = 0;
      let recebido = 0;
      const hoje = new Date();

      dataRows.forEach(r => {
        const valor = Number(r.valor_aberto) || 0;
        if (r.status === 'pago') {
          recebido += Number(r.valor_original);
        } else {
          aberto += valor;
          if (new Date(r.data_vencimento) < hoje) {
            vencido += valor;
          }
        }
      });
      setStats({ totalAberto: aberto, totalVencido: vencido, totalRecebido: recebido });

      const clients = await api.clients.list();
      const map: Record<string,string> = {};
      (clients || []).forEach((c: any) => { map[c.id] = c.nome || c.name || `${c.id}`; });
      setClientsMap(map);
      
      const cts = await api.financeiro.contasInternas.list();
      setContas(cts || []);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(page); }, [page]);

  const confirmarBaixa = async () => {
    try {
      const contaId = (document.getElementById('conta-interna-id') as HTMLSelectElement).value;
      if (!contaId) throw new Error('Selecione uma conta');
      
      await api.financeiro.titulosReceber.baixar(baixaModal.id, {
        valor_baixa: baixaModal.valor_aberto,
        conta_interna_id: contaId,
        data_baixa: new Date()
      });
      setBaixaModal(null);
      load(page);
    } catch (err: any) {
      alert(err.message || 'Erro ao registrar baixa');
    }
  };

  const doDelete = async (id: string) => {
    if (!confirm('Confirma exclusão (soft-delete) do título?')) return;
    try {
      await api.financeiro.titulosReceber.delete(id);
      load(page);
    } catch (err: any) {
      alert(err.message || 'Erro ao excluir');
    }
  };

  const getStatusColor = (status: string, vencimento: string) => {
    if (status === 'pago') return 'rgba(34, 197, 94, 0.2)'; // Verde
    if (new Date(vencimento) < new Date()) return 'rgba(239, 68, 68, 0.2)'; // Vermelho
    return 'rgba(234, 179, 8, 0.2)'; // Amarelo
  };

  const getStatusTextColor = (status: string, vencimento: string) => {
    if (status === 'pago') return '#4ADE80';
    if (new Date(vencimento) < new Date()) return '#F87171';
    return '#FACC15';
  };

  return (
    <div className="p-6 min-h-screen bg-[#0D1117] text-white">
      {/* Header Premium */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
            <FiArrowDownLeft className="text-[#E2AC00]" />
            Títulos a Receber
          </h1>
          <p className="text-gray-400 mt-1">Gestão de recebimentos e fluxo de entrada</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => window.location.hash = '#/financeiro/titulos-receber/wizard'}
            className="flex items-center gap-2 bg-[#E2AC00] hover:bg-[#F5BC00] text-black px-6 py-2.5 rounded-xl font-bold transition-all shadow-lg hover:shadow-[#E2AC00]/20"
          >
            <FiPlus /> NOVO (WIZARD)
          </button>
        </div>
      </div>

      {/* Grid de Stats Glassmorphism */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {[
          { label: 'Total a Receber', value: stats.totalAberto, color: '#6366F1', icon: FiArrowDownLeft },
          { label: 'Total Recebido', value: stats.totalRecebido, color: '#22C55E', icon: FiCheckCircle },
          { label: 'Em Atraso', value: stats.totalVencido, color: '#EF4444', icon: FiCalendar },
        ].map((stat, i) => (
          <div key={i} className="bg-[#161B22]/50 backdrop-blur-xl border border-white/5 p-6 rounded-2xl">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400 font-medium text-sm">{stat.label}</span>
              <stat.icon style={{ color: stat.color }} className="text-xl" />
            </div>
            <div className="text-2xl font-bold">R$ {stat.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
            <div className="h-1.5 w-full bg-white/5 rounded-full mt-4">
              <div className="h-full rounded-full" style={{ backgroundColor: stat.color, width: '30%' }} />
            </div>
          </div>
        ))}
      </div>

      {/* Tabela Premium */}
      <div className="bg-[#161B22]/80 backdrop-blur-2xl border border-white/5 rounded-3xl overflow-hidden shadow-2xl">
        <div className="px-6 py-4 border-bottom border-white/5 bg-white/5 flex justify-between items-center text-sm font-medium text-gray-400 uppercase tracking-wider">
          <div className="grid grid-cols-6 w-full items-center">
            <div className="col-span-1">Título</div>
            <div className="col-span-1">Cliente</div>
            <div className="col-span-1 text-right pr-8">Valor</div>
            <div className="col-span-1">Vencimento</div>
            <div className="col-span-1">Status</div>
            <div className="col-span-1 text-center font-bold">Ações</div>
          </div>
        </div>

        <div className="min-h-[400px]">
          {loading ? (
            <div className="flex justify-center items-center h-[400px]">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#E2AC00]" />
            </div>
          ) : rows.length === 0 ? (
            <div className="flex flex-col justify-center items-center h-[400px] text-gray-500">
              <FiFilter className="text-4xl mb-4 opacity-20" />
              <p>Nenhum título encontrado</p>
            </div>
          ) : (
            rows.map((r, idx) => (
              <div 
                key={r.id} 
                className={`px-6 py-4 grid grid-cols-6 items-center border-b border-white/5 hover:bg-white/[0.02] transition-colors ${idx === rows.length - 1 ? 'border-none' : ''}`}
              >
                <div className="col-span-1 font-mono text-[#E2AC00] font-medium">{r.numero_titulo}</div>
                <div className="col-span-1 flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-xs font-bold">
                    {clientsMap[r.cliente_id]?.charAt(0) || 'C'}
                  </div>
                  <span className="truncate max-w-[150px]">{clientsMap[r.cliente_id] || '---'}</span>
                </div>
                <div className="col-span-1 text-right pr-8 font-bold text-white">
                  R$ {Number(r.valor_original).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
                <div className="col-span-1 text-gray-400 text-sm flex items-center gap-2">
                  <FiCalendar className="opacity-50" />
                  {new Date(r.data_vencimento).toLocaleDateString()}
                </div>
                <div className="col-span-1">
                  <span 
                    className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest"
                    style={{ 
                      backgroundColor: getStatusColor(r.status, r.data_vencimento),
                      color: getStatusTextColor(r.status, r.data_vencimento)
                    }}
                  >
                    {r.status === 'pago' ? 'QUIDADO' : (new Date(r.data_vencimento) < new Date() ? 'ATRASADO' : 'ABERTO')}
                  </span>
                </div>
                <div className="col-span-1 flex justify-center gap-2">
                  <button 
                    onClick={() => setBaixaModal(r)} 
                    disabled={r.status === 'pago'}
                    title="Registrar Recebimento"
                    className="p-2.5 rounded-xl bg-white/5 hover:bg-[#E2AC00] hover:text-black transition-all disabled:opacity-20"
                  >
                    <FiArrowDownLeft />
                  </button>
                  <button 
                    onClick={() => doDelete(r.id)}
                    className="p-2.5 rounded-xl bg-white/5 hover:bg-red-500/80 transition-all text-white/40 hover:text-white"
                  >
                    <FiTrash2 />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Paginação */}
      <div className="mt-8 flex justify-between items-center text-gray-400 text-sm">
        <div>Mostrando <span className="text-white">{rows.length}</span> de <span className="text-white">{total}</span> títulos</div>
        <div className="flex gap-2">
          <button 
            disabled={page <= 1} 
            onClick={() => setPage(page-1)}
            className="px-4 py-2 bg-white/5 rounded-xl hover:bg-white/10 disabled:opacity-20 transition-all"
          >
            Anterior
          </button>
          <div className="px-4 py-2 border border-white/5 rounded-xl text-white font-bold bg-[#E2AC00]/10">
            {page}
          </div>
          <button 
            disabled={(page * perPage) >= total} 
            onClick={() => setPage(page+1)}
            className="px-4 py-2 bg-white/5 rounded-xl hover:bg-white/10 disabled:opacity-20 transition-all"
          >
            Próxima
          </button>
        </div>
      </div>
      
      {/* Modal de Baixa Premium */}
      <Modal 
        isOpen={!!baixaModal} 
        onClose={() => setBaixaModal(null)} 
        title="Registrar Recebimento"
      >
        <div className="space-y-6">
          <div className="flex justify-between items-center p-4 bg-[#161B22] rounded-2xl border border-white/5">
            <div>
              <div className="text-sm text-gray-400">Valor em Aberto</div>
              <div className="text-2xl font-bold text-[#E2AC00]">R$ {Number(baixaModal?.valor_aberto).toFixed(2)}</div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-400">Vencimento</div>
              <div className="font-medium">{baixaModal ? new Date(baixaModal.data_vencimento).toLocaleDateString() : ''}</div>
            </div>
          </div>
          
          <div>
            <label className="block text-sm text-gray-400 mb-2">Conta para Recebimento</label>
            <select 
              id="conta-interna-id" 
              className="w-full bg-[#0D1117] border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-[#E2AC00] focus:border-transparent outline-none transition-all"
            >
              <option value="">Selecione...</option>
              {contas.map((c: any) => (
                <option key={c.id} value={c.id}>{c.nome} (Saldo Atual: R$ {Number(c.saldo_atual).toFixed(2)})</option>
              ))}
            </select>
          </div>
          
          <div className="flex gap-3 justify-end pt-4">
            <button 
              className="px-6 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 font-bold transition-all" 
              onClick={() => setBaixaModal(null)}
            >
              CANCELAR
            </button>
            <button 
              className="px-6 py-2.5 rounded-xl bg-[#E2AC00] hover:bg-[#F5BC00] text-black font-bold shadow-lg hover:shadow-[#E2AC00]/30 transition-all" 
              onClick={confirmarBaixa}
            >
              CONFIRMAR RECEBIMENTO
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
