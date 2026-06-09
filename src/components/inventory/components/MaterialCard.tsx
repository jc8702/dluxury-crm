import React from 'react';
import type { Material, CategoriaMaterial } from '../../../types/entities';
import { statusEstoque, converterParaUso } from '../../../utils/estoque';
import { Pencil, Trash2, Package } from 'lucide-react';
import { Card, Badge, Button } from '../../ui';

interface MaterialCardProps {
  material: Material;
  categoria?: CategoriaMaterial;
  onClick: (m: Material) => void;
  onEdit?: (m: Material) => void;
  onDelete?: (m: Material) => void;
}

const MaterialCard: React.FC<MaterialCardProps> = ({
  material,
  categoria,
  onClick,
  onEdit,
  onDelete,
}) => {
  const status = statusEstoque(material.estoque_atual, material.estoque_minimo);

  const getStatusConfig = (s: string) => {
    switch (s) {
      case 'ok':
        return { tone: 'success' as const, label: '✓ OK' };
      case 'alerta':
        return { tone: 'warning' as const, label: '⚠ ALERTA' };
      case 'critico':
        return { tone: 'danger' as const, label: '‼ CRÍTICO' };
      case 'zerado':
        return { tone: 'neutral' as const, label: '○ ZERADO' };
      default:
        return { tone: 'neutral' as const, label: '—' };
    }
  };

  const config = getStatusConfig(status);
  const toneColor = {
    success: 'var(--ui-color-success)',
    warning: 'var(--ui-color-warning)',
    danger: 'var(--ui-color-danger)',
    neutral: 'var(--ui-text-muted)',
  }[config.tone];

  return (
    <Card
      variant="default"
      padding="md"
      interactive
      className="flex flex-col gap-3 min-h-[190px] cursor-pointer"
      onClick={() => onClick(material)}
      style={{ borderLeft: `3px solid ${toneColor}` }}
    >
      <div className="flex justify-between items-start">
        <div className="w-[38px] h-[38px] rounded-[var(--ui-radius-xs)] bg-[var(--ui-bg-subtle)] flex items-center justify-center text-[var(--ui-text-secondary)]">
          <Package size={18} />
        </div>
        <div className="flex items-center gap-2">
          {onEdit && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(material);
              }}
              title="Editar material"
            >
              <Pencil size={16} />
            </Button>
          )}
          {onDelete && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(material);
              }}
              title="Excluir material"
              className="text-[var(--ui-color-danger)]"
            >
              <Trash2 size={16} />
            </Button>
          )}
          <Badge tone={config.tone} size="sm">
            {config.label}
          </Badge>
        </div>
      </div>

      <div>
        <p className="text-xs text-[var(--ui-text-secondary)] font-mono mb-0.5">
          {material.sku || 'SEM SKU'}
        </p>
        <h4 className="text-[15px] font-bold m-0 leading-snug text-[var(--ui-text-primary)]">
          {material.nome || 'Material sem nome'}
        </h4>
        <p className="text-[11px] text-[var(--ui-text-secondary)] mt-1">
          {categoria?.nome || 'Sem categoria'}
        </p>
        <div className="flex gap-3 mt-1.5 pt-1.5 border-t border-[var(--ui-border)] text-[11px]">
          {material.marca && (
            <div>
              <span className="text-[10px] text-[var(--ui-text-secondary)] uppercase block">
                Marca
              </span>
              <span className="text-xs font-semibold">{material.marca}</span>
            </div>
          )}
          {material.fornecedor_principal && (
            <div>
              <span className="text-[10px] text-[var(--ui-text-secondary)] uppercase block">
                Fornecedor
              </span>
              <span className="text-xs font-semibold">{material.fornecedor_principal}</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-between items-center px-3 py-2 rounded-[var(--ui-radius-sm)] bg-[var(--ui-color-gold-50)]">
        <span className="text-[10px] font-bold uppercase text-[var(--ui-color-gold-500)]">
          Custo Compra
        </span>
        <span className="text-sm font-extrabold text-[var(--ui-color-gold-500)]">
          R${' '}
          {Number(material.preco_custo || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
        </span>
      </div>

      <div className="mt-auto flex justify-between items-end border-t border-[var(--ui-border)] pt-3">
        <div>
          <p className="text-[10px] text-[var(--ui-text-secondary)] mb-0.5">Disponível</p>
          <p className="text-base font-extrabold m-0" style={{ color: toneColor }}>
            {material.estoque_atual}{' '}
            <span className="text-[11px] font-normal text-[var(--ui-text-secondary)]">
              {material.unidade_compra}
            </span>
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-[var(--ui-text-secondary)] mb-0.5">Equivalente</p>
          <p className="text-xs font-semibold text-[var(--ui-text-secondary)]">
            {converterParaUso(material.estoque_atual, material.fator_conversao).toFixed(2)}{' '}
            {material.unidade_uso}
          </p>
        </div>
      </div>
    </Card>
  );
};

export default MaterialCard;
