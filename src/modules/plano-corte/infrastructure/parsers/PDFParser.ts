import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

// Configuração do Worker (Vite compatível)
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

export interface PecaExtraida {
  nome: string;
  largura: number;
  altura: number;
  quantidade: number;
}

export interface ChapaExtraida {
  material: string;
  sku_original?: string;
  espessura: number;
  largura: number;
  altura: number;
  pecas: PecaExtraida[];
}

export class PDFParser {
  async parsearArquivo(file: File): Promise<ChapaExtraida[]> {
    const texto = await this.extrairTexto(file);
    return this.extrairDados(texto);
  }

  private async extrairTexto(file: File): Promise<string> {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({ 
        data: arrayBuffer,
        useWorkerFetch: true,
        isEvalSupported: false 
      });
      const pdf = await loadingTask.promise;
      let fullText = '';

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item: any) => item.str).join(' ');
        fullText += pageText + '\n';
      }

      return fullText;
    } catch (err) {
      console.error('[PDFParser] Erro na extração de texto:', err);
      throw new Error('Não foi possível ler o texto do PDF. O arquivo pode estar protegido ou corrompido.');
    }
  }

  private extrairDados(texto: string): ChapaExtraida[] {
    const chapas: ChapaExtraida[] = [];
    console.log('[PDFParser] Iniciando extração de dados do texto (comprimento:', texto.length, ')');
    
    // Regex ultra-flexível para materiais
    // Padrão: (Nome Material) ... (Espessura) [MM] ... (Largura) x (Altura)
    const materialRegex = /([A-ZÀ-Ú0-9\s._-]+?)\s+(\d{1,2})\s*(?:MM)?\s+.*?(\d{3,4})\s*[\sxX* ]+\s*(\d{3,4})/gi;
    
    let match;
    const blocos: { index: number, info: any }[] = [];
    
    // Normalizar texto: remove excesso de espaços e quebras, mas mantém fôlego para tabelas
    const textoNormalizado = texto.replace(/\s{2,}/g, ' ').replace(/\n/g, ' ');

    while ((match = materialRegex.exec(textoNormalizado)) !== null) {
      const materialNome = match[1].trim();
      if (/^\d+$/.test(materialNome) || materialNome.length < 3) continue;

      blocos.push({
        index: match.index,
        info: {
          material: materialNome.toUpperCase(),
          espessura: parseInt(match[2]),
          largura: parseInt(match[3]),
          altura: parseInt(match[4])
        }
      });
    }

    if (blocos.length === 0) {
      console.warn('[PDFParser] Fallback: Detectando dimensões soltas...');
      const fallbackRegex = /(\d{4})\s*[\sxX* ]+\s*(\d{4})/g;
      let fMatch;
      while ((fMatch = fallbackRegex.exec(textoNormalizado)) !== null) {
         const snippet = textoNormalizado.substring(Math.max(0, fMatch.index - 40), fMatch.index);
         const materialProvavel = snippet.split(' ').filter(s => s.length > 2).pop() || 'MATERIAL';

         blocos.push({
          index: fMatch.index,
          info: {
            material: materialProvavel.toUpperCase(),
            espessura: 18,
            largura: parseInt(fMatch[1]),
            altura: parseInt(fMatch[2])
          }
         });
      }
    }

    if (blocos.length === 0) {
       throw new Error('Não foi possível identificar materiais. O PDF deve conter dimensões (ex: 2750x1840).');
    }

    for (let i = 0; i < blocos.length; i++) {
      const inicio = blocos[i].index;
      const fim = blocos[i+1] ? blocos[i+1].index : textoNormalizado.length;
      const textoBloco = textoNormalizado.substring(inicio, fim);
      
      const pecas: PecaExtraida[] = [];
      // Regex de Peças: Nome (com acentos) | Medida | Medida | Qtd
      const pecaRegex = /([A-ZÀ-Ú0-9\s._-]+?)\s+(\d{2,4})\s*[\sxX* ]+\s*(\d{2,4})(?:\s*(?:[\s(]*(\d+)[\s)]*|QTD:\s*(\d+)))?/gi;
      
      let pMatch;
      while ((pMatch = pecaRegex.exec(textoBloco)) !== null) {
        let nomeRaw = pMatch[1].trim();
        
        if (nomeRaw.toUpperCase().includes(blocos[i].info.material) || /^\d+$/.test(nomeRaw) || nomeRaw.length < 2) continue;

        // Limpeza inteligente: pega apenas o final do nome se for um snippet de tabela
        const palavras = nomeRaw.split(' ');
        const nome = palavras.slice(-3).join(' ').toUpperCase();

        const qtd = parseInt(pMatch[4] || pMatch[5] || '1');

        pecas.push({
          nome: nome || 'PEÇA',
          largura: parseInt(pMatch[2]),
          altura: parseInt(pMatch[3]),
          quantidade: qtd
        });
      }

      if (pecas.length > 0) {
        chapas.push({
          ...blocos[i].info,
          pecas
        });
      }
    }

    if (chapas.length === 0) {
      throw new Error('Materiais encontrados, mas nenhuma lista de peças detectada abaixo deles.');
    }

    return chapas;
  }
}
