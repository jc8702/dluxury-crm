import { jsPDF } from 'jspdf';

export class ExportadorPDF {
  static async exportarPlano(superficies: any[], nomePlano: string) {
    // A4 landscape: 297 x 210 mm
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

    superficies.forEach((sup, index) => {
      if (index > 0) doc.addPage();

      doc.setFontSize(16);
      doc.text(`Plano de Corte: ${nomePlano}`, 10, 15);
      doc.setFontSize(12);
      doc.text(`Chapa ${index + 1} - ${sup.largura}x${sup.altura}mm - Aproveitamento: ${sup.aproveitamentoPct.toFixed(1)}%`, 10, 22);

      // Calcular escala para caber na página A4 (margens de 20mm)
      const maxW = 257; // 297 - 40
      const maxH = 160; // 210 - 50
      const scale = Math.min(maxW / sup.largura, maxH / sup.altura);

      const offsetX = 20;
      const offsetY = 35;

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

        // Se a peça for grande o suficiente, escrever dentro
        if (w > 15 && h > 10) {
          doc.setFontSize(8);
          doc.text(`#${peca.numeroEtiqueta}`, x + 2, y + 5);
          doc.setFontSize(6);
          const desc = peca.descricao.length > 15 ? peca.descricao.substring(0, 15) + '...' : peca.descricao;
          doc.text(desc, x + 2, y + 9);
          doc.text(`${peca.largura}x${peca.altura}`, x + 2, y + 13);
        }
      });
    });

    doc.save(`plano-de-corte-${nomePlano.replace(/\s+/g, '-').toLowerCase()}.pdf`);
  }
}
