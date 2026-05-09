/**
 * CSVDetector - Detecta delimitadores e mapeia colunas de CSVs exportados por CADs
 */

export interface CSVMapping {
    nome: string | null;
    largura: string | null;
    altura: string | null;
    espessura: string | null;
    quantidade: string | null;
    material: string | null;
    sku: string | null;
}

export class CSVDetector {
    static detectDelimiter(sample: string): ',' | ';' {
        const commaCount = (sample.match(/,/g) || []).length;
        const semicolonCount = (sample.match(/;/g) || []).length;
        return semicolonCount > commaCount ? ';' : ',';
    }

    /**
     * Detecta se o CSV é do plugin CutList (SketchUp)
     */
    static isCutList(headers: string[], dataSample: any[]): boolean {
        const requiredHeaders = ['Comprimento', 'Largura', 'Fundo', 'Material'];
        const hasHeaders = requiredHeaders.every(h => headers.includes(h));
        
        if (!hasHeaders) return false;

        // Verifica se os valores têm sufixo "mm" (ex: "87000mm")
        const sampleRow = dataSample[0];
        if (!sampleRow) return false;

        const hasMMSuffix = ['Comprimento', 'Largura', 'Material'].some(h => 
            String(sampleRow[h]).toLowerCase().includes('mm')
        );

        return hasMMSuffix;
    }

    static mapColumns(headers: string[]): CSVMapping {
        const mapping: CSVMapping = {
            nome: null, largura: null, altura: null, espessura: null,
            quantidade: null, material: null, sku: null
        };

        const patterns = {
            nome: [/name/i, /component/i, /nome/i, /componente/i, /peça/i, /peca/i, /description/i, /descrição/i, /função/i, /funcao/i, /funo/i, /part/i, /desc/i],
            largura: [/length/i, /largura/i, /l$/i, /comprimento/i, /dim1/i, /comp/i, /lenght/i],
            altura: [/width/i, /altura/i, /w$/i, /profundidade/i, /dim2/i, /alt/i],
            espessura: [/thickness/i, /espessura/i, /e$/i, /depth/i, /dim3/i, /esp/i, /thick/i],
            quantidade: [/quantity/i, /quantidade/i, /qtd/i, /qty/i, /count/i, /quant/i],
            material: [/material/i, /acabamento/i, /finish/i, /textura/i, /wood/i, /mat/i],
            sku: [/sku/i, /code/i, /código/i, /codigo/i, /id/i, /part number/i]
        };

        headers.forEach(header => {
            const h = header.trim();
            for (const [key, regexes] of Object.entries(patterns)) {
                if (regexes.some(r => r.test(h)) && !mapping[key as keyof CSVMapping]) {
                    mapping[key as keyof CSVMapping] = h;
                }
            }
        });

        return mapping;
    }
}
