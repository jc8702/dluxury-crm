import React, { useState, useEffect, useMemo } from 'react';
import { useAppContext } from '../../context/AppContext';
import { api } from '../../lib/api';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { 
  Plus, Search, Trash2, Edit2, 
  Save, FileDown, Send, Link as LinkIcon,
  AlertCircle, Check
} from 'lucide-react';
import { useEscClose } from '../../hooks/useEscClose';

interface EstimateItem {
  id: string;
  name: string;
  sku: string;
  quantity: number;
  woodType: string;
  width: number;
  height: number;
  depth: number;
  laborHours: number;
  laborRate: number;
  woodPrice: number;
  precoEngenharia: number;
}

const Estimates: React.FC = () => {
  const { clients, projects } = useAppContext();
  const [selectedClient, setSelectedClient] = useState('');
  const [selectedProject, setSelectedProject] = useState('');
  const [marginPercent, setMarginPercent] = useState(30);
  const [prazoEntrega, setPrazoEntrega] = useState('45 DIAS ÚTEIS');
  const [formaPagamento, setFormaPagamento] = useState('50% DE ENTRADA + 50% NA ENTREGA');
  const [items, setItems] = useState<EstimateItem[]>([]);
  const [showItemForm, setShowItemForm] = useState(false);
  const [orcamentosList, setOrcamentosList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [skuSearch, setSkuSearch] = useState('');
  const [skuResults, setSkuResults] = useState<any[]>([]);
  const { user } = useAppContext();
  const isAdmin = user?.role === 'admin';
  
  // Novos campos para parcelamento manual e taxa
  const [taxaFinanceira, setTaxaFinanceira] = useState(0);
  const [numParcelas, setNumParcelas] = useState(1);

  const searchSKU = async (q: string) => {
    setSkuSearch(q);
    if (q.length < 2) {
      setSkuResults([]);
      return;
    }
    try {
      const data = await api.engineering.list({ q });
      setSkuResults(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Error searching SKU", e);
    }
  };

  const selectSKU = (mat: any) => {
    const precoBase = Number(mat.preco_material_m3_padrao) || 0;
    const horasMO = Number(mat.horas_mo_padrao) || 0;
    const valorHora = Number(mat.valor_hora_padrao) || 0;
    const precoEngenharia = precoBase + (horasMO * valorHora);
    
    setNewItem({
      ...newItem,
      name: mat.nome || mat.codigo_modelo,
      sku: mat.codigo_modelo,
      woodType: mat.categoria_nome || 'Geral',
      width: Number(mat.largura_padrao) || 0,
      height: Number(mat.altura_padrao) || 0,
      depth: Number(mat.profundidade_padrao) || 0,
      laborHours: horasMO,
      laborRate: valorHora,
      woodPrice: precoBase,
      precoEngenharia: precoEngenharia
    });
    setSkuResults([]);
    setSkuSearch(mat.codigo_modelo);
  };

  const loadHistory = async () => {
    try {
      setLoading(true);
      const data = await api.orcamentos.list();
      setOrcamentosList(Array.isArray(data) ? data : []);
    } catch (e: any) {
      console.error("Erro ao carregar histórico", e);
    } finally {
      setLoading(false);
    }
  };

  const loadForEdit = async (orcId: string) => {
    try {
      setLoading(true);
      const orc = await api.orcamentos.get(orcId);
      setEditingId(orcId);
      setSelectedClient(orc.cliente_id);
      setSelectedProject(orc.projeto_id || '');
      setPrazoEntrega(orc.prazo_entrega_dias ? `${orc.prazo_entrega_dias} DIAS ÚTEIS` : '');
      setFormaPagamento(orc.observacoes?.split('Pagamento: ')[1]?.split(' (')[0] || orc.observacoes || '');
      
      // Tenta extrair parcelas e taxa das observações se estiverem lá, ou do banco se houver campos (futuro)
      setTaxaFinanceira(orc.taxa_financeira || 0);
      setNumParcelas(orc.total_parcelas || 1);

      const mappedItems: EstimateItem[] = orc.itens.map((it: any) => ({
        id: it.id,
        name: it.descricao,
        quantity: it.quantidade,
        width: Number(it.largura_cm),
        height: Number(it.altura_cm),
        depth: Number(it.profundidade_cm),
        woodType: it.material,
        woodPrice: (Number(it.valor_unitario) / 2),
        laborHours: 0,
        laborRate: 0
      }));
      setItems(mappedItems);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) {
      alert("Erro ao carregar orçamento para edição.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  useEscClose(() => { if (showItemForm) setShowItemForm(false); });

  const saveBudget = async () => {
    if (!selectedClient) {
      alert("Selecione um cliente para salvar o orçamento.");
      return;
    }
    if (items.length === 0) {
      alert("Adicione pelo menos um móvel ao orçamento.");
      return;
    }

    try {
      setSaving(true);
      const orcData = {
        cliente_id: selectedClient,
        projeto_id: selectedProject || null,
        status: editingId ? orcamentosList.find(o => o.id === editingId)?.status || 'rascunho' : 'rascunho',
        valor_base: subtotalCusto,
        taxa_financeira: taxaFinanceira,
        total_parcelas: numParcelas,
        valor_final: totalFinalComTaxa,
        prazo_entrega_dias: parseInt(prazoEntrega) || 45,
        prazo_tipo: 'uteis',
        observacoes: `Prazo: ${prazoEntrega}. Pagamento: ${formaPagamento} (${numParcelas}x c/ ${taxaFinanceira}% taxa)`,
        itens: items.map(it => ({
          descricao: it.name,
          ambiente: 'Geral',
          largura_cm: it.width,
          altura_cm: it.height,
          profundidade_cm: it.depth,
          material: it.woodType,
          acabamento: 'Padrão',
          quantidade: it.quantity,
          valor_unitario: (it.woodPrice + (it.laborHours * it.laborRate)) * (1 + marginPercent/100),
          valor_total: ((it.woodPrice + (it.laborHours * it.laborRate)) * (1 + marginPercent/100)) * it.quantity
        }))
      };

      if (editingId) {
        await api.orcamentos.update(editingId, orcData);
        alert("Orçamento atualizado com sucesso!");
      } else {
        await api.orcamentos.create(orcData);
        alert("Orçamento gravado com sucesso no histórico!");
      }
      
      setEditingId(null);
      loadHistory();
      clearDraft();
    } catch (e: any) {
      alert("Erro ao salvar orçamento: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = async (id: string, newStatus: string) => {
    try {
      setSaving(true);
      await api.orcamentos.update(id, { status: newStatus });
      alert(`Status atualizado para ${newStatus.toUpperCase()}!`);
      loadHistory();
    } catch (e: any) {
      alert("Erro ao atualizar status: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  const clearDraft = () => {
    if (confirm("Deseja realmente limpar os itens deste orçamento?")) {
      setItems([]);
      setTaxaFinanceira(0);
      setNumParcelas(1);
      if (selectedProject) localStorage.removeItem(`draft_estimate_${selectedProject}`);
    }
  };

const [newItem, setNewItem] = useState({
    name: '', sku: '', quantity: 1, woodType: 'MDF 15mm',
    width: 0, height: 0, depth: 0,
    laborHours: 0, laborRate: 0, woodPrice: 0, precoEngenharia: 0
  });

  const woodTypes = ['MDF 15mm', 'MDF 18mm', 'MDF 25mm', 'MDP 15mm', 'MDP 18mm', 'Compensado 15mm', 'Compensado 18mm', 'Madeira Maciça', 'Natulac', 'Freijó', 'Imbuia', 'Fórmica', 'Laminado'];

  const addItem = () => {
    if (!newItem.sku) {
      alert("Selecione um SKU de engenharia.");
      return;
    }
    if (newItem.quantity < 1) {
      alert("Quantidade deve ser pelo menos 1.");
      return;
    }
    const item: EstimateItem = { ...newItem, id: Date.now().toString() };
    setItems([...items, item]); setShowItemForm(false);
    setNewItem({ name: '', sku: '', quantity: 1, woodType: 'MDF 15mm', width: 0, height: 0, depth: 0, laborHours: 0, laborRate: 0, woodPrice: 0, precoEngenharia: 0 });
  };

  const removeItem = (id: string) => setItems(items.filter(i => i.id !== id));

  const subtotalEngenharia = items.reduce((acc, item) => acc + (item.precoEngenharia || 0) * item.quantity, 0);
  const subtotalCusto = subtotalEngenharia;
  const valorMargem = subtotalCusto * (marginPercent / 100);
  const totalBase = subtotalCusto + valorMargem;
  
  // Cálculo final com taxa financeira
  const valorTaxaFinanceira = totalBase * (taxaFinanceira / 100);
  const totalFinalComTaxa = totalBase + valorTaxaFinanceira;

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const clientProjects = projects.filter(p => {
    const client = clients.find(c => c.id === selectedClient);
    return client && p.clientName === client.nome;
  });

  const generatePDF_Export = async (itemsList: any[], clientName: string, budgetNum: string, total: number, obs: string) => {
    const doc = new jsPDF();
    
    // Header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(212, 175, 55); 
    doc.text("D’LUXURY", 45, 22);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text("MÓVEIS SOB MEDIDA | ALTO PADRÃO", 45, 28);
    
    doc.setDrawColor(212, 175, 55);
    doc.line(14, 40, 196, 40);

    // Items
    const tableData = itemsList.map(item => [
      item.name,
      item.quantity,
      item.woodType,
      `${item.width}x${item.height}x${item.depth}cm`,
      formatCurrency(((item.woodPrice) + (item.laborHours * item.laborRate)) * (1 + marginPercent/100) * item.quantity)
    ]);

    autoTable(doc, {
      startY: 70,
      head: [['MÓVEL / AMBIENTE', 'QTD', 'MATERIAL', 'DIMENSÕES', 'VALOR (R$)']],
      body: tableData,
      styles: { fontSize: 8, cellPadding: 3 },
    });

    const finalY = (doc as any).lastAutoTable?.finalY || 80;
    
    doc.setFontSize(14);
    doc.setTextColor(212, 175, 55);
    doc.text(`TOTAL: ${formatCurrency(total)}`, 196, finalY + 15, { align: 'right' });

    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);
    doc.text(`Prazo: ${prazoEntrega}`, 14, finalY + 22);
    doc.text(`Pagamento: ${formaPagamento} (${numParcelas}x c/ ${taxaFinanceira}% taxa)`, 14, finalY + 27);

    doc.save(`Orcamento_DLuxury_${clientName?.replace(/\s+/g, '_') || 'Avulso'}.pdf`);
  };

  const handleGeneratePDF = async () => {
    const client = clients.find(c => c.id === selectedClient);
    generatePDF_Export(items, client?.nome || 'CLIENTE', editingId ? 'REVISÃO' : 'RASCUNHO', totalFinalComTaxa, `Prazo: ${prazoEntrega}. Pagamento: ${formaPagamento}`);
  };

  const inputStyle: React.CSSProperties = { background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', padding: '0.75rem', color: 'white', fontSize: '0.95rem', width: '100%', outline: 'none' };
  const selectStyle: React.CSSProperties = { ...inputStyle, cursor: 'pointer' };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '800', background: 'linear-gradient(to right, #fff, #d4af37)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            {editingId ? '📝 Editando Proposta' : '💎 Simulador Comercial D’Luxury'}
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            {editingId ? 'Alterando valores e itens de proposta existente.' : 'Gere orçamentos precisos com base em custos e margens industriais.'}
          </p>
        </div>
        <div>
          <button onClick={handleGeneratePDF} disabled={items.length === 0} style={{ background: items.length > 0 ? 'var(--primary)' : 'rgba(255,255,255,0.1)', color: '#1a1a2e', fontWeight: 'bold', padding: '0.6rem 1.2rem', borderRadius: '8px', border: 'none', cursor: items.length > 0 ? 'pointer' : 'not-allowed', marginRight: '0.5rem' }}>
            🖨️ Exportar Orçamento PDF
          </button>
        </div>
      </header>

      {editingId && (
        <div style={{ display: 'flex', gap: '1rem', background: 'rgba(212,175,55,0.05)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(212,175,55,0.2)', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Status Atual:</div>
            <span style={{ 
              background: orcamentosList.find(o => o.id === editingId)?.status === 'aprovado' ? 'var(--success)' : 
                         orcamentosList.find(o => o.id === editingId)?.status === 'enviado' ? 'var(--primary)' : 'rgba(255,255,255,0.1)',
              color: orcamentosList.find(o => o.id === editingId)?.status === 'aprovado' ? 'white' : 
                     orcamentosList.find(o => o.id === editingId)?.status === 'enviado' ? '#1a1a2e' : 'var(--text-muted)',
              padding: '0.25rem 0.75rem',
              borderRadius: '20px',
              fontSize: '0.75rem',
              fontWeight: 'bold',
              textTransform: 'uppercase'
            }}>
              {orcamentosList.find(o => o.id === editingId)?.status || 'Rascunho'}
            </span>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button 
              onClick={() => updateStatus(editingId, 'enviado')}
              disabled={saving || orcamentosList.find(o => o.id === editingId)?.status === 'enviado'}
              style={{ background: 'var(--primary)', color: '#1a1a2e', border: 'none', padding: '0.5rem 1rem', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 'bold', cursor: 'pointer', opacity: (saving || orcamentosList.find(o => o.id === editingId)?.status === 'enviado') ? 0.6 : 1 }}>
              <Send size={14} style={{ marginRight: '0.4rem' }} /> Marcar como Enviado
            </button>
            <button 
              onClick={() => updateStatus(editingId, 'aprovado')}
              disabled={saving || !isAdmin || orcamentosList.find(o => o.id === editingId)?.status === 'aprovado'}
              style={{ background: 'var(--success)', color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 'bold', cursor: 'pointer', opacity: (saving || !isAdmin || orcamentosList.find(o => o.id === editingId)?.status === 'aprovado') ? 0.6 : 1 }}>
              <Check size={14} style={{ marginRight: '0.4rem' }} /> Aprovar Orçamento (Admin)
            </button>
          </div>
        </div>
      )}

      {/* Dados do orçamento */}
      <div className="card">
        <h3 style={{ marginBottom: '1rem', fontSize: '1rem' }}>Dados do Orçamento</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.5rem' }}>Cliente</label>
            <select style={selectStyle} value={selectedClient} onChange={e => setSelectedClient(e.target.value)}>
              <option value="">Selecione...</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.5rem' }}>Projeto/Ambiente (TAG)</label>
            <select style={selectStyle} value={selectedProject} onChange={e => setSelectedProject(e.target.value)}>
              <option value="">Nenhum projeto vinculado</option>
              {clientProjects.map(p => (
                <option key={p.id} value={p.id}>
                  {p.tag ? `[${p.tag}] ` : ''}{p.ambiente}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.5rem' }}>Margem de Lucro (%)</label>
            <input type="number" style={inputStyle} value={marginPercent} onChange={e => setMarginPercent(Number(e.target.value))} />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1.5rem', borderTop: '1px solid var(--border)', paddingTop: '1.5rem' }}>
          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.5rem' }}>Prazo de Entrega</label>
            <input style={inputStyle} value={prazoEntrega} onChange={e => setPrazoEntrega(e.target.value.toUpperCase())} />
          </div>
          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.5rem' }}>Descritivo de Pagamento</label>
            <input style={inputStyle} value={formaPagamento} onChange={e => setFormaPagamento(e.target.value.toUpperCase())} />
          </div>
        </div>

        {/* Seção de Parcelamento Manual e Custo Financeiro */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1.5rem', padding: '1rem', background: 'rgba(212,175,55,0.05)', borderRadius: '12px', border: '1px solid rgba(212,175,55,0.1)' }}>
          <div>
            <label style={{ fontSize: '0.8rem', color: '#d4af37', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.5rem' }}>
              <Plus size={14} /> Quantidade de Parcelas
            </label>
            <input type="number" min={1} max={60} style={{...inputStyle, borderColor: 'rgba(212,175,55,0.3)'}} value={numParcelas} onChange={e => setNumParcelas(Number(e.target.value))} />
          </div>
          <div>
            <label style={{ fontSize: '0.8rem', color: '#d4af37', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.5rem' }}>
              <AlertCircle size={14} /> Taxa Financeira (%)
            </label>
            <div style={{ position: 'relative' }}>
              <input type="number" step={0.01} style={{...inputStyle, borderColor: 'rgba(212,175,55,0.3)', paddingRight: '2rem'}} value={taxaFinanceira} onChange={e => setTaxaFinanceira(Number(e.target.value))} />
              <span style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>%</span>
            </div>
          </div>
        </div>

        <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem' }}>
          <button onClick={saveBudget} disabled={saving || items.length === 0}
            style={{ flex: 1, background: 'var(--success)', color: 'white', border: 'none', padding: '0.75rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', opacity: (saving || items.length === 0) ? 0.6 : 1 }}>
            {saving ? 'Gravando...' : (editingId ? 'Atualizar Orçamento' : 'Salvar Orçamento')}
          </button>
          <button onClick={() => setShowItemForm(true)}
            style={{ flex: 1, background: 'linear-gradient(135deg, #d4af37, #b49050)', color: '#1a1a2e', border: 'none', padding: '0.75rem', borderRadius: '8px', cursor: 'pointer', fontWeight: '800' }}>
            ➕ Adicionar Móvel
          </button>
        </div>
      </div>

      {/* Itens e Resumo */}
      {items.length > 0 && (
        <div className="card">
          <table style={{ width: '100%', borderCollapse: 'collapse', color: 'white' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                <th style={{ textAlign: 'left', padding: '0.75rem', color: 'var(--text-muted)', fontSize: '0.75rem' }}>Item</th>
                <th style={{ textAlign: 'center', padding: '0.75rem', color: 'var(--text-muted)', fontSize: '0.75rem' }}>Qtd</th>
                <th style={{ textAlign: 'right', padding: '0.75rem', color: 'var(--text-muted)', fontSize: '0.75rem' }}>Subtotal</th>
                <th style={{ width: '40px' }}></th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '0.75rem' }}>
                    <div style={{ fontWeight: 'bold', color: '#d4af37' }}>{item.sku || item.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{item.name}</div>
                  </td>
                  <td style={{ padding: '0.75rem', textAlign: 'center' }}>{item.quantity}</td>
                  <td style={{ padding: '0.75rem', textAlign: 'right' }}>{formatCurrency((item.precoEngenharia || 0) * (1 + marginPercent/100) * item.quantity)}</td>
                  <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                    <button onClick={() => removeItem(item.id)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
            <div style={{ minWidth: '280px', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Custo Base</span>
                <span>{formatCurrency(subtotalCusto)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Venda (c/ Margem)</span>
                <span>{formatCurrency(totalBase)}</span>
              </div>
              {taxaFinanceira > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#d4af37', fontWeight: 'bold' }}>
                  <span>Encargos ({taxaFinanceira}%)</span>
                  <span>+ {formatCurrency(valorTaxaFinanceira)}</span>
                </div>
              )}
              <div style={{ borderTop: '2px solid #d4af37', paddingTop: '0.75rem', marginTop: '0.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: '800' }}>TOTAL FINAL</span>
                <span style={{ fontSize: '1.5rem', fontWeight: '800', color: '#d4af37' }}>{formatCurrency(totalFinalComTaxa)}</span>
              </div>
              {numParcelas > 1 && (
                <div style={{ textAlign: 'right', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                   {numParcelas}x de {formatCurrency(totalFinalComTaxa / numParcelas)}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Histórico */}
      <div className="card">
        <h3 style={{ marginBottom: '1rem', fontSize: '1rem' }}>📜 Histórico de Propostas</h3>
        {orcamentosList.map(orc => (
          <div key={orc.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <div>
              <div style={{ fontWeight: 'bold', color: '#d4af37', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {orc.numero} - {orc.cliente_nome}
                {orc.projeto_id && (
                  <span style={{ fontSize: '0.7rem', background: 'rgba(212,175,55,0.2)', color: '#d4af37', padding: '2px 6px', borderRadius: '4px', fontWeight: '900' }}>
                    🏷️ {projects.find(p => p.id === orc.projeto_id)?.tag || 'SEM TAG'}
                  </span>
                )}
                <span style={{ 
                  fontSize: '0.65rem', 
                  padding: '2px 8px', 
                  borderRadius: '10px', 
                  background: orc.status === 'aprovado' ? 'var(--success)' : orc.status === 'enviado' ? 'var(--primary)' : 'rgba(255,255,255,0.1)',
                  color: orc.status === 'aprovado' ? 'white' : orc.status === 'enviado' ? '#1a1a2e' : 'var(--text-muted)',
                  textTransform: 'uppercase',
                  fontWeight: '800'
                }}>
                  {orc.status}
                </span>
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {orc.observacoes || 'Sem observações'}
                {orc.projeto_id && ` | Projeto: ${projects.find(p => p.id === orc.projeto_id)?.ambiente || 'Não encontrado'}`}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <div style={{ fontWeight: 'bold', marginRight: '1rem' }}>{formatCurrency(orc.valor_final)}</div>
              <button onClick={() => loadForEdit(orc.id)} className="btn btn-outline" style={{ padding: '0.4rem' }}><Edit2 size={14} /></button>
              <button 
                onClick={async () => {
                   if(confirm('Excluir?')) {
                     await api.orcamentos.delete(orc.id);
                     loadHistory();
                   }
                }} 
                className="btn btn-outline" style={{ padding: '0.4rem', color: '#ef4444' }}><Trash2 size={14} /></button>
            </div>
          </div>
        ))}
      </div>

      {/* Item Form Modal */}
      {showItemForm && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setShowItemForm(false)}>
          <div style={{ background: 'var(--surface)', padding: '2rem', borderRadius: '12px', width: '400px', border: '1px solid var(--border)' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ color: 'white', marginBottom: '1rem' }}>Adicionar Móvel</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.5rem' }}>SKU (Engenharia)</label>
                <div style={{ position: 'relative' }}>
                  <input 
                    style={{...inputStyle, paddingLeft: '2.5rem'}} 
                    placeholder="Buscar por código SKU..." 
                    value={skuSearch} 
                    onChange={e => searchSKU(e.target.value)} 
                  />
                  <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                </div>
                {skuResults.length > 0 && (
                  <div style={{ position: 'absolute', background: '#1a1a2e', border: '1px solid #d4af37', borderRadius: '8px', maxHeight: '200px', overflow: 'auto', width: 'calc(100% - 4rem)', zIndex: 1001, marginTop: '4px' }}>
                    {skuResults.slice(0, 10).map((mat: any) => (
                      <div key={mat.id} onClick={() => selectSKU(mat)} style={{ padding: '0.75rem', cursor: 'pointer', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: '#d4af37', fontWeight: 'bold' }}>{mat.codigo_modelo}</span>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{mat.nome}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.5rem' }}>Quantidade</label>
                  <input type="number" min={1} style={inputStyle} value={newItem.quantity} onChange={e => setNewItem({...newItem, quantity: Number(e.target.value)})} />
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                  {newItem.sku && (
                    <div style={{ padding: '0.75rem', background: 'rgba(212,175,55,0.1)', borderRadius: '8px', flex: 1 }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Valor Unit.</div>
                      <div style={{ color: '#d4af37', fontWeight: 'bold', fontSize: '1.1rem' }}>{formatCurrency(newItem.precoEngenharia * (1 + marginPercent/100))}</div>
                    </div>
                  )}
                </div>
              </div>
              {newItem.sku && (
                <div style={{ padding: '1rem', background: 'rgba(212,175,55,0.05)', borderRadius: '8px', border: '1px solid rgba(212,175,55,0.2)' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Detalhes do SKU</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', fontSize: '0.85rem' }}>
                    <div><span style={{ color: 'var(--text-muted)' }}>Nome:</span> {newItem.name}</div>
                    <div><span style={{ color: 'var(--text-muted)' }}>Dims:</span> {newItem.width}x{newItem.height}x{newItem.depth}cm</div>
                    <div><span style={{ color: 'var(--text-muted)' }}>Material:</span> {newItem.woodType}</div>
                  </div>
                </div>
              )}
              <button onClick={addItem} disabled={!newItem.sku || newItem.quantity < 1} className="btn btn-primary" style={{ background: 'var(--primary)', color: '#1a1a2e', fontWeight: 'bold', opacity: (!newItem.sku || newItem.quantity < 1) ? 0.6 : 1 }}>ADICIONAR</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Estimates;
