import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { 
  SimulationInput, 
  SimulationSummary, 
  SimulationResultSlot, 
  Product 
} from '../../types/simulator';
import { INITIAL_PRODUCTS } from '../../services/dataService';
import { saveSimulation, listSimulations, type SimulationRecord } from '../../infrastructure/repositories/SimulationRepository';

interface SimulationContextData {
  input: SimulationInput;
  result: SimulationSummary | null;
  scenarioA: { input: SimulationInput, result: SimulationSummary } | null;
  pastSimulations: SimulationRecord[];
  loadingHistory: boolean;
  updateInput: (newInput: Partial<SimulationInput>) => void;
  setInput: (fullInput: SimulationInput) => void;
  updateSlot: (index: number, slotData: any) => void;
  clearSlot: (index: number) => void;
  saveAsScenarioA: () => void;
  clearScenarioA: () => void;
  loadHistory: (clienteId?: string) => Promise<void>;
  persistSimulation: (clienteId: string, clienteNome: string) => Promise<void>;
  calculating: boolean;
}

const SimulationContext = createContext<SimulationContextData>({} as SimulationContextData);

export const SimulationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [input, setInput] = useState<SimulationInput>({
    slots: [
      { productId: '', monthlyQuantity: 0, selectedMargin: 'mg0' },
      { productId: '', monthlyQuantity: 0, selectedMargin: 'mg0' },
      { productId: '', monthlyQuantity: 0, selectedMargin: 'mg0' }
    ],
    investment: { equipment: 0, printer: 0, implant: 0, monthly: 0, commission: 0 },
    contractMonths: 12,
    cfPct: 0,
    paymentConditionCode: ''
  });

  const [result, setResult] = useState<SimulationSummary | null>(null);
  const [scenarioA, setScenarioA] = useState<{ input: SimulationInput, result: SimulationSummary } | null>(null);
  const [pastSimulations, setPastSimulations] = useState<SimulationRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [calculating, setCalculating] = useState(false);

  useEffect(() => {
    const calculate = async () => {
      const activeSlots = input.slots.filter(s => s.productId !== '');
      if (activeSlots.length === 0) {
        setResult(null);
        return;
      }

      setCalculating(true);
      
      const { slots, investment, contractMonths, cfPct } = input;
      const initialInvestment = (investment.equipment || 0) + (investment.printer || 0) + (investment.implant || 0);
      const recurringInvestment = (investment.monthly || 0) * contractMonths;
      const totalSubsidy = initialInvestment + recurringInvestment;
      const activeSlotsNum = slots.filter(s => s.monthlyQuantity > 0).length || 1;
      const subsidyPerModel = totalSubsidy / activeSlotsNum;

      const resultSlots: SimulationResultSlot[] = slots.map(slot => {
        if (!slot.productId) return createEmptySlotResult(slot.monthlyQuantity, contractMonths);
        
        const product = INITIAL_PRODUCTS.find(p => p.codigo === slot.productId);
        if (!product) return createEmptySlotResult(slot.monthlyQuantity, contractMonths);

        const totalVolume = slot.monthlyQuantity * contractMonths;
        const subsidyPerUn = slot.monthlyQuantity > 0 ? (subsidyPerModel / totalVolume) : 0;
        const commissionPerUn = (investment.commission || 0) / 100;
        
        const survivalBasePerUn = product.sem_bureau.mg0 / 1000;
        const survivalTotalPerUn = survivalBasePerUn + subsidyPerUn + commissionPerUn;
        const costWithCf = survivalTotalPerUn * (1 + cfPct);

        let suggestedBase = product.sem_bureau.mg0 / 1000;
        if (slot.selectedMargin === 'mg5') suggestedBase = product.sem_bureau.mg5 / 1000;
        else if (slot.selectedMargin === 'mg10') suggestedBase = product.sem_bureau.mid / 1000;
        else if (slot.selectedMargin === 'mg15') suggestedBase = product.sem_bureau.max / 1000;

        const suggestedTotal = suggestedBase + subsidyPerUn + commissionPerUn;
        const suggestedWithCf = suggestedTotal * (1 + cfPct);

        const proposedPrice = (slot.customPrice !== undefined && slot.customPrice !== null) 
          ? slot.customPrice 
          : suggestedWithCf;
        
        const realMargin = proposedPrice > 0 ? (proposedPrice - costWithCf) / proposedPrice : 0;
        const monthlyRevenue = slot.monthlyQuantity * proposedPrice;
        const monthlyProfit = (proposedPrice - costWithCf) * slot.monthlyQuantity;

        return {
          product,
          quantity: slot.monthlyQuantity,
          totalVolume,
          baseCostPerUn: survivalBasePerUn,
          subsidyPerUn,
          commissionPerUn,
          totalCostPerUn: survivalTotalPerUn,
          costWithCf,
          proposedPrice,
          realMargin,
          monthlyRevenue,
          monthlyProfit,
          isProfitable: proposedPrice >= costWithCf,
          targetPriceForZeroProfit: costWithCf,
          subsidyAllocated: subsidyPerModel,
          commissionTotal: (commissionPerUn * totalVolume),
          baseCostTotal: (survivalBasePerUn * totalVolume),
          totalCostContract: (survivalTotalPerUn * totalVolume)
        };
      });

      const totalMonthlyRevenue = resultSlots.reduce((acc, s) => acc + s.monthlyRevenue, 0);
      const totalMonthlyProfit = resultSlots.reduce((acc, s) => acc + s.monthlyProfit, 0);
      const averageMargin = totalMonthlyRevenue > 0 ? totalMonthlyProfit / totalMonthlyRevenue : 0;

      setResult({
        totalMonthlyRevenue,
        totalMonthlyProfit,
        averageMargin,
        totalSubsidy,
        totalVolume: resultSlots.reduce((acc, s) => acc + s.totalVolume, 0),
        slots: resultSlots
      });
      
      setCalculating(false);
    };

    calculate();
  }, [input]);

  const updateInput = (newInput: Partial<SimulationInput>) => {
    setInput(prev => ({ ...prev, ...newInput }));
  };

  const updateSlot = (index: number, slotData: any) => {
    const newSlots = [...input.slots];
    newSlots[index] = { ...newSlots[index], ...slotData };
    setInput(prev => ({ ...prev, slots: newSlots }));
  };

  const clearSlot = (index: number) => {
    const newSlots = [...input.slots];
    newSlots[index] = { productId: '', monthlyQuantity: 0, selectedMargin: 'mg0' };
    setInput(prev => ({ ...prev, slots: newSlots }));
  };

  const saveAsScenarioA = () => {
    if (result && input) {
      setScenarioA({ input: JSON.parse(JSON.stringify(input)), result: JSON.parse(JSON.stringify(result)) });
    }
  };

  const clearScenarioA = () => {
    setScenarioA(null);
  };

  const loadHistory = async (clienteId?: string) => {
    setLoadingHistory(true);
    try {
      const data = await listSimulations(clienteId);
      setPastSimulations(data);
    } catch (err) {
      console.error('Erro ao carregar histórico:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const persistSimulation = async (clienteId: string, clienteNome: string) => {
    if (!result) return;
    
    const record: SimulationRecord = {
      cliente_id: clienteId,
      cliente_nome: clienteNome,
      dados_simulacao: result,
      dados_input: input
    };

    const saved = await saveSimulation(record);
    setPastSimulations(prev => [saved, ...prev]);
  };

  const createEmptySlotResult = (quantity: number, months: number): SimulationResultSlot => ({
    product: { codigo: '', descricao: '', minSemBureau: 0, minComBureau: 0, midSemBureau: 0, midComBureau: 0, mg5SemBureau: 0, mg5ComBureau: 0, mg0SemBureau: 0, mg0ComBureau: 0, maxSemBureau: 0, maxComBureau: 0, sem_bureau: { max: 0, min: 0, mid: 0, mg0: 0, mg5: 0, max_ccf: 0, min_ccf: 0, mid_ccf: 0, mg5_ccf: 0, mg0_ccf: 0 }, com_bureau: { max: 0, min: 0, mid: 0, mg0: 0, mg5: 0, max_ccf: 0, min_ccf: 0, mid_ccf: 0, mg5_ccf: 0, mg0_ccf: 0 } },
    quantity,
    totalVolume: quantity * months,
    baseCostPerUn: 0,
    subsidyPerUn: 0,
    commissionPerUn: 0,
    totalCostPerUn: 0,
    costWithCf: 0,
    proposedPrice: 0,
    realMargin: 0,
    monthlyRevenue: 0,
    monthlyProfit: 0,
    isProfitable: false,
    targetPriceForZeroProfit: 0,
    subsidyAllocated: 0,
    commissionTotal: 0,
    baseCostTotal: 0,
    totalCostContract: 0
  });

  return (
    <SimulationContext.Provider value={{ 
      input, result, scenarioA, pastSimulations, loadingHistory, updateInput, setInput: (v) => setInput(v), updateSlot, clearSlot, saveAsScenarioA, clearScenarioA, loadHistory, persistSimulation, calculating 
    }}>
      {children}
    </SimulationContext.Provider>
  );
};

export const useSimulation = () => useContext(SimulationContext);
