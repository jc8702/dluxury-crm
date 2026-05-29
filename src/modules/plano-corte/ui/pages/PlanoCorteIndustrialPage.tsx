'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { 
  Upload, 
  Scissors, 
  Save, 
  Clock, 
  Zap, 
  FileText, 
  X,
  CheckCircle,
  Printer, 
  Cpu, 
  Loader2,
  AlertTriangle,
  FileSpreadsheet
} from 'lucide-react';

import { api } from '@/lib/api';
import { HistoricoModal } from '../components/HistoricoModal';
import { ExportacaoModal } from '../components/ExportacaoModal';
import { ImportacaoModal } from '../components/ImportacaoModal';

// Novos Componentes
import { BuscaSKU } from '../components/BuscaSKU';
import { AbasProjetoChapaS } from '../components/AbasProjetoChapaS';
import { CanvasComAbas } from '../components/CanvasComAbas';
import { PainelPecasChapa } from '../components/PainelPecasChapa';
import { Button } from '../../../../design-system/components';

// Camada de Aplicação / Casos de Uso
import { OtimizarPorChapa } from '../../application/use-cases/OtimizarPorChapa';
import { ProcessarPDF } from '../../application/use-cases/ProcessarPDF';

// Tipos
import type { 
  ProjetoCorte, 
  ChapaSelecionada, 
  Peca, 
  ResultadoOtimizacaoPorChapa 
} from '../../domain/types.js';

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
  const [showImportModal, setShowImportModal] = useState(false);
  const [showHistorico, setShowHistorico] = useState(false);
  const [showDuplicateScrapsModal, setShowDuplicateScrapsModal] = useState(false);
  const [duplicateScrapsPayload, setDuplicateScrapsPayload] = useState<any>(null);
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

  const handleImportPecas = useCallback((pecasImportadas: any[]) => {
    if (!chapaAtivaId) {
      showToast('Selecione um material antes de importar peças.', 'error');
      return;
    }

    const novasPecas: Peca[] = pecasImportadas.map((csv: any, i: number) => ({
      id: `csv_${Date.now()}_${i}_${Math.random().toString(36).substr(2, 4)}`,
      nome: csv.nome || `Peça ${i + 1}`,
      largura: csv.largura_mm,
      altura: csv.altura_mm,
      quantidade: csv.quantidade || 1,
      rotacionavel: csv.rotacionavel ?? true,
      material: csv.material || undefined,
      identificador: csv.identificador || undefined,
      observacoes: csv.observacoes || undefined,
      fio_de_fita: csv.fio_de_fita,
      sku: csv.sku || undefined,
    }));

    setProjeto(prev => ({
      ...prev,
      chapas: prev.chapas.map(c =>
        c.id === chapaAtivaId
          ? { ...c, pecas: [...c.pecas, ...novasPecas] }
          : c
      )
    }));

    if (resultados[chapaAtivaId]) {
      setResultados(prev => {
        const { [chapaAtivaId]: _, ...rest } = prev;
        return rest;
      });
    }

    showToast(`${novasPecas.length} peças importadas via CSV!`, 'success');
  }, [chapaAtivaId, resultados]);

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

  // --- CARREGAR PLANO DO HISTÓRICO ---
  const handleLoadPlan = useCallback((plano: any) => {
    setProjeto({
      id: plano.id || `proj_${Date.now()}`,
      nome: plano.nome || 'PLANO CARREGADO',
      chapas: plano.materiais || [],
      criado_em: new Date(plano.created_at || Date.now()),
      status: 'rascunho', // Mantemos como rascunho para permitir edição
      projeto_id: plano.projeto_id,
      orcamento_id: plano.orcamento_id,
      visita_id: plano.visita_id,
      ordem_producao_id: plano.ordem_producao_id,
    });
    
    if (plano.resultado && plano.resultado.perChapa) {
      setResultados(plano.resultado.perChapa);
    } else {
      setResultados({});
    }

    if (plano.materiais && plano.materiais.length > 0) {
      setChapaAtivaId(plano.materiais[0].id);
    } else {
      setChapaAtivaId(null);
    }
    
    setShowHistorico(false);
    showToast('Plano carregado com sucesso!', 'success');
  }, []);

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
        status: projeto.status,
        projeto_id: projeto.projeto_id,
        orcamento_id: projeto.orcamento_id,
        visita_id: projeto.visita_id
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

      const retalhos_gerados: any[] = [];
      Object.values(resultados).forEach(res => {
        const qtdChapas = res.chapas_necessarias || 1;
        res.layouts.forEach(layout => {
          layout.espacos_livres?.forEach(sobra => {
            if (sobra.largura >= 300 && sobra.altura >= 300) {
              retalhos_gerados.push({
                largura_mm: sobra.largura,
                altura_mm: sobra.altura,
                espessura_mm: projeto.chapas.find(c => c.id === res.chapa_id)?.espessura_mm || 18,
                sku_chapa: projeto.chapas.find(c => c.id === res.chapa_id)?.sku_chapa,
                plano_corte_id: projeto.id,
                projeto_origem: projeto.nome
              });
            }
          });
        });
      });

      // Verificação de retalhos duplicados se o plano já tem ID (foi salvo ou carregado)
      if (projeto.id && !projeto.id.startsWith('proj_')) {
         const retalhosDuplicadosResponse = await api.planoCorte.verificarRetalhosDuplicados(projeto.id, retalhos_gerados);
         if (retalhosDuplicadosResponse?.duplicados?.length > 0) {
            setDuplicateScrapsPayload({
               materiais_consumidos,
               retalhos_gerados,
               extras: {
                  nome_projeto: projeto.nome,
                  projeto_id: projeto.projeto_id,
                  orcamento_id: projeto.orcamento_id,
                  visita_id: projeto.visita_id
               },
               duplicados: retalhosDuplicadosResponse.duplicados
            });
            setShowDuplicateScrapsModal(true);
            setLoading(false);
            return;
         }
      }

      await executeAprovarProducao(materiais_consumidos, retalhos_gerados, {
        nome_projeto: projeto.nome,
        projeto_id: projeto.projeto_id,
        orcamento_id: projeto.orcamento_id,
        visita_id: projeto.visita_id
      }, false);
      
    } catch (err: any) {
      showToast(`Erro na aprovação: ${err.message}`, 'error');
      setLoading(false);
    }
  };

  const executeAprovarProducao = async (materiais_consumidos: any, retalhos_gerados: any, extras: any, ignorarDuplicados: boolean) => {
    setLoading(true);
    try {
      const res = await api.planoCorte.aprovarProducao(materiais_consumidos, retalhos_gerados, { ...extras, ignorar_retalhos_duplicados: ignorarDuplicados });

      if (res) {
        const opId = res.data?.op_id || 'N/A';
        setProjeto(prev => ({ ...prev, status: 'producao' }));
        setShowDuplicateScrapsModal(false);
        showToast(`Produção aprovada! OP: ${opId}. Estoque atualizado e sobras registradas.`, 'success');
      }
    } catch (err: any) {
      showToast(`Erro na aprovação: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  // --- RENDER ---
  return (
    <div className="h-screen flex flex-col bg-background text-foreground overflow-hidden font-sans">
      
      {/* GLOBAL LOADING OVERLAY */}
      {loading && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="relative">
            <div className="w-24 h-24 rounded-full border-t-2 border-[#FFA500] animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <Scissors size={32} className="text-[#FFA500] animate-pulse" />
            </div>
          </div>
          <h2 className="mt-8 text-xl font-black tracking-[0.2em] uppercase text-white animate-pulse">Processando Inteligência Industrial</h2>
          <p className="mt-2 text-[10px] font-bold text-[#888] uppercase tracking-widest">Extraindo dados e otimizando layout...</p>
        </div>
      )}

      {/* HEADER */}
      <header className="h-16 px-8 flex items-center justify-between border-b border-border bg-card z-30">
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
          <label id="btn-importar-desenho" className="inline-flex items-center justify-center gap-2 h-11 px-4 rounded-xl border border-border bg-foreground/5 text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-foreground/10 cursor-pointer transition-all group">
            <Upload size={16} className="text-muted-foreground group-hover:text-primary transition-colors" />
            <span>Importar Desenho PDF</span>
            <input type="file" className="hidden" accept=".pdf,.dxf" onChange={handleImportPDF} />
          </label>

          <Button 
            variant="outline"
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
                } catch (_err) {
                  showToast('Erro ao carregar demo.', 'error');
                }
              }, 1000);
            }}
            className="flex items-center gap-2 h-11"
          >
            <Zap size={14} />
            Demo PDF
          </Button>
          
          <Button 
            variant="outline"
            onClick={() => setShowImportModal(true)}
            className="flex items-center gap-2 h-11"
          >
            <FileSpreadsheet size={14} />
            Importar CSV
          </Button>

          <Button 
            variant={executionMode ? "primary" : "secondary"}
            onClick={() => setExecutionMode(!executionMode)} 
            className="flex items-center gap-2 h-11"
          >
            <Cpu size={14} className={executionMode ? 'animate-pulse' : ''} /> 
            {executionMode ? 'Execução Ativa' : 'Modo Projeto'}
          </Button>

          {projeto.status !== 'producao' && (
            <Button 
              variant="primary"
              onClick={handleAprovarProducao}
              disabled={loading || Object.keys(resultados).length === 0}
              className="bg-success text-success-foreground hover:bg-success/90 h-11 flex items-center gap-2"
            >
              <CheckCircle size={16} />
              Aprovar Produção
            </Button>
          )}

          <Button 
            variant="primary"
            onClick={handleSalvarProjeto}
            disabled={loading}
            className="flex items-center gap-2 h-11"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            Salvar Projeto
          </Button>

          <Button 
            variant="ghost"
            size="icon"
            onClick={handleLimparProjeto}
            className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 h-11 w-11"
            title="Limpar Projeto"
          >
            <X size={18} />
          </Button>

          <Button 
            variant="ghost"
            size="icon"
            onClick={() => setShowHistorico(true)} 
            className="text-muted-foreground hover:bg-foreground/10 h-11 w-11"
            title="Histórico de Planos"
          >
            <Clock size={18} />
          </Button>
        </div>
      </header>

      {/* GRID PRINCIPAL */}
      <main className="flex-1 grid grid-cols-[400px_1fr_350px] overflow-hidden">
        
        {/* SIDEBAR ESQUERDA - BUSCA E ABAS */}
        <aside className="bg-card border-r border-border flex flex-col overflow-hidden p-6 gap-6">
          <div className="flex flex-col gap-2">
            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Seleção de Material</span>
            <BuscaSKU 
              onAdicionarChapa={handleAdicionarChapa} 
              chapasSelecionadas={projeto.chapas} 
            />
          </div>

          <div className="flex-1 flex flex-col overflow-hidden">
            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-4">Projeto por Chapas</span>
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
        <section className="relative flex flex-col overflow-hidden p-8 bg-background">
           <CanvasComAbas 
            chapaAtiva={chapaAtiva}
            resultado={resultadoAtivo}
           />
        </section>

        {/* SIDEBAR DIREITA - PEÇAS E RESULTADOS */}
        <aside className="bg-card border-l border-border flex flex-col p-6 gap-6 overflow-hidden">
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
                  larguraChapa={chapaAtiva.largura_mm}
                  alturaChapa={chapaAtiva.altura_mm}
                />
              </div>

              {resultadoAtivo && (
                <div className="pt-6 border-t border-[#222] space-y-4">
                  <span className="text-[10px] font-black text-[#555] uppercase tracking-[0.2em]">Ações da Chapa</span>
                  
                  {resultadoAtivo.chapas_necessarias > 1 && (
                    <div className="px-4 py-3 rounded-xl bg-[#FFA500]/10 border border-[#FFA500]/20 flex items-start gap-3">
                      <AlertTriangle size={14} className="text-[#FFA500] mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-[9px] font-black text-[#FFA500] uppercase tracking-wider">
                          {resultadoAtivo.chapas_necessarias} Chapas Necessárias
                        </p>
                        <p className="text-[8px] text-[#888] mt-0.5 font-mono">
                          {resultadoAtivo.pecas_total_count || 0} peças distribuídas em {resultadoAtivo.layouts.length} layouts
                          {resultadoAtivo.pecas_rejeitadas && resultadoAtivo.pecas_rejeitadas.length > 0 
                            ? ` · ${resultadoAtivo.pecas_rejeitadas.length} não couberam` 
                            : ''}
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    <Button 
                      variant="outline"
                      className="flex items-center justify-center gap-2 p-3 h-auto rounded-xl bg-white/5 border border-[#333] text-[9px] font-black uppercase hover:bg-white/10 transition-all"
                    >
                      <Printer size={14} /> Mapa
                    </Button>
                    <Button 
                      variant="outline"
                      className="flex items-center justify-center gap-2 p-3 h-auto rounded-xl bg-white/5 border border-[#333] text-[9px] font-black uppercase hover:bg-white/10 transition-all"
                    >
                      <FileText size={14} /> Etiquetas
                    </Button>
                  </div>
                  <Button 
                    onClick={handleAprovarProducao}
                    disabled={loading}
                    className="w-full h-12 bg-[#10B981] hover:bg-[#059669] text-white font-black text-[10px] uppercase tracking-widest transition-all shadow-lg shadow-[#10B981]/10 disabled:opacity-30 flex items-center justify-center gap-2"
                  >
                    {loading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                    Aprovar Produção
                  </Button>
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
      {showImportModal && (
        <ImportacaoModal
          onImportar={handleImportPecas}
          onFechar={() => setShowImportModal(false)}
        />
      )}
      {showHistorico && <HistoricoModal onFechar={() => setShowHistorico(false)} onLoadPlan={handleLoadPlan} />}
      {showDuplicateScrapsModal && duplicateScrapsPayload && (
         <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 text-foreground">
            <div className="bg-card border border-border rounded-3xl max-w-lg w-full p-8 shadow-2xl relative overflow-hidden">
               <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-yellow-500 to-orange-500" />
               <h3 className="text-xl font-black text-foreground uppercase tracking-tight mb-4 flex items-center gap-2">
                  <Scissors className="text-yellow-500" size={24} />
                  Atenção: Sobras Duplicadas
               </h3>
               <p className="text-sm text-muted-foreground mb-6">
                  Notamos que você já gerou sobras deste mesmo plano de corte com dimensões idênticas anteriormente. 
                  Como você editou e tentou aprovar novamente, isso pode duplicar os retalhos no estoque.
               </p>
               <div className="bg-muted p-4 mb-8 max-h-[150px] overflow-y-auto custom-scrollbar rounded-xl border border-border">
                  {duplicateScrapsPayload.duplicados.map((dup: any, i: number) => (
                     <div key={i} className="text-xs text-muted-foreground flex justify-between py-1 border-b border-border/10 last:border-0">
                        <span>{dup.largura_mm}x{dup.altura_mm} mm (Esp. {dup.espessura_mm}mm)</span>
                        <span className="font-bold text-foreground">Qtd: {dup.quantidade}</span>
                     </div>
                  ))}
               </div>
               <div className="flex justify-end gap-3">
                  <Button variant="outline" className="border-border text-foreground hover:bg-muted" onClick={() => setShowDuplicateScrapsModal(false)}>Cancelar</Button>
                  <Button 
                     variant="secondary"
                     className="bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20 border border-yellow-500/20"
                     onClick={() => executeAprovarProducao(duplicateScrapsPayload.materiais_consumidos, duplicateScrapsPayload.retalhos_gerados, duplicateScrapsPayload.extras, true)}
                  >
                     Ignorar Sobras Duplicadas
                  </Button>
                  <Button 
                     variant="primary"
                     onClick={() => executeAprovarProducao(duplicateScrapsPayload.materiais_consumidos, duplicateScrapsPayload.retalhos_gerados, duplicateScrapsPayload.extras, false)}
                  >
                     Gerar Tudo Novamente
                  </Button>
               </div>
            </div>
         </div>
      )}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
