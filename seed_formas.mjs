import { neon } from '@neondatabase/serverless';
const sql = neon('postgresql://neondb_owner:npg_Xp2nuVN0lrwH@ep-winter-unit-acsitpn6-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require');

async function seed() {
    const formas = [
        { nome: 'PIX', tipo: 'pix', taxa: 0, prazo: 0 },
        { nome: 'Boleto Bancário', tipo: 'boleto', taxa: 0, prazo: 3 },
        { nome: 'Cartão de Crédito', tipo: 'cartao_credito', taxa: 2.5, prazo: 30 },
        { nome: 'Cartão de Débito', tipo: 'cartao_debito', taxa: 1.5, prazo: 1 },
        { nome: 'Transferência (TED/DOC)', tipo: 'ted', taxa: 0, prazo: 1 },
        { nome: 'Dinheiro', tipo: 'dinheiro', taxa: 0, prazo: 0 },
        { nome: 'Cheque', tipo: 'cheque', taxa: 0, prazo: 3 },
    ];

    for (const f of formas) {
        await sql`
            INSERT INTO formas_pagamento (nome, tipo, taxa_percentual, prazo_compensacao_dias, ativa, deletado)
            VALUES (${f.nome}, ${f.tipo}, ${f.taxa}, ${f.prazo}, true, false)
            ON CONFLICT DO NOTHING
        `;
        console.log(`Inserida: ${f.nome}`);
    }

    const result = await sql`SELECT id, nome, tipo FROM formas_pagamento WHERE deletado = false`;
    console.log('\nFormas cadastradas:', JSON.stringify(result));
}

seed().catch(console.error);
