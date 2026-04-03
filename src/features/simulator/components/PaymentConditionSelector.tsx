import React, { useState } from 'react';
import { useSimulation } from '../../../context/simulator/SimulationContext';
import { INITIAL_PAYMENT_CONDITIONS } from '../../../services/dataService';

export const PaymentConditionSelector: React.FC = () => {
  const { input, updateInput } = useSimulation();
  const [showCfMenu, setShowCfMenu] = useState(false);

  const cfPct = input.cfPct;

  const handleSelect = (code: string, pct: number) => {
    const isActive = Math.abs(cfPct - pct) < 0.0001;
    // Toggle logic
    updateInput({ 
      paymentConditionCode: isActive ? '' : code,
      cfPct: isActive ? 0 : pct
    });
  };

  return (
    <div style={{ marginBottom: '2rem', width: '100%' }}>
      <div className="card" style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        padding: '0.8rem 1.5rem', 
        borderRadius: 'var(--radius-md)',
        marginBottom: '1rem',
        border: '1px solid var(--border)',
        background: 'var(--surface)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ background: 'var(--surface-top)', padding: '6px 12px', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
             <span style={{ color: 'var(--primary)', fontWeight: 900, fontSize: '0.8rem' }}>#</span>
             <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-main)' }}>
                {INITIAL_PAYMENT_CONDITIONS.find(p => Math.abs(p.pct - cfPct) < 0.0001)?.criterio || (cfPct === 0 ? 'Prazo do Projeto' : 'C.F. Manual')}
             </span>
             <span style={{ background: 'var(--secondary)', color: 'white', padding: '2px 8px', borderRadius: '50px', fontSize: '0.65rem', fontWeight: 800 }}>+{(cfPct * 100).toFixed(1)}%</span>
          </div>
          {cfPct > 0 && (
            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600 }}>Custo financeiro diluído</span>
          )}
        </div>

        <button 
          onClick={() => setShowCfMenu(!showCfMenu)}
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', color: 'var(--text-dim)', padding: '6px 14px', borderRadius: '6px', fontSize: '0.65rem', fontWeight: 700, cursor: 'pointer' }}
        >
          {showCfMenu ? 'FECHAR' : '+ EXPANDIR'}
        </button>
      </div>

      {showCfMenu && (
        <div className="card" style={{ 
          padding: '1.2rem', 
          borderRadius: 'var(--radius-sm)', 
          marginBottom: '1.5rem', 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', 
          gap: '0.6rem',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          animation: 'fadeIn 0.3s ease-out'
        }}>
          {INITIAL_PAYMENT_CONDITIONS.map(p => {
            const isActive = Math.abs(cfPct - p.pct) < 0.0001;
            return (
              <button 
                key={p.codigo}
                onClick={() => handleSelect(p.codigo, p.pct)}
                style={{
                  padding: '12px 8px',
                  borderRadius: '6px',
                  border: isActive ? '1.5px solid var(--primary)' : '1px solid var(--border)',
                  background: isActive ? 'var(--primary)' : 'var(--surface-top)',
                  color: 'white',
                  fontSize: '0.65rem',
                  fontWeight: isActive ? 800 : 500,
                  cursor: 'pointer',
                  textAlign: 'center',
                  transition: 'all 0.2s'
                }}
              >
                {p.criterio}<br/>
                <span style={{ opacity: 0.8, fontSize: '0.55rem' }}>({(p.pct * 100).toFixed(1)}%)</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
