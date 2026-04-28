/**
 * SERVIÇO: InsumosService
 * 
 * Gerencia a verificação de estoque e sugestão de compras baseada na demanda da produção.
 */

import { api } from '../../../../lib/api';

export interface SugestaoCompra {
  material_id: string;
  descricao: string;
  quantidade_necessaria: number;
  quantidade_estoque: number;
  quantidade_comprar: number;
  fornecedor_sugerido?: string;
}

export class InsumosService {
  /**
   * Verifica se há estoque suficiente para os materiais consumidos em um plano.
   * Se não houver, sugere a criação de pedidos de compra.
   */
  static async verificarENotificarFalta(materiaisConsumidos: { sku: string, area_m2: number }[]) {
    try {
      const estoqueAtual = await api.estoque.list();
      const sugestoes: SugestaoCompra[] = [];

      for (const material of materiaisConsumidos) {
        const itemEstoque = estoqueAtual.find(e => e.sku === material.sku);
        
        if (!itemEstoque || itemEstoque.quantidade < material.area_m2) {
          const falta = material.area_m2 - (itemEstoque?.quantidade || 0);
          
          sugestoes.push({
            material_id: itemEstoque?.id || 'novo',
            descricao: material.sku,
            quantidade_necessaria: material.area_m2,
            quantidade_estoque: itemEstoque?.quantidade || 0,
            quantidade_comprar: Math.ceil(falta * 1.1), // 10% de margem
            fornecedor_sugerido: itemEstoque?.fornecedor_id
          });
        }
      }

      if (sugestoes.length > 0) {
        // Criar notificação para o setor de compras
        await api.notificacoes.generate(); 
        
        // Opcional: Criar rascunho de pedido de compra
        for (const sug of sugestoes) {
          await api.compras.createPedido({
            fornecedor_id: sug.fornecedor_sugerido || '',
            status: 'rascunho',
            observacoes: `Automático: Falta de material para Plano de Corte. SKU: ${sug.descricao}`,
            itens: [
              { material_id: sug.material_id, quantidade: sug.quantidade_comprar }
            ]
          });
        }
      }

      return sugestoes;
    } catch (err) {
      console.error('Erro ao verificar insumos:', err);
      return [];
    }
  }

  /**
   * Registra a saída de ferragens do estoque
   */
  static async baixarFerragens(ferragens: { item: string, quantidade: number }[]) {
    try {
      for (const f of ferragens) {
        // Busca o SKU correspondente ou usa o nome do item como SKU simplificado
        await api.estoque.addMovimentacao({
          sku: f.item, // O sistema deve ter SKUs batendo com os nomes gerados pelo EngineeringService
          quantidade: f.quantidade,
          tipo: 'saida',
          motivo: 'Consumo Produção (Automático)',
          data: new Date().toISOString()
        });
      }
      console.log(`[Estoque] Baixa de ${ferragens.length} tipos de ferragens processada.`);
    } catch (err) {
      console.error('Erro ao baixar ferragens no estoque:', err);
    }
  }
}
