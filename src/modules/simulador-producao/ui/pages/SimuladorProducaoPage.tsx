import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2, Upload, Sparkles, ArrowRight, Factory, CheckCircle2, CircleDot, Layers3, Scissors, Tag } from 'lucide-react';
import { listarPlanos } from '../../../simulador-corte/infrastructure/repositories/PlanoCorteRepository';
import type { PlanoCorteCarregado } from '../../../simulador-corte/domain/types';
import type { FioDeFita } from '../../../plano-corte/domain/types';
import {
  DEFAULT_PRODUCTION_CONFIG,
  formatEdgePattern,
  simulateProductionScenario,
} from '../../domain/productionEngine';
import type { ProductionPieceInput, ProductionSimulationResult } from '../../domain/types';
import { exportarEtiquetaProducao, exportarTodasEtiquetas } from '../components/LabelExporterProducao';
import PlanoCorteVisao from '../components/PlanoCorteVisao';

type SourceMode = 'manual' | 'plano';

interface PieceRow extends ProductionPieceInput {
  quantidade: number;
}

const EXEMPLO: PieceRow[] = [
  { id: 'laterais-1', nome: 'LATERAL GUARDA-ROUPA', largura: 2100, altura: 600, quantidade: 2, fio_de_fita: { topo: true, baixo: true, esquerda: true, direita: true } },
  { id: 'tampo-1', nome: 'TAMPO SUPERIOR', largura: 1400, altura: 550, quantidade: 1, fio_de_fita: { topo: true, baixo: true, esquerda: true, direita: true } },
  { id: 'prateleira-1', nome: 'PRATELEIRA INTERNA', largura: 800, altura: 350, quantidade: 4, fio_de_fita: { topo: true } },
  { id: 'base-1', nome: 'BASE INFERIOR', largura: 1400, altura: 500, quantidade: 1, fio_de_fita: { topo: true, baixo: true } },
  { id: 'fundo-1', nome: 'FUNDO', largura: 2100, altura: 600, quantidade: 1, fio_de_fita: {} },
];

function gerarId() {
  return `piece_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;
}

function criarLinhaVazia(): PieceRow {
  return {
    id: gerarId(),
    nome: 'PEÇA',
    largura: 600,
    altura: 400,
    quantidade: 1,
    fio_de_fita: {},
  };
}

function alternarFita(fio: FioDeFita, lado: keyof FioDeFita): FioDeFita {
  return {
    ...fio,
    [lado]: !fio?.[lado],
  };
}

function extrairPecasDoPlano(plano: PlanoCorteCarregado): PieceRow[] {
  const pecas: PieceRow[] = [];
  const seen = new Set<string>();

  const pushPeca = (p: any, fallbackNome: string) => {
    const key = `${p?.id || fallbackNome}-${p?.largura || p?.comprimento || 0}-${p?.altura || p?.largura || 0}`;
    if (seen.has(key)) return;
    seen.add(key);
    pecas.push({
      id: p?.id || gerarId(),
      nome: String(p?.nome || fallbackNome || 'PEÇA').toUpperCase(),
      largura: Number(p?.largura || p?.comprimento || 0) || 600,
      altura: Number(p?.altura || p?.largura || 0) || 400,
      quantidade: Number(p?.quantidade || 1) || 1,
      fio_de_fita: p?.fio_de_fita || {},
    });
  };

  if (plano.resultado?.perChapa) {
    Object.values(plano.resultado.perChapa).forEach((res: any) => {
      const layouts = Array.isArray(res?.layouts) ? res.layouts : [];
      layouts.forEach((layout: any, layoutIndex: number) => {
        const pecasLayout = Array.isArray(layout?.pecas_posicionadas) ? layout.pecas_posicionadas : [];
        pecasLayout.forEach((p: any, pIndex: number) => pushPeca(p, `${layout?.chapa_sku || plano.nome || 'PLANO'}-${layoutIndex + 1}-${pIndex + 1}`));
      });
    });
  }

  if (pecas.length === 0 && Array.isArray(plano.materiais)) {
    plano.materiais.forEach((mat: any, matIndex: number) => {
      const pecasMat = Array.isArray(mat?.pecas) ? mat.pecas : [];
      pecasMat.forEach((p: any, pIndex: number) => pushPeca(p, `${mat?.sku_chapa || plano.nome || 'MATERIAL'}-${matIndex + 1}-${pIndex + 1}`));
    });
  }

  return pecas.length > 0 ? pecas : [criarLinhaVazia()];
}

function formatMinutes(minutes: number) {
  if (!Number.isFinite(minutes)) return '0m';
  if (minutes < 60) return `${minutes.toFixed(1)} min`;
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return `${hours}h ${String(mins).padStart(2, '0')}m`;
}

function EdgeToggle({ active, label, onClick }: { active: boolean; label: string; onClick: () => void; }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md px-2 py-1 text-[10px] font-bold tracking-wider transition-all border ${
        active
          ? 'bg-[#E2AC00]/15 text-[#E2AC00] border-[#E2AC00]/40'
          : 'bg-[#0D1117] text-[#6B7280] border-[#1F2937] hover:border-[#374151]'
      }`}
    >
      {label}
    </button>
  );
}

