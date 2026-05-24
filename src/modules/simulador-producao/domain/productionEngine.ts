import { calcularMetrosFita } from '../../../utils/precificacao';
import type {
  ProductionConfig,
  ProductionEvent,
  ProductionJob,
  ProductionPieceInput,
  ProductionSimulationResult,
  ProductionStrategyResult,
} from './types';

export const DEFAULT_PRODUCTION_CONFIG: ProductionConfig = {
  saw: {
    setupMinutes: 1.2,
    feedRateMmPerMin: 12000,
    changeoverMinutes: 0.35,
  },
  bander: {
    setupMinutes: 1.8,
    feedRateMetersPerMin: 4.5,
    changeoverMinutes: 0.55,
  },
  bufferTargetPieces: 2,
};

function normalizeText(value: string | undefined, fallback: string) {
  return (value || fallback).trim().toUpperCase();
}

function countEdgeSides(fio?: ProductionPieceInput['fio_de_fita']) {
  if (!fio) return 0;
  return [fio.topo, fio.baixo, fio.esquerda, fio.direita].filter(Boolean).length;
}

function edgePatternKey(fio?: ProductionPieceInput['fio_de_fita']) {
  if (!fio) return 'SEM_FITA';
  const parts = [
    fio.topo ? 'T' : '',
    fio.baixo ? 'B' : '',
    fio.esquerda ? 'E' : '',
    fio.direita ? 'D' : '',
  ].filter(Boolean);
  return parts.length > 0 ? parts.join('') : 'SEM_FITA';
}

function calcEdgeMeters(piece: ProductionPieceInput) {
  const metros = calcularMetrosFita(
    piece.largura / 10,
    piece.altura / 10,
    {
      topo: !!piece.fio_de_fita?.topo,
      base: !!piece.fio_de_fita?.baixo,
      esquerda: !!piece.fio_de_fita?.esquerda,
      direita: !!piece.fio_de_fita?.direita,
    }
  );
  return Number(metros.toFixed(3));
}

function buildJobs(pieces: ProductionPieceInput[], config: ProductionConfig): ProductionJob[] {
  const jobs: ProductionJob[] = [];

  pieces.forEach((piece) => {
    const qtd = Math.max(1, Number(piece.quantidade || 1));
    const setupKey = 'MDF|18';
    const edgePattern = edgePatternKey(piece.fio_de_fita);
    const edgeMeters = calcEdgeMeters(piece);
    const edgeSides = countEdgeSides(piece.fio_de_fita);
    const cutLineMm = 2 * (piece.largura + piece.altura);
    const areaMm2 = piece.largura * piece.altura;

    const cutProcessMinutes = Number((
      (cutLineMm / config.saw.feedRateMmPerMin) +
      0.28 +
      Math.min(areaMm2 / 6_000_000, 0.45)
    ).toFixed(3));

    const bandProcessMinutes = edgeSides === 0
      ? 0
      : Number((
        (edgeMeters / config.bander.feedRateMetersPerMin) +
        (edgeSides * 0.12) +
        0.18
      ).toFixed(3));

    for (let i = 0; i < qtd; i += 1) {
      jobs.push({
        id: `${piece.id}-${i + 1}`,
        sourceId: piece.id,
        nome: qtd > 1 ? `${normalizeText(piece.nome, 'PEÇA')} #${i + 1}` : normalizeText(piece.nome, 'PEÇA'),
        largura: piece.largura,
        altura: piece.altura,
        fio_de_fita: piece.fio_de_fita || {},
        edgePatternKey: edgePattern,
        setupKey,
        cutProcessMinutes,
        bandProcessMinutes,
        edgeMeters,
        edgeSides,
      });
    }
  });

  return jobs;
}

function sortCutBatch(jobs: ProductionJob[]) {
  return [...jobs].sort((a, b) => {
    if (a.setupKey !== b.setupKey) return a.setupKey.localeCompare(b.setupKey);
    if (b.cutProcessMinutes !== a.cutProcessMinutes) return b.cutProcessMinutes - a.cutProcessMinutes;
    if (b.edgeMeters !== a.edgeMeters) return b.edgeMeters - a.edgeMeters;
    return a.nome.localeCompare(b.nome);
  });
}

