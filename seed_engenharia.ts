import 'dotenv/config';
import { db } from './src/api-lib/drizzle-db.js';
import { 
    skuEngenharia, skuMontagem, skuComponente, 
    bomEngenhariaMontagem, bomMontagemComponente 
} from './src/db/schema/engenharia-orcamentos.js';

async function seed() {
    console.log('Seeding Real Engineering Data...');

    // 1. Componentes (Materiais)
    const [comp1] = await db.insert(skuComponente).values({
        codigo: 'MAT-MDF-18-BR',
        nome: 'MDF 18mm Branco Diamante',
        tipo: 'Chapa',
        unidadeMedida: 'M2',
        precoUnitario: '85.50',
        dimensoes: { espessura: 18 }
    }).onConflictDoNothing().returning();

    const [comp2] = await db.insert(skuComponente).values({
        codigo: 'MAT-MDF-06-BR',
        nome: 'MDF 06mm Branco (Fundo)',
        tipo: 'Chapa',
        unidadeMedida: 'M2',
        precoUnitario: '42.00',
        dimensoes: { espessura: 6 }
    }).onConflictDoNothing().returning();

    const [comp3] = await db.insert(skuComponente).values({
        codigo: 'FER-DOB-AMOR',
        nome: 'Dobradiça com Amortecedor 35mm',
        tipo: 'Ferragem',
        unidadeMedida: 'UN',
        precoUnitario: '12.80'
    }).onConflictDoNothing().returning();

    const [comp4] = await db.insert(skuComponente).values({
        codigo: 'FER-PUX-ALU',
        nome: 'Puxador Perfil Alumínio G',
        tipo: 'Ferragem',
        unidadeMedida: 'ML',
        precoUnitario: '45.00'
    }).onConflictDoNothing().returning();

    // 2. Montagens (Sub-conjuntos)
    const [mont1] = await db.insert(skuMontagem).values({
        codigo: 'MT-CAIXA-001',
        nome: 'Caixa de Armário Aéreo (Estrutura)',
        unidadeMedida: 'UN',
        tempoMontagemMin: 45,
        complexidade: 'Média'
    }).onConflictDoNothing().returning();

    const [mont2] = await db.insert(skuMontagem).values({
        codigo: 'MT-PORTA-001',
        nome: 'Kit Porta de Giro (Completo)',
        unidadeMedida: 'UN',
        tempoMontagemMin: 15,
        complexidade: 'Baixa'
    }).onConflictDoNothing().returning();

    // 3. BOM Montagens -> Componentes
    if (mont1 && comp1 && comp2) {
        await db.insert(bomMontagemComponente).values([
            { skuMontagemId: mont1.id, skuComponenteId: comp1.id, quantidade: '2.4', perdaPercentual: '10.00' }, 
            { skuMontagemId: mont1.id, skuComponenteId: comp2.id, quantidade: '0.6', perdaPercentual: '5.00' },
        ]);
    }

    if (mont2 && comp1 && comp3 && comp4) {
        await db.insert(bomMontagemComponente).values([
            { skuMontagemId: mont2.id, skuComponenteId: comp1.id, quantidade: '0.5', perdaPercentual: '15.00' }, 
            { skuMontagemId: mont2.id, skuComponenteId: comp3.id, quantidade: '2.0', perdaPercentual: '0.00' },
            { skuMontagemId: mont2.id, skuComponenteId: comp4.id, quantidade: '0.6', perdaPercentual: '2.00' },
        ]);
    }

    // 4. SKUs Engenharia (Produtos Finais)
    const [eng1] = await db.insert(skuEngenharia).values({
        codigo: 'ENG-COZ-001',
        nome: 'Armário Aéreo 2 Portas 800x600',
        categoria: 'Cozinha',
        tipoProduto: 'Aéreo'
    }).onConflictDoNothing().returning();

    // 5. BOM Engenharia -> Montagens
    if (eng1 && mont1 && mont2) {
        await db.insert(bomEngenhariaMontagem).values([
            { skuEngenhariaId: eng1.id, skuMontagemId: mont1.id, quantidade: '1' },
            { skuEngenhariaId: eng1.id, skuMontagemId: mont2.id, quantidade: '2' },
        ]);
    }

    console.log('Seed completed successfully!');
}

seed().catch(console.error).finally(() => process.exit(0));
