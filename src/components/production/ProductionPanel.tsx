import React, { useEffect, useState } from 'react';
import { useAppContext } from '../../context/AppContext';

type StatusCol = "PENDENTE" | "CORTE" | "MONTAGEM" | "FINALIZADA";

interface OrdemProducao {
  id: string;
  op_id: string;
  produto: string;
  status: StatusCol;
  pecas: number;
  data_inicio?: string;
  data_fim?: string;
}

const ProductionPanel: React.FC = () => {
  const [ops, setOps] = useState<OrdemProducao[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOPs = async () => {
    try {
      const res = await fetch('/api/production');
      const json = await res.json();
      if (json.success) setOps(json.data);
    } catch (e) {
      console.error('Erro ao buscar Ordens de Produção');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOPs();
    const interval = setInterval(fetchOPs, 10000); // Poll a cada 10s para simulado real-time
    return () => clearInterval(interval);
  }, []);

  const avancarStatus = async (op: OrdemProducao) => {
    const fluxo: StatusCol[] = ["PENDENTE", "CORTE", "MONTAGEM", "FINALIZADA"];
    const index = fluxo.indexOf(op.status);
    const novoStatus = fluxo[index + 1] || op.status;

    if (novoStatus === op.status) return;

    try {
      const res = await fetch('/api/production', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ op_id: op.op_id, status: novoStatus })
      });
      const json = await res.json();
      if (json.success) {
        // Atualização otimista
        setOps(prev => prev.map(o => o.op_id === op.op_id ? json.data : o));
      }
    } catch (e) {
      console.error('Erro ao atualizar status da OP');
    }
  };

  const colunas: { id: StatusCol, label: string, color: string }[] = [
    { id: "PENDENTE", label: "Aguardando", color: "var(--text-muted)" },
    { id: "CORTE", label: "Corte / Preparação", color: "#f59e0b" },
    { id: "MONTAGEM", label: "Montagem / Acabamento", color: "#3b82f6" },
    { id: "FINALIZADA", label: "Finalizado", color: "#10b981" }
  ];

  if (loading && ops.length === 0) return <div style={{ padding: '2rem', color: 'var(--text-muted)' }}>Sincronizando com chão de fábrica...</div>;

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
              {ops.filter(o => o.status === col.id).length}
            </span>
          </header>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {ops.filter(o => o.status === col.id).map(op => (
              <div key={op.id} className="card-hover" style={{ 
                background: 'rgba(255,255,255,0.03)', 
                borderRadius: '16px', 
                padding: '1rem', 
                border: '1px solid rgba(255,255,255,0.05)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                transition: 'transform 0.2s ease'
              }}>
                <div style={{ marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: '700' }}>
                    #{op.op_id}
                  </span>
                  <span style={{ fontSize: '0.65rem', padding: '1px 6px', background: `${col.color}22`, color: col.color, borderRadius: '4px', fontWeight: 'bold' }}>
                    {op.pecas} PEÇAS
                  </span>
                </div>
                
                <h4 style={{ fontSize: '1rem', fontWeight: '700', marginBottom: '0.25rem' }}>{op.produto}</h4>
                
                <div style={{ margin: '0.75rem 0', padding: '0.5rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>📅 Previsão:</span>
                    <span style={{ fontSize: '0.65rem', fontWeight: 'bold', color: op.data_prevista_entrega && new Date(op.data_prevista_entrega).getTime() < Date.now() ? '#ef4444' : 'var(--text)' }}>
                      {op.data_prevista_entrega ? new Date(op.data_prevista_entrega).toLocaleDateString('pt-BR') : 'Calculando...'}
                    </span>
                  </div>
                  {op.data_prevista_entrega && new Date(op.data_prevista_entrega).getTime() < Date.now() && op.status !== 'FINALIZADA' && (
                    <div className="pulse" style={{ fontSize: '0.6rem', color: '#ef4444', fontWeight: '900', textAlign: 'right', textTransform: 'uppercase' }}>⚠️ EM ATRASO</div>
                  )}
                  <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                    <span style={{ fontSize: '0.55rem', color: 'var(--text-muted)' }}>⏱️ Corte: {op.tempo_previsto_corte || 0}m</span>
                    <span style={{ fontSize: '0.55rem', color: 'var(--text-muted)' }}>⏱️ Mont: {op.tempo_previsto_montagem || 0}m</span>
                  </div>
                </div>

                {op.data_inicio && (
                  <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                    🛠️ Iniciado: {new Date(op.data_inicio).toLocaleTimeString('pt-BR')}
                  </p>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginTop: '1rem' }}>
                  {col.id !== "FINALIZADA" && (
                    <button 
                      onClick={() => avancarStatus(op)}
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
