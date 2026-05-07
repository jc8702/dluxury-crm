const { neon } = require('@neondatabase/serverless');
const sql = neon("postgresql://neondb_owner:npg_Xp2nuVN0lrwH@ep-winter-unit-acsitpn6-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require");

async function run() {
  console.log('--- SYNCING DATABASE ---');

  try {
    // 1. Criar tabela movimentacoes_estoque se não existir
    console.log('Criando tabela movimentacoes_estoque...');
    await sql`
      CREATE TABLE IF NOT EXISTS movimentacoes_estoque (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tipo VARCHAR(30) NOT NULL,
        item_tipo VARCHAR(20) NOT NULL,
        chapa_id UUID,
        retalho_id UUID,
        plano_corte_id UUID,
        quantidade INTEGER DEFAULT 1,
        motivo TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        usuario_id VARCHAR(100)
      )
    `;

    // 2. Criar tabela ordens_producao se não existir (garantia)
    console.log('Criando tabela ordens_producao...');
    await sql`
      CREATE TABLE IF NOT EXISTS ordens_producao (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        op_id VARCHAR(50) UNIQUE NOT NULL,
        produto VARCHAR(255) NOT NULL,
        pecas INTEGER DEFAULT 0,
        status VARCHAR(50) DEFAULT 'AGUARDANDO',
        metadata JSONB DEFAULT '{}',
        checklist JSONB DEFAULT '[]',
        visita_id UUID,
        projeto_id UUID,
        orcamento_id UUID,
        data_inicio TIMESTAMP WITH TIME ZONE,
        data_fim TIMESTAMP WITH TIME ZONE,
        data_prevista_entrega TIMESTAMP WITH TIME ZONE,
        tempo_previsto_corte INTEGER DEFAULT 0,
        tempo_previsto_montagem INTEGER DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        deleted_at TIMESTAMP WITH TIME ZONE
      )
    `;

    // 3. Popular erp_chapas com dados básicos para a busca funcionar
    console.log('Populando erp_chapas...');
    const chapas = [
      { sku: 'MDF-BRA-18', nome: 'MDF BRANCO 18MM', largura: 2750, altura: 1840, espessura: 18, preco: 250.00 },
      { sku: 'CHP-CAR-15', nome: 'CHAPA CARVALHO 15MM', largura: 2750, altura: 1840, espessura: 15, preco: 320.00 },
      { sku: 'MDF-GRA-06', nome: 'MDF GRAFITE 6MM', largura: 2750, altura: 1840, espessura: 6, preco: 120.00 }
    ];

    for (const c of chapas) {
      await sql`
        INSERT INTO erp_chapas (sku, nome, largura_mm, altura_mm, espessura_mm, preco_unitario, ativo)
        VALUES (${c.sku}, ${c.nome}, ${c.largura}, ${c.altura}, ${c.espessura}, ${c.preco}, true)
        ON CONFLICT (sku) DO UPDATE SET 
          nome = EXCLUDED.nome,
          largura_mm = EXCLUDED.largura_mm,
          altura_mm = EXCLUDED.altura_mm
      `;
    }

    console.log('--- DATABASE SYNCED SUCCESSFULLY ---');
  } catch (err) {
    console.error('Migration Error:', err);
  }
}

run();
