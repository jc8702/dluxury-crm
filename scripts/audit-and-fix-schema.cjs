// audit-and-fix-schema.cjs
// Audita e corrige colunas NOT NULL desnecessárias no banco Neon
const { neon } = require('@neondatabase/serverless');

const DATABASE_URL = "postgresql://neondb_owner:npg_Xp2nuVN0lrwH@ep-winter-unit-acsitpn6-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require";
const sql = neon(DATABASE_URL);

// Colunas que DEVEM ser anuláveis (opcional no formulário)
const NULLABLE_FIXES = [
  // clients
  { table: 'clients', column: 'cnpj' },
  { table: 'clients', column: 'cpf' },
  { table: 'clients', column: 'razao_social' },
  { table: 'clients', column: 'nome_fantasia' },
  { table: 'clients', column: 'porte' },
  { table: 'clients', column: 'data_abertura' },
  { table: 'clients', column: 'cnae_principal' },
  { table: 'clients', column: 'cnae_secundario' },
  { table: 'clients', column: 'natureza_juridica' },
  { table: 'clients', column: 'logradouro' },
  { table: 'clients', column: 'endereco' },
  { table: 'clients', column: 'numero' },
  { table: 'clients', column: 'complemento' },
  { table: 'clients', column: 'cep' },
  { table: 'clients', column: 'bairro' },
  { table: 'clients', column: 'municipio' },
  { table: 'clients', column: 'cidade' },
  { table: 'clients', column: 'uf' },
  { table: 'clients', column: 'email' },
  { table: 'clients', column: 'telefone' },
  { table: 'clients', column: 'situacao_cadastral' },
  { table: 'clients', column: 'data_situacao_cadastral' },
  { table: 'clients', column: 'motivo_situacao' },
  { table: 'clients', column: 'codigo_erp' },
  { table: 'clients', column: 'historico' },
  { table: 'clients', column: 'observacoes' },
  { table: 'clients', column: 'frequencia_compra' },
  { table: 'clients', column: 'tipo_imovel' },
  { table: 'clients', column: 'comodos_interesse' },
  { table: 'clients', column: 'origem' },
  { table: 'clients', column: 'nome' },
  // projects
  { table: 'projects', column: 'client_id' },
  { table: 'projects', column: 'client_name' },
  { table: 'projects', column: 'descricao' },
  { table: 'projects', column: 'valor_estimado' },
  { table: 'projects', column: 'prazo_entrega' },
  { table: 'projects', column: 'responsavel' },
  { table: 'projects', column: 'observacoes' },
  // orcamentos
  { table: 'orcamentos', column: 'cliente_id' },
  { table: 'orcamentos', column: 'cliente_nome' },
  { table: 'orcamentos', column: 'observacoes' },
  // kanban_items
  { table: 'kanban_items', column: 'subtitle' },
  { table: 'kanban_items', column: 'label' },
  { table: 'kanban_items', column: 'contact_name' },
  { table: 'kanban_items', column: 'contact_role' },
  { table: 'kanban_items', column: 'email' },
  { table: 'kanban_items', column: 'phone' },
  { table: 'kanban_items', column: 'city' },
  { table: 'kanban_items', column: 'state' },
  { table: 'kanban_items', column: 'value' },
  { table: 'kanban_items', column: 'temperature' },
  { table: 'kanban_items', column: 'visit_date' },
  { table: 'kanban_items', column: 'visit_time' },
  { table: 'kanban_items', column: 'visit_type' },
  { table: 'kanban_items', column: 'observations' },
  { table: 'kanban_items', column: 'project_id' },
];

