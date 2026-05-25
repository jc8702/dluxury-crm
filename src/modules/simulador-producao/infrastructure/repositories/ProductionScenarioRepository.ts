import { api } from '../../../../lib/api';
import type { ProductionPieceInput } from '../../domain/types';
import type { ProductionSimulationResult } from '../../domain/types';
import type { ProductionConfig } from '../../domain/types';

export interface ProductionScenarioRecord {
  id?: string;
  nome: string;
  tipo: 'producao';
  pieces: ProductionPieceInput[];
  config: ProductionConfig;
  result: ProductionSimulationResult | null;
  created_at?: string;
  updated_at?: string;
}

export const ProductionScenarioRepository = {
  async list(): Promise<ProductionScenarioRecord[]> {
    const response = await api.simulations.list('producao');
    const data = (response as any).data ?? response ?? [];
    return data.map(normalizeRecord);
  },

  async get(id: string): Promise<ProductionScenarioRecord> {
    const response = await api.simulations.get(id);
    const data = (response as any).data ?? response;
    return normalizeRecord(data);
  },

  async create(scenario: Omit<ProductionScenarioRecord, 'id' | 'created_at' | 'updated_at'>): Promise<ProductionScenarioRecord> {
    const response = await api.simulations.create({
      nome: scenario.nome,
      tipo: 'producao',
      dados_input: { pieces: scenario.pieces, config: scenario.config },
      dados_simulacao: scenario.result ?? {},
    });
    const data = (response as any).data ?? response;
    return normalizeRecord(data);
  },

  async update(id: string, scenario: Partial<ProductionScenarioRecord>): Promise<ProductionScenarioRecord> {
    const payload: any = {};
    if (scenario.nome !== undefined) payload.nome = scenario.nome;
    if (scenario.pieces !== undefined || scenario.config !== undefined) {
      payload.dados_input = { pieces: scenario.pieces, config: scenario.config };
    }
    if (scenario.result !== undefined) {
      payload.dados_simulacao = scenario.result ?? {};
    }
    const response = await api.simulations.update(id, payload);
    const data = (response as any).data ?? response;
    return normalizeRecord(data);
  },

  async delete(id: string): Promise<void> {
    await api.simulations.delete(id);
  },
};

function normalizeRecord(row: any): ProductionScenarioRecord {
  const dadosInput = row.dados_input || {};
  const pieces = Array.isArray(dadosInput.pieces) ? dadosInput.pieces : [];
  const config = dadosInput.config;
  const resultData = row.dados_simulacao;
  const hasResult = resultData && typeof resultData === 'object' && Object.keys(resultData).length > 0 && (resultData as any)?.jobs;

  return {
    id: row.id,
    nome: row.nome || 'Simulação',
    tipo: 'producao',
    pieces,
    config,
    result: hasResult ? (resultData as ProductionSimulationResult) : null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}
