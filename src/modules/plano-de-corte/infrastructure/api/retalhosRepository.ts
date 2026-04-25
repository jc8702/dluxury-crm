import { db } from '../../../api-lib/drizzle-db';
import { retalhosEstoque } from '../../../db/schema/planos-de-corte';
import { eq, inArray, and } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

export interface Retalho {
  id: string;
  sku_chapa: string;
  largura_mm: number;
  altura_mm: number;
  espessura_mm: number;
  origem?: string;
  plano_corte_origem_id?: string;
  disponivel: boolean;
  criado_em?: string;
}

export class RetalhosRepository {
  static async buscarRetalhosDisponiveis(skus: string[]): Promise<Retalho[]> {
    if (!skus || skus.length === 0) return [];
    
    const results = await db.select()
      .from(retalhosEstoque)
      .where(
        and(
          inArray(retalhosEstoque.sku_chapa, skus),
          eq(retalhosEstoque.disponivel, true)
        )
      );

    return results.map(r => ({
      id: r.id,
      sku_chapa: r.sku_chapa,
      largura_mm: r.largura_mm,
      altura_mm: r.altura_mm,
      espessura_mm: r.espessura_mm,
      origem: r.origem || undefined,
      plano_corte_origem_id: r.plano_corte_origem_id || undefined,
      disponivel: r.disponivel ?? true,
      criado_em: r.criado_em ? r.criado_em.toISOString() : undefined
    }));
  }

  static async marcarComoUsado(id: string): Promise<void> {
    await db.update(retalhosEstoque)
      .set({ disponivel: false })
      .where(eq(retalhosEstoque.id, id));
  }

  static async registrarSobra(
    sku_chapa: string,
    largura_mm: number,
    altura_mm: number,
    espessura_mm: number,
    plano_corte_origem_id?: string
  ): Promise<Retalho> {
    const id = uuidv4();
    
    await db.insert(retalhosEstoque).values({
      id,
      sku_chapa,
      largura_mm,
      altura_mm,
      espessura_mm,
      origem: 'sobra_plano_corte',
      plano_corte_origem_id,
      disponivel: true,
    });

    return {
      id,
      sku_chapa,
      largura_mm,
      altura_mm,
      espessura_mm,
      origem: 'sobra_plano_corte',
      plano_corte_origem_id,
      disponivel: true
    };
  }
}
