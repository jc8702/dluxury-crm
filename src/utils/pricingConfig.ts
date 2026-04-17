/**
 * CAMADA DE CONFIGURAÇÃO DE PRECIFICAÇÃO (Clean Architecture)
 * Centraliza as regras de negócio para evitar lógica espalhada.
 */

// --- 1. INTERFACES ---

export interface PricingConfigSchema {
  custoHora: number;
  fallbacks: {
    markupCategoria: number;
    markupProjeto: number;
  };
  markupCategoria: Record<string, number>;
  markupProjeto: Record<string, number>;
  margemMinima: number;
}

// --- 2. GESTÃO DE CONFIGURAÇÃO ---

export class PricingConfigManager {
  private config: PricingConfigSchema;

  constructor(initialConfig: PricingConfigSchema) {
    this.config = initialConfig;
  }

  /**
   * Retorna o markup da categoria com fallback seguro
   */
  getMarkupCategoria(categoria: string): number {
    const markup = this.config.markupCategoria[categoria];
    if (markup === undefined || markup === null) {
      console.warn(`[PricingConfig] Categoria "${categoria}" não encontrada. Usando fallback.`);
      return this.config.fallbacks.markupCategoria;
    }
    return markup;
  }

  /**
   * Retorna o markup do projeto com fallback seguro
   */
  getMarkupProjeto(tipoProjeto: string): number {
    const markup = this.config.markupProjeto[tipoProjeto];
    if (markup === undefined || markup === null) {
      console.warn(`[PricingConfig] Tipo de Projeto "${tipoProjeto}" não encontrado. Usando fallback.`);
      return this.config.fallbacks.markupProjeto;
    }
    return markup;
  }

  /**
   * Getters básicos para valores diretos
   */
  get custoHora(): number { return this.config.custoHora; }
  get margemMinima(): number { return this.config.margemMinima; }
  get fullConfig(): PricingConfigSchema { return { ...this.config }; }
}

// --- 3. EXEMPLO DE CONFIGURAÇÃO (ESTÁTICA OU VINDA DO BANCO) ---

export const DEFAULT_PRICING_CONFIG: PricingConfigSchema = {
  custoHora: 50.0,
  fallbacks: {
    markupCategoria: 1.5, // 50% de markup se não encontrar a categoria
    markupProjeto: 1.1,    // 10% adicional se não encontrar o tipo de projeto
  },
  markupCategoria: {
    'Chapa': 1.6,
    'Fita': 2.2,
    'Ferragem': 1.4,
    'Servico_Terceiro': 1.2
  },
  markupProjeto: {
    'Cozinha': 1.25,
    'Dormitorio': 1.15,
    'Banheiro': 1.30,
    'Corporativo': 1.40
  },
  margemMinima: 0.22 // 22% de lucro real mínimo
};

/**
 * Singleton instance para uso global no sistema
 */
export const pricingManager = new PricingConfigManager(DEFAULT_PRICING_CONFIG);
