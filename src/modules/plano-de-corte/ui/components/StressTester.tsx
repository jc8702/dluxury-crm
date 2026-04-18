import React, { useState } from 'react';
import type { ChapaMaterial } from '../../domain/entities/CuttingPlan';
import { Zap, FlaskConical, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';

interface StressTesterProps {
  onInject: (materiais: ChapaMaterial[]) => void;
}

export const StressTester: React.FC<StressTesterProps> = ({ onInject }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [numMats, setNumMats] = useState(3);
  const [numPecasPerMat, setNumPecasPerMat] = useState(15);

  const runTest = () => {
    const novosMateriais: ChapaMaterial[] = [];
    
    for (let i = 0; i < numMats; i++) {
        const matId = Math.random().toString(36).substr(2, 9);
        novosMateriais.push({
            id: matId,
            sku: `MDF-STRESS-${i + 1}`,
            nome: `Teste de Carga ${i + 1}`,
            largura_mm: 2750,
            altura_mm: 1840,
            espessura_mm: 18,
            pecas: Array.from({ length: numPecasPerMat }).map((_, j) => ({
                id: Math.random().toString(36).substr(2, 9),
                nome: `Peça ${i+1}-${j+1}`,
                largura_mm: 150 + Math.floor(Math.random() * 800),
                altura_mm: 100 + Math.floor(Math.random() * 600),
                quantidade: 1 + Math.floor(Math.random() * 3),
                rotacionavel: true
            }))
        });
    }
    
    onInject(novosMateriais);
    setIsOpen(false);
  };

  const styles = {
    container: { marginBottom: '1.5rem', border: '1px solid rgba(212, 175, 55, 0.2)', borderRadius: '12px', background: 'rgba(212, 175, 55, 0.05)', overflow: 'hidden' },
    header: { padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' },
    content: { padding: '0 16px 16px', display: 'flex', flexDirection: 'column' as const, gap: '1rem' }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header} onClick={() => setIsOpen(!isOpen)}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary)' }}>
          <FlaskConical size={16} />
          <span style={{ fontSize: '0.7rem', fontWeight: '900', letterSpacing: '0.1em' }}>LABORATÓRIO DE ESTRESSE</span>
        </div>
        {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </div>

      {isOpen && (
        <div style={styles.content} className="animate-fade-in">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label className="label-base" style={{ fontSize: '0.6rem' }}>MATERIAIS</label>
              <input type="number" value={numMats} onChange={e => setNumMats(Number(e.target.value))} className="input" />
            </div>
            <div>
              <label className="label-base" style={{ fontSize: '0.6rem' }}>PEÇAS / MAT</label>
              <input type="number" value={numPecasPerMat} onChange={e => setNumPecasPerMat(Number(e.target.value))} className="input" />
            </div>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
            <AlertTriangle size={14} style={{ color: 'var(--danger)' }} />
            <p style={{ fontSize: '0.65rem', color: 'var(--danger)', margin: 0, fontWeight: '600' }}>
               Atenção: Aumentar o volume de dados testa a estabilidade do Web Worker.
            </p>
          </div>

          <button onClick={runTest} className="btn" style={{ background: 'var(--primary)', color: 'var(--primary-text)', fontWeight: '900', width: '100%', gap: '8px' }}>
            <Zap size={16} fill="currentColor" /> INJETAR CARGA
          </button>
        </div>
      )}
    </div>
  );
};
