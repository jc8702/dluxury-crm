/**
 * PARSER DE CSV
 * Importa lista de peças de planilha Excel/CSV
 *
 * Formato esperado (posicional):
 * sku,nome,largura_mm,altura_mm,quantidade,rotacionavel,fio_topo,fio_baixo,fio_esq,fio_dir
 *
 * Formato Plano de Corte (header-based, colunas em português):
 * Nº,Designação,Quantidade,Comprimento,Largura,Espessura,...,Nome do Material,Identificação,...
 */

export interface PecaCSV {
  sku?: string;
  nome: string;
  largura_mm: number;
  altura_mm: number;
  quantidade: number;
  rotacionavel: boolean;
  espessura_mm?: number;
  material?: string;
  identificador?: string;
  observacoes?: string;
  fio_de_fita?: {
    topo: boolean;
    baixo: boolean;
    esquerda: boolean;
    direita: boolean;
  };
}

export async function parseCSV(arquivo: File): Promise<PecaCSV[]> {
  const texto = await arquivo.text();
  const linhas = texto.split('\n').filter((l) => l.trim());

  if (linhas.length < 2) {
    throw new Error('CSV vazio ou sem dados');
  }

  // Ignorar cabeçalho
  const dadosLinhas = linhas.slice(1);

  const pecas: PecaCSV[] = [];

  dadosLinhas.forEach((linha, idx) => {
    const colunas = linha.split(',').map((c) => c.trim());

    if (colunas.length < 4) {
      console.warn(`Linha ${idx + 2} inválida: ${linha}`);
      return;
    }

    const [
      sku,
      nome,
      larguraStr,
      alturaStr,
      quantidadeStr,
      rotacionavelStr,
      fitoT,
      fitoB,
      fitoE,
      fitoD,
    ] = colunas;

    const largura = parseInt(larguraStr);
    const altura = parseInt(alturaStr);
    const quantidade = parseInt(quantidadeStr) || 1;

    if (isNaN(largura) || isNaN(altura)) {
      console.warn(`Linha ${idx + 2}: dimensões inválidas`);
      return;
    }

    const rotacionavel =
      rotacionavelStr?.toLowerCase() === 'sim' ||
      rotacionavelStr?.toLowerCase() === 'true' ||
      rotacionavelStr === '1';

    const fio_de_fita =
      fitoT === '1' ||
      fitoT?.toLowerCase() === 'sim' ||
      fitoB === '1' ||
      fitoB?.toLowerCase() === 'sim' ||
      fitoE === '1' ||
      fitoE?.toLowerCase() === 'sim' ||
      fitoD === '1' ||
      fitoD?.toLowerCase() === 'sim'
        ? {
            topo: fitoT === '1' || fitoT?.toLowerCase() === 'sim',
            baixo: fitoB === '1' || fitoB?.toLowerCase() === 'sim',
            esquerda: fitoE === '1' || fitoE?.toLowerCase() === 'sim',
            direita: fitoD === '1' || fitoD?.toLowerCase() === 'sim',
          }
        : undefined;

    pecas.push({
      sku: sku || undefined,
      nome: nome || `Peça ${idx + 1}`,
      largura_mm: largura,
      altura_mm: altura,
      quantidade,
      rotacionavel,
      fio_de_fita,
    });
  });

  return pecas;
}

function normalizarHeader(h: string): string {
  return h
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[-\s]+/g, '_')
    .replace(/[^a-zA-Z0-9_]/g, '')
    .toLowerCase()
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

const MAPA_HEADER: Record<
  string,
  | keyof PecaCSV
  | 'comprimento_borda_1'
  | 'comprimento_borda_2'
  | 'largura_borda_1'
  | 'largura_borda_2'
  | 'frente'
  | 'verso'
> = {
  no: 'sku',
  n: 'sku',
  designacao: 'nome',
  quantidade: 'quantidade',
  comprimento: 'largura_mm',
  largura: 'altura_mm',
  espessura: 'espessura_mm',
  nome_do_material: 'material',
  identificacao: 'identificador',
  descricao: 'observacoes',
  comprimento_da_borda_1: 'comprimento_borda_1',
  comprimento_da_borda_2: 'comprimento_borda_2',
  largura_da_borda_1: 'largura_borda_1',
  largura_da_borda_2: 'largura_borda_2',
  frente: 'frente',
  verso: 'verso',
};

