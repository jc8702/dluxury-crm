'use client';

import React, { useState, useEffect } from 'react';
import { 
  Search, Calendar, Filter, FileText, 
  ChevronRight, ExternalLink, Trash2, Box, X, Clock
} from 'lucide-react';
import { api } from '@/lib/api';
import { CardSkeleton } from '../../../../design-system/components/Skeleton';

interface HistoricoModalProps {
  onLoadPlan: (plan: any) => void;
  onFechar: () => void;
}

const STYLES = {
  glass: "backdrop-blur-md bg-slate-900/90 border border-slate-700 shadow-2xl",
  input: "bg-slate-950/50 border border-slate-700 rounded-lg px-3 py-2 text-white focus:border-emerald-500 outline-none transition-all",
  card: "bg-slate-800/40 border border-slate-700/50 rounded-xl hover:border-emerald-500/50 hover:bg-slate-800 transition-all cursor-pointer group"
};

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
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="card glass w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl border-primary/20">
        
        {/* HEADER */}
        <div className="p-6 border-b border-border flex items-center justify-between bg-surface/50">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary rounded-xl text-primary-text">
              <Clock size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black text-foreground uppercase tracking-tight">Histórico de Planos</h2>
              <p className="text-xs text-muted-foreground font-medium uppercase opacity-60">Visualize e recupere planos de corte aprovados</p>
            </div>
          </div>
          <button onClick={onFechar} className="btn btn-outline p-2 hover:bg-danger/10 hover:text-danger hover:border-danger transition-all">
            <X size={24} />
          </button>
        </div>

        {/* FILTROS PADRONIZADOS */}
        <div className="p-6 bg-surface/30 border-b border-border flex gap-4 items-center">
          <div className="flex-1 relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4 group-focus-within:text-primary transition-colors" />
            <input 
              type="text" 
              placeholder="🔍 BUSCAR POR NOME DO PLANO..." 
              value={filtroTexto}
              onChange={e => setFiltroTexto(e.target.value)}
              className="input w-full pl-10"
            />
          </div>
          <div className="w-72 relative group">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4 group-focus-within:text-primary transition-colors" />
            <select 
              value={filtroProjeto}
              onChange={e => setFiltroProjeto(e.target.value)}
              className="input w-full pl-10 appearance-none cursor-pointer"
            >
              <option value="">🗂️ TODOS OS PROJETOS</option>
              {projetos.map(proj => (
                <option key={proj.id} value={proj.id}>{proj.nome}</option>
              ))}
            </select>
          </div>
        </div>

        {/* LISTA DE RESULTADOS */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3 custom-scrollbar bg-surface/10">
          {loading ? (
            <div className="flex flex-col gap-3">
               <CardSkeleton />
               <CardSkeleton />
               <CardSkeleton />
            </div>
          ) : planosFiltrados.length > 0 ? (
            planosFiltrados.map(plano => (
              <div 
                key={plano.id} 
                onClick={() => onLoadPlan(plano)}
                className="card p-5 flex items-center justify-between hover:border-primary hover:bg-primary/5 transition-all cursor-pointer group border-border/50"
              >
                <div className="flex items-center gap-5">
                  <div className="w-14 h-14 bg-surface rounded-xl flex items-center justify-center text-muted-foreground group-hover:text-primary transition-colors border border-border">
                    <FileText size={28} />
                  </div>
                  <div>
                    <h4 className="font-black text-foreground text-lg mb-1 uppercase tracking-tight group-hover:text-primary transition-colors">{plano.nome}</h4>
                    <div className="flex items-center gap-5 text-[11px] text-muted-foreground font-bold uppercase tracking-widest opacity-70">
                      <span className="flex items-center gap-1.5 bg-surface/50 px-2 py-1 rounded">
                        <Calendar size={12} className="text-primary" /> {new Date(plano.created_at).toLocaleDateString()}
                      </span>
                      <span className="flex items-center gap-1.5 bg-surface/50 px-2 py-1 rounded">
                        <Box size={12} className="text-primary" /> {plano.resultado?.layouts?.length || 0} Chapas
                      </span>
                      {plano.projeto_id && (
                        <span className="text-primary/80 bg-primary/10 px-2 py-1 rounded">
                          PROJETO: {projetos.find(p => p.id === plano.projeto_id)?.nome || 'Móvel Custom'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <div className="text-2xl font-black text-foreground tabular-nums">
                      {plano.resultado?.aproveitamento_percentual?.toFixed(1)}%
                    </div>
                    <div className="text-[10px] text-muted-foreground font-black uppercase tracking-tighter">Eficiência</div>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-surface border border-border flex items-center justify-center group-hover:bg-primary group-hover:text-primary-text transition-all">
                    <ChevronRight size={20} className="translate-x-0 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="h-80 flex flex-col items-center justify-center text-muted-foreground text-center">
              <div className="w-24 h-24 bg-surface rounded-full flex items-center justify-center mb-6 opacity-20 border-4 border-dashed border-border">
                <FileText size={48} />
              </div>
              <h3 className="text-xl font-black text-foreground/50 uppercase mb-2">Nenhum plano encontrado</h3>
              <p className="text-sm max-w-xs mx-auto opacity-60">Não encontramos nenhum resultado para os filtros aplicados. Tente buscar por outro termo ou projeto.</p>
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="p-4 bg-surface/80 border-t border-border flex items-center justify-between">
          <div className="flex gap-4">
             <span className="text-[9px] font-black uppercase text-primary tracking-widest bg-primary/10 px-2 py-1 rounded">V2.0 STABLE</span>
             <span className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">NEON POSTGRESQL</span>
          </div>
          <p className="text-[10px] text-muted-foreground font-medium uppercase opacity-50 italic">D'Luxury Industrial ERP • Gerenciamento de Corte de Precisão</p>
        </div>
      </div>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: var(--border); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: var(--primary); }
      `}</style>
    </div>
  );
}
