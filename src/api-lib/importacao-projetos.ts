import * as pdfjs from 'pdfjs-dist';
import { db } from './drizzle-db.js';
import { skuComponente } from '../db/schema/engenharia-orcamentos.js';
import { ilike, or } from 'drizzle-orm';

/**
 * SERVIÇO DE IMPORTAÇÃO DE PROJETOS (SKETCHUP / PDF)
 * Refatorado para usar pdfjs-dist (mais estável em ambientes serverless como Vercel)
 */

export class ImportadorProjeto {
    /**
     * Parseia PDF Técnico em busca de lista de materiais
     */
    static async parsePDF(buffer: Buffer) {
        try {
            // Converter Buffer para Uint8Array para o PDF.js
            const uint8Array = new Uint8Array(buffer);
            
            // Carregar o documento
            const loadingTask = pdfjs.getDocument({ data: uint8Array, useSystemFonts: true });
            const pdfDoc = await loadingTask.promise;
            
            let fullText = '';
            
            // Extrair texto de todas as páginas
            for (let i = 1; i <= pdfDoc.numPages; i++) {
                const page = await pdfDoc.getPage(i);
                const textContent = await page.getTextContent();
                const pageText = textContent.items.map((item: any) => item.str).join(' ');
                fullText += pageText + '\n';
            }
            
            console.log('[IMPORTADOR] Texto extraído via PDF.js:', fullText.substring(0, 500));

            // Regex aprimorados para capturar diversos formatos
            const patterns = [
                /(?<descricao>MDF\s+[\w\s\d]+?)\s*-\s*(?<dim>[\d\s\.,]+[xX][\d\s\.,]+)\s*-\s*Qtd:\s*(?<qtd>\d+)/gi,
                /(?<qtd>\d+)\s*[xX]\s*(?<descricao>[\w\s\d\-]+?)\s*(?<dim>[\d\s\.,]+[xX][\d\s\.,]+)/gi,
                /(?<descricao>[\w\s\d\-]{3,})\s*-\s*Qtd:\s*(?<qtd>\d+)/gi,
                /(?<descricao>[\w\s\d\-]{3,})\s*\(?(?<dim>[\d\s\.,]+[xX][\d\s\.,]+)?\)?\s*Qtd:\s*(?<qtd>\d+)/gi
            ];

            const componentsMap = new Map<string, any>();

            for (const pattern of patterns) {
                let match;
                pattern.lastIndex = 0;
                while ((match = pattern.exec(fullText)) !== null) {
                    const groups = match.groups;
                    if (!groups) continue;

                    const descricao = groups.descricao.trim();
                    const qtd = parseInt(groups.qtd);
                    const key = `${descricao}_${groups.dim || ''}`;

                    if (!componentsMap.has(key)) {
                        componentsMap.set(key, {
                            descricao,
                            dimensoes: groups.dim || null,
                            quantidade: qtd,
                            confianca: 0.7
                        });
                    }
                }
            }

            const components = Array.from(componentsMap.values());
            
            // Heurística de fallback
            if (components.length === 0) {
                const lines = fullText.split('\n').map(l => l.trim()).filter(l => l.length > 5);
                for (const line of lines) {
                    if (line.toLowerCase().includes('qtd') || line.includes(' x ')) {
                        const qtdMatch = line.match(/qtd:?\s*(\d+)/i) || line.match(/^(\d+)\s*[xX]/);
                        if (qtdMatch) {
                            components.push({
                                descricao: line.replace(/qtd:?\s*(\d+)/i, '').replace(/^\d+\s*[xX]/, '').trim(),
                                quantidade: parseInt(qtdMatch[1]),
                                confianca: 0.5,
                                nota: 'Detectado via heurística'
                            });
                        }
                    }
                }
            }

            return await this.mapearParaSKUs(components);
        } catch (err: any) {
            console.error('[IMPORTADOR] Erro no processamento do PDF:', err);
            throw new Error(`Falha ao ler PDF: ${err.message}`);
        }
    }

    private static async mapearParaSKUs(detected: any[]) {
        const result = [];
        for (const item of detected) {
            const searchTerms = item.descricao.replace(/MDF/gi, '').replace(/\d+mm/gi, '').trim();
            if (!searchTerms) {
                result.push({ ...item, match_sugerido: null });
                continue;
            }

            const matches = await db.select()
                .from(skuComponente)
                .where(or(
                    ilike(skuComponente.nome, `%${searchTerms}%`),
                    ilike(skuComponente.codigo, `%${searchTerms}%`),
                    ilike(skuComponente.nome, `%${item.descricao}%`)
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

    static async parseSketchUp(jsonData: any) {
        const components = jsonData.parts || jsonData.components || [];
        const normalized = components.map((p: any) => ({
            descricao: p.name || p.definition_name,
            dimensoes: p.width ? { largura: p.width, altura: p.height, espessura: p.thickness } : null,
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
            if (!content) return res.status(400).json({ success: false, error: 'Conteúdo do PDF não fornecido' });
            const buffer = Buffer.from(content, 'base64');
            result = await ImportadorProjeto.parsePDF(buffer);
        } else if (type === 'SKETCHUP') {
            result = await ImportadorProjeto.parseSketchUp(jsonData || {});
        } else {
            return res.status(400).json({ success: false, error: 'Tipo de arquivo inválido' });
        }
        return res.status(200).json({ success: true, data: result });
    } catch (err: any) {
        console.error('[IMPORTADOR]', err);
        return res.status(500).json({ success: false, error: err.message });
    }
}