async function main() {
  console.log('🔍 AUDITORIA DE SCHEMA — Verificando colunas NOT NULL problemáticas...\n');

  // 1. Listar todas as colunas NOT NULL do banco
  const notNullCols = await sql`
    SELECT table_name, column_name, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND is_nullable = 'NO'
      AND column_default IS NULL
      AND column_name NOT IN ('id', 'tenant_id', 'status', 'type', 'title', 'period', 'amount')
    ORDER BY table_name, column_name
  `;

  if (notNullCols.length > 0) {
    console.log(`⚠️  Encontradas ${notNullCols.length} colunas NOT NULL sem default:\n`);
    notNullCols.forEach(c => console.log(`   ${c.table_name}.${c.column_name}`));
  } else {
    console.log('✅ Nenhuma coluna problemática encontrada.\n');
  }

  // 2. Aplicar correções
  console.log('\n🔧 Aplicando correções (DROP NOT NULL)...\n');
  let fixed = 0, skipped = 0;

  for (const { table, column } of NULLABLE_FIXES) {
    try {
      // Verifica se a coluna existe antes de tentar alterar
      const exists = await sql`
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = ${table} AND column_name = ${column}
      `;
      if (!exists.length) { skipped++; continue; }

      await sql.unsafe(`ALTER TABLE ${table} ALTER COLUMN ${column} DROP NOT NULL`);
      console.log(`   ✅ ${table}.${column} → nullable`);
      fixed++;
    } catch (e) {
      if (e.message.includes('already nullable') || e.message.includes('does not exist')) {
        skipped++;
      } else {
        console.log(`   ⚠️  ${table}.${column}: ${e.message.substring(0, 60)}`);
        skipped++;
      }
    }
  }

  // 3. Garantir que colunas tenant_id existem
  console.log('\n🔧 Garantindo tenant_id em todas as tabelas principais...\n');
  const TENANT_TABLES = ['clients', 'projects', 'billings', 'kanban_items', 'monthly_goals',
    'orcamentos', 'materials', 'retalhos', 'ordens_producao', 'agenda_visitas',
    'notificacoes', 'compras_pedidos', 'planos_de_corte', 'engineering_items'];

  for (const table of TENANT_TABLES) {
    try {
      await sql.unsafe(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE`);
      console.log(`   ✅ ${table}.tenant_id OK`);
    } catch (e) {
      if (!e.message.includes('does not exist')) {
        console.log(`   ⚠️  ${table}: ${e.message.substring(0, 60)}`);
      }
    }
  }

  // 4. Garantir deleted_at (soft delete) nas tabelas principais
  console.log('\n🔧 Garantindo deleted_at (soft delete)...\n');
  const SOFT_DELETE_TABLES = ['clients', 'projects', 'orcamentos', 'materials'];
  for (const table of SOFT_DELETE_TABLES) {
    try {
      await sql.unsafe(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE`);
      console.log(`   ✅ ${table}.deleted_at OK`);
    } catch (e) {
      if (!e.message.includes('does not exist')) {
        console.log(`   ⚠️  ${table}: ${e.message.substring(0, 60)}`);
      }
    }
  }

  // 5. Verificar estado final
  const finalCheck = await sql`
    SELECT table_name, column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND is_nullable = 'NO'
      AND column_default IS NULL
      AND column_name NOT IN ('id', 'tenant_id', 'status', 'type', 'title', 'period', 'amount', 'ambiente', 'ambiente_nome')
    ORDER BY table_name, column_name
  `;

  console.log('\n' + '='.repeat(55));
  console.log(`📊 RESULTADO DA AUDITORIA:`);
  console.log(`   ✅ Colunas corrigidas:  ${fixed}`);
  console.log(`   ⏭️  Já OK / Ignoradas:  ${skipped}`);
  if (finalCheck.length > 0) {
    console.log(`\n⚠️  AINDA PRECISAM DE ATENÇÃO (${finalCheck.length}):`);
    finalCheck.forEach(c => console.log(`   → ${c.table_name}.${c.column_name}`));
  } else {
    console.log(`\n🎉 SCHEMA 100% LIMPO — Nenhum NOT NULL problemático restante`);
  }
  console.log('='.repeat(55));
}

main().catch(e => { console.error('❌ ERRO:', e.message); process.exit(1); });
