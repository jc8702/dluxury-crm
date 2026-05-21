import 'dotenv/config';
import { Pool } from '@neondatabase/serverless';

async function runMigration() {
  console.log('--- EXECUTANDO MIGRAÇÃO DO VETOR RAG (pgvector) ---');
  if (!process.env.DATABASE_URL) {
    console.error('❌ Erro: DATABASE_URL ausente no ambiente.');
    process.exit(1);
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    console.log('1. Ativando extensão pgvector...');
    await pool.query('CREATE EXTENSION IF NOT EXISTS vector;');
    console.log('✅ Extensão pgvector ativada ou já existente.');

    console.log('2. Criando tabela conhecimento_marcenaria...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS conhecimento_marcenaria (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        titulo VARCHAR(255) NOT NULL,
        conteudo TEXT NOT NULL,
        categoria VARCHAR(100) NOT NULL,
        embedding vector(768) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('✅ Tabela conhecimento_marcenaria criada com sucesso.');

    console.log('3. Criando índice de busca de cosseno...');
    // Criar índice HNSW (ou IVFFlat) para otimizar busca de cosseno no pgvector se não existir
    // Usamos HNSW por ser o recomendado para pgvector 0.5.0+ no Neon
    await pool.query(`
      CREATE INDEX IF NOT EXISTS conhecimento_marcenaria_embedding_idx 
      ON conhecimento_marcenaria USING hnsw (embedding vector_cosine_ops);
    `);
    console.log('✅ Índice de busca vetorial HNSW criado.');

    console.log('🎉 Migração concluída com sucesso!');
    await pool.end();
    process.exit(0);
  } catch (err) {
    console.error('❌ Erro durante a migração:', err);
    await pool.end();
    process.exit(1);
  }
}

runMigration();
