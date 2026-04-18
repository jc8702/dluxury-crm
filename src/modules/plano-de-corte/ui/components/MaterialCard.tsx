import React, { useState } from 'react';
import type { ChapaMaterial, PecaCorte as Peca } from '../../domain/entities/CuttingPlan';
import { Trash2, Plus, Scissors, ChevronDown, ChevronUp, Layers, Square, Box } from 'lucide-react';

interface MaterialCardProps {
  material: ChapaMaterial;
  onUpdate: (material: Partial<ChapaMaterial>) => void;
  onRemove: () => void;
}

export const MaterialCard: React.FC<MaterialCardProps> = ({ material, onUpdate, onRemove }) => {
  const [expanded, setExpanded] = useState(true);

  const addPeca = () => {
    const novaPeca: Peca = {
      id: Math.random().toString(36).substr(2, 9),
      nome: `Peça ${material.pecas.length + 1}`,
      largura_mm: 500,
      altura_mm: 400,
      quantidade: 1,
      rotacionavel: true
    };
    onUpdate({ pecas: [...material.pecas, novaPeca] });
  };

  const updatePeca = (id: string, upd: Partial<Peca>) => {
    const pecas = material.pecas.map(p => p.id === id ? { ...p, ...upd } : p);
    onUpdate({ pecas });
  };

  const removePeca = (id: string) => {
    onUpdate({ pecas: material.pecas.filter(p => p.id !== id) });
  };

  const styles = {
    card: { marginBottom: '1rem', border: '1px solid var(--border)', overflow: 'hidden', borderRadius: '12px' },
    header: { padding: '1rem', background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', borderBottom: expanded ? '1px solid var(--border)' : 'none' },
    content: { padding: '1rem', background: 'var(--background)' },
    titleInfo: { display: 'flex', alignItems: 'center', gap: '0.75rem' },
    pecaRow: { display: 'grid', gridTemplateColumns: '1fr 60px 60px 40px 30px', gap: '8px', alignItems: 'center', marginBottom: '8px', padding: '0.5rem', borderRadius: '8px', background: 'var(--surface)', border: '1px solid transparent' }
  };

  return (
    <div style={styles.card} className="card shadow-sm animate-fade-in">
      <div style={styles.header} onClick={() => setExpanded(!expanded)}>
        <div style={styles.titleInfo}>
          <div style={{ padding: '6px', borderRadius: '6px', background: 'rgba(212,175,55,0.1)' }}>
            <Box size={18} style={{ color: 'var(--primary)' }} />
          </div>
          <div>
            <div style={{ fontWeight: '800', fontSize: '0.9rem' }}>{material.sku}</div>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{material.largura_mm}x{material.altura_mm}x{material.espessura_mm}mm</div>
          </div>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="badge" style={{ fontSize: '0.65rem' }}>{material.pecas.length} peças</span>
          <button onClick={(e) => { e.stopPropagation(); onRemove(); }} className="btn btn-outline" style={{ padding: '4px', border: 'none', color: 'var(--danger)' }}>
            <Trash2 size={16} />
          </button>
          {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </div>
      </div>

      {expanded && (
        <div style={styles.content}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <div>
              <label className="label-base" style={{ fontSize: '0.6rem' }}>LARGURA (mm)</label>
              <input type="number" value={material.largura_mm} onChange={e => onUpdate({ largura_mm: Number(e.target.value) })} className="input" style={{ padding: '6px' }} />
            </div>
            <div>
              <label className="label-base" style={{ fontSize: '0.6rem' }}>ALTURA (mm)</label>
              <input type="number" value={material.altura_mm} onChange={e => onUpdate({ altura_mm: Number(e.target.value) })} className="input" style={{ padding: '6px' }} />
            </div>
            <div>
              <label className="label-base" style={{ fontSize: '0.6rem' }}>ESPESSURA</label>
              <input type="number" value={material.espessura_mm} onChange={e => onUpdate({ espessura_mm: Number(e.target.value) })} className="input" style={{ padding: '6px', color: 'var(--primary)', fontWeight: 'bold' }} />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.7rem', fontWeight: '900', color: 'var(--text-muted)' }}>
              <Scissors size={14} /> LISTA DE PEÇAS
            </div>
            <button onClick={addPeca} className="btn badge" style={{ background: 'var(--primary)', color: 'var(--primary-text)', cursor: 'pointer' }}>
              + PEÇA
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ ...styles.pecaRow, background: 'transparent', border: 'none', height: '15px' }}>
              <span style={{ fontSize: '0.55rem', color: 'var(--text-muted)', fontWeight: '900' }}>DESCRIÇÃO</span>
              <span style={{ fontSize: '0.55rem', color: 'var(--text-muted)', textAlign: 'center' }}>LARG.</span>
              <span style={{ fontSize: '0.55rem', color: 'var(--text-muted)', textAlign: 'center' }}>ALT.</span>
              <span style={{ fontSize: '0.55rem', color: 'var(--text-muted)', textAlign: 'center' }}>QTD.</span>
              <span />
            </div>
            {material.pecas.map(p => (
              <div key={p.id} style={styles.pecaRow} className="hover-scale">
                <input 
                  value={p.nome} 
                  onChange={e => updatePeca(p.id, { nome: e.target.value })} 
                  className="input" 
                  style={{ border: 'none', background: 'transparent', padding: 0, fontWeight: '600', fontSize: '0.75rem' }} 
                />
                <input 
                  type="number" 
                  value={p.largura_mm} 
                  onChange={e => updatePeca(p.id, { largura_mm: Number(e.target.value) })} 
                  className="input" 
                  style={{ border: 'none', background: 'rgba(255,255,255,0.03)', padding: '2px', textAlign: 'center', fontSize: '0.75rem' }} 
                />
                <input 
                  type="number" 
                  value={p.altura_mm} 
                  onChange={e => updatePeca(p.id, { altura_mm: Number(e.target.value) })} 
                  className="input" 
                  style={{ border: 'none', background: 'rgba(255,255,255,0.03)', padding: '2px', textAlign: 'center', fontSize: '0.75rem' }} 
                />
                <input 
                  type="number" 
                  value={p.quantidade} 
                  onChange={e => updatePeca(p.id, { quantidade: Number(e.target.value) })} 
                  className="input" 
                  style={{ border: 'none', background: 'transparent', padding: 0, textAlign: 'center', fontWeight: '800', color: 'var(--primary)', fontSize: '0.75rem' }} 
                />
                <button onClick={() => removePeca(p.id)} style={{ border: 'none', background: 'transparent', color: 'var(--danger)', opacity: 0.4, cursor: 'pointer' }} className="hover-scale">
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
