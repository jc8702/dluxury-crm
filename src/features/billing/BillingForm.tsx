import React, { useState } from 'react';
import DataTable from '../../components/common/DataTable';
import Modal from '../../components/common/Modal';
import { useAppContext } from '../../context/AppContext';
import type { Billing } from '../../context/AppContext';

const BillingModule: React.FC = () => {
  const { billings, addBilling, updateBilling, removeBilling, projects } = useAppContext();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBilling, setEditingBilling] = useState<any>(null);
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'entrada' | 'saida'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const [formData, setFormData] = useState({
    descricao: '',
    tipo: 'entrada' as 'entrada' | 'saida',
    projectId: '',
    valor: '',
    data: new Date().toISOString().split('T')[0],
    categoria: 'sinal' as string,
    status: 'PAGO' as Billing['status']
  });

  const categorias = {
    entrada: [
      { value: 'sinal', label: '💰 Sinal / Entrada' },
      { value: 'parcela', label: '📅 Parcela' },
      { value: 'final', label: '✅ Pagamento Final' },
    ],
    saida: [
      { value: 'material', label: '🪵 Material' },
      { value: 'mo_terceirizada', label: '🔧 MO Terceirizada' },
      { value: 'outros', label: '📌 Outros' },
    ]
  };

  const filteredBillings = billings.filter(b => {
    const matchesType = typeFilter === 'ALL' || b.tipo === typeFilter;
    const matchesSearch = b.descricao?.toLowerCase().includes(searchTerm.toLowerCase()) || false;
    return matchesType && matchesSearch;
  }).sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());

  const itemsPerPage = 10;
  const totalPages = Math.max(1, Math.ceil(filteredBillings.length / itemsPerPage));
  const currentData = filteredBillings.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const totalEntradas = billings.filter(b => b.tipo === 'entrada' && b.status === 'PAGO').reduce((acc, b) => acc + b.valor, 0);
  const totalSaidas = billings.filter(b => b.tipo === 'saida' && b.status === 'PAGO').reduce((acc, b) => acc + b.valor, 0);
  const saldo = totalEntradas - totalSaidas;

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = {
        ...formData,
        descricao: formData.descricao.toUpperCase(),
        valor: parseFloat(formData.valor),
        nf: formData.descricao.toUpperCase(),
        pedido: formData.projectId || '-',
        cliente: projects.find(p => p.id === formData.projectId)?.clientName?.toUpperCase() || '-',
        status: formData.status as Billing['status'],
        categoria: formData.categoria as any
      };
      if (editingBilling) {
        await updateBilling(editingBilling.id, data);
      } else {
        await addBilling(data);
      }
      resetForm();
    } catch (err: any) {
      alert('Erro: ' + err.message);
    }
  };

  const resetForm = () => {
    setFormData({ descricao: '', tipo: 'entrada', projectId: '', valor: '', data: new Date().toISOString().split('T')[0], categoria: 'sinal', status: 'PAGO' });
    setEditingBilling(null);
    setIsModalOpen(false);
  };

  const handleEdit = (b: Billing) => {
    setEditingBilling(b);
    setFormData({
      descricao: b.descricao || '',
      tipo: b.tipo || 'entrada',
      projectId: b.projectId || '',
      valor: b.valor.toString(),
      data: new Date(b.data).toISOString().split('T')[0],
      categoria: b.categoria || 'outros',
      status: b.status
    });
    setIsModalOpen(true);
  };

  const inputStyle: React.CSSProperties = {
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '8px',
    padding: '0.75rem',
    color: 'white',
    fontSize: '0.95rem',
    width: '100%',
    outline: 'none',
  };

  const headers = ['Data', 'Tipo', 'Descrição', 'Cliente', 'Projeto', 'Categoria', 'Valor', 'Status', 'Ações'];

  const renderRow = (b: Billing) => {
    const linkedProject = projects.find(p => p.id === b.projectId);
    return (
    <>
      <td style={{ padding: '0.75rem', fontSize: '0.85rem' }}>
        {new Date(b.data).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
      </td>
      <td style={{ padding: '0.75rem' }}>
        <span style={{
          padding: '0.2rem 0.6rem', borderRadius: '12px', fontSize: '0.7rem', fontWeight: '700',
          background: b.tipo === 'entrada' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
          color: b.tipo === 'entrada' ? '#10b981' : '#ef4444',
        }}>
          {b.tipo === 'entrada' ? '↑ Entrada' : '↓ Saída'}
        </span>
      </td>
      <td style={{ padding: '0.75rem', fontSize: '0.85rem' }}>{b.descricao || '-'}</td>
      <td style={{ padding: '0.75rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
        {b.cliente || linkedProject?.clientName || '-'}
      </td>
      <td style={{ padding: '0.75rem' }}>
        {linkedProject ? (
          <span style={{ 
            fontSize: '0.75rem', padding: '0.2rem 0.6rem', borderRadius: '12px',
            background: 'rgba(212,175,55,0.1)', color: '#d4af37', whiteSpace: 'nowrap'
          }}>
            {linkedProject.ambiente}
          </span>
        ) : (
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>—</span>
        )}
      </td>
      <td style={{ padding: '0.75rem' }}>
        <span style={{ fontSize: '0.75rem', color: '#d4af37' }}>
          {categorias[b.tipo]?.find(c => c.value === b.categoria)?.label || b.categoria || '-'}
        </span>
      </td>
      <td style={{ padding: '0.75rem', fontWeight: '700', color: b.tipo === 'entrada' ? '#10b981' : '#ef4444' }}>
        {b.tipo === 'saida' ? '- ' : ''}{formatCurrency(b.valor)}
      </td>
      <td style={{ padding: '0.75rem' }}>
        <div style={{ display: 'flex', gap: '0.3rem' }}>
          {[
            { id: 'PAGO', color: '#10b981' },
            { id: 'PENDENTE', color: '#f59e0b' },
            { id: 'CANCELADO', color: '#ef4444' }
          ].map(s => (
            <div key={s.id} onClick={() => updateBilling(b.id, { status: s.id as any })}
              title={s.id} style={{
                cursor: 'pointer', width: '20px', height: '20px', borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: b.status === s.id ? s.color : 'rgba(255,255,255,0.05)',
                border: `1px solid ${b.status === s.id ? 'transparent' : 'var(--border)'}`,
                transition: 'all 0.2s'
              }}>
              <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: b.status === s.id ? 'white' : s.color }} />
            </div>
          ))}
        </div>
      </td>
      <td style={{ padding: '0.75rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={() => handleEdit(b)} style={{ all: 'unset', cursor: 'pointer', color: '#d4af37', fontSize: '0.7rem', fontWeight: 'bold' }}>Editar</button>
          <button onClick={() => removeBilling(b.id)} style={{ all: 'unset', cursor: 'pointer', color: '#ef4444', fontSize: '0.7rem', fontWeight: 'bold' }}>Excluir</button>
        </div>
      </td>
    </>
  );};



  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.875rem', fontWeight: 'bold' }}>Financeiro</h2>
          <p style={{ color: 'var(--text-muted)' }}>Controle de entradas e saídas por projeto.</p>
        </div>
        <button className="btn" onClick={() => { setEditingBilling(null); setIsModalOpen(true); }}
          style={{
            background: 'linear-gradient(135deg, #d4af37, #b49050)', color: '#1a1a2e',
            fontWeight: '700', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '8px', cursor: 'pointer'
          }}>
          + Novo Lançamento
        </button>
      </header>

      {/* Resumo */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
        <div className="card glass" style={{ padding: '1.25rem', borderLeft: '3px solid #10b981' }}>
          <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Total Entradas</p>
          <h3 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#10b981' }}>{formatCurrency(totalEntradas)}</h3>
        </div>
        <div className="card glass" style={{ padding: '1.25rem', borderLeft: '3px solid #ef4444' }}>
          <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Total Saídas</p>
          <h3 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#ef4444' }}>{formatCurrency(totalSaidas)}</h3>
        </div>
        <div className="card glass" style={{ padding: '1.25rem', borderLeft: `3px solid ${saldo >= 0 ? '#d4af37' : '#ef4444'}` }}>
          <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Saldo</p>
          <h3 style={{ fontSize: '1.25rem', fontWeight: '800', color: saldo >= 0 ? '#d4af37' : '#ef4444' }}>{formatCurrency(saldo)}</h3>
        </div>
      </div>

      {/* Filtros + tabela */}
      <div className="card">
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.25rem', alignItems: 'center' }}>
          <input type="text" className="input" placeholder="Buscar por descrição..."
            style={{ flex: 1 }} value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} />
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {[
              { id: 'ALL', label: 'Todos', color: '#d4af37' },
              { id: 'entrada', label: '↑ Entradas', color: '#10b981' },
              { id: 'saida', label: '↓ Saídas', color: '#ef4444' },
            ].map(f => (
              <button key={f.id} onClick={() => { setTypeFilter(f.id as any); setCurrentPage(1); }}
                style={{
                  padding: '0.4rem 0.8rem', borderRadius: '8px', fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer',
                  border: typeFilter === f.id ? `1px solid ${f.color}` : '1px solid var(--border)',
                  background: typeFilter === f.id ? f.color : 'transparent',
                  color: typeFilter === f.id ? 'white' : 'var(--text-muted)',
                  transition: 'all 0.2s'
                }}>
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <DataTable headers={headers} data={currentData} renderRow={renderRow} />

        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '1.5rem' }}>
            <button className="btn" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}
              style={{ padding: '0.5rem 0.75rem' }}>←</button>
            <span style={{ alignSelf: 'center', fontSize: '0.8rem' }}>{currentPage}/{totalPages}</span>
            <button className="btn" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}
              style={{ padding: '0.5rem 0.75rem' }}>→</button>
          </div>
        )}
      </div>

      {/* Modal */}
      <Modal isOpen={isModalOpen} onClose={resetForm}
        title={editingBilling ? "Editar Lançamento" : "Novo Lançamento"}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {(['entrada', 'saida'] as const).map(t => (
              <button key={t} type="button" onClick={() => setFormData({ ...formData, tipo: t, categoria: t === 'entrada' ? 'sinal' : 'material' })}
                style={{
                  flex: 1, padding: '0.75rem', borderRadius: '8px', fontWeight: '700', fontSize: '0.9rem', cursor: 'pointer',
                  border: formData.tipo === t ? 'none' : '1px solid var(--border)',
                  background: formData.tipo === t ? (t === 'entrada' ? '#10b981' : '#ef4444') : 'transparent',
                  color: formData.tipo === t ? 'white' : 'var(--text-muted)',
                }}>
                {t === 'entrada' ? '↑ Entrada' : '↓ Saída'}
              </button>
            ))}
          </div>

          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: '600', display: 'block', marginBottom: '0.4rem' }}>Descrição *</label>
            <input style={inputStyle} required placeholder="Ex: Sinal Cozinha Maria"
              value={formData.descricao} onChange={e => setFormData({ ...formData, descricao: e.target.value })} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: '600', display: 'block', marginBottom: '0.4rem' }}>Projeto</label>
              <select style={{ ...inputStyle, cursor: 'pointer' }} value={formData.projectId}
                onChange={e => setFormData({ ...formData, projectId: e.target.value })}>
                <option value="" style={{ background: '#1a1a1a' }}>Sem projeto</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id} style={{ background: '#1a1a1a' }}>{p.ambiente} — {p.clientName}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: '600', display: 'block', marginBottom: '0.4rem' }}>Categoria</label>
              <select style={{ ...inputStyle, cursor: 'pointer' }} value={formData.categoria}
                onChange={e => setFormData({ ...formData, categoria: e.target.value })}>
                {categorias[formData.tipo].map(c => (
                  <option key={c.value} value={c.value} style={{ background: '#1a1a1a' }}>{c.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: '600', display: 'block', marginBottom: '0.4rem' }}>Valor (R$) *</label>
              <input type="number" step="0.01" style={inputStyle} required placeholder="0,00"
                value={formData.valor} onChange={e => setFormData({ ...formData, valor: e.target.value })} />
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: '600', display: 'block', marginBottom: '0.4rem' }}>Data *</label>
              <input type="date" style={inputStyle} required
                value={formData.data} onChange={e => setFormData({ ...formData, data: e.target.value })} />
            </div>
          </div>

          <button type="submit" className="btn"
            style={{
              background: 'linear-gradient(135deg, #d4af37, #b49050)', color: '#1a1a2e',
              fontWeight: '700', border: 'none', padding: '0.75rem', borderRadius: '8px', cursor: 'pointer',
              fontSize: '1rem', marginTop: '0.5rem'
            }}>
            {editingBilling ? 'Salvar' : 'Lançar'}
          </button>
        </form>
      </Modal>
    </div>
  );
};

export default BillingModule;
