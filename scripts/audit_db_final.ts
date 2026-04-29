import { neon } from '@neondatabase/serverless';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
    console.error("❌ Erro: DATABASE_URL não configurada.");
    process.exit(1);
}

const sql = neon(dbUrl);

async function runMigration() {
    console.log("🔍 Iniciando Auditoria de Banco de Dados...");
    
    try {
        // 1. Verificar se a tabela já existe
        const tableCheck = await sql`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'projeto_tipos'
            );
        `;

        if (tableCheck[0].exists) {
            console.log("✅ Tabela 'projeto_tipos' já existe. Verificando dados...");
            const count = await sql`SELECT COUNT(*) FROM projeto_tipos`;
            console.log(`📊 Total de tipos cadastrados: ${count[0].count}`);
        } else {
            console.log("⚠️ Tabela 'projeto_tipos' NÃO encontrada. Executando migração...");
            const sqlPath = path.resolve('migrations', '20260428_projeto_tipos.sql');
            const sqlContent = fs.readFileSync(sqlPath, 'utf8');
            
            // Remover comentários e comandos que o driver pode não gostar
            const cleanSql = sqlContent
                .replace(/--.*$/gm, '') // Remove comentários
                .replace(/\n\s*\n/g, '\n'); // Remove linhas vazias

            // O driver serverless não permite múltiplos comandos
            const commands = cleanSql.split(';')
                .map(cmd => cmd.trim())
                .filter(cmd => cmd.length > 0);

            for (const cmd of commands) {
                await sql.query(cmd);
            }
            console.log("✅ Migração 'projeto_tipos' executada com sucesso!");
        }

        // 2. Verificar integridade de ordens_producao
        const opCheck = await sql`SELECT op_id, produto FROM ordens_producao ORDER BY created_at DESC LIMIT 1`;
        console.log("📝 Última OP gerada:", opCheck[0] || "Nenhuma encontrada");

    } catch (e) {
        console.error("❌ Erro na auditoria/migração:", e.message);
    }
}

runMigration();
