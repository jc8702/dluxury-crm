import { jsPDF } from 'jspdf';
import { Superficie, PecaPositionada } from '../../../utils/planodeCorte';

export class ExportadorPDF {
  static async exportarPlano(superficies: Superficie[], nomePlano: string) {
    // A4 landscape: 297 x 210 mm
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

    superficies.forEach((sup, index) => {
      if (index > 0) doc.addPage();

      doc.setFontSize(16);
      doc.text(`Plano de Corte: ${nomePlano}`, 10, 15);
      doc.setFontSize(12);
      doc.text(`Chapa ${index + 1} - ${sup.largura}x${sup.altura}mm - Aproveitamento: ${sup.aproveitamentoPct.toFixed(1)}%`, 10, 22);

      // Calcular escala para caber na página A4 (Deixando espaço embaixo para legenda)
      const maxW = 277; // 297 - 20 margens laterais
      const maxH = 120; // Reduzido para caber legenda abaixo (210 - 90)
      const scale = Math.min(maxW / sup.largura, maxH / sup.altura);

      const offsetX = 10;
      const offsetY = 30;

      // Desenhar Chapa Base
      doc.setDrawColor(0);
      doc.setFillColor(240, 240, 240);
      doc.rect(offsetX, offsetY, sup.largura * scale, sup.altura * scale, 'FD');

      // Desenhar Peças
      sup.pecasPositionadas.forEach(peca => {
        const x = offsetX + (peca.x * scale);
        const y = offsetY + (peca.y * scale);
        const w = peca.largura * scale;
        const h = peca.altura * scale;

        doc.setDrawColor(0);
        doc.setFillColor(200, 220, 255);
        doc.rect(x, y, w, h, 'FD');

        // Borda fita (highlight red para impressão)
        const fio = (peca as any).fio_de_fita;
        if (fio) {
          doc.setDrawColor(255, 0, 0);
          doc.setLineWidth(1);
          if (fio.topo) doc.line(x, y, x + w, y);
          if (fio.baixo) doc.line(x, y + h, x + w, y + h);
          if (fio.esquerda) doc.line(x, y, x, y + h);
          if (fio.direita) doc.line(x + w, y, x + w, y + h);
          doc.setDrawColor(0); // reset
          doc.setLineWidth(0.2);
        }

        // Escrever número da etiqueta na peça (mesmo pequena)
        doc.setFontSize(w < 10 || h < 10 ? 4 : 7);
        doc.text(`#${peca.numeroEtiqueta}`, x + (w/2), y + (h/2), { align: 'center', baseline: 'middle' });

        // Se a peça for grande o suficiente, escrever descrição
        if (w > 20 && h > 15) {
          doc.setFontSize(6);
          const desc = peca.descricao.length > 12 ? peca.descricao.substring(0, 12) + '..' : peca.descricao;
          doc.text(desc, x + (w/2), y + (h/2) + 4, { align: 'center', baseline: 'middle' });
          doc.text(`${peca.largura}x${peca.altura}`, x + (w/2), y + (h/2) + 8, { align: 'center', baseline: 'middle' });
        }
      });

      // --- LEGENDA (Tabela de Peças Abaixo do Desenho) ---
      const legendYStart = offsetY + (sup.altura * scale) + 10;
      doc.setFontSize(10);
      doc.text('Legenda de Peças:', offsetX, legendYStart);
      
      let col = 0;
      let row = 0;
      const colWidth = 65;
      const rowHeight = 5;
      const maxRows = Math.floor((200 - legendYStart) / rowHeight);

      doc.setFontSize(7);
      sup.pecasPositionadas.forEach((peca) => {
        if (row >= maxRows) {
          row = 0;
          col++;
        }
        // Se exceder as colunas, paramos (limite de espaço)
        if (col > 3) return;

        const xPos = offsetX + (col * colWidth);
        const yPos = legendYStart + 6 + (row * rowHeight);
        
        doc.text(`#${peca.numeroEtiqueta} - ${peca.largura}x${peca.altura}mm - ${peca.descricao.substring(0,20)}`, xPos, yPos);
        row++;
      });
    });

    doc.save(`plano-de-corte-${nomePlano.replace(/\s+/g, '-').toLowerCase()}.pdf`);
  }
}
