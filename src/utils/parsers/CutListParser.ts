import Papa from 'papaparse';
import { ComponenteImportado } from './GenericCSVParser';

/**
 * CutListParser - Parser específico para CSVs exportados pelo plugin CutList (SketchUp)
 * 
 * Peculiaridades:
 * - Dimensões em décimos de milímetro (ex: 87000mm = 870mm)
 * - Coluna "Fundo" contém o nome da peça
 * - Coluna "Material" contém a espessura (ex: 15.00mm)
 */

export class CutListParser {
  /**
   * Converte dimensões do CutList (décimos de mm) para mm reais
   * Input: "87000mm" -> Output: 870
   */
  static parseSketchUpDimension(valor: string): number {
    if (!valor) return 0;
    const clean = valor.replace('mm', '').replace(',', '.').trim();
    const num = parseFloat(clean);
    
    if (isNaN(num)) return 0;
    
    // Conforme exemplo: 87000mm -> 870mm (divisão por 100)
    return num / 100;
  }

  /**
   * Extrai a espessura da coluna Material
   * Input: "15.00mm" -> Output: 15
   */
  static parseEspessura(valor: string): number {
    if (!valor) return 0;
    const clean = valor.replace('mm', '').replace(',', '.').trim();
    return parseFloat(clean) || 0;
  }

  static async parse(file: File): Promise<ComponenteImportado[]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        const text = e.target?.result as string;
        
        // Detectar delimitador
        const delimiter = text.includes(';') ? ';' : ',';

        Papa.parse(text, {
          delimiter,
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            const components: ComponenteImportado[] = results.data.map((row: any, index) => {
              const largura = this.parseSketchUpDimension(row['Comprimento']);
              const altura = this.parseSketchUpDimension(row['Largura']);
              const espessura = this.parseEspessura(row['Material']);
              const quantidade = parseInt(row['Quantidade']) || 1;
              const nome = row['Fundo']?.trim() || `Peça sem nome (linha ${index + 1})`;

              // Validações de escala (warnings)
              if (largura > 0 && (largura < 10 || largura > 10000)) {
                console.warn(`[CutListParser] Possível erro de escala na largura: ${largura}mm na linha ${index + 1}`);
              }

              return {
                nome,
                largura,
                altura,
                espessura,
                quantidade,
                material: null,
                sku_informado: null,
                sku_encontrado: null,
                produto_id: null,
                status: 'manual',
                linha_original: index + 1
              };
            });

            resolve(components);
          },
          error: (err) => reject(err)
        });
      };

      // Tenta ler como UTF-8, se falhar ou tiver caracteres estranhos, o ImportarCSV lidará com a detecção de encoding
      reader.readAsText(file);
    });
  }
}
