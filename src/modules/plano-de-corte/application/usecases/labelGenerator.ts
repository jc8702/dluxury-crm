import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import { ResultadoOtimizacao } from '../../domain/entities/CuttingPlan';

export async function generateLabelsPDF(resultado: ResultadoOtimizacao) {
  const doc = new jsPDF({
    unit: 'mm',
    format: [100, 50] // Tamanho padrão etiqueta térmica
  });

  let index = 0;

  for (const layout of resultado.layouts) {
    for (const peca of layout.pecas_posicionadas) {
      if (index > 0) doc.addPage([100, 50]);

      // Borda
      doc.setDrawColor(200, 200, 200);
      doc.rect(2, 2, 96, 46);

      // Header
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      doc.text("D'LUXURY INDUSTRIAL", 5, 8);
      
      doc.setFontSize(8);
      doc.text(`Material: ${layout.chapa_sku}`, 5, 12);

      // Nome da Peça
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text(peca.nome.toUpperCase(), 5, 22);

      // Dimensões
      doc.setFontSize(12);
      doc.setFont("helvetica", "normal");
      doc.text(`${peca.largura} x ${peca.altura} mm`, 5, 30);

      // Rodapé
      doc.setFontSize(7);
      doc.text(`ID: ${peca.peca_id}`, 5, 45);
      doc.text(`Chapa #${layout.indice_chapa}`, 40, 45);

      // QR Code
      const qrData = `https://dluxury-crm.vercel.app/pecas/${peca.peca_id}`;
      const qrUrl = await QRCode.toDataURL(qrData);
      doc.addImage(qrUrl, 'PNG', 65, 5, 30, 30);

      index++;
    }
  }

  doc.save(`etiquetas_plano_corte_${Date.now()}.pdf`);
}
