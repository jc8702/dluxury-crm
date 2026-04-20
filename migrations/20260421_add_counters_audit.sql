-- Migration: adicionar tabela counters e colunas de auditoria/soft-delete em titulos_receber

BEGIN;

-- counters
CREATE TABLE IF NOT EXISTS counters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entidade varchar(100) NOT NULL,
  chave varchar(100),
  seq integer DEFAULT 0,
  criado_em timestamp DEFAULT now()
);
CREATE INDEX IF NOT EXISTS counters_entidade_idx ON counters(entidade);

-- colunas auditoria/soft-delete em titulos_receber
ALTER TABLE titulos_receber
  ADD COLUMN IF NOT EXISTS criado_por uuid,
  ADD COLUMN IF NOT EXISTS atualizado_por uuid,
  ADD COLUMN IF NOT EXISTS deletado boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS excluido_em timestamp;

COMMIT;
