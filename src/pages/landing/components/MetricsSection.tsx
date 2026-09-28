import React from 'react';
import { MetricCard } from './MetricCard';
import styles from '../landing.module.css';

interface Metrics {
  vendas: number;
  ordensProducao: number;
  aproveitamento: number;
}

export const MetricsSection: React.FC = () => {
  const metrics: Metrics = {
    vendas: 148500,
    ordensProducao: 8,
    aproveitamento: 87.4,
  };

  return (
    <section className={styles.metrics}>
      <div className={styles.metricsContainer}>
        <MetricCard label="Vendas (Mês)" value={`R$ ${metrics.vendas.toLocaleString('pt-BR')}`} />
        <MetricCard label="Ordens de Produção" value={`${metrics.ordensProducao} Ativas`} />
        <MetricCard label="Aproveitamento (Cortes)" value={`${metrics.aproveitamento}%`} />
      </div>
    </section>
  );
};
