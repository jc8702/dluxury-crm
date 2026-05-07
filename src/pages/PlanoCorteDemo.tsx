'use client';

import React, { useState, useCallback } from 'react';
import { HybridOptimizer, MaxRectsOptimizer, GuillotineOptimizer } from '@/modules/plano-corte/domain/services';
import type { Peca, ResultadoOtimizacaoSimples as ResultadoOtimizacao } from '@/modules/plano-corte/domain/services/MaxRectsOptimizer';
import type { Peca as PecaDominio } from '@/modules/plano-corte/domain/types';

type AlgoritmoTipo = 'maxrects' | 'guillotine' | 'hybrid';

interface EstadoOtimizacao {
  carregando: boolean;
  resultado: ResultadoOtimizacao | null;
  erro: string | null;
  tempoExecucao: number;
  algoritmo: AlgoritmoTipo;
}

const PECAS_EXEMPLO: PecaDominio[] = [
  {
    id: 'porta-frente-1',
    nome: 'Porta Guarda-Roupa (Frente)',
    largura: 700,
    altura: 2100,
    rotacionavel: false,
    fio_de_fita: { topo: true, baixo: true, esquerda: true, direita: true }
  },
  {
    id: 'porta-frente-2',
    nome: 'Porta Guarda-Roupa (Frente) 2',
    largura: 700,
    altura: 2100,
    rotacionavel: false,
    fio_de_fita: { topo: true, baixo: true, esquerda: true, direita: true }
  },
  {
    id: 'costado-est-1',
    nome: 'Costado Estante',
    largura: 450,
    altura: 1800,
    rotacionavel: false
  },
  {
    id: 'costado-est-2',
    nome: 'Costado Estante 2',
    largura: 450,
    altura: 1800,
    rotacionavel: false
  },
  {
    id: 'prat-med-1',
    nome: 'Prateleira Média',
    largura: 600,
    altura: 350,
    rotacionavel: true,
    fio_de_fita: { topo: true, baixo: false, esquerda: false, direita: false }
  },
  {
    id: 'prat-med-2',
    nome: 'Prateleira Média 2',
    largura: 600,
    altura: 350,
    rotacionavel: true,
    fio_de_fita: { topo: true, baixo: false, esquerda: false, direita: false }
  },
  {
    id: 'prat-med-3',
    nome: 'Prateleira Média 3',
    largura: 600,
    altura: 350,
    rotacionavel: true,
    fio_de_fita: { topo: true, baixo: false, esquerda: false, direita: false }
  },
  {
    id: 'tampo-criado-1',
    nome: 'Tampo Criado-Mudo',
    largura: 500,
    altura: 400,
    rotacionavel: true
  },
  {
    id: 'tampo-criado-2',
    nome: 'Tampo Criado-Mudo 2',
    largura: 500,
    altura: 400,
    rotacionavel: true
  },
  {
    id: 'fundo-est-1',
    nome: 'Fundo Estante',
    largura: 850,
    altura: 1800,
    rotacionavel: false
  },
  {
    id: 'laterais-gv-1',
    nome: 'Lateral Gaveta',
    largura: 300,
    altura: 200,
    rotacionavel: true
  },
  {
    id: 'laterais-gv-2',
    nome: 'Lateral Gaveta 2',
    largura: 300,
    altura: 200,
    rotacionavel: true
  },
  {
    id: 'fundo-gv',
    nome: 'Fundo Gaveta',
    largura: 250,
    altura: 180,
    rotacionavel: true
  }
];

const CHAPA_PADRAO = {
  sku: 'MDF-18MM',
  largura_mm: 2750,
  altura_mm: 1830,
  espessura_mm: 18
};

