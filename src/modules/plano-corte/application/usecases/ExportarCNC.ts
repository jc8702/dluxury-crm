import type { LayoutChapa } from '../../domain/entities/CuttingPlan';

/**
 * EXPORTAR G-CODE PARA CNC
 * Gera arquivo G-code compatível com máquinas Biesse, SCM, Homag
 */

export interface ConfiguracaoCNC {
  velocidadeCorte: number; // mm/min
  profundidadeCorte: number; // mm (negativo)
  velocidadeAproximacao: number; // mm/min
  alturaSeguranca: number; // mm (acima da peça)
}

const CONFIG_PADRAO: ConfiguracaoCNC = {
  velocidadeCorte: 3000,
  profundidadeCorte: -19, // MDF 18mm + margem
  velocidadeAproximacao: 5000,
  alturaSeguranca: 5
};

export function exportarCNC(
  layout: LayoutChapa,
  config: ConfiguracaoCNC = CONFIG_PADRAO
): string {
  const linhas: string[] = [];

  // CABEÇALHO G-CODE
  linhas.push('; ════════════════════════════════════════════════════════');
  linhas.push('; PLANO DE CORTE - G-CODE');
  linhas.push(`; Gerado em: ${new Date().toISOString()}`);
  linhas.push(`; Chapa: ${layout.chapa_sku}`);
  linhas.push(`; Dimensões: ${layout.largura_original_mm}×${layout.altura_original_mm}mm`);
  linhas.push(`; Peças: ${layout.pecas_posicionadas.length}`);
  linhas.push('; ════════════════════════════════════════════════════════');
  linhas.push('');

  // INICIALIZAÇÃO
  linhas.push('G21 ; Unidades em milímetros');
  linhas.push('G90 ; Posicionamento absoluto');
  linhas.push('G17 ; Plano XY');
  linhas.push('M03 S18000 ; Ligar spindle 18000 RPM');
  linhas.push(`G00 Z${config.alturaSeguranca} ; Altura de segurança`);
  linhas.push('');

  // CORTAR CADA PEÇA
  layout.pecas_posicionadas.forEach((peca, idx) => {
    linhas.push(`; ───────────────────────────────────────────────────────`);
    linhas.push(`; PEÇA ${idx + 1}: ${peca.nome}`);
    linhas.push(`; Posição: (${peca.x}, ${peca.y})`);
    linhas.push(`; Tamanho: ${peca.largura}×${peca.altura}mm`);
    linhas.push(`; ───────────────────────────────────────────────────────`);

    // Definir pontos do retângulo
    const x1 = peca.x;
    const y1 = peca.y;
    const x2 = peca.x + peca.largura;
    const y2 = peca.y + peca.altura;

    // Mover para canto inferior esquerdo
    linhas.push(`G00 X${x1.toFixed(3)} Y${y1.toFixed(3)} ; Aproximar peça ${idx + 1}`);
    linhas.push(`G00 Z${config.alturaSeguranca} ; Altura segurança`);
    
    // Descer para profundidade de corte
    linhas.push(`G01 Z${config.profundidadeCorte} F${config.velocidadeAproximacao} ; Descer`);

    // Cortar perímetro (sentido horário)
    linhas.push(`G01 X${x2.toFixed(3)} Y${y1.toFixed(3)} F${config.velocidadeCorte} ; Corte inferior`);
    linhas.push(`G01 X${x2.toFixed(3)} Y${y2.toFixed(3)} F${config.velocidadeCorte} ; Corte direito`);
    linhas.push(`G01 X${x1.toFixed(3)} Y${y2.toFixed(3)} F${config.velocidadeCorte} ; Corte superior`);
    linhas.push(`G01 X${x1.toFixed(3)} Y${y1.toFixed(3)} F${config.velocidadeCorte} ; Corte esquerdo`);

    // Subir e próxima peça
    linhas.push(`G00 Z${config.alturaSeguranca} ; Subir`);
    linhas.push('');
  });

  // FINALIZAÇÃO
  linhas.push('; ════════════════════════════════════════════════════════');
  linhas.push('; FINALIZAÇÃO');
  linhas.push('; ════════════════════════════════════════════════════════');
  linhas.push('M05 ; Desligar spindle');
  linhas.push('G00 Z50 ; Subir completamente');
  linhas.push('G00 X0 Y0 ; Retornar origem');
  linhas.push('M30 ; Fim do programa');

  return linhas.join('\n');
}

export function salvarArquivoCNC(gcode: string, nomeArquivo: string = 'plano-corte.nc'): void {
  const blob = new Blob([gcode], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = nomeArquivo;
  link.click();
  URL.revokeObjectURL(url);
}
