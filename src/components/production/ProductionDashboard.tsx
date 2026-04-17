import React, { useEffect, useState } from 'react';

interface Metrics {
  totalOPs: number;
  finalizadas: number;
  emProducao: number;
  leadTimeMedio: number;
  taxaEficiencia: number;
}

const ProductionDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchMetrics = async () => {
    try {
      const res = await fetch('/api/production/metrics');
      const json = await res.json();
      if (json.success) setMetrics(json.data);
    } catch (e) {
      console.error('Erro ao buscar métricas de produção');
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

      <div className="card glass" style={{ padding: '1.5rem', borderLeft: '4px solid #3b82f6' }}>
        <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: '800', textTransform: 'uppercase' }}>Em Execução</p>
        <h4 style={{ fontSize: '2rem', fontWeight: '900', margin: '0.5rem 0' }}>{metrics?.emProducao || 0}</h4>
        <div style={{ fontSize: '0.7rem', color: '#3b82f6' }}>⚙️ Chão de Fábrica</div>
      </div>

      <div className="card glass" style={{ padding: '1.5rem', borderLeft: '4px solid #10b981' }}>
        <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: '800', textTransform: 'uppercase' }}>Eficiência (OEE)</p>
        <h4 style={{ fontSize: '2rem', fontWeight: '900', margin: '0.5rem 0' }}>{metrics?.taxaEficiencia.toFixed(1)}%</h4>
        <div style={{ fontSize: '0.7rem', color: '#10b981' }}>📈 Meta de Produção</div>
      </div>

      <div className="card glass" style={{ padding: '1.5rem', borderLeft: '4px solid #f59e0b' }}>
        <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: '800', textTransform: 'uppercase' }}>Lead Time Médio</p>
        <h4 style={{ fontSize: '2rem', fontWeight: '900', margin: '0.5rem 0' }}>{metrics?.leadTimeMedio || 0} min</h4>
        <div style={{ fontSize: '0.7rem', color: '#f59e0b' }}>⏱️ Tempo de Ciclo</div>
      </div>
    </div>
  );
};

export default ProductionDashboard;
