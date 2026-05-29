import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  TrendingDown, 
  Truck, 
  CheckCircle, 
  XCircle, 
  Search, 
  RefreshCw, 
  Plus, 
  Minus,
  ClipboardList,
  AlertCircle,
  FileText
} from 'lucide-react';
import { estoqueGranularService } from '../../services/estoqueGranularService';
import type { EstoqueGranularItem, AlertaEstoque } from '../../services/estoqueGranularService';

export default function EstoqueGranular() {
  const [items, setItems] = useState<EstoqueGranularItem[]>([]);
  const [alertas, setAlertas] = useState<AlertaEstoque[]>([]);
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [loading, setLoading] = useState(false);
  
  // Modal de Detalhes
  const [itemSelecionado, setItemSelecionado] = useState<EstoqueGranularItem | null>(null);
  const [historicoMovimentos, setHistoricoMovimentos] = useState<any[]>([]);
  const [loadingHistorico, setLoadingHistorico] = useState(false);
  
  // Modal de Nova Movimentação
  const [showMovimentarModal, setShowMovimentarModal] = useState(false);
  const [movItem, setMovItem] = useState<{
    sku_codigo: string;
    tipo_movimento: 'entrada_compra' | 'saida_producao' | 'devolucao' | 'descarte' | 'rejeicao_qc' | 'ajuste_entrada' | 'ajuste_saida';
    quantidade: number;
    status_alvo: 'disponivel' | 'em_transito' | 'provisionado' | 'defeituoso' | 'vencido';
    motivo: string;
  }>({
    sku_codigo: '',
    tipo_movimento: 'entrada_compra',
    quantidade: 1,
    status_alvo: 'disponivel',
    motivo: ''
  });
  const [submittingMov, setSubmittingMov] = useState(false);
  const [erroMov, setErroMov] = useState('');

  useEffect(() => {
    carregarEstoque();
    carregarAlertas();
  }, [filtroStatus]);

  const carregarEstoque = async () => {
    setLoading(true);
    try {
      const data = await estoqueGranularService.getItems(filtroStatus, busca);
      setItems(data.items || []);
    } catch (error) {
      console.error('Erro ao carregar estoque granular:', error);
    } finally {
      setLoading(false);
    }
  };

  const carregarAlertas = async () => {
    try {
      const data = await estoqueGranularService.getAlertas();
      setAlertas(data.alertas || []);
    } catch (error) {
      console.error('Erro ao carregar alertas:', error);
    }
  };

  const carregarHistorico = async (sku: string) => {
    setLoadingHistorico(true);
    try {
      // Buscar histórico via API legada ou customizada que lista movimentações desse sku
      const res = await fetch(`/api/estoque?type=movimentacoes&limit=20`);
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        // Filtrar localmente pelo SKU se a API não filtrar diretamente
        const filtered = data.data.filter((m: any) => m.sku_codigo === sku || (m.material_nome && m.material_nome.toLowerCase().includes(sku.toLowerCase())));
        setHistoricoMovimentos(filtered);
      }
    } catch (error) {
      console.error('Erro ao carregar historico:', error);
    } finally {
      setLoadingHistorico(false);
    }
  };

  const abrirDetalheItem = (item: EstoqueGranularItem) => {
    setItemSelecionado(item);
    setHistoricoMovimentos([]);
    carregarHistorico(item.sku_codigo);
  };

  const handleSubmeterMovimentacao = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingMov(true);
    setErroMov('');
    try {
      const res = await estoqueGranularService.registrarMovimento({
        sku_codigo: movItem.sku_codigo,
        tipo_movimento: movItem.tipo_movimento,
        quantidade: Number(movItem.quantidade),
        status_alvo: movItem.status_alvo,
        motivo: movItem.motivo
      });

      if (res.success) {
        setShowMovimentarModal(false);
        setMovItem({
          sku_codigo: '',
          tipo_movimento: 'entrada_compra',
          quantidade: 1,
          status_alvo: 'disponivel',
          motivo: ''
        });
        carregarEstoque();
        carregarAlertas();
      } else {
        setErroMov('Erro ao registrar movimentação.');
      }
    } catch (error: any) {
      setErroMov(error.message || 'Erro ao registrar movimentação.');
    } finally {
      setSubmittingMov(false);
    }
  };

  const obterCorStatus = (status_alerta: string) => {
    if (status_alerta === 'critica') return 'border-red-500/20 bg-red-500/10 text-red-400';
    if (status_alerta === 'alerta') return 'border-yellow-500/20 bg-yellow-500/10 text-yellow-400';
    return 'border-green-500/20 bg-green-500/10 text-green-400';
  };

  const obterIconeAlerta = (tipo: string) => {
    const iconesMap: Record<string, React.ReactNode> = {
      'minimo_atingido': <TrendingDown size={16} className="text-orange-400" />,
      'maximo_excedido': <AlertTriangle size={16} className="text-yellow-400" />,
      'em_falta': <XCircle size={16} className="text-red-500" />,
      'vencimento_proximo': <AlertCircle size={16} className="text-red-400" />,
      'muito_atrasado': <Truck size={16} className="text-blue-400" />
    };
    return iconesMap[tipo] || <AlertTriangle size={16} />;
  };

  const formatarTipoMovimento = (tipo: string) => {
    const map: Record<string, string> = {
      'entrada_compra': 'Entrada Compra',
      'saida_producao': 'Saída Produção',
      'reserva_automatica': 'Reserva Automática',
      'devolucao': 'Devolução',
      'descarte': 'Descarte',
      'rejeicao_qc': 'Rejeição QC',
      'ajuste_entrada': 'Ajuste (+) ',
      'ajuste_saida': 'Ajuste (-)'
    };
    return map[tipo] || tipo;
  };

  return (
    <div className="space-y-6">
      {/* Alertas Ativos */}
      {alertas.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {alertas.filter(a => a.severidade === 'critica').length > 0 && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
              <h3 className="text-red-400 font-bold mb-2 flex items-center gap-2">
                <XCircle size={18} />
                {alertas.filter(a => a.severidade === 'critica').length} Críticos (Estoque Zerado)
              </h3>
              <ul className="divide-y divide-red-500/10 max-h-40 overflow-y-auto">
                {alertas.filter(a => a.severidade === 'critica').map(a => (
                  <li key={a.id} className="py-2 text-sm text-red-300 flex justify-between items-center">
                    <span>
                      <strong className="text-foreground">{a.sku_codigo}</strong> - {a.descricao || 'Material'}
                    </span>
                    <span className="bg-red-500/20 text-red-400 px-2 py-0.5 rounded text-xs">Falta</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {alertas.filter(a => a.severidade !== 'critica').length > 0 && (
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
              <h3 className="text-yellow-400 font-bold mb-2 flex items-center gap-2">
                <AlertTriangle size={18} />
                {alertas.filter(a => a.severidade !== 'critica').length} Alertas (Mínimo Atingido)
              </h3>
              <ul className="divide-y divide-yellow-500/10 max-h-40 overflow-y-auto text-sm text-yellow-200">
                {alertas.filter(a => a.severidade !== 'critica').map(a => (
                  <li key={a.id} className="py-2 flex justify-between items-center">
                    <span className="flex items-center gap-1.5">
                      {obterIconeAlerta(a.tipo_alerta)}
                      <strong className="text-foreground">{a.sku_codigo}</strong> - {a.descricao || 'Material'}
                    </span>
                    <span className="text-xs text-yellow-400 bg-yellow-500/10 px-2 py-0.5 rounded">
                      {a.quantidade_atual} un (Mín: {a.limite_alerta})
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Ações e Busca */}
      <div className="bg-card border border-border rounded-lg p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-2.5 text-muted-foreground" size={18} />
          <input
            type="text"
            placeholder="Buscar por SKU ou Descrição..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && carregarEstoque()}
            className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:border-zinc-700"
          />
        </div>

        <div className="flex gap-3 w-full md:w-auto">
          <select
            value={filtroStatus}
            onChange={(e) => setFiltroStatus(e.target.value)}
            className="flex-1 md:flex-none px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none"
          >
            <option value="todos">Todos os Itens</option>
            <option value="critica">Critica (Falta)</option>
            <option value="alerta">Alerta (Mínimo)</option>
            <option value="minimo">Mínimo / Crítico</option>
          </select>

          <button
            onClick={carregarEstoque}
            className="p-2.5 bg-background border border-border rounded-lg text-muted-foreground hover:text-foreground hover:border-zinc-700 transition"
            title="Atualizar dados"
          >
            <RefreshCw size={18} />
          </button>

          <button
            onClick={() => setShowMovimentarModal(true)}
            className="flex items-center justify-center gap-1.5 px-4 py-2 bg-foreground text-background hover:bg-foreground/90 font-semibold rounded-lg transition"
          >
            <Plus size={18} />
            Movimentar
          </button>
        </div>
      </div>

      {/* Grid de Itens */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <RefreshCw className="animate-spin mb-3 text-muted-foreground" size={32} />
          <span>Carregando dados de estoque granular...</span>
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-border rounded-lg text-muted-foreground">
          <ClipboardList size={40} className="mx-auto mb-3 text-zinc-600" />
          <p>Nenhum item localizado com os critérios selecionados.</p>
        </div>
      ) : (
        <div className="overflow-x-auto bg-background border border-border rounded-lg">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-card/50 text-muted-foreground">
                <th className="p-4 font-semibold">SKU / Material</th>
                <th className="p-4 font-semibold text-center bg-green-500/5">Disponível</th>
                <th className="p-4 font-semibold text-center bg-blue-500/5">Trânsito</th>
                <th className="p-4 font-semibold text-center bg-yellow-500/5">Provisionado</th>
                <th className="p-4 font-semibold text-center bg-red-500/5">Defeito</th>
                <th className="p-4 font-semibold text-center bg-gray-500/5">Vencido</th>
                <th className="p-4 font-semibold text-center font-bold">Total</th>
                <th className="p-4 font-semibold text-right">Valor Estoque</th>
                <th className="p-4 font-semibold text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {items.map((item) => (
                <tr 
                  key={item.sku_codigo} 
                  onClick={() => abrirDetalheItem(item)}
                  className="hover:bg-card/40 cursor-pointer transition"
                >
                  <td className="p-4">
                    <span className="font-mono text-foreground font-bold block">{item.sku_codigo}</span>
                    <span className="text-muted-foreground text-xs">{item.descricao}</span>
                  </td>
                  <td className="p-4 text-center bg-green-500/5 text-green-400 font-bold">
                    {item.quantidade_disponivel} <span className="text-[10px] text-green-600 font-normal">{item.unidade_medida}</span>
                  </td>
                  <td className="p-4 text-center bg-blue-500/5 text-blue-400">
                    {item.quantidade_em_transito > 0 ? item.quantidade_em_transito : '-'}
                  </td>
                  <td className="p-4 text-center bg-yellow-500/5 text-yellow-400 font-medium">
                    {item.quantidade_provisionado > 0 ? item.quantidade_provisionado : '-'}
                  </td>
                  <td className="p-4 text-center bg-red-500/5 text-red-400">
                    {item.quantidade_defeituoso > 0 ? item.quantidade_defeituoso : '-'}
                  </td>
                  <td className="p-4 text-center bg-gray-500/5 text-muted-foreground">
                    {item.quantidade_vencido > 0 ? item.quantidade_vencido : '-'}
                  </td>
                  <td className="p-4 text-center font-bold text-foreground">
                    {item.quantidade_total}
                  </td>
                  <td className="p-4 text-right font-mono text-foreground">
                    R$ {Number(item.valor_total_estoque || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="p-4 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${obterCorStatus(item.status_alerta)}`}>
                      {item.status_alerta === 'critica' ? 'Falta' : item.status_alerta === 'alerta' ? 'Mínimo' : 'Ok'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Detalhe do Item */}
      {itemSelecionado && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-background border border-border rounded-xl p-6 max-w-2xl w-full relative">
            <button 
              onClick={() => setItemSelecionado(null)}
              className="absolute right-4 top-4 text-muted-foreground hover:text-foreground"
            >
              ✕
            </button>
            
            <h2 className="text-xl font-bold text-foreground font-mono">{itemSelecionado.sku_codigo}</h2>
            <p className="text-muted-foreground text-sm mb-6">{itemSelecionado.descricao}</p>

            {/* Grid dos 5 status detalhados */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
              <div className="bg-green-500/10 border border-green-500/20 p-3 rounded-lg text-center">
                <span className="text-muted-foreground text-xs block mb-1">Disponível</span>
                <span className="text-xl font-bold text-green-400">{itemSelecionado.quantidade_disponivel}</span>
              </div>
              <div className="bg-blue-500/10 border border-blue-500/20 p-3 rounded-lg text-center">
                <span className="text-muted-foreground text-xs block mb-1">Trânsito</span>
                <span className="text-xl font-bold text-blue-400">{itemSelecionado.quantidade_em_transito}</span>
              </div>
              <div className="bg-yellow-500/10 border border-yellow-500/20 p-3 rounded-lg text-center">
                <span className="text-muted-foreground text-xs block mb-1">Provisionado</span>
                <span className="text-xl font-bold text-yellow-400">{itemSelecionado.quantidade_provisionado}</span>
              </div>
              <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-lg text-center">
                <span className="text-muted-foreground text-xs block mb-1">Defeito</span>
                <span className="text-xl font-bold text-red-400">{itemSelecionado.quantidade_defeituoso}</span>
              </div>
              <div className="bg-card border border-border p-3 rounded-lg text-center col-span-2 md:col-span-1">
                <span className="text-muted-foreground text-xs block mb-1">Vencido</span>
                <span className="text-xl font-bold text-muted-foreground">{itemSelecionado.quantidade_vencido}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 text-sm text-foreground">
              <div className="bg-card/50 p-4 rounded-lg border border-border">
                <span className="text-muted-foreground text-xs block mb-1">CUSTO UNITÁRIO</span>
                <span className="font-mono text-foreground text-base">R$ {Number(itemSelecionado.preco_custo_unitario).toFixed(2)}</span>
                <span className="text-muted-foreground text-xs block mt-3 mb-1">VALOR TOTAL EM ESTOQUE</span>
                <span className="font-mono text-foreground text-base">R$ {Number(itemSelecionado.valor_total_estoque).toFixed(2)}</span>
              </div>
              <div className="bg-card/50 p-4 rounded-lg border border-border">
                <span className="text-muted-foreground text-xs block mb-1">MÍN / MÁX RECOMENDADO</span>
                <span className="text-foreground">{itemSelecionado.quantidade_minima} un / {itemSelecionado.quantidade_maxima} un</span>
                <span className="text-muted-foreground text-xs block mt-3 mb-1">PRÓXIMA REPOSIÇÃO PREVISTA</span>
                <span className="text-foreground">{itemSelecionado.data_proxima_reposicao ? new Date(itemSelecionado.data_proxima_reposicao).toLocaleDateString('pt-BR') : 'Não agendada'}</span>
              </div>
            </div>

            {/* Histórico do Item */}
            <div>
              <h3 className="font-bold text-foreground mb-2 flex items-center gap-1.5">
                <FileText size={16} />
                Histórico de Movimentações
              </h3>
              <div className="bg-card/40 border border-border rounded-lg p-3 max-h-48 overflow-y-auto">
                {loadingHistorico ? (
                  <div className="text-center py-6 text-muted-foreground">
                    <RefreshCw className="animate-spin mx-auto mb-2" size={20} />
                    <span>Carregando histórico...</span>
                  </div>
                ) : historicoMovimentos.length === 0 ? (
                  <p className="text-zinc-600 text-xs text-center py-6">Nenhuma movimentação registrada.</p>
                ) : (
                  <div className="space-y-3">
                    {historicoMovimentos.map((mov) => (
                      <div key={mov.id} className="flex justify-between items-start text-xs border-b border-border pb-2">
                        <div>
                          <span className="font-semibold text-zinc-200 block">{formatarTipoMovimento(mov.tipo || mov.tipo_movimento)}</span>
                          <span className="text-muted-foreground block mt-0.5">{mov.motivo || mov.motivo_descricao || 'Sem justificativa'}</span>
                        </div>
                        <div className="text-right">
                          <span className={`font-bold block ${mov.tipo === 'entrada' ? 'text-green-400' : 'text-red-400'}`}>
                            {mov.tipo === 'entrada' ? '+' : '-'}{mov.quantidade || mov.quantidade_movimento}
                          </span>
                          <span className="text-muted-foreground block mt-0.5">{new Date(mov.created_at || mov.timestamp_movimento).toLocaleDateString('pt-BR')}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Novo Registro de Movimentação */}
      {showMovimentarModal && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center p-4 z-50">
          <form 
            onSubmit={handleSubmeterMovimentacao}
            className="bg-background border border-border rounded-xl p-6 max-w-md w-full relative"
          >
            <button 
              type="button"
              onClick={() => setShowMovimentarModal(false)}
              className="absolute right-4 top-4 text-muted-foreground hover:text-foreground"
            >
              ✕
            </button>

            <h2 className="text-xl font-bold text-foreground mb-6">Registrar Movimentação</h2>

            {erroMov && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm p-3 rounded-lg mb-4">
                {erroMov}
              </div>
            )}

            <div className="space-y-4 text-sm text-foreground">
              <div>
                <label className="block mb-1.5 font-semibold text-muted-foreground">SKU do Item:</label>
                <select
                  value={movItem.sku_codigo}
                  onChange={(e) => setMovItem({ ...movItem, sku_codigo: e.target.value })}
                  required
                  className="w-full px-3 py-2 bg-card border border-border rounded-lg text-foreground focus:outline-none"
                >
                  <option value="">Selecione o SKU</option>
                  {items.map(i => (
                    <option key={i.sku_codigo} value={i.sku_codigo}>{i.sku_codigo} - {i.descricao}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block mb-1.5 font-semibold text-muted-foreground">Operação:</label>
                  <select
                    value={movItem.tipo_movimento}
                    onChange={(e: any) => setMovItem({ ...movItem, tipo_movimento: e.target.value })}
                    className="w-full px-3 py-2 bg-card border border-border rounded-lg text-foreground focus:outline-none"
                  >
                    <option value="entrada_compra">Entrada de Compra</option>
                    <option value="saida_producao">Saída p/ Produção</option>
                    <option value="devolucao">Devolução</option>
                    <option value="descarte">Descarte</option>
                    <option value="rejeicao_qc">Rejeição QC</option>
                    <option value="ajuste_entrada">Ajuste de Entrada (+)</option>
                    <option value="ajuste_saida">Ajuste de Saída (-)</option>
                  </select>
                </div>

                <div>
                  <label className="block mb-1.5 font-semibold text-muted-foreground">Status Alvo:</label>
                  <select
                    value={movItem.status_alvo}
                    onChange={(e: any) => setMovItem({ ...movItem, status_alvo: e.target.value })}
                    className="w-full px-3 py-2 bg-card border border-border rounded-lg text-foreground focus:outline-none"
                  >
                    <option value="disponivel">Disponível</option>
                    <option value="em_transito">Em Trânsito</option>
                    <option value="provisionado">Provisionado</option>
                    <option value="defeituoso">Defeituoso</option>
                    <option value="vencido">Vencido</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block mb-1.5 font-semibold text-muted-foreground">Quantidade:</label>
                <input
                  type="number"
                  min="1"
                  value={movItem.quantidade}
                  onChange={(e) => setMovItem({ ...movItem, quantidade: Number(e.target.value) })}
                  required
                  className="w-full px-3 py-2 bg-card border border-border rounded-lg text-foreground focus:outline-none"
                />
              </div>

              <div>
                <label className="block mb-1.5 font-semibold text-muted-foreground">Motivo / Descrição:</label>
                <textarea
                  value={movItem.motivo}
                  onChange={(e) => setMovItem({ ...movItem, motivo: e.target.value })}
                  placeholder="Justificativa para esta movimentação..."
                  rows={3}
                  className="w-full px-3 py-2 bg-card border border-border rounded-lg text-foreground focus:outline-none placeholder-zinc-650"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submittingMov}
              className="w-full py-2.5 mt-6 bg-foreground text-background hover:bg-foreground/90 font-semibold rounded-lg transition disabled:opacity-50"
            >
              {submittingMov ? 'Processando...' : 'Confirmar Lançamento'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
