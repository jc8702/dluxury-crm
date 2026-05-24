import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Scissors, Upload, FileText, RotateCw, Maximize2, Minimize2, ChevronLeft, ChevronRight, Plus, Trash2, Play, Zap, Grid3x3, Ruler, Box, PlayCircle, Cpu, ShieldAlert, CheckCircle, FileCheck, Settings, AlertTriangle } from 'lucide-react';
import { listarPlanos } from '../../infrastructure/repositories/PlanoCorteRepository';
import { MaxRectsOptimizer } from '../../../plano-corte/domain/services/MaxRectsOptimizer';
import CanvasSimulador3D from '../components/CanvasSimulador3D';
import InfoCorte from '../components/InfoCorte';
import PainelPecasRapido from '../components/PainelPecasRapido';
import CncConfigPanel from '../components/CncConfigPanel';
import SafetyAnalysisPanel from '../components/SafetyAnalysisPanel';
import type { PlanoCorteCarregado, LayoutSimulacao, PecaSimulacao, CncConfig, IssueWithRecommendation, SetupDiff, CollisionPolicy } from '../../domain/types';
import type { Peca } from '../../../plano-corte/domain/types';

// NOVAS IMPORTAÇÕES DO MOTOR INDUSTRIAL CNC
import {
  gerarSimulationProgram,
  calcularMetrics,
  obterEstadoNoInstante,
} from '../../domain/simulationEngine';
import {
  exportarRelatorioCNC,
  exportarEtiquetasCNC,
  exportarRelatorioSeguranca,
  type SafetyReportData,
} from '../components/LabelExporter';
import TimelineControls from '../components/TimelineControls';
import MetricsPanel from '../components/MetricsPanel';

import { DEFAULT_CNC_CONFIG, analyzeIssues, applySafeAdjustment, gerarFixtureSettings } from '../../domain/adjustmentEngine';
import { salvarConfigCNC, carregarConfigCNC } from '../../infrastructure/persistence';
import type { GhostPreviewItem } from '../../domain/types';

type ModoSimulador = 'rapida' | 'carregar';
type ModoExibicao = 'layout' | 'simulacao' | 'verificacao';

interface PecaInput {
  id: string;
  nome: string;
  comprimento: number;
  largura: number;
  espessura: number;
  quantidade: number;
}

const DEFAULT_CHAPAS = [
  { label: 'MDF 18MM 2750X1830', largura: 2750, altura: 1830, espessura: 18 },
  { label: 'MDF 15MM 2750X1830', largura: 2750, altura: 1830, espessura: 15 },
  { label: 'MDF 6MM 2750X1830', largura: 2750, altura: 1830, espessura: 6 },
  { label: 'MDF 18MM 2500X1850', largura: 2500, altura: 1850, espessura: 18 },
  { label: 'MDF 18MM 2800X2070', largura: 2800, altura: 2070, espessura: 18 },
  { label: 'PERSONALIZADO', largura: 2750, altura: 1830, espessura: 18 },
];

let idCounter = 0;
function gerarId() {
  idCounter += 1;
  return `peca_${Date.now()}_${idCounter}`;
}

function converterPlanoParaLayouts(plano: PlanoCorteCarregado): LayoutSimulacao[] {
  const layouts: LayoutSimulacao[] = [];

  const mats = (plano.materiais || []) as any[];
  const matsMap = new Map<string, any>();
  for (const m of mats) {
    matsMap.set(m.id, m);
    if (m.sku_chapa) matsMap.set(m.sku_chapa, m);
  }

  const resultado = plano.resultado;
  if (resultado?.perChapa) {
    for (const chapaId of Object.keys(resultado.perChapa)) {
      const res = resultado.perChapa[chapaId];
      if (!res?.layouts) continue;
      const mat = matsMap.get(chapaId);
      const esp = mat ? Number(mat.espessura_mm) || 18 : 18;
      let layoutCount = 0;
      for (const l of res.layouts) {
        layoutCount++;
        const larg = l.largura_original_mm || (mat ? Number(mat.largura_mm) : 0) || 2750;
        const alt = l.altura_original_mm || (mat ? Number(mat.altura_mm) : 0) || 1830;
        const skuChapa = l.chapa_sku || mat?.sku_chapa || chapaId;
        
        // Coleta os espaços vazios reais gerados no layout de nesting para exibir os retalhos
        const espacosLivres = (l.espacos_livres || []).map((e: any) => ({
          x: e.x || 0,
          y: e.y || 0,
          largura: e.largura || e.w || 0,
          altura: e.altura || e.h || 0
        }));

        layouts.push({
          chapa: {
            sku: `${skuChapa.toUpperCase()} - CHAPA ${layoutCount}`,
            largura: larg,
            altura: alt,
            espessura: esp,
          },
          pecas: (l.pecas_posicionadas || []).map((p: any) => ({
            id: p.id,
            nome: p.nome,
            comprimento: p.largura,
            largura: p.altura,
            espessura: esp,
            x: p.x,
            y: p.y,
            rotacionada: p.rotacionada,
          })),
          area_aproveitada_mm2: l.area_aproveitada_mm2 || 0,
          area_total_mm2: l.area_total_mm2 || 1,
          aproveitamento_percentual: l.aproveitamento_percentual || 0,
          espacos_vazios: espacosLivres,
        });
      }
    }
    return layouts;
  }

  if (mats.length > 0) {
    for (const chapa of mats) {
      if (!chapa.pecas || chapa.pecas.length === 0) continue;
      const larg = Number(chapa.largura_mm) || 2750;
      const alt = Number(chapa.altura_mm) || 1830;
      const esp = Number(chapa.espessura_mm) || 18;
      const pecas: Peca[] = chapa.pecas.map((p: any) => ({
        id: p.id || gerarId(),
        nome: p.nome || p.sku || 'PEÇA',
        largura: Number(p.largura) || Number(p.comprimento) || 300,
        altura: Number(p.altura) || Number(p.largura) || 300,
        rotacionavel: p.rotacionavel !== false,
      }));
      if (pecas.length === 0) continue;

      let pecasParaProcessar = [...pecas];
      let chapaIndex = 0;
      const maxChapas = 50;

      while (pecasParaProcessar.length > 0 && chapaIndex < maxChapas) {
        chapaIndex++;
        const opt = new MaxRectsOptimizer(larg, alt, 3, 15);
        const res = opt.otimizar(pecasParaProcessar);

        layouts.push({
          chapa: { 
            sku: `${(chapa.sku_chapa || 'CHAPA').toUpperCase()} - CHAPA ${chapaIndex}`, 
            largura: larg, 
            altura: alt, 
            espessura: esp 
          },
          pecas: res.pecas_posicionadas.map((p) => ({
            id: p.id,
            nome: p.nome,
            comprimento: p.largura,
            largura: p.altura,
            espessura: esp,
            x: p.x,
            y: p.y,
            rotacionada: p.rotacionada,
          })),
          area_aproveitada_mm2: res.area_usada,
          area_total_mm2: res.area_total,
          aproveitamento_percentual: res.aproveitamento,
          espacos_vazios: res.espacos_vazios.map(e => ({ x: e.x, y: e.y, largura: e.largura, altura: e.altura })),
        });

        if (res.pecas_rejeitadas.length === 0) {
          break;
        }
        if (res.pecas_posicionadas.length === 0) {
          break;
        }
        pecasParaProcessar = res.pecas_rejeitadas;
      }
    }
    return layouts;
  }

  return [];
}

