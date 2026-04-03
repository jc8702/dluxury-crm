export type MarginStrategy = 'mg0' | 'mg5' | 'mg10' | 'mg15' | 'max';

export interface PriceSet {
  max_ccf: number;
  max: number;
  mid_ccf: number;
  mid: number;
  mg5_ccf: number;
  mg5: number;
  mg0_ccf: number;
  mg0: number;
  min_ccf: number;
  min: number;
}

export interface Product {
    descricao: string;
    codigo: string;
    minSemBureau: number;
    minComBureau: number;
    midSemBureau: number;
    midComBureau: number;
    mg5SemBureau: number;
    mg5ComBureau: number;
    mg0SemBureau: number;
    mg0ComBureau: number;
    maxSemBureau: number;
    maxComBureau: number;
    sem_bureau: PriceSet;
    com_bureau: PriceSet;
}

export interface SimulationSlotInput {
  productId: string;
  monthlyQuantity: number; // in units
  selectedMargin: MarginStrategy;
  customPrice?: number; // per unit
}

export interface InvestmentInput {
  equipment: number;
  printer: number;
  implant: number;
  monthly: number;
  commission: number; // Centavos por etiqueta (ex: 1 = R$ 0,01)
}

export interface SimulationInput {
  slots: SimulationSlotInput[];
  investment: InvestmentInput;
  contractMonths: number;
  cfPct: number;
  paymentConditionCode?: string;
}

export interface SimulationResultSlot {
  product: Product;
  quantity: number;
  totalVolume: number;
  baseCostPerUn: number;
  subsidyPerUn: number;
  commissionPerUn: number;
  totalCostPerUn: number;
  costWithCf: number;
  proposedPrice: number;
  targetPriceForZeroProfit: number;
  realMargin: number;
  monthlyRevenue: number;
  monthlyProfit: number;
  isProfitable: boolean;
  // Campos detalhados para o Memorial
  subsidyAllocated: number; // Valor total do subsídio neste modelo
  commissionTotal: number;  // Valor total da comissão neste modelo
  baseCostTotal: number;    // Valor total do custo base neste modelo
  totalCostContract: number; // Valor total do contrato para este modelo
}

export interface SimulationSummary {
  totalMonthlyRevenue: number;
  totalMonthlyProfit: number;
  averageMargin: number;
  totalSubsidy: number;
  totalVolume: number;
  slots: SimulationResultSlot[];
}

export type SimulationResult = SimulationSummary;

export interface PaymentCondition {
  codigo: string;
  criterio: string;
  pct: number;
}
