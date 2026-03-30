import React, { useState } from 'react';
import DataTable from '../../components/common/DataTable';
import Modal from '../../components/common/Modal';
import { useAppContext } from '../../context/AppContext';
import type { Billing } from '../../context/AppContext';

const BillingModule: React.FC = () => {
  const { billings, addBilling, updateBilling, removeBilling, clients } = useAppContext();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBilling, setEditingBilling] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'FATURADO' | 'PENDENTE' | 'CANCELADO'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const periods = [
    { id: 'Annual', label: 'Visão Anual (2026)' },
    { id: '2026-01', label: 'Janeiro 2026' },
    { id: '2026-02', label: 'Fevereiro 2026' },
    { id: '2026-03', label: 'Março 2026' },
    { id: '2026-04', label: 'Abril 2026' },
    { id: '2026-05', label: 'Maio 2026' },
    { id: '2026-06', label: 'Junho 2026' },
    { id: '2026-07', label: 'Julho 2026' },
    { id: '2026-08', label: 'Agosto 2026' },
    { id: '2026-09', label: 'Setembro 2026' },
    { id: '2026-10', label: 'Outubro 2026' },
    { id: '2026-11', label: 'Novembro 2026' },
    { id: '2026-12', label: 'Dezembro 2026' },
  ];

  const [formData, setFormData] = useState({
    nf: '',
    pedido: '',
    cliente: '',
    erp: '',
    valor: '',
    data: new Date().toISOString().split('T')[0],
    status: 'FATURADO' as Billing['status']
  });

  // Combined Filters
  const filteredBillings = billings.filter(b => {
    const matchesStatus = statusFilter === 'ALL' || b.status === statusFilter;
    const matchesSearch = 
      b.cliente.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.nf.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.pedido.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesPeriod = selectedMonth === 'Annual' 
      ? b.data.startsWith(new Date().getFullYear().toString())
      : b.data.startsWith(selectedMonth);

    return matchesStatus && matchesSearch && matchesPeriod;
  });

  // Pagination Logic
  const itemsPerPage = 10;
  const totalPages = Math.ceil(filteredBillings.length / itemsPerPage);
  const currentData = filteredBillings.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = { ...formData, valor: parseFloat(formData.valor) };
      if (editingBilling) {
        await updateBilling(editingBilling.id, data);
      } else {
        await addBilling(data);
      }
      setFormData({ nf: '', pedido: '', cliente: '', erp: '', valor: '', data: new Date().toISOString().split('T')[0], status: 'FATURADO' });
      setEditingBilling(null);
      setIsModalOpen(false);
    } catch (err: any) {
      alert('Erro ao salvar faturamento: ' + err.message);
    }
  };

  const handleEdit = (b: Billing) => {
    setEditingBilling(b);
    setFormData({
      nf: b.nf,
      pedido: b.pedido,
      cliente: b.cliente,
      erp: b.erp,
      valor: b.valor.toString(),
      data: new Date(b.data).toISOString().split('T')[0],
      status: b.status
    });
    setIsModalOpen(true);
  };

  const setStatus = async (b: Billing, status: Billing['status']) => {
    await updateBilling(b.id, { status });
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
    } catch (e) {
      return dateStr;
    }
  };

  const headers = ['Data', 'Status', 'Nota Fiscal', 'Pedido', 'Cliente', 'Valor R$', 'Ações'];

  const renderRow = (b: Billing) => (
    <>
      <td style={{ padding: '1rem' }}>{formatDate(b.data)}</td>
      <td style={{ padding: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
          {[
            { id: 'FATURADO', color: '#10b981', label: 'Faturado' },
            { id: 'PENDENTE', color: '#f59e0b', label: 'Pendente' },
            { id: 'CANCELADO', color: '#ef4444', label: 'Cancelado' }
          ].map(s => (
            <div 
              key={s.id}
              onClick={() => setStatus(b, s.id as any)}
              title={s.label}
              style={{ 
                cursor: 'pointer',
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: b.status === s.id ? s.color : 'rgba(255, 255, 255, 0.05)',
                border: `1px solid ${b.status === s.id ? 'transparent' : 'var(--border)'}`,
                transition: 'all 0.2s ease',
                boxShadow: b.status === s.id ? `0 0 10px ${s.color}66` : 'none'
              }}
            >
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: b.status === s.id ? 'white' : s.color }}></div>
            </div>
          ))}
        </div>
      </td>
      <td style={{ padding: '1rem', fontSize: '0.875rem' }}>{b.nf}</td>
      <td style={{ padding: '1rem', fontSize: '0.875rem' }}>{b.pedido}</td>
      <td style={{ padding: '1rem', fontSize: '0.875rem' }}>{b.cliente}</td>
      <td style={{ padding: '1rem', fontWeight: 'bold' }}>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(b.valor)}</td>
      <td style={{ padding: '1rem' }}>
         <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button onClick={() => handleEdit(b)} style={{ all: 'unset', cursor: 'pointer', color: 'var(--primary)', fontSize: '0.75rem', fontWeight: 'bold' }}>Editar</button>
            <button onClick={() => removeBilling(b.id)} style={{ all: 'unset', cursor: 'pointer', color: 'var(--danger)', fontSize: '0.75rem', fontWeight: 'bold' }}>Excluir</button>
         </div>
      </td>
    </>
  );

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.875rem', fontWeight: 'bold' }}>Registro de Faturamento</h2>
          <p style={{ color: 'var(--text-muted)' }}>Gerencie entradas manuais e sincronização de pedidos.</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditingBilling(null); setIsModalOpen(true); }}>+ Registrar Faturamento</button>
      </header>

      <div className="card">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginBottom: '1.5rem', padding: '0.5rem' }}>
           {/* Row 1: Search and Period */}
           <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <div style={{ flex: 1, position: 'relative' }}>
                <input 
                  type="text" 
                  className="input" 
                  placeholder="Buscar por Cliente, NF ou Pedido..." 
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                  style={{ width: '100%', paddingLeft: '2.5rem' }}
                />
                <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }}>🔍</span>
              </div>
              <select 
                className="input" 
                style={{ width: '220px', background: 'var(--surface)', borderColor: 'var(--primary)' }}
                value={selectedMonth}
                onChange={(e) => { setSelectedMonth(e.target.value); setCurrentPage(1); }}
              >
                {periods.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
              </select>
           </div>

           {/* Row 2: Status Filters and Result Count */}
           <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-muted)' }}>Status:</span>
                {[
                  { id: 'ALL', label: 'Tudo', color: 'var(--primary)' },
                  { id: 'FATURADO', label: 'Faturados', color: '#10b981' },
                  { id: 'PENDENTE', label: 'Pendentes', color: '#f59e0b' },
                  { id: 'CANCELADO', label: 'Cancelados', color: '#ef4444' }
                ].map(f => (
                  <button 
                    key={f.id}
                    onClick={() => { setStatusFilter(f.id as any); setCurrentPage(1); }}
                    style={{ 
                      all: 'unset',
                      cursor: 'pointer',
                      fontSize: '0.75rem',
                      fontWeight: 'bold',
                      padding: '0.4rem 0.8rem',
                      borderRadius: '8px',
                      background: statusFilter === f.id ? f.color : 'transparent',
                      color: statusFilter === f.id ? 'white' : 'var(--text-muted)',
                      border: `1px solid ${statusFilter === f.id ? f.color : 'var(--border)'}`,
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Encontrados: <b>{filteredBillings.length}</b> registros
              </div>
           </div>
        </div>

        <DataTable headers={headers} data={currentData} renderRow={renderRow} />

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', marginTop: '1.5rem', padding: '1rem', borderTop: '1px solid var(--border)' }}>
            <button 
              className="btn" 
              disabled={currentPage === 1} 
              onClick={() => handlePageChange(currentPage - 1)}
              style={{ padding: '0.5rem 1rem', opacity: currentPage === 1 ? 0.3 : 1 }}
            >
              ← Anterior
            </button>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {[...Array(totalPages)].map((_, i) => (
                <button 
                  key={i} 
                  onClick={() => handlePageChange(i + 1)}
                  style={{ 
                    all: 'unset',
                    cursor: 'pointer',
                    width: '32px',
                    height: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '8px',
                    fontSize: '0.875rem',
                    fontWeight: 'bold',
                    background: currentPage === i + 1 ? 'var(--primary)' : 'transparent',
                    color: currentPage === i + 1 ? 'white' : 'var(--text-muted)',
                    border: currentPage === i + 1 ? 'none' : '1px solid var(--border)'
                  }}
                >
                  {i + 1}
                </button>
              ))}
            </div>
            <button 
              className="btn" 
              disabled={currentPage === totalPages} 
              onClick={() => handlePageChange(currentPage + 1)}
              style={{ padding: '0.5rem 1rem', opacity: currentPage === totalPages ? 0.3 : 1 }}
            >
              Próximo →
            </button>
          </div>
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setEditingBilling(null); }} title={editingBilling ? "Editar Faturamento" : "Lançar Faturamento Manual"}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
               <label style={{ fontSize: '0.875rem', fontWeight: '600' }}>Nota Fiscal</label>
               <input className="input" required value={formData.nf} onChange={e => setFormData({ ...formData, nf: e.target.value })} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
               <label style={{ fontSize: '0.875rem', fontWeight: '600' }}>Pedido</label>
               <input className="input" required value={formData.pedido} onChange={e => setFormData({ ...formData, pedido: e.target.value })} />
            </div>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
             <label style={{ fontSize: '0.875rem', fontWeight: '600' }}>Cliente</label>
             <select className="input" required value={formData.cliente} onChange={e => setFormData({ ...formData, cliente: e.target.value })}>
                <option value="">Selecione um cliente...</option>
                {clients.map(c => <option key={c.id} value={c.razaoSocial}>{c.razaoSocial}</option>)}
             </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
               <label style={{ fontSize: '0.875rem', fontWeight: '600' }}>Valor (R$)</label>
               <input type="number" className="input" required value={formData.valor} onChange={e => setFormData({ ...formData, valor: e.target.value })} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
               <label style={{ fontSize: '0.875rem', fontWeight: '600' }}>Data</label>
               <input type="date" className="input" required value={formData.data} onChange={e => setFormData({ ...formData, data: e.target.value })} />
            </div>
          </div>


          <button type="submit" className="btn btn-primary" style={{ marginTop: '1rem', height: '3rem', fontSize: '1rem', fontWeight: 'bold', justifyContent: 'center' }}>
            {editingBilling ? 'Salvar Alterações' : 'Confirmar Lançamento'}
          </button>
        </form>
      </Modal>

      <div className="card glass">
         <h4 style={{ fontSize: '0.875rem', color: 'var(--primary)', marginBottom: '0.5rem' }}>Integração ERP (Simulado)</h4>
         <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Os faturamentos manuais lançados aqui impactam diretamente o Dashboard em tempo real.</p>
      </div>
    </div>
  );
};

export default BillingModule;
