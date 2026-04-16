import React from 'react';
import type { Material, CategoriaMaterial } from '../../../context/AppContext';
import { statusEstoque, converterParaUso } from '../../../utils/estoque';
import { Pencil, Trash2, Package } from 'lucide-react';

interface MaterialCardProps {
  material: Material;
  categoria?: CategoriaMaterial;
  onClick: (m: Material) => void;
  onEdit?: (m: Material) => void;
  onDelete?: (m: Material) => void;
}

const MaterialCard: React.FC<MaterialCardProps> = ({ material, categoria, onClick, onEdit, onDelete }) => {
  const status = statusEstoque(material.estoque_atual, material.estoque_minimo);
  
  const IconComponent = Package;

  const getStatusConfig = (s: string) => {
    switch (s) {
      case 'ok': return { color: 'var(--success)', label: '✓ OK', bg: 'rgba(34,197,94,0.1)' };
      case 'alerta': return { color: 'var(--warning)', label: '⚠ ALERTA', bg: 'rgba(245,158,11,0.1)' };
      case 'critico': return { color: 'var(--danger)', label: '‼ CRÍTICO', bg: 'rgba(239,68,68,0.12)' };
      case 'zerado': return { color: 'var(--text-muted)', label: '○ ZERADO', bg: 'var(--badge-bg)' };
      default: return { color: 'var(--text-muted)', label: '—', bg: 'transparent' };
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
        borderLeft: `3px solid ${config.color}`,
        display: 'flex',
        flexDirection: 'column',
        gap: '0.85rem',
        minHeight: '190px'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ 
          width: '38px', height: '38px', borderRadius: 'var(--radius-xs)', 
          background: 'var(--icon-bg)', 
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--icon-color)'
        }}>
          <IconComponent size={18} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {onEdit && (
            <button 
              onClick={(e) => { e.stopPropagation(); onEdit(material); }}
              style={{ 
                all: 'unset', 
                cursor: 'pointer',
                padding: '0.25rem',
                borderRadius: '4px',
                color: 'var(--text-muted)',
                transition: 'color 0.2s'
              }}
              title="Editar material"
            >
              <Pencil size={16} />
            </button>
          )}
          {onDelete && (
            <button 
              onClick={(e) => { e.stopPropagation(); onDelete(material); }}
              style={{ 
                all: 'unset', 
                cursor: 'pointer',
                padding: '0.25rem',
                borderRadius: '4px',
                color: 'var(--text-muted)',
                transition: 'color 0.2s'
              }}
              title="Excluir material"
            >
              <Trash2 size={16} />
            </button>
          )}
          <span style={{ 
            fontSize: '0.65rem', padding: '0.2rem 0.5rem', borderRadius: '12px', 
            background: config.bg, color: config.color,
            fontWeight: '700', letterSpacing: '0.04em'
          }}>
            {config.label}
          </span>
        </div>
      </div>

      <div>
        <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'monospace', marginBottom: '0.15rem' }}>
          {material.sku || 'SEM SKU'}
        </p>
        <h4 style={{ fontSize: '0.95rem', fontWeight: '700', margin: 0, lineHeight: '1.35', color: 'var(--text)' }}>
          {material.nome || 'Material sem nome'}
        </h4>
        <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
          {categoria?.nome || 'Sem categoria'}
        </p>
      </div>

      <div style={{ 
        marginTop: 'auto', borderTop: '1px solid var(--border)', 
        paddingTop: '0.85rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' 
      }}>
        <div>
          <p style={{ fontSize: '0.62rem', color: 'var(--text-muted)', marginBottom: '0.1rem' }}>Disponível</p>
          <p style={{ fontSize: '1.05rem', fontWeight: '800', color: config.color }}>
            {material.estoque_atual} <span style={{ fontSize: '0.68rem', fontWeight: '400', color: 'var(--text-muted)' }}>{material.unidade_compra}</span>
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ fontSize: '0.62rem', color: 'var(--text-muted)', marginBottom: '0.1rem' }}>Equivalente</p>
          <p style={{ fontSize: '0.82rem', fontWeight: '600', color: 'var(--text-secondary)' }}>
            {converterParaUso(material.estoque_atual, material.fator_conversao).toFixed(2)} {material.unidade_uso}
          </p>
        </div>
      </div>
    </div>
  );
};

export default MaterialCard;
