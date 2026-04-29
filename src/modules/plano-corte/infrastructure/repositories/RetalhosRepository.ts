import { db } from '../../../../api-lib/drizzle-db';
import { retalhosEstoque } from '../../../../db/schema/planos-de-corte';
import { eq, and, gte, sql, desc, asc } from 'drizzle-orm';
import type { Retalho, RetalhoDisponivel, CriarRetalhoInput, FiltrosRetalho } from '../../domain/entities/Retalho';
import { api } from '../../../../lib/api';

/**
 * REPOSITÓRIO DE RETALHOS
 * Implementação utilizando Drizzle ORM para PostgreSQL (Neon)
 */
export class RetalhosRepository {
  /**
   * BUSCAR RETALHOS DISPONÍVEIS
   * Retorna retalhos que podem ser usados, ordenados por área (menor primeiro)
   */
  async buscarRetalhosDisponiveis(filtros?: FiltrosRetalho): Promise<RetalhoDisponivel[]> {
    // Se estiver no Browser e sem DB direto, usa a API
    if (typeof window !== 'undefined' && !db) {
      const query = new URLSearchParams(filtros as any).toString();
      return api.retalhos.list(query) as any;
    }

    const conditions = [
      eq(retalhosEstoque.disponivel, true),
      eq(retalhosEstoque.descartado, false)
    ];

    if (filtros?.sku_chapa) {
      conditions.push(eq(retalhosEstoque.sku_chapa, filtros.sku_chapa));
    }

    if (filtros?.largura_min) {
      conditions.push(gte(retalhosEstoque.largura_mm, filtros.largura_min));
    }

    if (filtros?.altura_min) {
      conditions.push(gte(retalhosEstoque.altura_mm, filtros.altura_min));
    }

    if (filtros?.area_min) {
      conditions.push(sql`(${retalhosEstoque.largura_mm} * ${retalhosEstoque.altura_mm}) >= ${filtros.area_min}`);
    }

    if (filtros?.origem) {
      conditions.push(eq(retalhosEstoque.origem, filtros.origem));
    }

    const result = await db.select({
      id: retalhosEstoque.id,
      largura_mm: retalhosEstoque.largura_mm,
      altura_mm: retalhosEstoque.altura_mm,
      espessura_mm: retalhosEstoque.espessura_mm,
      sku_chapa: retalhosEstoque.sku_chapa,
      area_mm2: sql<number>`(${retalhosEstoque.largura_mm} * ${retalhosEstoque.altura_mm})`.as('area_mm2'),
      origem: retalhosEstoque.origem,
      plano_corte_origem_id: retalhosEstoque.plano_corte_origem_id,
      projeto_origem: retalhosEstoque.projeto_origem,
      observacoes: retalhosEstoque.observacoes,
      localizacao: retalhosEstoque.localizacao,
      criado_em: retalhosEstoque.created_at,
      atualizado_em: retalhosEstoque.updated_at,
      dias_estoque: sql<number>`EXTRACT(EPOCH FROM (NOW() - ${retalhosEstoque.created_at})) / 86400`.as('dias_estoque'),
      disponivel: retalhosEstoque.disponivel,
      descartado: retalhosEstoque.descartado
    })
    .from(retalhosEstoque)
    .where(and(...conditions))
    .orderBy(asc(retalhosEstoque.sku_chapa), asc(sql`area_mm2`), asc(retalhosEstoque.created_at));

    return result as unknown as RetalhoDisponivel[];
  }

  /**
   * SALVAR NOVO RETALHO
   * Cria um novo retalho no estoque
   */
  async salvarRetalho(input: CriarRetalhoInput): Promise<Retalho> {
    if (typeof window !== 'undefined' && !db) {
      return api.retalhos.create(input);
    }
    
    const now = new Date();
    const result = await db.insert(retalhosEstoque).values({
      largura_mm: input.largura_mm,
      altura_mm: input.altura_mm,
      espessura_mm: input.espessura_mm,
      sku_chapa: input.sku_chapa,
      origem: input.origem as any,
      plano_corte_origem_id: input.plano_corte_origem_id,
      projeto_origem: input.projeto_origem,
      observacoes: input.observacoes,
      localizacao: input.localizacao,
      usuario_criou: input.usuario_criou || 'sistema',
      disponivel: true,
      descartado: false,
      created_at: now,
      updated_at: now,
      metadata: {}
    }).returning();

    return result[0] as unknown as Retalho;
  }

