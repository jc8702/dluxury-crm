import React, { useState } from 'react';
import KanbanBoard from '../../components/kanban/KanbanBoard';
import Modal from '../ui/Modal';
import { useAppContext } from '../../context/AppContext';
import type { ProjectStatus } from '../../context/AppContext';

const ProjectKanban: React.FC = () => {
  const { projects, clients, addProject, updateProject, orcamentos, events } = useAppContext();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [formData, setFormData] = useState({
    clientId: '',
    ambiente: '',
    descricao: '',
    valorEstimado: '',
    prazoEntrega: '',
    responsavel: '',
    observacoes: '',
    status: 'lead' as ProjectStatus,
    visitaId: ''
  });

  const visitas = events?.filter((e: any) => e.tipo === 'visita') || [];

  const columns = [
    { id: 'lead', title: '📥 Lead' },
    { id: 'visita_tecnica', title: '📐 Visita Técnica' },
    { id: 'orcamento_enviado', title: '📄 Orçamento Enviado' },
    { id: 'aprovado', title: '✅ Aprovado' },
    { id: 'em_producao', title: '🔨 Em Produção' },
    { id: 'pronto_entrega', title: '📦 Pronto p/ Entrega' },
    { id: 'instalado', title: '🏠 Instalado' },
    { id: 'concluido', title: '🏁 Concluído' },
  ];

  const ambientes = [
    'Cozinha', 'Quarto Casal', 'Quarto Solteiro', 'Sala de Estar',
    'Banheiro', 'Lavanderia', 'Closet', 'Home Office',
    'Área Gourmet', 'Varanda', 'Sala de Jantar', 'Outro'
  ];

const handleMove = (id: string, newStatus: string) => {
    updateProject(id, { status: newStatus as ProjectStatus });
  };

const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const selectedClient = clients.find(c => c.id === formData.clientId);
    const data = {
      clientId: formData.clientId,
      clientName: selectedClient?.nome || '',
      ambiente: formData.ambiente,
      descricao: formData.descricao,
      valorEstimado: parseFloat(formData.valorEstimado) || undefined,
      prazoEntrega: formData.prazoEntrega || undefined,
      responsavel: formData.responsavel || undefined,
      observacoes: formData.observacoes,
      status: formData.status,
      visitaId: formData.visitaId || undefined
    };

    if (editingItem) {
      await updateProject(editingItem.id, data);
    } else {
      await addProject(data);
    }

    closeModal();
  };

  const handleEdit = (item: any) => {
    setEditingItem(item);
    setFormData({
      clientId: item.clientId || '',
      ambiente: item.ambiente || item.title || '',
      descricao: item.descricao || item.description || '',
      valorEstimado: item.valorEstimado?.toString() || item.value?.toString() || '',
      prazoEntrega: item.prazoEntrega || '',
      responsavel: item.responsavel || '',
      observacoes: item.observacoes || item.observations || '',
      status: item.status,
      visitaId: item.visitaId || ''
    });
    setIsModalOpen(true);
  };

