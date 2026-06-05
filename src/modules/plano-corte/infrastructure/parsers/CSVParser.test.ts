import { describe, it, expect } from 'vitest';
import { parseCSV, parsePlanoCorteCSV } from './CSVParser.js';

function makeFile(content: string, name = 'test.csv'): File {
  return new File([content], name, { type: 'text/csv' });
}

describe('parseCSV - formato posicional', () => {
  it('deve fazer parse de CSV válido', async () => {
    const csv = 'sku,nome,largura_mm,altura_mm,quantidade,rotacionavel,fio_topo,fio_baixo,fio_esq,fio_dir\nCHP-1,Lateral,600,1800,2,sim,1,0,0,0\n';
    const file = makeFile(csv);
    const result = await parseCSV(file);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      sku: 'CHP-1',
      nome: 'Lateral',
      largura_mm: 600,
      altura_mm: 1800,
      quantidade: 2,
      rotacionavel: true,
    });
    expect(result[0].fio_de_fita?.topo).toBe(true);
  });

  it('deve aceitar rotacionavel = true/1/sim', async () => {
    const csv = 'sku,nome,largura_mm,altura_mm,quantidade,rotacionavel\nA,A,100,100,1,sim\n';
    const result = await parseCSV(makeFile(csv));
    expect(result[0].rotacionavel).toBe(true);

    const csv2 = 'sku,nome,largura_mm,altura_mm,quantidade,rotacionavel\nA,A,100,100,1,1\n';
    const result2 = await parseCSV(makeFile(csv2));
    expect(result2[0].rotacionavel).toBe(true);

    const csv3 = 'sku,nome,largura_mm,altura_mm,quantidade,rotacionavel\nA,A,100,100,1,nao\n';
    const result3 = await parseCSV(makeFile(csv3));
    expect(result3[0].rotacionavel).toBe(false);
  });

  it('deve ignorar linhas com menos de 4 colunas', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const csv = 'sku,nome,largura_mm,altura_mm,quantidade,rotacionavel\nINVALID_LINE\nCHP-1,Lateral,600,1800,1,sim\n';
    const result = await parseCSV(makeFile(csv));
    expect(result).toHaveLength(1);
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('deve ignorar linhas com dimensões inválidas (NaN)', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const csv = 'sku,nome,largura_mm,altura_mm,quantidade,rotacionavel\nCHP-1,Lateral,abc,xyz,1,sim\nCHP-2,OK,100,100,1,sim\n';
    const result = await parseCSV(makeFile(csv));
    expect(result).toHaveLength(1);
    expect(result[0].sku).toBe('CHP-2');
    warnSpy.mockRestore();
  });

  it('deve usar "Peça N" como nome quando nome vazio', async () => {
    const csv = 'sku,nome,largura_mm,altura_mm,quantidade,rotacionavel\n, ,100,100,1,sim\n';
    const result = await parseCSV(makeFile(csv));
    expect(result[0].nome).toMatch(/Peça 1/);
  });

  it('deve lançar erro se CSV vazio ou com menos de 2 linhas', async () => {
    await expect(parseCSV(makeFile(''))).rejects.toThrow('CSV vazio');
    await expect(parseCSV(makeFile('header_only'))).rejects.toThrow('CSV vazio');
  });

  it('deve aceitar quantidade ausente (default 1)', async () => {
    const csv = 'sku,nome,largura_mm,altura_mm,quantidade,rotacionavel\nA,A,100,100,,sim\n';
    const result = await parseCSV(makeFile(csv));
    expect(result[0].quantidade).toBe(1);
  });

  it('deve mapear fio de fita em todas as posições', async () => {
    const csv = 'sku,nome,largura_mm,altura_mm,quantidade,rotacionavel,fio_topo,fio_baixo,fio_esq,fio_dir\nA,A,100,100,1,sim,1,1,1,1\n';
    const result = await parseCSV(makeFile(csv));
    expect(result[0].fio_de_fita).toEqual({
      topo: true, baixo: true, esquerda: true, direita: true,
    });
  });
});

