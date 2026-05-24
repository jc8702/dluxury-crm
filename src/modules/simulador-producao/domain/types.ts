import type { FioDeFita } from '../../../plano-corte/domain/types';

export interface ProductionPieceInput {
  id: string;
  nome: string;
  largura: number;
  altura: number;
  quantidade: number;
  fio_de_fita: FioDeFita;
}

export interface ProductionConfig {
  saw: {
    setupMinutes: number;
    feedRateMmPerMin: number;
    changeoverMinutes: number;
  };
  bander: {
    setupMinutes: number;
    feedRateMetersPerMin: number;
    changeoverMinutes: number;
  };
  bufferTargetPieces: number;
}

export interface ProductionJob {
  id: string;
  sourceId: string;
  nome: string;
  largura: number;
  altura: number;
  fio_de_fita: FioDeFita;
  edgePatternKey: string;
  setupKey: string;
  cutProcessMinutes: number;
  bandProcessMinutes: number;
  edgeMeters: number;
  edgeSides: number;
}

export interface ProductionEvent {
  machine: 'esquadrejadeira' | 'coladeira';
  jobId: string;
  jobName: string;
  startMinute: number;
  endMinute: number;
  durationMinutes: number;
  note?: string;
}

export interface ProductionStrategyResult {
  id: 'fluxo_continuo' | 'lote_separado';
  label: string;
  cutOrder: ProductionJob[];
  bandOrder: ProductionJob[];
  events: ProductionEvent[];
  cutMinutes: number;
  bandMinutes: number;
  makespanMinutes: number;
  waitingMinutes: number;
  wipPeak: number;
  setupChanges: {
    saw: number;
    bander: number;
  };
}

export interface ProductionSimulationResult {
  config: ProductionConfig;
  jobs: ProductionJob[];
  totalPieces: number;
  totalEdgeMeters: number;
  totalCutProcessMinutes: number;
  totalBandProcessMinutes: number;
  bufferRecommendation: number;
  bottleneck: 'esquadrejadeira' | 'coladeira';
  recommended: ProductionStrategyResult;
  batch: ProductionStrategyResult;
  flow: ProductionStrategyResult;
  recommendations: string[];
}
