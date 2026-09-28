CREATE TABLE IF NOT EXISTS configuracoes_precificacao (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	tenant_id UUID NOT NULL,
	fator_perda_padrao NUMERIC(8,4) DEFAULT 0 NOT NULL,
	markup_padrao NUMERIC(8,4) DEFAULT 1.5 NOT NULL,
	aliquota_imposto NUMERIC(8,4) DEFAULT 0 NOT NULL,
	mo_producao_pct_padrao NUMERIC(8,4) DEFAULT 30 NOT NULL,
	mo_instalacao_pct_padrao NUMERIC(8,4) DEFAULT 15 NOT NULL,
	margem_minima_alerta NUMERIC(8,4) DEFAULT 25 NOT NULL,
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
	CONSTRAINT configuracoes_precificacao_tenant_id_unique UNIQUE (tenant_id)
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS configuracoes_precificacao_tenant_id_idx ON configuracoes_precificacao (tenant_id);
