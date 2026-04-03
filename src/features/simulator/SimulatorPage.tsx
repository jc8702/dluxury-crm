import React from 'react';
import { ProductSlot } from './components/ProductSlot';
import { InvestmentForm } from './components/InvestmentForm';
import { PaymentConditionSelector } from './components/PaymentConditionSelector';
import { ResultsDashboard } from './components/ResultsDashboard';
import { ScenarioManager } from './components/ScenarioManager';
import { ProposalsHistory } from './components/ProposalsHistory';
import { useSimulation } from '../../context/simulator/SimulationContext';

export const SimulatorPage: React.FC = () => {
  const { input } = useSimulation();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <header style={{ 
        borderBottom: '1px solid var(--border)', 
        paddingBottom: '2rem', 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center' 
      }}>
        <div>
           <h1 style={{ fontSize: '2rem', fontWeight: 900, letterSpacing: '-0.02em', color: 'var(--text-main)' }}>Pricing Simulator PRO</h1>
           <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.4rem' }}>
             Simulação avançada de margens, subsídios e viabilidade comercial em tempo real.
           </p>
        </div>
        <div style={{ background: 'var(--primary-glow)', padding: '0.6rem 1.2rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--primary)', fontSize: '0.75rem', fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase' }}>
          VERSÃO ALTA FIDELIDADE V1.0
        </div>
      </header>

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'minmax(400px, 1fr) 380px', 
        gap: '2.5rem',
        alignItems: 'start'
      }}>
        {/* Esquerda: Itens da Simulação */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <section style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <h2 style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-dim)', letterSpacing: '0.12em' }}>Modelos do Projeto</h2>
                {input.slots.map((_, idx) => (
                <ProductSlot key={idx} index={idx} />
                ))}
            </section>
            
            <ProposalsHistory />
        </div>

        {/* Direita: Controles e Resultados */}
        <aside style={{ display: 'flex', flexDirection: 'column', gap: '2rem', position: 'sticky', top: '2.5rem' }}>
           <ScenarioManager />
           <InvestmentForm />
           <PaymentConditionSelector />
           <ResultsDashboard />
        </aside>
      </div>
    </div>
  );
};
