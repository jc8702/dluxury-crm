import React from 'react';
import { useSimulation } from '../../../context/simulator/SimulationContext';
import type { SimulationInput } from '../../../types/simulator';

export const InvestmentForm: React.FC = () => {
  const { input, updateInput } = useSimulation();

  const handleChange = (field: keyof typeof input.investment, value: string) => {
    updateInput({
      investment: {
        ...input.investment,
        [field]: parseFloat(value) || 0
      }
    });
  };

  return (
    <div className="card" style={{ padding: '1.5rem', borderRadius: 'var(--radius-lg)', display: 'flex', flexDirection: 'column', gap: '1.2rem', background: 'var(--surface)' }}>
      <header>
        <span style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Parâmetros Globais</span>
        <h3 style={{ fontSize: '1rem', marginTop: '0.2rem' }}>Investimento & C.F.</h3>
      </header>

      <div style={{ display: 'grid', gap: '0.8rem' }}>
        <div className="input-group">
          <label style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-dim)', marginBottom: '0.4rem' }}>Vigência Contrato (Meses)</label>
          <select 
            value={input.contractMonths} 
            onChange={(e) => updateInput({ contractMonths: parseInt(e.target.value) })}
            className="input"
            style={{ width: '100%' }}
          >
            {[6, 12, 18, 24, 36, 48, 60].map(m => (
              <option key={m} value={m}>{m} meses</option>
            ))}
          </select>
        </div>

        <div className="input-group">
          <label style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-dim)', marginBottom: '0.4rem' }}>Equipamentos (R$)</label>
          <input 
            type="number" 
            placeholder="0.00"
            value={input.investment.equipment || ''} 
            onChange={(e) => handleChange('equipment', e.target.value)}
            className="input"
            style={{ width: '100%', fontSize: '0.9rem' }}
          />
        </div>

        <div className="input-group">
          <label style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-dim)', marginBottom: '0.4rem' }}>Impressora (R$)</label>
          <input 
            type="number" 
            placeholder="0.00"
            value={input.investment.printer || ''} 
            onChange={(e) => handleChange('printer', e.target.value)}
            className="input"
            style={{ width: '100%', fontSize: '0.9rem' }}
          />
        </div>

        <div className="input-group">
          <label style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-dim)', marginBottom: '0.4rem' }}>Implantação (R$)</label>
          <input 
            type="number" 
            placeholder="0.00"
            value={input.investment.implant || ''} 
            onChange={(e) => handleChange('implant', e.target.value)}
            className="input"
            style={{ width: '100%', fontSize: '0.9rem' }}
          />
        </div>

        <div className="input-group">
          <label style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-dim)', marginBottom: '0.4rem' }}>Mensalidade (R$)</label>
          <input 
            type="number" 
            placeholder="0.00"
            value={input.investment.monthly || ''} 
            onChange={(e) => handleChange('monthly', e.target.value)}
            className="input"
            style={{ width: '100%', fontSize: '0.9rem' }}
          />
        </div>

        <div className="input-group" style={{ border: '1.5px dashed var(--primary)', padding: '0.8rem', borderRadius: '8px', background: 'rgba(147, 51, 234, 0.05)' }}>
          <label style={{ display: 'block', fontSize: '0.7rem', color: 'var(--primary)', fontWeight: 800, marginBottom: '0.4rem', textTransform: 'uppercase' }}>Comissão Integrador</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input 
              type="number" 
              placeholder="0.00"
              step="0.01"
              value={input.investment.commission || ''} 
              onChange={(e) => handleChange('commission', e.target.value)}
              className="input"
              style={{ flex: 1, fontSize: '1rem', fontWeight: 'bold', color: 'var(--primary)', border: 'none', background: 'transparent', padding: 0 }}
            />
            <span style={{ fontSize: '0.6rem', color: 'var(--primary)', fontWeight: 700 }}>cents/un</span>
          </div>
        </div>

        <div style={{ padding: '1rem', background: 'var(--surface-top)', borderRadius: 'var(--radius-sm)', marginTop: '0.5rem' }}>
          <div className="input-group">
            <label style={{ display: 'block', fontSize: '0.7rem', color: 'var(--primary)', fontWeight: 700, marginBottom: '0.4rem' }}>Custo Financeiro (%)</label>
            <input 
              type="number" 
              placeholder="0.0"
              step="0.1"
              value={input.cfPct * 100 || ''} 
              onChange={(e) => updateInput({ cfPct: (parseFloat(e.target.value) / 100) || 0 })}
              className="input"
              style={{ width: '100%', fontSize: '1rem', fontWeight: 'bold' }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
