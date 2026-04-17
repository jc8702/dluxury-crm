import React, { useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import ProductionPanel from './ProductionPanel';
import ProductionDashboard from './ProductionDashboard';
import type { Project, ProductionStep } from '../../context/AppContext';

const PRODUCTION_STEPS: { id: ProductionStep; label: string; icon: string }[] = [
  { id: 'corte', label: 'Corte', icon: '🪚' },
  { id: 'furacao', label: 'Furações', icon: '🔩' },
  { id: 'montagem', label: 'Montagem', icon: '🔨' },
  { id: 'pintura', label: 'Pintura / Acabamento', icon: '🎨' },
  { id: 'acabamento', label: 'Inspeção Final', icon: '✅' },
  { id: 'entrega', label: 'Pronto p/ Entrega', icon: '📦' },
];

const Production: React.FC = () => {
  const { projects, updateProject } = useAppContext();
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'em_producao' | 'aprovado' | 'pronto_entrega'>('em_producao');
  const [viewType, setViewType] = useState<'list' | 'kanban'>('kanban');

  // Projects in production-related statuses
  const productionProjects = projects.filter(p => {
    if (filter === 'all') return ['aprovado', 'em_producao', 'pronto_entrega'].includes(p.status);
    return p.status === filter;
  });

  const getStepIndex = (step?: ProductionStep): number => {
    if (!step) return -1;
    return PRODUCTION_STEPS.findIndex(s => s.id === step);
  };

  const handleStepClick = async (project: Project, step: ProductionStep) => {
    const stepIndex = PRODUCTION_STEPS.findIndex(s => s.id === step);
    const currentIndex = getStepIndex(project.etapaProducao);

    // Can only advance to next step or go back
    if (stepIndex <= currentIndex) return;

    const updates: Partial<Project> = {
      etapaProducao: step,
    };

    // Auto-status transitions
    if (step === 'corte' && project.status === 'aprovado') {
      updates.status = 'em_producao';
    }
    if (step === 'entrega') {
      updates.status = 'pronto_entrega';
    }

    await updateProject(project.id, updates);
  };

  const handleMarkReady = async (project: Project) => {
    await updateProject(project.id, { status: 'pronto_entrega', etapaProducao: 'entrega' });
  };

  const getProgressPercent = (step?: ProductionStep): number => {
    if (!step) return 0;
    const idx = getStepIndex(step);
    return Math.round(((idx + 1) / PRODUCTION_STEPS.length) * 100);
  };

  const filterButtons = [
    { id: 'em_producao' as const, label: '🔨 Em Produção', color: '#f59e0b' },
    { id: 'aprovado' as const, label: '✅ Aprovados', color: '#10b981' },
    { id: 'pronto_entrega' as const, label: '📦 Prontos', color: '#3b82f6' },
    { id: 'all' as const, label: 'Todos', color: '#d4af37' },
  ];

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2 style={{ fontSize: '1.875rem', fontWeight: 'bold' }}>Produção</h2>
          <p style={{ color: 'var(--text-muted)' }}>Acompanhe cada projeto na oficina — visão do marceneiro.</p>
        </div>
        <div className="glass" style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', padding: '4px' }}>
          <button 
            onClick={() => setViewType('kanban')}
            style={{ 
              padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer',
              background: viewType === 'kanban' ? '#d4af37' : 'transparent',
              color: viewType === 'kanban' ? '#1a1a2e' : 'var(--text-muted)',
              fontSize: '0.8rem', fontWeight: '800', transition: 'all 0.3s'
            }}
          >
            QUADRO (KANBAN)
          </button>
          <button 
            onClick={() => setViewType('list')}
            style={{ 
              padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer',
              background: viewType === 'list' ? '#d4af37' : 'transparent',
              color: viewType === 'list' ? '#1a1a2e' : 'var(--text-muted)',
              fontSize: '0.8rem', fontWeight: '800', transition: 'all 0.3s'
            }}
          >
            LISTA DE ENGENHARIA
          </button>
        </div>
      </header>

      {viewType === 'kanban' ? (
        <>
          <ProductionDashboard />
          <ProductionPanel />
        </>
      ) : (
        <>
          {/* Filtros */}
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
        {filterButtons.map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)}
            style={{
              padding: '0.5rem 1rem', borderRadius: '20px', fontSize: '0.8rem', fontWeight: '700',
              cursor: 'pointer', transition: 'all 0.2s',
              border: filter === f.id ? `1px solid ${f.color}` : '1px solid var(--border)',
              background: filter === f.id ? `${f.color}22` : 'transparent',
              color: filter === f.id ? f.color : 'var(--text-muted)',
            }}>
            {f.label} ({projects.filter(p => f.id === 'all' ? ['aprovado', 'em_producao', 'pronto_entrega'].includes(p.status) : p.status === f.id).length})
          </button>
        ))}
      </div>

      {/* Resumo */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
        <div className="card glass" style={{ padding: '1rem', borderLeft: '3px solid #10b981' }}>
          <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Aguardando Início</p>
          <h4 style={{ fontSize: '1.5rem', color: '#10b981' }}>
            {projects.filter(p => p.status === 'aprovado').length}
          </h4>
        </div>
        <div className="card glass" style={{ padding: '1rem', borderLeft: '3px solid #f59e0b' }}>
          <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Em Produção</p>
          <h4 style={{ fontSize: '1.5rem', color: '#f59e0b' }}>
            {projects.filter(p => p.status === 'em_producao').length}
          </h4>
        </div>
        <div className="card glass" style={{ padding: '1rem', borderLeft: '3px solid #3b82f6' }}>
          <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Prontos p/ Entrega</p>
          <h4 style={{ fontSize: '1.5rem', color: '#3b82f6' }}>
            {projects.filter(p => p.status === 'pronto_entrega').length}
          </h4>
        </div>
      </div>

      {/* Lista de projetos */}
      {productionProjects.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <p style={{ fontSize: '1.2rem', color: 'var(--text-muted)' }}>Nenhum projeto nesta etapa.</p>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
            Projetos aparecem aqui quando são aprovados pelo cliente.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {productionProjects.map(project => {
            const progress = getProgressPercent(project.etapaProducao);
            const currentStepIdx = getStepIndex(project.etapaProducao);
            const isExpanded = selectedProject === project.id;

            return (
              <div key={project.id} className="card" style={{ cursor: 'pointer', padding: 0, overflow: 'hidden' }}>
                {/* Header do projeto */}
                <div onClick={() => setSelectedProject(isExpanded ? null : project.id)}
                  style={{ padding: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{
                      width: '48px', height: '48px', borderRadius: '12px',
                      background: 'linear-gradient(135deg, #d4af37, #b49050)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '1.2rem', fontWeight: '800', color: '#1a1a2e'
                    }}>
                      {project.ambiente?.charAt(0) || 'P'}
                    </div>
                    <div>
                      <h3 style={{ fontSize: '1rem', fontWeight: '700' }}>{project.ambiente}</h3>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {project.clientName || 'Sem cliente'} {project.responsavel ? `• ${project.responsavel}` : ''}
                      </p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                    {project.valorEstimado && (
                      <span style={{ fontSize: '0.9rem', fontWeight: '700', color: '#d4af37' }}>
                        R$ {project.valorEstimado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    )}
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Progresso</div>
                      <div style={{ fontSize: '1rem', fontWeight: '800', color: progress === 100 ? '#10b981' : '#d4af37' }}>
                        {progress}%
                      </div>
                    </div>
                    <span style={{ fontSize: '1.2rem', transition: 'transform 0.3s', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0)' }}>▼</span>
                  </div>
                </div>

                {/* Barra de progresso */}
                <div style={{ height: '4px', background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', width: `${progress}%`,
                    background: progress === 100 ? '#10b981' : 'linear-gradient(90deg, #d4af37, #b49050)',
                    transition: 'width 0.5s ease'
                  }} />
                </div>

                {/* Checklist expandido */}
                {isExpanded && (
                  <div style={{ padding: '1.25rem', borderTop: '1px solid var(--border)', background: 'rgba(0,0,0,0.15)' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
                      {PRODUCTION_STEPS.map((step, idx) => {
                        const isDone = idx <= currentStepIdx;
                        const isCurrent = idx === currentStepIdx;
                        const isNext = idx === currentStepIdx + 1;

                        return (
                          <button key={step.id}
                            onClick={() => isNext ? handleStepClick(project, step.id) : undefined}
                            style={{
                              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem',
                              padding: '1rem 0.5rem', borderRadius: '12px',
                              cursor: isNext ? 'pointer' : 'default',
                              transition: 'all 0.3s',
                              border: isCurrent ? '2px solid #d4af37' : isNext ? '2px dashed rgba(212,175,55,0.4)' : '1px solid var(--border)',
                              background: isDone ? 'rgba(16, 185, 129, 0.1)' : isNext ? 'rgba(212,175,55,0.05)' : 'transparent',
                              opacity: isDone || isNext ? 1 : 0.4,
                            }}>
                            <span style={{ fontSize: '1.5rem' }}>{isDone ? '✅' : step.icon}</span>
                            <span style={{
                              fontSize: '0.7rem', fontWeight: '700',
                              color: isDone ? '#10b981' : isNext ? '#d4af37' : 'var(--text-muted)'
                            }}>
                              {step.label}
                            </span>
                            {isCurrent && <span style={{ fontSize: '0.6rem', color: '#d4af37', fontWeight: '600' }}>ATUAL</span>}
                            {isNext && <span style={{ fontSize: '0.6rem', color: '#d4af37', fontWeight: '600' }}>CLIQUE →</span>}
                          </button>
                        );
                      })}
                    </div>

                    {/* Ações */}
                    <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                      {project.status === 'em_producao' && progress < 100 && (
                        <button onClick={() => handleMarkReady(project)}
                          style={{
                            background: '#10b981', color: 'white', border: 'none',
                            padding: '0.5rem 1rem', borderRadius: '8px', fontSize: '0.8rem',
                            fontWeight: '600', cursor: 'pointer'
                          }}>
                          📦 Marcar como Pronto
                        </button>
                      )}
                      {project.prazoEntrega && (
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', alignSelf: 'center' }}>
                          Prazo: {new Date(project.prazoEntrega).toLocaleDateString('pt-BR')}
                        </span>
                      )}
                    </div>

                    {project.observacoes && (
                      <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>📝 {project.observacoes}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Production;

