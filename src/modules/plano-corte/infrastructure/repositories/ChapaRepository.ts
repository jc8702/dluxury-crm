import { apiCall } from '../../../../lib/api';

export interface Chapa {
  id: string;
  sku: string;
  material: string;
  largura: number;
  altura: number;
  espessura: number;
  preco: number;
  imagem_url?: string;
}

export class ChapaRepository {
  async buscarPorSKU(termo: string): Promise<Chapa[]> {
    try {
      const response = await apiCall<{ success: boolean, data: any[] }>(`chapas?q=${termo}`);
      
      // apiCall already extracts .data if it follows the {success, data} pattern
      // based on src/lib/api.ts lines 47-52.
      const data = response as any as any[]; 

      return data.map(item => ({
        id: item.id,
        sku: item.sku,
        material: item.nome,
        largura: item.largura_mm,
        altura: item.altura_mm,
        espessura: item.espessura_mm,
        preco: Number(item.preco_unitario || 0),
        imagem_url: item.imagem_url
      }));
    } catch (err) {
      console.error('Erro ao buscar chapas por SKU:', err);
      return [];
    }
  }

  async getById(id: string): Promise<Chapa | null> {
    try {
      // O endpoint /api/chapas não tem get por ID no handleChapas, 
      // mas podemos filtrar na lista ou assumir que o handleChapas suporta se q=ID
      const results = await this.buscarPorSKU(id);
      return results.find(c => c.id === id || c.sku === id) || null;
    } catch (err) {
      return null;
    }
  }
}
