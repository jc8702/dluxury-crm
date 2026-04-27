import 'dotenv/config';
import { sql } from '../src/api-lib/_db.js';

async function main() {
  console.log('Executando migração de retalhos (Neon Direct)...');
  
  try {
    await sql`DROP VIEW IF EXISTS retalhos_estatisticas CASCADE`;
    await sql`DROP VIEW IF EXISTS retalhos_disponiveis CASCADE`;
    await sql`DROP TABLE IF EXISTS retalhos_estoque CASCADE`;

    await sql`CREATE TABLE IF NOT EXISTS retalhos_estoque (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      largura_mm INTEGER NOT NULL CHECK (largura_mm >= 100 AND largura_mm <= 3000),
      altura_mm INTEGER NOT NULL CHECK (altura_mm >= 100 AND altura_mm <= 2500),
      espessura_mm INTEGER NOT NULL CHECK (espessura_mm >= 3 AND espessura_mm <= 50),
      CONSTRAINT area_minima CHECK (largura_mm * altura_mm >= 90000),
      sku_chapa VARCHAR(100) NOT NULL,
      origem VARCHAR(50) NOT NULL CHECK (origem IN ('sobra_plano_corte', 'devolucao', 'manual', 'ajuste')),
      plano_corte_origem_id UUID,
      projeto_origem VARCHAR(255),
      observacoes TEXT,
      disponivel BOOLEAN NOT NULL DEFAULT true,
      utilizado_em_id UUID,
      data_utilizacao TIMESTAMPTZ,
      descartado BOOLEAN NOT NULL DEFAULT false,
      motivo_descarte VARCHAR(255),
      data_descarte TIMESTAMPTZ,
      localizacao VARCHAR(100),
      criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      usuario_criou VARCHAR(100),
      usuario_atualizou VARCHAR(100),
      metadata JSONB DEFAULT '{}'::jsonb
    )`;

    await sql`CREATE INDEX IF NOT EXISTS idx_retalhos_disponivel_sku ON retalhos_estoque(sku_chapa, disponivel, descartado) WHERE disponivel = true AND descartado = false`;
    await sql`CREATE INDEX IF NOT EXISTS idx_retalhos_tamanho ON retalhos_estoque(largura_mm, altura_mm) WHERE disponivel = true AND descartado = false`;
    await sql`CREATE INDEX IF NOT EXISTS idx_retalhos_area ON retalhos_estoque((largura_mm * altura_mm)) WHERE disponivel = true AND descartado = false`;
    await sql`CREATE INDEX IF NOT EXISTS idx_retalhos_criado ON retalhos_estoque(criado_em) WHERE disponivel = true AND descartado = false`;
    await sql`CREATE INDEX IF NOT EXISTS idx_retalhos_origem ON retalhos_estoque(plano_corte_origem_id) WHERE plano_corte_origem_id IS NOT NULL`;
    await sql`CREATE INDEX IF NOT EXISTS idx_retalhos_utilizacao ON retalhos_estoque(utilizado_em_id) WHERE utilizado_em_id IS NOT NULL`;
    await sql`CREATE INDEX IF NOT EXISTS idx_retalhos_otimizacao ON retalhos_estoque(sku_chapa, (largura_mm * altura_mm), criado_em) WHERE disponivel = true AND descartado = false`;

    await sql`CREATE OR REPLACE FUNCTION atualizar_timestamp_retalho() RETURNS TRIGGER AS $$ BEGIN NEW.atualizado_em = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql`;
    await sql`DROP TRIGGER IF EXISTS trigger_atualizar_timestamp ON retalhos_estoque`;
    await sql`CREATE TRIGGER trigger_atualizar_timestamp BEFORE UPDATE ON retalhos_estoque FOR EACH ROW EXECUTE FUNCTION atualizar_timestamp_retalho()`;

    await sql`CREATE OR REPLACE FUNCTION validar_utilizacao_retalho() RETURNS TRIGGER AS $$ BEGIN IF NEW.utilizado_em_id IS NOT NULL AND OLD.utilizado_em_id IS NULL THEN NEW.data_utilizacao = NOW(); NEW.disponivel = false; END IF; IF NEW.descartado = true AND OLD.descartado = false THEN NEW.data_descarte = NOW(); NEW.disponivel = false; END IF; RETURN NEW; END; $$ LANGUAGE plpgsql`;
    await sql`DROP TRIGGER IF EXISTS trigger_validar_utilizacao ON retalhos_estoque`;
    await sql`CREATE TRIGGER trigger_validar_utilizacao BEFORE UPDATE ON retalhos_estoque FOR EACH ROW EXECUTE FUNCTION validar_utilizacao_retalho()`;

    await sql`CREATE OR REPLACE VIEW retalhos_disponiveis AS SELECT id, largura_mm, altura_mm, espessura_mm, sku_chapa, (largura_mm * altura_mm) AS area_mm2, origem, plano_corte_origem_id, projeto_origem, observacoes, localizacao, criado_em, EXTRACT(EPOCH FROM (NOW() - criado_em)) / 86400 AS dias_estoque FROM retalhos_estoque WHERE disponivel = true AND descartado = false`;

    await sql`CREATE OR REPLACE VIEW retalhos_estatisticas AS SELECT sku_chapa, COUNT(*) AS total_retalhos, SUM(CASE WHEN disponivel = true AND descartado = false THEN 1 ELSE 0 END) AS disponiveis, SUM(CASE WHEN disponivel = false AND descartado = false THEN 1 ELSE 0 END) AS utilizados, SUM(CASE WHEN descartado = true THEN 1 ELSE 0 END) AS descartados, SUM(largura_mm * altura_mm) FILTER (WHERE disponivel = true AND descartado = false) AS area_total_disponivel_mm2, AVG(largura_mm * altura_mm) FILTER (WHERE disponivel = true AND descartado = false) AS area_media_mm2, MIN(criado_em) FILTER (WHERE disponivel = true AND descartado = false) AS retalho_mais_antigo, MAX(criado_em) FILTER (WHERE disponivel = true AND descartado = false) AS retalho_mais_recente FROM retalhos_estoque GROUP BY sku_chapa`;

    await sql`CREATE OR REPLACE FUNCTION buscar_retalhos_compativeis(p_sku VARCHAR(100), p_largura_min INTEGER, p_altura_min INTEGER) RETURNS TABLE (id UUID, largura_mm INTEGER, altura_mm INTEGER, area_mm2 BIGINT, criado_em TIMESTAMPTZ) AS $$ BEGIN RETURN QUERY SELECT r.id, r.largura_mm, r.altura_mm, (r.largura_mm * r.altura_mm)::BIGINT AS area_mm2, r.criado_em FROM retalhos_estoque r WHERE r.sku_chapa = p_sku AND r.disponivel = true AND r.descartado = false AND r.largura_mm >= p_largura_min AND r.altura_mm >= p_altura_min ORDER BY (r.largura_mm * r.altura_mm) ASC, r.criado_em ASC; END; $$ LANGUAGE plpgsql`;

    console.log('Migração concluída com sucesso!');
  } catch (err) {
    console.error('Erro na migração:', err);
    process.exit(1);
  }
  process.exit(0);
}

main();
