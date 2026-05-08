import 'dotenv/config';
import { explodirBOM } from './src/api-lib/orcamentos_pro.js';
import { db } from './src/api-lib/drizzle-db.js';
import { skuEngenharia } from './src/db/schema/engenharia-orcamentos.js';
import { eq } from 'drizzle-orm';

async function validateBOM() {
    console.log('--- VALIDANDO EXPLOSÃO DE BOM ---');
    
    // Buscar o Armário Aéreo (ENG-COZ-001)
    const eng = await db.query.skuEngenharia.findFirst({
        where: eq(skuEngenharia.codigo, 'ENG-COZ-001')
    });

    if (!eng) {
        console.error('ERRO: SKU ENG-COZ-001 não encontrado. Execute o seed primeiro.');
        process.exit(1);
    }

    console.log(`Explodindo BOM para: ${eng.nome} (Qtd: 1)`);
    const componentes = await explodirBOM(eng.id, 1);

    console.log('Resultados da Explosão:');
    let custoTotal = 0;
    componentes.forEach(c => {
        console.log(`- ${c.nome}: Qtd ${c.quantidadeCalculada.toFixed(3)} | Custo Unit: R$ ${c.custoUnitario.toFixed(2)} | Total: R$ ${c.custoTotal.toFixed(2)}`);
        custoTotal += c.custoTotal;
    });

    console.log(`\nCusto Total Acumulado: R$ ${custoTotal.toFixed(2)}`);
    
    const esperado = 456.785;
    const d = Math.abs(custoTotal - esperado);
    
    if (d < 0.1) {
        console.log('\n✅ VALIDAÇÃO BEM-SUCEDIDA! O cálculo de BOM e custos está preciso.');
    } else {
        console.warn(`\n⚠️ DISCREPÂNCIA DETECTADA! Esperado: R$ ${esperado.toFixed(2)} | Atual: R$ ${custoTotal.toFixed(2)}`);
        console.log('Diferença:', d.toFixed(4));
    }
}

validateBOM().catch(console.error).finally(() => process.exit(0));
