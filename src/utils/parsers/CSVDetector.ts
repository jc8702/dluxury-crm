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
        // Headers comuns do CutList (PT e EN)
        const cutListHeaders = [
            'Comprimento', 'Largura', 'Fundo', 'Material', 'Quantidade',
            'Length', 'Width', 'Description', 'Quantity'
        ];
        
        const matchingHeaders = headers.filter(h => cutListHeaders.includes(h));
        
        // Se tiver pelo menos 3 headers característicos, é provável que seja CutList
        if (matchingHeaders.length < 3) return false;
        
        // Verifica se os valores têm sufixo "mm" OU se são números muito grandes (décimos de mm)
        const sampleRow = dataSample[0];
        if (!sampleRow) return false;

        const hasMMSuffix = headers.some(h => 
            String(sampleRow[h]).toLowerCase().includes('mm')
        );

        const hasHugeNumbers = ['Comprimento', 'Largura', 'Length', 'Width'].some(h => {
            const val = parseFloat(String(sampleRow[h]).replace(/[^\d.,]/g, ''));
            return val > 10000; // Valores em décimos de mm são geralmente > 10000 para peças > 10cm
        });

        return hasMMSuffix || hasHugeNumbers;
    }

    static mapColumns(headers: string[]): CSVMapping {
        const mapping: CSVMapping = {
            nome: null, largura: null, altura: null, espessura: null,
            quantidade: null, material: null, sku: null
        };

        // Sanitização agressiva para encodings corrompidos (UTF-8 lido como ISO-8859-1)
        const sanitizedHeaders = headers.map(h => 
            String(h)
                .replace(/A§A£o/g, 'ão')
                .replace(/A§A£/g, 'ã')
                .replace(/Aª/g, 'ê')
                .replace(/A¡/g, 'á')
                .replace(/A©/g, 'é')
                .replace(/A\*/g, 'í')
                .replace(/A³/g, 'ó')
                .trim()
        );

        const patterns = {
            nome: [/designação/i, /designacao/i, /designaA§A£o/i, /^nome$/i, /component/i, /^peça$/i, /^peca$/i, /^description$/i, /^descrição$/i, /^descriA§A£o$/i, /^função$/i, /^part$/i],
            largura: [/^comprimento$/i, /^length$/i, /^largura$/i, /^l$/i, /^dim1$/i, /^comp$/i],
            altura: [/^largura$/i, /^width$/i, /^altura$/i, /^w$/i, /^profundidade$/i, /^dim2$/i, /^alt$/i],
            espessura: [/^espessura$/i, /^thickness$/i, /^e$/i, /^depth$/i, /^dim3$/i, /^esp$/i],
            quantidade: [/^quantidade$/i, /^quantity$/i, /^qtd$/i, /^qty$/i, /^count$/i],
            material: [/descrição do material/i, /descricao do material/i, /descriA§A£o do material/i, /^material$/i, /^acabamento$/i, /^finish$/i, /^wood$/i],
            sku: [/^sku$/i, /^code$/i, /^código$/i, /^codigo$/i, /^id$/i, /part number/i]
        };

        sanitizedHeaders.forEach((header, index) => {
            Object.keys(patterns).forEach(key => {
                const patternList = patterns[key as keyof typeof patterns];
                if (patternList.some(p => p.test(header))) {
                    mapping[key as keyof typeof mapping] = headers[index]; // Mantém o nome original para o parser buscar no objeto
                }
            });
        });

        return mapping;
    }
}
