import * as pdfjsLib from 'pdfjs-dist';
import type { ParsedCNPJ } from './types';

// Use Vite's asset URL loading for the worker file to avoid CORS/Dynamic Import issues.
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

/**
 * Lógica central de extração de campos via Regex a partir de texto puro
 */
export const parseFieldsFromText = (fullText: string): ParsedCNPJ => {
  // Pre-processamento: remover espaços múltiplos e normalizar
  let text = fullText.replace(/\s+/g, ' ');
  
  // OCR Fixes: Comum trocar 0 por O e vice-versa em CNPJ/Datas
  text = text.replace(/([0-9])O/g, '$10').replace(/O([0-9])/g, '0$1');

  const extraction: ParsedCNPJ = {};

  // 1. EXTRAÇÃO DE CNPJ (Mais agressiva)
  // Procure por 14 dígitos ou dígitos com separadores comuns, permitindo erros de OCR (O/0)
  const cnpjRegex = /([\dO0]{2})[\s.]*([\dO0]{3})[\s.]*([\dO0]{3})[\s/]*([\dO0]{4})[\s-]*([\dO0]{2})/;
  const cnpjMatch = text.match(cnpjRegex);
  if (cnpjMatch) {
    const rawCnpj = `${cnpjMatch[1]}${cnpjMatch[2]}${cnpjMatch[3]}${cnpjMatch[4]}${cnpjMatch[5]}`.replace(/O/g, '0');
    extraction.cnpj = rawCnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
  }

  // 2. DATA DE ABERTURA
  const dateMatch = text.match(/(\d{2}\/\d{2}\/\d{4})/);
  if (dateMatch) extraction.dataAbertura = dateMatch[1];

  // 3. FUNÇÃO AUXILIAR DE BUSCA FUZZY
  const fuzzyFind = (keywords: string[], endKeywords: string[]) => {
    // Mesclar keywords e endKeywords com variações comuns de OCR
    const allLabels = ['NÚMERO', 'NUMERO', 'NOVERO', 'CEP', 'BAIRRO', 'MUNICÍPIO', 'MUNICIPIO', 'UF', 'EMAIL', 'TELEFONE', 'TÍTULO', 'NOME', 'CÓDIGO', 'LOGRADOURO', 'COMPLEMENTO'];
    
    // Tenta encontrar a primeira keyword e capturar até a primeira endKeyword ou qualquer rótulo conhecido
    const pattern = new RegExp(`(?:${keywords.join('|')})[\\s:]+(.*?)(?=\\s+(?:${[...endKeywords, ...allLabels].join('|')})|$)`, 'i');
    const match = text.match(pattern);
    
    if (!match) return undefined;
    
    let value = match[1].trim();
    // Limpeza extra: se o valor for muito longo ou contiver etiquetas conhecidas, cortar
    allLabels.forEach(label => {
      const labelIndex = value.toUpperCase().indexOf(label);
      if (labelIndex !== -1) {
        value = value.substring(0, labelIndex).trim();
      }
    });

    // Remover caracteres de "ruído" comuns no final do OCR (ex: -, _, .)
    return value.replace(/[—\-_.]+$/, '').trim();
  };

  // 4. RAZÃO SOCIAL
  extraction.razaoSocial = fuzzyFind(['NOME EMPRESARIAL', 'RAZÃO SOCIAL', 'EMPRESARIAL'], ['TÍTULO', 'NOME FANTASIA', 'CÓDIGO', 'LOGRADOURO', 'DATA']);

  // 5. NOME FANTASIA
  extraction.nomeFantasia = fuzzyFind(['TÍTULO DO ESTABELECIMENTO', 'NOME FANTASIA', 'FANTASIA'], ['CÓDIGO', 'LOGRADOURO', 'ATIVIDADE']);

  // 6. PORTE
  const porteMatch = text.match(/PORTE\s*:\s*(ME|EPP|DEMAIS)/i) || text.match(/(?:^|\s)(ME|EPP|DEMAIS)(?:\s|$)/i);
  extraction.porte = (porteMatch?.[1] as any) || 'ME';

  // 7. ENDEREÇO
  extraction.logradouro = fuzzyFind(['LOGRADOURO'], ['NÚMERO', 'NUMERO']);
  extraction.numero = fuzzyFind(['NÚMERO', 'NUMERO'], ['COMPLEMENTO', 'CEP']);
  extraction.complemento = fuzzyFind(['COMPLEMENTO'], ['CEP', 'BAIRRO']);
  
  const cepMatch = text.match(/CEP[\s:]*([\dO0.-]{8,11})/i);
  if (cepMatch) extraction.cep = cepMatch[1].replace(/O/g, '0');

  extraction.bairro = fuzzyFind(['BAIRRO', 'DISTRITO'], ['MUNICÍPIO', 'MUNICIPIO']);
  extraction.municipio = fuzzyFind(['MUNICÍPIO', 'MUNICIPIO'], ['UF']);
  
  const ufMatch = text.match(/UF[\s:]*([A-Z]{2})(?:\s|$)/i);
  extraction.uf = ufMatch ? ufMatch[1] : undefined;

  // 8. CONTATO
  extraction.email = text.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/i)?.[0];
  const telMatch = text.match(/TELEFONE[\s:]*(\(?\d{2,3}\)?\s*[\dO0-]{8,13})/i);
  if (telMatch) extraction.telefone = telMatch[1].replace(/O/g, '0');

  // 9. ATIVIDADE / NATUREZA
  extraction.naturezaJuridica = fuzzyFind(['NATUREZA JURÍDICA', 'NATUREZA'], ['LOGRADOURO', 'NÚMERO']);
  extraction.cnaePrincipal = fuzzyFind(['ECONÔMICA PRINCIPAL'], ['ATIVIDADES', 'CÓDIGO', 'LOGRADOURO']);

  return extraction;
};

/**
 * Lê um PDF e tenta extrair texto nativo. Se falhar em encontrar texto, retorna string vazia.
 */
export const parseCNPJFromPDF = async (file: File): Promise<{ data: ParsedCNPJ; rawText: string }> => {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  
  let fullText = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    
    const items = [...content.items] as any[];
    if (items.length === 0) continue;

    items.sort((a, b) => {
      if (Math.abs(b.transform[5] - a.transform[5]) > 5) {
        return b.transform[5] - a.transform[5];
      }
      return a.transform[4] - b.transform[4];
    });

    const strings = items.map((item: any) => item.str);
    fullText += strings.join(' ') + '\n';
  }

  if (!fullText.trim()) {
    return { data: {}, rawText: '' };
  }

  return { data: parseFieldsFromText(fullText), rawText: fullText };
};
