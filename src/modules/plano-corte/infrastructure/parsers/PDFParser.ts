import * as pdfjsLib from 'pdfjs-dist';

// O worker deve ser configurado no lado do cliente (Vite)
// Geralmente feito no ponto de entrada ou aqui mesmo se for compatível
if (typeof window !== 'undefined' && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
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
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    let fullText = '';

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item: any) => item.str).join(' ');
      fullText += pageText + '\n';
    }

    return fullText;
  }

  private extrairDados(texto: string): ChapaExtraida[] {
    const chapas: ChapaExtraida[] = [];
    
    // Este parser é otimizado para o padrão comum de exportação de sistemas CAD/CAM
    // Procura por blocos de materiais e suas respectivas peças
    
    // 1. Identificar blocos de materiais (ex: "MDF BRANCO 18MM 2750x1840")
    // Regex sugerida: Material + Espessura + Dimensões
    const materialRegex = /([A-Z0-9\s-]+)\s+(\d+)\s*MM\s+(\d+)\s*[xX*]\s*(\d+)/gi;
    
    let match;
    const blocos: { texto: string, info: any }[] = [];
    
    while ((match = materialRegex.exec(texto)) !== null) {
      blocos.push({
        info: {
          material: match[1].trim(),
          espessura: parseInt(match[2]),
          largura: parseInt(match[3]),
          altura: parseInt(match[4])
        },
        texto: texto.substring(match.index) // Pegar o texto a partir deste material
      });
    }

    // 2. Para cada bloco, extrair peças até o próximo material
    for (let i = 0; i < blocos.length; i++) {
      const fimBloco = blocos[i+1] ? texto.indexOf(blocos[i+1].info.material) : texto.length;
      const textoBloco = texto.substring(texto.indexOf(blocos[i].info.material), fimBloco);
      
      const pecas: PecaExtraida[] = [];
      // Regex para Peças: "Nome ou ID" + Dimensões (Largura x Altura) + Quantidade
      // Ex: "LATERAL ESQUERDA 700 x 500 (2)"
      const pecaRegex = /([A-Z0-9\s._-]+)\s+(\d+)\s*[xX*]\s*(\d+)\s*\((\d+)\)/gi;
      
      let pMatch;
      while ((pMatch = pecaRegex.exec(textoBloco)) !== null) {
        pecas.push({
          nome: pMatch[1].trim(),
          largura: parseInt(pMatch[2]),
          altura: parseInt(pMatch[3]),
          quantidade: parseInt(pMatch[4])
        });
      }

      if (pecas.length > 0) {
        chapas.push({
          ...blocos[i].info,
          pecas
        });
      }
    }

    // Se falhar o parsing por blocos, tenta um modo fallback (apenas lista de peças)
    if (chapas.length === 0) {
      console.warn('Falha no parsing estruturado. Tentando modo lista única.');
      // ... implementação simplificada ...
    }

    return chapas;
  }
}
