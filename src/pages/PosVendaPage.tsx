import React, { useState, useEffect } from 'react';
import { HeartHandshake, Plus, Clock, CheckCircle, AlertTriangle, Search, Filter, BarChart3, Calendar, Loader2, Save } from 'lucide-react';
import { api } from '../lib/api';
import Modal from '../components/ui/Modal';
import DataTable from '../components/ui/DataTable';

const PosVendaPage: React.FC = () => {
  const [activeTab, setActiveTab ] = useState<'abertos' | 'historico' | 'indicadores'>('abertos');
  const [chamados, setChamados] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [stats, setStats] = useState<any>(null);

  const [formData, setFormData] = useState({
    cliente_id: '',
    projeto_id: '',
    titulo: '',
    descricao: '',
    tipo: 'garantia',
    prioridade: 'normal',
    data_agendamento: ''
  });

  const [clientes, setClientes] = useState<any[]>([]);

  useEffect(() => {
    fetchData();
    fetchClientes();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [data, statsData] = await Promise.all([
        api.afterSales.list(),
        api.afterSales.getStats()
      ]);
      setChamados(data);
      setStats(statsData);
    } catch (err) {
      console.error('Failed to fetch after sales data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchClientes = async () => {
    try {
      const data = await api.clients.list();
      setClientes(data);
    } catch (err) {
      console.error('Failed to fetch clients:', err);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.afterSales.create(formData);
      setIsModalOpen(false);
      setFormData({
        cliente_id: '',
        projeto_id: '',
        titulo: '',
        descricao: '',
        tipo: 'garantia',
        prioridade: 'normal',
        data_agendamento: ''
      });
      await fetchData();
    } catch (err: any) {
      alert(`Erro: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      await api.afterSales.update({ id, status, solucao_aplicada: 'Resolvido via atendimento padrão' });
      await fetchData();
    } catch (err) {
      console.error('Update failed:', err);
    }
  };

  const chamadosFiltrados = chamados.filter(c => 
    activeTab === 'abertos' ? c.status !== 'resolvido' : c.status === 'resolvido'
  );

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '2.25rem', fontWeight: '900', color: 'var(--text)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <HeartHandshake size={32} style={{ color: 'var(--primary)' }} /> Pós-Venda e Garantia
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '1rem', marginTop: '0.25rem' }}>
             Gestão de assistências técnicas e satisfação do cliente.
          </p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Plus size={20} /> Novo Chamado
        </button>
      </header>

      {/* Tabs Menu */}
      <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
        <button 
          onClick={() => setActiveTab('abertos')} 
          style={{ all: 'unset', cursor: 'pointer', padding: '0.5rem 1rem', color: activeTab === 'abertos' ? 'var(--primary)' : 'var(--text-muted)', borderBottom: activeTab === 'abertos' ? '2px solid var(--primary)' : 'none', fontWeight: activeTab === 'abertos' ? 'bold' : 'normal' }}
        >
          Chamados Abertos
        </button>
        <button 
          onClick={() => setActiveTab('historico')} 
          style={{ all: 'unset', cursor: 'pointer', padding: '0.5rem 1rem', color: activeTab === 'historico' ? 'var(--primary)' : 'var(--text-muted)', borderBottom: activeTab === 'historico' ? '2px solid var(--primary)' : 'none', fontWeight: activeTab === 'historico' ? 'bold' : 'normal' }}
        >
          Histórico
        </button>
        <button 
          onClick={() => setActiveTab('indicadores')} 
          style={{ all: 'unset', cursor: 'pointer', padding: '0.5rem 1rem', color: activeTab === 'indicadores' ? 'var(--primary)' : 'var(--text-muted)', borderBottom: activeTab === 'indicadores' ? '2px solid var(--primary)' : 'none', fontWeight: activeTab === 'indicadores' ? 'bold' : 'normal' }}
        >
          Indicadores
        </button>
      </div>

      {activeTab === 'indicadores' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
           <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
              <Clock size={32} style={{ color: 'var(--primary)', marginBottom: '1rem' }} />
              <h4 style={{ margin: 0, color: 'var(--text-muted)' }}>Média de Resolução</h4>
              <p style={{ fontSize: '2rem', fontWeight: '900', margin: '0.5rem 0' }}>{stats?.tempo_medio ? Number(stats.tempo_medio).toFixed(1) : '---'} dias</p>
           </div>
           <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
              <AlertTriangle size={32} style={{ color: '#ff4444', marginBottom: '1rem' }} />
              <h4 style={{ margin: 0, color: 'var(--text-muted)' }}>Chamados Críticos</h4>
              <p style={{ fontSize: '2rem', fontWeight: '900', margin: '0.5rem 0' }}>{chamados.filter(c => c.prioridade === 'urgente').length}</p>
           </div>
           <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
              <CheckCircle size={32} style={{ color: '#10b981', marginBottom: '1rem' }} />
              <h4 style={{ margin: 0, color: 'var(--text-muted)' }}>Taxa de Sucesso</h4>
              <p style={{ fontSize: '2rem', fontWeight: '900', margin: '0.5rem 0' }}>94%</p>
           </div>
        </div>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          {loading ? (
            <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}><Loader2 className="animate-spin" /> Carregando...</div>
          ) : (
            <DataTable 
              headers={['Número', 'Cliente', 'Título', 'Prioridade', 'Status', 'Ações']}
              data={chamadosFiltrados}
              renderRow={(c) => (
                <>
                  <td style={{ padding: '1rem' }}><span className="badge badge-outline">{c.numero}</span></td>
                  <td style={{ padding: '1rem' }}>{c.cliente_nome}</td>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>{c.titulo}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{c.tipo.toUpperCase()}</div>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <span style={{ fontSize: '0.75rem', background: c.prioridade === 'urgente' ? 'rgba(255,0,0,0.1)' : 'rgba(255,255,255,0.05)', color: c.prioridade === 'urgente' ? '#ff4444' : 'inherit', padding: '0.2rem 0.6rem', borderRadius: '4px' }}>
                      {c.prioridade.toUpperCase()}
                    </span>
                  </td>
                  <td style={{ padding: '1rem' }}><span className="badge">{c.status}</span></td>
                  <td style={{ padding: '1rem' }}>
                    {c.status !== 'resolvido' && (
                      <button onClick={() => updateStatus(c.id, 'resolvido')} className="btn btn-outline btn-sm" style={{ color: '#10b981' }}>Resolver</button>
                    )}
                  </td>
                </>
              )}
              emptyMessage="Nenhum chamado registrado."
            />
          )}
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Abrir Novo Chamado de Garantia">
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <label className="label">Cliente</label>
            <select required className="input-base w-full" value={formData.cliente_id} onChange={e => setFormData({...formData, cliente_id: e.target.value})}>
              <option value="">Selecione o cliente</option>
              {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Título do Problema</label>
            <input required className="input-base w-full" placeholder="Ex: Dobradiça solta / Porta desalinhada" value={formData.titulo} onChange={e => setFormData({...formData, titulo: e.target.value})} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
             <div>
                <label className="label">Tipo</label>
                <select className="input-base w-full" value={formData.tipo} onChange={e => setFormData({...formData, tipo: e.target.value})}>
                   <option value="garantia">Garantia</option>
                   <option value="assistencia">Assistência Técnica</option>
                   <option value="ajuste">Ajuste / Regulagem</option>
                </select>
             </div>
             <div>
                <label className="label">Prioridade</label>
                <select className="input-base w-full" value={formData.prioridade} onChange={e => setFormData({...formData, prioridade: e.target.value})}>
                   <option value="baixa">Baixa</option>
                   <option value="normal">Normal</option>
                   <option value="alta">Alta</option>
                   <option value="urgente">Urgente</option>
                </select>
             </div>
          </div>
          <div>
             <label className="label">Agendamento de Visita</label>
             <input type="datetime-local" className="input-base w-full" value={formData.data_agendamento} onChange={e => setFormData({...formData, data_agendamento: e.target.value})} />
          </div>
          <div>
            <label className="label">Descrição Detalhada</label>
            <textarea required className="input-base w-full" style={{ minHeight: '100px' }} placeholder="Descreva o que aconteceu..." value={formData.descricao} onChange={e => setFormData({...formData, descricao: e.target.value})} />
          </div>
          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
            <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-outline flex-1">Cancelar</button>
            <button type="submit" className="btn btn-primary flex-1" disabled={saving}>
              {saving ? <Loader2 className="animate-spin" size={20} /> : <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Save size={20} /> Abrir Chamado</div>}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default PosVendaPage;
