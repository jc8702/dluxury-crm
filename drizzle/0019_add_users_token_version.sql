-- Migration 0019: users.token_version + users.ativo (S-05)
-- Motivo: JWT de 7 dias aceitava usuário deletado/inativo (middleware só validava tenant).
-- - token_version: incrementado em troca de senha; claim no JWT deve casar (401 se divergir).
-- - ativo: soft-disable; middleware rejeita 401 quando false.
-- Idempotente (IF NOT EXISTS). NÃO executar em produção — apenas branch audit-2026-09.

ALTER TABLE users ADD COLUMN IF NOT EXISTS token_version integer NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS ativo boolean DEFAULT true;