function sortBandBatch(jobs: ProductionJob[]) {
  return [...jobs].sort((a, b) => {
    if (a.edgePatternKey !== b.edgePatternKey) return a.edgePatternKey.localeCompare(b.edgePatternKey);
    if (b.bandProcessMinutes !== a.bandProcessMinutes) return b.bandProcessMinutes - a.bandProcessMinutes;
    if (b.edgeMeters !== a.edgeMeters) return b.edgeMeters - a.edgeMeters;
    return a.nome.localeCompare(b.nome);
  });
}

function sortJohnson(jobs: ProductionJob[]) {
  const remaining = [...jobs];
  const front: ProductionJob[] = [];
  const back: ProductionJob[] = [];

  while (remaining.length > 0) {
    let bestIndex = 0;
    let bestScore = Infinity;

    for (let i = 0; i < remaining.length; i += 1) {
      const job = remaining[i];
      const score = Math.min(job.cutProcessMinutes, job.bandProcessMinutes || Number.POSITIVE_INFINITY);
      if (score < bestScore) {
        bestScore = score;
        bestIndex = i;
      }
    }

    const chosen = remaining.splice(bestIndex, 1)[0];
    if (chosen.bandProcessMinutes === 0 || chosen.cutProcessMinutes <= chosen.bandProcessMinutes) {
      front.push(chosen);
    } else {
      back.unshift(chosen);
    }
  }

  front.sort((a, b) => a.cutProcessMinutes - b.cutProcessMinutes || b.edgeMeters - a.edgeMeters || a.nome.localeCompare(b.nome));
  back.sort((a, b) => b.bandProcessMinutes - a.bandProcessMinutes || b.edgeMeters - a.edgeMeters || a.nome.localeCompare(b.nome));

  return [...front, ...back];
}

function simulateFlow(
  id: ProductionStrategyResult['id'],
  label: string,
  config: ProductionConfig,
  sequence: ProductionJob[]
): ProductionStrategyResult {
  const events: ProductionEvent[] = [];
  let sawCursor = 0;
  let bandCursor = 0;
  let previousSawKey: string | null = null;
  let previousBandKey: string | null = null;
  let totalCutMinutes = 0;
  let totalBandMinutes = 0;
  let waitingMinutes = 0;
  let sawSetupChanges = 0;
  let bandSetupChanges = 0;
  const waitingJobs: Array<{ time: number; delta: number }> = [];

  sequence.forEach((job, index) => {
    const sawSetup = index === 0
      ? config.saw.setupMinutes
      : previousSawKey !== job.setupKey
        ? config.saw.changeoverMinutes
        : 0;

    if (index === 0) {
      sawSetupChanges += 1;
    } else if (previousSawKey !== job.setupKey) {
      sawSetupChanges += 1;
    }

    const cutStart = sawCursor;
    const cutDuration = sawSetup + job.cutProcessMinutes;
    const cutFinish = cutStart + cutDuration;
    sawCursor = cutFinish;
    previousSawKey = job.setupKey;
    totalCutMinutes += cutDuration;
    events.push({
      machine: 'esquadrejadeira',
      jobId: job.id,
      jobName: job.nome,
      startMinute: Number(cutStart.toFixed(3)),
      endMinute: Number(cutFinish.toFixed(3)),
      durationMinutes: Number(cutDuration.toFixed(3)),
      note: sawSetup > 0 ? 'setup ou troca de lote' : undefined,
    });

    if (job.bandProcessMinutes > 0) {
      waitingJobs.push({ time: cutFinish, delta: 1 });

      const bandSetup = index === 0
        ? config.bander.setupMinutes
        : previousBandKey !== job.edgePatternKey
          ? config.bander.changeoverMinutes
          : 0;

      if (index === 0) {
        bandSetupChanges += 1;
      } else if (previousBandKey !== job.edgePatternKey) {
        bandSetupChanges += 1;
      }

      const bandStart = Math.max(bandCursor, cutFinish);
      const bandIdle = Math.max(0, bandStart - bandCursor);
      waitingMinutes += Math.max(0, bandStart - cutFinish);
      const bandDuration = bandSetup + job.bandProcessMinutes;
      const bandFinish = bandStart + bandDuration;
      bandCursor = bandFinish;
      previousBandKey = job.edgePatternKey;
      totalBandMinutes += bandDuration;
      events.push({
        machine: 'coladeira',
        jobId: job.id,
        jobName: job.nome,
        startMinute: Number(bandStart.toFixed(3)),
        endMinute: Number(bandFinish.toFixed(3)),
        durationMinutes: Number(bandDuration.toFixed(3)),
        note: bandIdle > 0 ? 'aguardando peça' : undefined,
      });
      waitingJobs.push({ time: bandFinish, delta: -1 });
    }
  });

  waitingJobs.sort((a, b) => a.time - b.time || a.delta - b.delta);
  let buffer = 0;
  let peakBuffer = 0;
  waitingJobs.forEach((entry) => {
    buffer += entry.delta;
    if (buffer > peakBuffer) {
      peakBuffer = buffer;
    }
  });

  const makespanMinutes = Math.max(sawCursor, bandCursor);

  return {
    id,
    label,
    cutOrder: sequence,
    bandOrder: sequence.filter((job) => job.bandProcessMinutes > 0),
    events,
    cutMinutes: Number(totalCutMinutes.toFixed(3)),
    bandMinutes: Number(totalBandMinutes.toFixed(3)),
    makespanMinutes: Number(makespanMinutes.toFixed(3)),
    waitingMinutes: Number(waitingMinutes.toFixed(3)),
    wipPeak: peakBuffer,
    setupChanges: {
      saw: sawSetupChanges,
      bander: bandSetupChanges,
    },
  };
}

