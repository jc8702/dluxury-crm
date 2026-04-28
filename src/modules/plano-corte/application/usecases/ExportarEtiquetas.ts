import QRCode from 'qrcode';
import { jsPDF } from 'jspdf';

export async function exportarEtiquetas(
  pecas: any[],
  planoCorteId: string,
  urlBase: string = 'https://app.dluxury.com/rastreamento'
): Promise<void> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [100, 50] // Etiqueta térmica 100x50mm
  });

  for (let i = 0; i < pecas.length; i++) {
    if (i > 0) doc.addPage();

    const peca = pecas[i];
    
    // Gerar QR Code
    const qrData = `${urlBase}/${planoCorteId}/${peca.peca_id || peca.id}`;
    const qrDataURL = await QRCode.toDataURL(qrData, {
      width: 100,
      margin: 1
    });

    // QR Code (lado esquerdo)
    doc.addImage(qrDataURL, 'PNG', 5, 8, 35, 35);

    // Informações (lado direito)
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(peca.nome || peca.descricao || 'PEÇA', 45, 12);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(`${peca.largura} × ${peca.altura} mm`, 45, 20);
    doc.text(`SKU: ${peca.sku_chapa || 'N/A'}`, 45, 26);

    if (peca.rotacionada) {
      doc.setTextColor(255, 100, 0);
      doc.text('⚠ ROTACIONADA 90°', 45, 32);
      doc.setTextColor(0);
    }

    // Fio de fita
    if (peca.fio_de_fita) {
      const fitas = [];
      if (peca.fio_de_fita.topo) fitas.push('T');
      if (peca.fio_de_fita.baixo) fitas.push('B');
      if (peca.fio_de_fita.esquerda) fitas.push('E');
      if (peca.fio_de_fita.direita) fitas.push('D');
      
      if (fitas.length > 0) {
        doc.setFontSize(7);
        doc.text(`Fita: ${fitas.join(', ')}`, 45, 38);
      }
    }

    // ID da peça (código rastreamento)
    doc.setFontSize(6);
    doc.setTextColor(100);
    doc.text(peca.peca_id || peca.id || String(i), 5, 48);
  }

  const nomeArquivo = `etiquetas-${planoCorteId}.pdf`;
  doc.save(nomeArquivo);
}
