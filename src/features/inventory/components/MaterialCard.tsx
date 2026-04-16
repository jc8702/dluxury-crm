import React from 'react';
import type { Material, CategoriaMaterial } from '../../../context/AppContext';
import { statusEstoque, converterParaUso, valorEmEstoque } from '../../../utils/estoque';
import * as Lucide from 'lucide-react';

interface MaterialCardProps {
  material: Material;
  categoria?: CategoriaMaterial;
  onClick: (m: Material) => void;
}

const MaterialCard: React.FC<MaterialCardProps> = ({ material, categoria, onClick }) => {
  const status = statusEstoque(material.estoque_atual, material.estoque_minimo);
  
  // Mapeamento dinâmico do ícone Lucide
  const IconComponent = (Lucide as any)[categoria?.icone || 'Package'] || Lucide.Package;

  const getStatusConfig = (s: string) => {
    switch (s) {
      case 'ok': return { color: '#10b981', label: '✓ OK', bg: 'rgba(16,185,129,0.1)' };
      case 'alerta': return { color: '#f59e0b', label: '⚠ ALERTA', bg: 'rgba(245,158,11,0.1)' };
      case 'critico': return { color: '#ef4444', label: '‼ CRÍTICO', bg: 'rgba(239,68,68,0.1)' };
      case 'zerado': return { color: '#94a3b8', label: '○ ZERADO', bg: 'rgba(148,163,184,0.1)' };
      default: return { color: '#94a3b8', label: '—', bg: 'transparent' };
    }
  };

  const config = getStatusConfig(status);

  return (
    <div 
      onClick={() => onClick(material)}
      className="card hover-scale"
      style={{ 
        padding: '1.25rem', 
        cursor: 'pointer',
        borderLeft: `4px solid ${config.color}`,
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        minHeight: '200px'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ 
          width: '40px', 
          height: '40px', 
          borderRadius: '8px', 
          background: 'rgba(255,255,255,0.05)', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          color: '#d4af37'
        }}>
          <IconComponent size={20} />
        </div>
        <span style={{ 
          fontSize: '0.65rem', 
          padding: '0.25rem 0.5rem', 
          borderRadius: '12px', 
          background: config.bg, 
          color: config.color,
          fontWeight: 'bold',
          letterSpacing: '0.05em'
        }}>
          {config.label}
        </span>
      </div>

      <div>
        <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'monospace', marginBottom: '0.2rem' }}>
          {material.sku}
        </p>
        <h4 style={{ fontSize: '1rem', fontWeight: '700', margin: 0, lineHeight: '1.4' }}>
          {material.nome}
        </h4>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>
          {categoria?.nome || 'Sem categoria'}
        </p>
      </div>

      <div style={{ marginTop: 'auto', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '0.1rem' }}>Disponível</p>
          <p style={{ fontSize: '1.1rem', fontWeight: '800', color: config.color }}>
            {material.estoque_atual} <span style={{ fontSize: '0.7rem', fontWeight: '400' }}>{material.unidade_compra}</span>
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '0.1rem' }}>Equivalente</p>
          <p style={{ fontSize: '0.85rem', fontWeight: '600' }}>
            {converterParaUso(material.estoque_atual, material.fator_conversao).toFixed(2)} {material.unidade_uso}
          </p>
        </div>
      </div>
    </div>
  );
};

export default MaterialCard;
