import { PDFParser, ChapaExtraida } from './PDFParser';

export type SupportedFormat = 'pdf' | 'dxf' | 'dwf' | 'csv';

export interface ParserResult {
  chapas: ChapaExtraida[];
  confidence: number;
  format: SupportedFormat;
  rawText?: string;
}

export class DrawingParserFactory {
  static async parse(file: File): Promise<ParserResult> {
    const extension = file.name.split('.').pop()?.toLowerCase();
    
    switch (extension) {
      case 'pdf':
        const pdfParser = new PDFParser();
        const chapas = await pdfParser.parsearArquivo(file);
        return {
          chapas,
          confidence: 0.9, // PDF digital tem alta confiança
          format: 'pdf'
        };
      
      case 'dxf':
        // Placeholder para implementação futura ou integração com ezdxf/dxf-parser
        throw new Error('Suporte nativo a DXF em desenvolvimento. Por favor, exporte como PDF por enquanto.');
      
      case 'dwf':
        throw new Error('Suporte a DWF requer integração com Autodesk Cloud. Por favor, use PDF ou DXF.');

      default:
        throw new Error(`Formato .${extension} não suportado para importação automática.`);
    }
  }
}
