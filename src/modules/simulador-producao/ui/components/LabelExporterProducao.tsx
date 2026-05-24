import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import type { ProductionPieceInput } from '../../domain/types';
import { formatEdgePattern } from '../../domain/productionEngine';

export async function exportarEtiquetaProducao(
  piece: ProductionPieceInput,
  index: number,
  totalPieces: number,
) {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: [100, 60],
  });

  // Background escuro industrial
  doc.setFillColor(17, 24, 39);
  doc.rect(0, 0, 100, 60, 'F');

  // Linha superior amarela
  doc.setFillColor(226, 172, 0);
  doc.rect(0, 0, 100, 2, 'F');

  // Nome da peça
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text(piece.nome.substring(0, 28), 4, 10);

  // Índice / quantidade
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(156, 163, 175);
  doc.text(`Peça ${index + 1} de ${totalPieces}`, 4, 15);

  // Dimensões
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(226, 172, 0);
  doc.text(`${piece.largura} × ${piece.altura} mm`, 4, 24);

  // Fita de borda label
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(156, 163, 175);
  doc.text('FITA DE BORDA:', 4, 30);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(255, 255, 255);
  doc.text(formatEdgePattern(piece.fio_de_fita), 4, 34);

  // Desenho planificado com indicação de bordas
  const rectX = 50;
  const rectY = 8;
  const rectW = 30;
  const rectH = 20;

  // Preenchimento da peça
  doc.setFillColor(30, 41, 59);
  doc.roundedRect(rectX, rectY, rectW, rectH, 1, 1, 'F');

  // Bordas com fita destacadas em amarelo
  const edgeColor = [226, 172, 0] as const;
  const noEdgeColor = [75, 85, 99] as const;
  const edgeThick = 1.8;

  doc.setFillColor(...(piece.fio_de_fita?.topo ? edgeColor : noEdgeColor));
  doc.rect(rectX, rectY - 0.3, rectW, edgeThick, 'F');

  doc.setFillColor(...(piece.fio_de_fita?.baixo ? edgeColor : noEdgeColor));
  doc.rect(rectX, rectY + rectH - edgeThick + 0.3, rectW, edgeThick, 'F');

  doc.setFillColor(...(piece.fio_de_fita?.esquerda ? edgeColor : noEdgeColor));
  doc.rect(rectX - 0.3, rectY, edgeThick, rectH, 'F');

  doc.setFillColor(...(piece.fio_de_fita?.direita ? edgeColor : noEdgeColor));
  doc.rect(rectX + rectW - edgeThick + 0.3, rectY, edgeThick, rectH, 'F');

  // Legenda
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5);
  doc.setTextColor(156, 163, 175);
  doc.text('— aresta c/ fita', rectX, rectY + rectH + 5);
  doc.setFillColor(226, 172, 0);
  doc.rect(rectX + 1, rectY + rectH + 3.5, 4, 1, 'F');

  doc.text('— sem fita', rectX + 30, rectY + rectH + 5);
  doc.setFillColor(75, 85, 99);
  doc.rect(rectX + 31, rectY + rectH + 3.5, 4, 1, 'F');

  // QR Code
  try {
    const qrData = JSON.stringify({
      id: piece.id,
      nome: piece.nome,
      largura: piece.largura,
      altura: piece.altura,
      fita: piece.fio_de_fita,
    });

    const qrCodeUrl = await QRCode.toDataURL(qrData, {
      errorCorrectionLevel: 'M',
      margin: 1,
      width: 100,
    });

    doc.addImage(qrCodeUrl, 'PNG', 4, 36, 18, 18);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(5);
    doc.setTextColor(156, 163, 175);
    doc.text('RASTREAMENTO', 6, 56);
  } catch (err) {
    console.warn('Erro ao gerar QR Code na etiqueta:', err);
  }

  // Rodapé
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(5);
  doc.setTextColor(107, 114, 128);
  doc.text(`D'LUXURY — ${new Date().toLocaleDateString('pt-BR')}`, 50, 56, { align: 'center' });

  const safeNome = piece.nome.replace(/\s+/g, '-').toLowerCase().replace(/[^a-z0-9-]/g, '');
  doc.save(`etiqueta-${safeNome}-${piece.largura}x${piece.altura}.pdf`);
}
