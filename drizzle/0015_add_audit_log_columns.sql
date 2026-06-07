-- Migration 0015: Add LGPD columns to audit_logs (tenant isolation, IP, retention)
-- Compatível com o novo auditLogService.ts e auditMiddleware.ts

DO $$
BEGIN
  -- tenant_id: vincula o registro ao tenant (LGPD: trilha isolada por tenant)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'audit_logs' AND column_name = 'tenant_id'
  ) THEN
    ALTER TABLE audit_logs ADD COLUMN tenant_id UUID;
  END IF;

  -- table_name: nome da tabela afetada (compatível com entity_type existente)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'audit_logs' AND column_name = 'table_name'
  ) THEN
    ALTER TABLE audit_logs ADD COLUMN table_name TEXT;
  END IF;

  -- record_id: UUID do registro afetado (compatível com entity_id existente)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'audit_logs' AND column_name = 'record_id'
  ) THEN
    ALTER TABLE audit_logs ADD COLUMN record_id UUID;
  END IF;

  -- ip_address: endereço IP do usuário (LGPD: rastreabilidade)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'audit_logs' AND column_name = 'ip_address'
  ) THEN
    ALTER TABLE audit_logs ADD COLUMN ip_address TEXT;
  END IF;

  -- user_agent: fingerprint do browser
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'audit_logs' AND column_name = 'user_agent'
  ) THEN
    ALTER TABLE audit_logs ADD COLUMN user_agent TEXT;
  END IF;

  -- retention_expires_at: data de expiração LGPD (90 days por padrão)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'audit_logs' AND column_name = 'retention_expires_at'
  ) THEN
    ALTER TABLE audit_logs ADD COLUMN retention_expires_at TIMESTAMPTZ DEFAULT (CURRENT_TIMESTAMP + INTERVAL '90 days');
  END IF;

  -- timestamp: alias para created_at, usado pelo novo getAuditTrail()
  -- Já existe como created_at, adicionamos índice para consulta por período
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'idx_audit_logs_created_at'
  ) THEN
    CREATE INDEX idx_audit_logs_created_at ON audit_logs (created_at DESC);
  END IF;

  -- Índice composto para consulta de trilha por tenant + período
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'idx_audit_logs_tenant_timestamp'
  ) THEN
    CREATE INDEX idx_audit_logs_tenant_timestamp ON audit_logs (tenant_id, created_at DESC);
  END IF;
END $$;
