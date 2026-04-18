import React, { useEffect, useState } from 'react';
import { api } from '../../lib/api';

interface Metrics {
  totalOPs: number;
  finalizadas: number;
  emProducao: number;
  leadTimeMedio: number;
  taxaEficiencia: number;
  opsAtrasadas: number;
  filaTotalDias: number;
}

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
    const interval = setInterval(fetchMetrics, 30000); // Poll a cada 30s
    return () => clearInterval(interval);
  }, []);

  if (loading) return <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Carregando KPI industriais...</div>;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
      <div className="card glass" style={{ padding: '1.5rem', borderLeft: '4px solid #d4af37' }}>
        <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: '800', textTransform: 'uppercase' }}>Total de OPs</p>
        <h4 style={{ fontSize: '2rem', fontWeight: '900', margin: '0.5rem 0' }}>{metrics?.totalOPs || 0}</h4>
        <div style={{ fontSize: '0.7rem', color: '#10b981' }}>📊 Monitoramento Ativo</div>
      </div>

      <div className="card glass" style={{ padding: '1.5rem', borderLeft: '4px solid #ef4444' }}>
        <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: '800', textTransform: 'uppercase' }}>Atrasos Críticos</p>
        <h4 style={{ fontSize: '2rem', fontWeight: '900', margin: '0.5rem 0', color: (metrics?.opsAtrasadas || 0) > 0 ? '#ef4444' : 'inherit' }}>{metrics?.opsAtrasadas || 0}</h4>
        <div style={{ fontSize: '0.7rem', color: '#ef4444' }}>⚠️ Requer Atenção</div>
      </div>

      <div className="card glass" style={{ padding: '1.5rem', borderLeft: '4px solid #3b82f6' }}>
        <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: '800', textTransform: 'uppercase' }}>Carga de Fila</p>
        <h4 style={{ fontSize: '2rem', fontWeight: '900', margin: '0.5rem 0' }}>{metrics?.filaTotalDias || 0} dias</h4>
        <div style={{ fontSize: '0.7rem', color: '#3b82f6' }}>⏳ Prazo p/ Limpar Fila</div>
      </div>

      <div className="card glass" style={{ padding: '1.5rem', borderLeft: '4px solid #10b981' }}>
        <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: '800', textTransform: 'uppercase' }}>OEE / Eficiência</p>
        <h4 style={{ fontSize: '2rem', fontWeight: '900', margin: '0.5rem 0' }}>{(metrics?.taxaEficiencia ?? 0).toFixed(1)}%</h4>
        <div style={{ fontSize: '0.7rem', color: '#10b981' }}>📈 Meta Mensal</div>
      </div>
    </div>
  );
};

export default ProductionDashboard;
