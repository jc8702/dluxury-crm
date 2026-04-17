import { neon } from '@neondatabase/serverless';

async function testInsert() {
  try {
    const databaseUrl = 'postgresql://neondb_owner:npg_Xp2nuVN0lrwH@ep-winter-unit-acsitpn6-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require';
    const sql = neon(databaseUrl);
    
    console.log('Testando query de ultimo SKU...');
    const lastSkuQuery = await sql`SELECT sku FROM materiais ORDER BY id DESC LIMIT 1`;
    console.log('lastSkuQuery result:', lastSkuQuery);
    let proximoSku = 'SKU-0001';
    if (lastSkuQuery.length > 0 && lastSkuQuery[0].sku) {
       const match = lastSkuQuery[0].sku.match(/\d+/);
       if (match) { proximoSku = `SKU-${(parseInt(match[0], 10) + 1).toString().padStart(4, '0')}`; }
    }
    console.log('Proximo SKU:', proximoSku);

    console.log('Buscando cateogorid...');
    const categorias = await sql`SELECT id FROM categorias_material LIMIT 1`;
    const catId = categorias.length > 0 ? categorias[0].id : null;
    console.log('CatID:', catId);

    const args = {
        nome: "TESTE_NODE",
        descricao: "TESTE_DESC",
        unidade_uso: "UN",
        preco_custo: 50
    };
    const unidade = args.unidade_uso || 'UN';
    const preco = args.preco_custo || 0;
    
    console.log('Executando inserção...');
    const r = await sql`INSERT INTO materiais (sku, nome, descricao, unidade_uso, unidade_compra, preco_custo, margem_lucro, preco_venda, categoria_id, ativo, estoque_atual, estoque_minimo) VALUES (${proximoSku}, ${args.nome}, ${args.descricao}, ${unidade}, ${unidade}, ${preco}, 50, ${preco * 1.5}, ${catId}, true, 0, 0) RETURNING id`;
    
    console.log('INSERIDO COM SUCESSO:', r);
  } catch (err) {
    console.error('ERRO NO BANCO DE DADOS:', err);
  }
}

testInsert();
