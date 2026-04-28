/**
 * PARSER DE CSV
 * Importa lista de peças de planilha Excel/CSV
 * 
 * Formato esperado:
 * nome,largura_mm,altura_mm,quantidade,rotacionavel,fio_topo,fio_baixo,fio_esq,fio_dir
 */

export interface PecaCSV {
  nome: string;
  largura_mm: number;
  altura_mm: number;
  quantidade: number;
  rotacionavel: boolean;
  fio_de_fita?: {
    topo: boolean;
    baixo: boolean;
    esquerda: boolean;
    direita: boolean;
  };
}

export async function parseCSV(arquivo: File): Promise<PecaCSV[]> {
  const texto = await arquivo.text();
  const linhas = texto.split('\n').filter(l => l.trim());

  if (linhas.length < 2) {
    throw new Error('CSV vazio ou sem dados');
  }

  // Ignorar cabeçalho
  const dadosLinhas = linhas.slice(1);

  const pecas: PecaCSV[] = [];

  dadosLinhas.forEach((linha, idx) => {
    const colunas = linha.split(',').map(c => c.trim());

    if (colunas.length < 4) {
      console.warn(`Linha ${idx + 2} inválida: ${linha}`);
      return;
    }

    const [nome, larguraStr, alturaStr, quantidadeStr, rotacionavelStr, fitoT, fitoB, fitoE, fitoD] = colunas;

    const largura = parseInt(larguraStr);
    const altura = parseInt(alturaStr);
    const quantidade = parseInt(quantidadeStr) || 1;

    if (isNaN(largura) || isNaN(altura)) {
      console.warn(`Linha ${idx + 2}: dimensões inválidas`);
      return;
    }

    const rotacionavel = rotacionavelStr?.toLowerCase() === 'sim' || 
                         rotacionavelStr?.toLowerCase() === 'true' ||
                         rotacionavelStr === '1';

    const fio_de_fita = (fitoT === '1' || fitoT?.toLowerCase() === 'sim' ||
                         fitoB === '1' || fitoB?.toLowerCase() === 'sim' ||
                         fitoE === '1' || fitoE?.toLowerCase() === 'sim' ||
                         fitoD === '1' || fitoD?.toLowerCase() === 'sim') ? {
      topo: fitoT === '1' || fitoT?.toLowerCase() === 'sim',
      baixo: fitoB === '1' || fitoB?.toLowerCase() === 'sim',
      esquerda: fitoE === '1' || fitoE?.toLowerCase() === 'sim',
      direita: fitoD === '1' || fitoD?.toLowerCase() === 'sim'
    } : undefined;

    pecas.push({
      nome: nome || `Peça ${idx + 1}`,
      largura_mm: largura,
      altura_mm: altura,
      quantidade,
      rotacionavel,
      fio_de_fita
    });
  });

  return pecas;
}
