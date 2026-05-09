import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

// Configuração do Worker (Vite compatível)
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

export interface ItemProjeto {
    nome: string;
    largura: number;
    altura: number;
    espessura: number;
    material: string;
    quantidade: number;
    pagina: number;
}

export class PDFParser {
    /**
     * Extrai itens do PDF seguindo o padrão Promob: NOME | LxAxE | MATERIAL | QTD
     */
    async extrairItensPromob(file: File): Promise<ItemProjeto[]> {
        const arrayBuffer = await file.arrayBuffer();
        const loadingTask = pdfjsLib.getDocument({ 
            data: arrayBuffer,
            useWorkerFetch: true,
            isEvalSupported: false 
        });
        
        const pdf = await loadingTask.promise;
        const itens: ItemProjeto[] = [];

        // Regex para capturar: Nome | 000x000x00 | Material | 0
        // Suporta espaços, pontos/vírgulas em dimensões e pipes
        const regexPromob = /(?<nome>[^|]+?)\s*\|\s*(?<l>\d+(?:[.,]\d+)?)\s*[xX*]\s*(?<a>\d+(?:[.,]\d+)?)\s*[xX*]\s*(?<e>\d+(?:[.,]\d+)?)\s*\|\s*(?<mat>[^|]+?)\s*\|\s*(?<qtd>\d+)/gi;

        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            
            // Unir strings da página preservando espaços para não quebrar o layout da "tabela"
            const pageText = textContent.items
                .map((item: any) => item.str)
                .join(' ');

            let match;
            while ((match = regexPromob.exec(pageText)) !== null) {
                if (!match.groups) continue;

                itens.push({
                    nome: match.groups.nome.trim(),
                    largura: parseFloat(match.groups.l.replace(',', '.')),
                    altura: parseFloat(match.groups.a.replace(',', '.')),
                    espessura: parseFloat(match.groups.e.replace(',', '.')),
                    material: match.groups.mat.trim(),
                    quantidade: parseInt(match.groups.qtd),
                    pagina: i
                });
            }
        }

        console.log(`[PDFParser] ${itens.length} itens extraídos do PDF.`);
        return itens;
    }
}
