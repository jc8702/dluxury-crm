'use client';

import React, { useState, useEffect } from 'react';
import { 
  Search, Calendar, Filter, FileText, 
  ChevronRight, X, Clock, Box, Loader2
} from 'lucide-react';
import { api } from '@/lib/api';
import { CardSkeleton } from '../../../../design-system/components/Skeleton';

interface HistoricoModalProps {
  onLoadPlan: (plan: any) => void;
  onFechar: () => void;
}

export function HistoricoModal({ onLoadPlan, onFechar }: HistoricoModalProps) {
  const [planos, setPlanos] = useState<any[]>([]);
  const [projetos, setProjetos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroTexto, setFiltroTexto] = useState('');
  const [filtroProjeto, setFiltroProjeto] = useState('');

  useEffect(() => {
    async function carregarDados() {
      try {
        const [listaPlanos, listaProjetos] = await Promise.all([
          api.planoCorte.list(),
          api.projects.list()
        ]);
        setPlanos(listaPlanos || []);
        setProjetos(listaProjetos || []);
      } catch (err) {
        console.error('Erro ao carregar histórico:', err);
      } finally {
        setLoading(false);
      }
    }
    carregarDados();
  }, []);

  const planosFiltrados = planos.filter(p => {
    const matchesTexto = p.nome.toLowerCase().includes(filtroTexto.toLowerCase());
    const matchesProjeto = !filtroProjeto || p.projeto_id === filtroProjeto;
    return matchesTexto && matchesProjeto;
  });

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-300">
      <div className="glass-elevated w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden rounded-3xl border border-border/40 shadow-2xl animate-in zoom-in duration-300">
        
        {/* HEADER */}
        <div className="p-8 border-b border-border/40 flex items-center justify-between bg-card/40">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center text-primary border border-primary/20 shadow-primary/10">
              <Clock size={32} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-foreground tracking-tight">HISTÓRICO DE PLANOS</h2>
              <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest opacity-60">Visualize e recupere planos de corte aprovados</p>
            </div>
          </div>
          <button 
            onClick={onFechar} 
            className="p-2 rounded-xl hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all"
          >
            <X size={28} />
          </button>
        </div>

        {/* FILTROS */}
        <div className="p-6 bg-card/20 border-b border-border/40 flex gap-4 items-center">
          <div className="flex-1 relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={18} />
            <input 
              type="text" 
              placeholder="BUSCAR POR NOME DO PLANO..." 
              value={filtroTexto}
              onChange={e => setFiltroTexto(e.target.value)}
              className="w-full h-11 pl-11 pr-4 bg-background/50 border border-border/40 rounded-xl text-sm focus:border-primary/50 outline-none transition-all"
            />
          </div>
          <div className="w-72 relative group">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={18} />
            <select 
              value={filtroProjeto}
              onChange={e => setFiltroProjeto(e.target.value)}
              className="w-full h-11 pl-11 pr-4 bg-background/50 border border-border/40 rounded-xl text-sm focus:border-primary/50 outline-none transition-all appearance-none cursor-pointer"
            >
              <option value="">TODOS OS PROJETOS</option>
              {projetos.map(proj => (
                <option key={proj.id} value={proj.id}>{proj.nome}</option>
              ))}
            </select>
          </div>
        </div>

        {/* LISTA DE RESULTADOS */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <Loader2 className="w-10 h-10 animate-spin mb-4 text-primary" />
              <p className="text-xs font-black uppercase tracking-widest opacity-50">Sincronizando com a base de dados...</p>
            </div>
          ) : planosFiltrados.length > 0 ? (
            planosFiltrados.map(plano => (
              <div 
                key={plano.id} 
                onClick={() => onLoadPlan(plano)}
                className="group relative p-5 flex items-center justify-between bg-white/[0.02] border border-border/40 rounded-2xl hover:border-primary/30 hover:bg-white/[0.04] transition-all cursor-pointer overflow-hidden"
              >
                <div className="flex items-center gap-6">
                  <div className="w-16 h-16 bg-background rounded-2xl flex items-center justify-center text-muted-foreground group-hover:text-primary transition-all border border-border/40 shadow-inner">
                    <FileText size={32} />
                  </div>
                  <div>
                    <h4 className="font-black text-foreground text-lg mb-2 tracking-tight group-hover:text-primary transition-colors">{plano.nome}</h4>
                    <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                      <span className="flex items-center gap-2 px-2 py-1 bg-white/5 rounded-lg">
                        <Calendar size={12} className="text-primary" /> 
                        {new Date(plano.created_at).toLocaleDateString()}
                      </span>
                      <span className="flex items-center gap-2 px-2 py-1 bg-white/5 rounded-lg">
                        <Box size={12} className="text-primary" /> 
                        {plano.resultado?.layouts?.length || 0} Chapas
                      </span>
                      {plano.projeto_id && (
                        <span className="text-primary bg-primary/10 px-2 py-1 rounded-lg">
                          {projetos.find(p => p.id === plano.projeto_id)?.nome || 'Móvel Custom'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-8">
                  <div className="text-right">
                    <div className="text-3xl font-black text-foreground tabular-nums leading-none">
                      {plano.resultado?.aproveitamento_percentual?.toFixed(1)}<span className="text-lg opacity-50">%</span>
                    </div>
                    <div className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mt-1">Eficiência</div>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-white/5 border border-border/40 flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary transition-all shadow-lg group-hover:shadow-primary/20">
                    <ChevronRight size={24} className="group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground opacity-30">
              <FileText size={64} className="mb-6" />
              <h3 className="text-xl font-black uppercase tracking-widest mb-2">Nenhum plano encontrado</h3>
              <p className="text-xs font-bold max-w-xs text-center leading-relaxed">Não encontramos resultados para os filtros aplicados. Tente buscar por outro termo ou projeto.</p>
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="p-5 border-t border-border/40 bg-card/60 flex items-center justify-between">
          <div className="flex gap-4">
             <span className="text-[10px] font-black uppercase text-primary tracking-widest bg-primary/10 px-3 py-1 rounded-full border border-primary/20">V2.0 STABLE</span>
             <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest py-1">NEON POSTGRESQL</span>
          </div>
          <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider opacity-50 italic">D'Luxury Industrial ERP • Cutting Engine v5.1</p>
        </div>
      </div>
    </div>
  );
}

