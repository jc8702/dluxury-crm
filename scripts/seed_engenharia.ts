import { db } from '../src/api-lib/drizzle-db.js';
import { 
    skuComponente, skuMontagem, skuEngenharia, 
    bomEngenhariaMontagem, bomMontagemComponente 
} from '../src/db/schema/engenharia-orcamentos.js';
import { clientes } from '../src/db/schema/crm.js';

async function seed() {
    console.log('🌱 Iniciando Seed de Engenharia...');

    try {
        console.log('  - Buscando ou Criando Cliente de Teste...');
        let [cliente] = await db.select().from(clientes).limit(1);
        
        if (!cliente) {
            [cliente] = await db.insert(clientes).values({
                nome: 'D\'Luxury Ambientes LTDA',
                email: 'contato@dluxury.com.br',
                cidade: 'Gramado',
                uf: 'RS',
                status: 'ativo'
            }).returning();
        }

        // 1. COMPONENTES (Matéria-prima)
        console.log('  - Criando Componentes...');
        const [mdf15] = await db.insert(skuComponente).values({
            codigo: 'CHP-0001',
            nome: 'MDF Branco 15mm 2.75x1.83',
            tipo: 'Chapa',
            unidadeMedida: 'M2',
            precoUnitario: '48.50',
            estoqueAtual: '150.000'
        }).onConflictDoNothing().returning();

        const [mdf18] = await db.insert(skuComponente).values({
            codigo: 'CHP-0002',
            nome: 'MDF Grafite 18mm 2.75x1.83',
            tipo: 'Chapa',
            unidadeMedida: 'M2',
            precoUnitario: '62.00',
            estoqueAtual: '80.000'
        }).onConflictDoNothing().returning();

        const [dobradica] = await db.insert(skuComponente).values({
            codigo: 'FER-0001',
            nome: 'Dobradiça Caneco 35mm Slow',
            tipo: 'Ferragem',
            unidadeMedida: 'UN',
            precoUnitario: '12.40',
            estoqueAtual: '1200.000'
        }).onConflictDoNothing().returning();

        // 2. MONTAGENS (Subconjuntos)
        console.log('  - Criando Montagens...');
        const [portaPadrao] = await db.insert(skuMontagem).values({
            codigo: 'MON-PORTA-001',
            nome: 'Kit Porta Batente Padrão',
            unidadeMedida: 'UN',
            tempoMontagemMin: 15,
            complexidade: 'Baixa'
        }).onConflictDoNothing().returning();

        // 3. BOM: Montagem -> Componentes
        console.log('  - Configurando BOM de Montagem...');
        if (portaPadrao && dobradica && mdf15) {
            await db.insert(bomMontagemComponente).values([
                {
                    skuMontagemId: portaPadrao.id,
                    skuComponenteId: mdf15.id,
                    quantidade: '0.850', // 0.85m2 por porta
                    perdaPercentual: '10.00'
                },
                {
                    skuMontagemId: portaPadrao.id,
                    skuComponenteId: dobradica.id,
                    quantidade: '2.000', // 2 dobradiças por porta
                    perdaPercentual: '0.00'
                }
            ]).onConflictDoNothing();
        }

        // 4. ENGENHARIA (Produto Final)
        console.log('  - Criando Produtos de Engenharia...');
        const [armarioAereo] = await db.insert(skuEngenharia).values({
            codigo: 'ENG-COZ-001',
            nome: 'Armário Aéreo Cozinha 2 Portas',
            categoria: 'Cozinha',
            tipoProduto: 'Armário'
        }).onConflictDoNothing().returning();

        // 5. BOM: Engenharia -> Montagem
        console.log('  - Configurando BOM de Engenharia...');
        if (armarioAereo && portaPadrao && mdf18) {
            await db.insert(bomEngenhariaMontagem).values([
                {
                    skuEngenhariaId: armarioAereo.id,
                    skuMontagemId: portaPadrao.id,
                    quantidade: '2.000', // 2 kits de porta
                    ordemProducao: 2
                }
            ]).onConflictDoNothing();
        }

        console.log('✅ Seed concluído com sucesso!');
    } catch (err) {
        console.error('❌ Erro no Seed:', err);
    }
    process.exit(0);
}

seed();
