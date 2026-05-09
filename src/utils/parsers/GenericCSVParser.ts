import Papa from 'papaparse';
import { CSVDetector, type CSVMapping } from './CSVDetector.js';

export interface ComponenteImportado {
    nome: string;
    largura: number | null;
    altura: number | null;
    espessura: number | null;
    quantidade: number;
    material: string | null;
    sku_informado: string | null;
    sku_encontrado: string | null;
    produto_id: string | null;
    status: 'encontrado' | 'nao_encontrado' | 'manual';
    linha_original: number;
}

export class GenericCSVParser {
    static async parse(file: File): Promise<ComponenteImportado[]> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                let text = e.target?.result as string;
                
                // Se o texto contém o caractere de substituição (), provavelmente é encoding Latin1/Win1252
                if (text.includes('')) {
                    const secondReader = new FileReader();
                    secondReader.onload = (e2) => {
                        this.processText(e2.target?.result as string, resolve, reject, file);
                    };
                    secondReader.readAsText(file, 'ISO-8859-1');
                } else {
                    this.processText(text, resolve, reject, file);
                }
            };
            reader.readAsText(file, 'UTF-8');
        });
    }

    private static processText(text: string, resolve: any, reject: any, file: File) {
        const delimiter = CSVDetector.detectDelimiter(text.substring(0, 1000));
        
        Papa.parse(text, {
            delimiter,
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                const fields = (results.meta.fields || []).map(f => f.trim());
                const mapping = CSVDetector.mapColumns(fields);

                console.log('[CSVParser] Colunas detectadas:', fields);
                console.log('[CSVParser] Mapeamento:', mapping);

                // Fallback inteligente para o Nome (Função no SketchUp)
                if (!mapping.nome && fields.length > 0) {
                    mapping.nome = fields.find(f => {
                        const sample = String(results.data[0]?.[f] || '');
                        const isNumeric = !isNaN(parseFloat(sample.replace(/[^\d.,]/g, '').replace(',', '.')));
                        return !isNumeric && sample.length > 2;
                    }) || fields[0];
                }

                // Fallback para espessura se houver colunas numéricas sobrando
                if (!mapping.espessura && fields.length > 3) {
                    mapping.espessura = fields.find(f => 
                        f !== mapping.largura && f !== mapping.altura && f !== mapping.quantidade && 
                        !isNaN(parseFloat(String(results.data[0]?.[f]).replace(/[^\d.,]/g, '')))
                    ) || null;
                }

                const components = results.data.map((row: any, index) => 
                    this.normalizeRow(row, mapping, index + 1)
                ).filter(c => c.nome && c.nome !== 'undefined' && c.nome.length > 1);
                
                if (components.length === 0) {
                    console.warn('[CSVParser] Nenhum componente válido encontrado após o parse.');
                }

                resolve(components);
            },
            error: (err) => reject(err)
        });
    }

    private static normalizeRow(row: any, mapping: CSVMapping, line: number): ComponenteImportado {
        const getVal = (key: keyof CSVMapping) => mapping[key] ? row[mapping[key]!] : null;
        
        const parseDim = (val: any) => {
            if (!val) return null;
            const clean = String(val).replace(/[^\d.,]/g, '').replace(',', '.');
            return parseFloat(clean) || null;
        };

        return {
            nome: String(getVal('nome') || '').trim(),
            largura: parseDim(getVal('largura')),
            altura: parseDim(getVal('altura')),
            espessura: parseDim(getVal('espessura')),
            quantidade: parseInt(String(getVal('quantidade') || '1')) || 1,
            material: getVal('material') ? String(getVal('material')).trim() : null,
            sku_informado: getVal('sku') ? String(getVal('sku')).trim() : null,
            sku_encontrado: null,
            produto_id: null,
            status: 'nao_encontrado',
            linha_original: line
        };
    }
}
