// import pdf from 'pdf-parse'; // Removido por incompatibilidade ESM/Vercel
import { db } from './drizzle-db.js';
import { skuComponente } from '../db/schema/engenharia-orcamentos.js';
import { ilike, or } from 'drizzle-orm';

/**
 * SERVIÇO DE IMPORTAÇÃO DE PROJETOS (SKETCHUP / PDF)
 * Refatorado para máxima estabilidade em ambientes serverless (Vercel)
 * Utilizando PDF.js para extração de texto robusta.
 */

export class ImportadorProjeto {
    /**
     * Parseia PDF Técnico em busca de lista de materiais
     */
    static async parsePDF(buffer: Buffer) {
        try {
            console.log('[IMPORTADOR] Iniciando parse de PDF, tamanho:', buffer.length);
            
            // Usando PDF.js para extração de texto
            const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
            const loadingTask = pdfjs.getDocument({ 
                data: new Uint8Array(buffer),
                useSystemFonts: true,
                disableFontFace: true,
                isEvalSupported: false
            });
            
            const pdfDoc = await loadingTask.promise;
            let text = '';
            
            for (let i = 1; i <= Math.min(pdfDoc.numPages, 10); i++) {
                const page = await pdfDoc.getPage(i);
                const textContent = await page.getTextContent();
                const pageText = textContent.items
                    .map((item: any) => ('str' in item ? item.str : ''))
                    .join(' ');
                text += pageText + '\n';
            }
            
            if (!text || text.trim().length === 0) {
            
            if (!text || text.trim().length === 0) {
                console.warn('[IMPORTADOR] Nenhum texto extraído do PDF.');
                return [];
            }

            console.log('[IMPORTADOR] Texto extraído (primeiros 200 chars):', text.substring(0, 200).replace(/\n/g, ' '));

            // Padrões de busca (SKUs de marcenaria)
            const patterns = [
                // 1. Descrição - Dimensões - Qtd
                /(?<descricao>.+?)\s*-\s*(?<dim>\d+[\s\.,]*[xX][\s\.,]*\d+[\s\.,]*[xX][\s\.,]*\d+)\s*-\s*Qtd:\s*(?<qtd>\d+)/gi,
                // 2. Qtd x Descrição Dimensões
                /(?<qtd>\d+)\s*[xX]\s*(?<descricao>.+?)\s*(?<dim>\d+[\s\.,]*[xX][\s\.,]*\d+[\s\.,]*[xX][\s\.,]*\d+)/gi,
                // 3. Descrição - Qtd (Genérico)
                /(?<descricao>[^-\n]+)\s*-\s*Qtd:\s*(?<qtd>\d+)/gi,
                // 4. Qtd x Descrição (Início de linha)
                /^(?<qtd>\d+)\s*[xX]\s*(?<descricao>.+)$/gm,
                // 5. Descrição (Simples)
                /(?<descricao>MDF\s+[^-\n]+)/gi
            ];

            const componentsMap = new Map<string, any>();

            for (const pattern of patterns) {
                let match;
                pattern.lastIndex = 0;
                while ((match = pattern.exec(text)) !== null) {
                    const groups = match.groups;
                    if (!groups) continue;

                    const descricao = groups.descricao.trim();
                    const qtd = parseInt(groups.qtd);
                    const key = `${descricao}_${groups.dim || ''}`.toLowerCase();

                    if (!componentsMap.has(key)) {
                        componentsMap.set(key, {
                            descricao,
                            dimensoes: groups.dim || null,
                            quantidade: qtd,
                            confianca: 0.8
                        });
                    }
                }
            }

            let components = Array.from(componentsMap.values());
            
            // Fallback Heurístico (se nada foi encontrado pelos padrões)
            if (components.length === 0) {
                console.log('[IMPORTADOR] Tentando extração heurística por linha...');
                const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 5);
                for (const line of lines) {
                    // Procura por números seguidos de 'x' ou palavras como 'qtd'
                    const qtdMatch = line.match(/qtd:?\s*(\d+)/i) || line.match(/^(\d+)\s*[xX]/);
                    if (qtdMatch) {
                        components.push({
                            descricao: line.replace(/qtd:?\s*(\d+)/i, '').replace(/^\d+\s*[xX]/, '').trim(),
                            quantidade: parseInt(qtdMatch[1]),
                            confianca: 0.5,
                            nota: 'Extração Heurística'
                        });
                    }
                }
            }

            console.log(`[IMPORTADOR] ${components.length} componentes detectados.`);
            return await this.mapearParaSKUs(components);

        } catch (err: any) {
            console.error('[IMPORTADOR] Erro crítico no parsePDF:', err);
            // Fallback: se o pdf-parse quebrar, tentamos retornar algo vazio em vez de crashar a API
            throw new Error(`Erro no processamento do PDF: ${err.message}`);
        }
    }

    /**
     * Mapeia os itens detectados para os SKUs reais do banco de dados
     */
    private static async mapearParaSKUs(detected: any[]) {
        const result = [];
        for (const item of detected) {
            // Tenta limpar a descrição para busca (remove termos genéricos)
            const cleanDesc = item.descricao
                .replace(/MDF/gi, '')
                .replace(/\d+mm/gi, '')
                .replace(/chapa/gi, '')
                .trim();

            if (!cleanDesc || cleanDesc.length < 2) {
                result.push({ ...item, match_sugerido: null });
                continue;
            }

            // Busca no banco por nome ou código
            const matches = await db.select()
                .from(skuComponente)
                .where(or(
                    ilike(skuComponente.nome, `%${cleanDesc}%`),
                    ilike(skuComponente.codigo, `%${cleanDesc}%`)
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

    /**
     * Importação do SketchUp via JSON
     */
    static async parseSketchUp(jsonData: any) {
        const components = jsonData.parts || jsonData.components || jsonData.items || [];
        const normalized = components.map((p: any) => ({
            descricao: p.name || p.definition_name || p.descricao,
            dimensoes: p.width ? `${p.width}x${p.height}x${p.thickness}` : null,
            quantidade: p.quantity || p.qtd || 1,
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
            if (!content) throw new Error('Conteúdo do PDF ausente.');
            const buffer = Buffer.from(content, 'base64');
            result = await ImportadorProjeto.parsePDF(buffer);
        } else if (type === 'SKETCHUP') {
            result = await ImportadorProjeto.parseSketchUp(jsonData || {});
        } else {
            throw new Error('Tipo de importação não suportado.');
        }

        return res.status(200).json({ success: true, data: result });
    } catch (err: any) {
        console.error('[API IMPORTADOR] Falha:', err.message);
        return res.status(500).json({ 
            success: false, 
            error: err.message || 'Erro interno ao processar projeto'
        });
    }
}
