import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import type { Superficie } from '../../../../utils/planodeCorte';

export class ExportadorEtiquetas {
  static async exportar(superficies: Superficie[], nomePlano: string) {
    // Configuração para etiqueta térmica padrão (ex: 100x50mm)
    // Muitos fabricantes de móveis usam impressoras Argox/Zebra com este tamanho
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: [100, 50]
    });

    let isFirst = true;

    for (const sup of superficies) {
      for (const peca of sup.pecasPositionadas) {
        if (!isFirst) {
          doc.addPage();
        }
        isFirst = false;

        // Borda da etiqueta (opcional, bom para verificação)
        // doc.rect(1, 1, 98, 48);

        // 1. Cabeçalho
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.text(peca.descricao.substring(0, 25), 5, 8);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.text(`Plano: ${nomePlano.substring(0, 20)}`, 5, 13);
        doc.text(`Ambiente: ${peca.ambiente || 'N/A'}`, 5, 17);

        // 2. Dimensões em Destaque
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.text(`${peca.largura} x ${peca.altura} mm`, 5, 25);

        // 3. Fita de Borda Info
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        const fio = (peca as any).fio_de_fita;
        let fitasText = 'Fita: Nenhuma';
        if (fio) {
          const lados = [];
          if (fio.topo) lados.push('T');
          if (fio.baixo) lados.push('B');
          if (fio.esquerda) lados.push('E');
          if (fio.direita) lados.push('D');
          if (lados.length > 0) {
            fitasText = `Fita: Lados (${lados.join(',')})`;
          }
        }
        doc.text(fitasText, 5, 30);

        // 4. Rodapé Info
        doc.text(`ID Peça: #${peca.numeroEtiqueta}`, 5, 40);
        doc.text(`Chapa: ${sup.id} | Peça ${peca.numeroEtiqueta}`, 5, 45);

        // 5. Gerar e Inserir QR Code
        try {
          const qrData = JSON.stringify({
            id: peca.pecaId,
            l: peca.largura,
            a: peca.altura,
            desc: peca.descricao
          });
          // Gerar data URI do QR code (base64 PNG)
          const qrCodeDataUrl = await QRCode.toDataURL(qrData, { 
            errorCorrectionLevel: 'M',
            margin: 1,
            width: 100
          });
          
          // Posicionar o QR Code à direita (x=70, y=10, w=25, h=25)
          doc.addImage(qrCodeDataUrl, 'PNG', 70, 5, 25, 25);
          
          doc.setFontSize(6);
          doc.text('SCAN', 82.5, 32, { align: 'center' });
        } catch (err) {
          console.warn('Erro ao gerar QR code para a peça:', err);
        }
      }
    }

    if (isFirst) {
      alert("Nenhuma peça para gerar etiqueta.");
      return;
    }

    doc.save(`etiquetas-${nomePlano.replace(/\s+/g, '-').toLowerCase()}.pdf`);
  }
}
