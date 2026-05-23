require('dotenv').config();
const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL);

async function main() {
  try {
    const m = await sql`DELETE FROM erp_movimentacoes_industrial WHERE item_tipo = 'retalho' OR motivo LIKE '%sobra%' OR motivo LIKE '%RET-%'`;
    console.log('Movimentações industriais deletadas:', m);

    console.log('materials', await sql`DELETE FROM materiais WHERE sku LIKE 'RET%'`);
    console.log('inventory', await sql`DELETE FROM inventory WHERE sku LIKE 'RET%'`);
    console.log('itens_orcamento', await sql`DELETE FROM itens_orcamento WHERE sku LIKE 'RET%'`);
    console.log('orcamento_pecas', await sql`DELETE FROM orcamento_pecas WHERE sku LIKE 'RET%'`);
    console.log('orcamento_ferragens', await sql`DELETE FROM orcamento_ferragens WHERE sku LIKE 'RET%'`);
    console.log('erp_skus_engenharia', await sql`DELETE FROM erp_skus_engenharia WHERE sku LIKE 'RET%'`);
    console.log('pedido_compra_itens', await sql`DELETE FROM pedido_compra_itens WHERE sku LIKE 'RET%'`);
    console.log('retalhos_estoque', await sql`DELETE FROM retalhos_estoque WHERE sku LIKE 'RET%'`);
    console.log('erp_chapas', await sql`DELETE FROM erp_chapas WHERE sku LIKE 'RET%'`);

    console.log('Limpeza concluída!');
  } catch (err) {
    console.error('Erro na limpeza:', err);
  }
}

main();
