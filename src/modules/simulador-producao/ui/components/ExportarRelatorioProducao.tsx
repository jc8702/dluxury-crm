import { jsPDF } from 'jspdf';
import type { ProductionPieceInput, ProductionSimulationResult } from '../../domain/types';
import { formatEdgePattern, formatMinutes } from '../../domain/productionEngine';

function drawTable(doc: jsPDF, headers: string[], rows: string[][], startY: number, colWidths: number[], pageW: number) {
  const rowH = 6;
  const headerH = 7;
  let y = startY;

  doc.setFillColor(30, 41, 59);
  doc.rect(0, y, pageW, headerH, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6);
  doc.setTextColor(226, 172, 0);
  let x = 0;
  headers.forEach((h, i) => {
    doc.text(h, x + 2, y + 4.5);
    x += colWidths[i];
  });

  y += headerH;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.5);
  doc.setTextColor(209, 213, 219);

  rows.forEach((row, ri) => {
    if (y + rowH > 280) {
      doc.addPage();
      y = 20;
    }
    if (ri % 2 === 0) {
      doc.setFillColor(17, 24, 39);
      doc.rect(0, y, pageW, rowH, 'F');
    }
    x = 0;
    row.forEach((cell, ci) => {
      doc.text(cell, x + 2, y + 4);
      x += colWidths[ci];
    });
    y += rowH;
  });
  return y;
}