function simulateBatch(
  jobs: ProductionJob[],
  config: ProductionConfig
): ProductionStrategyResult {
  const cutOrder = sortCutBatch(jobs);
  const bandOrder = sortBandBatch(jobs.filter((job) => job.bandProcessMinutes > 0));
  const events: ProductionEvent[] = [];
  let cutCursor = 0;
  let bandCursor = 0;
  let previousSawKey: string | null = null;
  let previousBandKey: string | null = null;
  let sawSetupChanges = 0;
  let bandSetupChanges = 0;
  let totalCutMinutes = 0;
  let totalBandMinutes = 0;
  const bandReadyTimes: number[] = [];

  cutOrder.forEach((job, index) => {
    const setup = index === 0
      ? config.saw.setupMinutes
      : previousSawKey !== job.setupKey
        ? config.saw.changeoverMinutes
        : 0;
    if (index === 0 || previousSawKey !== job.setupKey) {
      sawSetupChanges += 1;
    }
    const start = cutCursor;
    const duration = setup + job.cutProcessMinutes;
    const end = start + duration;
    cutCursor = end;
    previousSawKey = job.setupKey;
    totalCutMinutes += duration;
    events.push({
      machine: 'esquadrejadeira',
      jobId: job.id,
      jobName: job.nome,
      startMinute: Number(start.toFixed(3)),
      endMinute: Number(end.toFixed(3)),
      durationMinutes: Number(duration.toFixed(3)),
      note: setup > 0 ? 'setup ou troca de lote' : undefined,
    });
    if (job.bandProcessMinutes > 0) {
      bandReadyTimes.push(end);
    }
  });

  bandCursor = cutCursor;
  const waitingMinutes = bandReadyTimes.reduce((acc, readyTime) => acc + Math.max(0, bandCursor - readyTime), 0);

  bandOrder.forEach((job, index) => {
    const setup = index === 0
      ? config.bander.setupMinutes
      : previousBandKey !== job.edgePatternKey
        ? config.bander.changeoverMinutes
        : 0;
    if (index === 0 || previousBandKey !== job.edgePatternKey) {
      bandSetupChanges += 1;
    }

    const start = bandCursor;
    const duration = setup + job.bandProcessMinutes;
    const end = start + duration;
    bandCursor = end;
    previousBandKey = job.edgePatternKey;
    totalBandMinutes += duration;
    events.push({
      machine: 'coladeira',
      jobId: job.id,
      jobName: job.nome,
      startMinute: Number(start.toFixed(3)),
      endMinute: Number(end.toFixed(3)),
      durationMinutes: Number(duration.toFixed(3)),
      note: setup > 0 ? 'setup ou troca de padrão' : undefined,
    });
  });

  const peakBuffer = bandOrder.length > 0 ? bandOrder.length : 0;
  const makespanMinutes = totalCutMinutes + totalBandMinutes;

  return {
    id: 'lote_separado',
    label: 'Lote separado',
    cutOrder,
    bandOrder,
    events,
    cutMinutes: Number(totalCutMinutes.toFixed(3)),
    bandMinutes: Number(totalBandMinutes.toFixed(3)),
    makespanMinutes: Number(makespanMinutes.toFixed(3)),
    waitingMinutes: Number(waitingMinutes.toFixed(3)),
    wipPeak: peakBuffer,
    setupChanges: {
      saw: sawSetupChanges,
      bander: bandSetupChanges,
    },
  };
}

