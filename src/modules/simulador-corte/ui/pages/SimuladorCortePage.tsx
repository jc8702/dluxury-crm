import React, { useState, useEffect, useCallback } from 'react';
import { Scissors, Upload, FileText, RotateCw, Maximize2, Minimize2, ChevronLeft, ChevronRight } from 'lucide-react';
import { listarPlanos } from '../../infrastructure/repositories/PlanoCorteRepository';
import CanvasSimulador3D from '../components/CanvasSimulador3D';
import InfoCorte from '../components/InfoCorte';
import PainelPecasRapido from '../components/PainelPecasRapido';
import type { PlanoCorteCarregado, LayoutSimulacao, PecaSimulacao } from '../../domain/types';

export default function SimuladorCortePage() {
  const [planos, setPlanos] = useState<PlanoCorteCarregado[]>([]);
  const [planoAtivo, setPlanoAtivo] = useState<PlanoCorteCarregado | null>(null);
  const [indiceChapa, setIndiceChapa] = useState(0);
  const [pecaSelecionada, setPecaSelecionada] = useState<PecaSimulacao | null>(null);
  const [telaCheia, setTelaCheia] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listarPlanos()
      .then((data) => {
        setPlanos(data.filter((p) => p.resultado?.layouts?.length > 0));
      })
      .catch(() => {
        /* silently fail */
      })
      .finally(() => setLoading(false));
  }, []);

  const layouts = planoAtivo?.resultado?.layouts ?? [];
  const layoutAtual = layouts[indiceChapa] ?? null;

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

      {planos.length === 0 && !loading && (
        <div className="bg-[#111827] border border-[#1F2937] rounded-xl p-8 text-center mb-6">
          <FileText size={40} className="text-[#374151] mx-auto mb-3" />
          <h2 className="text-white font-bold text-sm mb-2">NENHUM PLANO DE CORTE DISPONÍVEL</h2>
          <p className="text-[#6B7280] text-xs">
            CRIE E OTIMIZE UM PLANO DE CORTE NO MÓDULO "PLANO DE CORTE" PARA VISUALIZÁ-LO AQUI EM 3D.
          </p>
        </div>
      )}

      {planos.length > 0 && !planoAtivo && (
        <div className="bg-[#111827] border border-[#1F2937] rounded-xl p-6 mb-6">
          <h3 className="text-white font-bold text-sm mb-4 tracking-wider">SELECIONE UM PLANO DE CORTE PARA SIMULAR</h3>
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
          {/* 3D Canvas */}
          <div className={`flex-1 ${telaCheia ? 'fixed inset-0 z-50 p-4 bg-[#0D1117]' : ''}`}>
            <div className="h-full min-h-[500px]">
              <CanvasSimulador3D
                layout={layoutAtual}
                onSelecionarPeca={handleSelecionarPeca}
              />
            </div>
          </div>

          {/* Sidebar */}
          <div className="w-full lg:w-80 space-y-4">
            {/* Navegação de chapas */}
            {layouts.length > 1 && (
              <div className="bg-[#111827] border border-[#1F2937] rounded-xl p-3">
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => handleNavegarChapa(-1)}
                    className="p-2 hover:bg-[#1F2937] rounded-lg text-[#6B7280] hover:text-[#E2AC00] transition-all"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <span className="text-white text-xs font-semibold">
                    CHAPA {indiceChapa + 1} / {layouts.length}
                  </span>
                  <button
                    onClick={() => handleNavegarChapa(1)}
                    className="p-2 hover:bg-[#1F2937] rounded-lg text-[#6B7280] hover:text-[#E2AC00] transition-all"
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
              </div>
            )}

            <InfoCorte
              layout={layoutAtual}
              pecaSelecionada={pecaSelecionada}
              indiceChapa={indiceChapa}
              totalChapas={layouts.length}
            />

            <PainelPecasRapido
              pecas={layoutAtual.pecas}
              pecaSelecionada={pecaSelecionada}
              onSelecionar={handleSelecionarPeca}
            />

            {/* Ações */}
            <div className="bg-[#111827] border border-[#1F2937] rounded-xl p-4 space-y-2">
              <button
                onClick={() => setPlanoAtivo(null)}
                className="w-full flex items-center justify-center gap-2 bg-[#1F2937] hover:bg-[#374151] text-white text-xs font-semibold py-2.5 rounded-lg transition-all"
              >
                <Upload size={14} />
                TROCAR PLANO
              </button>
            </div>
          </div>
        </div>
      )}

      {telaCheia && (
        <div
          className="fixed inset-0 bg-black/50 z-40"
          onClick={() => setTelaCheia(false)}
        />
      )}
    </div>
  );
}
