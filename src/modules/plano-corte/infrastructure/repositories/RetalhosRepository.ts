import { api } from '../../../../lib/api';
import type { 
  Retalho, 
  RetalhoDisponivel, 
  CriarRetalhoInput, 
  FiltrosRetalho 
} from '../../domain/entities/Retalho';

/**
 * REPOSITÓRIO DE RETALHOS (DEPARA BLOCO 2)
 * Abstração para acesso aos dados via API D'Luxury
 */
export class RetalhosRepository {
  
  /**
   * BUSCAR RETALHOS DISPONÍVEIS
   * Retorna retalhos que podem ser usados, com cálculos de área e dias
   */
  async buscarRetalhosDisponiveis(filtros?: FiltrosRetalho): Promise<RetalhoDisponivel[]> {
    const query = new URLSearchParams();
    if (filtros?.sku_chapa) query.append('sku_chapa', filtros.sku_chapa);
    if (filtros?.largura_min) query.append('largura_min', filtros.largura_min.toString());
    if (filtros?.altura_min) query.append('altura_min', filtros.altura_min.toString());
    if (filtros?.area_min) query.append('area_min', filtros.area_min.toString());
    if (filtros?.origem) query.append('origem', filtros.origem);
    
    query.append('disponivel', 'true');
    query.append('descartado', 'false');

    const rawData: Retalho[] = await api.retalhos.list(query.toString());
    
    // Mapear para RetalhoDisponivel com cálculos solicitados
    return rawData.map(r => ({
      ...r,
      area_mm2: r.largura_mm * r.altura_mm,
      dias_estoque: Math.floor((new Date().getTime() - new Date(r.criado_em).getTime()) / (1000 * 60 * 60 * 24))
    }));
  }

  /**
   * SALVAR NOVO RETALHO
   */
  async salvarRetalho(input: CriarRetalhoInput): Promise<Retalho> {
    return await api.retalhos.create(input);
  }

  /**
   * USAR RETALHO
   */
  async usarRetalho(retalhoId: string, planoCorteId: string): Promise<void> {
    await api.retalhos.update(retalhoId, { utilizado_em_id: planoCorteId }, 'usar');
  }

  /**
   * DESCARTAR RETALHO
   */
  async descartarRetalho(retalhoId: string, motivo: string): Promise<void> {
    await api.retalhos.update(retalhoId, { motivo_descarte: motivo }, 'descartar');
  }

  /**
   * LISTAR ESTOQUE COMPLETO
   */
  async listarEstoque(filtros?: FiltrosRetalho): Promise<Retalho[]> {
    const query = new URLSearchParams();
    if (filtros?.sku_chapa) query.append('sku_chapa', filtros.sku_chapa);
    if (filtros?.disponivel !== undefined) query.append('disponivel', filtros.disponivel.toString());
    if (filtros?.descartado !== undefined) query.append('descartado', filtros.descartado.toString());

    return await api.retalhos.list(query.toString());
  }

  /**
   * OBTER ESTATÍSTICAS
   */
  async obterEstatisticas(): Promise<any[]> {
    // Por enquanto simula via processamento local dos dados listados
    const todos = await this.listarEstoque();
    const skus = [...new Set(todos.map(r => r.sku_chapa))];
    
    return skus.map(sku => {
      const deSku = todos.filter(r => r.sku_chapa === sku);
      const disponiveis = deSku.filter(r => r.disponivel && !r.descartado);
      
      return {
        sku_chapa: sku,
        total_retalhos: deSku.length,
        disponiveis: disponiveis.length,
        utilizados: deSku.filter(r => !r.disponivel && !r.descartado).length,
        descartados: deSku.filter(r => r.descartado).length,
        area_total_disponivel_mm2: disponiveis.reduce((acc, r) => acc + (r.largura_mm * r.altura_mm), 0),
        area_media_mm2: disponiveis.length > 0 
          ? disponiveis.reduce((acc, r) => acc + (r.largura_mm * r.altura_mm), 0) / disponiveis.length 
          : 0
      };
    });
  }
}

export const retalhosRepository = new RetalhosRepository();
