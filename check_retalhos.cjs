require('dotenv').config();
const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL);

async function main() {
  try {
    let totalRemaining = 0;

    const res1 = await sql`SELECT COUNT(*) as count FROM materiais WHERE sku LIKE 'RET%'`;
    let count = parseInt(res1[0].count);
    console.log(`materiais tem ${count} SKUs RET.`);
    totalRemaining += count;

    const res2 = await sql`SELECT COUNT(*) as count FROM inventory WHERE sku LIKE 'RET%'`;
    count = parseInt(res2[0].count);
    console.log(`inventory tem ${count} SKUs RET.`);
    totalRemaining += count;

    const res3 = await sql`SELECT COUNT(*) as count FROM itens_orcamento WHERE sku LIKE 'RET%'`;
    count = parseInt(res3[0].count);
    console.log(`itens_orcamento tem ${count} SKUs RET.`);
    totalRemaining += count;

    const res4 = await sql`SELECT COUNT(*) as count FROM orcamento_pecas WHERE sku LIKE 'RET%'`;
    count = parseInt(res4[0].count);
    console.log(`orcamento_pecas tem ${count} SKUs RET.`);
    totalRemaining += count;

    const res5 = await sql`SELECT COUNT(*) as count FROM orcamento_ferragens WHERE sku LIKE 'RET%'`;
    count = parseInt(res5[0].count);
    console.log(`orcamento_ferragens tem ${count} SKUs RET.`);
    totalRemaining += count;

    const res6 = await sql`SELECT COUNT(*) as count FROM erp_skus_engenharia WHERE sku LIKE 'RET%'`;
    count = parseInt(res6[0].count);
    console.log(`erp_skus_engenharia tem ${count} SKUs RET.`);
    totalRemaining += count;

    const res7 = await sql`SELECT COUNT(*) as count FROM pedido_compra_itens WHERE sku LIKE 'RET%'`;
    count = parseInt(res7[0].count);
    console.log(`pedido_compra_itens tem ${count} SKUs RET.`);
    totalRemaining += count;

    const res8 = await sql`SELECT COUNT(*) as count FROM retalhos_estoque WHERE sku LIKE 'RET%'`;
    count = parseInt(res8[0].count);
    console.log(`retalhos_estoque tem ${count} SKUs RET.`);
    totalRemaining += count;

    const res9 = await sql`SELECT COUNT(*) as count FROM erp_chapas WHERE sku LIKE 'RET%'`;
    count = parseInt(res9[0].count);
    console.log(`erp_chapas tem ${count} SKUs RET.`);
    totalRemaining += count;

    const movs = await sql`SELECT COUNT(*) as count FROM erp_movimentacoes_industrial WHERE item_tipo = 'retalho' OR motivo LIKE '%sobra%' OR motivo LIKE '%RET-%'`;
    const countMovs = parseInt(movs[0].count);
    console.log(`erp_movimentacoes_industrial tem ${countMovs} registros relacionados a retalhos.`);
    totalRemaining += countMovs;

    if (totalRemaining === 0) {
      console.log("SUCESSO: Nenhum SKU tipo RET encontrado no banco de dados.");
    } else {
      console.log(`FALHA: Ainda existem ${totalRemaining} registros relacionados a RET no banco.`);
    }

  } catch (err) {
    console.error('Erro:', err);
  }
}

main();
