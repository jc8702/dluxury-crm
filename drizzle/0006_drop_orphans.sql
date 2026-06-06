-- Migration 0006: Drop orphan tables and resolve shadow declarations.
-- ADR-2026-06-05-01 / audit 2026-06-05 §1.1.
-- All tables in this list have ZERO references in src/** other than
-- their own declaration. Idempotent via IF EXISTS.

-- =====================================================================
-- Audit / logs (movidos para um único audit_logs consolidado)
-- =====================================================================

DROP TABLE IF EXISTS system_logs           CASCADE;

-- =====================================================================
-- Inventário (collision: erp_inventory is the canonical name)
-- =====================================================================

DROP TABLE IF EXISTS inventory             CASCADE;

-- =====================================================================
-- Agenda (substituída por eventos + notificacoes_calendario)
-- =====================================================================

DROP TABLE IF EXISTS tipos_evento_config   CASCADE;
DROP TABLE IF EXISTS eventos_agenda        CASCADE;
DROP TABLE IF EXISTS eventos_historico     CASCADE;

-- =====================================================================
-- Configuração / catálogo órfão
-- =====================================================================

DROP TABLE IF EXISTS categorias_material   CASCADE;
DROP TABLE IF EXISTS projeto_parametros    CASCADE;
DROP TABLE IF EXISTS erp_subfamilies       CASCADE;
DROP TABLE IF EXISTS historico_chamado     CASCADE;

-- =====================================================================
-- Marcador: shadow re-declarações em Drizzle schema foram resolvidas
-- manualmente em src/db/schema/*.ts. Nenhuma tabela precisa ser dropada
-- aqui; as duplicatas foram apagadas no commit desta migration.
-- =====================================================================

COMMENT ON SCHEMA public IS
  'D''Luxury CRM — pós-auditoria 2026-06-05. Tabelas devem ter tenant_id; '
  'use Drizzle (src/db/schema/*) como source of truth. '
  'drizzle/schema.ts é gerado, NÃO editar manualmente.';
