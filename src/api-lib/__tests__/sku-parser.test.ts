import { describe, it, expect } from 'vitest';
import { parseSKU, validarEstrutura, analisarSKUCompleto } from '../sku-parser.js';

describe('Marcenaria SKU Parser & Validador de Engenharia', () => {
  
  describe('Análise Semântica de SKUs (Mapeamento de Siglas)', () => {
    it('deve parsear corretamente um SKU de balcão de cozinha com gavetas e portas em MDF 18mm', () => {
      const parsed = parseSKU('BALC-COZ-1200-2P-GAV-MDF18');
      expect(parsed.categoria).toBe('Balcão');
      expect(parsed.ambiente).toBe('Cozinha');
      expect(parsed.dimensoes.largura_mm).toBe(1200);
      expect(parsed.portas).toBe(2);
      expect(parsed.gavetas).toBe(1);
      expect(parsed.material).toBe('MDF');
      expect(parsed.espessura_mm).toBe(18);
      expect(parsed.tipoPorta).toBe('giro');
    });

    it('deve parsear corretamente um roupeiro de dormitório com portas de correr', () => {
      const parsed = parseSKU('ROU-DOR-2400-3P-RUN-MDF18');
      expect(parsed.categoria).toBe('Roupeiro');
      expect(parsed.ambiente).toBe('Dormitório');
      expect(parsed.dimensoes.largura_mm).toBe(2400);
      expect(parsed.portas).toBe(3);
      expect(parsed.tipoPorta).toBe('correr');
      expect(parsed.material).toBe('MDF');
      expect(parsed.espessura_mm).toBe(18);
    });

    it('deve parsear corretamente um aéreo basculante de banheiro', () => {
      const parsed = parseSKU('AER-BAN-800-BASC-MDF15');
      expect(parsed.categoria).toBe('Aéreo');
      expect(parsed.ambiente).toBe('Banheiro');
      expect(parsed.dimensoes.largura_mm).toBe(800);
      expect(parsed.tipoPorta).toBe('basculante');
      expect(parsed.material).toBe('MDF');
      expect(parsed.espessura_mm).toBe(15);
    });

    it('deve lidar com dimensões compostas como L X A X P', () => {
      const parsed = parseSKU('ARM-COZ-1200X600X350-2P-MDF18');
      expect(parsed.categoria).toBe('Armário');
      expect(parsed.dimensoes.largura_mm).toBe(1200);
      expect(parsed.dimensoes.altura_mm).toBe(600);
      expect(parsed.dimensoes.profundidade_mm).toBe(350);
      expect(parsed.material).toBe('MDF');
      expect(parsed.espessura_mm).toBe(18);
    });

    it('deve extrair características adicionais como LED, Espelho, Amortecedor e Branco', () => {
      const parsed = parseSKU('ARM-ROU-2400-3P-ESP-LED-AMORT-BR');
      expect(parsed.caracteristicasExtra).toContain('Espelhado');
      expect(parsed.caracteristicasExtra).toContain('Iluminação LED integrada');
      expect(parsed.caracteristicasExtra).toContain('Amortecimento');
      expect(parsed.caracteristicasExtra).toContain('Branco Diamante');
    });

    it('deve lidar com marcas de MDP e espessuras variadas', () => {
      const parsed = parseSKU('BALC-LAV-800-MDP15-TX');
      expect(parsed.categoria).toBe('Balcão');
      expect(parsed.ambiente).toBe('Lavanderia');
      expect(parsed.material).toBe('MDP');
      expect(parsed.espessura_mm).toBe(15);
      expect(parsed.caracteristicasExtra).toContain('Texturizado');
    });
  });

  describe('Validação Estrutural e Física de Engenharia', () => {
    it('deve gerar alerta crítico de flambagem em vãos livres de MDF 15mm acima de 800mm', () => {
      const parsed = parseSKU('BALC-COZ-900-2P-MDF15');
      const alertas = validarEstrutura(parsed);
      const criticos = alertas.filter(a => a.nivel === 'CRITICO');
      expect(criticos.length).toBeGreaterThan(0);
      expect(criticos[0].mensagem).toContain('Risco de Flambagem');
    });

    it('deve gerar apenas aviso em vãos de MDF 18mm entre 1000mm e 1200mm', () => {
      const parsed = parseSKU('BALC-COZ-1100-2P-MDF18');
      const alertas = validarEstrutura(parsed);
      const avisos = alertas.filter(a => a.nivel === 'AVISO');
      expect(avisos.length).toBeGreaterThan(0);
      expect(avisos[0].mensagem).toContain('Atenção à Flambagem');
    });

    it('deve gerar alerta crítico de torção de corrediças em gaveteiros com largura maior que 800mm', () => {
      const parsed = parseSKU('GAV-OFF-1000-4G-MDF18');
      const alertas = validarEstrutura(parsed);
      const criticos = alertas.filter(a => a.nivel === 'CRITICO');
      expect(criticos.length).toBeGreaterThan(0);
      expect(criticos[0].mensagem).toContain('Torção de Corrediça');
    });

    it('deve gerar aviso de fixação reforçada para móveis aéreos com largura maior ou igual a 1000mm', () => {
      const parsed = parseSKU('AER-COZ-1200-2P-MDF18');
      const alertas = validarEstrutura(parsed);
      const avisos = alertas.filter(a => a.nivel === 'AVISO');
      expect(avisos.length).toBeGreaterThan(0);
      expect(avisos.some(a => a.mensagem.includes('Reforço de Fixação'))).toBe(true);
    });

    it('deve gerar aviso de risco de empenamento para portas basculantes muito largas (>900mm)', () => {
      const parsed = parseSKU('AER-COZ-1000-1P-BASC-MDF18');
      const alertas = validarEstrutura(parsed);
      const avisos = alertas.filter(a => a.nivel === 'AVISO');
      expect(avisos.length).toBeGreaterThan(0);
      expect(avisos.some(a => a.mensagem.includes('Empenamento em Porta Basculante'))).toBe(true);
    });

    it('deve gerar aviso se profundidade do balcão de cozinha for inferior a 550mm', () => {
      const parsed = parseSKU('BALC-COZ-1200X600X500-2P-MDF18'); // L x A x P = 500 profundidade
      const alertas = validarEstrutura(parsed);
      const avisos = alertas.filter(a => a.nivel === 'AVISO');
      expect(avisos.length).toBeGreaterThan(0);
      expect(avisos.some(a => a.mensagem.includes('Profundidade de Balcão'))).toBe(true);
    });

    it('deve gerar aviso de tubo oblongo para vãos de roupeiro com largura maior que 900mm', () => {
      const parsed = parseSKU('ROU-DOR-1000-3P-MDF18');
      const alertas = validarEstrutura(parsed);
      const avisos = alertas.filter(a => a.nivel === 'AVISO');
      expect(avisos.length).toBeGreaterThan(0);
      expect(avisos.some(a => a.mensagem.includes('Cabideiro com Vão Muito Extenso'))).toBe(true);
    });

    it('deve gerar alerta crítico ao usar MDP em ambientes úmidos como banheiro', () => {
      const parsed = parseSKU('BALC-BAN-600-MDP15');
      const alertas = validarEstrutura(parsed);
      const criticos = alertas.filter(a => a.nivel === 'CRITICO');
      expect(criticos.length).toBeGreaterThan(0);
      expect(criticos[0].mensagem).toContain('Área Úmida');
    });

    it('não deve gerar alertas para móveis pequenos com espessura padrão segura', () => {
      const parsed = parseSKU('BALC-COZ-600-1P-MDF18');
      const alertas = validarEstrutura(parsed);
      expect(alertas.length).toBe(0);
    });
  });

  describe('30 Cenários de SKUs de Marcenaria (Cozinhas, Quartos, Banheiros e Corporativo)', () => {
    // Lista de SKUs cobrindo 30 casos de teste com e sem problemas estruturais
    const cenarios = [
      // 1-10: Cozinha (BALC, AER, PAN)
      { sku: 'BALC-COZ-600-1P-MDF18', categoria: 'Balcão', ambiente: 'Cozinha', hasAlerts: false },
      { sku: 'BALC-COZ-900-2P-MDF15', categoria: 'Balcão', ambiente: 'Cozinha', hasAlerts: true }, // Flambagem
      { sku: 'BALC-COZ-1200-2P-2G-MDF18', categoria: 'Balcão', ambiente: 'Cozinha', hasAlerts: true }, // Gavetas largas, Flambagem
      { sku: 'AER-COZ-800-2P-MDF15', categoria: 'Aéreo', ambiente: 'Cozinha', hasAlerts: true }, // Flambagem
      { sku: 'AER-COZ-1200-3P-MDF18', categoria: 'Aéreo', ambiente: 'Cozinha', hasAlerts: true }, // Fixação aéreo largo
      { sku: 'PAN-COZ-600-2P-MDF18', categoria: 'Paneleiro', ambiente: 'Cozinha', hasAlerts: false },
      { sku: 'AER-COZ-1000-BASC-MDF18', categoria: 'Aéreo', ambiente: 'Cozinha', hasAlerts: true }, // Basculante larga, Fixação
      { sku: 'BALC-COZ-1200X750X500-3P-MDF18', categoria: 'Balcão', ambiente: 'Cozinha', hasAlerts: true }, // Profundidade rasa
      { sku: 'AER-COZ-600-1P-MDF15', categoria: 'Aéreo', ambiente: 'Cozinha', hasAlerts: false },
      { sku: 'BALC-COZ-800-2P-MDF18', categoria: 'Balcão', ambiente: 'Cozinha', hasAlerts: false },

      // 11-20: Quartos/Dormitórios (ROU, CLO, NIC)
      { sku: 'ROU-DOR-2400-3P-RUN-MDF18', categoria: 'Roupeiro', ambiente: 'Dormitório', hasAlerts: true }, // Vão largo (2400)
      { sku: 'ROU-DOR-600-2P-MDF15', categoria: 'Roupeiro', ambiente: 'Dormitório', hasAlerts: false },
      { sku: 'CLO-DOR-1000-MDF15', categoria: 'Closet', ambiente: 'Dormitório', hasAlerts: true }, // Vão largo cabideiro
      { sku: 'NIC-DOR-400-MDF15', categoria: 'Nicho', ambiente: 'Dormitório', hasAlerts: false },
      { sku: 'ROU-DOR-1200-2P-MDF18', categoria: 'Roupeiro', ambiente: 'Dormitório', hasAlerts: true }, // Cabideiro > 900
      { sku: 'NIC-QUAR-900-MDF15', categoria: 'Nicho', ambiente: 'Quarto', hasAlerts: true }, // Flambagem
      { sku: 'CLO-QUAR-600-MDF18', categoria: 'Closet', ambiente: 'Quarto', hasAlerts: false },
      { sku: 'ARM-QUAR-800-2P-MDF18', categoria: 'Armário', ambiente: 'Quarto', hasAlerts: false },
      { sku: 'ROU-DOR-1600-4P-MDF18', categoria: 'Roupeiro', ambiente: 'Dormitório', hasAlerts: true }, // Cabideiro > 900
      { sku: 'ARM-DOR-700-2P-MDF15', categoria: 'Armário', ambiente: 'Dormitório', hasAlerts: false },

      // 21-30: Banheiro, Lavanderia, Sala e Corporativo (BAN, LAV, SAL, COR)
      { sku: 'BALC-BAN-600-MDP15', categoria: 'Balcão', ambiente: 'Banheiro', hasAlerts: true }, // MDP em Banheiro
      { sku: 'BALC-BAN-800-2P-MDF18', categoria: 'Balcão', ambiente: 'Banheiro', hasAlerts: false },
      { sku: 'BALC-LAV-950-2P-MDP15', categoria: 'Balcão', ambiente: 'Lavanderia', hasAlerts: true }, // Flambagem
      { sku: 'PAI-SAL-1800-MDF18', categoria: 'Painel', ambiente: 'Sala', hasAlerts: false },
      { sku: 'GAV-OFF-400-3G-MDF18', categoria: 'Gaveteiro', ambiente: 'Escritório', hasAlerts: false },
      { sku: 'GAV-COR-900-4G-MDF15', categoria: 'Gaveteiro', ambiente: 'Corporativo', hasAlerts: true }, // Gaveta muito larga, Flambagem
      { sku: 'BANC-COR-1500-MDF25', categoria: 'Bancada', ambiente: 'Corporativo', hasAlerts: false }, // Tampo grosso (25mm) resiste
      { sku: 'ARM-COR-1000-2P-MDF15', categoria: 'Armário', ambiente: 'Corporativo', hasAlerts: true }, // Flambagem
      { sku: 'BALC-BAN-700-1G-MDF15', categoria: 'Balcão', ambiente: 'Banheiro', hasAlerts: false },
      { sku: 'PAI-SAL-1200-MDF15', categoria: 'Painel', ambiente: 'Sala', hasAlerts: false }
    ];

    cenarios.forEach((caso, index) => {
      it(`[Caso ${index + 1}] deve processar corretamente o SKU ${caso.sku}`, () => {
        const analise = analisarSKUCompleto(caso.sku);
        expect(analise.sucesso).toBe(true);
        expect(analise.parsed.categoria).toBe(caso.categoria);
        expect(analise.parsed.ambiente).toBe(caso.ambiente);
        
        if (caso.hasAlerts) {
          expect(analise.alertas.length).toBeGreaterThan(0);
          expect(analise.sugestoesMelhoria.length).toBeGreaterThan(0);
        } else {
          expect(analise.alertas.filter(a => a.nivel === 'CRITICO' || a.nivel === 'AVISO').length).toBe(0);
        }
      });
    });
  });
});
