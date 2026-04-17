import React from 'react';

interface ChartData {
  month: string;
  meta: number;
  faturado: number;
  carteira: number;
  activeClients?: number;
}

interface StackedBarChartProps {
  data: ChartData[];
  title?: string;
}

const StackedBarChart: React.FC<StackedBarChartProps> = ({ data, title }) => {
  const maxValue = Math.max(...data.map(d => Math.max(d.meta, d.faturado + d.carteira, 1000)));
  const chartHeight = 220;
  const barWidth = 35;
  const gap = 30;
  
  const formatValue = (v: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact' }).format(v);

  return (
    <div className="card glass" style={{ width: '100%', overflowX: 'auto', padding: '1.5rem' }}>
      {title && <h3 style={{ fontSize: '1.125rem', marginBottom: '1.5rem', fontWeight: 'bold' }}>{title}</h3>}
      
      <div style={{ minWidth: (barWidth + gap) * 12 + 60, height: chartHeight + 60, position: 'relative', marginTop: '1rem' }}>
        {/* Y Axis Guide Lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((p, idx) => (
          <div key={idx} style={{ 
            position: 'absolute', 
            bottom: (p * chartHeight) + 30, 
            left: 0, right: 0, 
            borderTop: '1px dashed rgba(255, 255, 255, 0.05)',
            zIndex: 0
          }}>
            <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', position: 'absolute', top: '-10px', left: 0 }}>
              {formatValue(p * maxValue)}
            </span>
          </div>
        ))}

        <div style={{ display: 'flex', alignItems: 'flex-end', height: chartHeight, paddingLeft: '40px', gap: `${gap}px`, position: 'relative', zIndex: 1 }}>
          {data.map((d, i) => {
            const faturadoHeight = (d.faturado / maxValue) * chartHeight;
            const carteiraHeight = (d.carteira / maxValue) * chartHeight;
            const metaY = chartHeight - (d.meta / maxValue) * chartHeight;

            return (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', flex: 1 }}>
                <div style={{ position: 'relative', width: barWidth, height: chartHeight, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                  
                  {/* Meta Marker */}
                  <div style={{ 
                    position: 'absolute', 
                    top: metaY, 
                    left: -5, right: -5, 
                    height: '3px', 
                    background: 'var(--primary)', 
                    borderRadius: '2px',
                    zIndex: 5,
                    boxShadow: '0 0 10px var(--primary)',
                    opacity: d.meta > 0 ? 1 : 0
                  }} title={`Meta: ${formatValue(d.meta)}`} />

                  {/* Stacked Bars */}
                  <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                    {/* Carteira (Top) */}
                    <div style={{ 
                      height: carteiraHeight, 
                      background: 'rgba(245, 158, 11, 0.2)', 
                      border: '1px solid rgba(245, 158, 11, 0.5)',
                      borderBottom: 'none',
                      borderTopLeftRadius: '4px',
                      borderTopRightRadius: '4px',
                      transition: 'height 0.5s ease-out'
                    }} title={`Carteira: ${formatValue(d.carteira)}`} />

                    {/* Faturado (Bottom) */}
                    <div style={{ 
                      height: faturadoHeight, 
                      background: 'linear-gradient(to top, #059669, #10b981)',
                      borderBottomLeftRadius: '2px',
                      borderBottomRightRadius: '2px',
                      borderTopLeftRadius: d.carteira > 0 ? '0' : '4px',
                      borderTopRightRadius: d.carteira > 0 ? '0' : '4px',
                      transition: 'height 0.5s ease-out'
                    }} title={`Faturado: ${formatValue(d.faturado)}`} />
                  </div>

                  {/* Active Clients Indicator (Indicator Overlay) */}
                  {d.activeClients !== undefined && d.activeClients > 0 && (
                    <div style={{ 
                      position: 'absolute', 
                      bottom: (faturadoHeight / 2) - 10, // Centro da barra faturada
                      left: 0, right: 0,
                      display: 'flex', flexDirection: 'column', alignItems: 'center',
                      pointerEvents: 'none'
                    }}>
                       <div style={{ 
                         background: 'white', 
                         color: '#059669', 
                         fontSize: '0.65rem', 
                         fontWeight: 'bold', 
                         padding: '1px 4px', 
                         borderRadius: '10px',
                         boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                       }}>
                         {d.activeClients} cli
                       </div>
                    </div>
                  )}
                </div>
                <span style={{ fontSize: '0.7rem', fontWeight: 'bold', color: 'var(--text-muted)' }}>{d.month}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: '1.5rem', justifyContent: 'center', marginTop: '1.5rem', fontSize: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{ width: '12px', height: '12px', borderRadius: '2px', background: '#10b981' }}></div>
          <span style={{ color: 'var(--text-muted)' }}>Faturado</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{ width: '12px', height: '12px', borderRadius: '2px', background: 'rgba(245, 158, 11, 0.4)', border: '1px solid #f59e0b' }}></div>
          <span style={{ color: 'var(--text-muted)' }}>Carteira (Projeção)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{ width: '15px', height: '3px', background: 'var(--primary)' }}></div>
          <span style={{ color: 'var(--text-muted)' }}>Meta</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{ width: '18px', height: '14px', borderRadius: '10px', background: 'white', color: '#059669', fontSize: '0.6rem', fontWeight: 'bold', border: '1px solid #059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>N</div>
          <span style={{ color: 'var(--text-muted)' }}>Clientes Atendidos</span>
        </div>
      </div>
    </div>
  );
};

export default StackedBarChart;

