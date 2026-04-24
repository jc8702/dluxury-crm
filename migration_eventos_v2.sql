
-- migration: create_eventos_unified.sql

-- ════════════════════════════════════════════════════════════════════
-- TABELA PRINCIPAL: eventos (SSOT)
-- ════════════════════════════════════════════════════════════════════

-- Remover tabelas antigas se necessário (com cautela, mas o usuário pediu do zero)
DROP TABLE IF EXISTS eventos_historico CASCADE;
DROP TABLE IF EXISTS tipos_evento_config CASCADE;
DROP TABLE IF EXISTS eventos CASCADE;

CREATE TABLE eventos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- TIPO E CLASSIFICAÇÃO
  tipo VARCHAR(30) NOT NULL CHECK (tipo IN ('visita', 'reuniao', 'compromisso', 'deadline', 'outro')),
  titulo VARCHAR(255) NOT NULL,
  descricao TEXT,
  
  -- TEMPORAL
  data_inicio TIMESTAMPTZ NOT NULL,
  data_fim TIMESTAMPTZ NOT NULL,
  dia_inteiro BOOLEAN DEFAULT false,
  
  -- RELACIONAMENTOS
  cliente_id INTEGER REFERENCES clients(id) ON DELETE SET NULL,
  projeto_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  
  -- ESPECÍFICO DE VISITAS
  endereco VARCHAR(500),
  objetivo VARCHAR(50) DEFAULT 'outro' CHECK (objetivo IN ('apresentacao', 'medicao', 'instalacao', 'pos_venda', 'outro') OR objetivo IS NULL),
  status_visita VARCHAR(30) CHECK (status_visita IN ('agendado', 'realizado', 'follow_up', 'cancelado')),
  resultado_visita TEXT,
  
  -- METADADOS
  criado_por UUID NOT NULL REFERENCES users(id),
  responsavel_id UUID NOT NULL REFERENCES users(id),
  cor VARCHAR(7),  -- hex color
  lembrete_minutos INTEGER,
  
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ DEFAULT NOW(),
  
  -- CONSTRAINTS
  CONSTRAINT visita_requer_cliente CHECK (
    tipo != 'visita' OR cliente_id IS NOT NULL
  ),
  CONSTRAINT visita_requer_status CHECK (
    tipo != 'visita' OR status_visita IS NOT NULL
  ),
  CONSTRAINT data_fim_depois_inicio CHECK (data_fim > data_inicio)
);

-- ÍNDICES PARA PERFORMANCE
CREATE INDEX idx_eventos_tipo ON eventos(tipo);
CREATE INDEX idx_eventos_status_visita ON eventos(status_visita) WHERE tipo = 'visita';
CREATE INDEX idx_eventos_data_inicio ON eventos(data_inicio);
CREATE INDEX idx_eventos_responsavel ON eventos(responsavel_id);
CREATE INDEX idx_eventos_cliente ON eventos(cliente_id) WHERE cliente_id IS NOT NULL;

-- ════════════════════════════════════════════════════════════════════
-- TABELA DE HISTÓRICO (Event Sourcing)
-- ════════════════════════════════════════════════════════════════════

CREATE TABLE eventos_historico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evento_id UUID NOT NULL REFERENCES eventos(id) ON DELETE CASCADE,
  campo_alterado VARCHAR(50) NOT NULL,
  valor_anterior TEXT,
  valor_novo TEXT,
  alterado_por UUID NOT NULL REFERENCES users(id),
  observacao TEXT,
  alterado_em TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_historico_evento ON eventos_historico(evento_id, alterado_em DESC);

-- ════════════════════════════════════════════════════════════════════
-- TABELA DE CONFIGURAÇÃO DE CORES
-- ════════════════════════════════════════════════════════════════════

CREATE TABLE tipos_evento_config (
  tipo VARCHAR(30) PRIMARY KEY,
  cor_padrao VARCHAR(7) NOT NULL,
  icone VARCHAR(50)
);

-- ════════════════════════════════════════════════════════════════════
-- FUNCTIONS E TRIGGERS
-- ════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION atualizar_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_atualizar_eventos
  BEFORE UPDATE ON eventos
  FOR EACH ROW
  EXECUTE FUNCTION atualizar_timestamp();

CREATE OR REPLACE FUNCTION registrar_mudanca_status_visita()
RETURNS TRIGGER AS $$
DECLARE
  v_alterado_por UUID;
BEGIN
  IF NEW.tipo = 'visita' AND (OLD.status_visita IS DISTINCT FROM NEW.status_visita) THEN
    BEGIN
      v_alterado_por := NEW.responsavel_id::UUID;
    EXCEPTION WHEN OTHERS THEN
      v_alterado_por := NULL;
    END;
    
    IF v_alterado_por IS NULL THEN
      SELECT id INTO v_alterado_por FROM users LIMIT 1;
    END IF;
    
    INSERT INTO eventos_historico (
      evento_id,
      campo_alterado,
      valor_anterior,
      valor_novo,
      alterado_por
    ) VALUES (
      NEW.id,
      'status_visita',
      COALESCE(OLD.status_visita, '')::TEXT,
      COALESCE(NEW.status_visita, '')::TEXT,
      v_alterado_por
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- TRIGGER DESABILITADO TEMPORARIAMENTE DEVIDO A PROBLEMAS DE TIPO
-- CREATE TRIGGER trigger_historico_status_visita
--   AFTER UPDATE ON eventos
--   FOR EACH ROW
--   EXECUTE FUNCTION registrar_mudanca_status_visita();

-- ════════════════════════════════════════════════════════════════════
-- SEED INICIAL
-- ════════════════════════════════════════════════════════════════════

INSERT INTO tipos_evento_config (tipo, cor_padrao, icone) VALUES
  ('visita', '#00A99D', 'calendar-user'),
  ('reuniao', '#E2AC00', 'users'),
  ('compromisso', '#3B82F6', 'calendar-check'),
  ('deadline', '#EF4444', 'alarm-clock'),
  ('outro', '#6B7280', 'calendar-days')
ON CONFLICT (tipo) DO UPDATE SET cor_padrao = EXCLUDED.cor_padrao, icone = EXCLUDED.icone;
