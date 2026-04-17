import React from 'react';
import { useAppContext } from '../../context/AppContext';
import type { Project, ProductionStep } from '../../context/AppContext';

type StatusCol = "PENDENTE" | "CORTE" | "MONTAGEM" | "FINALIZADA";

const ProductionPanel: React.FC = () => {
  const { projects, updateProject } = useAppContext();

  // Filtragem dos projetos em colunas baseada no estado real do sistema
  const getColProjects = (col: StatusCol) => {
    return projects.filter(p => {
      if (col === "PENDENTE") return p.status === 'aprovado' || (p.status === 'em_producao' && !p.etapaProducao);
      if (col === "CORTE") return p.etapaProducao === 'corte' || p.etapaProducao === 'furacao';
      if (col === "MONTAGEM") return p.etapaProducao === 'montagem' || p.etapaProducao === 'pintura' || p.etapaProducao === 'acabamento';
      if (col === "FINALIZADA") return p.status === 'pronto_entrega' || p.etapaProducao === 'entrega';
      return false;
    });
  };

  const avancarStatus = async (project: Project) => {
    const currentStatus = project.status;
    const currentStep = project.etapaProducao;

    let updates: Partial<Project> = {};

    if (currentStatus === 'aprovado') {
      updates = { status: 'em_producao', etapaProducao: 'corte' };
    } else if (currentStep === 'corte' || currentStep === 'furacao') {
      updates = { etapaProducao: 'montagem' };
    } else if (currentStep === 'montagem' || currentStep === 'pintura' || currentStep === 'acabamento') {
      updates = { status: 'pronto_entrega', etapaProducao: 'entrega' };
    }

    if (Object.keys(updates).length > 0) {
      await updateProject(project.id, updates);
    }
  };

  const colunas: { id: StatusCol, label: string, color: string }[] = [
    { id: "PENDENTE", label: "Aguardando", color: "var(--text-muted)" },
    { id: "CORTE", label: "Corte / Preparação", color: "#f59e0b" },
    { id: "MONTAGEM", label: "Montagem / Acabamento", color: "#3b82f6" },
    { id: "FINALIZADA", label: "Pronto p/ Entrega", color: "#10b981" }
  ];

  return (
    <div style={{ 
      display: 'grid', 
      gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
      gap: '1.5rem',
      alignItems: 'start'
    }}>
      {colunas.map(col => (
        <div key={col.id} className="glass" style={{ 
          borderRadius: '20px', 
          padding: '1.25rem', 
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid var(--border)',
          minHeight: '70vh'
        }}>
          <header style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            marginBottom: '1.5rem' 
          }}>
            <h2 style={{ fontSize: '0.9rem', fontWeight: '800', color: col.color, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {col.label}
            </h2>
            <span style={{ 
              background: 'rgba(255,255,255,0.05)', 
              padding: '2px 8px', 
              borderRadius: '10px', 
              fontSize: '0.75rem', 
              fontWeight: 'bold' 
            }}>
              {getColProjects(col.id).length}
            </span>
          </header>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {getColProjects(col.id).map(project => (
              <div key={project.id} className="card-hover" style={{ 
                background: 'rgba(255,255,255,0.03)', 
                borderRadius: '16px', 
                padding: '1rem', 
                border: '1px solid rgba(255,255,255,0.05)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                transition: 'transform 0.2s ease'
              }}>
                <div style={{ marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: '700' }}>
                    #{project.id.slice(0, 5).toUpperCase()}
                  </span>
                  {project.etapaProducao && (
                    <span style={{ fontSize: '0.65rem', padding: '1px 6px', background: `${col.color}22`, color: col.color, borderRadius: '4px', fontWeight: 'bold' }}>
                      {project.etapaProducao.toUpperCase()}
                    </span>
                  )}
                </div>
                
                <h4 style={{ fontSize: '1rem', fontWeight: '700', marginBottom: '0.25rem' }}>{project.ambiente}</h4>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>{project.clientName}</p>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: '600', color: '#d4af37' }}>
                    {project.valorEstimado ? `R$ ${project.valorEstimado.toLocaleString('pt-BR')}` : '--'}
                  </div>
                  
                  {col.id !== "FINALIZADA" && (
                    <button 
                      onClick={() => avancarStatus(project)}
                      style={{ 
                        background: 'linear-gradient(135deg, #d4af37, #b49050)', 
                        color: '#1a1a2e', 
                        border: 'none', 
                        padding: '6px 14px', 
                        borderRadius: '8px', 
                        fontSize: '0.75rem', 
                        fontWeight: '800',
                        cursor: 'pointer',
                        boxShadow: '0 2px 8px rgba(212,175,55,0.2)'
                      }}
                    >
                      AVANÇAR →
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default ProductionPanel;
