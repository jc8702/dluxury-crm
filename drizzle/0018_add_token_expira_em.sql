-- Migration 0018: quotations.token_expira_em (S-04)
-- Link de aprovação público passa a expirar (GET ?token= → 410 quando expirado).
-- TTL padrão: 15 dias. Na geração do link o valor é definido via APROVACAO_TTL_DIAS.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quotations' AND column_name = 'token_expira_em'
  ) THEN
    ALTER TABLE quotations ADD COLUMN token_expira_em TIMESTAMPTZ;
  END IF;
END $$;

-- Backfill: tokens já emitidos passam a expirar em 15 dias (evita links eternos).
-- Idempotente: só preenche onde ainda está NULL.
UPDATE quotations
SET token_expira_em = NOW() + INTERVAL '15 days'
WHERE token_aprovacao IS NOT NULL
  AND token_expira_em IS NULL;