export async function exportarRelatorioProducao(
  nome: string,
  pieces: ProductionPieceInput[],
  result: ProductionSimulationResult,
) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = 210;
  const pageH = 297;

  // ---- PÁGINA 1: Capa ----
  doc.setFillColor(17, 24, 39);
  doc.rect(0, 0, pageW, pageH, 'F');

  doc.setFillColor(226, 172, 0);
  doc.rect(0, 0, pageW, 4, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(24);
  doc.setTextColor(255, 255, 255);
  doc.text('RELATÓRIO DE PRODUÇÃO', pageW / 2, 60, { align: 'center' });

  doc.setFontSize(14);
  doc.setTextColor(226, 172, 0);
  doc.text(nome.toUpperCase(), pageW / 2, 72, { align: 'center' });

  doc.setFontSize(9);
  doc.setTextColor(156, 163, 175);
  doc.text(`GERADO EM ${new Date().toLocaleDateString('pt-BR')} ÀS ${new Date().toLocaleTimeString('pt-BR')}`, pageW / 2, 84, { align: 'center' });

  doc.setDrawColor(55, 65, 81);
  doc.line(40, 92, 170, 92);

  const summaryData = [
    { label: 'ESTRATÉGIA', value: result.recommended.id === 'fluxo_continuo' ? 'FLUXO CONTÍNUO' : 'LOTE SEPARADO' },
    { label: 'GARGALO', value: result.bottleneck === 'coladeira' ? 'COLADEIRA DE FITA' : 'ESQUADREJADEIRA' },
    { label: 'TEMPO TOTAL', value: formatMinutes(result.recommended.makespanMinutes) },
    { label: 'PEÇAS NO LOTE', value: `${result.totalPieces}` },
    { label: 'METROS DE FITA', value: `${result.totalEdgeMeters.toFixed(2)} M` },
    { label: 'BUFFER SUGERIDO', value: `${result.bufferRecommendation} PEÇA(S)` },
  ];

  summaryData.forEach((item, i) => {
    const y = 106 + i * 9;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(156, 163, 175);
    doc.text(item.label, 50, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(255, 255, 255);
    doc.text(item.value, 130, y);
    if (i < summaryData.length - 1) {
      doc.setDrawColor(31, 41, 55);
      doc.line(50, y + 2, 160, y + 2);
    }
  });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(226, 172, 0);
  doc.text('RECOMENDAÇÕES', 50, 170);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(209, 213, 219);
  let recY = 178;
  result.recommendations.forEach((rec) => {
    if (recY > 260) {
      doc.addPage();
      recY = 30;
    }
    doc.text(`• ${rec}`, 50, recY);
    recY += 6;
  });

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(6);
  doc.setTextColor(75, 85, 99);
  doc.text(`D'LUXURY MÓVEIS — MÓDULO PRODUÇÃO`, pageW / 2, 290, { align: 'center' });

  // ---- PÁGINA 2: Peças ----
  doc.addPage();
  doc.setFillColor(17, 24, 39);
  doc.rect(0, 0, pageW, pageH, 'F');

  doc.setFillColor(226, 172, 0);
  doc.rect(0, 0, pageW, 2, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(255, 255, 255);
  doc.text('PEÇAS DO LOTE', 15, 16);

  doc.setFontSize(6);
  doc.setTextColor(156, 163, 175);
  doc.text(`${pieces.length} TIPOS DE PEÇA · ${result.totalPieces} UNIDADES NO TOTAL`, 15, 22);

  const pcHeaders = ['#', 'PEÇA', 'DIMENSÃO (MM)', 'QTD', 'FITA DE BORDA', 'CORTE', 'FITA'];
  const pcColWidths = [6, 40, 24, 10, 30, 16, 16];
  const pcRows = pieces.map((p, i) => [
    `${i + 1}`,
    p.nome.substring(0, 22),
    `${p.largura} × ${p.altura}`,
    `${p.quantidade}`,
    formatEdgePattern(p.fio_de_fita),
    formatMinutes(result.jobs[i]?.cutProcessMinutes || 0),
    formatMinutes(result.jobs[i]?.bandProcessMinutes || 0),
  ]);

  drawTable(doc, pcHeaders, pcRows, 28, pcColWidths, pageW);

  // ---- PÁGINA 3: Comparação de estratégias ----
  doc.addPage();
  doc.setFillColor(17, 24, 39);
  doc.rect(0, 0, pageW, pageH, 'F');
  doc.setFillColor(226, 172, 0);
  doc.rect(0, 0, pageW, 2, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(255, 255, 255);
  doc.text('COMPARAÇÃO: FLUXO CONTÍNUO vs LOTE SEPARADO', 15, 16);

  const strategies = [
    { title: 'FLUXO CONTÍNUO', data: result.flow, accent: [16, 185, 129] },
    { title: 'LOTE SEPARADO', data: result.batch, accent: [226, 172, 0] },
  ];

  strategies.forEach((s, si) => {
    const bx = si === 0 ? 15 : 110;
    const by = 26;
    const bw = 85;
    const bh = 110;

    doc.setDrawColor(31, 41, 55);
    doc.setFillColor(17, 24, 39);
    doc.roundedRect(bx, by, bw, bh, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(s.accent[0], s.accent[1], s.accent[2]);
    doc.text(s.title, bx + 6, by + 8);

    const metrics = [
      ['MAKESPAN', formatMinutes(s.data.makespanMinutes)],
      ['CORTE', formatMinutes(s.data.cutMinutes)],
      ['FITA', formatMinutes(s.data.bandMinutes)],
      ['ESPERA', formatMinutes(s.data.waitingMinutes)],
      ['SETUP SERRA', `${s.data.setupChanges.saw}X`],
      ['SETUP COLA', `${s.data.setupChanges.bander}X`],
      ['PICO BUFFER', `${s.data.wipPeak} PEÇA(S)`],
    ];

    metrics.forEach((m, mi) => {
      const my = by + 16 + mi * 11;
      doc.setDrawColor(31, 41, 55);
      doc.line(bx + 6, my - 1, bx + bw - 6, my - 1);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6);
      doc.setTextColor(156, 163, 175);
      doc.text(m[0], bx + 6, my + 3);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(255, 255, 255);
      doc.text(m[1], bx + 6, my + 9);
    });
  });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(226, 172, 0);
  doc.text('RECOMENDAÇÃO FINAL', 15, 148);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(209, 213, 219);
  doc.text(result.recommended.id === 'fluxo_continuo'
    ? 'O FLUXO CONTÍNUO ENTREGA MENOR TEMPO TOTAL PORQUE SOBREPÕE CORTE E FITA, REDUZINDO FILA E ESPERA.'
    : 'O LOTE SEPARADO É MELHOR NESTE CENÁRIO PORQUE CONCENTRA SETUPS DE FITA DE BORDA E EVITA TROCAS FREQUENTES DE PADRÃO.',
    [15, 55], 154, { maxWidth: 180 });

  // ---- PÁGINA 4: Ordem recomendada passo a passo ----
  doc.addPage();
  doc.setFillColor(17, 24, 39);
  doc.rect(0, 0, pageW, pageH, 'F');
  doc.setFillColor(226, 172, 0);
  doc.rect(0, 0, pageW, 2, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(255, 255, 255);
  doc.text('ORDEM RECOMENDADA — PASSO A PASSO', 15, 16);

  doc.setFontSize(6);
  doc.setTextColor(156, 163, 175);
  doc.text(`ESTRATÉGIA: ${result.recommended.id === 'fluxo_continuo' ? 'FLUXO CONTÍNUO' : 'LOTE SEPARADO'} · TOTAL: ${formatMinutes(result.recommended.makespanMinutes)}`, 15, 22);

  const orderHeaders = ['#', 'PEÇA', 'DIMENSÃO', 'CORTE', 'FITA', 'SETUP', 'FITA BORDA'];
  const orderColWidths = [6, 42, 22, 14, 14, 14, 22];
  const orderRows = result.recommended.cutOrder.map((job, i) => [
    `${i + 1}`,
    job.nome.substring(0, 24),
    `${job.largura}×${job.altura}`,
    formatMinutes(job.cutProcessMinutes),
    formatMinutes(job.bandProcessMinutes),
    job.cutProcessMinutes < 3 ? 'Rápido' : 'Normal',
    formatEdgePattern(job.fio_de_fita),
  ]);

  drawTable(doc, orderHeaders, orderRows, 28, orderColWidths, pageW);

  // ---- PÁGINA 5 (se houver muitas peças): Continuação + rodapé ----
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(6);
  doc.setTextColor(75, 85, 99);
  doc.text(`D'LUXURY MÓVEIS — MÓDULO PRODUÇÃO · ${nome}`, pageW / 2, 290, { align: 'center' });

  const safeNome = nome.replace(/\s+/g, '-').toLowerCase().replace(/[^a-z0-9-]/g, '');
  doc.save(`relatorio-producao-${safeNome}.pdf`);
}
