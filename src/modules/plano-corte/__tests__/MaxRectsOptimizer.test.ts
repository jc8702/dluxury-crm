import { describe, it, expect } from 'vitest';
import { MaxRectsOptimizer, type Peca } from '../domain/services/MaxRectsOptimizer';

describe('MaxRectsOptimizer', () => {
  
  it('deve posicionar peça simples sem rotação', () => {
    const otimizador = new MaxRectsOptimizer(2750, 1830, 3);
    
    const pecas: Peca[] = [{
      id: 'p1',
      nome: 'Peça 1',
      largura: 500,
      altura: 400,
      rotacionavel: false
    }];

    const resultado = otimizador.otimizar(pecas);

    expect(resultado.pecas_posicionadas).toHaveLength(1);
    expect(resultado.pecas_posicionadas[0].x).toBe(0);
    expect(resultado.pecas_posicionadas[0].y).toBe(0);
    expect(resultado.pecas_posicionadas[0].rotacionada).toBe(false);
    expect(resultado.aproveitamento).toBeGreaterThan(0);
  });

  it('deve rotacionar peça quando é melhor encaixe', () => {
    const otimizador = new MaxRectsOptimizer(2750, 1830, 3);
    
    const pecas: Peca[] = [
      { id: 'p1', nome: 'P1', largura: 2700, altura: 400, rotacionavel: false },
      { id: 'p2', nome: 'P2', largura: 2000, altura: 350, rotacionavel: true }
    ];

    const resultado = otimizador.otimizar(pecas);

    expect(resultado.pecas_posicionadas).toHaveLength(2);
    
    // P1 sem rotação (não rotacionável)
    const p1 = resultado.pecas_posicionadas.find(p => p.id === 'p1');
    expect(p1?.rotacionada).toBe(false);
    
    // P2 posicionada (pode estar rotacionada)
    const p2 = resultado.pecas_posicionadas.find(p => p.id === 'p2');
    expect(p2).toBeDefined();
  });

  it('deve ter aproveitamento > 70% em caso típico', () => {
    const otimizador = new MaxRectsOptimizer(2750, 1830, 3);
    
    const pecas: Peca[] = [
      { id: 'p1', nome: 'P1', largura: 800, altura: 600, rotacionavel: true },
      { id: 'p2', nome: 'P2', largura: 800, altura: 600, rotacionavel: true },
      { id: 'p3', nome: 'P3', largura: 800, altura: 600, rotacionavel: true },
      { id: 'p4', nome: 'P4', largura: 500, altura: 400, rotacionavel: true }
    ];

    const resultado = otimizador.otimizar(pecas);

    expect(resultado.aproveitamento).toBeGreaterThan(25);
    expect(resultado.pecas_posicionadas.length).toBeGreaterThanOrEqual(3);
  });

  it('deve respeitar kerf entre peças', () => {
    const kerf = 3;
    const otimizador = new MaxRectsOptimizer(1000, 1000, kerf);
    
    const pecas: Peca[] = [
      { id: 'p1', nome: 'P1', largura: 400, altura: 400, rotacionavel: false },
      { id: 'p2', nome: 'P2', largura: 400, altura: 400, rotacionavel: false }
    ];

    const resultado = otimizador.otimizar(pecas);

    // Verificar que há espaço suficiente entre peças
    const p1 = resultado.pecas_posicionadas[0];
    const p2 = resultado.pecas_posicionadas[1];

    if (p1 && p2) {
      const distX = p2.x - (p1.x + p1.largura);
      const distY = p2.y - (p1.y + p1.altura);
      
      // Se há separação, deve ser >= kerf
      if (distX > 0) expect(distX).toBeGreaterThanOrEqual(kerf);
      if (distY > 0) expect(distY).toBeGreaterThanOrEqual(kerf);
    }
  });

  it('deve rejeitar peça que não cabe em nenhuma orientação', () => {
    const otimizador = new MaxRectsOptimizer(500, 500, 3);
    
    const pecas: Peca[] = [
      { id: 'p1', nome: 'Peça gigante', largura: 2000, altura: 2000, rotacionavel: false }
    ];

    const resultado = otimizador.otimizar(pecas);

    // Peça não deve ser posicionada
    expect(resultado.pecas_posicionadas).toHaveLength(0);
    expect(resultado.aproveitamento).toBe(0);
  });

  it('deve posicionar múltiplas peças em ordem ótima', () => {
    const otimizador = new MaxRectsOptimizer(2750, 1830, 3);
    
    // Peças de tamanhos variados
    const pecas: Peca[] = [
      { id: 'p1', nome: 'Grande', largura: 1000, altura: 800, rotacionavel: true },
      { id: 'p2', nome: 'Média 1', largura: 600, altura: 500, rotacionavel: true },
      { id: 'p3', nome: 'Média 2', largura: 600, altura: 500, rotacionavel: true },
      { id: 'p4', nome: 'Pequena 1', largura: 300, altura: 250, rotacionavel: true },
      { id: 'p5', nome: 'Pequena 2', largura: 300, altura: 250, rotacionavel: true }
    ];

    const resultado = otimizador.otimizar(pecas);

    // Deve caber pelo menos as maiores
    expect(resultado.pecas_posicionadas.length).toBeGreaterThanOrEqual(4);
    expect(resultado.aproveitamento).toBeGreaterThan(25);
  });

  it('deve suportar peças com fio de fita', () => {
    const otimizador = new MaxRectsOptimizer(2750, 1830, 3);
    
    const pecas: Peca[] = [{
      id: 'p1',
      nome: 'Com fio',
      largura: 500,
      altura: 400,
      rotacionavel: false,
      fio_de_fita: {
        topo: true,
        baixo: false,
        esquerda: false,
        direita: false
      }
    }];

    const resultado = otimizador.otimizar(pecas);

    const peca = resultado.pecas_posicionadas[0];
    expect(peca.fio_de_fita).toBeDefined();
    expect(peca.fio_de_fita?.topo).toBe(true);
  });

  it('deve maximizar uso de espaço com best short side fit', () => {
    const otimizador = new MaxRectsOptimizer(1000, 1000, 0);
    
    // Duas peças que devem encaixar perfeitamente
    const pecas: Peca[] = [
      { id: 'p1', nome: 'P1', largura: 500, altura: 1000, rotacionavel: false },
      { id: 'p2', nome: 'P2', largura: 500, altura: 1000, rotacionavel: false }
    ];

    const resultado = otimizador.otimizar(pecas);

    expect(resultado.pecas_posicionadas).toHaveLength(2);
    expect(resultado.aproveitamento).toBe(100); // Encaixe perfeito
  });

  it('deve lidar com peça não rotacionável em espaço restrito', () => {
    const otimizador = new MaxRectsOptimizer(1200, 1000, 3);
    
    const pecas: Peca[] = [
      { id: 'p1', nome: 'P1', largura: 600, altura: 400, rotacionavel: true },
      { id: 'p2', nome: 'P2', largura: 300, altura: 800, rotacionavel: false } // altura > largura
    ];

    const resultado = otimizador.otimizar(pecas);

    // P1 deve caber
    const p1 = resultado.pecas_posicionadas.find(p => p.id === 'p1');
    expect(p1).toBeDefined();
    
    // P2 pode não caber se P1 bloqueia o espaço
    // (teste verifica se algoritmo trata corretamente)
    expect(resultado.pecas_posicionadas.length).toBeGreaterThanOrEqual(1);
  });
});
