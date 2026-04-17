import { sql } from '../api-lib/_db.js';

export interface ISKU {
  sku_id: string;
  categoria_id: string; // ex: 'CHP', 'BRD', 'FRG'
  familia_id?: string;
  subfamilia_id?: string;
  descricao: string;
  unidade: 'UN' | 'M2' | 'M' | 'RL' | 'KG' | 'CX';
  custo_medio: number;
  ativo?: boolean;
}

export async function createSKU(categoria_id: string): Promise<string> {
  const result = await sql`
    SELECT sku FROM materiais 
    WHERE categoria_id = ${categoria_id} 
    ORDER BY sku DESC 
    LIMIT 1
  `;
  let seq = 1;
  if (result && result.length > 0 && result[0].sku) {
    const lastSkuStr = result[0].sku.split('-')[1];
    if (lastSkuStr) {
      seq = parseInt(lastSkuStr, 10) + 1;
    }
  }
  return `${categoria_id}-${String(seq).padStart(4, '0')}`;
}

export async function existeSkuSimilar(descricao: string, categoria_id: string): Promise<boolean> {
  const result = await sql`
    SELECT id FROM materiais 
    WHERE categoria_id = ${categoria_id} 
    AND nome ILIKE ${descricao}
    LIMIT 1
  `;
  return result && result.length > 0;
}

const chapaSkus: Partial<ISKU>[] = [
  ...[6, 9, 12, 15, 18, 25].map(mm => ({ descricao: `MDF ${mm}mm Cru`, unidade: 'M2' as const, custo_medio: 45.0 })),
  ...[15, 18, 25].map(mm => ({ descricao: `MDF ${mm}mm Branco TX`, unidade: 'M2' as const, custo_medio: 75.0 })),
  ...[15, 18].map(mm => ({ descricao: `MDF ${mm}mm Preto TX`, unidade: 'M2' as const, custo_medio: 90.0 })),
  ...[15, 18].map(mm => ({ descricao: `MDF ${mm}mm Carvalho Hanover`, unidade: 'M2' as const, custo_medio: 110.0 })),
  ...[15, 18].map(mm => ({ descricao: `MDF ${mm}mm Freijó`, unidade: 'M2' as const, custo_medio: 115.0 })),
  ...[15, 18].map(mm => ({ descricao: `MDF ${mm}mm Cinza Sagrado`, unidade: 'M2' as const, custo_medio: 95.0 })),
  ...[15, 18].map(mm => ({ descricao: `MDP ${mm}mm Branco`, unidade: 'M2' as const, custo_medio: 65.0 })),
  { descricao: `HDF 3mm Branco Fundo`, unidade: 'M2' as const, custo_medio: 35.0 },
  { descricao: `HDF 3mm Madeirado Fundo`, unidade: 'M2' as const, custo_medio: 45.0 },
  { descricao: `Compensado Naval 15mm`, unidade: 'M2' as const, custo_medio: 120.0 },
  { descricao: `Compensado Naval 18mm`, unidade: 'M2' as const, custo_medio: 140.0 }
].map(s => ({ ...s, categoria_id: 'CHP' }));

const bordasSkus: Partial<ISKU>[] = [
  ...[22, 35, 45, 60].map(mm => ({ descricao: `Fita de Borda PVC Branca ${mm}mm`, unidade: 'M' as const, custo_medio: 1.5 })),
  ...[22, 35, 45, 60].map(mm => ({ descricao: `Fita de Borda PVC Preto TX ${mm}mm`, unidade: 'M' as const, custo_medio: 2.0 })),
  ...[22, 45].map(mm => ({ descricao: `Fita de Borda Carvalho Hanover ${mm}mm`, unidade: 'M' as const, custo_medio: 2.5 })),
  ...[22, 45].map(mm => ({ descricao: `Fita de Borda Freijó ${mm}mm`, unidade: 'M' as const, custo_medio: 2.5 })),
  ...[22, 45].map(mm => ({ descricao: `Fita de Borda Cinza Sagrado ${mm}mm`, unidade: 'M' as const, custo_medio: 2.2 })),
  { descricao: `Tapa Furo Adesivo Branco 13mm Cartela`, unidade: 'UN', custo_medio: 5.0 },
  { descricao: `Tapa Furo Adesivo Madeirado 13mm Cartela`, unidade: 'UN', custo_medio: 6.5 }
].map(s => ({ ...s, categoria_id: 'BRD' }));

