'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { 
  Plus, 
  Trash2, 
  Search, 
  Upload, 
  Scissors, 
  Save, 
  Clock, 
  Box, 
  ChevronRight, 
  Layers, 
  Maximize2, 
  Zap, 
  FileText, 
  Download, 
  Settings, 
  Play, 
  Info, 
  AlertCircle,
  X,
  CheckCircle,
  Printer, 
  Settings2, 
  FileUp, 
  Cpu, 
  Loader2
} from 'lucide-react';

import { api } from '@/lib/api';
import { HistoricoModal } from '../components/HistoricoModal';
import { ExportacaoModal } from '../components/ExportacaoModal';

// Novos Componentes
import { BuscaSKU } from '../components/BuscaSKU';
import { AbasProjetoChapaS } from '../components/AbasProjetoChapaS';
import { CanvasComAbas } from '../components/CanvasComAbas';
import { PainelPecasChapa } from '../components/PainelPecasChapa';

// Camada de Aplicação / Casos de Uso
import { OtimizarPorChapa } from '../../application/use-cases/OtimizarPorChapa';
import { ProcessarPDF } from '../../application/use-cases/ProcessarPDF';

// Tipos
import { 
  ProjetoCorte, 
  ChapaSelecionada, 
  Peca, 
  ResultadoOtimizacaoPorChapa 
} from '../../domain/types';

// ────────────────────────────────────────────────────────────────────────────────
// COMPONENTES AUXILIARES
// ────────────────────────────────────────────────────────────────────────────────