describe('parsePlanoCorteCSV - formato header-based', () => {
  it('deve fazer parse de CSV com header em português', async () => {
    const csv = 'Nº;Designação;Quantidade;Comprimento;Largura;Espessura;Nome do Material;Identificação\n1;Lateral;2;600;1800;15;MDF Branco;CHP-001\n';
    const file = makeFile(csv);
    const result = await parsePlanoCorteCSV(file);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      nome: 'Lateral',
      quantidade: 2,
      largura_mm: 600,
      altura_mm: 1800,
      espessura_mm: 15,
      material: 'MDF Branco',
      identificador: 'CHP-001',
    });
  });

  it('deve detectar separador ; automaticamente', async () => {
    const csv = 'Nº;Designação;Comprimento;Largura\n1;P1;600;1800\n';
    const result = await parsePlanoCorteCSV(makeFile(csv));
    expect(result).toHaveLength(1);
    expect(result[0].largura_mm).toBe(600);
  });

  it('deve detectar separador , automaticamente', async () => {
    const csv = 'Nº,Designação,Comprimento,Largura\n1,P1,600,1800\n';
    const result = await parsePlanoCorteCSV(makeFile(csv));
    expect(result).toHaveLength(1);
  });

  it('deve remover BOM do início do arquivo', async () => {
    const csv = '\uFEFFNº,Designação,Comprimento,Largura\n1,P1,600,1800\n';
    const result = await parsePlanoCorteCSV(makeFile(csv));
    expect(result).toHaveLength(1);
  });

  it('deve parsear dimensões com sufixo "mm"', async () => {
    const csv = 'Nº,Designação,Comprimento,Largura\n1,P1,"600 mm","1800 mm"\n';
    const result = await parsePlanoCorteCSV(makeFile(csv));
    expect(result[0].largura_mm).toBe(600);
    expect(result[0].altura_mm).toBe(1800);
  });

  it('deve parsear dimensões com vírgula decimal (pt-BR)', async () => {
    const csv = 'Nº,Designação,Comprimento,Largura\n1,P1,"600,5","1800,0"\n';
    const result = await parsePlanoCorteCSV(makeFile(csv));
    expect(result[0].largura_mm).toBe(600.5);
  });

  it('deve ignorar linhas com dimensões inválidas', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const csv = 'Nº,Designação,Comprimento,Largura\n1,P1,abc,xyz\n2,P2,100,100\n';
    const result = await parsePlanoCorteCSV(makeFile(csv));
    expect(result).toHaveLength(1);
    expect(result[0].nome).toBe('P2');
    warnSpy.mockRestore();
  });

  it('deve aplicar "frente = sim" como fita em todos os lados', async () => {
    const csv = 'Nº,Designação,Comprimento,Largura,Frente\n1,P1,600,1800,sim\n';
    const result = await parsePlanoCorteCSV(makeFile(csv));
    expect(result[0].fio_de_fita).toEqual({
      topo: true, baixo: true, esquerda: true, direita: true,
    });
  });

  it('deve aplicar "frente = 1" como fita em todos os lados', async () => {
    const csv = 'Nº,Designação,Comprimento,Largura,Frente\n1,P1,600,1800,1\n';
    const result = await parsePlanoCorteCSV(makeFile(csv));
    expect(result[0].fio_de_fita?.topo).toBe(true);
  });

  it('deve aplicar bordas individuais (comprimento_borda_1)', async () => {
    const csv = 'Nº,Designação,Comprimento,Largura,Comprimento da Borda 1,Largura da Borda 1\n1,P1,600,1800,2.0,0\n';
    const result = await parsePlanoCorteCSV(makeFile(csv));
    expect(result[0].fio_de_fita?.esquerda).toBe(true);
    expect(result[0].fio_de_fita?.topo).toBe(false);
  });

  it('deve lançar erro se CSV vazio', async () => {
    await expect(parsePlanoCorteCSV(makeFile(''))).rejects.toThrow('CSV vazio');
  });

  it('deve lançar erro se nenhuma peça válida encontrada', async () => {
    const csv = 'Nº,Designação,Comprimento,Largura\n1,P1,abc,xyz\n';
    await expect(parsePlanoCorteCSV(makeFile(csv))).rejects.toThrow('Nenhuma peça válida');
  });

  it('deve ignorar colunas desconhecidas (MAPA_HEADER fallback)', async () => {
    const csv = 'Nº,Designação,Comprimento,Largura,CustomColumn,OutraColuna\n1,P1,600,1800,foo,bar\n';
    const result = await parsePlanoCorteCSV(makeFile(csv));
    expect(result).toHaveLength(1);
  });

  it('deve aceitar linha sem quantidade (default 1)', async () => {
    const csv = 'Nº,Designação,Comprimento,Largura,Quantidade\n1,P1,600,1800,\n';
    const result = await parsePlanoCorteCSV(makeFile(csv));
    expect(result[0].quantidade).toBe(1);
  });

  it('deve usar "Peça N" como fallback de nome', async () => {
    const csv = 'Nº,Comprimento,Largura\n,600,1800\n';
    const result = await parsePlanoCorteCSV(makeFile(csv));
    expect(result[0].nome).toMatch(/Peça 1/);
  });
});
