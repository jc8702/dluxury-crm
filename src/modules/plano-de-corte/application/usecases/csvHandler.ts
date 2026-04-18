import type { ChapaMaterial } from '../../domain/entities/CuttingPlan';

export function parseCSV(csvText: string): ChapaMaterial[] {
  const lines = csvText.split('\n').filter(l => l.trim() && !l.startsWith('sku_chapa'));
  const materiaisMap = new Map<string, ChapaMaterial>();

  lines.forEach(line => {
    const [sku_chapa, nome_chapa, altura_chapa, largura_chapa, espessura_chapa, nome_peca, largura_peca, altura_peca, quantidade] = line.split(',').map(s => s.trim());

    if (!materiaisMap.has(sku_chapa)) {
      materiaisMap.set(sku_chapa, {
        id: Math.random().toString(36).substr(2, 9),
        sku: sku_chapa,
        nome: nome_chapa,
        altura_mm: Number(altura_chapa),
        largura_mm: Number(largura_chapa),
        espessura_mm: Number(espessura_chapa),
        pecas: []
      });
    }

    const mat = materiaisMap.get(sku_chapa)!;
    mat.pecas.push({
      id: Math.random().toString(36).substr(2, 9),
      nome: nome_peca,
      largura_mm: Number(largura_peca),
      altura_mm: Number(altura_peca),
      quantidade: Number(quantidade),
      rotacionavel: true
    });
  });

  return Array.from(materiaisMap.values());
}

export function generateCSV(materiais: ChapaMaterial[]): string {
  let csv = 'sku_chapa,nome_chapa,altura_chapa,largura_chapa,espessura_chapa,nome_peca,largura_peca,altura_peca,quantidade\n';
  
  materiais.forEach(m => {
    m.pecas.forEach(p => {
      csv += `${m.sku},${m.nome},${m.altura_mm},${m.largura_mm},${m.espessura_mm},${p.nome},${p.largura_mm},${p.altura_mm},${p.quantidade}\n`;
    });
  });

  return csv;
}

export function downloadCSVTemplate() {
  const template = 'sku_chapa,nome_chapa,altura_chapa,largura_chapa,espessura_chapa,nome_peca,largura_peca,altura_peca,quantidade\nCHP-MDF-18,MDF 18mm Branco,1830,2750,18,Lateral Gaveta,340,325,2';
  const blob = new Blob([template], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.setAttribute('hidden', '');
  a.setAttribute('href', url);
  a.setAttribute('download', 'template_plano_corte.csv');
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