const ferragensSkus: Partial<ISKU>[] = [
  { descricao: 'Dobradiça Caneco 35mm Reta com Amortecedor', unidade: 'UN', custo_medio: 8.5 },
  { descricao: 'Dobradiça Caneco 35mm Curva com Amortecedor', unidade: 'UN', custo_medio: 9.0 },
  { descricao: 'Dobradiça Caneco 35mm Super Curva com Amortecedor', unidade: 'UN', custo_medio: 10.5 },
  { descricao: 'Dobradiça Caneco 35mm Reta Sem Amortecedor', unidade: 'UN', custo_medio: 4.5 },
  { descricao: 'Dobradiça Caneco 35mm Curva Sem Amortecedor', unidade: 'UN', custo_medio: 5.0 },
  ...[250, 300, 350, 400, 450, 500, 550, 600].map(mm => ({ descricao: `Corrediça Telescópica Light Larga ${mm}mm Par`, unidade: 'UN' as const, custo_medio: (mm/10) * 0.8 })),
  ...[300, 350, 400, 450, 500].map(mm => ({ descricao: `Corrediça Oculta Extração Total com Amortecedor ${mm}mm Par`, unidade: 'UN' as const, custo_medio: (mm/10) * 2.5 })),
  ...[128, 160, 192, 256, 320].map(mm => ({ descricao: `Puxador Alumínio Alça ${mm}mm Inox`, unidade: 'UN' as const, custo_medio: (mm/10) * 1.2 })),
  { descricao: 'Perfil Puxador Cava RM-183 Barra 3m', unidade: 'UN', custo_medio: 45.0 },
  { descricao: 'Pistão a Gás 60N Inverso', unidade: 'UN', custo_medio: 12.0 },
  { descricao: 'Pistão a Gás 80N Inverso', unidade: 'UN', custo_medio: 12.0 },
  { descricao: 'Pistão a Gás 100N Inverso', unidade: 'UN', custo_medio: 12.0 },
  { descricao: 'Pistão a Gás 60N Tradicional', unidade: 'UN', custo_medio: 11.0 },
  { descricao: 'Pistão a Gás 80N Tradicional', unidade: 'UN', custo_medio: 11.0 },
  { descricao: 'Pistão a Gás 100N Tradicional', unidade: 'UN', custo_medio: 11.0 },
  { descricao: 'Suporte Prateleira Tucano Pequeno', unidade: 'UN', custo_medio: 3.5 },
  { descricao: 'Suporte Prateleira Cadeirinha de Aço', unidade: 'UN', custo_medio: 0.5 },
  { descricao: 'Cabideiro Tubo Metálico Oval Barra 3m', unidade: 'UN', custo_medio: 35.0 },
  { descricao: 'Flange Suporte Cabideiro Oval Metálica', unidade: 'UN', custo_medio: 1.5 },
  { descricao: 'Sistema de Porta de Correr RO-65 Kit Duplo', unidade: 'UN', custo_medio: 125.0 }
].map(s => ({ ...s, categoria_id: 'FRG' }));

