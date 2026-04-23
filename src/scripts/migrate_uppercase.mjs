import { neon } from '@neondatabase/serverless';
import 'dotenv/config';

// Tenta carregar o DATABASE_URL do .env ou variável de ambiente
const dbUrl = process.env.DATABASE_URL;

if (!dbUrl) {
  console.error('ERRO: DATABASE_URL não encontrada no ambiente.');
  process.exit(1);
}

const sql = neon(dbUrl);

async function migrate() {
  console.log('🚀 Iniciando migração para CAIXA ALTA...');

  const tables = [
    { name: 'clients', columns: ['razao_social', 'nome', 'nome_fantasia', 'porte', 'natureza_juridica', 'logradouro', 'endereco', 'bairro', 'municipio', 'cidade', 'uf', 'email', 'situacao_cadastral', 'motivo_situacao', 'historico', 'observacoes', 'tipo_imovel', 'comodos_interesse', 'origem', 'status'] },
    { name: 'projects', columns: ['client_name', 'ambiente', 'descricao', 'status', 'etapa_producao', 'responsavel', 'observacoes'] },
    { name: 'billings', columns: ['nf', 'pedido', 'cliente', 'descricao', 'categoria', 'status'] },
    { name: 'kanban_items', columns: ['title', 'subtitle', 'label', 'status', 'type', 'contact_name', 'contact_role', 'email', 'city', 'state', 'temperature', 'visit_type', 'observations', 'visit_format', 'description'] },
    { name: 'fornecedores', columns: ['nome', 'contato', 'email', 'cidade', 'estado', 'observacoes'] },
    { name: 'materiais', columns: ['sku', 'nome', 'descricao', 'subcategoria', 'unidade_compra', 'unidade_uso', 'fornecedor_principal', 'observacoes', 'cfop', 'ncm', 'marca'] },
    { name: 'erp_skus', columns: ['sku_code', 'nome', 'unidade_medida'] },
    { name: 'erp_categories', columns: ['nome'] },
    { name: 'erp_families', columns: ['nome'] },
    { name: 'erp_subfamilies', columns: ['nome'] },
    { name: 'orcamentos', columns: ['numero', 'status', 'prazo_tipo', 'observacoes'] },
    { name: 'itens_orcamento', columns: ['descricao', 'ambiente', 'material', 'acabamento'] },
    { name: 'ordens_producao', columns: ['op_id', 'produto', 'status'] },
    { name: 'chamados_garantia', columns: ['numero', 'titulo', 'descricao', 'tipo', 'prioridade', 'status', 'responsavel', 'solucao_aplicada'] },
    { name: 'notificacoes', columns: ['tipo', 'titulo', 'mensagem', 'prioridade', 'referencia_tipo'] },
    { name: 'eventos_agenda', columns: ['titulo', 'tipo', 'responsavel', 'local', 'observacoes', 'status'] },
    { name: 'planos_corte', columns: ['nome', 'status'] },
    { name: 'classes_financeiras', columns: ['codigo', 'nome', 'tipo', 'natureza'] },
    { name: 'contas_internas', columns: ['nome', 'tipo', 'banco_codigo', 'agencia', 'conta'] },
    { name: 'formas_pagamento', columns: ['nome', 'tipo'] },
    { name: 'condicoes_pagamento', columns: ['nome', 'descricao'] },
    { name: 'titulos_receber', columns: ['numero_titulo', 'status', 'observacoes'] },
    { name: 'titulos_pagar', columns: ['numero_titulo', 'status', 'observacoes'] },
    { name: 'movimentacoes_tesouraria', columns: ['tipo', 'descricao'] },
    { name: 'contas_recorrentes', columns: ['descricao', 'tipo'] }
  ];

  for (const table of tables) {
    console.log(`\n📂 Tabela: ${table.name.toUpperCase()}`);
    for (const col of table.columns) {
      try {
        // Verifica se a coluna existe antes de tentar o update
        // Nota: information_schema requer consulta normal
        const checkCol = await sql`
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = ${table.name} AND column_name = ${col}
        `;

        if (checkCol.length > 0) {
          // Usamos sql.query para permitir nomes de tabelas/colunas dinâmicos na string (vulnerável a injeção, mas aceitável em script de migração controlado)
          await sql.query(`UPDATE ${table.name} SET ${col} = UPPER(${col}) WHERE ${col} IS NOT NULL`);
          console.log(`  ✅ Coluna ${col.padEnd(20)} | OK`);
        }
      } catch (e) {
        console.error(`  ❌ Coluna ${col.padEnd(20)} | ERRO: ${e.message}`);
      }
    }
  }

  console.log('\n✨ Migração concluída com sucesso!');
}

migrate().catch(err => {
  console.error('💥 Erro fatal na migração:', err);
  process.exit(1);
});
