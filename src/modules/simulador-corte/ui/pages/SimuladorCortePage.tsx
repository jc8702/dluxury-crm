import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Scissors, Upload, FileText, RotateCw, Maximize2, Minimize2, ChevronLeft, ChevronRight, Plus, Trash2, Play, Zap, Grid3x3 } from 'lucide-react';
import { listarPlanos } from '../../infrastructure/repositories/PlanoCorteRepository';
import { MaxRectsOptimizer } from '../../../plano-corte/domain/services/MaxRectsOptimizer';
import CanvasSimulador3D from '../components/CanvasSimulador3D';
import InfoCorte from '../components/InfoCorte';
import PainelPecasRapido from '../components/PainelPecasRapido';
import type { PlanoCorteCarregado, LayoutSimulacao, PecaSimulacao, ChapaSimulacao } from '../../domain/types';
import type { Peca } from '../../../plano-corte/domain/types';

type ModoSimulador = 'rapida' | 'carregar';

interface PecaInput {
  id: string;
  nome: string;
  largura: number;
  altura: number;
  quantidade: number;
}

const defaultChapas = [
  { label: 'MDF 18MM 2750X1830', largura: 2750, altura: 1830 },
  { label: 'MDF 15MM 2750X1830', largura: 2750, altura: 1830 },
  { label: 'MDF 6MM 2750X1830', largura: 2750, altura: 1830 },
  { label: 'MDF 18MM 2500X1850', largura: 2500, altura: 1850 },
  { label: 'MDF 18MM 2800X2070', largura: 2800, altura: 2070 },
  { label: 'PERSONALIZADO', largura: 2750, altura: 1830 },
];

