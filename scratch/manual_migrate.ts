import 'dotenv/config';
import { neon } from '@neondatabase/serverless';

async function migrate() {
  console.log('--- Iniciando Migração Manual ---');
  const sql = neon(process.env.DATABASE_URL!);
  
  try {
    // Materiais
    console.log('Atualizando tabela materiais...');
    await sql`ALTER TABLE materiais ADD COLUMN IF NOT EXISTS icms NUMERIC`.catch(e => console.log('ICMS:', e.message));
    await sql`ALTER TABLE materiais ADD COLUMN IF NOT EXISTS preco_venda NUMERIC`.catch(e => console.log('PV:', e.message));
    await sql`ALTER TABLE materiais ADD COLUMN IF NOT EXISTS margem_lucro NUMERIC`.catch(e => console.log('ML:', e.message));
    await sql`ALTER TABLE materiais ADD COLUMN IF NOT EXISTS largura_mm NUMERIC`.catch(e => console.log('L:', e.message));
    await sql`ALTER TABLE materiais ADD COLUMN IF NOT EXISTS altura_mm NUMERIC`.catch(e => console.log('A:', e.message));

    // Novas Tabelas
    console.log('Criando novas tabelas...');
    await sql`
      CREATE TABLE IF NOT EXISTS orcamento_ambientes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        orcamento_id UUID REFERENCES orcamentos(id) ON DELETE CASCADE,
        nome TEXT NOT NULL,
        ordem INTEGER DEFAULT 0,
        criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `;
    console.log('✅ orcamento_ambientes');

    await sql`
      CREATE TABLE IF NOT EXISTS orcamento_moveis (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        ambiente_id UUID REFERENCES orcamento_ambientes(id) ON DELETE CASCADE,
        nome TEXT NOT NULL,
        tipo_movel TEXT,
        largura_total_cm NUMERIC(8,2),
        altura_total_cm NUMERIC(8,2),
        profundidade_total_cm NUMERIC(8,2),
        observacoes TEXT,
        ordem INTEGER DEFAULT 0,
        criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `;
    console.log('✅ orcamento_moveis');

    await sql`
      CREATE TABLE IF NOT EXISTS orcamento_pecas (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        movel_id UUID REFERENCES orcamento_moveis(id) ON DELETE CASCADE,
        material_id UUID REFERENCES materiais(id),
        sku TEXT NOT NULL,
        descricao_peca TEXT NOT NULL,
        largura_cm NUMERIC(8,2) NOT NULL,
        altura_cm NUMERIC(8,2) NOT NULL,
        quantidade INTEGER NOT NULL DEFAULT 1,
        m2_unitario NUMERIC(10,6),
        m2_total NUMERIC(10,6),
        fator_perda_pct NUMERIC(5,4) DEFAULT 0.10,
        m2_com_perda NUMERIC(10,6),
        preco_custo_m2 NUMERIC(10,4),
        custo_total_peca NUMERIC(10,2),
        metros_fita_borda NUMERIC(8,2) DEFAULT 0,
        fita_material_id UUID REFERENCES materiais(id),
        criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `;
    console.log('✅ orcamento_pecas');

    await sql`
      CREATE TABLE IF NOT EXISTS configuracoes_precificacao (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        fator_perda_padrao NUMERIC(5,4) DEFAULT 0.10,
        markup_padrao NUMERIC(5,4) DEFAULT 1.80,
        aliquota_imposto NUMERIC(5,4) DEFAULT 0.00,
        mo_producao_pct_padrao NUMERIC(5,4) DEFAULT 0.30,
        mo_instalacao_pct_padrao NUMERIC(5,4) DEFAULT 0.15,
        margem_minima_alerta NUMERIC(5,4) DEFAULT 0.25,
        atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `;
    console.log('✅ configuracoes_precificacao');

    console.log('\n--- Migração Concluída com Sucesso ---');
  } catch (err) {
    console.error('❌ Erro na migração:', err);
  }
}

migrate();
