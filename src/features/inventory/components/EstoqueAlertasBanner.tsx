import React, { useMemo } from 'react';
import { useAppContext } from '../../../context/AppContext';
import { AlertTriangle, PackageX } from 'lucide-react';

interface EstoqueAlertasBannerProps {
  onFilterCritico: () => void;
}

const EstoqueAlertasBanner: React.FC<EstoqueAlertasBannerProps> = ({ onFilterCritico }) => {
  const { materiais } = useAppContext();

  const alertas = useMemo(() => {
    const criticos = materiais.filter(m => Number(m.estoque_atual || 0) <= Number(m.estoque_minimo || 0) && Number(m.estoque_atual || 0) > 0);
    const zerados = materiais.filter(m => Number(m.estoque_atual || 0) === 0);
    
    return {
      criticos: criticos.length,
      zerados: zerados.length,
      total: criticos.length + zerados.length
    };
  }, [materiais]);

  if (alertas.total === 0) return null;

  return (
    <div 
      className="card animate-fade-in" 
      onClick={onFilterCritico}
      style={{ 
        padding: '1rem 1.5rem', 
        marginBottom: '2rem', 
        background: 'rgba(239, 68, 68, 0.1)', 
        border: '1px solid rgba(239, 68, 68, 0.2)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        cursor: 'pointer'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div style={{ 
          width: '40px', 
          height: '40px', 
          borderRadius: '50%', 
          background: 'rgba(239, 68, 68, 0.2)', 
          color: '#ef4444', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center' 
        }}>
          <AlertTriangle size={20} />
        </div>
        <div>
          <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: '700', color: '#ef4444' }}>
            Atenção ao Estoque
          </h4>
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Existem {alertas.total} itens que precisam de reposição imediata.
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '1.5rem' }}>
        {alertas.criticos > 0 && (
          <div style={{ textAlign: 'center' }}>
            <span style={{ display: 'block', fontSize: '1.25rem', fontWeight: '800', color: '#ef4444' }}>{alertas.criticos}</span>
            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Críticos</span>
          </div>
        )}
        {alertas.zerados > 0 && (
          <div style={{ textAlign: 'center' }}>
            <span style={{ display: 'block', fontSize: '1.25rem', fontWeight: '800', color: '#94a3b8' }}>{alertas.zerados}</span>
            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Zerados</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default EstoqueAlertasBanner;
