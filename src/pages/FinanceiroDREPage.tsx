import React, { useEffect, useState } from 'react';

import { PieChart, ToggleLeft, ToggleRight, TrendingUp, TrendingDown, Minus, Calendar } from 'lucide-react';
import { TableSkeleton } from '../design-system/components/Skeleton';

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
    label, value, margin, colorClass, isNegative, sublabel, children, sectionKey 
  }: { 
    label: string; value: number; margin?: number; colorClass: string; isNegative?: boolean; sublabel?: string; children?: React.ReactNode; sectionKey?: string;
  }) => (
    <div className={`glass-elevated border-l-4 ${colorClass} p-6 rounded-r-2xl mb-4 transition-all hover:bg-white/[0.04] group`}>
      <div className="flex justify-between items-center">
        <div>
          <div className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] italic mb-1 opacity-70">{label}</div>
          {sublabel && <div className="text-[10px] text-muted-foreground italic font-medium opacity-50">{sublabel}</div>}
        </div>
        <div className="text-right flex items-center gap-8">
          {margin !== undefined && (
            <div className={`text-xs font-black italic ${margin >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
              {fmtPct(margin)} MARGEM
            </div>
          )}
          <div className={`text-2xl font-black italic tracking-tighter ${isNegative ? 'text-red-500' : 'text-white'}`}>
            {isNegative ? '(' : ''}{fmt(Math.abs(value))}{isNegative ? ')' : ''}
          </div>
          {sectionKey && children && (
            <button 
              onClick={() => toggleSection(sectionKey)} 
              className={`p-2 rounded-lg transition-colors ${expandedSections[sectionKey] ? 'bg-primary text-black' : 'bg-white/5 text-muted-foreground hover:bg-white/10'}`}
            >
              <TrendingUp className={`w-4 h-4 transition-transform ${expandedSections[sectionKey] ? 'rotate-90' : ''}`} />
            </button>
          )}
        </div>
      </div>
      {sectionKey && expandedSections[sectionKey] && children && (
        <div className="mt-4 pt-4 border-t border-white/5 space-y-1">
          {children}
        </div>
      )}
    </div>
  );

  const LineItem = ({ label, value, isNegative }: { label: string; value: number; isNegative?: boolean }) => (
    <div className="flex justify-between items-center py-2 px-4 hover:bg-white/5 rounded-lg transition-colors group">
      <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider group-hover:text-white transition-colors">{label}</span>
      <span className={`text-xs font-black italic tracking-tight ${isNegative ? 'text-red-400' : 'text-emerald-400'}`}>
        {isNegative ? '-' : '+'} {fmt(Math.abs(value))}
      </span>
    </div>
  );

  const Divider = ({ label }: { label: string }) => (
    <div className="flex items-center gap-4 my-8 first:mt-0">
      <div className="h-px bg-white/5 flex-1" />
      <span className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.4em] italic opacity-40">{label}</span>
      <div className="h-px bg-white/5 flex-1" />
    </div>
  );

  return (
    <div className="p-8 max-w-[1600px] mx-auto min-h-screen space-y-8">
      {/* Header Corporativo e Controles */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6">
        <div>
          <h1 className="text-4xl font-black tracking-tighter italic flex items-center gap-3">
            <PieChart className="text-primary w-10 h-10" />
            DRE CORPORATIVO
          </h1>
          <p className="text-muted-foreground text-[10px] font-black uppercase tracking-[0.4em] mt-2 ml-1 italic opacity-60">
            Demonstração do Resultado do Exercício
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          {/* Toggle Regime Industrial */}
          <button
            onClick={() => {
              const novoRegime = regime === 'competencia' ? 'caixa' : 'competencia';
              setRegime(novoRegime);
              loadDRE(periodo.inicio, periodo.fim, novoRegime);
            }}
            className="btn-outline h-12 px-6 rounded-xl text-[11px] font-black uppercase tracking-widest italic flex items-center gap-3 group transition-all"
          >
            {regime === 'competencia' ? <ToggleLeft className="w-5 h-5 text-muted-foreground" /> : <ToggleRight className="w-5 h-5 text-primary" />}
            <span className={regime === 'caixa' ? 'text-primary' : 'text-muted-foreground'}>
              REGIME: {regime === 'competencia' ? 'COMPETÊNCIA' : 'CAIXA'}
            </span>
          </button>

          {/* Filtro de Período Industrial */}
          <div className="flex items-center gap-3 glass-elevated p-1 rounded-2xl border border-white/5">
            <input 
              type="date" 
              className="bg-transparent border-none text-[11px] font-black text-white px-4 py-2 uppercase italic focus:ring-0 w-40" 
              value={periodo.inicio}
              onChange={e => setPeriodo(p => ({ ...p, inicio: e.target.value }))} 
            />
            <span className="text-[10px] font-black text-muted-foreground opacity-50 italic">ATÉ</span>
            <input 
              type="date" 
              className="bg-transparent border-none text-[11px] font-black text-white px-4 py-2 uppercase italic focus:ring-0 w-40" 
              value={periodo.fim}
              onChange={e => setPeriodo(p => ({ ...p, fim: e.target.value }))} 
            />
            <button 
              className="btn-primary h-10 px-6 rounded-xl text-[11px] font-black uppercase tracking-widest italic flex items-center gap-2"
              onClick={() => loadDRE(periodo.inicio, periodo.fim, regime)}
            >
              <Calendar className="w-4 h-4" /> APLICAR
            </button>
          </div>
        </div>
      </div>
      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 opacity-20">
          <div className="lg:col-span-8 space-y-4">
            <div className="h-20 bg-white/5 rounded-xl animate-pulse" />
            <div className="h-60 bg-white/5 rounded-xl animate-pulse" />
            <div className="h-60 bg-white/5 rounded-xl animate-pulse" />
          </div>
          <div className="lg:col-span-4 space-y-4">
            <div className="h-96 bg-white/5 rounded-xl animate-pulse" />
          </div>
        </div>
      ) : !data ? (
        <div className="glass-elevated p-20 rounded-3xl text-center">
          <TrendingDown className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-20" />
          <p className="text-[11px] font-black uppercase tracking-[0.4em] text-muted-foreground italic">Sem dados operacionais para o período</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          
          {/* DRE Principal */}
          <div className="lg:col-span-8">
            <Divider label="FLUXO DE ENTRADAS" />

            <Block 
              label="RECEITA BRUTA TOTAL" 
              value={data.receita_bruta} 
              colorClass="border-emerald-500" 
              sectionKey="receitas"
              sublabel="Consolidação de Vendas e Serviços Industriais"
            >
              {data.detalhes?.receitas?.map((r, i) => <LineItem key={i} label={`${r.codigo} — ${r.nome}`} value={r.valor} />)}
            </Block>

            <div className="p-5 px-8 mb-8 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 flex justify-between items-center group transition-all hover:bg-emerald-500/15">
              <span className="text-[11px] font-black text-emerald-500 uppercase tracking-[0.3em] italic flex items-center gap-2">
                <Minus className="w-4 h-4 opacity-40 rotate-90" /> RECEITA LÍQUIDA OPERACIONAL
              </span>
              <span className="text-2xl font-black text-emerald-500 italic tracking-tighter">{fmt(data.receita_liquida)}</span>
            </div>

            <Divider label="CUSTOS DE PRODUÇÃO" />

            <Block 
              label="MATÉRIA-PRIMA & MÃO DE OBRA" 
              value={data.detalhes?.custos_diretos?.reduce((s: any, r: any) => s + r.valor, 0) || 0}
              colorClass="border-orange-500" 
              isNegative 
              sectionKey="custos"
              sublabel="Custos Diretos Atribuíveis (Classes 2.1 e 2.2)"
            >
              {data.detalhes?.custos_diretos?.map((r, i) => <LineItem key={i} label={`${r.codigo} — ${r.nome}`} value={r.valor} isNegative />)}
            </Block>

            <div className={`p-5 px-8 mb-8 rounded-2xl border flex justify-between items-center transition-all ${data.lucro_bruto >= 0 ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
              <span className="text-[11px] font-black uppercase tracking-[0.3em] italic flex flex-col">
                <span className={data.lucro_bruto >= 0 ? 'text-emerald-500' : 'text-red-500'}>LUCRO BRUTO INDUSTRIAL</span>
                <span className="text-[9px] font-bold text-muted-foreground opacity-50 uppercase tracking-widest mt-1">Margem de Contribuição: {fmtPct(data.margem_bruta)}</span>
              </span>
              <span className={`text-2xl font-black italic tracking-tighter ${data.lucro_bruto >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>{fmt(data.lucro_bruto)}</span>
            </div>

            <Divider label="ESTRUTURA OPERACIONAL" />

            <Block 
              label="DESPESAS COMERCIAIS & LOGÍSTICA" 
              value={(data.detalhes?.despesas_operacionais?.reduce((s: any, r: any) => s + r.valor, 0)) || 0}
              colorClass="border-red-500" 
              isNegative 
              sectionKey="despesasOp"
              sublabel="Apoio de Vendas, Fretes e Marketing"
            >
              {data.detalhes?.despesas_operacionais?.map((r, i) => <LineItem key={i} label={`${r.codigo} — ${r.nome}`} value={r.valor} isNegative />)}
            </Block>

            <Block 
              label="DESPESAS ADMINISTRATIVAS" 
              value={(data.detalhes?.despesas_administrativas?.reduce((s: any, r: any) => s + r.valor, 0)) || 0}
              colorClass="border-red-500" 
              isNegative 
              sectionKey="despesasAdmin"
              sublabel="Custos Fixos de Gestão e Suporte"
            >
              {data.detalhes?.despesas_administrativas?.map((r, i) => <LineItem key={i} label={`${r.codigo} — ${r.nome}`} value={r.valor} isNegative />)}
            </Block>

            <div className={`p-6 px-8 mb-8 rounded-2xl border flex justify-between items-center transition-all ${data.ebitda >= 0 ? 'bg-primary/10 border-primary/20' : 'bg-red-500/10 border-red-500/20'}`}>
              <span className="text-[11px] font-black uppercase tracking-[0.3em] italic flex flex-col">
                <span className={data.ebitda >= 0 ? 'text-primary' : 'text-red-500'}>EBITDA (LAJIDA)</span>
                <span className="text-[9px] font-bold text-muted-foreground opacity-50 uppercase tracking-widest mt-1">Margem EBITDA: {fmtPct(data.margem_ebitda)}</span>
              </span>
              <span className={`text-3xl font-black italic tracking-tighter ${data.ebitda >= 0 ? 'text-primary' : 'text-red-500'}`}>{fmt(data.ebitda)}</span>
            </div>

            <Divider label="FINALIZAÇÃO FINANCEIRA" />

            <Block 
              label="RESULTADO FINANCEIRO LÍQUIDO" 
              value={data.detalhes?.resultado_financeiro?.saldo || 0}
              colorClass={data.detalhes?.resultado_financeiro?.saldo >= 0 ? 'border-emerald-500' : 'border-red-500'}
              isNegative={(data.detalhes?.resultado_financeiro?.saldo || 0) < 0}
              sublabel="Impacto de Juros, Taxas e Rendimentos"
            />

            <div className={`p-10 px-12 mt-12 rounded-[2rem] border-2 flex flex-col md:flex-row justify-between items-center relative overflow-hidden transition-all ${data.lucro_liquido >= 0 ? 'bg-emerald-500/5 border-emerald-500/30' : 'bg-red-500/5 border-red-500/30'}`}>
              {/* Background Glow */}
              <div className={`absolute -right-20 -top-20 w-64 h-64 blur-[120px] rounded-full opacity-20 ${data.lucro_liquido >= 0 ? 'bg-emerald-500' : 'bg-red-500'}`} />
              
              <div className="z-10 text-center md:text-left mb-6 md:mb-0">
                <div className="text-[12px] font-black text-muted-foreground uppercase tracking-[0.4em] italic mb-2 opacity-60">LUCRO LÍQUIDO OPERACIONAL</div>
                <div className="text-[10px] font-black text-white/40 uppercase tracking-widest italic">
                  Margem Líquida Final: <span className={data.lucro_liquido >= 0 ? 'text-emerald-500' : 'text-red-500'}>{fmtPct(data.margem_liquida)}</span>
                </div>
              </div>
              <div className={`z-10 text-6xl font-black italic tracking-tighter ${data.lucro_liquido >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                {fmt(data.lucro_liquido)}
              </div>
            </div>
          </div>

          {/* Sidebar de Inteligência Financeira */}
          <div className="lg:col-span-4 space-y-8 sticky top-8">
            <div className="glass-elevated p-8 rounded-3xl border border-white/5 space-y-8">
              <div className="text-[11px] font-black text-muted-foreground uppercase tracking-[0.3em] italic opacity-50 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" /> PAINEL DE MARGENS
              </div>
              
              {[
                { label: 'Margem Bruta', value: data.margem_bruta, color: 'text-orange-500', bg: 'bg-orange-500' },
                { label: 'Margem EBITDA', value: data.margem_ebitda, color: 'text-primary', bg: 'bg-primary' },
                { label: 'Margem Líquida', value: data.margem_liquida, color: data.margem_liquida >= 0 ? 'text-emerald-500' : 'text-red-500', bg: data.margem_liquida >= 0 ? 'bg-emerald-500' : 'bg-red-500' },
              ].map((m, i) => (
                <div key={i} className="space-y-3">
                  <div className="flex justify-between items-end">
                    <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{m.label}</span>
                    <span className={`text-xl font-black italic tracking-tight ${m.color}`}>{fmtPct(m.value)}</span>
                  </div>
                  <div className="h-2 bg-white/5 rounded-full overflow-hidden p-[2px]">
                    <div 
                      className={`h-full rounded-full transition-all duration-1000 ${m.bg}`} 
                      style={{ width: `${Math.min(Math.max(Math.abs(m.value), 0), 100)}%` }} 
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="glass-elevated p-8 rounded-3xl border border-white/5 space-y-6">
              <div className="text-[11px] font-black text-muted-foreground uppercase tracking-[0.3em] italic opacity-50">RESUMO EXECUTIVO</div>
              {[
                { label: 'Receita Bruta', value: data.receita_bruta, icon: <TrendingUp className="w-4 h-4" />, color: 'text-emerald-500' },
                { label: 'Custos Diretos', value: (data.detalhes?.custos_diretos?.reduce((s: any, r: any) => s + r.valor, 0) || 0), icon: <Minus className="w-4 h-4" />, color: 'text-orange-500' },
                { label: 'Total Despesas', value: (data.detalhes?.despesas_operacionais?.reduce((s: any, r: any) => s + r.valor, 0) || 0) + (data.detalhes?.despesas_administrativas?.reduce((s: any, r: any) => s + r.valor, 0) || 0), icon: <TrendingDown className="w-4 h-4" />, color: 'text-red-500' },
                { label: 'Resultado', value: data.lucro_liquido, icon: null, color: data.lucro_liquido >= 0 ? 'text-emerald-500' : 'text-red-500' },
              ].map((item, i) => (
                <div key={i} className="flex justify-between items-center py-3 border-b border-white/5 last:border-0 group transition-all hover:bg-white/[0.02]">
                  <div className={`flex items-center gap-3 ${item.color} text-[11px] font-black italic uppercase tracking-wider`}>
                    {item.icon}
                    <span className="text-muted-foreground group-hover:text-white transition-colors">{item.label}</span>
                  </div>
                  <span className={`text-sm font-black italic tracking-tight ${item.color}`}>{fmt(item.value)}</span>
                </div>
              ))}
            </div>

            <div className="glass-elevated p-6 rounded-3xl border border-primary/20 bg-primary/5 text-center relative overflow-hidden">
               <div className="absolute -left-10 -bottom-10 w-32 h-32 bg-primary/10 blur-3xl rounded-full" />
               <div className="text-[10px] font-black text-primary uppercase tracking-[0.3em] italic mb-2">MODO DE APURAÇÃO</div>
               <div className="text-xl font-black text-white italic tracking-tighter flex items-center justify-center gap-2">
                 {regime === 'competencia' ? <TrendingUp className="w-5 h-5 text-primary" /> : <Minus className="w-5 h-5 text-primary rotate-90" />}
                 {regime === 'competencia' ? 'ESTRATÉGIA COMPETÊNCIA' : 'REALIDADE CAIXA'}
               </div>
               <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mt-3 opacity-60 leading-relaxed">
                 {regime === 'competencia' ? 'Reconhecimento contábil por emissão de fatura/vencimento' : 'Reconhecimento efetivo por entrada e saída de numerário'}
               </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