const Toast = ({ message, type, onClose }: { message: string, type: 'success' | 'error' | 'info', onClose: () => void }) => {
  React.useEffect(() => {
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
  const [projeto, setProjeto] = useState<ProjetoCorte>({
    id: `proj_${Date.now()}`,
    nome: 'NOVO PROJETO DE CORTE',
    chapas: [],
    criado_em: new Date(),
    status: 'rascunho'
  });

  const [chapaAtivaId, setChapaAtivaId] = useState<string | null>(null);
  const [resultados, setResultados] = useState<Record<string, ResultadoOtimizacaoPorChapa>>({});
  const [loading, setLoading] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showHistorico, setShowHistorico] = useState(false);
  const [executionMode, setExecutionMode] = useState(false);
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => setToast({ message, type });

  // --- MEMOS ---
  const chapaAtiva = useMemo(() => {
    return projeto.chapas.find(c => c.id === chapaAtivaId) || null;
  }, [projeto.chapas, chapaAtivaId]);

  const resultadoAtivo = useMemo(() => {
    return chapaAtivaId ? resultados[chapaAtivaId] : undefined;
  }, [resultados, chapaAtivaId]);

  // --- SERVIÇOS ---
  const otimizador = useMemo(() => new OtimizarPorChapa(), []);
  const pdfProcessor = useMemo(() => new ProcessarPDF(), []);

  // --- HANDLERS PROJETO ---
  const handleAdicionarChapa = useCallback((novaChapa: ChapaSelecionada) => {
    setProjeto(prev => ({
      ...prev,
      chapas: [...prev.chapas, novaChapa]
    }));
    setChapaAtivaId(novaChapa.id);
    showToast(`Material ${novaChapa.sku_chapa} adicionado!`, 'success');
  }, []);

  const handleRemoverChapa = useCallback((id: string) => {
    setProjeto(prev => {
      const novasChapas = prev.chapas.filter(c => c.id !== id);
      if (chapaAtivaId === id) {
        setChapaAtivaId(novasChapas[0]?.id || null);
      }
      return { ...prev, chapas: novasChapas };
    });
    setResultados(prev => {
      const { [id]: _, ...rest } = prev;
      return rest;
    });
  }, [chapaAtivaId]);

  const handleUpdatePeca = useCallback((chapaId: string, pecaId: string, data: Partial<Peca>) => {
    setProjeto(prev => ({
      ...prev,
      chapas: prev.chapas.map(c => {
        if (c.id !== chapaId) return c;
        return {
          ...c,
          pecas: c.pecas.map(p => p.id === pecaId ? { ...p, ...data } : p)
        };
      })
    }));
    // Limpar resultado se houver alteração técnica
    if (resultados[chapaId]) {
      setResultados(prev => {
        const { [chapaId]: _, ...rest } = prev;
        return rest;
      });
    }
  }, [resultados]);

  const handleAddPeca = useCallback((chapaId: string) => {
    console.log('[Industrial] Adicionando peça na chapa:', chapaId);
    const novaPeca: Peca = {
      id: `peca_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      nome: 'NOVA PEÇA',
      largura: 500,
      altura: 400,
      quantidade: 1,
      rotacionavel: true
    };

    setProjeto(prev => {
      const novasChapas = prev.chapas.map(c => {
        if (c.id !== chapaId) return c;
        return { ...c, pecas: [...c.pecas, novaPeca] };
      });
      console.log('[Industrial] Novas chapas:', novasChapas);
      return { ...prev, chapas: novasChapas };
    });

    if (resultados[chapaId]) {
      setResultados(prev => {
        const { [chapaId]: _, ...rest } = prev;
        return rest;
      });
    }
  }, [resultados]);

  const handleRemovePeca = useCallback((chapaId: string, pecaId: string) => {
    setProjeto(prev => ({
      ...prev,
      chapas: prev.chapas.map(c => {
        if (c.id !== chapaId) return c;
        return { ...c, pecas: c.pecas.filter(p => p.id !== pecaId) };
      })
    }));
  }, []);

  // --- LÓGICA DE OTIMIZAÇÃO ---
  const handleOtimizarChapa = useCallback(async (chapaId: string) => {
    const chapa = projeto.chapas.find(c => c.id === chapaId);
    if (!chapa || chapa.pecas.length === 0) return showToast('Adicione peças antes de otimizar.', 'error');
    
    setLoading(true);
    try {
      // Expandir quantidades para o algoritmo
      const pecasExpandidas: Peca[] = [];
      chapa.pecas.forEach(p => {
        const qtd = p.quantidade || 1;
        for (let i = 0; i < qtd; i++) {
          pecasExpandidas.push({ ...p, id: `${p.id}_${i}` });
        }
      });

      const res = await otimizador.executar(chapa, pecasExpandidas);
      setResultados(prev => ({ ...prev, [chapaId]: res }));
      showToast(`Otimização de ${chapa.nome_exibicao} concluída!`, 'success');
    } catch (err: any) {
      showToast(`Erro na otimização: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  }, [projeto.chapas, otimizador]);

  // --- IMPORTAÇÃO PDF ---
  const handleImportPDF = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    try {
      const novoProjeto = await pdfProcessor.executar(file);
      setProjeto(novoProjeto);
      if (novoProjeto.chapas.length > 0) {
        setChapaAtivaId(novoProjeto.chapas[0].id);
      }
      showToast(`Projeto "${novoProjeto.nome}" importado com sucesso!`, 'success');
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
      e.target.value = '';
    }
  };

  const handleSalvarProjeto = async () => {
    if (projeto.chapas.length === 0) return showToast('Adicione materiais antes de salvar.', 'error');
    
    setLoading(true);
    try {
      const payload = {
        nome: projeto.nome,
        materiais: projeto.chapas,
        resultado: {
          perChapa: resultados,
          totalAproveitamento: Object.values(resultados).reduce((acc, curr) => acc + curr.aproveitamento_percentual, 0) / (Object.values(resultados).length || 1)
        },
        status: projeto.status
      };

      const res = await api.planoCorte.create(payload);
      
      if (res) {
        setProjeto(prev => ({ ...prev, id: res.id }));
        showToast('Projeto salvo com sucesso no banco de dados!', 'success');
      }
    } catch (err: any) {
      showToast(`Erro ao salvar: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleLimparProjeto = () => {
    if (confirm('Tem certeza que deseja limpar todo o projeto?')) {
      setProjeto({
        id: `proj_${Date.now()}`,
        nome: 'NOVO PROJETO DE CORTE',
        chapas: [],
        criado_em: new Date(),
        status: 'rascunho'
      });
      setChapaAtivaId(null);
      setResultados({});
      showToast('Projeto reiniciado.');
    }
  };

  const handleAprovarProducao = async () => {
    if (Object.keys(resultados).length === 0) {
      return showToast('Otimize as chapas antes de aprovar a produção.', 'error');
    }

    setLoading(true);
    try {
      // 1. Preparar dados de consumo
      const materiais_consumidos = projeto.chapas.map(chapa => {
        const resultado = resultados[chapa.id];
        return {
          sku: chapa.sku_chapa,
          chapa_id: chapa.id,
          qtd: resultado ? resultado.chapas_necessarias : 1,
          plano_id: projeto.id
        };
      });

      // 2. Preparar retalhos gerados (sobras acima de 300x300)
      const retalhos_gerados: any[] = [];
      Object.values(resultados).forEach(res => {
        res.layouts.forEach(layout => {
          layout.sobra_retalhos?.forEach(sobra => {
            if (sobra.largura >= 300 && sobra.altura >= 300) {
              retalhos_gerados.push({
                largura_mm: sobra.largura,
                altura_mm: sobra.altura,
                espessura_mm: projeto.chapas.find(c => c.id === res.chapa_id)?.espessura_mm || 18,
                sku_chapa: projeto.chapas.find(c => c.id === res.chapa_id)?.sku_chapa,
                plano_corte_id: projeto.id
              });
            }
          });
        });
      });

      const res = await api.planoCorte.aprovarProducao(materiais_consumidos, retalhos_gerados);

      if (res) {
        setProjeto(prev => ({ ...prev, status: 'producao' }));
        showToast('Produção aprovada! Estoque atualizado e sobras registradas.', 'success');
      }
    } catch (err: any) {
      showToast(`Erro na aprovação: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  // --- RENDER ---
  return (
    <div className="h-screen flex flex-col bg-[#0A0A0A] text-white overflow-hidden font-sans">
      
      {/* HEADER */}
      <header className="h-16 px-8 flex items-center justify-between border-b border-[#222] bg-[#111] z-30">
        <div className="flex items-center gap-6">
          <div className="w-12 h-12 rounded-2xl bg-[#FFA500]/10 flex items-center justify-center border border-[#FFA500]/20 shadow-[0_0_20px_rgba(255,165,0,0.1)]">
            <Scissors size={24} className="text-[#FFA500]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-[10px] font-black tracking-[0.3em] text-[#FFA500] uppercase">Industrial Intelligence</h1>
              <div className="px-2 py-0.5 rounded bg-[#10B981]/10 text-[#10B981] text-[8px] font-black uppercase tracking-widest border border-[#10B981]/20">Live</div>
            </div>
            <input 
              value={projeto.nome}
              onChange={e => setProjeto(prev => ({ ...prev, nome: e.target.value.toUpperCase() }))}
              className="bg-transparent text-sm text-[#888] font-black uppercase outline-none focus:text-white transition-colors"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-3 px-6 h-12 rounded-xl bg-white/5 hover:bg-white/10 border border-[#333] cursor-pointer transition-all group">
            <Upload size={18} className="text-[#666] group-hover:text-[#FFA500]" />
            <span className="text-xs font-black uppercase tracking-widest text-[#888] group-hover:text-white">Importar PDF</span>
            <input type="file" className="hidden" accept=".pdf" onChange={handleImportPDF} />
          </label>

          <button 
            onClick={() => {
              // Simulação de PDF para teste
              showToast('Simulando processamento de PDF...', 'info');
              setTimeout(async () => {
                const mockFile = { name: 'PROJETO_DEMO_DLUXURY.pdf' } as File;
                try {
                  const p = await new ProcessarPDF().executar(mockFile);
                  setProjeto(p);
                  if (p.chapas.length > 0) setChapaAtivaId(p.chapas[0].id);
                  showToast('PDF Demo carregado com sucesso!', 'success');
                } catch (err) {
                  showToast('Erro ao carregar demo.', 'error');
                }
              }, 1000);
            }}
            className="flex items-center gap-3 px-4 h-12 rounded-xl border border-dashed border-[#444] hover:border-[#FFA500]/50 hover:bg-[#FFA500]/5 transition-all group"
          >
            <Zap size={16} className="text-[#444] group-hover:text-[#FFA500]" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#444] group-hover:text-[#FFA500]">Demo PDF</span>
          </button>
          
          <button 
            onClick={() => setExecutionMode(!executionMode)} 
            className={`flex items-center gap-2 px-6 py-3 rounded-xl text-[10px] font-black border transition-all uppercase tracking-widest ${executionMode ? 'bg-[#10B981]/20 border-[#10B981]/30 text-[#10B981]' : 'bg-white/5 border-[#333] hover:bg-white/10'}`}
          >
            <Cpu size={16} className={executionMode ? 'animate-pulse' : ''} /> 
            {executionMode ? 'Execução Ativa' : 'Modo Projeto'}
          </button>

          {projeto.status !== 'producao' && (
            <button 
              onClick={handleAprovarProducao}
              disabled={loading || Object.keys(resultados).length === 0}
              className="px-6 h-12 rounded-xl bg-[#10B981] hover:bg-[#059669] text-white font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-[#10B981]/20 flex items-center gap-3 disabled:opacity-30"
            >
              <CheckCircle size={18} />
              Aprovar Produção
            </button>
          )}

          <button 
            onClick={handleSalvarProjeto}
            disabled={loading}
            className="flex items-center gap-2 px-6 py-3 rounded-xl text-[10px] font-black bg-[#FFA500] hover:bg-[#FF6B35] text-black transition-all uppercase tracking-widest shadow-lg shadow-[#FFA500]/10 disabled:opacity-30"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            Salvar Projeto
          </button>

          <button 
            onClick={handleLimparProjeto}
            className="p-3 rounded-xl bg-white/5 hover:bg-red-500/10 border border-[#333] hover:border-red-500/30 transition-all group"
            title="Limpar Projeto"
          >
            <X size={20} className="text-[#666] group-hover:text-red-500" />
          </button>

          <button onClick={() => setShowHistorico(true)} className="p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-[#333] transition-all">
            <Clock size={20} className="text-[#666]" />
          </button>
        </div>
      </header>

      {/* GRID PRINCIPAL */}
      <main className="flex-1 grid grid-cols-[400px_1fr_350px] overflow-hidden">
        
        {/* SIDEBAR ESQUERDA - BUSCA E ABAS */}
        <aside className="bg-[#111] border-r border-[#222] flex flex-col overflow-hidden p-6 gap-6">
          <div className="flex flex-col gap-2">
            <span className="text-[10px] font-black text-[#555] uppercase tracking-[0.2em]">Seleção de Material</span>
            <BuscaSKU 
              onAdicionarChapa={handleAdicionarChapa} 
              chapasSelecionadas={projeto.chapas} 
            />
          </div>

          <div className="flex-1 flex flex-col overflow-hidden">
            <span className="text-[10px] font-black text-[#555] uppercase tracking-[0.2em] mb-4">Projeto por Chapas</span>
            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-2 max-h-[450px]">
              <AbasProjetoChapaS 
                chapas={projeto.chapas}
                chapaAtiva={chapaAtiva}
                onSelecionarChapa={setChapaAtivaId}
                onRemoverChapa={handleRemoverChapa}
                onNovaAba={() => {
                  const searchInput = document.getElementById('sku-search-input');
                  if (searchInput) {
                    searchInput.focus();
                    searchInput.scrollIntoView({ behavior: 'smooth' });
                  }
                }}
              />
            </div>
          </div>
        </aside>

        {/* ÁREA CENTRAL - CANVAS */}
        <section className="relative flex flex-col overflow-hidden p-8 bg-[#0a0a0a]">
           <CanvasComAbas 
            chapaAtiva={chapaAtiva}
            resultado={resultadoAtivo}
           />
        </section>

        {/* SIDEBAR DIREITA - PEÇAS E RESULTADOS */}
        <aside className="bg-[#111] border-l border-[#222] flex flex-col p-6 gap-6 overflow-hidden">
          {chapaAtiva ? (
            <>
              <div className="flex-1 overflow-hidden flex flex-col">
                <PainelPecasChapa 
                  chapaId={chapaAtiva.id}
                  pecas={chapaAtiva.pecas}
                  onAddPeca={() => handleAddPeca(chapaAtiva.id)}
                  onUpdatePeca={(id, data) => handleUpdatePeca(chapaAtiva.id, id, data)}
                  onRemovePeca={(id) => handleRemovePeca(chapaAtiva.id, id)}
                  onOtimizar={() => handleOtimizarChapa(chapaAtiva.id)}
                  isOtimizando={loading}
                />
              </div>

              {resultadoAtivo && (
                <div className="pt-6 border-t border-[#222] space-y-4">
                  <span className="text-[10px] font-black text-[#555] uppercase tracking-[0.2em]">Ações da Chapa</span>
                  <div className="grid grid-cols-2 gap-2">
                    <button className="flex items-center justify-center gap-2 p-3 rounded-xl bg-white/5 border border-[#333] text-[9px] font-black uppercase hover:bg-white/10 transition-all">
                      <Printer size={14} /> Mapa
                    </button>
                    <button className="flex items-center justify-center gap-2 p-3 rounded-xl bg-white/5 border border-[#333] text-[9px] font-black uppercase hover:bg-white/10 transition-all">
                      <FileText size={14} /> Etiquetas
                    </button>
                  </div>
                  <button 
                    onClick={handleAprovarProducao}
                    disabled={loading}
                    className="w-full h-12 rounded-xl bg-[#10B981] hover:bg-[#059669] text-white font-black text-[10px] uppercase tracking-widest transition-all shadow-lg shadow-[#10B981]/10 disabled:opacity-30 flex items-center justify-center gap-2"
                  >
                    {loading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                    Aprovar Produção
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center opacity-20 text-center gap-4">
              <div className="w-16 h-16 rounded-full border-2 border-dashed border-[#444] flex items-center justify-center">
                <Scissors size={24} />
              </div>
              <span className="text-xs font-black uppercase tracking-[0.2em]">Selecione uma chapa para gerenciar peças</span>
            </div>
          )}
        </aside>
      </main>

      {/* MODALS E TOASTS */}
      {showExportModal && resultadoAtivo && (
        <ExportacaoModal 
          resultado={resultadoAtivo as any} // Ajustar tipagem legada se necessário
          planoNome={projeto.nome} 
          activeSuperficie={resultadoAtivo.layouts[0]} 
          activeChapaIdx={0}
          onClose={() => setShowExportModal(false)} 
        />
      )}
      {showHistorico && <HistoricoModal onFechar={() => setShowHistorico(false)} onLoadPlan={() => {}} />}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
