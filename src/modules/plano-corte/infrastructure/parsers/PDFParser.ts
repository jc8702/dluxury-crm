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
    
    // Regex ultra-flexível para materiais
    // Padrão: (Nome Material) ... (Espessura) MM ... (Largura) x (Altura)
    // Suporta: "MDF BRANCO 18MM 2750x1840", "CHAPA MDF 15 MM - 2750 X 1830"
    const materialRegex = /([A-Z0-9\s._-]+?)\s+(\d{1,2})\s*MM\s+.*?(\d{3,4})\s*[\sxX*]+\s*(\d{3,4})/gi;
    
    let match;
    const blocos: { index: number, info: any }[] = [];
    
    while ((match = materialRegex.exec(texto)) !== null) {
      const materialNome = match[1].trim().replace(/\n/g, ' ');
      // Ignorar se o nome for apenas números (provavelmente não é um material)
      if (/^\d+$/.test(materialNome)) continue;

      blocos.push({
        index: match.index,
        info: {
          material: materialNome,
          espessura: parseInt(match[2]),
          largura: parseInt(match[3]),
          altura: parseInt(match[4])
        }
      });
    }

    console.log('[PDFParser] Potenciais materiais encontrados:', blocos.length);

    if (blocos.length === 0) {
      console.warn('[PDFParser] Nenhum material padrão encontrado. Tentando detecção de dimensões soltas...');
      // Fallback: Tentar encontrar qualquer coisa que pareça uma chapa (ex: 2750x1840 ou 2750 x 1840)
      const fallbackRegex = /(\d{4})\s*[\sxX*]+\s*(\d{4})/g;
      let fMatch;
      while ((fMatch = fallbackRegex.exec(texto)) !== null) {
         blocos.push({
          index: fMatch.index,
          info: {
            material: 'MATERIAL GENÉRICO',
            espessura: 18,
            largura: parseInt(fMatch[1]),
            altura: parseInt(fMatch[2])
          }
        });
      }
    }

    if (blocos.length === 0) {
       throw new Error('PDF sem tabelas de peças ou materiais detectadas. Certifique-se que o PDF contém dados de plano de corte legíveis.');
    }

    for (let i = 0; i < blocos.length; i++) {
      const inicio = blocos[i].index;
      const fim = blocos[i+1] ? blocos[i+1].index : texto.length;
      const textoBloco = texto.substring(inicio, fim);
      
      const pecas: PecaExtraida[] = [];
      // Regex para peças: Nome ... Largura x Altura ... Qtd
      // Suporta: "LATERAL 720x550 4", "BASE 600 X 550 (2)", "PRATELEIRA 567*530 QTD: 6"
      const pecaRegex = /([A-Z0-9\s._-]+?)\s+(\d{2,4})\s*[\sxX*]+\s*(\d{2,4})\s*(?:[\s(]*(\d+)[\s)]*|QTD:\s*(\d+))/gi;
      
      let pMatch;
      while ((pMatch = pecaRegex.exec(textoBloco)) !== null) {
        const nome = pMatch[1].trim().replace(/\n/g, ' ');
        // Evitar pegar o próprio material como peça
        if (nome === blocos[i].info.material || nome.length < 2) continue;

        const qtd = parseInt(pMatch[4] || pMatch[5] || '1');

        pecas.push({
          nome: nome || 'PEÇA',
          largura: parseInt(pMatch[2]),
          altura: parseInt(pMatch[3]),
          quantidade: qtd
        });
      }

      console.log(`[PDFParser] Peças extraídas para ${blocos[i].info.material}:`, pecas.length);

      if (pecas.length > 0) {
        chapas.push({
          ...blocos[i].info,
          pecas
        });
      }
    }

    if (chapas.length === 0) {
      throw new Error('Materiais identificados, mas nenhuma peça válida foi encontrada dentro de cada material.');
    }

    return chapas;
  }
}
