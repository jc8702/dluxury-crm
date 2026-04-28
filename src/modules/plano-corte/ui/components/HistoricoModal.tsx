'use client';

import React, { useState, useEffect } from 'react';
import { 
  Search, Calendar, Filter, FileText, 
  ChevronRight, ExternalLink, Trash2, Box, X, Clock
} from 'lucide-react';
import { api } from '@/lib/api';

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
        setPlanos(listaPlanos);
        setProjetos(listaProjetos);
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
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className={`${STYLES.glass} w-full max-w-4xl max-h-[85vh] flex flex-col rounded-2xl overflow-hidden`}>
        
        {/* HEADER */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-600/20 rounded-lg text-emerald-500">
              <Clock size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Histórico de Planos</h2>
              <p className="text-xs text-slate-400">Visualize e recupere planos de corte aprovados</p>
            </div>
          </div>
          <button onClick={onFechar} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* FILTROS */}
        <div className="p-6 bg-slate-900/50 border-b border-slate-800 flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
            <input 
              type="text" 
              placeholder="Buscar por nome do plano..." 
              value={filtroTexto}
              onChange={e => setFiltroTexto(e.target.value)}
              className={`${STYLES.input} w-full pl-10`}
            />
          </div>
          <div className="w-64 relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
            <select 
              value={filtroProjeto}
              onChange={e => setFiltroProjeto(e.target.value)}
              className={`${STYLES.input} w-full pl-10 appearance-none`}
            >
              <option value="">Todos os Projetos</option>
              {projetos.map(proj => (
                <option key={proj.id} value={proj.id}>{proj.nome}</option>
              ))}
            </select>
          </div>
        </div>

        {/* LISTA */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
          {loading ? (
            <div className="h-40 flex items-center justify-center text-slate-500">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500 mr-3" />
              Carregando histórico...
            </div>
          ) : planosFiltrados.length > 0 ? (
            planosFiltrados.map(plano => (
              <div 
                key={plano.id} 
                onClick={() => onLoadPlan(plano)}
                className={`${STYLES.card} p-5 flex items-center justify-between`}
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-slate-900 rounded-lg flex items-center justify-center text-slate-500 group-hover:text-emerald-500 transition-colors">
                    <FileText size={24} />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-100 mb-1">{plano.nome}</h4>
                    <div className="flex items-center gap-4 text-[10px] text-slate-500 uppercase tracking-wider">
                      <span className="flex items-center gap-1">
                        <Calendar size={12} /> {new Date(plano.created_at).toLocaleDateString()}
                      </span>
                      <span className="flex items-center gap-1">
                        <Box size={12} /> {plano.resultado?.layouts?.length || 0} Chapas
                      </span>
                      {plano.projeto_id && (
                        <span className="text-emerald-500/70">
                          PROJETO: {projetos.find(p => p.id === plano.projeto_id)?.nome || 'N/A'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-lg font-black text-white">
                      {plano.resultado?.aproveitamento_percentual?.toFixed(1)}%
                    </div>
                    <div className="text-[10px] text-slate-500 uppercase">Eficiência</div>
                  </div>
                  <ChevronRight size={20} className="text-slate-600 group-hover:text-emerald-500 transition-all translate-x-0 group-hover:translate-x-1" />
                </div>
              </div>
            ))
          ) : (
            <div className="h-60 flex flex-col items-center justify-center text-slate-600">
              <FileText size={48} className="mb-4 opacity-20" />
              <p>Nenhum plano encontrado com estes filtros.</p>
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="p-4 bg-slate-950/50 border-t border-slate-800 flex justify-end">
          <p className="text-[10px] text-slate-500 italic">D'Luxury Industrial ERP • Todos os dados salvos no Neon PostgreSQL</p>
        </div>
      </div>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; border-radius: 10px; }
      `}</style>
    </div>
  );
}
