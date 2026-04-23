import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { FiPieChart, FiToggleLeft, FiToggleRight, FiTrendingUp, FiTrendingDown, FiMinus, FiCalendar } from 'react-icons/fi';

const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
const fmtPct = (v: number) => `${(v || 0).toFixed(1)}%`;

interface DREData {
  periodo: { inicio: string; fim: string; regime: string };
  receita_bruta: number;
  receita_liquida: number;
  lucro_bruto: number;
  margem_bruta: number;
  ebitda: number;
  margem_ebitda: number;
  lucro_liquido: number;
  margem_liquida: number;
  detalhes: {
    receitas: any[];
    custos_diretos: any[];
    despesas_operacionais: any[];
    despesas_administrativas: any[];
    resultado_financeiro: { receitas: number; despesas: number; saldo: number };
  };
}

export default function FinanceiroDREPage() {
  const [data, setData] = useState<DREData | null>(null);
  const [loading, setLoading] = useState(true);
  const [regime, setRegime] = useState<'competencia' | 'caixa'>('competencia');
  const [periodo, setPeriodo] = useState({ inicio: '', fim: '' });
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const hoje = new Date();
    const inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().split('T')[0];
    const fim = hoje.toISOString().split('T')[0];
    setPeriodo({ inicio, fim });
    loadDRE(inicio, fim, regime);
  }, []);

  const loadDRE = async (inicio: string, fim: string, reg: string) => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ type: 'dre', data_inicio: inicio, data_fim: fim, regime: reg }).toString();
      const res = await fetch(`/api/financeiro/relatorios?${qs}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('dluxury_token') || ''}` }
      });
      const json = await res.json();
      if (json.success) setData(json.data);
    } finally {
      setLoading(false);
    }
  };

  const toggleSection = (key: string) => setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));

  const Block = ({ 
    label, value, margin, color, isNegative, sublabel, children, sectionKey 
  }: { 
    label: string; value: number; margin?: number; color: string; isNegative?: boolean; sublabel?: string; children?: React.ReactNode; sectionKey?: string;
  }) => (
    <div style={{ borderLeft: `4px solid ${color}`, padding: '1rem 1.5rem', background: 'rgba(255,255,255,0.03)', borderRadius: '0 8px 8px 0', marginBottom: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
          {sublabel && <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>{sublabel}</div>}
        </div>
        <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          {margin !== undefined && (
            <div style={{ fontSize: '0.9rem', fontWeight: 700, color: margin >= 0 ? 'var(--success)' : 'var(--danger)' }}>
              {fmtPct(margin)}
            </div>
          )}
          <div style={{ fontSize: '1.5rem', fontWeight: 900, color: isNegative ? 'var(--danger)' : color }}>
            {isNegative ? '(' : ''}{fmt(Math.abs(value))}{isNegative ? ')' : ''}
          </div>
          {sectionKey && children && (
            <button onClick={() => toggleSection(sectionKey)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.8rem' }}>
              {expandedSections[sectionKey] ? '▲' : '▼'}
            </button>
          )}
        </div>
      </div>
      {sectionKey && expandedSections[sectionKey] && children && (
        <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
          {children}
        </div>
      )}
    </div>
  );

  const LineItem = ({ label, value, isNegative }: { label: string; value: number; isNegative?: boolean }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.4rem 0', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '0.85rem' }}>
      <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
      <span style={{ fontWeight: 600, color: isNegative ? 'var(--danger)' : 'var(--success)', fontFamily: 'monospace' }}>
        {isNegative ? '(' : ''}{fmt(Math.abs(value))}{isNegative ? ')' : ''}
      </span>
    </div>
  );

  const Divider = ({ label }: { label: string }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', margin: '1.5rem 0 1rem' }}>
      <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
      <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', whiteSpace: 'nowrap' }}>{label}</span>
      <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
    </div>
  );

  return (
    <div className="page-container anim-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <FiPieChart style={{ color: '#a855f7' }} /> DRE — DEMONSTRAÇÃO DO RESULTADO
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Apuração de lucro e desempenho financeiro no período</p>
        </div>

        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Toggle Regime */}
          <button
            onClick={() => {
              const novoRegime = regime === 'competencia' ? 'caixa' : 'competencia';
              setRegime(novoRegime);
              loadDRE(periodo.inicio, periodo.fim, novoRegime);
            }}
            className="btn btn-outline"
            style={{ fontSize: '0.8rem', gap: '0.5rem' }}
          >
            {regime === 'competencia' ? <FiToggleLeft /> : <FiToggleRight />}
            REGIME: {regime === 'competencia' ? 'COMPETÊNCIA' : 'CAIXA'}
          </button>

          {/* Período */}
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <input type="date" className="input-base" style={{ fontSize: '0.8rem', padding: '0.5rem' }} value={periodo.inicio}
              onChange={e => setPeriodo(p => ({ ...p, inicio: e.target.value }))} />
            <span style={{ color: 'var(--text-muted)' }}>até</span>
            <input type="date" className="input-base" style={{ fontSize: '0.8rem', padding: '0.5rem' }} value={periodo.fim}
              onChange={e => setPeriodo(p => ({ ...p, fim: e.target.value }))} />
            <button className="btn btn-primary" style={{ fontSize: '0.8rem' }} onClick={() => loadDRE(periodo.inicio, periodo.fim, regime)}>
              <FiCalendar /> APLICAR
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>Calculando DRE...</div>
      ) : !data ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>Sem dados para o período selecionado</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '2rem' }}>
          
          {/* DRE Principal */}
          <div>
            <Divider label="RECEITAS" />

            <Block label="RECEITA BRUTA" value={data.receita_bruta} color="var(--success)" sectionKey="receitas"
              sublabel="Vendas + Serviços + Outras Receitas">
              {data.detalhes?.receitas?.map((r, i) => <LineItem key={i} label={`${r.codigo} — ${r.nome}`} value={r.valor} />)}
            </Block>

            <div style={{ padding: '0.75rem 1.5rem', marginBottom: '1rem', background: 'rgba(34,197,94,0.08)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
              <span style={{ fontWeight: 700 }}>= RECEITA LÍQUIDA</span>
              <span style={{ fontWeight: 900, fontFamily: 'monospace', color: 'var(--success)' }}>{fmt(data.receita_liquida)}</span>
            </div>

            <Divider label="CUSTOS DIRETOS" />

            <Block label="MATÉRIA-PRIMA E MÃO DE OBRA" value={data.detalhes?.custos_diretos?.reduce((s, r) => s + r.valor, 0) || 0}
              color="#f59e0b" isNegative sectionKey="custos"
              sublabel="Classes 2.1 (Material) e 2.2 (Mão de Obra)">
              {data.detalhes?.custos_diretos?.map((r, i) => <LineItem key={i} label={`${r.codigo} — ${r.nome}`} value={r.valor} isNegative />)}
            </Block>

            <div style={{ padding: '0.75rem 1.5rem', marginBottom: '1rem', background: data.lucro_bruto >= 0 ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
              <span style={{ fontWeight: 700 }}>= LUCRO BRUTO <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>({fmtPct(data.margem_bruta)} de margem)</span></span>
              <span style={{ fontWeight: 900, fontFamily: 'monospace', color: data.lucro_bruto >= 0 ? 'var(--success)' : 'var(--danger)' }}>{fmt(data.lucro_bruto)}</span>
            </div>

            <Divider label="DESPESAS OPERACIONAIS" />

            <Block label="OPERACIONAIS + COMERCIAL + LOGÍSTICA" value={(data.detalhes?.despesas_operacionais?.reduce((s, r) => s + r.valor, 0)) || 0}
              color="#ef4444" isNegative sectionKey="despesasOp"
              sublabel="Classes 2.3, 2.4 e 2.5">
              {data.detalhes?.despesas_operacionais?.map((r, i) => <LineItem key={i} label={`${r.codigo} — ${r.nome}`} value={r.valor} isNegative />)}
            </Block>

            <Block label="DESPESAS ADMINISTRATIVAS" value={(data.detalhes?.despesas_administrativas?.reduce((s, r) => s + r.valor, 0)) || 0}
              color="#ef4444" isNegative sectionKey="despesasAdmin"
              sublabel="Classe 2.6 (Impostos, Contador, Seguros...)">
              {data.detalhes?.despesas_administrativas?.map((r, i) => <LineItem key={i} label={`${r.codigo} — ${r.nome}`} value={r.valor} isNegative />)}
            </Block>

            <div style={{ padding: '0.75rem 1.5rem', marginBottom: '1rem', background: data.ebitda >= 0 ? 'rgba(59,130,246,0.08)' : 'rgba(239,68,68,0.08)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
              <span style={{ fontWeight: 700 }}>= EBITDA <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>({fmtPct(data.margem_ebitda)} de margem)</span></span>
              <span style={{ fontWeight: 900, fontFamily: 'monospace', color: data.ebitda >= 0 ? '#3b82f6' : 'var(--danger)' }}>{fmt(data.ebitda)}</span>
            </div>

            <Divider label="RESULTADO FINANCEIRO" />

            <Block label="RESULTADO FINANCEIRO LÍQUIDO" value={data.detalhes?.resultado_financeiro?.saldo || 0}
              color={data.detalhes?.resultado_financeiro?.saldo >= 0 ? 'var(--success)' : 'var(--danger)'}
              isNegative={(data.detalhes?.resultado_financeiro?.saldo || 0) < 0}
              sublabel="Receitas financeiras - Despesas financeiras"
            />

            <div style={{ 
              padding: '1.25rem 1.5rem', marginTop: '1.5rem',
              background: data.lucro_liquido >= 0 ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)', 
              borderRadius: '12px', border: `2px solid ${data.lucro_liquido >= 0 ? 'var(--success)' : 'var(--danger)'}`,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
              <div>
                <div style={{ fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)' }}>= LUCRO LÍQUIDO DO PERÍODO</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Margem Líquida: {fmtPct(data.margem_liquida)}</div>
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 900, color: data.lucro_liquido >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                {fmt(data.lucro_liquido)}
              </div>
            </div>
          </div>

          {/* Painel de Margens */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="card glass" style={{ padding: '1.25rem' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '1rem' }}>
                PAINEL DE MARGENS
              </div>
              {[
                { label: 'Margem Bruta', value: data.margem_bruta, color: '#f59e0b' },
                { label: 'EBITDA', value: data.margem_ebitda, color: '#3b82f6' },
                { label: 'Margem Líquida', value: data.margem_liquida, color: data.margem_liquida >= 0 ? 'var(--success)' : 'var(--danger)' },
              ].map((m, i) => (
                <div key={i} style={{ marginBottom: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem', fontSize: '0.8rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>{m.label}</span>
                    <span style={{ fontWeight: 700, color: m.color }}>{fmtPct(m.value)}</span>
                  </div>
                  <div style={{ height: '8px', background: 'var(--surface-hover)', borderRadius: '999px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${Math.min(Math.max(Math.abs(m.value), 0), 100)}%`, background: m.color, borderRadius: '999px', transition: 'width 0.8s' }} />
                  </div>
                </div>
              ))}
            </div>

            <div className="card glass" style={{ padding: '1.25rem' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '1rem' }}>
                RESUMO EXECUTIVO
              </div>
              {[
                { label: 'Receita Bruta', value: data.receita_bruta, icon: <FiTrendingUp />, color: 'var(--success)' },
                { label: 'Total Custos', value: (data.detalhes?.custos_diretos?.reduce((s, r) => s + r.valor, 0) || 0), icon: <FiMinus />, color: '#f59e0b' },
                { label: 'Total Despesas', value: (data.detalhes?.despesas_operacionais?.reduce((s, r) => s + r.valor, 0) || 0) + (data.detalhes?.despesas_administrativas?.reduce((s, r) => s + r.valor, 0) || 0), icon: <FiTrendingDown />, color: 'var(--danger)' },
                { label: 'Resultado', value: data.lucro_liquido, icon: null, color: data.lucro_liquido >= 0 ? 'var(--success)' : 'var(--danger)' },
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.6rem 0', borderBottom: '1px solid var(--border)', fontSize: '0.85rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: item.color }}>{item.icon}<span style={{ color: 'var(--text-secondary)' }}>{item.label}</span></div>
                  <span style={{ fontWeight: 700, fontFamily: 'monospace', color: item.color }}>{fmt(item.value)}</span>
                </div>
              ))}
            </div>

            <div className="card glass" style={{ padding: '1.25rem', textAlign: 'center' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>REGIME DE APURAÇÃO</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--primary)' }}>
                {regime === 'competencia' ? '📊 COMPETÊNCIA' : '💰 CAIXA'}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                {regime === 'competencia' ? 'Reconhece na emissão/vencimento' : 'Reconhece na data de pagamento'}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