  /**
   * USAR RETALHO
   * Marca retalho como utilizado em um plano de corte
   */
  async usarRetalho(retalhoId: string, planoCorteId: string): Promise<void> {
    if (typeof window !== 'undefined' && !db) {
      await api.retalhos.update(retalhoId, { utilizado_em_id: planoCorteId }, 'usar');
      return;
    }

    await db.update(retalhosEstoque)
      .set({
        disponivel: false,
        utilizado_em_id: planoCorteId,
        data_utilizacao: new Date(),
        updated_at: new Date()
      })
      .where(and(
        eq(retalhosEstoque.id, retalhoId),
        eq(retalhosEstoque.disponivel, true),
        eq(retalhosEstoque.descartado, false)
      ));
  }

  /**
   * DESCARTAR RETALHO
   * Marca retalho como descartado (danificado, obsoleto, etc)
   */
  async descartarRetalho(retalhoId: string, motivo: string): Promise<void> {
    await db.update(retalhosEstoque)
      .set({
        descartado: true,
        disponivel: false,
        motivo_descarte: motivo,
        data_descarte: new Date(),
        updated_at: new Date()
      })
      .where(eq(retalhosEstoque.id, retalhoId));
  }

  /**
   * LISTAR ESTOQUE COMPLETO
   * Retorna todos os retalhos (disponíveis, usados, descartados)
   */
  async listarEstoque(filtros?: FiltrosRetalho): Promise<Retalho[]> {
    const conditions = [];

    if (filtros?.sku_chapa) {
      conditions.push(eq(retalhosEstoque.sku_chapa, filtros.sku_chapa));
    }

    if (filtros?.disponivel !== undefined) {
      conditions.push(eq(retalhosEstoque.disponivel, filtros.disponivel));
    }

    if (filtros?.descartado !== undefined) {
      conditions.push(eq(retalhosEstoque.descartado, filtros.descartado));
    }

    const result = await db.select()
      .from(retalhosEstoque)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(retalhosEstoque.created_at));

    return result as unknown as Retalho[];
  }

  /**
   * OBTER ESTATÍSTICAS
   * Retorna resumo do estoque por SKU
   */
  async obterEstatisticas(): Promise<any[]> {
    const result = await db.select({
      sku_chapa: retalhosEstoque.sku_chapa,
      total_retalhos: sql`count(*)`,
      disponiveis: sql`sum(case when ${retalhosEstoque.disponivel} = true and ${retalhosEstoque.descartado} = false then 1 else 0 end)`,
      utilizados: sql`sum(case when ${retalhosEstoque.disponivel} = false and ${retalhosEstoque.descartado} = false then 1 else 0 end)`,
      descartados: sql`sum(case when ${retalhosEstoque.descartado} = true then 1 else 0 end)`,
      area_total_disponivel_mm2: sql`sum(${retalhosEstoque.largura_mm} * ${retalhosEstoque.altura_mm}) filter (where ${retalhosEstoque.disponivel} = true and ${retalhosEstoque.descartado} = false)`,
      area_media_mm2: sql`avg(${retalhosEstoque.largura_mm} * ${retalhosEstoque.altura_mm}) filter (where ${retalhosEstoque.disponivel} = true and ${retalhosEstoque.descartado} = false)`
    })
    .from(retalhosEstoque)
    .groupBy(retalhosEstoque.sku_chapa)
    .orderBy(retalhosEstoque.sku_chapa);

    return result;
  }
}

export const retalhosRepository = new RetalhosRepository();
