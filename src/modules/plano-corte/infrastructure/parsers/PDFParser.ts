import * as pdfjsLib from 'pdfjs-dist';

// Configuração do Worker para pdfjs-dist (Vite/Browser compatível)
if (typeof window !== 'undefined' && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
  const version = pdfjsLib.version || '5.7.284';
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${version}/build/pdf.worker.min.mjs`;
}

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
    
    // Regex mais flexível para materiais
    // Padrão: Nome Material ... Espessura MM ... Largura x Altura
    const materialRegex = /([A-Z0-9\s._-]+)\s+(\d+)\s*MM\s+.*?(\d{3,4})\s*[xX*]\s*(\d{3,4})/gi;
    
    let match;
    const blocos: { index: number, info: any }[] = [];
    
    while ((match = materialRegex.exec(texto)) !== null) {
      blocos.push({
        index: match.index,
        info: {
          material: match[1].trim().replace(/\n/g, ' '),
          espessura: parseInt(match[2]),
          largura: parseInt(match[3]),
          altura: parseInt(match[4])
        }
      });
    }

    console.log('[PDFParser] Materiais encontrados:', blocos.length);

    if (blocos.length === 0) {
      // Fallback: Tentar encontrar qualquer coisa que pareça uma chapa (ex: 2750x1840)
      const fallbackRegex = /(\d{4})\s*[xX*]\s*(\d{4})/g;
      const fMatch = fallbackRegex.exec(texto);
      if (fMatch) {
        blocos.push({
          index: 0,
          info: {
            material: 'MATERIAL EXTRAÍDO',
            espessura: 18,
            largura: parseInt(fMatch[1]),
            altura: parseInt(fMatch[2])
          }
        });
      }
    }

    for (let i = 0; i < blocos.length; i++) {
      const inicio = blocos[i].index;
      const fim = blocos[i+1] ? blocos[i+1].index : texto.length;
      const textoBloco = texto.substring(inicio, fim);
      
      const pecas: PecaExtraida[] = [];
      // Regex mais robusta para peças
      // Padrão: Nome ... Largura x Altura ... (Quantidade) ou Qtd: X
      const pecaRegex = /([A-Z0-9\s._-]+?)\s+(\d{2,4})\s*[xX*]\s*(\d{2,4})\s*[\s(]*(\d+)[\s)]*/gi;
      
      let pMatch;
      while ((pMatch = pecaRegex.exec(textoBloco)) !== null) {
        const nome = pMatch[1].trim().replace(/\n/g, ' ');
        if (nome === blocos[i].info.material) continue;

        pecas.push({
          nome: nome || 'PEÇA',
          largura: parseInt(pMatch[2]),
          altura: parseInt(pMatch[3]),
          quantidade: parseInt(pMatch[4])
        });
      }

      console.log(`[PDFParser] Peças no bloco ${i}:`, pecas.length);

      if (pecas.length > 0) {
        chapas.push({
          ...blocos[i].info,
          pecas
        });
      }
    }

    return chapas;
  }
}
