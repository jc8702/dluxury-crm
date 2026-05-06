import React, { useState, useEffect } from 'react';
import type { Retalho, FiltrosRetalho } from '../../domain/entities/Retalho';
import { retalhosRepository } from '../../infrastructure/repositories/RetalhosRepository';
import { 
  Package, 
  Search, 
  Trash2, 
  History, 
  Layers, 
  ExternalLink,
  Filter,
  CheckCircle2,
  XCircle,
  AlertTriangle
} from 'lucide-react';

export const PainelRetalhos: React.FC = () => {
  const [retalhos, setRetalhos] = useState<Retalho[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState<FiltrosRetalho>({ disponivel: true });
  const [stats, setStats] = useState({ total: 0, areaTotal: 0, economiaEstimada: 0 });

  useEffect(() => {
    carregarEstoque();
  }, [filtro]);

  const carregarEstoque = async () => {
    setLoading(true);
    try {
      const data = await retalhosRepository.listarEstoque();
      let filtrados = data;
      if (filtro.sku_chapa) filtrados = filtrados.filter(r => r.sku_chapa.includes(filtro.sku_chapa!));
      if (filtro.disponivel !== undefined) filtrados = filtrados.filter(r => r.disponivel === filtro.disponivel);
      
      setRetalhos(filtrados);
      
      const total = filtrados.length;
      const area = filtrados.reduce((acc, r) => acc + (r.largura_mm * r.altura_mm), 0) / 1000000;
      setStats({
        total,
        areaTotal: area,
        economiaEstimada: area * 150
      });
    } catch (error) {
      console.error('Erro ao carregar retalhos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDescarte = async (id: string) => {
    if (!confirm('Deseja realmente descartar este retalho?')) return;
    try {
      await retalhosRepository.descartarRetalho(id, 'Descarte manual via painel');
      carregarEstoque();
    } catch (error) {
      alert('Erro ao descartar retalho');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* HEADER & STATS */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--primary)', letterSpacing: '-0.02em' }}>
            <Package size={28} />
            ESTOQUE DE RETALHOS
          </h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem' }}>Otimização e reuso de sobras de MDF industrial</p>
        </div>

        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <StatCard 
            label="TOTAL ITENS" 
            value={stats.total} 
            icon={<Layers size={18} style={{ color: 'var(--info)' }} />} 
          />
          <StatCard 
            label="ÁREA TOTAL" 
            value={`${stats.areaTotal.toFixed(2)} m²`} 
            icon={<Package size={18} style={{ color: 'var(--success)' }} />} 
          />
          <StatCard 
            label="ECONOMIA" 
            value={`R$ ${stats.economiaEstimada.toLocaleString()}`} 
            icon={<CheckCircle2 size={18} style={{ color: 'var(--warning)' }} />} 
          />
        </div>
      </div>

      {/* FILTROS */}
      <div className="glass" style={{ padding: '1.25rem', display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', borderRadius: 'var(--radius-md)' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '250px' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input 
            type="text" 
            placeholder="Filtrar por SKU (ex: MDF-BRANCO-18)..."
            className="input"
            style={{ width: '100%', paddingLeft: '2.5rem' }}
            onChange={(e) => setFiltro({ ...filtro, sku_chapa: e.target.value })}
          />
        </div>

        <select 
          className="input"
          style={{ minWidth: '150px' }}
          onChange={(e) => setFiltro({ ...filtro, disponivel: e.target.value === 'true' })}
        >
          <option value="true">DISPONÍVEIS</option>
          <option value="false">TODOS OS REGISTROS</option>
        </select>

        <button className="btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Filter size={16} />
          FILTROS AVANÇADOS
        </button>
      </div>

      {/* TABELA */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'var(--surface-subtle)', borderBottom: '1px solid var(--border)' }}>
                <th style={{ padding: '1rem 1.5rem', fontSize: '0.7rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Material / SKU</th>
                <th style={{ padding: '1rem 1.5rem', fontSize: '0.7rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Dimensões (mm)</th>
                <th style={{ padding: '1rem 1.5rem', fontSize: '0.7rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Origem</th>
                <th style={{ padding: '1rem 1.5rem', fontSize: '0.7rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Estado</th>
                <th style={{ padding: '1rem 1.5rem', fontSize: '0.7rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Data</th>
                <th style={{ padding: '1rem 1.5rem', fontSize: '0.7rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', textAlign: 'right' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <div style={{ display: 'inline-block', width: '2rem', height: '2rem', border: '3px solid var(--border)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: '1rem' }}></div>
                    <p>Sincronizando estoque industrial...</p>
                  </td>
                </tr>
              ) : retalhos.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: 0 }}>
                    <div className="empty-state" style={{ border: 'none', borderRadius: 0 }}>
                      Nenhum retalho disponível em estoque.
                    </div>
                  </td>
                </tr>
              ) : (
                retalhos.map((retalho) => (
                  <tr key={retalho.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-hover)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding: '1rem 1.5rem' }}>
                      <div style={{ fontWeight: '700', color: 'var(--text)' }}>{retalho.sku_chapa}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{retalho.nome_material || 'MDF PADRÃO'}</div>
                    </td>
                    <td style={{ padding: '1rem 1.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ background: 'var(--badge-success-bg)', color: 'var(--badge-success-text)', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '700', border: '1px solid var(--success-border)' }}>
                          {retalho.largura_mm} x {retalho.altura_mm}
                        </span>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{retalho.espessura_mm}mm</span>
                      </div>
                    </td>
                    <td style={{ padding: '1rem 1.5rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        {retalho.origem === 'sobra_plano_corte' ? <History size={12} /> : <Package size={12} />}
                        {retalho.origem.replace('_', ' ').toUpperCase()}
                      </div>
                    </td>
                    <td style={{ padding: '1rem 1.5rem' }}>
                      {retalho.disponivel ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.7rem', color: 'var(--success)', fontWeight: '800' }}>
                          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--success)', boxShadow: '0 0 8px var(--success)' }}></div>
                          DISPONÍVEL
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: '700' }}>
                          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--border-strong)' }}></div>
                          UTILIZADO
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '1rem 1.5rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {new Date(retalho.criado_em).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                        <button className="btn-icon" title="Ver Detalhes" aria-label={`Ver detalhes do retalho ${retalho.sku_chapa}`}>
                          <ExternalLink size={16} />
                        </button>
                        {retalho.disponivel && (
                          <button 
                            onClick={() => handleDescarte(retalho.id)}
                            className="btn-icon" 
                            style={{ color: 'var(--danger)' }}
                            title="Descartar"
                            aria-label={`Descartar retalho ${retalho.sku_chapa}`}
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* RODAPÉ INFO */}
      <div className="glass" style={{ padding: '0.75rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem', borderRadius: 'var(--radius-sm)', borderLeft: '4px solid var(--warning)' }}>
        <AlertTriangle size={16} style={{ color: 'var(--warning)' }} />
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '500' }}>
          POLÍTICA DE DESCARTE: Retalhos menores que 300x300mm são automaticamente removidos para otimização de espaço físico.
        </span>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

const StatCard: React.FC<{ label: string; value: string | number; icon: React.ReactNode }> = ({ label, value, icon }) => (
  <div className="card" style={{ padding: '1.25rem', minWidth: '160px', flex: 1 }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.65rem', fontWeight: '800', color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
      {icon}
      {label}
    </div>
    <div style={{ fontSize: '1.5rem', fontWeight: '900', color: 'var(--text)' }}>{value}</div>
  </div>
);
