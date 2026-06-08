import React from 'react';
import ProductionPanel from './ProductionPanel';
import ProductionDashboard from './ProductionDashboard';

const Production: React.FC = () => {
  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2 style={{ fontSize: '1.875rem', fontWeight: 'bold' }}>Produção</h2>
          <p style={{ color: 'hsl(var(--muted-foreground))' }}>Acompanhe cada projeto na oficina — visão do marceneiro.</p>
        </div>
      </header>

      <>
        <ProductionDashboard />
        <ProductionPanel />
      </>
    </div>
  );
};

export default Production;

