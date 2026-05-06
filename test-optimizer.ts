
import MaxRectsOptimizer from './src/modules/plano-corte/domain/services/MaxRectsOptimizer';

function testOverlap() {
  const larguraChapa = 2750;
  const alturaChapa = 1830;
  const kerf = 3;
  
  const optimizer = new MaxRectsOptimizer(larguraChapa, alturaChapa, kerf);
  
  // Criar 10 peças de 500x400
  const pecas = Array.from({ length: 10 }, (_, i) => ({
    id: `p${i}`,
    nome: `Peça ${i}`,
    largura: 500,
    altura: 400,
    rotacionavel: true
  }));

  const resultado = optimizer.otimizar(pecas);
  
  console.log(`Total de peças posicionadas: ${resultado.pecas_posicionadas.length}`);
  
  // Verificar sobreposição
  for (let i = 0; i < resultado.pecas_posicionadas.length; i++) {
    for (let j = i + 1; j < resultado.pecas_posicionadas.length; j++) {
      const p1 = resultado.pecas_posicionadas[i];
      const p2 = resultado.pecas_posicionadas[j];
      
      const p1_x2 = p1.x + p1.largura;
      const p1_y2 = p1.y + p1.altura;
      
      const p2_x2 = p2.x + p2.largura;
      const p2_y2 = p2.y + p2.altura;
      
      // Checar se há intersecção real (sem considerar kerf no desenho, apenas sobreposição física)
      const overlapX = Math.max(0, Math.min(p1_x2, p2_x2) - Math.max(p1.x, p2.x));
      const overlapY = Math.max(0, Math.min(p1_y2, p2_y2) - Math.max(p1.y, p2.y));
      
      if (overlapX > 0 && overlapY > 0) {
        console.error(`SOBREPOSIÇÃO DETECTADA entre ${p1.id} e ${p2.id}!`);
        console.error(`P1: x=${p1.x}, y=${p1.y}, w=${p1.largura}, h=${p1.altura}`);
        console.error(`P2: x=${p2.x}, y=${p2.y}, w=${p2.largura}, h=${p2.altura}`);
      }

      // Checar distância mínima (kerf)
      // Se as peças estão na mesma linha ou coluna, a distância entre elas deve ser >= kerf
      if (overlapX > 0) { // Estão na mesma faixa vertical
        const distY = Math.abs(p1.y - p2.y);
        if (distY > 0 && distY < Math.min(p1.altura, p2.altura) + kerf) {
           // Se p2 está abaixo de p1
           if (p2.y >= p1_y2 && p2.y < p1_y2 + kerf) {
             console.error(`ERRO DE KERF: Distância vertical entre ${p1.id} e ${p2.id} é ${p2.y - p1_y2}mm (esperado ${kerf}mm)`);
           }
        }
      }
    }
  }
}

testOverlap();
