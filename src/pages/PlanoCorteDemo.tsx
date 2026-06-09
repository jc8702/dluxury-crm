'use client';

import React, { useState, useCallback } from 'react';
import {
  HybridOptimizer,
  MaxRectsOptimizer,
  GuillotineOptimizer,
} from '@/modules/plano-corte/domain/services';
import type { ResultadoOtimizacaoSimples as ResultadoOtimizacao } from '@/modules/plano-corte/domain/services/MaxRectsOptimizer';
import type { Peca as PecaDominio } from '@/modules/plano-corte/domain/types';
import { Button, Card, Badge } from '@/components/ui';

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
    fio_de_fita: { topo: true, baixo: true, esquerda: true, direita: true },
  },
  {
    id: 'porta-frente-2',
    nome: 'Porta Guarda-Roupa (Frente) 2',
    largura: 700,
    altura: 2100,
    rotacionavel: false,
    fio_de_fita: { topo: true, baixo: true, esquerda: true, direita: true },
  },
  {
    id: 'costado-est-1',
    nome: 'Costado Estante',
    largura: 450,
    altura: 1800,
    rotacionavel: false,
  },
  {
    id: 'costado-est-2',
    nome: 'Costado Estante 2',
    largura: 450,
    altura: 1800,
    rotacionavel: false,
  },
  {
    id: 'prat-med-1',
    nome: 'Prateleira Média',
    largura: 600,
    altura: 350,
    rotacionavel: true,
    fio_de_fita: { topo: true, baixo: false, esquerda: false, direita: false },
  },
  {
    id: 'prat-med-2',
    nome: 'Prateleira Média 2',
    largura: 600,
    altura: 350,
    rotacionavel: true,
    fio_de_fita: { topo: true, baixo: false, esquerda: false, direita: false },
  },
  {
    id: 'prat-med-3',
    nome: 'Prateleira Média 3',
    largura: 600,
    altura: 350,
    rotacionavel: true,
    fio_de_fita: { topo: true, baixo: false, esquerda: false, direita: false },
  },
  {
    id: 'tampo-criado-1',
    nome: 'Tampo Criado-Mudo',
    largura: 500,
    altura: 400,
    rotacionavel: true,
  },
  {
    id: 'tampo-criado-2',
    nome: 'Tampo Criado-Mudo 2',
    largura: 500,
    altura: 400,
    rotacionavel: true,
  },
  {
    id: 'fundo-est-1',
    nome: 'Fundo Estante',
    largura: 850,
    altura: 1800,
    rotacionavel: false,
  },
  {
    id: 'laterais-gv-1',
    nome: 'Lateral Gaveta',
    largura: 300,
    altura: 200,
    rotacionavel: true,
  },
  {
    id: 'laterais-gv-2',
    nome: 'Lateral Gaveta 2',
    largura: 300,
    altura: 200,
    rotacionavel: true,
  },
  {
    id: 'fundo-gv',
    nome: 'Fundo Gaveta',
    largura: 250,
    altura: 180,
    rotacionavel: true,
  },
];

const CHAPA_PADRAO = {
  sku: 'MDF-18MM',
  largura_mm: 2750,
  altura_mm: 1830,
  espessura_mm: 18,
};

