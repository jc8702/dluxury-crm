/**
 * SERVIÇO: EngineeringService
 * 
 * Calcula a necessidade de ferragens e insumos pequenos baseados na geometria das peças.
 * Heurísticas industriais para marcenaria.
 */

export interface FerragemNecessaria {
  item: string;
  quantidade: number;
  unidade: string;
}

export class EngineeringService {
  /**
   * Calcula ferragens baseadas na lista de peças
   */
  static calcularFerragens(pecas: any[]): FerragemNecessaria[] {
    let dobradicas = 0;
    let parafusos4x40 = 0;
    let parafusos35x14 = 0;
    let cavilhas = 0;
    let suportesPrateleira = 0;

    pecas.forEach(p => {
      // Regra: Portas (peças com fita de borda em 4 lados e área significativa)
      if (p.largura > 300 && p.altura > 600) {
        dobradicas += p.altura > 1200 ? 3 : 2;
        parafusos35x14 += (p.altura > 1200 ? 3 : 2) * 4; // 4 por dobradiça
      }

      // Regra: Estrutura (caixaria) - Identificação por nome ou geometria
      const isEstrutural = p.nome.toLowerCase().includes('lateral') || 
                           p.nome.toLowerCase().includes('base') ||
                           p.nome.toLowerCase().includes('fundo') ||
                           (p.largura < 100 && p.altura > 500) || // Travessas
                           (p.largura > 400 && p.altura > 400);   // Bases grandes

      if (isEstrutural) {
        parafusos4x40 += 6;
        cavilhas += 4;
      }

      // Regra: Prateleiras
      if (p.nome.toLowerCase().includes('prateleira')) {
        suportesPrateleira += 4;
      }
    });

    return [
      { item: "Dobradiça 35mm Slow", quantidade: dobradicas, unidade: "un" },
      { item: "Parafuso 4.0x40 CP", quantidade: parafusos4x40, unidade: "un" },
      { item: "Parafuso 3.5x14 CP", quantidade: parafusos35x14, unidade: "un" },
      { item: "Cavilha Madeira 8x30", quantidade: cavilhas, unidade: "un" },
      { item: "Suporte Prateleira Zincado", quantidade: suportesPrateleira, unidade: "un" }
    ].filter(f => f.quantidade > 0);
  }
}