export function simulateProductionScenario(
  pieces: ProductionPieceInput[],
  config: ProductionConfig = DEFAULT_PRODUCTION_CONFIG
): ProductionSimulationResult {
  const jobs = buildJobs(pieces, config);
  const flow = simulateFlow('fluxo_continuo', 'Fluxo contínuo', config, sortJohnson(jobs));
  const batch = simulateBatch(jobs, config);

  const recommended = flow.makespanMinutes <= batch.makespanMinutes ? flow : batch;
  const bottleneck = recommended.bandMinutes > recommended.cutMinutes ? 'coladeira' : 'esquadrejadeira';
  const totalPieces = jobs.length;
  const totalEdgeMeters = Number(jobs.reduce((acc, job) => acc + job.edgeMeters, 0).toFixed(3));
  const totalCutProcessMinutes = Number(jobs.reduce((acc, job) => acc + job.cutProcessMinutes, 0).toFixed(3));
  const totalBandProcessMinutes = Number(jobs.reduce((acc, job) => acc + job.bandProcessMinutes, 0).toFixed(3));
  const bufferRecommendation = Math.max(
    1,
    Math.min(6, Math.ceil(recommended.bandMinutes / Math.max(recommended.cutMinutes, 1)))
  );

  const recommendations: string[] = [];
  recommendations.push(
    recommended.id === 'fluxo_continuo'
      ? 'A melhor forma de começar é cortar no fluxo contínuo: mantenha a esquadrejadeira alimentando a coladeira sem formar um lote grande parado.'
      : 'A melhor forma de começar é separar o lote: corte primeiro todas as peças e depois faça a fitagem em blocos por padrão de borda.'
  );
  recommendations.push(
    bottleneck === 'coladeira'
      ? `A coladeira é o gargalo. Deixe um buffer de aproximadamente ${bufferRecommendation} peça(s) entre corte e fitagem.`
      : 'A esquadrejadeira é o gargalo. A coladeira ficará com mais folga, então a prioridade é cortar as peças mais longas primeiro.'
  );
  recommendations.push(
    'Peças com 4 lados de fita e maior perímetro devem entrar cedo na fila porque consomem mais tempo na coladeira.'
  );
  recommendations.push(
    'Se houver troca de padrão de fita, agrupe as peças com o mesmo desenho de borda para reduzir setup e retrabalho.'
  );

  return {
    config,
    jobs,
    totalPieces,
    totalEdgeMeters,
    totalCutProcessMinutes,
    totalBandProcessMinutes,
    bufferRecommendation,
    bottleneck,
    recommended,
    batch,
    flow,
    recommendations,
  };
}

export function formatEdgePattern(fio?: ProductionPieceInput['fio_de_fita']) {
  const parts = [
    fio?.topo ? 'T' : '',
    fio?.baixo ? 'B' : '',
    fio?.esquerda ? 'E' : '',
    fio?.direita ? 'D' : '',
  ].filter(Boolean);
  return parts.length > 0 ? parts.join('/') : 'SEM FITA';
}
