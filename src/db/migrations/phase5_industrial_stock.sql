-- Migration para adicionar estoque às chapas e retalhos
ALTER TABLE erp_chapas ADD COLUMN IF NOT EXISTS estoque integer DEFAULT 0;
ALTER TABLE erp_chapas ADD COLUMN IF NOT EXISTS estoque_minimo integer DEFAULT 5;

-- Garantir que a tabela de retalhos tenha os campos necessários para rastreabilidade
DO $$ BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'retalhos_estoque' AND column_name = 'utilizado_em_id') THEN
    ALTER TABLE retalhos_estoque ADD COLUMN utilizado_em_id uuid;
  END IF;
END $$;
