import { Superficie } from '../../../utils/planodeCorte';

export class ExportadorGCode {
  static gerarGCodeString(superficie: Superficie, index: number, kerf: number): string {
    let gcode = `(Plano de Corte - Chapa ${index + 1})\n`;
    gcode += `(Dimensões: ${superficie.largura} x ${superficie.altura} mm)\n`;
    gcode += `G21 (Metrico)\nG90 (Absoluto)\nG0 Z50 (Seguranca)\n`;
    gcode += `M3 S18000 (Spindle On)\n\n`;

    const feedRate = 2000;
    const plungeRate = 500;
    const passDepth = 6;
    const thickness = 15; // mock para exemplo

    superficie.pecasPositionadas.forEach((peca) => {
      gcode += `(Peca: ${peca.descricao} - ${peca.largura}x${peca.altura})\n`;
      const x1 = peca.x;
      const y1 = peca.y;
      const x2 = peca.x + peca.largura;
      const y2 = peca.y + peca.altura;

      let currentDepth = 0;
      while (currentDepth < thickness) {
        currentDepth = Math.min(currentDepth + passDepth, thickness + 1); // +1 para cortar totalmente
        gcode += `G0 X${x1} Y${y1}\n`; // Aproxima
        gcode += `G1 Z-${currentDepth} F${plungeRate}\n`; // Desce
        gcode += `G1 X${x2} Y${y1} F${feedRate}\n`; // Corta base
        gcode += `G1 X${x2} Y${y2}\n`; // Corta direita
        gcode += `G1 X${x1} Y${y2}\n`; // Corta topo
        gcode += `G1 X${x1} Y${y1}\n`; // Corta esquerda
      }
      gcode += `G0 Z50\n\n`; // Sobe
    });

    gcode += `M5 (Spindle Off)\nG0 X0 Y0\nM30 (Fim)\n`;
    return gcode;
  }

  static exportarChapa(superficie: Superficie, index: number, kerf: number) {
    const gcode = this.gerarGCodeString(superficie, index, kerf);
    
    // Fallback if document is undefined (e.g. running in Node.js for tests)
    if (typeof document !== 'undefined') {
      const blob = new Blob([gcode], { type: 'text/plain' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `chapa_${index + 1}.gcode`;
      link.click();
    } else {
      console.log("ExportadorGCode: Ambiente sem DOM, ignorando download. Gcode gerado:\n", gcode.substring(0, 200) + '...');
    }
  }
}
