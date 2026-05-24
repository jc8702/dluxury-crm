export interface PecaSimulacao {
  id: string;
  nome: string;
  comprimento: number;
  largura: number;
  espessura: number;
  x: number;
  y: number;
  rotacionada: boolean;
  cor?: string;
  sku?: string;
}

export interface ChapaSimulacao {
  sku: string;
  largura: number;
  altura: number;
  espessura: number;
}

export interface LayoutSimulacao {
  chapa: ChapaSimulacao;
  pecas: PecaSimulacao[];
  area_aproveitada_mm2: number;
  area_total_mm2: number;
  aproveitamento_percentual: number;
  espacos_vazios?: { x: number; y: number; largura: number; altura: number }[];
}

export interface PlanoCorteCarregado {
  id: string;
  nome: string;
  materiais: any[];
  resultado: {
    perChapa?: Record<string, any>;
    totalAproveitamento?: number;
  } | null;
  created_at: string;
  updated_at: string;
}

// ==========================================
// NOVOS TIPOS PARA SIMULADOR CNC INDUSTRIAL
// ==========================================

export interface MachineDefinition {
  larguraMaximaXY: [number, number]; // [X_max, Y_max] em mm
  alturaMaximaZ: number;             // mm
  velocidadeMaximaXY: number;        // mm/min
  velocidadeMaximaZ: number;         // mm/min
  aceleracaoXY: number;              // mm/s²
  aceleracaoZ: number;               // mm/s²
  zonaSeguraZ: number;               // mm
  tipoMesa: 'vacuo' | 't-slot' | 'mista';
}

export interface ToolDefinition {
  id: string;
  nome: string;
  diametro: number;        // mm
  comprimentoUtil: number; // mm
  stickout: number;        // mm (comprimento exposto da fresa)
  rpmMax: number;
  rpmRecomendado: number;
  feedCorteRecomendado: number;   // mm/min
  feedMergulhoRecomendado: number; // mm/min
}

export interface FixtureDefinition {
  id: string;
  tipo: 'clamp' | 'vacuum_pod' | 'fence' | 'stop_block';
  x: number;         // mm
  y: number;         // mm
  largura: number;   // mm
  altura: number;    // mm
  espessura: number; // mm
}

export interface StockDefinition {
  largura: number;   // mm
  altura: number;    // mm
  espessura: number; // mm
  material: string;
}

export type SimulationCommandType =
  | 'SPINDLE_ON'
  | 'SPINDLE_OFF'
  | 'MOVE_RAPID'
  | 'MOVE_CUTTING'
  | 'PLUNGE'
  | 'RETRACT'
  | 'SAFE_MOVE'
  | 'TOOL_CHANGE'
  | 'DRILL'
  | 'POCKET'
  | 'CONTOUR'
  | 'LEAD_IN'
  | 'LEAD_OUT'
  | 'DWELL';

export interface ToolpathSegment {
  id: string;
  from: { x: number; y: number; z: number };
  to: { x: number; y: number; z: number };
  tipo: 'rapid' | 'plunge' | 'cutting' | 'retract' | 'safe_move' | 'lead_in' | 'lead_out';
  velocidade: number; // mm/min
  toolId: string;
}

export interface SimulationCommand {
  id: string;
  tipo: SimulationCommandType;
  params: Record<string, any>;
  segments: ToolpathSegment[];
  tempoEstimado: number; // segundos
}

export interface SimulationProgram {
  id: string;
  commands: SimulationCommand[];
  totalTempoEstimado: number;
  totalDistancia: number;
  totalDistanciaCorte: number;
  totalDistanciaRapido: number;
  totalTrocasFerramenta: number;
  issues: SimulationIssue[];
}

export interface SimulationIssue {
  id: string;
  severidade: 'info' | 'warning' | 'error';
  codigo: string;
  mensagem: string;
  descricao: string;
  cmdIdx: number;
  tempo: number; // em segundos na simulação
  posicao: { x: number; y: number; z: number };
  sugestao: string;
  causa?: string;
  parametro?: string;
  autoResolvivel?: boolean;
  fixtureId?: string;
  valorAtual?: number;
  valorSugerido?: number;
}

