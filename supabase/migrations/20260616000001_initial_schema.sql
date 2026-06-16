-- Migration: Initial Schema (D'Luxury CRM)
-- Extraído do _init.ts e schema Drizzle

-- Clients
CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  razao_social TEXT, nome TEXT, cnpj TEXT, cpf TEXT, nome_fantasia TEXT, porte TEXT,
  data_abertura TEXT, cnae_principal TEXT, cnae_secundario TEXT, natureza_juridica TEXT,
  logradouro TEXT, endereco TEXT, numero TEXT, complemento TEXT, cep TEXT, bairro TEXT,
  municipio TEXT, cidade TEXT, uf TEXT, email TEXT, telefone TEXT,
  situacao_cadastral TEXT, data_situacao_cadastral TEXT, motivo_situacao TEXT,
  codigo_erp TEXT, historico TEXT, observacoes TEXT, frequencia_compra TEXT,
  tipo_imovel TEXT, comodos_interesse TEXT, origem TEXT,
  status TEXT DEFAULT 'ativo', created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Users
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, role TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ERP SKUs (Serviços e Produtos)
CREATE TABLE IF NOT EXISTS erp_skus (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku_code TEXT UNIQUE NOT NULL,
  nome TEXT NOT NULL,
  unidade_medida TEXT DEFAULT 'UN',
  preco_base DECIMAL(12,2) DEFAULT 0.00,
  atributos JSONB DEFAULT '{}',
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Materials
CREATE TABLE IF NOT EXISTS materiais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku TEXT, nome TEXT, descricao TEXT, categoria_id TEXT, subcategoria TEXT,
  unidade_compra TEXT, unidade_uso TEXT, fator_conversao DECIMAL(10,2) DEFAULT 1,
  estoque_atual DECIMAL(12,3) DEFAULT 0, estoque_minimo DECIMAL(12,3) DEFAULT 0,
  preco_custo DECIMAL(12,2) DEFAULT 0, preco_venda DECIMAL(12,2),
  margem_lucro DECIMAL(5,2), fornecedor_principal TEXT,
  cfop TEXT, ncm TEXT, observacoes TEXT, ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Orcamentos
CREATE TABLE IF NOT EXISTS orcamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id TEXT, projeto_id TEXT, visita_id TEXT, numero TEXT UNIQUE,
  status TEXT DEFAULT 'rascunho', valor_base DECIMAL(12,2),
  taxa_mensal DECIMAL(12,2), condicao_pagamento_id UUID,
  valor_final DECIMAL(12,2), prazo_entrega_dias INTEGER,
  prazo_tipo TEXT DEFAULT 'padrao', adicional_urgencia_pct DECIMAL(5,2) DEFAULT 0,
  observacoes TEXT, materiais_consumidos JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Projects
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id TEXT, client_name TEXT, ambiente TEXT NOT NULL,
  descricao TEXT, valor_estimado DECIMAL(12,2), valor_final DECIMAL(12,2),
  prazo_entrega DATE, status TEXT NOT NULL DEFAULT 'lead',
  etapa_producao TEXT, responsavel TEXT, observacoes TEXT,
  visita_id TEXT, orcamento_id TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Classes Financeiras
CREATE TABLE IF NOT EXISTS classes_financeiras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo VARCHAR(50) NOT NULL UNIQUE, nome VARCHAR(255) NOT NULL,
  tipo VARCHAR(20) NOT NULL, natureza VARCHAR(20) NOT NULL,
  pai_id UUID REFERENCES classes_financeiras(id),
  ativa BOOLEAN DEFAULT true, dt_limite TIMESTAMPTZ,
  permite_lancamento BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed services
INSERT INTO erp_skus (sku_code, nome, unidade_medida, preco_base, atributos, ativo) VALUES
('ajuste-porta-de-madeira-unidade', 'Ajuste porta de madeira (Unidade)', 'SV', 60.00, '{"categoria": "Marcenaria", "descricao": "Execução profissional do serviço: Ajuste porta de madeira (Unidade).", "moeda": "BRL", "garantia_dias": 90}', true),
('consertar-vazamentos-janelas-pias-banheiros', 'Consertar Vazamentos Janelas/Pias/Banheiros', 'SV', 70.00, '{"categoria": "Hidráulica", "descricao": "Execução profissional do serviço: Consertar Vazamentos Janelas/Pias/Banheiros.", "moeda": "BRL", "garantia_dias": 90}', true),
('conversao-lampada-reator-x-led', 'Conversão lâmpada reator x LED', 'SV', 60.00, '{"categoria": "Elétrica", "descricao": "Execução profissional do serviço: Conversão lâmpada reator x LED.", "moeda": "BRL", "garantia_dias": 90}', true),
('desentupimento-vaso-sanitario-e-mictorio', 'Desentupimento vaso sanitário e mictório', 'SV', 120.00, '{"categoria": "Hidráulica", "descricao": "Execução profissional do serviço: Desentupimento vaso sanitário e mictório.", "moeda": "BRL", "garantia_dias": 90}', true),
('desmontagem-de-guarda-roupa', 'Desmontagem de guarda-roupa', 'SV', 70.00, '{"categoria": "Montagem de Móveis", "descricao": "Execução profissional do serviço: Desmontagem de guarda-roupa.", "moeda": "BRL", "garantia_dias": 90}', true),
('instalar-disjuntor-unidade', 'Instalar Disjuntor (Unidade)', 'SV', 60.00, '{"categoria": "Elétrica", "descricao": "Execução profissional do serviço: Instalar Disjuntor (Unidade).", "moeda": "BRL", "garantia_dias": 90}', true),
('instalar-substituir-tomadas-unidade', 'Instalar/Substituir Tomadas (Unidade)', 'SV', 50.00, '{"categoria": "Elétrica", "descricao": "Execução profissional do serviço: Instalar/Substituir Tomadas (Unidade).", "moeda": "BRL", "garantia_dias": 90}', true),
('instalar-trocar-interruptores-unidade', 'Instalar/Trocar Interruptores (Unidade)', 'SV', 50.00, '{"categoria": "Elétrica", "descricao": "Execução profissional do serviço: Instalar/Trocar Interruptores (Unidade).", "moeda": "BRL", "garantia_dias": 90}', true),
('instalar-ponto-de-rede-de-internet-e-cabeamento', 'Instalar ponto de rede de internet e cabeamento', 'SV', 70.00, '{"categoria": "Instalação", "descricao": "Execução profissional do serviço: Instalar ponto de rede de internet e cabeamento.", "moeda": "BRL", "garantia_dias": 90}', true),
('instalar-lustre-luminaria-ou-spot-simples', 'Instalar lustre, luminária ou spot simples', 'SV', 50.00, '{"categoria": "Elétrica", "descricao": "Execução profissional do serviço: Instalar lustre, luminária ou spot simples.", "moeda": "BRL", "garantia_dias": 90}', true),
('instalar-trocar-sensor-de-presenca', 'Instalar/Trocar Sensor de presença', 'SV', 60.00, '{"categoria": "Elétrica", "descricao": "Execução profissional do serviço: Instalar/Trocar Sensor de presença.", "moeda": "BRL", "garantia_dias": 90}', true),
('instalar-ponto-de-agua-adicional-externo-parede-tubulacao-aparente', 'Instalar ponto de água adicional (externo parede) tubulação aparente', 'SV', 70.00, '{"categoria": "Hidráulica", "descricao": "Execução profissional do serviço: Instalar ponto de água adicional (externo parede) tubulação aparente.", "moeda": "BRL", "garantia_dias": 90}', true),
('instalar-ponto-de-agua-adicional-interno-parede-tubulacao-aparente', 'Instalar ponto de água adicional (interno parede) tubulação aparente', 'SV', 70.00, '{"categoria": "Hidráulica", "descricao": "Execução profissional do serviço: Instalar ponto de água adicional (interno parede) tubulação aparente.", "moeda": "BRL", "garantia_dias": 90}', true),
('instalar-maquina-de-lavar-roupa', 'Instalar Máquina de Lavar Roupa', 'SV', 80.00, '{"categoria": "Instalação", "descricao": "Execução profissional do serviço: Instalar Máquina de Lavar Roupa.", "moeda": "BRL", "garantia_dias": 90}', true),
('instalar-maquina-de-lavar-louca', 'Instalar Máquina de Lavar Louça', 'SV', 80.00, '{"categoria": "Instalação", "descricao": "Execução profissional do serviço: Instalar Máquina de Lavar Louça.", "moeda": "BRL", "garantia_dias": 90}', true),
('instalar-torneira-eletrica-com-ponto-eletrico-definido', 'Instalar Torneira Elétrica com ponto elétrico definido', 'SV', 60.00, '{"categoria": "Elétrica", "descricao": "Execução profissional do serviço: Instalar Torneira Elétrica com ponto elétrico definido.", "moeda": "BRL", "garantia_dias": 90}', true),
('instalar-filtro-ou-purificador-de-agua', 'Instalar Filtro ou purificador de Água', 'SV', 80.00, '{"categoria": "Hidráulica", "descricao": "Execução profissional do serviço: Instalar Filtro ou purificador de Água.", "moeda": "BRL", "garantia_dias": 90}', true),
('instalar-ou-substituir-tanque-porcelana-resina-ou-plastico', 'Instalar ou substituir tanque porcelana, resina ou plástico', 'SV', 80.00, '{"categoria": "Hidráulica", "descricao": "Execução profissional do serviço: Instalar ou substituir tanque porcelana, resina ou plástico.", "moeda": "BRL", "garantia_dias": 90}', true),
('instalar-quadros-e-espelhos-modelo-pequeno', 'Instalar Quadros e Espelhos (modelo pequeno)', 'SV', 50.00, '{"categoria": "Instalação", "descricao": "Execução profissional do serviço: Instalar Quadros e Espelhos (modelo pequeno).", "moeda": "BRL", "garantia_dias": 90}', true),
('instalar-quadros-e-espelhos-modelo-grande', 'Instalar Quadros e Espelhos (modelo grande)', 'SV', 60.00, '{"categoria": "Instalação", "descricao": "Execução profissional do serviço: Instalar Quadros e Espelhos (modelo grande).", "moeda": "BRL", "garantia_dias": 90}', true),
('instalar-ventilador-de-teto-unidade', 'Instalar Ventilador de Teto (Unidade)', 'SV', 90.00, '{"categoria": "Elétrica", "descricao": "Execução profissional do serviço: Instalar Ventilador de Teto (Unidade).", "moeda": "BRL", "garantia_dias": 90}', true),
('instalar-cortina-unidade', 'Instalar Cortina (Unidade)', 'SV', 70.00, '{"categoria": "Instalação", "descricao": "Execução profissional do serviço: Instalar Cortina (Unidade).", "moeda": "BRL", "garantia_dias": 90}', true),
('instalar-persiana-unidade', 'Instalar Persiana (Unidade)', 'SV', 70.00, '{"categoria": "Instalação", "descricao": "Execução profissional do serviço: Instalar Persiana (Unidade).", "moeda": "BRL", "garantia_dias": 90}', true),
('instalar-varal-teto-ou-externo-unidade', 'Instalar Varal Teto ou Externo (Unidade)', 'SV', 60.00, '{"categoria": "Instalação", "descricao": "Execução profissional do serviço: Instalar Varal Teto ou Externo (Unidade).", "moeda": "BRL", "garantia_dias": 90}', true),
('instalar-ou-substituir-prateleiras-por-unidade', 'Instalar ou Substituir Prateleiras (por unidade)', 'SV', 60.00, '{"categoria": "Montagem de Móveis", "descricao": "Execução profissional do serviço: Instalar ou Substituir Prateleiras (por unidade).", "moeda": "BRL", "garantia_dias": 90}', true),
('instalar-suporte-de-tv-painel-ou-parede-microondas', 'Instalar Suporte de TV Painel ou Parede / microondas', 'SV', 60.00, '{"categoria": "Instalação", "descricao": "Execução profissional do serviço: Instalar Suporte de TV Painel ou Parede / microondas.", "moeda": "BRL", "garantia_dias": 90}', true),
('instalacao-e-limpeza-de-chuveiro-eletrico-ou-eletronico', 'Instalação e limpeza de chuveiro elétrico ou eletrônico', 'SV', 50.00, '{"categoria": "Elétrica", "descricao": "Execução profissional do serviço: Instalação e limpeza de chuveiro elétrico ou eletrônico.", "moeda": "BRL", "garantia_dias": 90}', true),
('instalacao-ou-substituicao-vaso-sanitario', 'Instalação ou substituição vaso sanitário', 'SV', 150.00, '{"categoria": "Hidráulica", "descricao": "Execução profissional do serviço: Instalação ou substituição vaso sanitário.", "moeda": "BRL", "garantia_dias": 90}', true),
('instalacao-de-acessorios-de-banheiro', 'Instalação de acessórios de banheiro', 'SV', 70.00, '{"categoria": "Instalação", "descricao": "Execução profissional do serviço: Instalação de acessórios de banheiro.", "moeda": "BRL", "garantia_dias": 90}', true),
('instalacao-de-ducha-higienica', 'Instalação de ducha higiênica', 'SV', 60.00, '{"categoria": "Hidráulica", "descricao": "Execução profissional do serviço: Instalação de ducha higiênica.", "moeda": "BRL", "garantia_dias": 90}', true),
('instalacao-de-olho-magico', 'Instalação de olho mágico', 'SV', 60.00, '{"categoria": "Instalação", "descricao": "Execução profissional do serviço: Instalação de olho mágico.", "moeda": "BRL", "garantia_dias": 90}', true),
('instalacao-de-plafon-simples', 'Instalação de plafon simples', 'SV', 60.00, '{"categoria": "Elétrica", "descricao": "Execução profissional do serviço: Instalação de plafon simples.", "moeda": "BRL", "garantia_dias": 90}', true),
('instalacao-de-cooktop', 'Instalação de cooktop', 'SV', 90.00, '{"categoria": "Instalação", "descricao": "Execução profissional do serviço: Instalação de cooktop.", "moeda": "BRL", "garantia_dias": 90}', true),
('instalacao-de-coifa-depurador', 'Instalação de coifa/depurador', 'SV', 120.00, '{"categoria": "Instalação", "descricao": "Execução profissional do serviço: Instalação de coifa/depurador.", "moeda": "BRL", "garantia_dias": 90}', true),
('instalacao-de-campainha-sem-fio', 'Instalação de campainha sem fio', 'SV', 60.00, '{"categoria": "Elétrica", "descricao": "Execução profissional do serviço: Instalação de campainha sem fio.", "moeda": "BRL", "garantia_dias": 90}', true),
('limpeza-caixa-dagua-telhado-simples-ate-1-000-litros', 'Limpeza Caixa D''água Telhado Simples até 1.000 litros', 'SV', 80.00, '{"categoria": "Hidráulica", "descricao": "Execução profissional do serviço: Limpeza Caixa D''água Telhado Simples até 1.000 litros.", "moeda": "BRL", "garantia_dias": 90}', true),
('limpeza-caixa-dagua-telhado-sobrado-ate-1-000-litros', 'Limpeza Caixa D''água Telhado Sobrado até 1.000 litros', 'SV', 100.00, '{"categoria": "Hidráulica", "descricao": "Execução profissional do serviço: Limpeza Caixa D''água Telhado Sobrado até 1.000 litros.", "moeda": "BRL", "garantia_dias": 90}', true),
('limpeza-de-caixa-de-gordura-residencial', 'Limpeza de caixa de gordura residencial', 'SV', 100.00, '{"categoria": "Hidráulica", "descricao": "Execução profissional do serviço: Limpeza de caixa de gordura residencial.", "moeda": "BRL", "garantia_dias": 90}', true),
('limpeza-calha-telhado-simples', 'Limpeza Calha Telhado Simples', 'SV', 120.00, '{"categoria": "Limpeza", "descricao": "Execução profissional do serviço: Limpeza Calha Telhado Simples.", "moeda": "BRL", "garantia_dias": 90}', true),
('limpeza-calha-telhado-sobrado', 'Limpeza Calha Telhado Sobrado', 'SV', 200.00, '{"categoria": "Limpeza", "descricao": "Execução profissional do serviço: Limpeza Calha Telhado Sobrado.", "moeda": "BRL", "garantia_dias": 90}', true),
('manutencao-portas-e-gavetas-de-armarios-unidade', 'Manutenção Portas e Gavetas de Armários (unidade)', 'SV', 40.00, '{"categoria": "Marcenaria", "descricao": "Execução profissional do serviço: Manutenção Portas e Gavetas de Armários (unidade).", "moeda": "BRL", "garantia_dias": 90}', true),
('manutencao-em-portas-de-correr', 'Manutenção em portas de correr', 'SV', 100.00, '{"categoria": "Marcenaria", "descricao": "Execução profissional do serviço: Manutenção em portas de correr.", "moeda": "BRL", "garantia_dias": 90}', true),
('manutencao-janelas', 'Manutenção Janelas', 'SV', 70.00, '{"categoria": "Marcenaria", "descricao": "Execução profissional do serviço: Manutenção Janelas.", "moeda": "BRL", "garantia_dias": 90}', true),
('mao-de-obra-por-hora', 'Mão de obra por hora', 'SV', 50.00, '{"categoria": "Instalação", "descricao": "Execução profissional do serviço: Mão de obra por hora.", "moeda": "BRL", "garantia_dias": 90}', true),
('mao-de-obra-por-dia', 'Mão de obra por dia', 'SV', 220.00, '{"categoria": "Instalação", "descricao": "Execução profissional do serviço: Mão de obra por dia.", "moeda": "BRL", "garantia_dias": 90}', true),
('montagem-e-instalacao-de-nicho-ate-2-unidades', 'Montagem e instalação de nicho (até 2 unidades)', 'SV', 70.00, '{"categoria": "Montagem de Móveis", "descricao": "Execução profissional do serviço: Montagem e instalação de nicho (até 2 unidades).", "moeda": "BRL", "garantia_dias": 90}', true),
('montagem-de-ventilador', 'Montagem de ventilador', 'SV', 50.00, '{"categoria": "Elétrica", "descricao": "Execução profissional do serviço: Montagem de ventilador.", "moeda": "BRL", "garantia_dias": 90}', true),
('montagem-de-guarda-roupa-solteiro', 'Montagem de guarda-roupa solteiro', 'SV', 100.00, '{"categoria": "Montagem de Móveis", "descricao": "Execução profissional do serviço: Montagem de guarda-roupa solteiro.", "moeda": "BRL", "garantia_dias": 90}', true),
('montagem-de-guarda-roupa-casal', 'Montagem de guarda-roupa casal', 'SV', 150.00, '{"categoria": "Montagem de Móveis", "descricao": "Execução profissional do serviço: Montagem de guarda-roupa casal.", "moeda": "BRL", "garantia_dias": 90}', true),
('montagem-de-moveis-medios', 'Montagem de móveis médios', 'SV', 120.00, '{"categoria": "Montagem de Móveis", "descricao": "Execução profissional do serviço: Montagem de móveis médios.", "moeda": "BRL", "garantia_dias": 90}', true),
('manutencao-em-vaso-sanitario-vazamento', 'Manutenção em vaso sanitário/vazamento', 'SV', 120.00, '{"categoria": "Hidráulica", "descricao": "Execução profissional do serviço: Manutenção em vaso sanitário/vazamento.", "moeda": "BRL", "garantia_dias": 90}', true),
('mudanca-de-moveis-de-local-ou-ambiente-unidade', 'Mudança de móveis de local ou ambiente (unidade)', 'SV', 40.00, '{"categoria": "Montagem de Móveis", "descricao": "Execução profissional do serviço: Mudança de móveis de local ou ambiente (unidade).", "moeda": "BRL", "garantia_dias": 90}', true),
('pintura-reparadora-de-paredes-por-parede-do-ambiente', 'Pintura reparadora de paredes (por parede do ambiente)', 'SV', 90.00, '{"categoria": "Instalação", "descricao": "Execução profissional do serviço: Pintura reparadora de paredes (por parede do ambiente).", "moeda": "BRL", "garantia_dias": 90}', true),
('revisao-eletrica-ponto-simples', 'Revisão elétrica (ponto simples)', 'SV', 60.00, '{"categoria": "Elétrica", "descricao": "Execução profissional do serviço: Revisão elétrica (ponto simples).", "moeda": "BRL", "garantia_dias": 90}', true),
('substituir-lampada-comum-ate-1-unidade', 'Substituir Lâmpada comum até 1 unidade', 'SV', 50.00, '{"categoria": "Elétrica", "descricao": "Execução profissional do serviço: Substituir Lâmpada comum até 1 unidade.", "moeda": "BRL", "garantia_dias": 90}', true),
('substituir-lampada-comum-acima-de-1-unidade', 'Substituir Lâmpada comum acima de 1 unidade', 'SV', 60.00, '{"categoria": "Elétrica", "descricao": "Execução profissional do serviço: Substituir Lâmpada comum acima de 1 unidade.", "moeda": "BRL", "garantia_dias": 90}', true),
('substituir-lampadas-ate-3-unidades', 'Substituir Lâmpadas (até 3 unidades)', 'SV', 100.00, '{"categoria": "Elétrica", "descricao": "Execução profissional do serviço: Substituir Lâmpadas (até 3 unidades).", "moeda": "BRL", "garantia_dias": 90}', true),
('substituir-lampada-fluorescente-ate-1-unidade', 'Substituir Lâmpada fluorescente até 1 unidade', 'SV', 40.00, '{"categoria": "Elétrica", "descricao": "Execução profissional do serviço: Substituir Lâmpada fluorescente até 1 unidade.", "moeda": "BRL", "garantia_dias": 90}', true),
('substituir-lampada-fluorescente-acima-de-1-unidade', 'Substituir Lâmpada fluorescente acima de 1 unidade', 'SV', 60.00, '{"categoria": "Elétrica", "descricao": "Execução profissional do serviço: Substituir Lâmpada fluorescente acima de 1 unidade.", "moeda": "BRL", "garantia_dias": 90}', true),
('substituir-lampada-de-refletor-ate-1-unidade-ate-2-metros-de-altura', 'Substituir Lâmpada de refletor até 1 unidade até 2 metros de altura', 'SV', 60.00, '{"categoria": "Elétrica", "descricao": "Execução profissional do serviço: Substituir Lâmpada de refletor até 1 unidade até 2 metros de altura.", "moeda": "BRL", "garantia_dias": 90}', true),
('substituir-ou-consertar-vazamentos-sifao-vedantes', 'Substituir ou Consertar Vazamentos Sifão (vedantes)', 'SV', 60.00, '{"categoria": "Hidráulica", "descricao": "Execução profissional do serviço: Substituir ou Consertar Vazamentos Sifão (vedantes).", "moeda": "BRL", "garantia_dias": 90}', true),
('substituir-ou-consertar-torneiras-simples-vedantes-unidade', 'Substituir ou Consertar Torneiras Simples (vedantes/unidade)', 'SV', 60.00, '{"categoria": "Hidráulica", "descricao": "Execução profissional do serviço: Substituir ou Consertar Torneiras Simples (vedantes/unidade).", "moeda": "BRL", "garantia_dias": 90}', true),
('substituir-ou-consertar-torneiras-c-misturador-vedantes-unidade', 'Substituir ou Consertar Torneiras c/ misturador (vedantes/unidade)', 'SV', 80.00, '{"categoria": "Hidráulica", "descricao": "Execução profissional do serviço: Substituir ou Consertar Torneiras c/ misturador (vedantes/unidade).", "moeda": "BRL", "garantia_dias": 90}', true),
('substituir-reparo-descarga-ou-caixa-acoplada-simples-parcial-entrada-de-agua-ou-saida', 'Substituir Reparo Descarga ou Caixa Acoplada Simples (Parcial) entrada de água ou saída', 'SV', 70.00, '{"categoria": "Hidráulica", "descricao": "Execução profissional do serviço: Substituir Reparo Descarga ou Caixa Acoplada Simples (Parcial) entrada de água ou saída.", "moeda": "BRL", "garantia_dias": 90}', true),
('substituir-reparo-descarga-ou-caixa-acoplada-simples-completo', 'Substituir Reparo Descarga ou Caixa Acoplada Simples (Completo)', 'SV', 100.00, '{"categoria": "Hidráulica", "descricao": "Execução profissional do serviço: Substituir Reparo Descarga ou Caixa Acoplada Simples (Completo).", "moeda": "BRL", "garantia_dias": 90}', true),
('substituir-reparo-valvula-hydra', 'Substituir reparo válvula Hydra', 'SV', 90.00, '{"categoria": "Instalação", "descricao": "Execução profissional do serviço: Substituir reparo válvula Hydra.", "moeda": "BRL", "garantia_dias": 90}', true),
('substituir-reparo-valvula-docol', 'Substituir reparo válvula Docol', 'SV', 80.00, '{"categoria": "Instalação", "descricao": "Execução profissional do serviço: Substituir reparo válvula Docol.", "moeda": "BRL", "garantia_dias": 90}', true),
('substituir-reparo-valvula-oriente', 'Substituir reparo válvula Oriente', 'SV', 120.00, '{"categoria": "Instalação", "descricao": "Execução profissional do serviço: Substituir reparo válvula Oriente.", "moeda": "BRL", "garantia_dias": 90}', true),
('substituir-ou-instalar-tampa-de-vaso-sanitario', 'Substituir ou instalar tampa de vaso sanitário', 'SV', 50.00, '{"categoria": "Hidráulica", "descricao": "Execução profissional do serviço: Substituir ou instalar tampa de vaso sanitário.", "moeda": "BRL", "garantia_dias": 90}', true),
('substituir-boia-caixa-dagua', 'Substituir Bóia Caixa D''água', 'SV', 90.00, '{"categoria": "Hidráulica", "descricao": "Execução profissional do serviço: Substituir Bóia Caixa D''água.", "moeda": "BRL", "garantia_dias": 90}', true),
('substituir-telha-comum-telhado-simples-unidade', 'Substituir Telha Comum Telhado Simples (unidade)', 'SV', 60.00, '{"categoria": "Instalação", "descricao": "Execução profissional do serviço: Substituir Telha Comum Telhado Simples (unidade).", "moeda": "BRL", "garantia_dias": 90}', true),
('substituir-telha-comum-telhado-sobrado-unidade', 'Substituir Telha Comum Telhado Sobrado (unidade)', 'SV', 90.00, '{"categoria": "Instalação", "descricao": "Execução profissional do serviço: Substituir Telha Comum Telhado Sobrado (unidade).", "moeda": "BRL", "garantia_dias": 90}', true),
('substituir-ou-instalar-botijao-de-gas', 'Substituir ou Instalar Botijão de Gás', 'SV', 50.00, '{"categoria": "Instalação", "descricao": "Execução profissional do serviço: Substituir ou Instalar Botijão de Gás.", "moeda": "BRL", "garantia_dias": 90}', true),
('substituir-valvula-ou-mangueira-de-gas', 'Substituir Válvula ou mangueira de Gás', 'SV', 60.00, '{"categoria": "Instalação", "descricao": "Execução profissional do serviço: Substituir Válvula ou mangueira de Gás.", "moeda": "BRL", "garantia_dias": 90}', true),
('substituir-fechadura-porta-ou-janela-comum-unidade', 'Substituir Fechadura Porta ou Janela (Comum/Unidade)', 'SV', 60.00, '{"categoria": "Marcenaria", "descricao": "Execução profissional do serviço: Substituir Fechadura Porta ou Janela (Comum/Unidade).", "moeda": "BRL", "garantia_dias": 90}', true),
('substituir-dobradica-porta-comum-unidade', 'Substituir Dobradiça (Porta Comum/Unidade)', 'SV', 60.00, '{"categoria": "Marcenaria", "descricao": "Execução profissional do serviço: Substituir Dobradiça (Porta Comum/Unidade).", "moeda": "BRL", "garantia_dias": 90}', true),
('substituicao-ou-instalacao-porta-simples-porta-madeira', 'Substituição ou Instalação Porta simples (Porta madeira)', 'SV', 100.00, '{"categoria": "Marcenaria", "descricao": "Execução profissional do serviço: Substituição ou Instalação Porta simples (Porta madeira).", "moeda": "BRL", "garantia_dias": 90}', true),
('substituicao-pisos-e-azulejos-pecas-cada', 'Substituição Pisos e Azulejos (peças cada)', 'SV', 40.00, '{"categoria": "Instalação", "descricao": "Execução profissional do serviço: Substituição Pisos e Azulejos (peças cada).", "moeda": "BRL", "garantia_dias": 90}', true),
('trocar-resistencia-chuveiro-eletrico-ou-eletronico', 'Trocar Resistência Chuveiro Elétrico ou Eletrônico', 'SV', 60.00, '{"categoria": "Elétrica", "descricao": "Execução profissional do serviço: Trocar Resistência Chuveiro Elétrico ou Eletrônico.", "moeda": "BRL", "garantia_dias": 90}', true),
('trocar-registro-de-chuveiro', 'Trocar registro de chuveiro', 'SV', 60.00, '{"categoria": "Hidráulica", "descricao": "Execução profissional do serviço: Trocar registro de chuveiro.", "moeda": "BRL", "garantia_dias": 90}', true),
('trocar-disjuntor-unidade', 'Trocar Disjuntor (Unidade)', 'SV', 40.00, '{"categoria": "Elétrica", "descricao": "Execução profissional do serviço: Trocar Disjuntor (Unidade).", "moeda": "BRL", "garantia_dias": 90}', true),
('taxa-extra-servicos-no-raio-entre-10-a-15-km', 'Taxa extra serviços no raio entre 10 a 15 KM', 'SV', 20.00, '{"categoria": "Instalação", "descricao": "Execução profissional do serviço: Taxa extra serviços no raio entre 10 a 15 KM.", "moeda": "BRL", "garantia_dias": 90}', true),
('vedacao-com-silicone-pia-ou-banheira-ou-box', 'Vedação com silicone (pia ou banheira ou box)', 'SV', 90.00, '{"categoria": "Instalação", "descricao": "Execução profissional do serviço: Vedação com silicone (pia ou banheira ou box).", "moeda": "BRL", "garantia_dias": 90}', true)
ON CONFLICT (sku_code) DO UPDATE SET
  nome = EXCLUDED.nome, preco_base = EXCLUDED.preco_base,
  atributos = EXCLUDED.atributos, ativo = EXCLUDED.ativo;