let idCounter = 0;
function gerarId() {
  idCounter += 1;
  return `peca_${Date.now()}_${idCounter}`;
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

  // Estado da simulação rápida
  const [chapaLargura, setChapaLargura] = useState(2750);
  const [chapaAltura, setChapaAltura] = useState(1830);
  const [chapaSku, setChapaSku] = useState('MDF 18MM 2750X1830');
  const [chapaPredef, setChapaPredef] = useState(0);
  const [pecasInput, setPecasInput] = useState<PecaInput[]>([
    { id: gerarId(), nome: 'PAINEL 1', largura: 600, altura: 400, quantidade: 2 },
    { id: gerarId(), nome: 'PORTA 1', largura: 500, altura: 1800, quantidade: 1 },
  ]);

  // Resultado da simulação rápida
  const [resultadoRapido, setResultadoRapido] = useState<LayoutSimulacao[]>([]);
  const [indiceResultado, setIndiceResultado] = useState(0);

  const layouts = useMemo(() => {
    if (modo === 'rapida') return resultadoRapido;
    return planoAtivo?.resultado?.layouts ?? [];
  }, [modo, resultadoRapido, planoAtivo]);

  const layoutAtual = layouts[indiceChapa] ?? null;
  const totalChapas = Math.max(layouts.length, 1);

  // Carregar planos existentes
  useEffect(() => {
    if (modo !== 'carregar') return;
    setLoadingPlanos(true);
    listarPlanos()
      .then((data) => setPlanos(data.filter((p) => p.resultado?.layouts?.length > 0)))
      .catch(() => {})
      .finally(() => setLoadingPlanos(false));
  }, [modo]);

  const handlePredefChapa = useCallback((idx: number) => {
    setChapaPredef(idx);
    const c = defaultChapas[idx];
    if (idx < defaultChapas.length - 1) {
      setChapaLargura(c.largura);
      setChapaAltura(c.altura);
      setChapaSku(c.label);
    }
  }, []);

  const handleAddPeca = useCallback(() => {
    setPecasInput((prev) => [...prev, { id: gerarId(), nome: '', largura: 300, altura: 300, quantidade: 1 }]);
  }, []);

  const handleRemovePeca = useCallback((id: string) => {
    setPecasInput((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const handleUpdatePeca = useCallback((id: string, field: keyof PecaInput, value: string | number) => {
    setPecasInput((prev) =>
      prev.map((p) => (p.id === id ? { ...p, [field]: value } : p))
    );
  }, []);

  const executarSimulacao = useCallback(() => {
    const pecasValidas = pecasInput.filter((p) => p.nome.trim() && p.largura > 0 && p.altura > 0);
    if (pecasValidas.length === 0) return;
    if (chapaLargura <= 0 || chapaAltura <= 0) return;

    setProcessando(true);

    setTimeout(() => {
      try {
        const pecas: Peca[] = [];
        for (const p of pecasValidas) {
          for (let i = 0; i < p.quantidade; i++) {
            pecas.push({
              id: `${p.id}_${i}`,
              nome: p.nome.toUpperCase(),
              largura: p.largura,
              altura: p.altura,
              rotacionavel: true,
            });
          }
        }

        const optimizer = new MaxRectsOptimizer(chapaLargura, chapaAltura, 3, 15);
        const resultado = optimizer.otimizar(pecas);

        const chapa: ChapaSimulacao = {
          sku: chapaSku.toUpperCase(),
          largura: chapaLargura,
          altura: chapaAltura,
          espessura: 18,
        };

        const layout: LayoutSimulacao = {
          chapa,
          pecas: resultado.pecas_posicionadas.map((p, i) => ({
            id: p.id,
            nome: p.nome,
            largura: p.rotacionada ? p.altura : p.largura,
            altura: p.rotacionada ? p.largura : p.altura,
            x: p.x,
            y: p.y,
            rotacionada: p.rotacionada,
          })),
          area_aproveitada_mm2: resultado.area_usada,
          area_total_mm2: resultado.area_total,
          aproveitamento_percentual: resultado.aproveitamento,
        };

        setResultadoRapido([layout]);
        setIndiceChapa(0);
        setPecaSelecionada(null);
      } catch (err) {
        console.error('ERRO NA OTIMIZAÇÃO:', err);
      } finally {
        setProcessando(false);
      }
    }, 100);
  }, [pecasInput, chapaLargura, chapaAltura, chapaSku]);

  const handleCarregarPlano = useCallback((plano: PlanoCorteCarregado) => {
    setPlanoAtivo(plano);
    setIndiceChapa(0);
    setPecaSelecionada(null);
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

  return (
    <div className="page-container anim-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-[#E2AC00]/20 to-[#E2AC00]/5 border border-[#E2AC00]/20">
            <Scissors className="text-[#E2AC00]" size={22} />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-white tracking-tight">SIMULADOR DE CORTE 3D</h1>
            <p className="text-[#6B7280] text-xs tracking-wider">VISUALIZAÇÃO INTERATIVA DE LAYOUT DE CORTE</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setTelaCheia(!telaCheia)}
            className="btn bg-[#1F2937] hover:bg-[#374151] border border-[#374151] p-2 rounded-lg transition-all"
            title={telaCheia ? 'SAIR DE TELA CHEIA' : 'TELA CHEIA'}
          >
            {telaCheia ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
        </div>
      </div>

      {/* TABS: SIMULAÇÃO RÁPIDA | CARREGAR PLANO */}
      <div className="flex gap-1 bg-[#1F2937] p-1 rounded-xl mb-6 w-fit">
        <button
          onClick={() => handleTrocarModo('rapida')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
            modo === 'rapida'
              ? 'bg-[#E2AC00] text-black'
              : 'text-[#6B7280] hover:text-white hover:bg-[#374151]'
          }`}
        >
          <Zap size={14} />
          SIMULAÇÃO RÁPIDA
        </button>
        <button
          onClick={() => handleTrocarModo('carregar')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
            modo === 'carregar'
              ? 'bg-[#E2AC00] text-black'
              : 'text-[#6B7280] hover:text-white hover:bg-[#374151]'
          }`}
        >
          <Upload size={14} />
          CARREGAR PLANO
        </button>
      </div>

      {/* MODO SIMULAÇÃO RÁPIDA */}
      {modo === 'rapida' && (
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Painel de entrada */}
          <div className="w-full lg:w-96 space-y-4">
            <div className="bg-[#111827] border border-[#1F2937] rounded-xl p-4">
              <h3 className="text-[#E2AC00] font-bold text-xs tracking-wider mb-3 flex items-center gap-2">
                <Grid3x3 size={14} />
                CONFIGURAÇÃO DA CHAPA
              </h3>

              <div className="grid grid-cols-2 gap-2 mb-3">
                {defaultChapas.map((c, i) => (
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

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="text-[#6B7280] block mb-1">LARGURA (MM)</label>
                  <input
                    type="number"
                    value={chapaLargura}
                    onChange={(e) => { setChapaLargura(Number(e.target.value)); setChapaPredef(defaultChapas.length - 1); }}
                    className="w-full bg-[#0D1117] border border-[#1F2937] rounded-lg px-3 py-2 text-white text-xs outline-none focus:border-[#E2AC00]"
                  />
                </div>
                <div>
                  <label className="text-[#6B7280] block mb-1">ALTURA (MM)</label>
                  <input
                    type="number"
                    value={chapaAltura}
                    onChange={(e) => { setChapaAltura(Number(e.target.value)); setChapaPredef(defaultChapas.length - 1); }}
                    className="w-full bg-[#0D1117] border border-[#1F2937] rounded-lg px-3 py-2 text-white text-xs outline-none focus:border-[#E2AC00]"
                  />
                </div>
              </div>
            </div>

            <div className="bg-[#111827] border border-[#1F2937] rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[#E2AC00] font-bold text-xs tracking-wider">PEÇAS</h3>
                <button
                  onClick={handleAddPeca}
                  className="flex items-center gap-1 text-[10px] text-[#E2AC00] hover:text-white transition-colors"
                >
                  <Plus size={12} />
                  ADICIONAR
                </button>
              </div>

              <div className="space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar pr-1">
                {pecasInput.map((peca, idx) => (
                  <div key={peca.id} className="bg-[#1F2937]/50 rounded-lg p-2.5 border border-[#1F2937]">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[#6B7280] text-[10px] font-semibold">PEÇA {idx + 1}</span>
                      <button onClick={() => handleRemovePeca(peca.id)} className="text-[#6B7280] hover:text-red-400 transition-colors">
                        <Trash2 size={12} />
                      </button>
                    </div>
                    <input
                      type="text"
                      value={peca.nome}
                      onChange={(e) => handleUpdatePeca(peca.id, 'nome', e.target.value.toUpperCase())}
                      placeholder="NOME DA PEÇA"
                      className="w-full bg-[#0D1117] border border-[#1F2937] rounded-lg px-2.5 py-1.5 text-white text-[11px] outline-none mb-1.5 focus:border-[#E2AC00]"
                    />
                    <div className="grid grid-cols-3 gap-1.5">
                      <div>
                        <label className="text-[#6B7280] text-[9px] block">LARG</label>
                        <input
                          type="number"
                          value={peca.largura}
                          onChange={(e) => handleUpdatePeca(peca.id, 'largura', Number(e.target.value))}
                          className="w-full bg-[#0D1117] border border-[#1F2937] rounded-lg px-2 py-1 text-white text-[11px] outline-none focus:border-[#E2AC00]"
                        />
                      </div>
                      <div>
                        <label className="text-[#6B7280] text-[9px] block">ALT</label>
                        <input
                          type="number"
                          value={peca.altura}
                          onChange={(e) => handleUpdatePeca(peca.id, 'altura', Number(e.target.value))}
                          className="w-full bg-[#0D1117] border border-[#1F2937] rounded-lg px-2 py-1 text-white text-[11px] outline-none focus:border-[#E2AC00]"
                        />
                      </div>
                      <div>
                        <label className="text-[#6B7280] text-[9px] block">QTD</label>
                        <input
                          type="number"
                          min={1}
                          value={peca.quantidade}
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
                {processando ? (
                  <>
                    <RotateCw size={14} className="animate-spin" />
                    PROCESSANDO...
                  </>
                ) : (
                  <>
                    <Play size={14} />
                    SIMULAR
                  </>
                )}
              </button>
            </div>
          </div>

          {/* 3D Canvas + Sidebar */}
          {layoutAtual ? (
            <>
              <div className={`flex-1 ${telaCheia ? 'fixed inset-0 z-50 p-4 bg-[#0D1117]' : ''}`}>
                <div className="h-full min-h-[500px]">
                  <CanvasSimulador3D layout={layoutAtual} onSelecionarPeca={handleSelecionarPeca} />
                </div>
              </div>

              <div className="w-full lg:w-80 space-y-4">
                {layouts.length > 1 && (
                  <div className="bg-[#111827] border border-[#1F2937] rounded-xl p-3">
                    <div className="flex items-center justify-between">
                      <button onClick={() => handleNavegarChapa(-1)} className="p-2 hover:bg-[#1F2937] rounded-lg text-[#6B7280] hover:text-[#E2AC00]">
                        <ChevronLeft size={18} />
                      </button>
                      <span className="text-white text-xs font-semibold">CHAPA {indiceChapa + 1} / {layouts.length}</span>
                      <button onClick={() => handleNavegarChapa(1)} className="p-2 hover:bg-[#1F2937] rounded-lg text-[#6B7280] hover:text-[#E2AC00]">
                        <ChevronRight size={18} />
                      </button>
                    </div>
                  </div>
                )}
                <InfoCorte layout={layoutAtual} pecaSelecionada={pecaSelecionada} indiceChapa={indiceChapa} totalChapas={totalChapas} />
                <PainelPecasRapido pecas={layoutAtual.pecas} pecaSelecionada={pecaSelecionada} onSelecionar={handleSelecionarPeca} />
              </div>
            </>
          ) : (
            <div className="flex-1 bg-[#111827] border border-[#1F2937] rounded-xl flex items-center justify-center min-h-[500px]">
              <div className="text-center">
                <Scissors size={48} className="text-[#374151] mx-auto mb-3" />
                <p className="text-[#6B7280] text-sm font-medium">ADICIONE PEÇAS E CLIQUE EM "SIMULAR"</p>
                <p className="text-[#6B7280] text-[11px] mt-1">O RESULTADO APARECERÁ AQUI EM 3D</p>
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
              <p className="text-[#6B7280] text-xs">CARREGANDO PLANOS...</p>
            </div>
          )}

          {!planoAtivo && !loadingPlanos && planos.length === 0 && (
            <div className="bg-[#111827] border border-[#1F2937] rounded-xl p-8 text-center mb-6">
              <FileText size={40} className="text-[#374151] mx-auto mb-3" />
              <h2 className="text-white font-bold text-sm mb-2">NENHUM PLANO DE CORTE DISPONÍVEL</h2>
              <p className="text-[#6B7280] text-xs">
                CRIE E OTIMIZE UM PLANO NO MÓDULO "PLANO DE CORTE" OU USE O MODO "SIMULAÇÃO RÁPIDA" ACIMA.
              </p>
            </div>
          )}

          {!planoAtivo && !loadingPlanos && planos.length > 0 && (
            <div className="bg-[#111827] border border-[#1F2937] rounded-xl p-6 mb-6">
              <h3 className="text-white font-bold text-sm mb-4 tracking-wider">SELECIONE UM PLANO DE CORTE</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {planos.map((plano) => {
                  const apv = plano.resultado?.aproveitamento_medio ?? 0;
                  const totalChapas = plano.resultado?.layouts?.length ?? 0;
                  return (
                    <button
                      key={plano.id}
                      onClick={() => handleCarregarPlano(plano)}
                      className="bg-[#1F2937]/50 hover:bg-[#1F2937] border border-[#374151] hover:border-[#E2AC00]/30 rounded-xl p-4 text-left transition-all duration-200 group"
                    >
                      <p className="text-white font-semibold text-sm truncate group-hover:text-[#E2AC00] transition-colors">
                        {plano.nome}
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-[#6B7280]">
                        <span>{totalChapas} CHAPA{(totalChapas > 1 ? 'S' : '')}</span>
                        <span className="text-[#10B981]">{apv.toFixed(1)}% APROV.</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {planoAtivo && layoutAtual && (
            <div className="flex flex-col lg:flex-row gap-4">
              <div className={`flex-1 ${telaCheia ? 'fixed inset-0 z-50 p-4 bg-[#0D1117]' : ''}`}>
                <div className="h-full min-h-[500px]">
                  <CanvasSimulador3D layout={layoutAtual} onSelecionarPeca={handleSelecionarPeca} />
                </div>
              </div>
              <div className="w-full lg:w-80 space-y-4">
                {layouts.length > 1 && (
                  <div className="bg-[#111827] border border-[#1F2937] rounded-xl p-3">
                    <div className="flex items-center justify-between">
                      <button onClick={() => handleNavegarChapa(-1)} className="p-2 hover:bg-[#1F2937] rounded-lg text-[#6B7280] hover:text-[#E2AC00]">
                        <ChevronLeft size={18} />
                      </button>
                      <span className="text-white text-xs font-semibold">CHAPA {indiceChapa + 1} / {layouts.length}</span>
                      <button onClick={() => handleNavegarChapa(1)} className="p-2 hover:bg-[#1F2937] rounded-lg text-[#6B7280] hover:text-[#E2AC00]">
                        <ChevronRight size={18} />
                      </button>
                    </div>
                  </div>
                )}
                <InfoCorte layout={layoutAtual} pecaSelecionada={pecaSelecionada} indiceChapa={indiceChapa} totalChapas={totalChapas} />
                <PainelPecasRapido pecas={layoutAtual.pecas} pecaSelecionada={pecaSelecionada} onSelecionar={handleSelecionarPeca} />
                <div className="bg-[#111827] border border-[#1F2937] rounded-xl p-4">
                  <button onClick={() => setPlanoAtivo(null)} className="w-full flex items-center justify-center gap-2 bg-[#1F2937] hover:bg-[#374151] text-white text-xs font-semibold py-2.5 rounded-lg transition-all">
                    <Upload size={14} />
                    TROCAR PLANO
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