export interface SimulationMetrics {
  tempoTotal: number;
  tempoCorte: number;
  tempoRapido: number;
  tempoMergulho: number;
  tempoRetracao: number;
  distanciaTotal: number;
  distanciaCorte: number;
  distanciaRapido: number;
  distanciaMergulho: number;
  trocasFerramenta: number;
  areaDesperdicioM2: number;
  volumeRemovidoMm3: number;
  numWarnings: number;
  numErros: number;
}

export interface PlaybackState {
  tempoAtual: number;
  velocidadeMultiplier: number;
  playing: boolean;
  stopOnCollision: boolean;
  comandoAtivoIdx: number;
}

export type PathPrimitive = 'line' | 'arc' | 'spline';

export interface SimulationState {
  x: number;
  y: number;
  z: number;
  spindleOn: boolean;
  rpm: number;
  comandoAtivoIdx: number;
  tipoMovimento: ToolpathSegment['tipo'];
}

export interface StockRemovalState {
  largura: number;
  altura: number;
  pixelsCortados: number;
  totalPixels: number;
}

// ==========================================
// TIPOS DE CONFIGURAÇÃO CNC / AUTO-AJUSTE
// ==========================================

export type CollisionPolicy = 'stop' | 'suggest' | 'auto';

export interface MachineSettings {
  safeZ: number;
  feedCorte: number;
  feedMergulho: number;
  feedRapido: number;
  rpmSpindle: number;
  diametroFerramenta: number;
  comprimentoUtil: number;
  stickout: number;
  alturaMaximaZ: number;
  limiteX: [number, number];  // [min, max]
  limiteY: [number, number];  // [min, max]
  stepdown: number;
  leadInDist: number;
  leadOutDist: number;
  clampingMargin: number;
  collisionPolicy: CollisionPolicy;
}

export interface ClampPosition {
  id: string;
  x: number;
  y: number;
  largura: number;
  altura: number;
}

export interface FixtureSettings {
  clamps: ClampPosition[];
}

export interface CncConfig {
  machine: MachineSettings;
  fixture: FixtureSettings;
}

export type AdjustmentType =
  | 'ADJUST_SAFE_Z'
  | 'ADJUST_LEAD_IN'
  | 'ADJUST_LEAD_OUT'
  | 'ADJUST_STICKOUT'
  | 'ADJUST_TOOL_LENGTH'
  | 'ADJUST_CLAMP_MARGIN'
  | 'ADJUST_FEED_RATE'
  | 'ADJUST_PLUNGE_RATE'
  | 'ADJUST_STEPDOWN'
  | 'REPOSITION_CLAMP'
  | 'REPOSITION_PART'
  | 'ROTATE_PART'
  | 'RECALCULATE_NESTING'
  | 'MANUAL_INTERVENTION_REQUIRED';

export type AdjustmentAction = 'auto' | 'suggested' | 'impossible';

export interface AdjustmentRecommendation {
  type: AdjustmentType;
  action: AdjustmentAction;
  paramName: string;
  oldValue: number | string;
  newValue: number | string;
  reason: string;
  explanation: string;
  risk?: string;
  tradeoff?: string;
}

export interface IssueWithRecommendation {
  issue: SimulationIssue;
  recommendations: AdjustmentRecommendation[];
  bestRecommendation: AdjustmentRecommendation | null;
}

export interface SetupDiff {
  paramName: string;
  before: number | string;
  after: number | string;
  unit: string;
}

export interface AdjustmentResult {
  applied: boolean;
  config: CncConfig;
  diffs: SetupDiff[];
  recommendations: IssueWithRecommendation[];
  hasUnresolvableIssues: boolean;
}

export interface GhostPreviewItem {
  type: 'clamp' | 'part' | 'safeZ_plane';
  id: string;
  x: number;
  y: number;
  largura: number;
  altura: number;
  zHeight?: number;
  label?: string;
  cor?: string;
}
