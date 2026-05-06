'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Scissors, Plus, Save, Trash2, 
  Printer, FileText, Download, Layout, Layers, RefreshCcw,
  Box, Settings2, X, CheckCircle, FileUp, ChevronRight,
  Maximize2, ZoomIn, ZoomOut, Search, QrCode, Cpu, Clock
} from 'lucide-react';

import { HistoricoModal } from '../components/HistoricoModal';
import { ExportacaoModal } from '../components/ExportacaoModal';
import { api } from '@/lib/api';
import { CanvasAvancado } from '../components/CanvasAvancado';
import { ImportacaoModal } from '../components/ImportacaoModal';
import { exportarMapaCorte } from '../../application/usecases/ExportarMapaCorte';
import { exportarEtiquetas } from '../../application/usecases/ExportarEtiquetas';
import { exportarCNC, salvarArquivoCNC } from '../../application/usecases/ExportarCNC';
import { retalhosRepository } from '../../infrastructure/repositories/RetalhosRepository';
import { OtimizadorComRetalhos } from '../../domain/services/OtimizadorComRetalhos';
import { InsumosService } from '../../application/services/InsumosService';
import { EngineeringService } from '../../application/services/EngineeringService';
import { ScrapScoringService } from '../../domain/services/ScrapScoringService';
import type { Peca, ResultadoOtimizacao, LayoutChapa } from '../../domain/entities/CuttingPlan';

// ────────────────────────────────────────────────────────────────────────────────
// COMPONENTES AUXILIARES
// ────────────────────────────────────────────────────────────────────────────────

