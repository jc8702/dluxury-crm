import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import type { LayoutSimulacao, SimulationProgram, SimulationMetrics, CncConfig, SetupDiff, IssueWithRecommendation } from '../../domain/types';

/**
 * Exporta um relatório técnico em formato PDF com os dados de simulação CNC e métricas de ciclo.
 */
export async function exportarRelatorioCNC(
  layout: LayoutSimulacao,
  program: SimulationProgram,
  metrics: SimulationMetrics,
  nomePlano: string = 'Simulação CNC'
) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // Cabeçalho Premium Industrial
  doc.setFillColor(17, 24, 39); // Cinza escuro (bg do app)
  doc.rect(0, 0, 210, 38, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(226, 172, 0); // Amarelo/Âmbar (#E2AC00)
  doc.text("RELATÓRIO DE SIMULAÇÃO CNC", 14, 16);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(156, 163, 175);
  doc.text(`D'LUXURY AMBIENTES SOB MEDIDA - MÓDULO CAM/VERIFICATION`, 14, 23);
  doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 14, 28);

  // Quadro de Informações do Plano
  doc.setFillColor(243, 244, 246);
  doc.rect(14, 45, 182, 28, 'F');
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(17, 24, 39);
  doc.text(`Identificação do Plano: ${nomePlano}`, 18, 51);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Chapa Selecionada: ${layout.chapa.sku}`, 18, 58);
  doc.text(`Dimensões MDF: ${layout.chapa.largura} x ${layout.chapa.altura} x ${layout.chapa.espessura} mm`, 18, 64);
  doc.text(`Aproveitamento Nominal: ${layout.aproveitamento_percentual.toFixed(1)}% | Peças Posicionadas: ${layout.pecas.length} UN`, 18, 69);

  // 1. MÉTRICAS DO CICLO CNC (Seção central)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(226, 172, 0);
  doc.text("1. PARÂMETROS E MÉTRICAS DE EXECUÇÃO", 14, 84);
  doc.line(14, 86, 196, 86);

  // Colunas de métricas
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(17, 24, 39);

  const formatarTempo = (seg: number) => {
    const mins = Math.floor(seg / 60);
    const secs = Math.floor(seg % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')} min`;
  };

  const col1X = 20;
  const col2X = 110;

  // Linha 1
  doc.text(`Tempo Total Estimado:`, col1X, 94);
  doc.setFont('helvetica', 'normal');
  doc.text(`${formatarTempo(metrics.tempoTotal)}`, col1X + 45, 94);

  doc.setFont('helvetica', 'bold');
  doc.text(`Distância Total do Percurso:`, col2X, 94);
  doc.setFont('helvetica', 'normal');
  doc.text(`${(metrics.distanciaTotal / 1000).toFixed(2)} metros`, col2X + 50, 94);

  // Linha 2
  doc.setFont('helvetica', 'bold');
  doc.text(`Tempo de Corte Efetivo:`, col1X, 101);
  doc.setFont('helvetica', 'normal');
  doc.text(`${formatarTempo(metrics.tempoCorte)}`, col1X + 45, 101);

  doc.setFont('helvetica', 'bold');
  doc.text(`Avanço Linear de Corte:`, col2X, 101);
  doc.setFont('helvetica', 'normal');
  doc.text(`4.500 mm/min`, col2X + 50, 101);

  // Linha 3
  doc.setFont('helvetica', 'bold');
  doc.text(`Tempo de Deslocamento Rápido:`, col1X, 108);
  doc.setFont('helvetica', 'normal');
  doc.text(`${formatarTempo(metrics.tempoRapido)}`, col1X + 45, 108);

  doc.setFont('helvetica', 'bold');
  doc.text(`Velocidade Eixos (Máx.):`, col2X, 108);
  doc.setFont('helvetica', 'normal');
  doc.text(`18.000 mm/min`, col2X + 50, 108);

  // Linha 4
  doc.setFont('helvetica', 'bold');
  doc.text(`Eficiência de Percurso:`, col1X, 115);
  doc.setFont('helvetica', 'normal');
  doc.text(`${((metrics.tempoCorte / metrics.tempoTotal) * 100).toFixed(1)}%`, col1X + 45, 115);

  doc.setFont('helvetica', 'bold');
  doc.text(`Volume de Resíduos (Cavacos):`, col2X, 115);
  doc.setFont('helvetica', 'normal');
  doc.text(`${(metrics.volumeRemovidoMm3 / 1000).toFixed(1)} cm³`, col2X + 50, 115);

  // 2. QUADRO DE ANÁLISE DE SEGURANÇA E COLISÕES
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(226, 172, 0);
  doc.text("2. VERIFICAÇÃO DE SEGURANÇA E SETUP", 14, 130);
  doc.line(14, 132, 196, 132);

  if (program.issues.length === 0) {
    doc.setFillColor(240, 253, 244);
    doc.rect(14, 138, 182, 14, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(22, 101, 52); // Verde escuro
    doc.text("NENHUM ERRO OU COLISÃO DETECTADOS.", 20, 144);
    doc.setFont('helvetica', 'normal');
    doc.text("O percurso de corte está seguro e validado para execução no chão de fábrica.", 20, 148);
  } else {
    let issueY = 138;
    program.issues.forEach((issue) => {
      const isError = issue.severidade === 'error';
      doc.setFillColor(isError ? 254 : 255, isError ? 242 : 251, isError ? 242 : 235);
      doc.rect(14, issueY, 182, 15, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(isError ? 153 : 146, isError ? 27 : 64, isError ? 27 : 14);
      doc.text(`[${issue.codigo}] ${issue.mensagem} (${formatarTempo(issue.tempo)})`, 18, issueY + 5);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(75, 85, 99);
      doc.text(`${issue.descricao} Sugestão: ${issue.sugestao}`, 18, issueY + 11);

      issueY += 17;
    });
  }

  // 3. TABELA DE PEÇAS A SEREM IDENTIFICADAS
  const pecasY = Math.max(165, 145 + (program.issues.length * 17) + 15);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(226, 172, 0);
  doc.text("3. COMPONENTES DO NESTING DE CORTE", 14, pecasY);
  doc.line(14, pecasY + 2, 196, pecasY + 2);

  // Tabela simples de peças
  let currentY = pecasY + 8;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(17, 24, 39);
  doc.text("ID Peça", 16, currentY);
  doc.text("Nome da Peça / SKU", 32, currentY);
  doc.text("Comprimento", 100, currentY);
  doc.text("Largura", 130, currentY);
  doc.text("Posição (X, Y)", 160, currentY);
  doc.line(14, currentY + 2, 196, currentY + 2);

  doc.setFont('helvetica', 'normal');
  layout.pecas.forEach((peca, idx) => {
    currentY += 7;
    if (currentY > 280) {
      doc.addPage();
      currentY = 20;
    }
    doc.text(`#${idx + 1}`, 16, currentY);
    doc.text(`${peca.nome}`, 32, currentY);
    doc.text(`${peca.comprimento} mm`, 100, currentY);
    doc.text(`${peca.largura} mm`, 130, currentY);
    doc.text(`X:${peca.x} Y:${peca.y}`, 160, currentY);
  });

  doc.save(`relatorio-cnc-${nomePlano.replace(/\s+/g, '-').toLowerCase()}.pdf`);
}

/**
 * Exporta etiquetas individuais em formato PDF com código QR rastreável para cada peça e retalho do layout.
 */
export async function exportarEtiquetasCNC(
  layout: LayoutSimulacao,
  nomePlano: string = 'Simulação CNC'
) {
  // Configuração de etiqueta térmica industrial (100x50mm)
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: [100, 50],
  });

  let isFirstPage = true;

  // 1. ETIQUETAS DAS PEÇAS DO PLANO
  for (let i = 0; i < layout.pecas.length; i++) {
    const peca = layout.pecas[i];

    if (!isFirstPage) {
      doc.addPage();
    }
    isFirstPage = false;

    // Cabeçalho da Etiqueta
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(17, 24, 39);
    doc.text(`${peca.nome.substring(0, 24)}`, 5, 8);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(75, 85, 99);
    doc.text(`Plano: ${nomePlano.substring(0, 20)}`, 5, 13);
    doc.text(`Origem Chapa: ${layout.chapa.sku.substring(0, 20)}`, 5, 17);

    // Dimensões grandes para o operador identificar rápido
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(226, 172, 0); // Âmbar
    doc.text(`${peca.comprimento} x ${peca.largura} mm`, 5, 26);

    // Detalhe de espessura e rotação
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(75, 85, 99);
    doc.text(`MDF Espessura: ${peca.espessura}mm`, 5, 32);
    doc.text(`Rotacionada: ${peca.rotacionada ? 'SIM' : 'NÃO'}`, 5, 36);
    doc.text(`Posicionamento: X:${peca.x} Y:${peca.y}`, 5, 41);
    doc.text(`ID Peça: #${i + 1}`, 5, 46);

    // QR Code dinâmico para rastreamento de fábrica
    try {
      const qrData = JSON.stringify({
        id: peca.id,
        nome: peca.nome,
        comprimento: peca.comprimento,
        largura: peca.largura,
        espessura: peca.espessura,
        plano: nomePlano,
      });

      const qrCodeUrl = await QRCode.toDataURL(qrData, {
        errorCorrectionLevel: 'M',
        margin: 1,
        width: 100,
      });

      doc.addImage(qrCodeUrl, 'PNG', 68, 4, 28, 28);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6);
      doc.setTextColor(156, 163, 175);
      doc.text("SCAN RASTREAMENTO", 82, 34, { align: 'center' });
    } catch (err) {
      console.warn("Erro ao gerar código QR na etiqueta:", err);
    }
  }

  // 2. ETIQUETAS PARA OS RETALHOS/OFFCUTS (Mínimo de 300x300mm)
  // Calculamos os mesmos retalhos que aparecem na cena 3D para gerar etiquetas físicas de sobra reaproveitável
  const freeSpaces = layout.espacos_vazios || [];
  let retalhoIndex = 0;

  for (const esp of freeSpaces) {
    // Apenas retalhos úteis grandes (mínimo de 300x300mm)
    if (esp.largura >= 300 && esp.altura >= 300) {
      retalhoIndex++;

      if (!isFirstPage) {
        doc.addPage();
      }
      isFirstPage = false;

      // Cabeçalho da Etiqueta de Sobra
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(16, 185, 129); // Verde Esmeralda (#10B981)
      doc.text(`SOBRA APROVEITÁVEL (RETALHO) #${retalhoIndex}`, 5, 8);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(75, 85, 99);
      doc.text(`Origem: ${layout.chapa.sku.substring(0, 20)}`, 5, 13);
      doc.text(`Plano de Origem: ${nomePlano.substring(0, 20)}`, 5, 17);

      // Dimensões grandes
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.setTextColor(16, 185, 129);
      doc.text(`${esp.largura} x ${esp.altura} mm`, 5, 26);

      // Cálculo de metragem quadrada do retalho
      const areaM2 = (esp.largura * esp.altura / 1e6).toFixed(2);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(75, 85, 99);
      doc.text(`Área Útil: ${areaM2} m²`, 5, 32);
      doc.text(`Espessura: ${layout.chapa.espessura}mm`, 5, 36);
      doc.text(`Coordenadas: X:${esp.x} Y:${esp.y}`, 5, 41);
      doc.text("Retornar ao estoque físico.", 5, 46);

      // QR Code do Retalho
      try {
        const qrData = JSON.stringify({
          tipo: 'retalho',
          origem: layout.chapa.sku,
          largura: esp.largura,
          altura: esp.altura,
          espessura: layout.chapa.espessura,
          area: areaM2,
        });

        const qrCodeUrl = await QRCode.toDataURL(qrData, {
          errorCorrectionLevel: 'M',
          margin: 1,
          width: 100,
        });

        doc.addImage(qrCodeUrl, 'PNG', 68, 4, 28, 28);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6);
        doc.setTextColor(16, 185, 129);
        doc.text("RETALHO CADASTRADO", 82, 34, { align: 'center' });
      } catch (err) {
        console.warn("Erro ao gerar QR code do retalho:", err);
      }
    }
  }

  doc.save(`etiquetas-cnc-${nomePlano.replace(/\s+/g, '-').toLowerCase()}.pdf`);
}

