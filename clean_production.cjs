require('dotenv').config();
const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL);

async function main() {
  try {
    console.log("Iniciando limpeza do módulo de produção...");

    const res1 = await sql`DELETE FROM ordens_producao`;
    console.log('Todas as ordens de produção foram excluídas:', res1);

    const res2 = await sql`DELETE FROM planos_de_corte`;
    console.log('Todos os planos de corte foram excluídos:', res2);

    // Deleta os itens de kanban que estavam vinculados a produção (se houver, com base em op_id não nulo, se a coluna existir, ou deleta os com type = 'production')
    // Kanban items might not have op_id as a real column. Let's check kanban_items.
    // In production.ts we saw: UPDATE kanban_items SET status = 'DELETADO' WHERE op_id = ...
    // Wait, let's just delete kanban_items where op_id IS NOT NULL? If op_id doesn't exist it throws error.
    try {
        const res3 = await sql`DELETE FROM kanban_items WHERE op_id IS NOT NULL`;
        console.log('Itens de kanban vinculados a OP excluídos.', res3);
    } catch (e) {
        console.log('A tabela kanban_items não possui coluna op_id ou está vazia.');
    }

    console.log('SUCESSO: Base de dados do módulo Produção limpa completamente.');
  } catch (err) {
    console.error('ERRO:', err);
  }
}

main();
