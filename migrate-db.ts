import * as dotenv from 'dotenv';
dotenv.config();

import { sql } from './src/api-lib/_db.js';

async function runMigrations() {
  try {
    console.log('Criando tabela fornecedores...');
    await sql`
      CREATE TABLE IF NOT EXISTS "fornecedores" (
        "id" serial PRIMARY KEY NOT NULL,
        "tenant_id" uuid NOT NULL,
        "nome" varchar(255) NOT NULL,
        "cnpj" varchar(20),
        "contato" varchar(255),
        "telefone" varchar(50),
        "email" varchar(255),
        "cidade" varchar(255),
        "estado" varchar(2),
        "observacoes" text,
        "ativo" boolean DEFAULT true,
        "created_at" timestamp with time zone DEFAULT now(),
        "updated_at" timestamp with time zone DEFAULT now()
      );
    `;

    console.log('Adicionando constraint tenant_id...');
    try {
      await sql`ALTER TABLE "fornecedores" ADD CONSTRAINT "fornecedores_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;`;
    } catch (e) {
      console.log('Constraint tenant_id já existe ou erro:', e.message);
    }

    console.log('Criando indice fornecedores_tenant_idx...');
    await sql`CREATE INDEX IF NOT EXISTS "fornecedores_tenant_idx" ON "fornecedores" USING btree ("tenant_id");`;

    console.log('Alterando eventos_calendario para quotation_id...');
    try {
      // Remover a coluna antiga se existir e criar a nova
      await sql`ALTER TABLE "eventos_calendario" RENAME COLUMN "orcamento_id" TO "quotation_id"`;
    } catch (e) {
      console.log('Coluna orcamento_id possivelmente nao existe ou ja foi renomeada.', e.message);
      try {
        await sql`ALTER TABLE "eventos_calendario" ADD COLUMN IF NOT EXISTS "quotation_id" uuid;`;
      } catch (err) {}
    }
    
    console.log('Adicionando foreign key para quotation_id...');
    try {
      await sql`ALTER TABLE "eventos_calendario" ADD CONSTRAINT "eventos_calendario_quotation_id_quotations_id_fk" FOREIGN KEY ("quotation_id") REFERENCES "public"."quotations"("id") ON DELETE set null ON UPDATE no action;`;
    } catch(e) {
      console.log('FK quotation_id já existe.', e.message);
    }
    
    console.log('Migrações executadas com sucesso!');
    process.exit(0);
  } catch (err) {
    console.error('Erro na migração:', err);
    process.exit(1);
  }
}

runMigrations();