export function PlanoCorteDemo() {
  const [estado, setEstado] = useState<EstadoOtimizacao>({
    carregando: false,
    resultado: null,
    erro: null,
    tempoExecucao: 0,
    algoritmo: 'hybrid'
  });

  const otimizar = useCallback(async (algoritmo: AlgoritmoTipo) => {
    setEstado(prev => ({ ...prev, carregando: true, erro: null }));

    try {
      const inicio = performance.now();
      let resultado: ResultadoOtimizacao;

      switch (algoritmo) {
        case 'maxrects': {
          const otimizador = new MaxRectsOptimizer(
            CHAPA_PADRAO.largura_mm,
            CHAPA_PADRAO.altura_mm,
            3
          );
          resultado = otimizador.otimizar(PECAS_EXEMPLO);
          break;
        }

        case 'guillotine': {
          const otimizador = new GuillotineOptimizer(
            CHAPA_PADRAO.largura_mm,
            CHAPA_PADRAO.altura_mm,
            3
          );
          resultado = otimizador.otimizar(PECAS_EXEMPLO);
          break;
        }

        case 'hybrid': {
          const otimizador = new HybridOptimizer(
            CHAPA_PADRAO.largura_mm,
            CHAPA_PADRAO.altura_mm,
            3
          );
          resultado = otimizador.otimizar(PECAS_EXEMPLO, 30);
          break;
        }
      }

      const tempoExecucao = performance.now() - inicio;

      setEstado(prev => ({
        ...prev,
        carregando: false,
        resultado,
        algoritmo,
        tempoExecucao
      }));
    } catch (err: any) {
      setEstado(prev => ({
        ...prev,
        carregando: false,
        erro: err.message || 'Erro desconhecido'
      }));
    }
  }, []);

  const estatisticas = estado.resultado ? {
    totalPecas: PECAS_EXEMPLO.length,
    pecasPosicionadas: estado.resultado.pecas_posicionadas.length,
    pecasNaoPosicionadas: PECAS_EXEMPLO.length - estado.resultado.pecas_posicionadas.length,
    chapasTotais: Math.ceil(
      estado.resultado.area_total / (CHAPA_PADRAO.largura_mm * CHAPA_PADRAO.altura_mm)
    ),
    aproveitamento: estado.resultado.aproveitamento.toFixed(1),
    desperdicio: (100 - estado.resultado.aproveitamento).toFixed(1),
    custoPorChapa: CHAPA_PADRAO.largura_mm * CHAPA_PADRAO.altura_mm * 0.0003,
    custoTotalMaterial: (estado.resultado.area_total / 1000000) * 800
  } : null;

  return (
    <div className="min-h-screen bg-slate-900 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-white mb-2">
            🪚 Otimizador de Plano de Corte
          </h1>
          <p className="text-slate-400">
            Teste do BLOCO 1 — MaxRects, Guillotine e Hybrid com dados reais de marcenaria
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          <div className="lg:col-span-1">
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                ⚙️ Algoritmo
              </h2>

              <div className="space-y-3">
                <button
                  onClick={() => otimizar('maxrects')}
                  disabled={estado.carregando}
                  className={`
                    w-full px-4 py-3 rounded-lg font-semibold transition-all
                    ${estado.algoritmo === 'maxrects' && !estado.carregando
                      ? 'bg-blue-600 text-white shadow-lg'
                      : 'bg-slate-700 text-slate-200 hover:bg-slate-600'
                    }
                    ${estado.carregando ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                  `}
                >
                  {estado.carregando && estado.algoritmo === 'maxrects' ? '⏳' : '📊'} MaxRects
                </button>

                <button
                  onClick={() => otimizar('guillotine')}
                  disabled={estado.carregando}
                  className={`
                    w-full px-4 py-3 rounded-lg font-semibold transition-all
                    ${estado.algoritmo === 'guillotine' && !estado.carregando
                      ? 'bg-amber-600 text-white shadow-lg'
                      : 'bg-slate-700 text-slate-200 hover:bg-slate-600'
                    }
                    ${estado.carregando ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                  `}
                >
                  {estado.carregando && estado.algoritmo === 'guillotine' ? '⏳' : '✂️'} Guillotine
                </button>

                <button
                  onClick={() => otimizar('hybrid')}
                  disabled={estado.carregando}
                  className={`
                    w-full px-4 py-3 rounded-lg font-semibold transition-all
                    ${estado.algoritmo === 'hybrid' && !estado.carregando
                      ? 'bg-emerald-600 text-white shadow-lg'
                      : 'bg-slate-700 text-slate-200 hover:bg-slate-600'
                    }
                    ${estado.carregando ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                  `}
                >
                  {estado.carregando && estado.algoritmo === 'hybrid' ? '⏳' : '🔄'} Hybrid (30 iter.)
                </button>
              </div>

              <div className="mt-8 p-4 bg-slate-700 rounded-lg">
                <h3 className="text-sm font-semibold text-slate-300 mb-2">Dados de Entrada</h3>
                <div className="text-xs text-slate-400 space-y-1">
                  <p><span className="text-slate-300">Peças:</span> {PECAS_EXEMPLO.length}</p>
                  <p><span className="text-slate-300">Chapa:</span> {CHAPA_PADRAO.largura_mm}×{CHAPA_PADRAO.altura_mm}mm</p>
                  <p><span className="text-slate-300">Material:</span> {CHAPA_PADRAO.sku}</p>
                  <p><span className="text-slate-300">Kerf:</span> 3mm (serra)</p>
                </div>
              </div>
            </div>
          </div>

          {estado.erro ? (
            <div className="lg:col-span-2">
              <div className="bg-red-900 border border-red-700 rounded-xl p-6">
                <h2 className="text-xl font-semibold text-red-100 mb-2">❌ Erro</h2>
                <p className="text-red-200">{estado.erro}</p>
              </div>
            </div>
          ) : estado.resultado ? (
            <div className="lg:col-span-2">
              <div className="bg-emerald-900 border border-emerald-700 rounded-xl p-8 mb-6">
                <h2 className="text-2xl font-bold text-white mb-6">✅ Resultado Otimizado</h2>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-emerald-800 rounded-lg p-4">
                    <div className="text-sm text-emerald-200 mb-1">Aproveitamento</div>
                    <div className="text-3xl font-bold text-white">
                      {estatisticas?.aproveitamento}%
                    </div>
                  </div>

                  <div className="bg-emerald-800 rounded-lg p-4">
                    <div className="text-sm text-emerald-200 mb-1">Peças OK</div>
                    <div className="text-3xl font-bold text-white">
                      {estatisticas?.pecasPosicionadas}/{estatisticas?.totalPecas}
                    </div>
                  </div>

                  <div className="bg-emerald-800 rounded-lg p-4">
                    <div className="text-sm text-emerald-200 mb-1">Tempo</div>
                    <div className="text-3xl font-bold text-white">
                      {estado.tempoExecucao.toFixed(0)}ms
                    </div>
                  </div>

                  <div className="bg-emerald-800 rounded-lg p-4">
                    <div className="text-sm text-emerald-200 mb-1">Chapas</div>
                    <div className="text-3xl font-bold text-white">
                      {estatisticas?.chapasTotais}
                    </div>
                  </div>
                </div>

                <div className="mb-4">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-emerald-200">Área Utilizada</span>
                    <span className="text-emerald-100 font-semibold">
                      {(estado.resultado.area_usada / 1000000).toFixed(2)}m²
                    </span>
                  </div>
                  <div className="w-full bg-emerald-900 rounded-full h-3 overflow-hidden">
                    <div
                      className="bg-emerald-400 h-full transition-all"
                      style={{ width: `${estado.resultado.aproveitamento}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4">
                  📍 Peças Posicionadas ({estado.resultado.pecas_posicionadas.length})
                </h3>

                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {estado.resultado.pecas_posicionadas.map((peca: any, idx: number) => (
                    <div
                      key={peca.id}
                      className="flex justify-between items-center p-3 bg-slate-700 rounded-lg text-sm"
                    >
                      <div className="flex-1">
                        <div className="font-semibold text-slate-100">{idx + 1}. {peca.nome}</div>
                        <div className="text-xs text-slate-400">
                          Pos: ({peca.x}, {peca.y}) | Tam: {peca.largura}×{peca.altura}mm
                        </div>
                      </div>
                      <div className="text-xs">
                        {peca.rotacionada && <span className="bg-amber-700 text-amber-100 px-2 py-1 rounded">🔄 Rot</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="lg:col-span-2">
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-12 text-center">
                <p className="text-slate-400 mb-4">Clique em um algoritmo para começar</p>
                <p className="text-slate-500 text-sm">
                  Testando com {PECAS_EXEMPLO.length} peças reais de marcenaria
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default PlanoCorteDemo;
