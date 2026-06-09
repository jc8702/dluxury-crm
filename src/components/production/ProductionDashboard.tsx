import React, { useEffect, useState } from 'react';
import { Card } from '../../components/ui';

interface Metrics {
  totalOPs: number;
  finalizadas: number;
  emProducao: number;
  leadTimeMedio: number;
  taxaEficiencia: number;
  opsAtrasadas: number;
  filaTotalDias: number;
}

const cards: Array<{
  key: keyof Metrics;
  label: string;
  border: string;
  subtext: string;
  subcolor: string;
  formatter?: (v: number) => string;
}> = [
  {
    key: 'totalOPs',
    label: 'Total de OPs',
    border: 'var(--ui-color-gold-500)',
    subtext: '📊 Monitoramento Ativo',
    subcolor: 'var(--ui-color-success)',
  },
  {
    key: 'opsAtrasadas',
    label: 'Atrasos Críticos',
    border: 'var(--ui-color-danger)',
    subtext: '⚠️ Requer Atenção',
    subcolor: 'var(--ui-color-danger)',
  },
  {
    key: 'filaTotalDias',
    label: 'Carga de Fila',
    border: 'var(--ui-color-info)',
    subtext: '⏳ Prazo p/ Limpar Fila',
    subcolor: 'var(--ui-color-info)',
    formatter: (v) => `${v} dias`,
  },
  {
    key: 'taxaEficiencia',
    label: 'OEE / Eficiência',
    border: 'var(--ui-color-success)',
    subtext: '📈 Meta Mensal',
    subcolor: 'var(--ui-color-success)',
    formatter: (v) => `${v.toFixed(1)}%`,
  },
];

const ProductionDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchMetrics = async () => {
    try {
      const data = await api.production.getMetrics();
      setMetrics(data);
    } catch (e) {
      console.error('Erro ao buscar métricas de produção', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-32 rounded-[var(--ui-radius-lg)] bg-[var(--ui-bg-subtle)] animate-pulse"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
      {cards.map((c) => {
        const value = metrics ? metrics[c.key] : 0;
        const isAtraso = c.key === 'opsAtrasadas';
        const valColor =
          isAtraso && value > 0 ? 'var(--ui-color-danger)' : 'var(--ui-text-primary)';

        return (
          <Card
            key={c.key}
            variant="elevated"
            padding="lg"
            className="flex flex-col gap-1"
            style={{ borderLeft: `4px solid ${c.border}` }}
          >
            <p className="text-[11px] font-extrabold uppercase tracking-[var(--ui-tracking-wide)] text-[var(--ui-text-secondary)] m-0">
              {c.label}
            </p>
            <p className="text-3xl font-black m-0 leading-tight" style={{ color: valColor }}>
              {c.formatter ? c.formatter(Number(value)) : value}
            </p>
            <p className="text-[11px] font-semibold m-0" style={{ color: c.subcolor }}>
              {c.subtext}
            </p>
          </Card>
        );
      })}
    </div>
  );
};

export default ProductionDashboard;
