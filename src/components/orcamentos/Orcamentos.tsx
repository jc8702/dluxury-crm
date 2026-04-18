import React, { useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { api } from '../../lib/api';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface EstimateItem {
  id: string;
  name: string;
  quantity: number;
  woodType: string;
  width: number;
  height: number;
  depth: number;
  laborHours: number;
  laborRate: number;
  woodPrice: number;
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

  const searchSKU = async (q: string) => {
    setSkuSearch(q);
    if (q.length < 2) {
      setSkuResults([]);
      return;
    }
    try {
      const data = await api.estoque.list({ q });
      setSkuResults(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Error searching SKU", e);
    }
  };

  const selectSKU = (mat: any) => {
    setNewItem({
      ...newItem,
      name: mat.nome,
      woodType: mat.categoria_nome || 'Geral',
      woodPrice: Number(mat.preco_custo) || 0,
      laborHours: 2, // Default sugestivo
      laborRate: 150 // Default sugestivo
    });
    setSkuResults([]);
    setSkuSearch(mat.sku);
  };

  const loadForEdit = async (orcId: string) => {
    try {
      setLoading(true);
      const orc = await api.orcamentos.get(orcId);
      setEditingId(orcId);
      setSelectedClient(orc.cliente_id);
      setSelectedProject(orc.projeto_id || '');
      setPrazoEntrega(orc.prazo_entrega_dias ? `${orc.prazo_entrega_dias} DIAS ÚTEIS` : '');
      setFormaPagamento(orc.observacoes?.split('Pagamento: ')[1] || orc.observacoes || '');
      
      const mappedItems: EstimateItem[] = orc.itens.map((it: any) => ({
        id: it.id,
        name: it.descricao,
        quantity: it.quantidade,
        width: Number(it.largura_cm),
        height: Number(it.altura_cm),
        depth: Number(it.profundidade_cm),
        woodType: it.material,
        woodPrice: (Number(it.valor_unitario) / 2), // Estimativa reversa para o simulador
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

  const loadHistory = async () => {
    try {
      setLoading(true);
      const data = await api.orcamentos.list();
      setOrcamentosList(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Error loading history", e);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    loadHistory();
  }, []);

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
        status: 'rascunho',
        valor_base: subtotalCusto,
        taxa_mensal: 0,
        condicao_pagamento_id: null,
        valor_final: totalFinal,
        prazo_entrega_dias: parseInt(prazoEntrega) || 45,
        prazo_tipo: 'uteis',
        adicional_urgencia_pct: 0,
        observacoes: `Prazo: ${prazoEntrega}. Pagamento: ${formaPagamento}`,
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

  // Persistence Logic
  React.useEffect(() => {
    if (selectedProject) {
      const saved = localStorage.getItem(`draft_estimate_${selectedProject}`);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed && Array.isArray(parsed.items)) {
            setItems(parsed.items);
            setMarginPercent(parsed.margin || 30);
            setPrazoEntrega(parsed.prazo || '45 DIAS ÚTEIS');
            setFormaPagamento(parsed.pagamento || '50% DE ENTRADA + 50% NA ENTREGA');
          } else {
            setItems([]);
          }
        } catch (e) { console.error("Error loading draft", e); }
      } else {
        setItems([]);
      }
    }
  }, [selectedProject]);

  React.useEffect(() => {
    if (selectedProject && items.length > 0) {
      localStorage.setItem(`draft_estimate_${selectedProject}`, JSON.stringify({ 
        items, 
        margin: marginPercent,
        prazo: prazoEntrega,
        pagamento: formaPagamento
      }));
    } else if (selectedProject && items.length === 0) {
      localStorage.removeItem(`draft_estimate_${selectedProject}`);
    }
  }, [items, marginPercent, selectedProject, prazoEntrega, formaPagamento]);

  const clearDraft = () => {
    if (confirm("Deseja realmente limpar os itens deste orçamento?")) {
      setItems([]);
      if (selectedProject) localStorage.removeItem(`draft_estimate_${selectedProject}`);
    }
  };
  const [newItem, setNewItem] = useState({
    name: '', quantity: 1, woodType: 'MDF 15mm',
    width: 100, height: 100, depth: 40,
    laborHours: 4, laborRate: 50, woodPrice: 150
  });

  const woodTypes = ['MDF 15mm', 'MDF 18mm', 'MDF 25mm', 'MDP 15mm', 'MDP 18mm', 'Compensado 15mm', 'Compensado 18mm', 'Madeira Maciça', 'Natulac', 'Freijó', 'Imbuia', 'Fórmica', 'Laminado'];

  const addItem = () => {
    const volumeM3 = (newItem.width * newItem.height * newItem.depth) / 1000000;
    const item: EstimateItem = { ...newItem, id: Date.now().toString(), woodPrice: newItem.woodPrice * volumeM3 };
    setItems([...items, item]); setShowItemForm(false);
    setNewItem({ name: '', quantity: 1, woodType: 'MDF 15mm', width: 100, height: 100, depth: 40, laborHours: 4, laborRate: 50, woodPrice: 150 });
  };

  const removeItem = (id: string) => setItems(items.filter(i => i.id !== id));

  const subtotalMaterial = items.reduce((acc, item) => acc + item.woodPrice * item.quantity, 0);
  const subtotalMO = items.reduce((acc, item) => acc + item.laborHours * item.laborRate * item.quantity, 0);
  const subtotalCusto = subtotalMaterial + subtotalMO;
  const valorMargem = subtotalCusto * (marginPercent / 100);
  const totalFinal = subtotalCusto + valorMargem;

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const clientProjects = projects.filter(p => {
    const client = clients.find(c => c.id === selectedClient);
    return client && p.clientName === client.nome;
  });

  const generatePDF_Export = async (itemsList: any[], clientName: string, budgetNum: string, total: number, obs: string) => {
    const doc = new jsPDF();
    
    // Add Logo
    try {
      const img = new Image();
      img.src = '/logo.png';
      await new Promise((resolve) => {
        img.onload = resolve;
        img.onerror = resolve; 
      });
      if (img.complete && img.naturalWidth > 0) {
        doc.addImage(img, 'PNG', 14, 10, 25, 25);
      }
    } catch (e) { console.error("Logo error", e); }

    // Header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(212, 175, 55); 
    doc.text("D’LUXURY", 45, 22);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text("MÓVEIS SOB MEDIDA | ALTO PADRÃO", 45, 28);
    doc.setFont("helvetica", "normal");
    doc.text("www.dluxury.com.br", 45, 33);

    doc.setFontSize(10);
    doc.setTextColor(0);
    doc.text(`PROPOSTA: ${budgetNum || 'RASCUNHO'}`, 140, 22);
    doc.text(`DATA: ${new Date().toLocaleDateString('pt-BR')}`, 140, 28);

    doc.setDrawColor(212, 175, 55);
    doc.line(14, 40, 196, 40);

    // Client Info
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("INFORMAÇÕES DO CLIENTE", 14, 50);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Cliente: ${clientName || 'Consumidor Final'}`, 14, 57);
    doc.text(`Ambiente: ${obs.split('.')[0] || 'Geral'}`, 14, 62);

    // Items Table
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
      columnStyles: {
        0: { cellWidth: 'auto' },
        1: { halign: 'center' },
        2: { halign: 'center' },
        3: { halign: 'center' },
        4: { halign: 'right' }
      },
      styles: { fontSize: 8, cellPadding: 3 },
    });

    const finalY = (doc as any).lastAutoTable?.finalY || 80;

    // Totals Section
    doc.setDrawColor(200, 200, 200);
    doc.line(120, finalY + 5, 196, finalY + 5);
    
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text("TOTAL DO ORÇAMENTO:", 120, finalY + 15);
    
    doc.setFontSize(16);
    doc.setTextColor(212, 175, 55);
    doc.setFont("helvetica", "bold");
    const totalStr = formatCurrency(total);
    const textWidth = doc.getTextWidth(totalStr);
    doc.text(totalStr, 196 - textWidth, finalY + 15);

    // Dynamic Terms Section
    doc.setFontSize(10);
    doc.setTextColor(50, 50, 50);
    doc.text("CONDIÇÕES COMERCIAIS", 14, finalY + 15);
    doc.setDrawColor(212, 175, 55);
    doc.line(14, finalY + 16, 50, finalY + 16);

    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);
    doc.setFont("helvetica", "normal");
    doc.text(`Prazo de Entrega: ${prazoEntrega}`, 14, finalY + 22);
    doc.text(`Forma de Pagamento: ${formaPagamento}`, 14, finalY + 27);

    // Terms
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(150);
    doc.text("* Valor estimado considerando margem de projeto. Sujeito a alteração após medição técnica.", 14, finalY + 35);

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(180);
    doc.text("D'Luxury Ambientes - Qualidade e Sofisticação em Móveis Planejados", 105, 285, { align: 'center' });
    doc.text("Este documento é apenas uma estimativa comercial.", 105, 290, { align: 'center' });

    doc.save(`Orcamento_DLuxury_${clientName?.replace(/\s+/g, '_') || 'Avulso'}.pdf`);
  };

  const handleGeneratePDF = async () => {
    const client = clients.find(c => c.id === selectedClient);
    generatePDF_Export(items, client?.nome || 'CLIENTE', editingId ? 'REVISÃO' : 'RASCUNHO', totalFinal, `Prazo: ${prazoEntrega}. Pagamento: ${formaPagamento}`);
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
          <button onClick={handleGeneratePDF} disabled={items.length === 0} style={{ background: items.length > 0 ? 'var(--primary)' : 'rgba(255,255,255,0.1)', color: '#1a1a2e', fontWeight: 'bold', padding: '0.6rem 1.2rem', borderRadius: '8px', border: 'none', cursor: items.length > 0 ? 'pointer' : 'not-allowed' }}>
            🖨️ Exportar Orçamento PDF
          </button>
        </div>
      </header>

      {/* Dados do orçamento */}
      <div className="card">
        <h3 style={{ marginBottom: '1rem', fontSize: '1rem' }}>Dados do Orçamento</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.5rem' }}>Cliente</label>
            <select style={selectStyle} value={selectedClient} onChange={e => { setSelectedClient(e.target.value); setSelectedProject(''); }}>
              <option value="" style={{ background: '#1a1a1a' }}>Selecione...</option>
              {clients.map(c => (
                <option key={c.id} value={c.id} style={{ background: '#1a1a1a' }}>{c.nome}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.5rem' }}>Projeto/Ambiente</label>
            <select style={selectStyle} value={selectedProject} onChange={e => setSelectedProject(e.target.value)}>
              <option value="" style={{ background: '#1a1a1a' }}>Nenhum projeto vinculado</option>
              {clientProjects.map(p => (
                <option key={p.id} value={p.id} style={{ background: '#1a1a1a' }}>{p.ambiente}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.5rem' }}>Margem de Lucro</label>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              {[15, 20, 25, 30, 40, 50].map(m => (
                <button key={m} onClick={() => setMarginPercent(m)}
                  style={{
                    padding: '0.5rem 0.75rem', borderRadius: '8px', fontSize: '0.8rem', fontWeight: '700',
                    cursor: 'pointer', transition: 'all 0.2s',
                    border: marginPercent === m ? '1px solid #d4af37' : '1px solid var(--border)',
                    background: marginPercent === m ? 'rgba(212,175,55,0.15)' : 'transparent',
                    color: marginPercent === m ? '#d4af37' : 'var(--text-muted)',
                  }}>
                  {m}%
                </button>
              ))}
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem', marginTop: '1.5rem', borderTop: '1px solid var(--border)', paddingTop: '1.5rem' }}>
          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.5rem' }}>Prazo de Entrega</label>
            <input style={inputStyle} placeholder="Ex: 45 dias úteis" value={prazoEntrega} onChange={e => setPrazoEntrega(e.target.value.toUpperCase())} />
          </div>
          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.5rem' }}>Condições de Pagamento</label>
            <input style={inputStyle} placeholder="Ex: 50% ENTRADA + 50% ENTREGA" value={formaPagamento} onChange={e => setFormaPagamento(e.target.value.toUpperCase())} />
          </div>
        </div>

        <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem' }}>
            <button onClick={saveBudget} disabled={saving || items.length === 0}
            style={{
              background: editingId ? 'linear-gradient(135deg, #3b82f6, #2563eb)' : 'linear-gradient(135deg, #10b981, #059669)', color: 'white',
              border: 'none', padding: '0.75rem 1.5rem', borderRadius: '8px', cursor: (saving || items.length === 0) ? 'not-allowed' : 'pointer', fontWeight: '700', opacity: (saving || items.length === 0) ? 0.6 : 1
            }}>
            {saving ? '⌛ Processando...' : (editingId ? '✅ Atualizar Proposta' : '💾 Gravar Proposta no Banco')}
          </button>
          {editingId && (
            <button onClick={() => { setEditingId(null); clearDraft(); }}
              style={{
                background: '#333', color: 'white', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '8px', cursor: 'pointer'
              }}>
              Cancelar Edição
            </button>
          )}
          {items.length > 0 && (
            <button onClick={clearDraft}
              style={{
                background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444',
                border: '1px solid rgba(239, 68, 68, 0.2)', padding: '0.75rem 1.5rem', borderRadius: '8px', cursor: 'pointer', fontWeight: '700'
              }}>
              🗑️ Limpar Rascunho
            </button>
          )}
          <button onClick={() => setShowItemForm(true)}
            style={{
              marginLeft: 'auto', background: 'linear-gradient(135deg, #d4af37, #b49050)', color: '#1a1a2e',
              border: 'none', padding: '0.75rem 1.5rem', borderRadius: '8px', cursor: 'pointer', fontWeight: '800',
              display: 'flex', alignItems: 'center', gap: '0.5rem'
            }}>
            ➕ Adicionar Móvel / Item
          </button>
        </div>
      </div>

      {/* Tabela de itens */}
      {items.length > 0 && (
        <div className="card">
          <h3 style={{ marginBottom: '1rem', fontSize: '1rem' }}>Itens do Orçamento</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', color: 'white' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                <th style={{ textAlign: 'left', padding: '0.75rem', color: 'var(--text-muted)', fontSize: '0.75rem' }}>Móvel</th>
                <th style={{ textAlign: 'center', padding: '0.75rem', color: 'var(--text-muted)', fontSize: '0.75rem' }}>Qtd</th>
                <th style={{ textAlign: 'center', padding: '0.75rem', color: 'var(--text-muted)', fontSize: '0.75rem' }}>Material</th>
                <th style={{ textAlign: 'center', padding: '0.75rem', color: 'var(--text-muted)', fontSize: '0.75rem' }}>Dimensões</th>
                <th style={{ textAlign: 'right', padding: '0.75rem', color: 'var(--text-muted)', fontSize: '0.75rem' }}>Material R$</th>
                <th style={{ textAlign: 'right', padding: '0.75rem', color: 'var(--text-muted)', fontSize: '0.75rem' }}>MO R$</th>
                <th style={{ textAlign: 'right', padding: '0.75rem', color: 'var(--text-muted)', fontSize: '0.75rem' }}>Subtotal</th>
                <th style={{ width: '50px' }}></th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => {
                const materialCost = item.woodPrice * item.quantity;
                const laborCost = item.laborHours * item.laborRate * item.quantity;
                return (
                  <tr key={item.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '0.75rem', fontWeight: '600' }}>{item.name}</td>
                    <td style={{ padding: '0.75rem', textAlign: 'center' }}>{item.quantity}</td>
                    <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                      <span style={{ fontSize: '0.75rem', background: 'rgba(212,175,55,0.1)', padding: '0.2rem 0.5rem', borderRadius: '8px', color: '#d4af37' }}>{item.woodType}</span>
                    </td>
                    <td style={{ padding: '0.75rem', textAlign: 'center', fontSize: '0.85rem' }}>{item.width}×{item.height}×{item.depth}cm</td>
                    <td style={{ padding: '0.75rem', textAlign: 'right' }}>{formatCurrency(materialCost)}</td>
                    <td style={{ padding: '0.75rem', textAlign: 'right' }}>{formatCurrency(laborCost)}</td>
                    <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 'bold' }}>{formatCurrency(materialCost + laborCost)}</td>
                    <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                      <button onClick={() => removeItem(item.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '1rem' }}>✕</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Resumo financeiro */}
          <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
            <div style={{ minWidth: '300px', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Materiais</span>
                <span>{formatCurrency(subtotalMaterial)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Mão de Obra</span>
                <span>{formatCurrency(subtotalMO)}</span>
              </div>
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: '0.5rem', display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Custo Total</span>
                <span>{formatCurrency(subtotalCusto)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#d4af37' }}>
                <span>Margem ({marginPercent}%)</span>
                <span>+ {formatCurrency(valorMargem)}</span>
              </div>
              <div style={{
                borderTop: '2px solid #d4af37', paddingTop: '0.75rem', marginTop: '0.25rem',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
              }}>
                <span style={{ fontWeight: '800', fontSize: '1rem' }}>TOTAL FINAL</span>
                <span style={{ fontSize: '1.5rem', fontWeight: '800', color: '#d4af37' }}>{formatCurrency(totalFinal)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal adicionar móvel */}
      {showItemForm && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'var(--surface)', padding: '2rem', borderRadius: '12px', width: '500px', border: '1px solid var(--border)', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ color: 'white', marginBottom: '1.5rem' }}>Adicionar Móvel</h3>
            
            {/* SKU Search */}
            <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'rgba(212,175,55,0.05)', borderRadius: '8px', border: '1px solid rgba(212,175,55,0.1)' }}>
              <label style={{ fontSize: '0.8rem', color: '#d4af37', display: 'block', marginBottom: '0.5rem' }}>🔍 Buscar na Engenharia (SKU ou Nome)</label>
              <input style={{...inputStyle, borderColor: 'rgba(212,175,55,0.3)'}} placeholder="Puxe dados direto da engenharia..." value={skuSearch} onChange={e => searchSKU(e.target.value)} />
              {skuResults.length > 0 && (
                <div style={{ background: '#1a1a1a', borderRadius: '8px', marginTop: '0.5rem', border: '1px solid var(--border)' }}>
                  {skuResults.map(res => (
                    <div key={res.id} onClick={() => selectSKU(res)} style={{ padding: '0.75rem', borderBottom: '1px solid #333', cursor: 'pointer', fontSize: '0.85rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <span style={{ color: '#d4af37', fontWeight: 'bold' }}>{res.sku}</span> - {res.nome}
                      </div>
                      <span style={{ fontSize: '0.65rem', background: res.categoria_nome === 'Módulo de Engenharia' ? 'rgba(59,130,246,0.1)' : 'rgba(16,185,129,0.1)', color: res.categoria_nome === 'Módulo de Engenharia' ? '#3b82f6' : '#10b981', padding: '0.2rem 0.5rem', borderRadius: '4px', fontWeight: 'bold' }}>
                        {res.categoria_nome?.toUpperCase()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.5rem' }}>Nome do Móvel</label>
                <input style={inputStyle} placeholder="Ex: Armário de Cozinha" value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.5rem' }}>Quantidade</label>
                  <input type="number" style={inputStyle} value={newItem.quantity} onChange={e => setNewItem({...newItem, quantity: parseInt(e.target.value) || 1})} />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.5rem' }}>Tipo de Material</label>
                  <select style={selectStyle} value={newItem.woodType} onChange={e => setNewItem({...newItem, woodType: e.target.value})}>
                    {woodTypes.map(t => <option key={t} value={t} style={{background: '#1a1a1a'}}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.5rem' }}>Largura (cm)</label>
                  <input type="number" style={inputStyle} value={newItem.width} onChange={e => setNewItem({...newItem, width: parseInt(e.target.value) || 0})} />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.5rem' }}>Altura (cm)</label>
                  <input type="number" style={inputStyle} value={newItem.height} onChange={e => setNewItem({...newItem, height: parseInt(e.target.value) || 0})} />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.5rem' }}>Profundidade (cm)</label>
                  <input type="number" style={inputStyle} value={newItem.depth} onChange={e => setNewItem({...newItem, depth: parseInt(e.target.value) || 0})} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.5rem' }}>Horas MO</label>
                  <input type="number" style={inputStyle} value={newItem.laborHours} onChange={e => setNewItem({...newItem, laborHours: parseInt(e.target.value) || 0})} />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.5rem' }}>Valor/Hora R$</label>
                  <input type="number" style={inputStyle} value={newItem.laborRate} onChange={e => setNewItem({...newItem, laborRate: parseInt(e.target.value) || 0})} />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.5rem' }}>Preço Material/m³</label>
                  <input type="number" style={inputStyle} value={newItem.woodPrice} onChange={e => setNewItem({...newItem, woodPrice: parseFloat(e.target.value) || 0})} />
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
              <button onClick={addItem}
                style={{ flex: 1, background: 'linear-gradient(135deg, #d4af37, #b49050)', color: '#1a1a2e', border: 'none', padding: '0.75rem', borderRadius: '8px', cursor: 'pointer', fontWeight: '700' }}>
                Adicionar
              </button>
              <button onClick={() => setShowItemForm(false)}
                style={{ flex: 1, background: '#333', color: 'white', border: 'none', padding: '0.75rem', borderRadius: '8px', cursor: 'pointer' }}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Histórico de Orçamentos */}
      <div className="card" style={{ marginTop: '1rem' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>📜 Histórico de Propostas</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Últimos orçamentos registrados no sistema.</p>
          </div>
          <button onClick={loadHistory} style={{ background: 'none', border: 'none', color: '#d4af37', cursor: 'pointer' }}>🔄 Atualizar</button>
        </header>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Carregando histórico...</div>
        ) : orcamentosList.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', border: '1px dashed var(--border)', borderRadius: '12px' }}>Nenhuma proposta gravada ainda.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', color: 'white', minWidth: '800px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                  <th style={{ textAlign: 'left', padding: '1rem', color: 'var(--text-muted)', fontSize: '0.75rem' }}>NÚMERO PROPOSTA</th>
                  <th style={{ textAlign: 'left', padding: '1rem', color: 'var(--text-muted)', fontSize: '0.75rem' }}>CLIENTE</th>
                  <th style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-muted)', fontSize: '0.75rem' }}>DATA</th>
                  <th style={{ textAlign: 'right', padding: '1rem', color: 'var(--text-muted)', fontSize: '0.75rem' }}>VALOR TOTAL</th>
                  <th style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-muted)', fontSize: '0.75rem' }}>STATUS</th>
                  <th style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-muted)', fontSize: '0.75rem' }}>AÇÕES</th>
                </tr>
              </thead>
              <tbody>
                {orcamentosList.map(orc => (
                  <tr key={orc.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', transition: 'background 0.2s' }}>
                    <td style={{ padding: '1rem', fontWeight: '700', color: '#d4af37' }}>{orc.numero}</td>
                    <td style={{ padding: '1rem' }}>{orc.cliente_nome || 'N/A'}</td>
                    <td style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                      {new Date(orc.criado_em).toLocaleDateString('pt-BR')}
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 'bold' }}>{formatCurrency(orc.valor_final || 0)}</td>
                    <td style={{ padding: '1rem', textAlign: 'center' }}>
                      <span style={{ 
                        fontSize: '0.7rem', 
                        padding: '0.2rem 0.6rem', 
                        borderRadius: '12px', 
                        background: orc.status === 'aprovado' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255,255,255,0.05)',
                        color: orc.status === 'aprovado' ? '#10b981' : 'var(--text-muted)',
                        textTransform: 'uppercase',
                        fontWeight: 'bold'
                      }}>{orc.status}</span>
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                        <button 
                          onClick={() => loadForEdit(orc.id)}
                          style={{ background: 'rgba(59,130,246,0.1)', color: '#3b82f6', border: '1px solid rgba(59,130,246,0.2)', padding: '0.4rem 0.8rem', borderRadius: '6px', fontSize: '0.75rem', cursor: 'pointer' }}
                        >
                          ✏️ Editar
                        </button>
                        <button 
                          onClick={async () => {
                            const detail = await api.orcamentos.get(orc.id);
                            // Simula o estado para o PDF generator
                            const docItems = detail.itens.map((it: any) => ({
                              id: it.id,
                              name: it.descricao,
                              quantity: it.quantidade,
                              width: it.largura_cm,
                              height: it.altura_cm,
                              depth: it.profundidade_cm,
                              woodType: it.material,
                              woodPrice: it.valor_unitario / 2,
                              laborHours: 0,
                              laborRate: 0
                            }));
                            // Chamada manual do PDF core
                            generatePDF_Export(docItems, orc.cliente_nome, orc.numero, orc.valor_final, orc.observacoes);
                          }}
                          style={{ background: 'rgba(212,175,55,0.1)', color: '#d4af37', border: '1px solid rgba(212,175,55,0.2)', padding: '0.4rem 0.8rem', borderRadius: '6px', fontSize: '0.75rem', cursor: 'pointer' }}
                        >
                          📄 PDF
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Estimates;