export async function parsePlanoCorteCSV(arquivo: File): Promise<PecaCSV[]> {
  let texto = await arquivo.text();
  texto = texto.replace(/^\uFEFF/, '');
  const linhasBrutas = texto.split(/\r?\n/);
  const linhas = linhasBrutas.map((l) => l.trim()).filter((l) => l.length > 0);

  if (linhas.length < 2) {
    throw new Error('CSV vazio ou sem dados');
  }

  // Auto-detectar separador: ; tem prioridade se aparecer no header
  const primeiroCabecalho = linhas[0];
  const countPontoVirgula = (primeiroCabecalho.match(/;/g) || []).length;
  const countVirgula = (primeiroCabecalho.match(/,/g) || []).length;
  const separador = countPontoVirgula >= countVirgula ? ';' : ',';

  const cabecalhos = splitCSVLine(linhas[0], separador).map((c) => c.trim());

  const colunas = cabecalhos.map((h) => {
    const normalizado = normalizarHeader(h);
    return MAPA_HEADER[normalizado] || null;
  });

  const dadosLinhas = linhas.slice(1);
  const pecas: PecaCSV[] = [];

  function parseDim(val: string): number | null {
    const limpo = val
      .replace(/^"+|"+$/g, '')
      .replace(/\s*mm\s*$/i, '')
      .replace(',', '.')
      .trim();
    if (!limpo || limpo === '') return null;
    const n = parseFloat(limpo);
    return isNaN(n) ? null : n;
  }

  for (let i = 0; i < dadosLinhas.length; i++) {
    const valores = splitCSVLine(dadosLinhas[i], separador);

    const linha: Record<string, string> = {};
    colunas.forEach((campo, idx) => {
      if (campo && idx < valores.length) {
        linha[campo] = valores[idx].replace(/^"+|"+$/g, '').trim();
      }
    });

    const nome = linha['nome'] || '';
    const largura = parseDim(linha['largura_mm'] ?? '');
    const altura = parseDim(linha['altura_mm'] ?? '');

    if (largura === null || altura === null || largura <= 0 || altura <= 0) {
      console.warn(`Linha ${i + 2}: dimensões inválidas, ignorada`);
      continue;
    }

    const quantidade = parseInt(linha['quantidade']) || 1;

    const fio_de_fita: PecaCSV['fio_de_fita'] = {};
    const borda1C = parseDim(linha['comprimento_borda_1'] ?? '');
    const borda2C = parseDim(linha['comprimento_borda_2'] ?? '');
    const borda1L = parseDim(linha['largura_borda_1'] ?? '');
    const borda2L = parseDim(linha['largura_borda_2'] ?? '');
    const frente = (linha['frente'] || '').toLowerCase();
    const verso = (linha['verso'] || '').toLowerCase();

    if (
      (borda1C !== null && borda1C > 0) ||
      (borda2C !== null && borda2C > 0) ||
      (borda1L !== null && borda1L > 0) ||
      (borda2L !== null && borda2L > 0) ||
      frente ||
      verso
    ) {
      fio_de_fita.esquerda = borda1C !== null && borda1C > 0;
      fio_de_fita.direita = borda2C !== null && borda2C > 0;
      fio_de_fita.topo = borda1L !== null && borda1L > 0;
      fio_de_fita.baixo = borda2L !== null && borda2L > 0;

      if (frente === 'sim' || frente === '1' || frente === 'true') {
        fio_de_fita.topo = true;
        fio_de_fita.baixo = true;
        fio_de_fita.esquerda = true;
        fio_de_fita.direita = true;
      }
    }

    const espessura = parseDim(linha['espessura_mm'] ?? '');

    pecas.push({
      sku: linha['sku'] || undefined,
      nome: nome || `Peça ${i + 1}`,
      largura_mm: largura,
      altura_mm: altura,
      quantidade,
      rotacionavel: true,
      espessura_mm: espessura ?? undefined,
      material: linha['material'] || undefined,
      identificador: linha['identificador'] || undefined,
      observacoes: linha['observacoes'] || undefined,
      fio_de_fita: Object.keys(fio_de_fita).length > 0 ? fio_de_fita : undefined,
    });
  }

  if (pecas.length === 0) {
    throw new Error('Nenhuma peça válida encontrada no CSV');
  }

  return pecas;
}

function splitCSVLine(linha: string, separador: string = ','): string[] {
  const valores: string[] = [];
  let atual = '';
  let entreAspas = false;

  for (let i = 0; i < linha.length; i++) {
    const c = linha[i];
    if (c === '"') {
      entreAspas = !entreAspas;
    } else if (c === separador && !entreAspas) {
      valores.push(atual);
      atual = '';
    } else {
      atual += c;
    }
  }
  valores.push(atual);
  return valores;
}
