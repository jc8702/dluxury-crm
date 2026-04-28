import { describe, it, expect } from 'vitest';
import { HybridOptimizer } from '../domain/services/HybridOptimizer';
import { exportarCNC } from '../application/usecases/ExportarCNC';
import type { Peca } from '../domain/services/MaxRectsOptimizer';

describe('Validação Industrial do Plano de Corte', () => {
  
  const CHAPA_PADRAO = { largura: 2750, altura: 1830 };
  const KERF = 3;

  const PECAS_TESTE: Peca[] = [
    { id: '1', nome: 'Porta Armario', largura: 700, altura: 2100, rotacionavel: true },
    { id: '2', nome: 'Porta Armario', largura: 700, altura: 2100, rotacionavel: true },
    { id: '3', nome: 'Lateral Cozinha', largura: 550, altura: 800, rotacionavel: true },
    { id: '4', nome: 'Lateral Cozinha', largura: 550, altura: 800, rotacionavel: true },
    { id: '5', nome: 'Lateral Cozinha', largura: 550, altura: 800, rotacionavel: true },
    { id: '6', nome: 'Lateral Cozinha', largura: 550, altura: 800, rotacionavel: true },
    { id: '7', nome: 'Prateleira MDF', largura: 600, altura: 350, rotacionavel: true },
    { id: '8', nome: 'Prateleira MDF', largura: 600, altura: 350, rotacionavel: true },
    { id: '9', nome: 'Prateleira MDF', largura: 600, altura: 350, rotacionavel: true },
    { id: '10', nome: 'Prateleira MDF', largura: 600, altura: 350, rotacionavel: true },
    { id: '11', nome: 'Prateleira MDF', largura: 600, altura: 350, rotacionavel: true },
    { id: '12', nome: 'Tampo Mesa', largura: 1200, altura: 800, rotacionavel: false },
    { id: '13', nome: 'Fundo Gaveta', largura: 450, altura: 400, rotacionavel: true },
    { id: '14', nome: 'Fundo Gaveta', largura: 450, altura: 400, rotacionavel: true }
  ];

  it('deve otimizar o corte com aproveitamento superior a 80%', () => {
    const optimizer = new HybridOptimizer(CHAPA_PADRAO.largura, CHAPA_PADRAO.altura, KERF);
    const resultado = optimizer.otimizar(PECAS_TESTE, 50); // 50 iterações para alta qualidade

    console.log(`\n--- RESULTADO DA OTIMIZAÇÃO ---`);
    console.log(`Aproveitamento: ${resultado.aproveitamento.toFixed(2)}%`);
    console.log(`Peças Posicionadas: ${resultado.pecas_posicionadas.length}/${PECAS_TESTE.length}`);
    console.log(`Tempo de Cálculo: ${resultado.tempo_calculo_ms}ms`);

    expect(resultado.aproveitamento).toBeGreaterThan(80);
    expect(resultado.pecas_posicionadas.length).toBe(PECAS_TESTE.length);
  });

  it('deve gerar G-Code válido para a primeira chapa do plano', () => {
    const optimizer = new HybridOptimizer(CHAPA_PADRAO.largura, CHAPA_PADRAO.altura, KERF);
    const resultado = optimizer.otimizar(PECAS_TESTE, 10);

    // Mock de LayoutChapa para o exportador CNC
    const layout = {
      tipo: 'chapa_inteira' as const,
      chapa_sku: 'MDF-18MM-BRANCO',
      largura_original_mm: CHAPA_PADRAO.largura,
      altura_original_mm: CHAPA_PADRAO.altura,
      pecas_posicionadas: resultado.pecas_posicionadas,
      area_aproveitada_mm2: resultado.area_usada,
      area_desperdicada_mm2: resultado.area_total - resultado.area_usada
    };

    const gcode = exportarCNC(layout);
    
    console.log(`\n--- G-CODE GERADO (PREVIEW) ---`);
    console.log(gcode.substring(0, 500) + '...');

    expect(gcode).toContain('G21'); // Unidades mm
    expect(gcode).toContain('M03'); // Spindle ON
    expect(gcode).toContain('G01'); // Movimento linear
    expect(gcode).toContain('M30'); // Fim do programa
  });
});
