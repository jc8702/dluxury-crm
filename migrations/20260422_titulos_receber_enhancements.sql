-- Migration: melhorias em titulos_receber (condicao_pagamento_id) e auditoria em baixas

BEGIN;

ALTER TABLE titulos_receber
  ADD COLUMN IF NOT EXISTS condicao_pagamento_id uuid;

ALTER TABLE baixas
  ADD COLUMN IF NOT EXISTS criado_por uuid,
  ADD COLUMN IF NOT EXISTS atualizado_por uuid;

COMMIT;