export interface SafetyReportData {
  config: CncConfig;
  diffs: SetupDiff[];
  issuesWithRecs: IssueWithRecommendation[];
  totalErrors: number;
  totalWarnings: number;
  totalResolved: number;
  totalBlocked: number;
}

export async function exportarRelatorioSeguranca(
  report: SafetyReportData,
  nomePlano: string = 'Simulação CNC',
  dataSimulacao?: { tempoTotal: number; distanciaTotal: number }
) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const { config, diffs, issuesWithRecs, totalErrors, totalWarnings, totalResolved, totalBlocked } = report;
  const fmtTempo = (seg: number) => `${Math.floor(seg / 60).toString().padStart(2, '0')}:${Math.floor(seg % 60).toString().padStart(2, '0')} min`;

  // Cabeçalho
  doc.setFillColor(17, 24, 39);
  doc.rect(0, 0, 210, 38, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(226, 172, 0);
  doc.text("RELATÓRIO DE SEGURANÇA CNC", 14, 16);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(156, 163, 175);
  doc.text(`D'LUXURY AMBIENTES SOB MEDIDA - MÓDULO CAM/VERIFICATION`, 14, 23);
  doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 14, 28);

  // Sumário executivo
  const summaryY = 45;
  doc.setFillColor(totalErrors > 0 ? 254 : 240, totalErrors > 0 ? 242 : 253, totalErrors > 0 ? 242 : 244);
  doc.rect(14, summaryY, 182, 24, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(totalErrors > 0 ? 153 : 22, totalErrors > 0 ? 27 : 101, totalErrors > 0 ? 27 : 52);
  doc.text(totalErrors > 0
    ? `⚠ ${totalErrors} ERRO(S) DETECTADO(S) — INTERVENÇÃO RECOMENDADA`
    : `✓ NENHUM ERRO — SIMULAÇÃO SEGURA`, 18, summaryY + 7);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(75, 85, 99);
  doc.text(`Warnings: ${totalWarnings} | Resolvíveis: ${totalResolved} | Bloqueados: ${totalBlocked}`, 18, summaryY + 16);

  if (dataSimulacao) {
    doc.text(`Tempo total: ${fmtTempo(dataSimulacao.tempoTotal)} | Distância: ${(dataSimulacao.distanciaTotal / 1000).toFixed(2)} m`, 18, summaryY + 22);
  }

  // 1. Diffs aplicados
  let yPos = summaryY + 32;
  if (diffs.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(16, 185, 129);
    doc.text("AJUSTES AUTOMÁTICOS APLICADOS", 14, yPos);
    doc.line(14, yPos + 1, 196, yPos + 1);
    yPos += 8;

    diffs.forEach((d) => {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(75, 85, 99);
      doc.text(`${d.paramName}: ${d.before} ${d.unit} → ${d.after} ${d.unit}`, 18, yPos);
      yPos += 5;
    });
    yPos += 4;
  }

  // 2. Política de colisão
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(226, 172, 0);
  doc.text("POLÍTICA DE COLISÃO", 14, yPos);
  doc.line(14, yPos + 1, 196, yPos + 1);
  yPos += 8;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(75, 85, 99);

  const policyLabels: Record<string, string> = {
    stop: 'PARAR EM COLISÃO — Bloqueia qualquer ajuste automático',
    suggest: 'SUGERIR AJUSTE — Exibe recomendações e aguarda confirmação',
    auto: 'AUTO-AJUSTAR SEGURO — Aplica correções automáticas',
  };
  doc.text(`Política atual: ${policyLabels[config.machine.collisionPolicy] || config.machine.collisionPolicy}`, 18, yPos);
  yPos += 10;

  // 3. Configuração da máquina
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(226, 172, 0);
  doc.text("CONFIGURAÇÃO DA MÁQUINA", 14, yPos);
  doc.line(14, yPos + 1, 196, yPos + 1);
  yPos += 8;

  const params = [
    ['SafeZ', `${config.machine.safeZ} mm`],
    ['Feed Corte', `${config.machine.feedCorte} mm/min`],
    ['Feed Mergulho', `${config.machine.feedMergulho} mm/min`],
    ['Feed Rápido', `${config.machine.feedRapido} mm/min`],
    ['RPM Spindle', `${config.machine.rpmSpindle} rpm`],
    ['Diâmetro Ferramenta', `${config.machine.diametroFerramenta} mm`],
    ['Stickout', `${config.machine.stickout} mm`],
    ['Stepdown', `${config.machine.stepdown} mm`],
    ['Lead-In', `${config.machine.leadInDist} mm`],
    ['Lead-Out', `${config.machine.leadOutDist} mm`],
    ['Margem Clamp', `${config.machine.clampingMargin} mm`],
    ['Z Máx', `${config.machine.alturaMaximaZ} mm`],
    ['Limite X', `${config.machine.limiteX[0]}–${config.machine.limiteX[1]} mm`],
    ['Limite Y', `${config.machine.limiteY[0]}–${config.machine.limiteY[1]} mm`],
  ];

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(75, 85, 99);
  let colX = 18;
  let colIdx = 0;
  params.forEach(([label, value]) => {
    if (colIdx > 0 && colIdx % 2 === 0) { colX = 18; yPos += 5; }
    doc.text(`${label}: ${value}`, colX, yPos);
    colX += 95;
    colIdx++;
  });
  yPos += 8;

  // 4. Clamps
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(226, 172, 0);
  doc.text(`CLAMPS (${config.fixture.clamps.length})`, 14, yPos);
  doc.line(14, yPos + 1, 196, yPos + 1);
  yPos += 8;

  if (config.fixture.clamps.length > 0) {
    config.fixture.clamps.forEach((c) => {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(75, 85, 99);
      doc.text(`${c.id}: X=${c.x} Y=${c.y} ${c.largura}x${c.altura}mm`, 18, yPos);
      yPos += 4.5;
      if (yPos > 275) { doc.addPage(); yPos = 20; }
    });
  } else {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(156, 163, 175);
    doc.text("Nenhum clamp definido. Usando clamps padrão.", 18, yPos);
    yPos += 5;
  }
  yPos += 4;

  // 5. Issues detectados
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(226, 172, 0);
  doc.text("HISTÓRICO DE ANOMALIAS DETECTADAS", 14, yPos);
  doc.line(14, yPos + 1, 196, yPos + 1);
  yPos += 8;

  if (issuesWithRecs.length === 0) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(22, 101, 52);
    doc.text("Nenhuma anomalia detectada. Simulação segura para execução.", 18, yPos);
  } else {
    issuesWithRecs.forEach((iwr) => {
      if (yPos > 270) { doc.addPage(); yPos = 20; }
      const issue = iwr.issue;
      const isError = issue.severidade === 'error';
      doc.setFillColor(isError ? 254 : 255, isError ? 242 : 251, isError ? 242 : 235);
      doc.rect(14, yPos - 1, 182, 16, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(isError ? 185 : 146, isError ? 28 : 64, isError ? 28 : 14);
      doc.text(`[${issue.codigo}] ${issue.mensagem} (${fmtTempo(issue.tempo)})`, 18, yPos + 3);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(75, 85, 99);
      doc.text(`Posição: X:${issue.posicao.x.toFixed(0)} Y:${issue.posicao.y.toFixed(0)} Z:${issue.posicao.z.toFixed(0)}`, 18, yPos + 8);
      doc.text(`Sugestão: ${issue.sugestao}`, 18, yPos + 12);

      if (iwr.bestRecommendation) {
        const rec = iwr.bestRecommendation;
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(226, 172, 0);
        doc.text(`→ ${rec.paramName}: ${rec.oldValue} → ${rec.newValue}`, 60, yPos + 8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(107, 114, 128);
        doc.text(rec.explanation.substring(0, 70), 60, yPos + 12);
      }
      yPos += 18;
    });
  }

  // Rodapé
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7);
  doc.setTextColor(156, 163, 175);
  doc.text("D'LUXURY AMBIENTES SOB MEDIDA — CNC Safety Report v1.0", 14, 290);
  doc.text(`Página ${(doc as any).internalQueryObjectID || 1}`, 180, 290, { align: 'right' });

  doc.save(`relatorio-seguranca-${nomePlano.replace(/\s+/g, '-').toLowerCase()}.pdf`);
}