const fixacaoSkus: Partial<ISKU>[] = [
  ...['3.5x14', '3.5x16', '3.5x22', '4.0x30', '4.0x40', '4.0x45', '4.0x50', '4.5x60', '5.0x60'].map(dim => ({ descricao: `Parafuso Chipboard Cabeça Chata ${dim} Zincado (Cento)`, unidade: 'CX' as const, custo_medio: 6.0 })),
  { descricao: 'Bucha de Fixação Nylon 6mm S/ Anel (Cento)', unidade: 'CX', custo_medio: 8.0 },
  { descricao: 'Bucha de Fixação Nylon 8mm S/ Anel (Cento)', unidade: 'CX', custo_medio: 12.0 },
  { descricao: 'Bucha de Fixação para Drywall (Cento)', unidade: 'CX', custo_medio: 25.0 },
  { descricao: 'Cavilha Madeira Estriada 6x30mm (Cento)', unidade: 'CX', custo_medio: 5.0 },
  { descricao: 'Cavilha Madeira Estriada 8x30mm (Cento)', unidade: 'CX', custo_medio: 6.5 },
  { descricao: 'Sistema Minifix Tambor 15mm (Cento)', unidade: 'CX', custo_medio: 45.0 },
  { descricao: 'Perno Minifix Haste 34mm (Cento)', unidade: 'CX', custo_medio: 35.0 },
  { descricao: 'Cantoneira Metálica 2 Furos Zicanda (Cento)', unidade: 'CX', custo_medio: 15.0 },
  { descricao: 'Prego de Aço sem Cabeça 10x10 (Kg)', unidade: 'KG', custo_medio: 22.0 },
  { descricao: 'Tapa Furo Adesivo Branco 13mm', unidade: 'UN', custo_medio: 0.1 }
].map(s => ({ ...s, categoria_id: 'FIX' }));

const insumosSkus: Partial<ISKU>[] = [
  { descricao: 'Cola Branca PVA Extra 1Kg', unidade: 'UN', custo_medio: 18.0 },
  { descricao: 'Cola de Contato Adesivo 2.8Kg', unidade: 'UN', custo_medio: 85.0 },
  { descricao: 'Cola de Contato Spray', unidade: 'UN', custo_medio: 35.0 },
  { descricao: 'Cola Hotmelt Granulada Transparente 1Kg', unidade: 'KG', custo_medio: 45.0 },
  { descricao: 'Cola Hotmelt Granulada Branca 1Kg', unidade: 'KG', custo_medio: 45.0 },
  { descricao: 'Silicone Acético Incolor Tubo 280g', unidade: 'UN', custo_medio: 15.0 },
  { descricao: 'Fita Crepe Uso Geral 18mmx50m', unidade: 'UN', custo_medio: 4.5 },
  { descricao: 'Fita Crepe Uso Tinta 24mmx50m', unidade: 'UN', custo_medio: 6.0 },
  ...[80, 100, 120, 150, 180, 220, 320].map(grao => ({ descricao: `Lixa para Madeira Grão ${grao}`, unidade: 'UN' as const, custo_medio: 1.5 })),
  { descricao: 'Espuma Expansiva de Poliuretano 500ml', unidade: 'UN', custo_medio: 22.0 },
  { descricao: 'Limpa Telas / Limpador de MDF 500ml', unidade: 'UN', custo_medio: 12.0 },
  { descricao: 'Estopa para Limpeza e Polimento 500g', unidade: 'UN', custo_medio: 8.0 }
].map(s => ({ ...s, categoria_id: 'INS' }));

const iluminacaoSkus: Partial<ISKU>[] = [
  ...[3000, 4000, 6000].map(k => ({ descricao: `Fita LED 120 Leds/m ${k}K 12V Rolo 5m`, unidade: 'RL' as const, custo_medio: 45.0 })),
  ...[3000, 4000].map(k => ({ descricao: `Fita LED Cob Contínua ${k}K 12V Rolo 5m`, unidade: 'RL' as const, custo_medio: 85.0 })),
  { descricao: 'Fonte Chaveada Slim 12V 5A 60W', unidade: 'UN', custo_medio: 35.0 },
  { descricao: 'Fonte Chaveada Slim 12V 10A 120W', unidade: 'UN', custo_medio: 55.0 },
  { descricao: 'Perfil de Alumínio Embutir para Fita LED c/ Difusor 2m', unidade: 'UN', custo_medio: 42.0 },
  { descricao: 'Perfil de Alumínio Sobrepor para Fita LED c/ Difusor 2m', unidade: 'UN', custo_medio: 38.0 },
  { descricao: 'Sensor de Presença Embutir Redondo', unidade: 'UN', custo_medio: 25.0 },
  { descricao: 'Sensor Interruptor Touch Dimmer Embutir', unidade: 'UN', custo_medio: 48.0 },
  { descricao: 'Cabo Paralelo 2x0.50mm Bicolor (Metro)', unidade: 'M', custo_medio: 1.2 }
].map(s => ({ ...s, categoria_id: 'ILU' }));