const closeModal = () => {
    setIsModalOpen(false);
    setEditingItem(null);
    setFormData({
      clientId: '', ambiente: '', descricao: '', valorEstimado: '',
      prazoEntrega: '', responsavel: '', observacoes: '', status: 'lead', visitaId: ''
    });
  };

  // Map projects to kanban items format
  const kanbanItems = projects.map(p => {
    const projOrcamentos = orcamentos.filter(o => o.projeto_id === p.id?.toString());
    const badges = [];
    if (p.tag) badges.push(`🏷️ ${p.tag}`);
    projOrcamentos.forEach(o => badges.push(`📄 ${o.numero}`));

    return {
      id: p.id,
      title: p.ambiente,
      subtitle: p.clientName || '',
      label: p.valorEstimado ? `R$ ${p.valorEstimado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '',
      status: p.status,
      type: 'project' as const,
      value: p.valorEstimado,
      badges,
      // Carry original project data
      clientId: p.clientId,
      clientName: p.clientName,
      ambiente: p.ambiente,
      descricao: p.descricao,
      valorEstimado: p.valorEstimado,
      prazoEntrega: p.prazoEntrega,
      responsavel: p.responsavel,
      observacoes: p.observacoes,
      description: p.descricao,
      observations: p.observacoes,
    };
  });

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

  const labelStyle: React.CSSProperties = {
    fontSize: '0.8rem',
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: '0.4rem',
    display: 'block'
  };

  const selectStyle: React.CSSProperties = {
    ...inputStyle,
    cursor: 'pointer',
  };

  // Summary stats
  const totalValue = projects.reduce((acc, p) => acc + (p.valorEstimado || 0), 0);
  const inProduction = projects.filter(p => p.status === 'em_producao').length;
  const approved = projects.filter(p => p.status === 'aprovado').length;

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.875rem', fontWeight: 'bold' }}>Pipeline de Projetos</h2>
          <p style={{ color: 'var(--text-muted)' }}>Acompanhe cada projeto do lead à instalação.</p>
        </div>
        <button className="btn" onClick={() => { setEditingItem(null); setIsModalOpen(true); }}
          style={{
            background: 'linear-gradient(135deg, #d4af37, #b49050)', color: '#1a1a2e',
            fontWeight: '700', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '8px', cursor: 'pointer'
          }}>
          + Novo Projeto
        </button>
      </header>

      {/* Mini KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
        <div className="card glass" style={{ padding: '1rem', borderLeft: '3px solid #d4af37' }}>
          <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Total Projetos</p>
          <h4 style={{ fontSize: '1.25rem', color: '#d4af37' }}>{projects.length}</h4>
        </div>
        <div className="card glass" style={{ padding: '1rem', borderLeft: '3px solid #10b981' }}>
          <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Aprovados</p>
          <h4 style={{ fontSize: '1.25rem', color: '#10b981' }}>{approved}</h4>
        </div>
        <div className="card glass" style={{ padding: '1rem', borderLeft: '3px solid #3b82f6' }}>
          <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Em Produção</p>
          <h4 style={{ fontSize: '1.25rem', color: '#3b82f6' }}>{inProduction}</h4>
        </div>
        <div className="card glass" style={{ padding: '1rem', borderLeft: '3px solid #f59e0b' }}>
          <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Valor Total Pipeline</p>
          <h4 style={{ fontSize: '1rem', color: '#f59e0b' }}>R$ {totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h4>
        </div>
      </div>

      <KanbanBoard
        items={kanbanItems}
        columns={columns}
        onMove={handleMove}
        onEdit={handleEdit}
      />

      <Modal isOpen={isModalOpen} onClose={closeModal}
        title={editingItem ? "Editar Projeto" : "Novo Projeto"} width="650px">
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', maxHeight: '80vh', overflowY: 'auto', paddingRight: '0.5rem' }}>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={labelStyle}>Cliente *</label>
              <select style={selectStyle} required
                value={formData.clientId} onChange={e => setFormData({ ...formData, clientId: e.target.value })}>
                <option value="" style={{ background: '#1a1a1a' }}>Selecione...</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id} style={{ background: '#1a1a1a' }}>{c.nome}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Ambiente *</label>
              <select style={selectStyle} required
                value={formData.ambiente} onChange={e => setFormData({ ...formData, ambiente: e.target.value })}>
                <option value="" style={{ background: '#1a1a1a' }}>Selecione...</option>
                {ambientes.map(a => (
                  <option key={a} value={a} style={{ background: '#1a1a1a' }}>{a}</option>
                ))}
              </select>
            </div>
          </div>

<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={labelStyle}>Valor Estimado (R$)</label>
              <input type="number" step="0.01" style={inputStyle} placeholder="0,00"
                value={formData.valorEstimado} onChange={e => setFormData({ ...formData, valorEstimado: e.target.value })} />
            </div>
            <div>
              <label style={labelStyle}>Prazo de Entrega</label>
              <input type="date" style={inputStyle}
                value={formData.prazoEntrega} onChange={e => setFormData({ ...formData, prazoEntrega: e.target.value })} />
            </div>
          </div>

          <div>
            <label style={labelStyle}>Vincular à Visita</label>
            <select style={selectStyle}
              value={formData.visitaId} onChange={e => setFormData({ ...formData, visitaId: e.target.value })}>
              <option value="" style={{ background: '#1a1a1a' }}>Nenhuma visita vinculada</option>
              {visitas.map((v: any) => (
                <option key={v.id} value={v.id} style={{ background: '#1a1a1a' }}>
                  {v.titulo} - {v.cliente_nome || 'Sem cliente'} ({new Date(v.data_inicio).toLocaleDateString('pt-BR')})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={labelStyle}>Responsável (Marceneiro)</label>
            <input style={inputStyle} placeholder="Ex: João"
              value={formData.responsavel} onChange={e => setFormData({ ...formData, responsavel: e.target.value })} />
          </div>

          <div>
            <label style={labelStyle}>Descrição do Projeto</label>
            <textarea style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }}
              placeholder="Detalhes: materiais, acabamento, referências..."
              value={formData.descricao} onChange={e => setFormData({ ...formData, descricao: e.target.value })} />
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
            <button type="submit" className="btn"
              style={{
                background: 'linear-gradient(135deg, #d4af37, #b49050)', color: '#1a1a2e',
                border: 'none', padding: '0.75rem 1.5rem', borderRadius: '8px', fontWeight: '700', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '0.5rem'
              }}>
              ✓ {editingItem ? 'Salvar' : 'Criar Projeto'}
            </button>
            <button type="button" onClick={closeModal}
              style={{ background: '#333', color: 'white', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '8px', cursor: 'pointer' }}>
              Cancelar
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default ProjectKanban;

