import pdf from 'pdf-parse';
import { db } from './drizzle-db.js';
import { skuComponente, skuEngenharia } from '../db/schema/engenharia-orcamentos.js';
import { ilike, or } from 'drizzle-orm';

/**
 * SERVIÇO DE IMPORTAÇÃO DE PROJETOS (SKETCHUP / PDF)
 */

export class ImportadorProjeto {
    /**
     * Parseia PDF Técnico em busca de lista de materiais
     */
    static async parsePDF(buffer: Buffer) {
        const data = await pdf(buffer);
        const text = data.text;
        
        // Regex para capturar padrões comuns de marcenaria:
        // Ex: "MDF Branco 15mm - 2750 x 1830 - Qtd: 5"
        // Ex: "Dobradiça FGV Slide - Qtd: 12"
        const patterns = [
            /(?<descricao>MDF\s+[\w\s]+)\s*-\s*(?<dim>[\d\s]+[xX][\d\s]+)\s*-\s*Qtd:\s*(?<qtd>\d+)/gi,
            /(?<descricao>[\w\s]+)\s*-\s*Qtd:\s*(?<qtd>\d+)/gi
        ];

        const components: any[] = [];

        for (const pattern of patterns) {
            let match;
            while ((match = pattern.exec(text)) !== null) {
                const groups = match.groups;
                if (!groups) continue;

                components.push({
                    descricao: groups.descricao.trim(),
                    dimensoes: groups.dim || null,
                    quantidade: parseInt(groups.qtd),
                    confianca: 0.8
                });
            }
        }

        // Tentar mapear para SKUs existentes
        return await this.mapearParaSKUs(components);
    }

    /**
     * Mapeia descrições genéricas para SKUs do sistema
     */
    private static async mapearParaSKUs(detected: any[]) {
        const result = [];
        
        for (const item of detected) {
            // Busca por similaridade no nome
            const matches = await db.select()
                .from(skuComponente)
                .where(or(
                    ilike(skuComponente.nome, `%${item.descricao}%`),
                    ilike(skuComponente.codigo, `%${item.descricao}%`)
                ))
                .limit(1);

            result.push({
                ...item,
                match_sugerido: matches.length > 0 ? {
                    sku_componente_id: matches[0].id,
                    codigo: matches[0].codigo,
                    nome: matches[0].nome,
                    confianca: 0.9
                } : null
            });
        }

        return result;
    }

    /**
     * Parseia dados do SketchUp (Simulado)
     * Geralmente exportado como CSV/JSON por plugins como "CutList" ou "OpenCutList"
     */
    static async parseSketchUp(jsonData: any) {
        // Assume que jsonData segue o padrão do OpenCutList
        const components = jsonData.parts || jsonData.components || [];
        
        const normalized = components.map((p: any) => ({
            descricao: p.name || p.definition_name,
            dimensoes: {
                largura: p.width,
                altura: p.height,
                espessura: p.thickness
            },
            quantidade: p.quantity || 1,
            confianca: 1.0
        }));

        return await this.mapearParaSKUs(normalized);
    }
}

export async function handleImportarProjeto(req: any, res: any) {
    if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Método não permitido' });

    try {
        const { type, content, jsonData } = req.body;

        let result;
        if (type === 'PDF') {
            const buffer = Buffer.from(content, 'base64');
            result = await ImportadorProjeto.parsePDF(buffer);
        } else if (type === 'SKETCHUP') {
            result = await ImportadorProjeto.parseSketchUp(jsonData);
        } else {
            return res.status(400).json({ success: false, error: 'Tipo de arquivo inválido' });
        }

        return res.status(200).json({ success: true, data: result });
    } catch (err: any) {
        console.error('[IMPORTADOR]', err);
        return res.status(500).json({ success: false, error: err.message });
    }
}
