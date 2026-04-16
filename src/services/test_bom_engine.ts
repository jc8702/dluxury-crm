import { BOMEngine } from './bomEngine.ts';
import type { BOMItem } from './bomEngine.ts';

const mockParams = {
  l: 1200,   // Largura em mm
  a: 700,    // Altura em mm
  p: 350,    // Profundidade em mm
  gavetas: 3
};

const mockBOM: BOMItem[] = [
  {
    id: '1',
    sku_id: 'mdf-15-branco',
    componente_nome: 'Painel Lateral',
    tipo_regra: 'AREA',
    formula_quantidade: '', // AREA ignora esta formula se pré-definida no motor
    formula_perda: '1.15' // 15% de perda
  },
  {
    id: '2',
    sku_id: 'dobradica-fgv',
    componente_nome: 'Dobradiça Reta',
    tipo_regra: 'FIXO',
    formula_quantidade: '4', // 4 unidades fixas
    formula_perda: '1' 
  },
  {
    id: '3',
    sku_id: 'parafuso-35x40',
    componente_nome: 'Parafuso Montagem',
    tipo_regra: 'PARAMETRICO',
    formula_quantidade: 'gavetas * 8', // 8 parafusos por gaveta
    formula_perda: '1.05'
  }
];

function test() {
  console.log('--- TESTANDO MOTOR DE CÁLCULO BOM ---');
  const results = BOMEngine.calculate(mockParams, mockBOM);
  
  results.forEach(res => {
    console.log(`Item: ${res.nome}`);
    console.log(`  Líquido: ${res.quantidade_liquida}`);
    console.log(`  Com Perda/Arred.: ${res.quantidade_com_perda}`);
    console.log('---------------------------');
  });
}

test();