export default function SimuladorCortePage() {
  const [modo, setModo] = useState<ModoSimulador>('rapida');
  const [planos, setPlanos] = useState<PlanoCorteCarregado[]>([]);
  const [planoAtivo, setPlanoAtivo] = useState<PlanoCorteCarregado | null>(null);
  const [indiceChapa, setIndiceChapa] = useState(0);
  const [pecaSelecionada, setPecaSelecionada] = useState<PecaSimulacao | null>(null);
  const [telaCheia, setTelaCheia] = useState(false);
  const [loadingPlanos, setLoadingPlanos] = useState(false);
  const [processando, setProcessando] = useState(false);

  // CONFIGURAÇÕES DE EXIBIÇÃO DO SIMULADOR CNC
  const [modoExibicao, setModoExibicao] = useState<ModoExibicao>('simulacao');
  const [mostrarGrade, setMostrarGrade] = useState(true);
  const [mostrarCotas, setMostrarCotas] = useState(true);
  const [mostrarRetalhos, setMostrarRetalhos] = useState(true);
  
  // Toggles industriais
  const [mostrarMaquina, setMostrarMaquina] = useState(true);
  const [mostrarStock, setMostrarStock] = useState(true);
  const [mostrarClamps, setMostrarClamps] = useState(true);
  const [mostrarCaminho, setMostrarCaminho] = useState(true);

  // ESTADO DE PLAYBACK
  const [tempoAtual, setTempoAtual] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [velocidadeSimulacao, setVelocidadeSimulacao] = useState(1);
  const [stopOnCollision, setStopOnCollision] = useState(true);

  // CONFIGURAÇÃO CNC (persistida localmente)
  const [cncConfig, setCncConfig] = useState<CncConfig>(() => carregarConfigCNC());
  const [mostrarConfigCNC, setMostrarConfigCNC] = useState(false);
  const [issuesWithRecs, setIssuesWithRecs] = useState<IssueWithRecommendation[]>([]);
  const [diffsAplicados, setDiffsAplicados] = useState<SetupDiff[]>([]);

  // FOCO DE CÂMARA PARA JUMP EM ISSUES
  const [focoPosicao, setFocoPosicao] = useState<{ x: number; y: number; z: number } | null>(null);

  // ESTADO DE RERUN
  const [isRerunning, setIsRerunning] = useState(false);

  // ESTADO DE PREVIEW (GHOST 3D)
  const [ghostPreview, setGhostPreview] = useState<GhostPreviewItem[]>([]);

  // Persiste configuração CNC quando alterada
  const handleCncConfigChange = useCallback((newConfig: CncConfig) => {
    setCncConfig(newConfig);
    salvarConfigCNC(newConfig);
  }, []);

  const [chapaLargura, setChapaLargura] = useState(2750);
  const [chapaAltura, setChapaAltura] = useState(1830);
  const [chapaEspessura, setChapaEspessura] = useState(18);
  const [chapaSku, setChapaSku] = useState('MDF 18MM 2750X1830');
  const [chapaPredef, setChapaPredef] = useState(0);
  const [pecasInput, setPecasInput] = useState<PecaInput[]>([
    { id: gerarId(), nome: 'PAINEL 1', comprimento: 600, largura: 400, espessura: 18, quantidade: 2 },
    { id: gerarId(), nome: 'PORTA 1', comprimento: 1800, largura: 500, espessura: 18, quantidade: 1 },
  ]);

  const [resultadoRapido, setResultadoRapido] = useState<LayoutSimulacao[]>([]);

  const layouts = useMemo(() => {
    if (modo === 'rapida') return resultadoRapido;
    if (!planoAtivo) return [];
    return converterPlanoParaLayouts(planoAtivo);
  }, [modo, resultadoRapido, planoAtivo]);

  const layoutAtual = layouts[indiceChapa] ?? null;
  const totalChapas = Math.max(layouts.length, 1);

  // GERAÇÃO DO PROGRAMA DE SIMULAÇÃO INDUSTRIAL E MÉTRICAS
  const program = useMemo(() => {
    if (!layoutAtual) return null;
    const configWithFixtures: CncConfig = {
      ...cncConfig,
      fixture: {
        clamps: cncConfig.fixture.clamps.length > 0
          ? cncConfig.fixture.clamps
          : gerarFixtureSettings(layoutAtual.chapa.largura, layoutAtual.chapa.altura).clamps,
      },
    };
    return gerarSimulationProgram(layoutAtual, configWithFixtures);
  }, [layoutAtual, cncConfig]);

  const metrics = useMemo(() => {
    if (!layoutAtual || !program) return null;
    return calcularMetrics(program, layoutAtual);
  }, [layoutAtual, program]);

  // Gera recomendações de ajuste
  useEffect(() => {
    if (!program || !layoutAtual) {
      setIssuesWithRecs([]);
      setDiffsAplicados([]);
      return;
    }
    const configWithFixtures: CncConfig = {
      ...cncConfig,
      fixture: {
        clamps: cncConfig.fixture.clamps.length > 0
          ? cncConfig.fixture.clamps
          : gerarFixtureSettings(layoutAtual.chapa.largura, layoutAtual.chapa.altura).clamps,
      },
    };
    const recs = analyzeIssues(program, configWithFixtures, layoutAtual);
    setIssuesWithRecs(recs);
  }, [program, layoutAtual, cncConfig]);

  // Posição física instantânea da ferramenta
  const posicaoAtual = useMemo(() => {
    if (!program) {
      return { x: 0, y: 0, z: 50, spindleOn: false, rpm: 0, tipoMovimento: 'safe_move' };
    }
    return obterEstadoNoInstante(program, tempoAtual);
  }, [program, tempoAtual]);

  // CONTROLADORES DE TIMELINE PLAYBACK (Loop em tempo real)
  useEffect(() => {
    if (!playing || !program) return;

    let lastTime = performance.now();
    const interval = setInterval(() => {
      const now = performance.now();
      const dt = (now - lastTime) / 1000; // segundos
      lastTime = now;

      setTempoAtual((prev) => {
        const next = prev + dt * velocidadeSimulacao;
        const total = program.totalTempoEstimado;

        // Se habilitado Parar em Colisão, analisa se cruzou algum erro
        if (stopOnCollision || cncConfig.machine.collisionPolicy === 'stop') {
          const erroDetectado = program.issues.find(
            (issue) => issue.severidade === 'error' && issue.tempo > prev && issue.tempo <= next
          );
          if (erroDetectado) {
            setPlaying(false);
            alert(`[SIMULAÇÃO CNC INTERROMPIDA]\n\nColisão ou anomalia mecânica detectada:\n${erroDetectado.mensagem}\nPosição: X:${erroDetectado.posicao.x.toFixed(1)} Y:${erroDetectado.posicao.y.toFixed(1)} Z:${erroDetectado.posicao.z.toFixed(1)}\n\nO cabeçote parou no ponto do impacto.\n\nConfigure a Política de Colisão para "Sugerir Ajuste" ou "Auto-ajustar" no painel CNC para obter recomendações.`);
            return erroDetectado.tempo; // para no instante exato da colisão
          }
        }

        if (next >= total) {
          setPlaying(false);
          return total;
        }
        return next;
      });
    }, 30); // ~33 FPS para suavidade de 3D

    return () => clearInterval(interval);
  }, [playing, program, velocidadeSimulacao, stopOnCollision, cncConfig.machine.collisionPolicy]);

  // Reseta timeline ao trocar de layout
  useEffect(() => {
    setTempoAtual(0);
    setPlaying(false);
  }, [indiceChapa, modo]);

  // Reseta visualizações baseadas no modo de exibição selecionado
  useEffect(() => {
    if (modoExibicao === 'layout') {
      setMostrarMaquina(false);
      setMostrarStock(false);
      setMostrarClamps(false);
      setMostrarCaminho(false);
      setTempoAtual(0);
      setPlaying(false);
    } else if (modoExibicao === 'simulacao') {
      setMostrarMaquina(true);
      setMostrarStock(true);
      setMostrarClamps(true);
      setMostrarCaminho(true);
    } else if (modoExibicao === 'verificacao') {
      setMostrarMaquina(true);
      setMostrarStock(true);
      setMostrarClamps(true);
      setMostrarCaminho(true);
      if (program) {
        setTempoAtual(program.totalTempoEstimado); // avança para o final para inspecionar
      }
      setPlaying(false);
    }
  }, [modoExibicao, program]);

  // Busca planos
  useEffect(() => {
    if (modo !== 'carregar') return;
    setLoadingPlanos(true);
    listarPlanos()
      .then((data) => setPlanos(data.filter((p) => {
        if (p.resultado?.perChapa) return Object.keys(p.resultado.perChapa).length > 0;
        if (p.materiais?.length > 0) return true;
        return false;
      })))
      .catch(() => {})
      .finally(() => setLoadingPlanos(false));
  }, [modo]);

  const handlePredefChapa = useCallback((idx: number) => {
    setChapaPredef(idx);
    const c = DEFAULT_CHAPAS[idx];
    if (idx < DEFAULT_CHAPAS.length - 1) {
      setChapaLargura(c.largura);
      setChapaAltura(c.altura);
      setChapaEspessura(c.espessura);
      setChapaSku(c.label);
    }
  }, []);

  const handleAddPeca = useCallback(() => {
    setPecasInput((prev) => [...prev, {
      id: gerarId(), nome: '', comprimento: 300, largura: 300, espessura: chapaEspessura, quantidade: 1,
    }]);
  }, [chapaEspessura]);

  const handleRemovePeca = useCallback((id: string) => {
    setPecasInput((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const handleUpdatePeca = useCallback((id: string, field: keyof PecaInput, value: string | number) => {
    setPecasInput((prev) => prev.map((p) => (p.id === id ? { ...p, [field]: value } : p)));
  }, []);

  const executarSimulacao = useCallback(() => {
    const pecasValidas = pecasInput.filter((p) => p.nome.trim() && p.comprimento > 0 && p.largura > 0);
    if (pecasValidas.length === 0 || chapaLargura <= 0 || chapaAltura <= 0) return;

    setProcessando(true);

    setTimeout(() => {
      try {
        const pecas: Peca[] = [];
        for (const p of pecasValidas) {
          for (let i = 0; i < p.quantidade; i++) {
            pecas.push({
              id: `${p.id}_${i}`,
              nome: p.nome.toUpperCase(),
              largura: p.comprimento,
              altura: p.largura,
              rotacionavel: true,
            });
          }
        }

        const layoutsTemp: LayoutSimulacao[] = [];
        let pecasParaProcessar = [...pecas];
        let chapaIndex = 0;
        const maxChapas = 50;

        while (pecasParaProcessar.length > 0 && chapaIndex < maxChapas) {
          chapaIndex++;

          const optimizer = new MaxRectsOptimizer(chapaLargura, chapaAltura, 3, 15);
          const resultado = optimizer.otimizar(pecasParaProcessar);

          const chapa = {
            sku: `${chapaSku.toUpperCase()} - CHAPA ${chapaIndex}`,
            largura: chapaLargura,
            altura: chapaAltura,
            espessura: chapaEspessura,
          };

          layoutsTemp.push({
            chapa,
            pecas: resultado.pecas_posicionadas.map((p) => ({
              id: p.id,
              nome: p.nome,
              comprimento: p.largura,
              largura: p.altura,
              espessura: chapaEspessura,
              x: p.x,
              y: p.y,
              rotacionada: p.rotacionada,
            })),
            area_aproveitada_mm2: resultado.area_usada,
            area_total_mm2: resultado.area_total,
            aproveitamento_percentual: resultado.aproveitamento,
            espacos_vazios: resultado.espacos_vazios.map(e => ({ x: e.x, y: e.y, largura: e.largura, altura: e.altura })),
          });

          if (resultado.pecas_rejeitadas.length === 0) {
            break;
          }

          if (resultado.pecas_posicionadas.length === 0) {
            break;
          }

          pecasParaProcessar = resultado.pecas_rejeitadas;
        }

        setResultadoRapido(layoutsTemp);
        setIndiceChapa(0);
        setPecaSelecionada(null);
        setModoExibicao('simulacao'); // joga para simulação após calcular
      } catch (err) {
        console.error('ERRO NA OTIMIZAÇÃO:', err);
      } finally {
        setProcessando(false);
      }
    }, 100);
  }, [pecasInput, chapaLargura, chapaAltura, chapaEspessura, chapaSku]);

  const handleCarregarPlano = useCallback((plano: PlanoCorteCarregado) => {
    setPlanoAtivo(plano);
    setIndiceChapa(0);
    setPecaSelecionada(null);
    setModoExibicao('simulacao');
  }, []);

  const handleSelecionarPeca = useCallback((peca: PecaSimulacao | null) => {
    setPecaSelecionada(peca);
  }, []);

  const handleNavegarChapa = useCallback((dir: number) => {
    setIndiceChapa((prev) => {
      const next = prev + dir;
      if (next < 0) return layouts.length - 1;
      if (next >= layouts.length) return 0;
      return next;
    });
    setPecaSelecionada(null);
  }, [layouts.length]);

  const handleTrocarModo = useCallback((m: ModoSimulador) => {
    setModo(m);
    setIndiceChapa(0);
    setPecaSelecionada(null);
  }, []);

  const handleJumpToIssue = useCallback((tempo: number, posicao: { x: number; y: number; z: number }) => {
    setTempoAtual(tempo);
    setPlaying(false);
    setFocoPosicao(posicao);
  }, []);

  // CLAMP DRAG NA CENA 3D
  const handleClampDragEnd = useCallback((clampId: string, newX: number, newY: number) => {
    setCncConfig((prev) => {
      const novosClamps = prev.fixture.clamps.map((c) =>
        c.id === clampId ? { ...c, x: Math.max(0, Math.min(newX, 3000)), y: Math.max(0, Math.min(newY, 2000)) } : c
      );
      const nova: CncConfig = { ...prev, fixture: { clamps: novosClamps } };
      salvarConfigCNC(nova);
      return nova;
    });
  }, []);

  // PREVIEW DE RECOMENDAÇÃO NA CENA 3D
  const handlePreviewRecommendation = useCallback((iwr: IssueWithRecommendation | null) => {
    if (!iwr || !iwr.bestRecommendation || !layoutAtual) {
      setGhostPreview([]);
      return;
    }
    const rec = iwr.bestRecommendation;
    const items: GhostPreviewItem[] = [];

    if (rec.type === 'REPOSITION_CLAMP' && rec.paramName.startsWith('clamp_')) {
      const clampId = rec.paramName.replace('clamp_', '');
      const oldVal = String(rec.oldValue);
      const newVal = String(rec.newValue);
      const matchOld = oldVal.match(/X:([\d.]+)\s+Y:([\d.]+)/);
      const matchNew = newVal.match(/X:([\d.]+)\s+Y:([\d.]+)/);
      if (matchOld && matchNew) {
        items.push({
          type: 'clamp', id: `${clampId}_old`,
          x: parseFloat(matchOld[1]), y: parseFloat(matchOld[2]),
          largura: 45, altura: 80, cor: '#EF4444', label: 'Atual',
        });
        items.push({
          type: 'clamp', id: `${clampId}_new`,
          x: parseFloat(matchNew[1]), y: parseFloat(matchNew[2]),
          largura: 45, altura: 80, cor: '#10B981', label: 'Proposto',
        });
      }
    } else if (rec.type === 'ADJUST_SAFE_Z' && layoutAtual) {
      const novoZ = Number(rec.newValue);
      if (!isNaN(novoZ)) {
        items.push({
          type: 'safeZ_plane', id: 'safeZ_preview',
          x: 0, y: 0,
          largura: novoZ,
          altura: layoutAtual.chapa.largura,
          cor: '#10B981',
        });
      }
    }

    setGhostPreview(items);
  }, [layoutAtual]);

  // APLICA RECOMENDAÇÃO DE AJUSTE NA CONFIGURAÇÃO CNC
  const handleApplyRecommendation = useCallback((iwr: IssueWithRecommendation) => {
    if (!iwr.bestRecommendation || !layoutAtual) return;
    const result = applySafeAdjustment(cncConfig, iwr.bestRecommendation, layoutAtual);
    if (result.diffs.length > 0) {
      setDiffsAplicados((prev) => [...prev, ...result.diffs]);
      handleCncConfigChange(result.config);
    }
  }, [cncConfig, layoutAtual, handleCncConfigChange]);

  // REEXECUTA SIMULAÇÃO APÓS AJUSTES (rerun)
  const handleRerunSimulation = useCallback(() => {
    setIsRerunning(true);
    setTempoAtual(0);
    setPlaying(false);
    // Delay visual para mostrar progresso antes de limpar diffs
    setTimeout(() => {
      setDiffsAplicados([]);
    }, 300);
    setTimeout(() => {
      setIsRerunning(false);
    }, 800);
  }, []);

  // EXPORTAÇÕES DE DOCUMENTAÇÃO E RELATÓRIO
  const handleExportRelatorio = useCallback(() => {
    if (!layoutAtual || !program || !metrics) return;
    const nomeRelatorio = modo === 'rapida' ? 'Simulação Rápida' : planoAtivo?.nome || 'Plano';
    exportarRelatorioCNC(layoutAtual, program, metrics, nomeRelatorio);
  }, [layoutAtual, program, metrics, modo, planoAtivo]);

  const handleExportRelatorioSeguranca = useCallback(() => {
    if (!program || !metrics) return;
    const nomeRelatorio = modo === 'rapida' ? 'Simulação Rápida' : planoAtivo?.nome || 'Plano';
    const reportData: SafetyReportData = {
      config: cncConfig,
      diffs: diffsAplicados,
      issuesWithRecs,
      totalErrors: issuesWithRecs.filter(i => i.issue.severidade === 'error').length,
      totalWarnings: issuesWithRecs.filter(i => i.issue.severidade === 'warning').length,
      totalResolved: issuesWithRecs.filter(i => i.bestRecommendation && i.bestRecommendation.action !== 'impossible').length,
      totalBlocked: issuesWithRecs.filter(i => i.bestRecommendation?.action === 'impossible').length,
    };
    exportarRelatorioSeguranca(reportData, nomeRelatorio, {
      tempoTotal: metrics.tempoTotal,
      distanciaTotal: metrics.distanciaTotal,
    });
  }, [cncConfig, diffsAplicados, issuesWithRecs, metrics, modo, planoAtivo, program]);

  const handleExportEtiquetas = useCallback(() => {
    if (!layoutAtual) return;
    const nomeEtiqueta = modo === 'rapida' ? 'Simulação Rápida' : planoAtivo?.nome || 'Plano';
    exportarEtiquetasCNC(layoutAtual, nomeEtiqueta);
  }, [layoutAtual, modo, planoAtivo]);

  return (
    <div className="page-container anim-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-[#E2AC00]/20 to-[#E2AC00]/5 border border-[#E2AC00]/20">
            <Scissors className="text-[#E2AC00]" size={22} />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-white tracking-tight">SIMULADOR INDUSTRIAL ROUTER CNC</h1>
            <p className="text-[#6B7280] text-xs tracking-wider">MOTOR DE SIMULAÇÃO CAM, CINEMÁTICA DE MÁQUINA E VERIFICAÇÃO</p>
          </div>
        </div>
        <button
          onClick={() => setTelaCheia(!telaCheia)}
          className="btn bg-[#1F2937] hover:bg-[#374151] border border-[#374151] p-2 rounded-lg transition-all"
          title={telaCheia ? 'SAIR DE TELA CHEIA' : 'TELA CHEIA'}
        >
          {telaCheia ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
        </button>
      </div>

      <div className="flex gap-1 bg-[#1F2937] p-1 rounded-xl mb-6 w-fit">
        <button
          onClick={() => handleTrocarModo('rapida')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
            modo === 'rapida' ? 'bg-[#E2AC00] text-black' : 'text-[#6B7280] hover:text-white hover:bg-[#374151]'
          }`}
        >
          <Zap size={14} />
          SIMULAÇÃO RÁPIDA
        </button>
        <button
          onClick={() => handleTrocarModo('carregar')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
            modo === 'carregar' ? 'bg-[#E2AC00] text-black' : 'text-[#6B7280] hover:text-white hover:bg-[#374151]'
          }`}
        >
          <Upload size={14} />
          CARREGAR PLANO
        </button>
      </div>

      {/* MODO SIMULAÇÃO RÁPIDA */}
      {modo === 'rapida' && (
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="w-full lg:w-96 space-y-4 shrink-0">
            <div className="bg-[#111827] border border-[#1F2937] rounded-xl p-4">
              <h3 className="text-[#E2AC00] font-bold text-xs tracking-wider mb-3 flex items-center gap-2">
                <Grid3x3 size={14} />
                CONFIGURAÇÃO DA CHAPA
              </h3>
              <div className="grid grid-cols-2 gap-2 mb-3">
                {DEFAULT_CHAPAS.map((c, i) => (
                  <button
                    key={i}
                    onClick={() => handlePredefChapa(i)}
                    className={`text-[10px] text-left p-2 rounded-lg border transition-all ${
                      chapaPredef === i
                        ? 'border-[#E2AC00] bg-[#E2AC00]/10 text-[#E2AC00]'
                        : 'border-[#1F2937] bg-[#1F2937]/50 text-[#6B7280] hover:border-[#374151]'
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div>
                  <label className="text-[#6B7280] block mb-1">COMPR. (MM)</label>
                  <input type="number" value={chapaLargura}
                    onChange={(e) => { setChapaLargura(Number(e.target.value)); setChapaPredef(DEFAULT_CHAPAS.length - 1); }}
                    className="w-full bg-[#0D1117] border border-[#1F2937] rounded-lg px-3 py-2 text-white text-xs outline-none focus:border-[#E2AC00]"
                  />
                </div>
                <div>
                  <label className="text-[#6B7280] block mb-1">LARG. (MM)</label>
                  <input type="number" value={chapaAltura}
                    onChange={(e) => { setChapaAltura(Number(e.target.value)); setChapaPredef(DEFAULT_CHAPAS.length - 1); }}
                    className="w-full bg-[#0D1117] border border-[#1F2937] rounded-lg px-3 py-2 text-white text-xs outline-none focus:border-[#E2AC00]"
                  />
                </div>
                <div>
                  <label className="text-[#6B7280] block mb-1">ESP. (MM)</label>
                  <input type="number" value={chapaEspessura}
                    onChange={(e) => { setChapaEspessura(Number(e.target.value)); setChapaPredef(DEFAULT_CHAPAS.length - 1); }}
                    className="w-full bg-[#0D1117] border border-[#1F2937] rounded-lg px-3 py-2 text-white text-xs outline-none focus:border-[#E2AC00]"
                  />
                </div>
              </div>
            </div>

            <div className="bg-[#111827] border border-[#1F2937] rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[#E2AC00] font-bold text-xs tracking-wider">PEÇAS</h3>
                <button onClick={handleAddPeca} className="flex items-center gap-1 text-[10px] text-[#E2AC00] hover:text-white transition-colors">
                  <Plus size={12} /> ADICIONAR
                </button>
              </div>
              <div className="space-y-2 max-h-[280px] overflow-y-auto custom-scrollbar pr-1">
                {pecasInput.map((peca, idx) => (
                  <div key={peca.id} className="bg-[#1F2937]/50 rounded-lg p-2.5 border border-[#1F2937]">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[#6B7280] text-[10px] font-semibold">PEÇA {idx + 1}</span>
                      <button onClick={() => handleRemovePeca(peca.id)} className="text-[#6B7280] hover:text-red-400 transition-colors">
                        <Trash2 size={12} />
                      </button>
                    </div>
                    <input type="text" value={peca.nome}
                      onChange={(e) => handleUpdatePeca(peca.id, 'nome', e.target.value.toUpperCase())}
                      placeholder="NOME DA PEÇA"
                      className="w-full bg-[#0D1117] border border-[#1F2937] rounded-lg px-2.5 py-1.5 text-white text-[11px] outline-none mb-1.5 focus:border-[#E2AC00]"
                    />
                    <div className="grid grid-cols-4 gap-1.5">
                      <div>
                        <label className="text-[#6B7280] text-[9px] block">COMP.</label>
                        <input type="number" value={peca.comprimento}
                           onChange={(e) => handleUpdatePeca(peca.id, 'comprimento', Number(e.target.value))}
                          className="w-full bg-[#0D1117] border border-[#1F2937] rounded-lg px-2 py-1 text-white text-[11px] outline-none focus:border-[#E2AC00]"
                        />
                      </div>
                      <div>
                        <label className="text-[#6B7280] text-[9px] block">LARG.</label>
                        <input type="number" value={peca.largura}
                          onChange={(e) => handleUpdatePeca(peca.id, 'largura', Number(e.target.value))}
                          className="w-full bg-[#0D1117] border border-[#1F2937] rounded-lg px-2 py-1 text-white text-[11px] outline-none focus:border-[#E2AC00]"
                        />
                      </div>
                      <div>
                        <label className="text-[#6B7280] text-[9px] block">ESP.</label>
                        <input type="number" value={peca.espessura}
                          onChange={(e) => handleUpdatePeca(peca.id, 'espessura', Number(e.target.value))}
                          className="w-full bg-[#0D1117] border border-[#1F2937] rounded-lg px-2 py-1 text-white text-[11px] outline-none focus:border-[#E2AC00]"
                        />
                      </div>
                      <div>
                        <label className="text-[#6B7280] text-[9px] block">QTD</label>
                        <input type="number" min={1} value={peca.quantidade}
                          onChange={(e) => handleUpdatePeca(peca.id, 'quantidade', Math.max(1, Number(e.target.value)))}
                          className="w-full bg-[#0D1117] border border-[#1F2937] rounded-lg px-2 py-1 text-white text-[11px] outline-none focus:border-[#E2AC00]"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <button
                onClick={executarSimulacao}
                disabled={processando}
                className="w-full mt-3 flex items-center justify-center gap-2 bg-[#E2AC00] hover:bg-[#F5C200] text-black font-bold text-xs py-2.5 rounded-lg transition-all disabled:opacity-50"
              >
                {processando ? <><RotateCw size={14} className="animate-spin" /> OTIMIZANDO...</> : <><Play size={14} /> EXECUTAR NESTING</>}
              </button>
            </div>
          </div>

          {layoutAtual && program && metrics ? (
            <div className="flex-1 flex flex-col gap-4 min-w-0">
              <div className={`flex flex-col lg:flex-row gap-4 ${telaCheia ? 'fixed inset-0 z-50 p-4 bg-[#0D1117]' : ''}`}>
                <div className="flex-1 flex flex-col gap-3 min-w-0">
                  {/* CONFIGURAÇÃO E ABAS DE MODO (PREVIEW vs SIMULAÇÃO vs VERIFICAÇÃO) */}
                  <div className="flex flex-col gap-2 bg-[#111827] border border-[#1F2937] rounded-xl p-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex gap-1 bg-[#0D1117] p-1 rounded-lg border border-[#1F2937]">
                        <button
                          onClick={() => setModoExibicao('layout')}
                          className={`px-3 py-1.5 rounded text-[10px] font-bold transition-all ${
                            modoExibicao === 'layout' ? 'bg-[#1F2937] text-white' : 'text-[#6B7280] hover:text-white'
                          }`}
                        >
                          PREVIEW LAYOUT
                        </button>
                        <button
                          onClick={() => setModoExibicao('simulacao')}
                          className={`px-3 py-1.5 rounded text-[10px] font-bold transition-all ${
                            modoExibicao === 'simulacao' ? 'bg-[#E2AC00] text-black' : 'text-[#6B7280] hover:text-white'
                          }`}
                        >
                          SIMULAÇÃO CNC
                        </button>
                        <button
                          onClick={() => setModoExibicao('verificacao')}
                          className={`px-3 py-1.5 rounded text-[10px] font-bold transition-all ${
                            modoExibicao === 'verificacao' ? 'bg-[#EF4444]/20 text-[#EF4444] border border-[#EF4444]/30' : 'text-[#6B7280] hover:text-white'
                          }`}
                        >
                          VERIFICAÇÃO CAM
                        </button>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <button onClick={() => handleNavegarChapa(-1)} className="p-1.5 hover:bg-[#1F2937] rounded-lg text-[#6B7280] hover:text-[#E2AC00] transition-all"><ChevronLeft size={16} /></button>
                        <span className="text-white text-xs font-semibold min-w-[50px] text-center">{indiceChapa + 1}/{layouts.length}</span>
                        <button onClick={() => handleNavegarChapa(1)} className="p-1.5 hover:bg-[#1F2937] rounded-lg text-[#6B7280] hover:text-[#E2AC00] transition-all"><ChevronRight size={16} /></button>
                      </div>
                    </div>

                    {/* Toggles de Visualização 3D */}
                    <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#1F2937]/60 text-[10px]">
                      <button onClick={() => setMostrarGrade(!mostrarGrade)} className={`px-2 py-1 rounded font-semibold ${mostrarGrade ? 'bg-[#E2AC00]/15 text-[#E2AC00]' : 'bg-[#1F2937]/45 text-[#6B7280]'}`}>GRADE</button>
                      <button onClick={() => setMostrarCotas(!mostrarCotas)} className={`px-2 py-1 rounded font-semibold ${mostrarCotas ? 'bg-[#E2AC00]/15 text-[#E2AC00]' : 'bg-[#1F2937]/45 text-[#6B7280]'}`}>COTAS</button>
                      <button onClick={() => setMostrarRetalhos(!mostrarRetalhos)} className={`px-2 py-1 rounded font-semibold ${mostrarRetalhos ? 'bg-[#10B981]/15 text-[#10B981]' : 'bg-[#1F2937]/45 text-[#6B7280]'}`}>SOBRAS</button>
                      
                      <span className="text-[#374151] font-bold">|</span>

                      <button onClick={() => setMostrarMaquina(!mostrarMaquina)} className={`px-2 py-1 rounded font-semibold ${mostrarMaquina ? 'bg-[#E2AC00]/15 text-[#E2AC00]' : 'bg-[#1F2937]/45 text-[#6B7280]'}`}>MÁQUINA</button>
                      <button onClick={() => setMostrarStock(!mostrarStock)} className={`px-2 py-1 rounded font-semibold ${mostrarStock ? 'bg-[#E2AC00]/15 text-[#E2AC00]' : 'bg-[#1F2937]/45 text-[#6B7280]'}`}>USINAGEM (STOCK)</button>
                      <button onClick={() => setMostrarClamps(!mostrarClamps)} className={`px-2 py-1 rounded font-semibold ${mostrarClamps ? 'bg-[#E2AC00]/15 text-[#E2AC00]' : 'bg-[#1F2937]/45 text-[#6B7280]'}`}>GARRAS</button>
                      <button onClick={() => setMostrarCaminho(!mostrarCaminho)} className={`px-2 py-1 rounded font-semibold ${mostrarCaminho ? 'bg-[#E2AC00]/15 text-[#E2AC00]' : 'bg-[#1F2937]/45 text-[#6B7280]'}`}>TOOLPATH</button>
                    </div>
                  </div>

                {/* 3D CANVAS */}
                <div className="h-[460px] rounded-xl overflow-hidden border border-[#1F2937]">
                  <CanvasSimulador3D
                    layout={layoutAtual}
                    onSelecionarPeca={handleSelecionarPeca}
                    habilitarGrade={mostrarGrade}
                    habilitarCotas={mostrarCotas}
                    habilitarRetalhos={mostrarRetalhos}
                    mostrarMaquina={mostrarMaquina}
                    mostrarStock={mostrarStock}
                    mostrarClamps={mostrarClamps}
                    mostrarCaminho={mostrarCaminho}
                    program={program}
                    tempoAtual={tempoAtual}
                    cncConfig={cncConfig}
                    focoPosicao={focoPosicao}
                    mostrarRiscos={modoExibicao === 'verificacao'}
                    ghostPreview={ghostPreview}
                    onClampDragEnd={handleClampDragEnd}
                  />
                  </div>

                  {/* CONTROLES DE TIMELINE */}
                  {modoExibicao === 'simulacao' && (
                    <TimelineControls
                      program={program}
                      tempoAtual={tempoAtual}
                      onTempoChange={setTempoAtual}
                      playing={playing}
                      onPlayingChange={setPlaying}
                      velocidade={velocidadeSimulacao}
                      onVelocidadeChange={setVelocidadeSimulacao}
                      stopOnCollision={stopOnCollision}
                      onStopOnCollisionChange={setStopOnCollision}
                    />
                  )}
                </div>

                {/* PAINEL DE INFORMAÇÕES E ANÁLISE DE SEGURANÇA */}
                <div className="w-full lg:w-80 flex flex-col gap-4 shrink-0">
                  <div className="flex gap-2">
                    <button onClick={handleExportRelatorio} className="flex-1 flex items-center justify-center gap-1.5 bg-[#1F2937] hover:bg-[#374151] border border-[#374151] text-white text-[11px] font-bold py-2.5 rounded-lg transition-all">
                      <FileCheck size={14} className="text-[#E2AC00]" /> RELATÓRIO CNC
                    </button>
                    <button onClick={handleExportRelatorioSeguranca} className="flex-1 flex items-center justify-center gap-1.5 bg-[#1F2937] hover:bg-[#374151] border border-[#374151] text-white text-[11px] font-bold py-2.5 rounded-lg transition-all">
                      <ShieldAlert size={14} className="text-[#EF4444]" /> SEGURANÇA
                    </button>
                    <button onClick={handleExportEtiquetas} className="flex-1 flex items-center justify-center gap-1.5 bg-[#1F2937] hover:bg-[#374151] border border-[#374151] text-white text-[11px] font-bold py-2.5 rounded-lg transition-all">
                      <Box size={14} className="text-[#10B981]" /> ETIQUETAS
                    </button>
                  </div>
                  
                  {/* TOGGLE CONFIGURAÇÃO CNC */}
                  <button
                    onClick={() => setMostrarConfigCNC(!mostrarConfigCNC)}
                    className={`flex items-center justify-center gap-1.5 text-[10px] font-bold py-2 rounded-lg transition-all ${
                      mostrarConfigCNC
                        ? 'bg-[#E2AC00]/20 text-[#E2AC00] border border-[#E2AC00]/30'
                        : 'bg-[#1F2937] hover:bg-[#374151] text-white border border-[#374151]'
                    }`}
                  >
                    <Settings size={14} />
                    {mostrarConfigCNC ? 'ESCONDER CONFIG CNC' : 'CONFIGURAÇÃO CNC'}
                  </button>

                  {/* PAINEL DE CONFIGURAÇÃO CNC */}
                  {mostrarConfigCNC && (
                    <CncConfigPanel config={cncConfig} onChange={handleCncConfigChange} />
                  )}

                  {/* PAINEL DE ANÁLISE DE SEGURANÇA E AJUSTES */}
                  {program && (
                    <SafetyAnalysisPanel
                      issuesWithRecs={issuesWithRecs}
                      diffs={diffsAplicados}
                      collisionPolicy={cncConfig.machine.collisionPolicy}
                      onJumpToIssue={handleJumpToIssue}
                      onApplyRecommendation={handleApplyRecommendation}
                      onRerunSimulation={handleRerunSimulation}
                      isRerunning={isRerunning}
                      onPreviewRecommendation={handlePreviewRecommendation}
                    />
                  )}

                  {/* Legenda CAM Toolpath */}
                  {mostrarCaminho && (
                    <div className="bg-[#111827] border border-[#1F2937] rounded-xl p-3 text-[9px] font-mono text-[#6B7280]">
                      <span className="text-white font-bold block mb-1.5 text-[10px]">LEGENDA DO PERCURSO DE CORTE:</span>
                      <div className="grid grid-cols-2 gap-1.5">
                        <div className="flex items-center gap-1.5"><span className="w-2.5 h-1.5 bg-[#4B5563] rounded block" /> G00 Deslocamento Rápido</div>
                        <div className="flex items-center gap-1.5"><span className="w-2.5 h-1.5 bg-[#F97316] rounded block" /> G01 Mergulho Vertical</div>
                        <div className="flex items-center gap-1.5"><span className="w-2.5 h-1.5 bg-[#EF4444] rounded block" /> G01 Percurso de Corte</div>
                        <div className="flex items-center gap-1.5"><span className="w-2.5 h-1.5 bg-[#E2AC00] rounded block" /> G01 Lead In / Out</div>
                        <div className="flex items-center gap-1.5"><span className="w-2.5 h-1.5 bg-[#10B981] rounded block" /> Usinagem Concluída</div>
                      </div>
                    </div>
                  )}

                  <MetricsPanel
                    program={program}
                    metrics={metrics}
                    tempoAtual={tempoAtual}
                    posicaoAtual={posicaoAtual}
                    onJumpToIssue={handleJumpToIssue}
                  />

                  <PainelPecasRapido pecas={layoutAtual.pecas} pecaSelecionada={pecaSelecionada} onSelecionar={handleSelecionarPeca} />
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 bg-[#111827] border border-[#1F2937] rounded-xl flex items-center justify-center min-h-[500px]">
              <div className="text-center">
                <Scissors size={48} className="text-[#374151] mx-auto mb-3" />
                <p className="text-[#6B7280] text-sm font-medium">ADICIONE PEÇAS E CLIQUE EM "EXECUTAR NESTING"</p>
                <p className="text-[#6B7280] text-[11px] mt-1">A SIMULAÇÃO DE ROUTER 3D APARECERÁ AQUI</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODO CARREGAR PLANO */}
      {modo === 'carregar' && (
        <>
          {loadingPlanos && (
            <div className="bg-[#111827] border border-[#1F2937] rounded-xl p-8 text-center mb-6">
              <RotateCw size={32} className="text-[#374151] mx-auto mb-3 animate-spin" />
              <p className="text-[#6B7280] text-xs">CARREGANDO PLANOS DE CORTE DO ESTOQUE...</p>
            </div>
          )}

          {!planoAtivo && !loadingPlanos && planos.length === 0 && (
            <div className="bg-[#111827] border border-[#1F2937] rounded-xl p-8 text-center mb-6">
              <FileText size={40} className="text-[#374151] mx-auto mb-3" />
              <h2 className="text-white font-bold text-sm mb-2">NENHUM PLANO DE CORTE DISPONÍVEL</h2>
              <p className="text-[#6B7280] text-xs">CRIE UM PLANO NO MÓDULO "PLANO DE CORTE" OU USE A "SIMULAÇÃO RÁPIDA".</p>
            </div>
          )}

          {!planoAtivo && !loadingPlanos && planos.length > 0 && (
            <div className="bg-[#111827] border border-[#1F2937] rounded-xl p-6 mb-6">
              <h3 className="text-white font-bold text-sm mb-4 tracking-wider">SELECIONE UM PLANO DE CORTE PARA A CNC</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {planos.map((plano) => {
                  const chaps = converterPlanoParaLayouts(plano);
                  const apv = chaps.length > 0 ? chaps.reduce((s, l) => s + l.aproveitamento_percentual, 0) / chaps.length : 0;
                  return (
                    <button key={plano.id} onClick={() => handleCarregarPlano(plano)}
                      className="bg-[#1F2937]/50 hover:bg-[#1F2937] border border-[#374151] hover:border-[#E2AC00]/30 rounded-xl p-4 text-left transition-all duration-200 group"
                    >
                      <p className="text-white font-semibold text-sm truncate group-hover:text-[#E2AC00] transition-colors">{plano.nome}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-[#6B7280]">
                        <span>{chaps.length} CHAPA{chaps.length > 1 ? 'S' : ''}</span>
                        <span className="text-[#10B981]">{apv.toFixed(1)}% APROV.</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {planoAtivo && layoutAtual && program && metrics && (
            <div className="flex flex-col lg:flex-row gap-4">
              <div className={`flex-1 flex flex-col gap-3 min-w-0 ${telaCheia ? 'fixed inset-0 z-50 p-4 bg-[#0D1117]' : ''}`}>
                
                {/* Cabeçalho de Navegação e Configurações */}
                <div className="flex flex-col gap-2 bg-[#111827] border border-[#1F2937] rounded-xl p-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex gap-1 bg-[#0D1117] p-1 rounded-lg border border-[#1F2937]">
                      <button
                        onClick={() => setModoExibicao('layout')}
                        className={`px-3 py-1.5 rounded text-[10px] font-bold transition-all ${
                          modoExibicao === 'layout' ? 'bg-[#1F2937] text-white' : 'text-[#6B7280] hover:text-white'
                        }`}
                      >
                        PREVIEW LAYOUT
                      </button>
                      <button
                        onClick={() => setModoExibicao('simulacao')}
                        className={`px-3 py-1.5 rounded text-[10px] font-bold transition-all ${
                          modoExibicao === 'simulacao' ? 'bg-[#E2AC00] text-black' : 'text-[#6B7280] hover:text-white'
                        }`}
                      >
                        SIMULAÇÃO CNC
                      </button>
                      <button
                        onClick={() => setModoExibicao('verificacao')}
                        className={`px-3 py-1.5 rounded text-[10px] font-bold transition-all ${
                          modoExibicao === 'verificacao' ? 'bg-[#EF4444]/20 text-[#EF4444] border border-[#EF4444]/30' : 'text-[#6B7280] hover:text-white'
                        }`}
                      >
                        VERIFICAÇÃO CAM
                      </button>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-[#6B7280] text-xs font-semibold truncate max-w-[200px]">{planoAtivo.nome}</span>
                      <button onClick={() => handleNavegarChapa(-1)} className="p-1.5 hover:bg-[#1F2937] rounded-lg text-[#6B7280] hover:text-[#E2AC00] transition-all"><ChevronLeft size={16} /></button>
                      <span className="text-white text-xs font-semibold min-w-[55px] text-center">{indiceChapa + 1}/{layouts.length}</span>
                      <button onClick={() => handleNavegarChapa(1)} className="p-1.5 hover:bg-[#1F2937] rounded-lg text-[#6B7280] hover:text-[#E2AC00] transition-all"><ChevronRight size={16} /></button>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#1F2937]/60 text-[10px]">
                    <button onClick={() => setMostrarGrade(!mostrarGrade)} className={`px-2 py-1 rounded font-semibold ${mostrarGrade ? 'bg-[#E2AC00]/15 text-[#E2AC00]' : 'bg-[#1F2937]/45 text-[#6B7280]'}`}>GRADE</button>
                    <button onClick={() => setMostrarCotas(!mostrarCotas)} className={`px-2 py-1 rounded font-semibold ${mostrarCotas ? 'bg-[#E2AC00]/15 text-[#E2AC00]' : 'bg-[#1F2937]/45 text-[#6B7280]'}`}>COTAS</button>
                    <button onClick={() => setMostrarRetalhos(!mostrarRetalhos)} className={`px-2 py-1 rounded font-semibold ${mostrarRetalhos ? 'bg-[#10B981]/15 text-[#10B981]' : 'bg-[#1F2937]/45 text-[#6B7280]'}`}>SOBRAS</button>
                    
                    <span className="text-[#374151] font-bold">|</span>

                    <button onClick={() => setMostrarMaquina(!mostrarMaquina)} className={`px-2 py-1 rounded font-semibold ${mostrarMaquina ? 'bg-[#E2AC00]/15 text-[#E2AC00]' : 'bg-[#1F2937]/45 text-[#6B7280]'}`}>MÁQUINA</button>
                    <button onClick={() => setMostrarStock(!mostrarStock)} className={`px-2 py-1 rounded font-semibold ${mostrarStock ? 'bg-[#E2AC00]/15 text-[#E2AC00]' : 'bg-[#1F2937]/45 text-[#6B7280]'}`}>USINAGEM (STOCK)</button>
                    <button onClick={() => setMostrarClamps(!mostrarClamps)} className={`px-2 py-1 rounded font-semibold ${mostrarClamps ? 'bg-[#E2AC00]/15 text-[#E2AC00]' : 'bg-[#1F2937]/45 text-[#6B7280]'}`}>GARRAS</button>
                    <button onClick={() => setMostrarCaminho(!mostrarCaminho)} className={`px-2 py-1 rounded font-semibold ${mostrarCaminho ? 'bg-[#E2AC00]/15 text-[#E2AC00]' : 'bg-[#1F2937]/45 text-[#6B7280]'}`}>TOOLPATH</button>
                  </div>
                </div>

                {/* 3D CANVAS */}
                <div className={`${telaCheia ? 'h-[calc(100vh-160px)]' : 'h-[460px]'} rounded-xl overflow-hidden border border-[#1F2937]`}>
                  <CanvasSimulador3D
                    layout={layoutAtual}
                    onSelecionarPeca={handleSelecionarPeca}
                    habilitarGrade={mostrarGrade}
                    habilitarCotas={mostrarCotas}
                    habilitarRetalhos={mostrarRetalhos}
                    mostrarMaquina={mostrarMaquina}
                    mostrarStock={mostrarStock}
                    mostrarClamps={mostrarClamps}
                    mostrarCaminho={mostrarCaminho}
                    program={program}
                    tempoAtual={tempoAtual}
                    cncConfig={cncConfig}
                    ghostPreview={ghostPreview}
                    onClampDragEnd={handleClampDragEnd}
                  />
                </div>

                {/* TIMELINE */}
                {modoExibicao === 'simulacao' && (
                  <TimelineControls
                    program={program}
                    tempoAtual={tempoAtual}
                    onTempoChange={setTempoAtual}
                    playing={playing}
                    onPlayingChange={setPlaying}
                    velocidade={velocidadeSimulacao}
                    onVelocidadeChange={setVelocidadeSimulacao}
                    stopOnCollision={stopOnCollision}
                    onStopOnCollisionChange={setStopOnCollision}
                  />
                )}
              </div>

              {/* PAINEL LATERAL DIREITO */}
              <div className="w-full lg:w-80 flex flex-col gap-4 shrink-0">
                <div className="flex gap-2">
                  <button onClick={handleExportRelatorio} className="flex-1 flex items-center justify-center gap-1.5 bg-[#1F2937] hover:bg-[#374151] border border-[#374151] text-white text-[11px] font-bold py-2.5 rounded-lg transition-all">
                    <FileCheck size={14} className="text-[#E2AC00]" /> RELATÓRIO CNC
                  </button>
                  <button onClick={handleExportRelatorioSeguranca} className="flex-1 flex items-center justify-center gap-1.5 bg-[#1F2937] hover:bg-[#374151] border border-[#374151] text-white text-[11px] font-bold py-2.5 rounded-lg transition-all">
                    <ShieldAlert size={14} className="text-[#EF4444]" /> SEGURANÇA
                  </button>
                  <button onClick={handleExportEtiquetas} className="flex-1 flex items-center justify-center gap-1.5 bg-[#1F2937] hover:bg-[#374151] border border-[#374151] text-white text-[11px] font-bold py-2.5 rounded-lg transition-all">
                    <Box size={14} className="text-[#10B981]" /> ETIQUETAS
                  </button>
                </div>

                {/* TOGGLE CONFIGURAÇÃO CNC */}
                <button
                  onClick={() => setMostrarConfigCNC(!mostrarConfigCNC)}
                  className={`flex items-center justify-center gap-1.5 text-[10px] font-bold py-2 rounded-lg transition-all ${
                    mostrarConfigCNC
                      ? 'bg-[#E2AC00]/20 text-[#E2AC00] border border-[#E2AC00]/30'
                      : 'bg-[#1F2937] hover:bg-[#374151] text-white border border-[#374151]'
                  }`}
                >
                  <Settings size={14} />
                  {mostrarConfigCNC ? 'ESCONDER CONFIG CNC' : 'CONFIGURAÇÃO CNC'}
                </button>

                {/* PAINEL DE CONFIGURAÇÃO CNC */}
                {mostrarConfigCNC && (
                  <CncConfigPanel config={cncConfig} onChange={handleCncConfigChange} />
                )}

                {/* PAINEL DE ANÁLISE DE SEGURANÇA E AJUSTES */}
                {program && (
                  <SafetyAnalysisPanel
                    issuesWithRecs={issuesWithRecs}
                    diffs={diffsAplicados}
                    collisionPolicy={cncConfig.machine.collisionPolicy}
                    onJumpToIssue={handleJumpToIssue}
                    onApplyRecommendation={handleApplyRecommendation}
                    onRerunSimulation={handleRerunSimulation}
                    isRerunning={isRerunning}
                    onPreviewRecommendation={handlePreviewRecommendation}
                  />
                )}

                {mostrarCaminho && (
                  <div className="bg-[#111827] border border-[#1F2937] rounded-xl p-3 text-[9px] font-mono text-[#6B7280]">
                    <span className="text-white font-bold block mb-1.5 text-[10px]">LEGENDA DO PERCURSO DE CORTE:</span>
                    <div className="grid grid-cols-2 gap-1.5">
                      <div className="flex items-center gap-1.5"><span className="w-2.5 h-1.5 bg-[#4B5563] rounded block" /> G00 Deslocamento Rápido</div>
                      <div className="flex items-center gap-1.5"><span className="w-2.5 h-1.5 bg-[#F97316] rounded block" /> G01 Mergulho Vertical</div>
                      <div className="flex items-center gap-1.5"><span className="w-2.5 h-1.5 bg-[#EF4444] rounded block" /> G01 Percurso de Corte</div>
                      <div className="flex items-center gap-1.5"><span className="w-2.5 h-1.5 bg-[#E2AC00] rounded block" /> G01 Lead In / Out</div>
                      <div className="flex items-center gap-1.5"><span className="w-2.5 h-1.5 bg-[#10B981] rounded block" /> Usinagem Concluída</div>
                    </div>
                  </div>
                )}

                <MetricsPanel
                  program={program}
                  metrics={metrics}
                  tempoAtual={tempoAtual}
                  posicaoAtual={posicaoAtual}
                  onJumpToIssue={handleJumpToIssue}
                />

                <PainelPecasRapido pecas={layoutAtual.pecas} pecaSelecionada={pecaSelecionada} onSelecionar={handleSelecionarPeca} />

                <div className="bg-[#111827] border border-[#1F2937] rounded-xl p-4">
                  <button onClick={() => setPlanoAtivo(null)} className="w-full flex items-center justify-center gap-2 bg-[#1F2937] hover:bg-[#374151] text-white text-xs font-semibold py-2.5 rounded-lg transition-all">
                    <Upload size={14} /> TROCAR PLANO
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {telaCheia && <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setTelaCheia(false)} />}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #374151; border-radius: 4px; }
      `}</style>
    </div>
  );
}
