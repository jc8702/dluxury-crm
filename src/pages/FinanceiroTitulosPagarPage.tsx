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
  FiMoreVertical,
  FiTruck
} from 'react-icons/fi';

export default function FinanceiroTitulosPagarPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [total, setTotal] = useState(0);
  const [suppliersMap, setSuppliersMap] = useState<Record<string,string>>({});
  const [loading, setLoading] = useState(false);
  const [baixaModal, setBaixaModal] = useState<any>(null);
  const [contas, setContas] = useState<any[]>([]);

  // Totais para o header
  const [stats, setStats] = useState({
    totalAberto: 0,
    totalVencido: 0,
    totalPago: 0
  });

  const load = async (p = 1) => {
    setLoading(true);
    try {
      // Agora o api.financeiro.titulosPagar deve estar disponível após o fix no api.ts
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

      // Calcular stats básicos
      let aberto = 0;
      let vencido = 0;
      let pago = 0;
      const hoje = new Date();

      dataRows.forEach(r => {
        const valor = Number(r.valor_aberto) || 0;
        if (r.status === 'pago') {
          pago += Number(r.valor_original);
        } else {
          aberto += valor;
          if (new Date(r.data_vencimento) < hoje) {
            vencido += valor;
          }
        }
      });
      setStats({ totalAberto: aberto, totalVencido: vencido, totalPago: pago });

      const suppliers = await api.suppliers.list();
      const map: Record<string,string> = {};
      (suppliers || []).forEach((s: any) => { map[s.id] = s.nome || s.name || `${s.id}`; });
      setSuppliersMap(map);
      
      const cts = await api.financeiro.contasInternas.list();
      setContas(cts || []);
    } catch (err: any) {
      console.error(err);
      // O alert aqui ajuda o usuário a ver se o erro persiste, mas o design evita explosões no console.
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(page); }, [page]);

  const confirmarBaixa = async () => {
    try {
      const contaId = (document.getElementById('conta-interna-id') as HTMLSelectElement).value;
      if (!contaId) throw new Error('Selecione uma conta');
      
      await api.financeiro.titulosPagar.baixar(baixaModal.id, {
        valor_baixa: baixaModal.valor_aberto,
        conta_interna_id: contaId,
        data_baixa: new Date()
      });
      setBaixaModal(null);
      load(page);
    } catch (err: any) {
      alert(err.message || 'Erro ao registrar pagamento');
    }
  };

  const doDelete = async (id: string) => {
    if (!confirm('Confirma exclusão (soft-delete) do título?')) return;
    try {
      await api.financeiro.titulosPagar.delete(id);
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
            <FiArrowUpRight className="text-[#EF4444]" />
            Títulos a Pagar
          </h1>
          <p className="text-gray-400 mt-1">Gestão de obrigações e fluxo de saída</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => window.location.hash = '#/financeiro/titulos-pagar/wizard'}
            className="flex items-center gap-2 bg-[#EF4444] hover:bg-[#FF5555] text-white px-6 py-2.5 rounded-xl font-bold transition-all shadow-lg hover:shadow-[#EF4444]/20"
          >
            <FiPlus /> NOVO TÍTULO (WIZARD)
          </button>
        </div>
      </div>

      {/* Grid de Stats Glassmorphism */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {[
          { label: 'Total a Pagar', value: stats.totalAberto, color: '#F87171', icon: FiArrowUpRight },
          { label: 'Total Pago', value: stats.totalPago, color: '#22C55E', icon: FiCheckCircle },
          { label: 'Vencido', value: stats.totalVencido, color: '#EF4444', icon: FiCalendar },
        ].map((stat, i) => (
          <div key={i} className="bg-[#161B22]/50 backdrop-blur-xl border border-white/5 p-6 rounded-2xl">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400 font-medium text-sm">{stat.label}</span>
              <stat.icon style={{ color: stat.color }} className="text-xl" />
            </div>
            <div className="text-2xl font-bold">R$ {stat.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
            <div className="h-1.5 w-full bg-white/5 rounded-full mt-4">
              <div className="h-full rounded-full" style={{ backgroundColor: stat.color, width: '45%' }} />
            </div>
          </div>
        ))}
      </div>

      {/* Tabela Premium */}
      <div className="bg-[#161B22]/80 backdrop-blur-2xl border border-white/5 rounded-3xl overflow-hidden shadow-2xl">
        <div className="px-6 py-4 border-bottom border-white/5 bg-white/5 flex justify-between items-center text-sm font-medium text-gray-400 uppercase tracking-wider">
          <div className="grid grid-cols-6 w-full items-center">
            <div className="col-span-1">Título</div>
            <div className="col-span-1">Fornecedor</div>
            <div className="col-span-1 text-right pr-8">Valor</div>
            <div className="col-span-1">Vencimento</div>
            <div className="col-span-1">Status</div>
            <div className="col-span-1 text-center font-bold">Ações</div>
          </div>
        </div>

        <div className="min-h-[400px]">
          {loading ? (
            <div className="flex justify-center items-center h-[400px]">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#EF4444]" />
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
                <div className="col-span-1 font-mono text-[#F87171] font-medium">{r.numero_titulo}</div>
                <div className="col-span-1 flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center text-xs font-bold">
                    {suppliersMap[r.fornecedor_id]?.charAt(0) || 'F'}
                  </div>
                  <span className="truncate max-w-[150px]">{suppliersMap[r.fornecedor_id] || '---'}</span>
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
                    {r.status === 'pago' ? 'PAGO' : (new Date(r.data_vencimento) < new Date() ? 'ATRASADO' : 'PENDENTE')}
                  </span>
                </div>
                <div className="col-span-1 flex justify-center gap-2">
                  <button 
                    onClick={() => setBaixaModal(r)} 
                    disabled={r.status === 'pago'}
                    title="Registrar Pagamento"
                    className="p-2.5 rounded-xl bg-white/5 hover:bg-[#EF4444] hover:text-white transition-all disabled:opacity-20"
                  >
                    <FiArrowUpRight />
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
          <div className="px-4 py-2 border border-white/5 rounded-xl text-white font-bold bg-[#EF4444]/10">
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
      
      {/* Modal de Pagamento Premium */}
      <Modal 
        isOpen={!!baixaModal} 
        onClose={() => setBaixaModal(null)} 
        title="Registrar Pagamento"
      >
        <div className="space-y-6 text-white">
          <div className="flex justify-between items-center p-4 bg-[#161B22] rounded-2xl border border-white/5 shadow-inner">
            <div>
              <div className="text-sm text-gray-400">Valor a Pagar</div>
              <div className="text-2xl font-bold text-[#EF4444]">R$ {Number(baixaModal?.valor_aberto).toFixed(2)}</div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-400">Vencimento</div>
              <div className="font-medium">{baixaModal ? new Date(baixaModal.data_vencimento).toLocaleDateString() : ''}</div>
            </div>
          </div>
          
          <div>
            <label className="block text-sm text-gray-400 mb-2">Conta para Débito</label>
            <select 
              id="conta-interna-id" 
              className="w-full bg-[#0D1117] border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-[#EF4444] focus:border-transparent outline-none transition-all"
            >
              <option value="">Selecione...</option>
              {contas.map((c: any) => (
                <option key={c.id} value={c.id}>{c.nome} (Disponível: R$ {Number(c.saldo_atual).toFixed(2)})</option>
              ))}
            </select>
          </div>
          
          <div className="flex gap-3 justify-end pt-4">
            <button 
              className="px-6 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 font-bold transition-all text-gray-400" 
              onClick={() => setBaixaModal(null)}
            >
              CANCELAR
            </button>
            <button 
              className="px-6 py-2.5 rounded-xl bg-[#EF4444] hover:bg-[#FF5555] text-white font-bold shadow-lg hover:shadow-[#EF4444]/30 transition-all" 
              onClick={confirmarBaixa}
            >
              CONFIRMAR PAGAMENTO
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
