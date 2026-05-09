import { db } from './drizzle-db.js';
import { skuComponente } from '../db/schema/engenharia-orcamentos.js';
import { ilike, or } from 'drizzle-orm';

/**
 * SERVIÇO DE IMPORTAÇÃO DE PROJETOS - BACKEND (Vercel Serverless)
 * Refatorado: Recebe apenas JSON para evitar limites de payload (413) 
 * e erros de DOMMatrix/Polyfills de PDF no Node.js.
 */

export class ImportadorProjeto {
    /**
     * Mapeia os itens detectados (JSON) para os SKUs reais do banco de dados
     */
    static async mapearParaSKUs(itens: any[]) {
        const result = [];
        for (const item of itens) {
            // Limpeza para busca: remove termos genéricos para aumentar chance de match
            const cleanDesc = (item.nome || item.descricao || '')
                .replace(/MDF/gi, '')
                .replace(/\d+mm/gi, '')
                .trim();

            const material = item.material || '';

            // Busca no banco por nome, código ou material
            const matches = await db.select()
                .from(skuComponente)
                .where(or(
                    ilike(skuComponente.nome, `%${cleanDesc}%`),
                    ilike(skuComponente.codigo, `%${cleanDesc}%`),
                    ilike(skuComponente.nome, `%${material}%`)
                ))
                .limit(1);

            result.push({
                ...item,
                match_sugerido: matches.length > 0 ? {
                    sku_componente_id: matches[0].id,
                    codigo: matches[0].codigo,
                    nome: matches[0].nome,
                    custoUnitario: matches[0].custoUnitario,
                    confianca: 0.9
                } : null
            });
        }
        return result;
    }
}

export async function handleImportarProjeto(req: any, res: any) {
    if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Método não permitido' });

    try {
        const { type, jsonData } = req.body;
        
        if (!jsonData || !Array.isArray(jsonData)) {
            return res.status(400).json({ success: false, error: 'Dados JSON inválidos ou ausentes.' });
        }

        console.log(`[API IMPORTADOR] Processando ${jsonData.length} itens do tipo ${type}`);

        // O mapeamento para SKUs é a única responsabilidade pesada que ficou no backend
        const result = await ImportadorProjeto.mapearParaSKUs(jsonData);

        return res.status(200).json({ 
            success: true, 
            data: result,
            total: result.length,
            mapeados: result.filter(r => r.match_sugerido).length
        });
    } catch (err: any) {
        console.error('[API IMPORTADOR] Falha:', err.message);
        return res.status(500).json({ 
            success: false, 
            error: err.message || 'Erro interno ao processar projeto'
        });
    }
}