const Toast = ({ message, type, onClose }: { message: string, type: 'success' | 'error' | 'info', onClose: () => void }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const config = {
    success: { icon: CheckCircle, class: 'bg-success/10 border-success/20 text-success' },
    error: { icon: X, class: 'bg-destructive/10 border-destructive/20 text-destructive' },
    info: { icon: Clock, class: 'bg-info/10 border-info/20 text-info' }
  };

  const { icon: Icon, class: colorClass } = config[type];

  return (
    <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl border glass animate-in fade-in slide-in-from-bottom-4 duration-300 ${colorClass}`}>
      <Icon size={18} />
      <span className="text-sm font-medium">{message}</span>
      <button onClick={onClose} className="ml-2 hover:opacity-70 transition-opacity">
        <X size={14} />
      </button>
    </div>
  );
};

// ────────────────────────────────────────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ────────────────────────────────────────────────────────────────────────────────

export default function PlanoCorteIndustrialPage() {
  // --- ESTADO ---
  const [pecas, setPecas] = useState<Peca[]>([]);
  const [chapaPadrao, setChapaPadrao] = useState({ largura: 2750, altura: 1830, sku: 'MDF-PADRAO' });
  const [kerf, setKerf] = useState(3);
  const [resultado, setResultado] = useState<ResultadoOtimizacao | null>(null);
  const [activeLayoutIdx, setActiveLayoutIdx] = useState(0);
  const [usarRetalhos, setUsarRetalhos] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [planoNome, setPlanoNome] = useState('NOVO PLANO DE CORTE');
  const [searchPeca, setSearchPeca] = useState('');
  const [showHistorico, setShowHistorico] = useState(false);
  const [executionMode, setExecutionMode] = useState(false);
  const [pecasCortadas, setPecasCortadas] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => setToast({ message, type });

  const activeLayout = useMemo(() => {
    return resultado?.layouts?.[activeLayoutIdx] || null;
  }, [resultado, activeLayoutIdx]);

  const otimizador = useMemo(() => new OtimizadorComRetalhos(retalhosRepository), []);

  // --- LÓGICA ---
  const handleOtimizar = useCallback(async () => {
    if (pecas.length === 0) return showToast('Adicione peças antes de otimizar.', 'error');
    
    setLoading(true);
    try {
      const pecasExpandidas: Peca[] = [];
      pecas.forEach(p => {
        const qty = (p as any).quantidade || 1;
        for (let i = 0; i < qty; i++) {
          pecasExpandidas.push({ ...p, id: `${p.id}-${i}`, nome: qty > 1 ? `${p.nome} (${i+1}/${qty})` : p.nome });
        }
      });

      const res = await otimizador.otimizar(
        pecasExpandidas, 
        { largura_mm: chapaPadrao.largura, altura_mm: chapaPadrao.altura, sku: chapaPadrao.sku, espessura_mm: 18 }, 
        crypto.randomUUID(),
        usarRetalhos
      );

      setResultado(res);
      setActiveLayoutIdx(0);
      showToast('Otimização concluída com sucesso!', 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro desconhecido';
      showToast(`FALHA NA OTIMIZAÇÃO: ${msg}`, 'error');
    } finally {
      setLoading(false);
    }
  }, [pecas, chapaPadrao, otimizador, usarRetalhos]);

  const handleAddPecaManual = () => {
    const novaPeca: Peca = { 
      id: `peca-${Date.now()}`, 
      nome: `PEÇA ${pecas.length + 1}`, 
      largura: 500, 
      altura: 400, 
      rotacionavel: true,
      quantidade: 1,
      sku_chapa: chapaPadrao.sku,
      material: 'MDF-18MM'
    };
    setPecas([...pecas, novaPeca]);
  };

  const handleRemovePeca = (id: string) => setPecas(pecas.filter(p => p.id !== id));
  
  const handleImportarPecas = (pecasImportadas: any[]) => {
    const formatadas: Peca[] = pecasImportadas.map(p => ({
      id: p.id || `imp-${Math.random().toString(36).substr(2, 9)}`,
      sku: p.sku || p.sku_peca || p.referencia || '', 
      nome: p.nome || p.descricao || 'PEÇA IMPORTADA',
      largura: Number(p.largura_mm || p.largura || p.larguraMm || 0),
      altura: Number(p.altura_mm || p.altura || p.alturaMm || 0),
      rotacionavel: p.rotacionavel ?? p.podeRotacionar ?? true,
      quantidade: Number(p.quantidade || 1),
      sku_chapa: p.sku_chapa || p.grupoMaterialId || chapaPadrao.sku,
      material: p.material || p.grupoMaterialId || 'MDF-18MM'
    }));
    setPecas([...pecas, ...formatadas]);
    setShowImportModal(false);
  };

  const handleAprovarProducao = async () => {
    if (!resultado) return;
    setLoading(true);
    try {
      const materiaisConsumidos = resultado.layouts.map((l: any) => ({ 
        sku: l.chapa_sku, 
        tipo: l.tipo, 
        qtd: 1,
        id_retalho: l.retalho_id,
        plano_id: l.plano_id || crypto.randomUUID(),
        chapa_id: l.chapa_id // Se disponível
      }));

      // Coletar sobras (retalhos que serão gerados no estoque)
      const retalhosGerados: any[] = [];
      resultado.layouts.forEach((l: any) => {
        if (l.espacos_livres) {
          l.espacos_livres.forEach((s: any) => {
            // Regra industrial: Sobras >= 300x300mm são consideradas retalhos reutilizáveis
            if (s.largura >= 300 && s.altura >= 300) {
              retalhosGerados.push({
                largura_mm: s.largura,
                altura_mm: s.altura,
                espessura_mm: 18, // Espessura padrão ou vinda da chapa
                sku_chapa: l.chapa_sku,
                plano_corte_id: l.plano_id || crypto.randomUUID()
              });
            }
          });
        }
      });

      await api.planoCorte.aprovarProducao(materiaisConsumidos, retalhosGerados);
      showToast('PRODUÇÃO APROVADA E ESTOQUE SINCRONIZADO!', 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro desconhecido';
      showToast('ERRO: ' + msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const pecasFiltradas = useMemo(() => {
    const s = (searchPeca || '').trim().toLowerCase();
    if (!s) return pecas;
    return pecas.filter(p => {
      const nome = (p.nome || '').toLowerCase();
      const skuPeça = (p.sku || '').toLowerCase();
      const skuChapa = (p.sku_chapa || '').toLowerCase();
      const material = (p.material || '').toLowerCase();
      const id = (p.id || '').toLowerCase();
      
      return (
        nome.includes(s) || 
        skuPeça.includes(s) || 
        skuChapa.includes(s) || 
        material.includes(s) || 
        id.includes(s)
      );
    });
  }, [pecas, searchPeca]);

  const pecasAgrupadas = useMemo(() => {
    const grupos: Record<string, typeof pecas> = {};
    pecasFiltradas.forEach(p => {
      const key = (p as any).sku_chapa || (p as any).material || 'GERAL';
      if (!grupos[key]) grupos[key] = [];
      grupos[key].push(p);
    });
    return grupos;
  }, [pecasFiltradas]);

  const togglePecaCortada = (pecaId: string) => {
    const newSet = new Set(pecasCortadas);
    if (newSet.has(pecaId)) newSet.delete(pecaId);
    else newSet.add(pecaId);
    setPecasCortadas(newSet);
  };

  const handleLayoutChange = (novoLayout: any) => {
    if (!resultado) return;
    const novosLayouts = [...resultado.layouts];
    novosLayouts[activeLayoutIdx] = novoLayout;
    setResultado({ ...resultado, layouts: novosLayouts });
  };

  const recomendacaoRetalho = useMemo(() => {
    if (!resultado || !resultado.layouts[activeLayoutIdx]) return null;
    const layout = resultado.layouts[activeLayoutIdx];
    const areaTotal = layout.largura_original_mm * layout.altura_original_mm;
    const sobraMm2 = areaTotal - layout.area_aproveitada_mm2;
    return ScrapScoringService.avaliar(layout.largura_original_mm, layout.altura_original_mm, sobraMm2);
  }, [resultado, activeLayoutIdx]);

  const handleLoadPlanFromHistory = (plan: any) => {
    setResultado(plan.resultado);
    setPlanoNome(plan.nome);
    setShowHistorico(false);
  };

  // --- RENDER ---
  return (
    <div className="h-screen flex flex-col bg-background text-foreground overflow-hidden font-sans selection:bg-primary/30">
      
      {/* HEADER INDUSTRIAL */}
      <header className="h-16 px-6 flex items-center justify-between border-b border-border/40 bg-card/80 backdrop-blur-md z-30">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20 shadow-primary/10">
            <Scissors size={20} className="text-primary" />
          </div>
          <div>
            <h1 className="text-xs font-black tracking-[0.2em] text-primary uppercase">Industrial Cutting</h1>
            <p className="text-[10px] text-muted-foreground font-bold tracking-wider">{planoNome}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button 
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-bold bg-white/5 hover:bg-white/10 border border-border/40 transition-all uppercase tracking-widest active:scale-95"
            onClick={() => setShowImportModal(true)}
          >
            <FileUp size={14} className="text-info" />
            Importar
          </button>
          
          <button 
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-bold border transition-all uppercase tracking-widest active:scale-95 ${
              executionMode 
                ? 'bg-success/20 border-success/30 text-success' 
                : 'bg-white/5 border-border/40 hover:bg-white/10'
            }`}
            onClick={() => setExecutionMode(!executionMode)}
          >
            <Cpu size={14} className={executionMode ? 'animate-pulse' : ''} />
            {executionMode ? 'Modo Execução' : 'Modo Projeto'}
          </button>

          <div className="h-6 w-px bg-border/40 mx-2" />

          <button 
            className="group relative flex items-center gap-3 px-6 py-2 rounded-lg text-[10px] font-black bg-primary hover:bg-primary-hover text-primary-foreground transition-all uppercase tracking-[0.15em] shadow-primary hover:shadow-glow active:scale-95 disabled:opacity-30 disabled:grayscale disabled:pointer-events-none"
            onClick={handleOtimizar}
            disabled={loading || pecas.length === 0}
          >
            {loading ? (
              <RefreshCcw size={14} className="animate-spin" />
            ) : (
              <Settings2 size={14} />
            )}
            {loading ? 'Calculando...' : 'Otimizar Agora'}
          </button>

          <button 
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-border/40 transition-all"
            onClick={() => setShowHistorico(true)}
            title="Histórico"
          >
            <Clock size={18} className="text-muted-foreground" />
          </button>
        </div>
      </header>

      {/* GRID PRINCIPAL 3 COLUNAS */}
      <main className="flex-1 grid grid-cols-[320px_1fr_320px] overflow-hidden">
        
        {/* COLUNA 1: PEÇAS (LISTAGEM) */}
        <aside className="bg-card/40 border-r border-border/40 flex flex-col overflow-hidden backdrop-blur-sm">
          <div className="p-5 border-b border-border/40 flex flex-col gap-4 bg-white/[0.01]">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Painéis & Medidas</span>
              <button 
                onClick={handleAddPecaManual} 
                className="w-6 h-6 rounded-md bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 flex items-center justify-center transition-all"
              >
                <Plus size={14} />
              </button>
            </div>
            
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-muted-foreground uppercase ml-1">Largura</label>
                <input 
                  type="number" 
                  value={chapaPadrao.largura} 
                  onChange={e => setChapaPadrao({...chapaPadrao, largura: Number(e.target.value)})} 
                  className="w-full h-8 px-2 bg-black/40 border border-border/40 rounded-md text-[11px] focus:border-primary/50 outline-none transition-all font-mono" 
                />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-muted-foreground uppercase ml-1">Altura</label>
                <input 
                  type="number" 
                  value={chapaPadrao.altura} 
                  onChange={e => setChapaPadrao({...chapaPadrao, altura: Number(e.target.value)})} 
                  className="w-full h-8 px-2 bg-black/40 border border-border/40 rounded-md text-[11px] focus:border-primary/50 outline-none transition-all font-mono" 
                />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-muted-foreground uppercase ml-1">Kerf</label>
                <input 
                  type="number" 
                  value={kerf} 
                  onChange={e => setKerf(Number(e.target.value))} 
                  className="w-full h-8 px-2 bg-black/40 border border-border/40 rounded-md text-[11px] focus:border-primary/50 outline-none transition-all font-mono text-primary" 
                />
              </div>
            </div>

            <div className="relative group">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <input 
                value={searchPeca} 
                onChange={e => setSearchPeca(e.target.value)} 
                placeholder="Buscar por nome ou SKU..." 
                className="w-full h-9 pl-10 pr-10 bg-black/40 border border-border/40 rounded-lg text-[11px] focus:border-primary/50 focus:bg-black/60 outline-none transition-all" 
              />
              {searchPeca && (
                <button 
                  onClick={() => setSearchPeca('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
            {pecasFiltradas.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 opacity-20 gap-3 text-muted-foreground">
                <Layers size={40} />
                <span className="text-[10px] font-black uppercase tracking-widest text-center px-8">Nenhuma peça no inventário</span>
              </div>
            ) : (
              Object.entries(pecasAgrupadas).map(([grupo, gpecas]) => (
                <div key={grupo} className="space-y-2">
                  <div className="flex items-center gap-2 px-1">
                    <div className="w-1 h-1 rounded-full bg-primary" />
                    <span className="text-[10px] font-black text-primary/80 uppercase tracking-[0.1em]">{grupo}</span>
                    <div className="flex-1 h-px bg-primary/10" />
                    <span className="text-[9px] font-bold text-muted-foreground">{gpecas.length}</span>
                  </div>
                  <div className="grid gap-2">
                    {gpecas.map(p => (
                      <div key={p.id} className="group relative glass p-3 rounded-xl border border-border/40 hover:border-primary/30 bg-white/[0.02] hover:bg-white/[0.04] transition-all">
                        <div className="flex flex-col">
                          <div className="flex justify-between items-start">
                            <span className="text-[11px] font-bold text-foreground group-hover:text-white transition-colors truncate pr-6">{p.nome}</span>
                            <button 
                              onClick={() => handleRemovePeca(p.id)}
                              className="absolute top-2 right-2 p-1.5 opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive rounded-md transition-all text-muted-foreground"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                          {p.sku && (
                            <span className="text-[9px] font-black text-primary/60 uppercase tracking-widest mt-0.5">{p.sku}</span>
                          )}
                        </div>
                        <div className="grid grid-cols-3 gap-2 mt-3 text-[10px] font-mono">
                          <div className="bg-black/20 p-1 rounded border border-border/40 text-center">
                            <span className="text-muted-foreground text-[8px] block uppercase leading-tight font-sans">Larg</span>
                            <span className="text-primary/80">{p.largura}</span>
                          </div>
                          <div className="bg-black/20 p-1 rounded border border-border/40 text-center">
                            <span className="text-muted-foreground text-[8px] block uppercase leading-tight font-sans">Alt</span>
                            <span className="text-primary/80">{p.altura}</span>
                          </div>
                          <div className="bg-primary/5 p-1 rounded border border-primary/10 text-center">
                            <span className="text-primary/50 text-[8px] block uppercase leading-tight font-sans">Qtd</span>
                            <span className="text-primary font-bold">{(p as any).quantidade || 1}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </aside>

        {/* COLUNA 2: CANVAS (VISUALIZAÇÃO) */}
        <section className="relative flex flex-col bg-background overflow-hidden">
          {resultado && (
            <div className="h-12 bg-card/60 border-b border-border/40 flex gap-2 px-4 items-center overflow-x-auto custom-scrollbar no-scrollbar">
              {resultado.layouts.map((l: any, idx: number) => (
                <button 
                  key={idx} 
                  onClick={() => setActiveLayoutIdx(idx)} 
                  className={`flex items-center gap-2 h-7 px-3 rounded-full text-[10px] font-bold transition-all border whitespace-nowrap ${
                    activeLayoutIdx === idx 
                      ? 'bg-primary border-primary-hover text-primary-foreground shadow-primary' 
                      : 'bg-white/5 border-border/40 text-muted-foreground hover:bg-white/10 hover:text-foreground'
                  }`}
                >
                  <Layers size={12} />
                  CHAPA {idx + 1}
                  <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded ${activeLayoutIdx === idx ? 'bg-black/20 text-primary-foreground/60' : 'bg-black/40 text-muted-foreground'}`}>
                    {l.tipo}
                  </span>
                </button>
              ))}
            </div>
          )}
          
          <div className="flex-1 relative bg-[radial-gradient(hsl(var(--muted-foreground)/0.15)_1px,transparent_1px)] [background-size:20px_20px] [background-position:center]">
            <div className="absolute inset-0 flex items-center justify-center p-8">
              <div className="w-full h-full glass rounded-2xl border border-border/40 overflow-hidden shadow-2xl flex items-center justify-center bg-background/40">
                <CanvasAvancado 
                  layout={activeLayout}
                  chapaDimensoes={{ largura: chapaPadrao.largura, altura: chapaPadrao.altura }}
                  executionMode={executionMode}
                  pecasCortadasIds={pecasCortadas}
                  onPecaClick={(p) => executionMode && togglePecaCortada(p.id)}
                  recomendacaoRetalho={recomendacaoRetalho || undefined}
                  onLayoutChange={handleLayoutChange}
                />
              </div>
            </div>

            {/* FLOATING TOOLS */}
            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-2 p-2 rounded-2xl bg-card/90 backdrop-blur-xl border border-border/40 shadow-2xl z-20">
              <button className="p-2.5 rounded-xl hover:bg-white/10 text-muted-foreground hover:text-primary transition-all"><ZoomIn size={18} /></button>
              <button className="p-2.5 rounded-xl hover:bg-white/10 text-muted-foreground hover:text-primary transition-all"><ZoomOut size={18} /></button>
              <div className="h-6 w-px bg-border/40 mx-1" />
              <button className="p-2.5 rounded-xl hover:bg-white/10 text-muted-foreground hover:text-primary transition-all"><Maximize2 size={18} /></button>
              <button 
                className="p-2.5 rounded-xl hover:bg-white/10 text-muted-foreground hover:text-primary transition-all" 
                title="Exportar Produção"
                onClick={() => setShowExportModal(true)}
              >
                <Download size={18} />
              </button>
            </div>
          </div>
        </section>

        {/* COLUNA 3: RESUMO & AÇÕES */}
        <aside className="bg-card/40 border-l border-border/40 flex flex-col p-6 gap-8 overflow-y-auto backdrop-blur-sm">
          <div className="space-y-1">
            <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Resumo Analítico</h4>
            <div className="h-1 w-10 bg-primary rounded-full" />
          </div>
          
          {recomendacaoRetalho && (
            <div className={`relative overflow-hidden group p-5 rounded-2xl border transition-all ${
              recomendacaoRetalho.recomendacao === 'GUARDAR' 
                ? 'bg-success/5 border-success/20 shadow-lg shadow-success/5' 
                : 'bg-destructive/5 border-destructive/20 shadow-lg shadow-destructive/5'
            }`}>
              <div className="absolute -top-6 -right-6 opacity-[0.05] group-hover:scale-110 transition-transform duration-700">
                {recomendacaoRetalho.recomendacao === 'GUARDAR' ? <Save size={80} /> : <Trash2 size={80} />}
              </div>
              <div className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2 flex items-center gap-2">
                <Box size={12} className="text-primary" />
                Veredito de Reuso
              </div>
              <div className={`text-2xl font-black mb-2 tracking-tight ${
                recomendacaoRetalho.recomendacao === 'GUARDAR' ? 'text-success' : 'text-destructive'
              }`}>
                {recomendacaoRetalho.recomendacao}
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed italic border-l-2 border-border/40 pl-3">
                "{recomendacaoRetalho.justificativa}"
              </p>
            </div>
          )}

          <div className="space-y-3">
            <div className="group p-4 rounded-xl border border-border/40 bg-white/[0.01] hover:bg-white/[0.03] transition-all">
              <div className="flex justify-between items-center mb-1">
                <span className="text-[10px] font-bold text-muted-foreground uppercase">Chapas</span>
                <span className="text-[10px] font-black text-primary bg-primary/10 px-2 py-0.5 rounded">Utilização</span>
              </div>
              <div className="text-2xl font-black text-foreground">
                {resultado?.layouts.length || 0} <span className="text-xs font-bold text-muted-foreground ml-1">UNIDADES</span>
              </div>
            </div>

            <div className="group p-4 rounded-xl border border-border/40 bg-success/5 hover:bg-success/10 transition-all">
              <div className="flex justify-between items-center mb-1">
                <span className="text-[10px] font-bold text-muted-foreground uppercase">Eficiência</span>
                <span className="text-[10px] font-black text-success bg-success/10 px-2 py-0.5 rounded">Economia</span>
              </div>
              <div className="text-2xl font-black text-success">
                {resultado ? Math.round(resultado.aproveitamento_medio || 0) : 0}% 
                <span className="text-[10px] font-bold text-muted-foreground ml-2 uppercase font-sans">Aproveitamento</span>
              </div>
            </div>
          </div>

          <div className="flex-1" />

          <div className="space-y-4">
            <div className="flex gap-2">
              <button 
                className="flex-1 flex items-center justify-center gap-2 p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-border/40 text-[10px] font-black uppercase tracking-widest transition-all"
                onClick={() => setShowExportModal(true)}
              >
                <Printer size={16} />
                Mapa
              </button>
              <button 
                className="flex-1 flex items-center justify-center gap-2 p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-border/40 text-[10px] font-black uppercase tracking-widest transition-all"
                onClick={() => setShowExportModal(true)}
              >
                <FileText size={16} />
                Etiquetas
              </button>
            </div>
            
            <button 
              className="w-full h-14 rounded-2xl bg-gradient-to-br from-primary to-primary-hover hover:brightness-110 text-primary-foreground font-black text-[11px] uppercase tracking-[0.2em] shadow-lg shadow-primary/20 active:scale-[0.98] transition-all disabled:opacity-50 disabled:grayscale disabled:pointer-events-none flex items-center justify-center gap-3"
              onClick={handleAprovarProducao} 
              disabled={!resultado || loading}
            >
              {loading ? <RefreshCcw size={18} className="animate-spin" /> : <CheckCircle size={18} />}
              {loading ? 'Processando...' : 'Aprovar Produção'}
            </button>
          </div>
        </aside>
      </main>

      {/* MODALS & TOASTS */}
      {showImportModal && <ImportacaoModal onImportar={handleImportarPecas} onFechar={() => setShowImportModal(false)} />}
      {showExportModal && resultado && (
        <ExportacaoModal 
          resultado={resultado} 
          planoNome={planoNome} 
          activeSuperficie={activeLayout} 
          activeChapaIdx={activeLayoutIdx}
          onClose={() => setShowExportModal(false)} 
        />
      )}
      {showHistorico && <HistoricoModal onFechar={() => setShowHistorico(false)} onLoadPlan={handleLoadPlanFromHistory} />}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
