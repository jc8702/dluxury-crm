import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env manually
const envPath = join(__dirname, '..', '.env');
const envContent = readFileSync(envPath, 'utf-8');
const DATABASE_URL = envContent
  .split('\n')
  .find(l => l.startsWith('DATABASE_URL='))
  ?.replace('DATABASE_URL=', '')
  ?.trim()
  ?.replace(/^"|"$/g, '');

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL não encontrada no .env');
  process.exit(1);
}

import { neon } from '@neondatabase/serverless';

const sql = neon(DATABASE_URL);

async function run() {
  console.log('--- Sincronizando Neon DB para caixa alta ---\n');

  // 1. categorias_material
  try {
    const r = await sql`
      UPDATE categorias_material SET nome = UPPER(nome)
      WHERE nome IS DISTINCT FROM UPPER(nome)
    `;
    console.log(`✅ categorias_material: ${r.length} linhas atualizadas`);
  } catch (e) { console.error('❌ categorias_material:', e.message); }

  // 2. erp_chapas
  try {
    const r = await sql`
      UPDATE erp_chapas SET nome = UPPER(nome)
      WHERE nome IS DISTINCT FROM UPPER(nome)
    `;
    console.log(`✅ erp_chapas: ${r.length} linhas atualizadas`);
  } catch (e) { console.error('❌ erp_chapas:', e.message); }

  // 3. users (admin)
  try {
    const r = await sql`
      UPDATE users SET name = UPPER(name)
      WHERE name IS DISTINCT FROM UPPER(name)
    `;
    console.log(`✅ users: ${r.length} linhas atualizadas`);
  } catch (e) { console.error('❌ users:', e.message); }

  // 4. retalhos_estoque (localizacao, origem)
  try {
    const r = await sql`
      UPDATE retalhos_estoque SET localizacao = UPPER(localizacao)
      WHERE localizacao IS DISTINCT FROM UPPER(localizacao)
    `;
    console.log(`✅ retalhos_estoque.localizacao: ${r.length} linhas`);
  } catch (e) { console.error('❌ retalhos_estoque.localizacao:', e.message); }
  try {
    const r = await sql`
      UPDATE retalhos_estoque SET origem = UPPER(origem)
      WHERE origem IS DISTINCT FROM UPPER(origem)
    `;
    console.log(`✅ retalhos_estoque.origem: ${r.length} linhas`);
  } catch (e) { console.error('❌ retalhos_estoque.origem:', e.message); }

  // 5. movimentacoes_estoque (motivo)
  try {
    const r = await sql`
      UPDATE movimentacoes_estoque SET motivo = UPPER(motivo)
      WHERE motivo IS DISTINCT FROM UPPER(motivo)
    `;
    console.log(`✅ movimentacoes_estoque.motivo: ${r.length} linhas`);
  } catch (e) { console.error('❌ movimentacoes_estoque.motivo:', e.message); }

  // 6. materiais (nome, descricao)
  try {
    const r = await sql`
      UPDATE materiais SET nome = UPPER(nome)
      WHERE nome IS DISTINCT FROM UPPER(nome)
    `;
    console.log(`✅ materiais.nome: ${r.length} linhas`);
  } catch (e) { console.error('❌ materiais.nome:', e.message); }
  try {
    const r = await sql`
      UPDATE materiais SET descricao = UPPER(descricao)
      WHERE descricao IS DISTINCT FROM UPPER(descricao) AND descricao IS NOT NULL
    `;
    console.log(`✅ materiais.descricao: ${r.length} linhas`);
  } catch (e) { console.error('❌ materiais.descricao:', e.message); }

  // 7. erp_categories
  try {
    const r = await sql`
      UPDATE erp_categories SET nome = UPPER(nome)
      WHERE nome IS DISTINCT FROM UPPER(nome)
    `;
    console.log(`✅ erp_categories: ${r.length} linhas`);
  } catch (e) { console.error('❌ erp_categories:', e.message); }

  // 8. fornecedores
  try {
    const r = await sql`
      UPDATE fornecedores SET nome = UPPER(nome)
      WHERE nome IS DISTINCT FROM UPPER(nome)
    `;
    console.log(`✅ fornecedores: ${r.length} linhas`);
  } catch (e) { console.error('❌ fornecedores:', e.message); }

  // 9. pedido_compra_itens status
  try {
    const r = await sql`
      UPDATE pedido_compra_itens SET status_item = UPPER(status_item)
      WHERE status_item IS DISTINCT FROM UPPER(status_item)
    `;
    console.log(`✅ pedido_compra_itens.status_item: ${r.length} linhas`);
  } catch (e) { console.error('❌ pedido_compra_itens.status_item:', e.message); }

  // 10. erp_skus
  try {
    const r = await sql`
      UPDATE erp_skus SET nome = UPPER(nome)
      WHERE nome IS DISTINCT FROM UPPER(nome)
    `;
    console.log(`✅ erp_skus: ${r.length} linhas`);
  } catch (e) { console.error('❌ erp_skus:', e.message); }

  console.log('\n--- Neon sync concluído ---');
  process.exit(0);
}

run().catch(e => {
  console.error('❌ Erro fatal:', e);
  process.exit(1);
});
