import React from 'react';
import { useSimulation } from '../../../context/simulator/SimulationContext';

export const ScenarioManager: React.FC = () => {
  const { input, result, scenarioA, saveAsScenarioA, clearScenarioA } = useSimulation();

  if (!result) return null;

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const lucroDiff = result.totalMonthlyProfit - (scenarioA?.result.totalMonthlyProfit ?? 0);
  const lucroColor = lucroDiff > 0 ? 'var(--success)' : lucroDiff < 0 ? 'var(--danger, #ef4444)' : 'var(--text-muted)';
  const lucroLabel = lucroDiff > 0 ? '▲ GANHO' : lucroDiff < 0 ? '▼ PERDA' : '—';

  return (
    <div className="card" style={{ padding: '1.2rem', borderRadius: 'var(--radius-lg)', marginBottom: '1.5rem', background: 'var(--surface)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h4 style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Comparador de Cenários</h4>
        {!scenarioA ? (
          <button 
            onClick={saveAsScenarioA}
            className="btn btn-primary"
            style={{ padding: '4px 10px', borderRadius: '4px', fontSize: '0.6rem', fontWeight: 800, cursor: 'pointer', textAlign: 'center' }}
          >
            FIXAR COMO CENÁRIO A
          </button>
        ) : (
          <button 
            onClick={clearScenarioA}
            className="btn btn-secondary"
            style={{ padding: '4px 10px', borderRadius: '4px', fontSize: '0.6rem', fontWeight: 800, cursor: 'pointer', textAlign: 'center' }}
          >
            RESETAR COMPARAÇÃO
          </button>
        )}
      </div>

      {scenarioA && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '5px', fontSize: '0.6rem', fontWeight: 800, color: 'var(--text-muted)', textAlign: 'center', paddingBottom: '5px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ textAlign: 'left' }}>MÉTRICA</div>
            <div style={{ color: 'var(--secondary)' }}>CENÁRIO A</div>
            <div style={{ color: 'var(--primary)' }}>AO VIVO (B)</div>
          </div>

          {[
            { label: 'Vigência', valA: `${scenarioA.input.contractMonths}m`, valB: `${input.contractMonths}m` },
            { label: 'Faturamento', valA: formatCurrency(scenarioA.result.totalMonthlyRevenue), valB: formatCurrency(result.totalMonthlyRevenue) },
            { label: 'Lucro Projeto', valA: formatCurrency(scenarioA.result.totalMonthlyProfit), valB: formatCurrency(result.totalMonthlyProfit) },
            { label: 'Margem Média', valA: `${(scenarioA.result.averageMargin * 100).toFixed(1)}%`, valB: `${(result.averageMargin * 100).toFixed(1)}%` },
          ].map((row, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '5px', fontSize: '0.72rem', textAlign: 'center' }}>
              <div style={{ textAlign: 'left', color: 'var(--text-dim)', fontSize: '0.65rem' }}>{row.label}</div>
              <div style={{ fontWeight: 700, opacity: 0.8 }}>{row.valA}</div>
              <div style={{ fontWeight: 900, color: 'var(--primary)' }}>{row.valB}</div>
            </div>
          ))}

        <div style={{ marginTop: '0.5rem', padding: '0.6rem', background: 'rgba(59, 130, 246, 0.05)', borderRadius: '6px', border: `1px dashed ${lucroColor}`, textAlign: 'center' }}>
           <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Diferença de Lucro: </span>
           <span style={{ fontSize: '0.8rem', fontWeight: 900, color: lucroColor }}>
              {lucroLabel} {formatCurrency(Math.abs(lucroDiff))}
           </span>
           {lucroDiff === 0 && (
             <div style={{ fontSize: '0.55rem', color: 'var(--text-muted)', marginTop: '2px', fontStyle: 'italic' }}>
               {result.averageMargin === 0 ? 'Ambos em MG0% — preço de equilíbrio, lucro zero por design' : 'Cenários idênticos'}
             </div>
           )}
        </div>
        </div>
      )}

      {!scenarioA && (
        <p style={{ fontSize: '0.65rem', color: 'var(--text-dim)', fontStyle: 'italic', textAlign: 'center' }}>
          Gere uma simulação e clique em "Fixar" para comparar com outros prazos ou volumes em tempo real.
        </p>
      )}
    </div>
  );
};
