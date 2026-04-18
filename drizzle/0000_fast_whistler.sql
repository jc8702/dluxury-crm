CREATE TABLE "erp_chapas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sku" varchar(100) NOT NULL,
	"nome" varchar(255) NOT NULL,
	"largura_mm" integer NOT NULL,
	"altura_mm" integer NOT NULL,
	"espessura_mm" integer NOT NULL,
	"preco_unitario" numeric(12, 2),
	"ativo" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "erp_chapas_sku_unique" UNIQUE("sku")
);
--> statement-breakpoint
CREATE TABLE "erp_skus_engenharia" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sku" varchar(100) NOT NULL,
	"nome" varchar(255) NOT NULL,
	"componentes" jsonb NOT NULL,
	"versao" integer DEFAULT 1,
	"ativo" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "erp_skus_engenharia_sku_unique" UNIQUE("sku")
);
--> statement-breakpoint
CREATE TABLE "planos_de_corte" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nome" varchar(255) NOT NULL,
	"sku_engenharia" varchar(100),
	"kerf_mm" integer DEFAULT 3,
	"materiais" jsonb NOT NULL,
	"resultado" jsonb,
	"observacoes" text,
	"criado_em" timestamp DEFAULT now(),
	"atualizado_em" timestamp DEFAULT now()
);
