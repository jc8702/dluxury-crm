import type { LayoutChapa } from '../../domain/entities/CuttingPlan';

/**
 * EXPORTAR G-CODE PARA CNC (VERSÃO INDUSTRIAL PRO)
 * Gera arquivo G-code otimizado para acabamento fino e proteção da ferramenta.
 */

export interface ConfiguracaoCNC {
  velocidadeCorte: number;       // mm/min
  profundidadeTotal: number;    // mm (ex: -18.5)
  profundidadePasso: number;    // mm por passada (ex: 9.5 para fazer em 2x)
  velocidadeMergulho: number;   // mm/min (Feed Rate vertical)
  alturaSeguranca: number;      // mm (acima da chapa)
  spindleRPM: number;           // Rotação do motor
  leadInMm: number;             // Extensão de entrada para evitar marcas no ponto de mergulho
}

const CONFIG_PADRAO: ConfiguracaoCNC = {
  velocidadeCorte: 4500,        // Velocidade industrial padrão
  profundidadeTotal: -18.5,     // Atravessa levemente a chapa de 18mm
  profundidadePasso: 9.5,       // Executa o corte em 2 passadas para melhor acabamento
  velocidadeMergulho: 1200,     // Mergulho mais lento para preservar a fresa
  alturaSeguranca: 10,          // Margem segura contra grampos e ventosas
  spindleRPM: 18000,
  leadInMm: 5                   // Entrada suave
};

export function exportarCNC(
  layout: LayoutChapa,
  config: ConfiguracaoCNC = CONFIG_PADRAO
): string {
  const linhas: string[] = [];

  // CABEÇALHO G-CODE
  linhas.push('; ════════════════════════════════════════════════════════');
  linhas.push('; PLANO DE CORTE INDUSTRIAL - D\'LUXURY ERP');
  linhas.push(`; Gerado em: ${new Date().toLocaleString('pt-BR')}`);
  linhas.push(`; Chapa: ${layout.chapa_sku}`);
  linhas.push(`; Dimensões: ${layout.largura_original_mm}×${layout.altura_original_mm}mm`);
  linhas.push(`; Peças: ${layout.pecas_posicionadas.length}`);
  linhas.push(`; Passos: ${Math.ceil(Math.abs(config.profundidadeTotal / config.profundidadePasso))} passadas`);
  linhas.push('; ════════════════════════════════════════════════════════');
  linhas.push('');

  // INICIALIZAÇÃO
  linhas.push('G21 ; Unidades em milímetros');
  linhas.push('G90 ; Posicionamento absoluto');
  linhas.push('G17 ; Plano XY');
  linhas.push(`M03 S${config.spindleRPM} ; Iniciar Spindle`);
  linhas.push(`G00 Z${config.alturaSeguranca} ; Altura de segurança`);
  linhas.push('');

  // CORTAR CADA PEÇA
  layout.pecas_posicionadas.forEach((peca, idx) => {
    linhas.push(`; PEÇA ${idx + 1}: ${peca.nome} [${peca.largura}x${peca.altura}]`);
    
    // Coordenadas
    const x1 = peca.x;
    const y1 = peca.y;
    const x2 = peca.x + peca.largura;
    const y2 = peca.y + peca.altura;

    // Ponto de entrada com Lead-In (começa um pouco antes para evitar marcas)
    const entryX = x1 - config.leadInMm;
    const entryY = y1;

    // Movimentação rápida para o ponto inicial
    linhas.push(`G00 X${entryX.toFixed(3)} Y${entryY.toFixed(3)}`);
    
    // Cálculo de passadas
    const numPassadas = Math.ceil(Math.abs(config.profundidadeTotal / config.profundidadePasso));
    
    for (let p = 1; p <= numPassadas; p++) {
      let zAtual = -(p * config.profundidadePasso);
      // Garantir que não ultrapasse a profundidade total
      if (Math.abs(zAtual) > Math.abs(config.profundidadeTotal)) {
        zAtual = config.profundidadeTotal;
      }

      linhas.push(`; Passada ${p}/${numPassadas} [Z=${zAtual.toFixed(2)}]`);
      
      // Mergulho
      linhas.push(`G01 Z${zAtual.toFixed(2)} F${config.velocidadeMergulho}`);

      // Caminho de corte
      linhas.push(`G01 X${x1.toFixed(3)} Y${y1.toFixed(3)} F${config.velocidadeCorte} ; Lead-In`);
      linhas.push(`G01 X${x2.toFixed(3)} Y${y1.toFixed(3)} ; Inferior`);
      linhas.push(`G01 X${x2.toFixed(3)} Y${y2.toFixed(3)} ; Direita`);
      linhas.push(`G01 X${x1.toFixed(3)} Y${y2.toFixed(3)} ; Superior`);
      linhas.push(`G01 X${x1.toFixed(3)} Y${y1.toFixed(3)} ; Esquerda`);
    }

    // Retorno de segurança após peça finalizada
    linhas.push(`G00 Z${config.alturaSeguranca}`);
    linhas.push('');
  });

  // FINALIZAÇÃO
  linhas.push('; ════════════════════════════════════════════════════════');
  linhas.push('M05 ; Parar Spindle');
  linhas.push('G00 Z50 ; Retração total');
  linhas.push('G00 X0 Y0 ; Home');
  linhas.push('M30 ; Fim');

  return linhas.join('\n');
}

export function salvarArquivoCNC(gcode: string, nomeArquivo: string = 'plano-corte.nc'): void {
  if (typeof window === 'undefined') return;
  const blob = new Blob([gcode], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = nomeArquivo;
  link.click();
  URL.revokeObjectURL(url);
}