const acessoriosSkus: Partial<ISKU>[] = [
  { descricao: 'Porta Talheres Plástico Injetado Cinza (Modulo 400mm)', unidade: 'UN', custo_medio: 25.0 },
  { descricao: 'Porta Talheres Plástico Injetado Cinza (Modulo 600mm)', unidade: 'UN', custo_medio: 35.0 },
  { descricao: 'Lixeira Embutida Dupla Deslizante Aramada 2x15L', unidade: 'UN', custo_medio: 180.0 },
  { descricao: 'Lixeira Embutida Inox Basculante 12L', unidade: 'UN', custo_medio: 85.0 },
  { descricao: 'Porta Temperos Deslizante Aramado Cromado 150mm', unidade: 'UN', custo_medio: 120.0 },
  { descricao: 'Porta Panos Deslizante Aramado Triplo', unidade: 'UN', custo_medio: 85.0 },
  { descricao: 'Coluna Giratória Aramado Canto Reto', unidade: 'UN', custo_medio: 450.0 },
  { descricao: 'Calceiro Deslizante Aramado 12 Varetas', unidade: 'UN', custo_medio: 90.0 },
  { descricao: 'Tábua de Passar Deslizante Embutida Dobrável', unidade: 'UN', custo_medio: 220.0 }
].map(s => ({ ...s, categoria_id: 'ACS' }));

const estruturasSkus: Partial<ISKU>[] = [
  { descricao: 'Pé Regulável Plástico Base Larga 100mm', unidade: 'UN', custo_medio: 2.5 },
  { descricao: 'Pé Regulável Plástico Base Larga 150mm', unidade: 'UN', custo_medio: 3.5 },
  { descricao: 'Sapata Deslizante Prego Acrílica', unidade: 'UN', custo_medio: 0.2 },
  { descricao: 'Sapata Roscada Niveladora', unidade: 'UN', custo_medio: 0.8 },
  { descricao: 'Nivelador Metálico Para Roupeiro Base', unidade: 'UN', custo_medio: 4.5 },
  { descricao: 'Suporte Suspensório Armário Superior (Par)', unidade: 'UN', custo_medio: 15.0 },
  { descricao: 'Perfil Alumínio Estrutural Gola RM-115 Prata 3m', unidade: 'UN', custo_medio: 60.0 }
].map(s => ({ ...s, categoria_id: 'EST' }));

export const MOCK_SEED_DATA = [
  ...chapaSkus,
  ...bordasSkus,
  ...ferragensSkus,
  ...fixacaoSkus,
  ...insumosSkus,
  ...iluminacaoSkus,
  ...acessoriosSkus,
  ...estruturasSkus
];

export async function seedInitialSKUs() {
  console.log('Iniciando o cadastro massivo de SKUs de Marcenaria...');
  let inseridos = 0;
  let ignorados = 0;

  try {
    console.log('Aplicando migração do banco de dados (UUID para TEXT na categoria_id)...');
    await sql`ALTER TABLE materiais DROP CONSTRAINT IF EXISTS materiais_categoria_id_fkey`;
    await sql`ALTER TABLE materiais ALTER COLUMN categoria_id TYPE TEXT USING categoria_id::text`;
  } catch (e: any) {
    console.error('Falha na migração (talvez já seja texto ou erro de FK):', e.message);
  }

  for (const item of MOCK_SEED_DATA) {
    if (!item.descricao || !item.categoria_id) continue;
    
    const jaExiste = await existeSkuSimilar(item.descricao, item.categoria_id);
    if (jaExiste) {
      ignorados++;
      continue;
    }

    const sku_code = await createSKU(item.categoria_id);
    await sql`
      INSERT INTO materiais 
      (sku, nome, descricao, categoria_id, unidade_compra, unidade_uso, preco_custo, ativo)
      VALUES 
      (${sku_code}, ${item.descricao}, ${item.descricao}, ${item.categoria_id}, ${item.unidade}, ${item.unidade}, ${item.custo_medio}, true)
    `;
    inseridos++;
  }

  console.log(`Finalizado! Inseridos: ${inseridos} | Ignorados (duplicados): ${ignorados}`);
  return { inseridos, ignorados };
}

seedInitialSKUs().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });