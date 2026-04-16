import React from 'react';
import { Settings2, Plus, Zap, Box, Ruler } from 'lucide-react';

const EngineeringPage: React.FC = () => {
  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '2.25rem', fontWeight: '900', color: 'var(--text)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Settings2 size={32} style={{ color: 'var(--primary)' }} /> Engenharia de Produto
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '1rem', marginTop: '0.25rem' }}>
             Definição de módulos paramétricos e regras de cálculo (BOM).
          </p>
        </div>
        <button className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.5rem' }}>
          <Plus size={20} /> Novo Módulo
        </button>
      </header>

      <div className="grid-3">
        <div className="card" style={{ padding: '2rem', textAlign: 'center', border: '2px dashed var(--border)', background: 'transparent' }}>
           <Box size={40} style={{ color: 'var(--text-muted)', marginBottom: '1rem', opacity: 0.5 }} />
           <p style={{ color: 'var(--text-muted)' }}>Módulo de engenharia em inicialização...</p>
        </div>
      </div>

      <section className="card" style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(10px)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
             <Zap size={20} style={{ color: '#d4af37' }} />
             <h3 style={{ margin: 0 }}>Motor de Cálculo (BOM Engine)</h3>
          </div>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: '1.6' }}>
            O motor de cálculo industrial já foi implementado no backend. Em breve, você poderá testar suas fórmulas diretamente nesta interface com pré-visualização em tempo real.
          </p>
      </section>
    </div>
  );
};

export default EngineeringPage;
