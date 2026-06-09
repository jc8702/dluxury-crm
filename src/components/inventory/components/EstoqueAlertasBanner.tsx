import React, { useMemo } from 'react';
import { useInventoryStore as useInventory } from '../../../stores/useInventoryStore';
import { AlertTriangle } from 'lucide-react';
import { Card } from '../../ui';

interface EstoqueAlertasBannerProps {
  onFilterCritico: () => void;
}

const EstoqueAlertasBanner: React.FC<EstoqueAlertasBannerProps> = ({ onFilterCritico }) => {
  const { materiais } = useInventory();

  const alertas = useMemo(() => {
    const criticos = materiais.filter(
      (m) =>
        Number(m.estoque_atual || 0) <= Number(m.estoque_minimo || 0) &&
        Number(m.estoque_atual || 0) > 0,
    );
    const zerados = materiais.filter((m) => Number(m.estoque_atual || 0) === 0);

    return {
      criticos: criticos.length,
      zerados: zerados.length,
      total: criticos.length + zerados.length,
    };
  }, [materiais]);

  if (alertas.total === 0) return null;

  return (
    <Card
      variant="flat"
      padding="md"
      interactive
      onClick={onFilterCritico}
      className="flex items-center justify-between mb-8 animate-fade-in"
      style={{
        background: 'var(--ui-color-danger-soft)',
        borderColor: 'var(--ui-color-danger)',
      }}
    >
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-full bg-[var(--ui-color-danger-soft)] flex items-center justify-center text-[var(--ui-color-danger)] border border-[var(--ui-color-danger)]/30">
          <AlertTriangle size={20} />
        </div>
        <div>
          <h4 className="m-0 text-base font-bold text-[var(--ui-color-danger)]">
            Atenção ao Estoque
          </h4>
          <p className="m-0 text-sm text-[var(--ui-text-secondary)]">
            Existem {alertas.total} itens que precisam de reposição imediata.
          </p>
        </div>
      </div>

      <div className="flex gap-6">
        {alertas.criticos > 0 && (
          <div className="text-center">
            <span className="block text-xl font-extrabold text-[var(--ui-color-danger)]">
              {alertas.criticos}
            </span>
            <span className="text-[10px] text-[var(--ui-text-secondary)] uppercase">Críticos</span>
          </div>
        )}
        {alertas.zerados > 0 && (
          <div className="text-center">
            <span className="block text-xl font-extrabold text-[var(--ui-text-muted)]">
              {alertas.zerados}
            </span>
            <span className="text-[10px] text-[var(--ui-text-secondary)] uppercase">Zerados</span>
          </div>
        )}
      </div>
    </Card>
  );
};

export default EstoqueAlertasBanner;
