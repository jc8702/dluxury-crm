import { describe, it, expect } from 'vitest';
import { parsePlanoCorteCSV } from '../infrastructure/parsers/CSVParser';

const CSV_REAL = `N\u00ba;Designa\u00e7\u00e3o;Quantidade;Comprimento - Bruto;Largura - Bruta;Espessura - Bruta;Comprimento;Largura;Espessura;\u00c1rea - final;Tipo de Material;Nome do Material;Descri\u00e7\u00e3o do material;URL do material;Nomes de inst\u00e2ncia;Descri\u00e7\u00e3o;URL;Identifica\u00e7\u00e3o;Comprimento da Borda 1;Comprimento da Borda 2;Largura da Borda 1;Largura da Borda 2;Frente;Verso;Etiquetas
A;dinabox_conteiner_gaveta_corredica#19;1;500 mm;30 mm;13 mm;500 mm;30 mm;13 mm;"";Indefinido;Cor C07;"";"";"";"";"";"";"";"";"";"";"";"";Layer0
A;dinabox_corredica#19;3;500 mm;30 mm;13 mm;500 mm;30 mm;13 mm;"";Indefinido;acb2b4;"";"";"";"";"";"";"";"";"";"";"";"";Layer0
B;dinabox_corredica#20;2;500 mm;30 mm;13 mm;500 mm;30 mm;13 mm;"";Indefinido;acb2b4;"";"";"";"";"";"";"";"";"";"";"";"";Layer0
C;cormei#2;3;500 mm;25 mm;7 mm;500 mm;25 mm;7 mm;"";Indefinido;acb2b4;"";"";"";"";"";"";"";"";"";"";"";"";Layer0
E;dinabox_corredica#17;3;500 mm;17 mm;7 mm;500 mm;17 mm;7 mm;"";Indefinido;acb2b4;"";"";"";"";"";"";"";"";"";"";"";"";Layer0
A;mdf_h#567;3;408 mm;228 mm;18 mm;408 mm;228 mm;18 mm;"";Indefinido;DB1569958832;"";"";"";"";"";"";"";"";"";"";"";"";DB portas
A;dinabox_peca_tampa#37;1;690 mm;408 mm;18 mm;690 mm;408 mm;18 mm;"";Indefinido;DB1609847226;"";"";"";"";"";"";"";"";"";"";"";"";DB portas
B;dinabox_peca_prateleira#65;1;765 mm;544 mm;15 mm;765 mm;544 mm;15 mm;"";Indefinido;DB1609847226;"";"";"";"";"";"";"";"";"";"";"";"";DB caixas
`;

function csvFile(content: string): File {
  return new File([content], 'teste_opencutlist.csv', { type: 'text/csv' });
}

describe('parsePlanoCorteCSV (formato OpenCutList)', () => {
  it('deve extrair 8 pecas do CSV real', async () => {
    const pecas = await parsePlanoCorteCSV(csvFile(CSV_REAL));
    expect(pecas).toHaveLength(8);
  });

  it('deve extrair dimensoes corretas (sem sufixo mm)', async () => {
    const pecas = await parsePlanoCorteCSV(csvFile(CSV_REAL));
    expect(pecas[0].largura_mm).toBe(500);
    expect(pecas[0].altura_mm).toBe(30);
    expect(pecas[0].espessura_mm).toBe(13);
    expect(pecas[7].largura_mm).toBe(765);
    expect(pecas[7].altura_mm).toBe(544);
    expect(pecas[7].espessura_mm).toBe(15);
  });

  it('deve extrair quantidade correta', async () => {
    const pecas = await parsePlanoCorteCSV(csvFile(CSV_REAL));
    expect(pecas[0].quantidade).toBe(1);
    expect(pecas[1].quantidade).toBe(3);
    expect(pecas[2].quantidade).toBe(2);
  });

  it('deve extrair nome e material corretamente', async () => {
    const pecas = await parsePlanoCorteCSV(csvFile(CSV_REAL));
    expect(pecas[0].nome).toBe('dinabox_conteiner_gaveta_corredica#19');
    expect(pecas[0].material).toBe('Cor C07');
    expect(pecas[5].material).toBe('DB1569958832');
  });

  it('deve ignorar linhas com dimensoes zero', async () => {
    const csvComZero = `N\u00ba;Designa\u00e7\u00e3o;Quantidade;Comprimento - Bruto;Largura - Bruta;Espessura - Bruta;Comprimento;Largura;Espessura;\u00c1rea - final;Tipo de Material;Nome do Material;Descri\u00e7\u00e3o do material;URL do material;Nomes de inst\u00e2ncia;Descri\u00e7\u00e3o;URL;Identifica\u00e7\u00e3o;Comprimento da Borda 1;Comprimento da Borda 2;Largura da Borda 1;Largura da Borda 2;Frente;Verso;Etiquetas
A;test_zero;1;0 mm;0 mm;0 mm;0 mm;0 mm;0 mm;"";Indefinido;NONE;"";"";"";"";"";"";"";"";"";"";"";"";Layer0
A;test_valida;1;500 mm;30 mm;13 mm;500 mm;30 mm;13 mm;"";Indefinido;Cor C07;"";"";"";"";"";"";"";"";"";"";"";"";Layer0
`;
    const pecas = await parsePlanoCorteCSV(csvFile(csvComZero));
    expect(pecas).toHaveLength(1);
    expect(pecas[0].nome).toBe('test_valida');
  });
});