export function PlanoCorteDemo() {
  const [estado, setEstado] = useState<EstadoOtimizacao>({
    carregando: false,
    resultado: null,
    erro: null,
    tempoExecucao: 0,
    algoritmo: 'hybrid',
  });

  const otimizar = useCallback(async (algoritmo: AlgoritmoTipo) => {
    setEstado((prev) => ({ ...prev, carregando: true, erro: null }));

    try {
      const inicio = performance.now();
      let resultado: ResultadoOtimizacao;

      switch (algoritmo) {
        case 'maxrects': {
          const otimizador = new MaxRectsOptimizer(
            CHAPA_PADRAO.largura_mm,
            CHAPA_PADRAO.altura_mm,
            3,
          );
          resultado = otimizador.otimizar(PECAS_EXEMPLO);
          break;
        }

        case 'guillotine': {
          const otimizador = new GuillotineOptimizer(
            CHAPA_PADRAO.largura_mm,
            CHAPA_PADRAO.altura_mm,
            3,
          );
          resultado = otimizador.otimizar(PECAS_EXEMPLO);
          break;
        }

        case 'hybrid': {
          const otimizador = new HybridOptimizer(
            CHAPA_PADRAO.largura_mm,
            CHAPA_PADRAO.altura_mm,
            3,
          );
          resultado = otimizador.otimizar(PECAS_EXEMPLO, 30);
          break;
        }
      }

      const tempoExecucao = performance.now() - inicio;

      setEstado((prev) => ({
        ...prev,
        carregando: false,
        resultado,
        algoritmo,
        tempoExecucao,
      }));
    } catch (err: any) {
      setEstado((prev) => ({
        ...prev,
        carregando: false,
        erro: err.message || 'Erro desconhecido',
      }));
    }
  }, []);

  const estatisticas = estado.resultado
    ? {
        totalPecas: PECAS_EXEMPLO.length,
        pecasPosicionadas: estado.resultado.pecas_posicionadas.length,
        pecasNaoPosicionadas: PECAS_EXEMPLO.length - estado.resultado.pecas_posicionadas.length,
        chapasTotais: Math.ceil(
          estado.resultado.area_total / (CHAPA_PADRAO.largura_mm * CHAPA_PADRAO.altura_mm),
        ),
        aproveitamento: estado.resultado.aproveitamento.toFixed(1),
        desperdicio: (100 - estado.resultado.aproveitamento).toFixed(1),
        custoPorChapa: CHAPA_PADRAO.largura_mm * CHAPA_PADRAO.altura_mm * 0.0003,
        custoTotalMaterial: (estado.resultado.area_total / 1000000) * 800,
      }
    : null;

  return (
    <div className="min-h-screen bg-[var(--ui-bg)] p-8 animate-fade-in">
      <div className="max-w-7xl mx-auto">
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-[var(--ui-text-primary)] mb-2">
            🪚 Otimizador de Plano de Corte
          </h1>
          <p className="text-[var(--ui-text-secondary)]">
            Teste do BLOCO 1 — MaxRects, Guillotine e Hybrid com dados reais de marcenaria
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          <div className="lg:col-span-1">
            <Card className="p-6">
              <h2 className="text-xl font-semibold text-[var(--ui-text-primary)] mb-4 flex items-center gap-2">
                ⚙️ Algoritmo
              </h2>

              <div className="space-y-3">
                <Button
                  onClick={() => otimizar('maxrects')}
                  disabled={estado.carregando}
                  className={`w-full justify-start py-6 text-lg ${estado.algoritmo === 'maxrects' ? 'shadow-[var(--ui-shadow-primary)]' : ''}`}
                  variant={
                    estado.algoritmo === 'maxrects' && !estado.carregando ? 'primary' : 'outline'
                  }
                >
                  <span className="w-8 text-center">
                    {estado.carregando && estado.algoritmo === 'maxrects' ? '⏳' : '📊'}
                  </span>{' '}
                  MaxRects
                </Button>

                <Button
                  onClick={() => otimizar('guillotine')}
                  disabled={estado.carregando}
                  className={`w-full justify-start py-6 text-lg ${estado.algoritmo === 'guillotine' ? 'shadow-[var(--ui-shadow-primary)]' : ''}`}
                  variant={
                    estado.algoritmo === 'guillotine' && !estado.carregando ? 'primary' : 'outline'
                  }
                >
                  <span className="w-8 text-center">
                    {estado.carregando && estado.algoritmo === 'guillotine' ? '⏳' : '✂️'}
                  </span>{' '}
                  Guillotine
                </Button>

                <Button
                  onClick={() => otimizar('hybrid')}
                  disabled={estado.carregando}
                  className={`w-full justify-start py-6 text-lg ${estado.algoritmo === 'hybrid' ? 'shadow-[var(--ui-shadow-primary)]' : ''}`}
                  variant={
                    estado.algoritmo === 'hybrid' && !estado.carregando ? 'primary' : 'outline'
                  }
                >
                  <span className="w-8 text-center">
                    {estado.carregando && estado.algoritmo === 'hybrid' ? '⏳' : '🔄'}
                  </span>{' '}
                  Hybrid (30 iter.)
                </Button>
              </div>

              <div className="mt-8 p-4 rounded-xl border border-[var(--ui-border)] bg-[var(--ui-bg-subtle)]/50">
                <h3 className="text-sm font-semibold text-[var(--ui-text-primary)] mb-2">
                  Dados de Entrada
                </h3>
                <div className="text-xs text-[var(--ui-text-secondary)] space-y-2">
                  <p className="flex justify-between">
                    <span>Peças:</span>{' '}
                    <strong className="text-[var(--ui-text-primary)]">
                      {PECAS_EXEMPLO.length}
                    </strong>
                  </p>
                  <p className="flex justify-between">
                    <span>Chapa:</span>{' '}
                    <strong className="text-[var(--ui-text-primary)]">
                      {CHAPA_PADRAO.largura_mm}×{CHAPA_PADRAO.altura_mm}mm
                    </strong>
                  </p>
                  <p className="flex justify-between">
                    <span>Material:</span>{' '}
                    <strong className="text-[var(--ui-text-primary)]">{CHAPA_PADRAO.sku}</strong>
                  </p>
                  <p className="flex justify-between">
                    <span>Kerf:</span>{' '}
                    <strong className="text-[var(--ui-text-primary)]">3mm (serra)</strong>
                  </p>
                </div>
              </div>
            </Card>
          </div>

          {estado.erro ? (
            <div className="lg:col-span-2">
              <Card className="p-6 border-[var(--ui-color-danger)]/50 bg-[var(--ui-color-danger)]/5">
                <h2 className="text-xl font-semibold text-[var(--ui-color-danger)] mb-2">
                  ❌ Erro
                </h2>
                <p className="text-[var(--ui-color-danger)] opacity-90">{estado.erro}</p>
              </Card>
            </div>
          ) : estado.resultado ? (
            <div className="lg:col-span-2">
              <Card className="p-8 mb-6 border-[var(--ui-color-success)]/30 bg-[var(--ui-color-success)]/5">
                <h2 className="text-2xl font-bold text-[var(--ui-color-success)] mb-6 flex items-center gap-2">
                  <span className="text-3xl">✅</span> Resultado Otimizado
                </h2>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="rounded-xl border border-[var(--ui-border)] bg-[var(--ui-surface)] p-4 shadow-sm">
                    <div className="text-xs font-semibold text-[var(--ui-text-muted)] uppercase tracking-wider mb-1">
                      Aproveitamento
                    </div>
                    <div className="text-3xl font-bold text-[var(--ui-color-success)]">
                      {estatisticas?.aproveitamento}%
                    </div>
                  </div>

                  <div className="rounded-xl border border-[var(--ui-border)] bg-[var(--ui-surface)] p-4 shadow-sm">
                    <div className="text-xs font-semibold text-[var(--ui-text-muted)] uppercase tracking-wider mb-1">
                      Peças OK
                    </div>
                    <div className="text-3xl font-bold text-[var(--ui-text-primary)]">
                      {estatisticas?.pecasPosicionadas}
                      <span className="text-lg text-[var(--ui-text-muted)]">
                        /{estatisticas?.totalPecas}
                      </span>
                    </div>
                  </div>

                  <div className="rounded-xl border border-[var(--ui-border)] bg-[var(--ui-surface)] p-4 shadow-sm">
                    <div className="text-xs font-semibold text-[var(--ui-text-muted)] uppercase tracking-wider mb-1">
                      Tempo
                    </div>
                    <div className="text-3xl font-bold text-[var(--ui-text-primary)]">
                      {estado.tempoExecucao.toFixed(0)}
                      <span className="text-lg text-[var(--ui-text-muted)]">ms</span>
                    </div>
                  </div>

                  <div className="rounded-xl border border-[var(--ui-border)] bg-[var(--ui-surface)] p-4 shadow-sm">
                    <div className="text-xs font-semibold text-[var(--ui-text-muted)] uppercase tracking-wider mb-1">
                      Chapas
                    </div>
                    <div className="text-3xl font-bold text-[var(--ui-text-primary)]">
                      {estatisticas?.chapasTotais}
                    </div>
                  </div>
                </div>

                <div className="mb-4">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-[var(--ui-text-secondary)]">Área Utilizada</span>
                    <span className="text-[var(--ui-text-primary)] font-semibold">
                      {(estado.resultado.area_usada / 1000000).toFixed(2)}m²
                    </span>
                  </div>
                  <div className="w-full bg-[var(--ui-bg-subtle)] rounded-full h-3 overflow-hidden border border-[var(--ui-border)]">
                    <div
                      className="bg-[var(--ui-color-success)] h-full transition-all duration-1000 ease-out"
                      style={{ width: `${estado.resultado.aproveitamento}%` }}
                    />
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <h3 className="text-lg font-semibold text-[var(--ui-text-primary)] mb-4">
                  📍 Peças Posicionadas ({estado.resultado.pecas_posicionadas.length})
                </h3>

                <div className="space-y-2 max-h-64 overflow-y-auto pr-2 ui-scroll">
                  {estado.resultado.pecas_posicionadas.map((peca: any, idx: number) => (
                    <div
                      key={peca.id}
                      className="flex justify-between items-center p-3 border border-[var(--ui-border)] bg-[var(--ui-bg-subtle)]/30 rounded-lg text-sm hover:bg-[var(--ui-surface-hover)] transition-colors"
                    >
                      <div className="flex-1">
                        <div className="font-semibold text-[var(--ui-text-primary)]">
                          {idx + 1}. {peca.nome}
                        </div>
                        <div className="text-xs text-[var(--ui-text-muted)] mt-0.5">
                          Pos: ({peca.x}, {peca.y}) | Tam: {peca.largura}×{peca.altura}mm
                        </div>
                      </div>
                      <div className="text-xs">
                        {peca.rotacionada && <Badge tone="warning">🔄 Rotacionada</Badge>}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          ) : (
            <div className="lg:col-span-2">
              <Card className="p-12 text-center flex flex-col items-center justify-center min-h-[400px]">
                <div className="w-16 h-16 mb-4 rounded-full bg-[var(--ui-color-primary)]/10 flex items-center justify-center">
                  <span className="text-3xl opacity-80">⚙️</span>
                </div>
                <h3 className="text-xl font-bold text-[var(--ui-text-primary)] mb-2">
                  Pronto para Otimizar
                </h3>
                <p className="text-[var(--ui-text-secondary)] mb-4">
                  Clique em um algoritmo ao lado para iniciar a simulação
                </p>
                <Badge tone="outline" className="text-xs">
                  Testando com {PECAS_EXEMPLO.length} peças reais de marcenaria
                </Badge>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default PlanoCorteDemo;
