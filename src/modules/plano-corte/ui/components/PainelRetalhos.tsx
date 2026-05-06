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
  AlertTriangle,
  RefreshCcw,
  Loader2
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
    <div className="flex flex-col gap-8">
      {/* HEADER & STATS */}
      <div className="flex justify-between items-start flex-wrap gap-8">
        <div>
          <h1 className="text-3xl font-black flex items-center gap-3 text-primary tracking-tight">
            <Package size={32} />
            ESTOQUE DE RETALHOS
          </h1>
          <p className="text-muted-foreground mt-1 text-sm font-medium">Otimização e reuso de sobras de MDF industrial</p>
        </div>

        <div className="flex gap-4 flex-wrap">
          <StatCard 
            label="TOTAL ITENS" 
            value={stats.total} 
            icon={<Layers size={18} className="text-info" />} 
          />
          <StatCard 
            label="ÁREA TOTAL" 
            value={`${stats.areaTotal.toFixed(2)} m²`} 
            icon={<Package size={18} className="text-success" />} 
          />
          <StatCard 
            label="ECONOMIA" 
            value={`R$ ${stats.economiaEstimada.toLocaleString()}`} 
            icon={<CheckCircle2 size={18} className="text-warning" />} 
          />
        </div>
      </div>

      {/* FILTROS */}
      <div className="glass p-5 flex flex-wrap gap-4 items-center rounded-2xl border border-border/40">
        <div className="relative flex-1 min-w-[250px] group">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <input 
            type="text" 
            placeholder="Filtrar por SKU (ex: MDF-BRANCO-18)..."
            className="w-full h-11 pl-11 pr-4 bg-background/50 border border-border/40 rounded-xl text-sm focus:border-primary/50 outline-none transition-all"
            onChange={(e) => setFiltro({ ...filtro, sku_chapa: e.target.value })}
          />
        </div>

        <select 
          className="h-11 px-4 bg-background/50 border border-border/40 rounded-xl text-sm outline-none focus:border-primary/50 transition-all min-w-[180px] appearance-none cursor-pointer"
          onChange={(e) => setFiltro({ ...filtro, disponivel: e.target.value === 'true' })}
        >
          <option value="true">DISPONÍVEIS</option>
          <option value="false">TODOS OS REGISTROS</option>
        </select>

        <button className="h-11 px-6 rounded-xl border border-border/40 bg-white/5 hover:bg-white/10 text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all">
          <Filter size={16} />
          FILTROS AVANÇADOS
        </button>
      </div>

      {/* TABELA */}
      <div className="glass rounded-2xl border border-border/40 overflow-hidden shadow-xl">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/[0.02] border-b border-border/40">
                <th className="px-6 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Material / SKU</th>
                <th className="px-6 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Dimensões (mm)</th>
                <th className="px-6 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Origem</th>
                <th className="px-6 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Estado</th>
                <th className="px-6 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Data</th>
                <th className="px-6 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-20 text-center text-muted-foreground">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
                    <p className="text-xs font-bold uppercase tracking-widest opacity-50">Sincronizando estoque industrial...</p>
                  </td>
                </tr>
              ) : retalhos.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-20 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center opacity-30">
                      <Package size={48} className="mb-4" />
                      <p className="text-xs font-bold uppercase tracking-widest">Nenhum retalho disponível em estoque</p>
                    </div>
                  </td>
                </tr>
              ) : (
                retalhos.map((retalho) => (
                  <tr key={retalho.id} className="group hover:bg-white/[0.02] transition-all">
                    <td className="px-6 py-4">
                      <div className="font-bold text-sm text-foreground group-hover:text-primary transition-colors">{retalho.sku_chapa}</div>
                      <div className="text-[10px] text-muted-foreground font-medium uppercase tracking-tight">{retalho.nome_material || 'MDF PADRÃO'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="bg-primary/10 text-primary px-2 py-0.5 rounded border border-primary/20 text-[11px] font-black font-mono">
                          {retalho.largura_mm} x {retalho.altura_mm}
                        </span>
                        <span className="text-muted-foreground text-[10px] font-bold">{retalho.espessura_mm}mm</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-[10px] font-black text-muted-foreground uppercase tracking-tight">
                        {retalho.origem === 'sobra_plano_corte' ? <History size={12} /> : <Package size={12} />}
                        {retalho.origem.replace('_', ' ')}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {retalho.disponivel ? (
                        <div className="flex items-center gap-2 text-[10px] font-black text-success uppercase tracking-widest">
                          <div className="w-1.5 h-1.5 rounded-full bg-success shadow-[0_0_8px_hsl(var(--success))]" />
                          DISPONÍVEL
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                          <div className="w-1.5 h-1.5 rounded-full bg-border" />
                          UTILIZADO
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-[11px] font-mono text-muted-foreground">
                      {new Date(retalho.criado_em).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-foreground transition-all" title="Ver Detalhes">
                          <ExternalLink size={16} />
                        </button>
                        {retalho.disponivel && (
                          <button 
                            onClick={() => handleDescarte(retalho.id)}
                            className="p-2 rounded-lg bg-white/5 hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all" 
                            title="Descartar"
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
      <div className="glass p-4 flex items-center gap-3 rounded-xl border border-warning/20 border-l-4 border-l-warning bg-warning/5">
        <AlertTriangle size={18} className="text-warning shrink-0" />
        <span className="text-[11px] text-muted-foreground font-semibold leading-tight">
          <span className="text-warning font-black uppercase mr-2">Política de Descarte:</span>
          Retalhos menores que 300x300mm são automaticamente removidos para otimização de espaço físico.
        </span>
      </div>
    </div>
  );
};

const StatCard: React.FC<{ label: string; value: string | number; icon: React.ReactNode }> = ({ label, value, icon }) => (
  <div className="glass p-5 min-w-[180px] flex-1 rounded-2xl border border-border/40 shadow-lg group hover:border-primary/20 transition-all">
    <div className="flex items-center gap-2 text-[10px] font-black text-muted-foreground uppercase tracking-[0.1em] mb-3">
      {icon}
      {label}
    </div>
    <div className="text-2xl font-black text-foreground group-hover:text-primary transition-colors">{value}</div>
  </div>
);

