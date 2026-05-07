import { db } from '../src/api-lib/drizzle-db.js';
import { skuEngenharia } from '../src/db/schema/engenharia-orcamentos.js';
import { handleOrcamentosPro } from '../src/api-lib/orcamentos_pro.js';
import { eq } from 'drizzle-orm';

async function testExplosion() {
    console.log('🧪 Testando Explosão de BOM...');
    try {
        // 1. Pegar o SKU que criamos no seed
        const [sku] = await db.select().from(skuEngenharia).where(eq(skuEngenharia.codigo, 'ENG-COZ-001'));
        
        if (!sku) {
            console.error('❌ SKU ENG-COZ-001 não encontrado. Rode o seed primeiro.');
            process.exit(1);
        }

        console.log(`  - SKU encontrado: ${sku.nome}`);

        // 2. Simular Request para a API de explosão
        const mockReq = {
            method: 'POST',
            body: {
                numeroOrcamento: 'TEST-001',
                clienteId: 1,
                itens: [
                    { skuEngenhariaId: sku.id, quantidade: 1 }
                ]
            }
        };

        const mockRes = {
            status: (code: number) => ({
                json: (data: any) => {
                    if (code === 201) {
                        console.log('✅ Orçamento Criado com Sucesso!');
                        console.log('📦 Lista Explodida Materializada:');
                        data.data.itens[0].listaExplodida.forEach((comp: any) => {
                            console.log(`    - [${comp.origem}] ${comp.componente?.nome || 'Desconhecido'}: ${comp.quantidadeCalculada}`);
                        });
                    } else {
                        console.error(`❌ Erro na API (${code}):`, data.error);
                    }
                }
            })
        };

        await handleOrcamentosPro(mockReq as any, mockRes as any);

    } catch (err) {
        console.error('❌ Falha no teste:', err);
    }
    process.exit(0);
}

testExplosion();
