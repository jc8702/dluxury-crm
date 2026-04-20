-- Migration: melhorias em titulos_pagar (condicao_pagamento_id, auditoria e soft-delete)

BEGIN;

ALTER TABLE titulos_pagar
  ADD COLUMN IF NOT EXISTS condicao_pagamento_id uuid REFERENCES condicoes_pagamento(id),
  ADD COLUMN IF NOT EXISTS criado_por uuid,
  ADD COLUMN IF NOT EXISTS atualizado_por uuid,
  ADD COLUMN IF NOT EXISTS deletado boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS excluido_em timestamp;

COMMIT;