export default function SimuladorProducaoPage() {
  const [sourceMode, setSourceMode] = useState<SourceMode>('manual');
  const [plans, setPlans] = useState<PlanoCorteCarregado[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [pieces, setPieces] = useState<PieceRow[]>(EXEMPLO);
  const [result, setResult] = useState<ProductionSimulationResult | null>(null);

  useEffect(() => {
    setLoadingPlans(true);
    listarPlanos()
      .then((data) => {
        const valid = data.filter((p) => p && (p.resultado?.perChapa || p.materiais?.length));
        setPlans(valid);
        setSelectedPlanId((current) => current || valid[0]?.id || '');
      })
      .catch((err) => {
        console.error('Erro ao carregar planos para o simulador de produção', err);
      })
      .finally(() => setLoadingPlans(false));
  }, []);

  const selectedPlan = useMemo(
    () => plans.find((plan) => plan.id === selectedPlanId) || null,
    [plans, selectedPlanId],
  );

  const addPiece = () => {
    setPieces((current) => [...current, criarLinhaVazia()]);
    setResult(null);
  };

  const updatePiece = (id: string, field: keyof PieceRow, value: string | number | FioDeFita) => {
    setPieces((current) => current.map((piece) => (piece.id === id ? { ...piece, [field]: value } : piece)));
    setResult(null);
  };

  const removePiece = (id: string) => {
    setPieces((current) => current.length > 1 ? current.filter((piece) => piece.id !== id) : current);
    setResult(null);
  };

  const loadExample = () => {
    setSourceMode('manual');
    setPieces(EXEMPLO.map((piece) => ({ ...piece, fio_de_fita: { ...piece.fio_de_fita } })));
    setResult(null);
  };

  const loadPlanPieces = () => {
    if (!selectedPlan) return;
    setSourceMode('plano');
    setPieces(extrairPecasDoPlano(selectedPlan));
    setResult(null);
  };

  const runSimulation = () => {
    const normalized = pieces
      .map((piece) => ({
        id: piece.id,
        nome: piece.nome.trim() || 'PEÇA',
        largura: Math.max(1, Number(piece.largura) || 0),
        altura: Math.max(1, Number(piece.altura) || 0),
        quantidade: Math.max(1, Number(piece.quantidade) || 1),
        fio_de_fita: piece.fio_de_fita || {},
      }))
      .filter((piece) => piece.largura > 0 && piece.altura > 0);

    setResult(simulateProductionScenario(normalized, DEFAULT_PRODUCTION_CONFIG));
  };

  const totalQtd = pieces.reduce((acc, p) => acc + Math.max(1, Number(p.quantidade || 1)), 0);

  return (
    <div className="page-container anim-fade-in">
      <div className="flex flex-col gap-3 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-[#E2AC00]/20 to-[#E2AC00]/5 border border-[#E2AC00]/20">
            <Factory className="text-[#E2AC00]" size={22} />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-white tracking-tight">SIMULADOR DE PRODUÇÃO MANUAL</h1>
            <p className="text-[#6B7280] text-xs tracking-wider">ESQUADREJADEIRA DE PRECISÃO + COLADEIRA DE FITA DE BORDA</p>
          </div>
        </div>
        <p className="text-sm text-[#9CA3AF] max-w-4xl">
          O cenário compara fluxo contínuo contra lote separado para responder a pergunta prática:
          por onde começar o corte manual, como alimentar a coladeira e qual sequência reduz mais fila, setup e espera.
        </p>
      </div>

      <div className="grid gap-4 xl:grid-cols-[380px_minmax(0,1fr)]">
        <div className="space-y-4">
          <div className="bg-[#111827] border border-[#1F2937] rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[#E2AC00] font-bold text-xs tracking-wider flex items-center gap-2">
                <Sparkles size={14} />
                CENÁRIO
              </h2>
              <span className="text-[10px] uppercase text-[#6B7280] tracking-wider">{totalQtd} peças no lote</span>
            </div>

            <div className="flex gap-2 mb-3">
              <button
                type="button"
                onClick={() => setSourceMode('manual')}
                className={`px-3 py-2 rounded-lg text-[11px] font-semibold transition-all ${
                  sourceMode === 'manual'
                    ? 'bg-[#E2AC00] text-black'
                    : 'bg-[#1F2937] text-[#9CA3AF] hover:text-white'
                }`}
              >
                Manual
              </button>
              <button
                type="button"
                onClick={() => setSourceMode('plano')}
                className={`px-3 py-2 rounded-lg text-[11px] font-semibold transition-all ${
                  sourceMode === 'plano'
                    ? 'bg-[#E2AC00] text-black'
                    : 'bg-[#1F2937] text-[#9CA3AF] hover:text-white'
                }`}
              >
                Plano de corte
              </button>
            </div>

            {sourceMode === 'plano' && (
              <div className="space-y-2">
                <label className="block text-[10px] uppercase tracking-wider text-[#6B7280]">Plano carregado</label>
                <select
                  value={selectedPlanId}
                  onChange={(e) => setSelectedPlanId(e.target.value)}
                  className="w-full bg-[#0D1117] border border-[#1F2937] rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-[#E2AC00]"
                >
                  {loadingPlans && <option>Carregando planos...</option>}
                  {plans.length === 0 && !loadingPlans && <option value="">Nenhum plano disponível</option>}
                  {plans.map((plan) => (
                    <option key={plan.id} value={plan.id}>
                      {plan.nome}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={loadPlanPieces}
                  disabled={!selectedPlan}
                  className="w-full flex items-center justify-center gap-2 rounded-lg bg-[#E2AC00] hover:bg-[#F5C200] disabled:opacity-50 disabled:cursor-not-allowed text-black font-bold text-sm py-2"
                >
                  <Upload size={14} />
                  Importar peças do plano
                </button>
              </div>
            )}

            {sourceMode === 'manual' && (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={loadExample}
                  className="flex-1 rounded-lg bg-[#1F2937] hover:bg-[#374151] text-white text-sm py-2 font-medium"
                >
                  Usar exemplo
                </button>
                <button
                  type="button"
                  onClick={() => setPieces([criarLinhaVazia()])}
                  className="flex-1 rounded-lg bg-[#1F2937] hover:bg-[#374151] text-white text-sm py-2 font-medium"
                >
                  Limpar
                </button>
              </div>
            )}
          </div>

          <div className="bg-[#111827] border border-[#1F2937] rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[#E2AC00] font-bold text-xs tracking-wider flex items-center gap-2">
                <Layers3 size={14} />
                PEÇAS
              </h2>
              <button
                type="button"
                onClick={addPiece}
                className="flex items-center gap-1 text-[11px] text-[#E2AC00] hover:text-white transition-colors"
              >
                <Plus size={12} />
                Adicionar
              </button>
            </div>

            <div className="space-y-3 max-h-[540px] overflow-y-auto pr-1 custom-scrollbar">
              {pieces.map((piece, index) => (
                <div key={piece.id} className="rounded-xl border border-[#1F2937] bg-[#0D1117] p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] uppercase tracking-wider text-[#6B7280] font-semibold">Peça {index + 1}</span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => exportarEtiquetaProducao(piece, index, pieces.length)}
                        className="text-[#E2AC00] hover:text-white transition-colors"
                        title="Exportar etiqueta QR"
                      >
                        <Tag size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => removePiece(piece.id)}
                        className="text-[#6B7280] hover:text-red-400 transition-colors"
                        title="Remover peça"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <label className="space-y-1">
                      <span className="block text-[10px] uppercase tracking-wider text-[#6B7280]">Nome</span>
                      <input
                        value={piece.nome}
                        onChange={(e) => updatePiece(piece.id, 'nome', e.target.value)}
                        className="w-full bg-[#111827] border border-[#1F2937] rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-[#E2AC00]"
                      />
                    </label>
                    <label className="space-y-1">
                      <span className="block text-[10px] uppercase tracking-wider text-[#6B7280]">Qtd</span>
                      <input
                        type="number"
                        min={1}
                        value={piece.quantidade}
                        onChange={(e) => updatePiece(piece.id, 'quantidade', Math.max(1, Number(e.target.value)))}
                        className="w-full bg-[#111827] border border-[#1F2937] rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-[#E2AC00]"
                      />
                    </label>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <label className="space-y-1">
                      <span className="block text-[10px] uppercase tracking-wider text-[#6B7280]">Largura mm</span>
                      <input
                        type="number"
                        min={1}
                        value={piece.largura}
                        onChange={(e) => updatePiece(piece.id, 'largura', Number(e.target.value))}
                        className="w-full bg-[#111827] border border-[#1F2937] rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-[#E2AC00]"
                      />
                    </label>
                    <label className="space-y-1">
                      <span className="block text-[10px] uppercase tracking-wider text-[#6B7280]">Altura mm</span>
                      <input
                        type="number"
                        min={1}
                        value={piece.altura}
                        onChange={(e) => updatePiece(piece.id, 'altura', Number(e.target.value))}
                        className="w-full bg-[#111827] border border-[#1F2937] rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-[#E2AC00]"
                      />
                    </label>
                  </div>

                  <div>
                    <span className="block text-[10px] uppercase tracking-wider text-[#6B7280] mb-2">Fita de borda</span>
                    <div className="flex flex-wrap gap-2">
                      <EdgeToggle active={!!piece.fio_de_fita?.topo} label="T" onClick={() => updatePiece(piece.id, 'fio_de_fita', alternarFita(piece.fio_de_fita, 'topo'))} />
                      <EdgeToggle active={!!piece.fio_de_fita?.baixo} label="B" onClick={() => updatePiece(piece.id, 'fio_de_fita', alternarFita(piece.fio_de_fita, 'baixo'))} />
                      <EdgeToggle active={!!piece.fio_de_fita?.esquerda} label="E" onClick={() => updatePiece(piece.id, 'fio_de_fita', alternarFita(piece.fio_de_fita, 'esquerda'))} />
                      <EdgeToggle active={!!piece.fio_de_fita?.direita} label="D" onClick={() => updatePiece(piece.id, 'fio_de_fita', alternarFita(piece.fio_de_fita, 'direita'))} />
                    </div>
                    <p className="mt-2 text-[10px] text-[#6B7280]">
                      {formatEdgePattern(piece.fio_de_fita)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={runSimulation}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#E2AC00] hover:bg-[#F5C200] text-black font-extrabold tracking-wide py-3"
          >
            <Scissors size={16} />
            SIMULAR PRODUÇÃO
          </button>
        </div>

        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Estratégia"
              value={result ? (result.recommended.id === 'fluxo_continuo' ? 'Fluxo contínuo' : 'Lote separado') : 'Aguardando'}
              hint={result ? 'Comparação automática entre as duas formas de trabalhar' : 'Execute a simulação para comparar cenários'}
            />
            <MetricCard
              label="Gargalo"
              value={result ? (result.bottleneck === 'coladeira' ? 'Coladeira' : 'Esquadrejadeira') : '-'}
              hint={result ? `Buffer sugerido: ${result.bufferRecommendation} peça(s)` : 'A máquina mais lenta dita o ritmo'}
            />
            <MetricCard
              label="Tempo total"
              value={result ? formatMinutes(result.recommended.makespanMinutes) : '-'}
              hint={result ? `Corte ${formatMinutes(result.recommended.cutMinutes)} | Fita ${formatMinutes(result.recommended.bandMinutes)}` : 'Inclui setup e troca de padrão'}
            />
            <MetricCard
              label="Peças"
              value={result ? `${result.totalPieces}` : `${totalQtd}`}
              hint={result ? `${result.totalEdgeMeters.toFixed(2)} m de fita estimados` : 'Quantidade total no lote'}
            />
          </div>

          {result ? (
            <>
              <div className="bg-[#111827] border border-[#1F2937] rounded-xl p-4">
                <div className="flex items-center justify-between gap-4 mb-4">
                  <div>
                    <h2 className="text-[#E2AC00] font-bold text-xs tracking-wider flex items-center gap-2">
                      <CheckCircle2 size={14} />
                      RECOMENDAÇÃO
                    </h2>
                    <p className="text-white text-lg font-bold mt-1">
                      {result.recommended.id === 'fluxo_continuo' ? 'Comece em fluxo contínuo' : 'Comece por lote separado'}
                    </p>
                  </div>
                  <div className="rounded-lg bg-[#0D1117] border border-[#1F2937] px-3 py-2 text-right">
                    <div className="text-[10px] uppercase tracking-wider text-[#6B7280]">Melhor cenário</div>
                    <div className="text-white font-bold">
                      {formatMinutes(result.recommended.makespanMinutes)}
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  {result.recommendations.map((item) => (
                    <div key={item} className="rounded-lg border border-[#1F2937] bg-[#0D1117] p-3 text-sm text-[#D1D5DB]">
                      {item}
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 xl:grid-cols-2">
                <StrategyCard
                  title="Fluxo contínuo"
                  result={result.flow}
                  accent="text-[#10B981]"
                />
                <StrategyCard
                  title="Lote separado"
                  result={result.batch}
                  accent="text-[#E2AC00]"
                />
              </div>

              <div className="bg-[#111827] border border-[#1F2937] rounded-xl p-4">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-[#E2AC00] font-bold text-xs tracking-wider flex items-center gap-2">
                    <ArrowRight size={14} />
                    ORDEM RECOMENDADA
                  </h2>
                  <span className="text-[10px] uppercase tracking-wider text-[#6B7280]">
                    primeiras peças para alimentar a linha
                  </span>
                </div>

                <div className="overflow-x-auto custom-scrollbar">
                  <table className="min-w-full text-left text-sm">
                    <thead className="text-[10px] uppercase tracking-wider text-[#6B7280] border-b border-[#1F2937]">
                      <tr>
                        <th className="py-2 pr-3">#</th>
                        <th className="py-2 pr-3">Peça</th>
                        <th className="py-2 pr-3">Formato</th>
                        <th className="py-2 pr-3">Corte</th>
                        <th className="py-2 pr-3">Fita</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.recommended.cutOrder.slice(0, 12).map((job, index) => (
                        <tr key={job.id} className="border-b border-[#1F2937]/70 text-[#D1D5DB]">
                          <td className="py-2 pr-3 text-[#E2AC00] font-bold">{index + 1}</td>
                          <td className="py-2 pr-3 font-medium">{job.nome}</td>
                          <td className="py-2 pr-3 text-[#9CA3AF]">
                            {job.largura}×{job.altura} mm
                          </td>
                          <td className="py-2 pr-3">
                            {formatMinutes(job.cutProcessMinutes)}
                          </td>
                          <td className="py-2 pr-3">
                            {formatEdgePattern(job.fio_de_fita)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </>
          ) : (
            <div className="bg-[#111827] border border-dashed border-[#374151] rounded-xl p-8 text-center">
              <CircleDot className="mx-auto text-[#E2AC00]" size={32} />
              <h2 className="text-white font-bold text-lg mt-3">Pronto para simular</h2>
              <p className="text-[#9CA3AF] text-sm mt-2 max-w-2xl mx-auto">
                Ajuste as peças, a quantidade de fita por borda e clique em simular. O módulo vai comparar
                fluxo contínuo e lote separado para mostrar qual caminho tende a reduzir o tempo total.
              </p>
            </div>
          )}

          {pieces.length > 0 && (
            <div className="bg-[#111827] border border-[#1F2937] rounded-xl p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-[#E2AC00] font-bold text-xs tracking-wider flex items-center gap-2">
                  <Layers3 size={14} />
                  PLANO DE CORTE — VISÃO GERAL
                </h2>
                <button
                  type="button"
                  onClick={() => exportarTodasEtiquetas(pieces)}
                  className="flex items-center gap-2 rounded-lg bg-[#E2AC00] hover:bg-[#F5C200] text-black font-bold text-xs px-3 py-2"
                >
                  <Tag size={12} />
                  EXPORTAR ETIQUETAS
                </button>
              </div>
              <PlanoCorteVisao pieces={pieces} />
            </div>
          )}
        </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #374151; border-radius: 4px; }
      `}</style>
    </div>
  );
}

function MetricCard({ label, value, hint }: { label: string; value: string; hint: string; }) {
  return (
    <div className="rounded-xl border border-[#1F2937] bg-[#111827] p-4">
      <div className="text-[10px] uppercase tracking-wider text-[#6B7280]">{label}</div>
      <div className="mt-2 text-xl font-extrabold text-white">{value}</div>
      <p className="mt-2 text-[11px] text-[#9CA3AF] leading-relaxed">{hint}</p>
    </div>
  );
}

function StrategyCard({
  title,
  result,
  accent,
}: {
  title: string;
  result: ProductionSimulationResult['recommended'];
  accent: string;
}) {
  return (
    <div className="rounded-xl border border-[#1F2937] bg-[#111827] p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className={`font-bold text-sm ${accent}`}>{title}</h3>
        <span className="text-[10px] uppercase tracking-wider text-[#6B7280]">{result.id}</span>
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm">
        <InfoChip label="Makespan" value={formatMinutes(result.makespanMinutes)} />
        <InfoChip label="Corte" value={formatMinutes(result.cutMinutes)} />
        <InfoChip label="Fita" value={formatMinutes(result.bandMinutes)} />
        <InfoChip label="Espera" value={formatMinutes(result.waitingMinutes)} />
        <InfoChip label="Setup saw" value={`${result.setupChanges.saw}`} />
        <InfoChip label="Setup cola" value={`${result.setupChanges.bander}`} />
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-[#6B7280] mb-2">
          <span>Sequência</span>
          <span>{result.wipPeak} peça(s) no buffer</span>
        </div>
        <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar pr-1">
          {result.cutOrder.slice(0, 10).map((job, index) => (
            <div key={job.id} className="rounded-lg bg-[#0D1117] border border-[#1F2937] p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[#E2AC00] font-bold text-xs">{index + 1}. {job.nome}</div>
                  <div className="text-[11px] text-[#9CA3AF] mt-1">{job.largura}×{job.altura} mm</div>
                </div>
                <div className="text-right">
                  <div className="text-[11px] text-white font-semibold">{formatMinutes(job.cutProcessMinutes)}</div>
                  <div className="text-[10px] text-[#9CA3AF]">{formatEdgePattern(job.fio_de_fita)}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function InfoChip({ label, value }: { label: string; value: string; }) {
  return (
    <div className="rounded-lg border border-[#1F2937] bg-[#0D1117] px-3 py-2">
      <div className="text-[10px] uppercase tracking-wider text-[#6B7280]">{label}</div>
      <div className="mt-1 text-white font-semibold">{value}</div>
    </div>
  );
}
