import { ExportadorGCode } from './src/modules/plano-de-corte/infrastructure/exports/ExportadorGCode';

const mockSuperficie = {
  largura: 2750,
  altura: 1830,
  pecasPositionadas: [
    {
      descricao: 'Lateral Gaveta Esq',
      x: 0,
      y: 0,
      largura: 500,
      altura: 400
    },
    {
      descricao: 'Frente Gaveta',
      x: 520,
      y: 0,
      largura: 800,
      altura: 200
    }
  ]
};

console.log("=== INICIANDO GERAÇÃO DE G-CODE DE TESTE ===\n");
const gcode = ExportadorGCode.gerarGCodeString(mockSuperficie, 0, 3);
console.log(gcode);
console.log("\n=== FIM DO TESTE ===");
