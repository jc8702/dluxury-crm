import React, { useState } from 'react';
import { useAppContext } from '../../context/AppContext';
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
  const [items, setItems] = useState<EstimateItem[]>([]);
  const [showItemForm, setShowItemForm] = useState(false);
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

  const generatePDF = () => {
    const doc = new jsPDF();
    const client = clients.find(c => c.id === selectedClient);
    const project = projects.find(p => p.id === selectedProject);

    // Header
    doc.setFontSize(22);
    doc.setTextColor(212, 175, 55); // D'Luxury Gold
    doc.text("D'LUXURY AMBIENTES", 14, 20);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text("MÓVEIS SOB MEDIDA", 14, 26);
    
    doc.setFontSize(14);
    doc.setTextColor(40);
    doc.text("Orçamento de Projeto", 14, 40);

    // Client Info Section
    doc.setFontSize(10);
    doc.setTextColor(50, 50, 50);
    doc.text("DADOS DO CLIENTE", 14, 48);
    doc.setDrawColor(212, 175, 55);
    doc.line(14, 49, 50, 49); // Underline for section

    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);
    doc.text(`Cliente: ${client?.nome || 'AVULSO'}`, 14, 55);
    doc.text(`Telefone: ${client?.telefone || '-'}`, 14, 60);
    doc.text(`Cidade/UF: ${client?.cidade || '-'}/${client?.uf || '-'}`, 14, 65);
    
    doc.text(`Ambiente: ${project?.ambiente || 'NÃO DEFINIDO'}`, 120, 55);
    doc.text(`Data: ${new Date().toLocaleDateString('pt-BR')}`, 120, 60);
    doc.text(`Referência: #EST-${Date.now().toString().slice(-6)}`, 120, 65);

    // Items table
    const tableData = items.map(item => [
      item.name.toUpperCase(),
      item.quantity.toString(),
      item.woodType.toUpperCase(),
      `${item.width}x${item.height}x${item.depth}cm`,
      formatCurrency((item.woodPrice * item.quantity) + (item.laborHours * item.laborRate * item.quantity) + (((item.woodPrice * item.quantity) + (item.laborHours * item.laborRate * item.quantity)) * (marginPercent / 100)))
    ]);

    autoTable(doc, {
      startY: 75,
      head: [['MÓVEL', 'QTD', 'MATERIAL', 'DIMENSÕES', 'VALOR UNIT.*']],
      body: tableData,
      theme: 'striped',
      headStyles: { 
        fillColor: [212, 175, 55], 
        textColor: [26, 26, 46], 
        fontStyle: 'bold',
        fontSize: 10,
        halign: 'center'
      },
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
    const totalStr = formatCurrency(totalFinal);
    const textWidth = doc.getTextWidth(totalStr);
    doc.text(totalStr, 196 - textWidth, finalY + 15);

    // Terms
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(150);
    doc.text("* Valor estimado considerando margem de projeto. Sujeito a alteração após medição técnica.", 14, finalY + 25);

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(180);
    doc.text("D'Luxury Ambientes - Qualidade e Sofisticação em Móveis Planejados", 105, 285, { align: 'center' });
    doc.text("Este documento é apenas uma estimativa comercial.", 105, 290, { align: 'center' });

    doc.save(`Orcamento_DLuxury_${client?.nome?.replace(/\s+/g, '_') || 'Avulso'}.pdf`);
  };

  const inputStyle: React.CSSProperties = { background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', padding: '0.75rem', color: 'white', fontSize: '0.95rem', width: '100%', outline: 'none' };
  const selectStyle: React.CSSProperties = { ...inputStyle, cursor: 'pointer' };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.875rem', fontWeight: 'bold' }}>Orçamentos</h2>
          <p style={{ color: 'var(--text-muted)' }}>Monte propostas detalhadas para móveis planejados.</p>
        </div>
        <div>
          <button onClick={generatePDF} disabled={items.length === 0} style={{ background: items.length > 0 ? 'var(--primary)' : 'rgba(255,255,255,0.1)', color: '#1a1a2e', fontWeight: 'bold', padding: '0.6rem 1.2rem', borderRadius: '8px', border: 'none', cursor: items.length > 0 ? 'pointer' : 'not-allowed' }}>
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
        <div style={{ marginTop: '1rem' }}>
          <button onClick={() => setShowItemForm(true)}
            style={{
              background: 'linear-gradient(135deg, #d4af37, #b49050)', color: '#1a1a2e',
              border: 'none', padding: '0.75rem 1.5rem', borderRadius: '8px', cursor: 'pointer', fontWeight: '700'
            }}>
            + Adicionar Móvel
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
          <div style={{ background: 'var(--surface)', padding: '2rem', borderRadius: '12px', width: '500px', border: '1px solid var(--border)' }}>
            <h3 style={{ color: 'white', marginBottom: '1.5rem' }}>Adicionar Móvel</h3>
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
    </div>
  );
};

export default Estimates;