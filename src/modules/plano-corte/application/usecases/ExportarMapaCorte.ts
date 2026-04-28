import { jsPDF } from 'jspdf';
import type { ResultadoOtimizacao } from '../../domain/entities/CuttingPlan';

export async function exportarMapaCorte(resultado: ResultadoOtimizacao): Promise<void> {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a3' // 420 × 297 mm
  });

  const ESCALA = 0.12; // 1mm real = 0.12mm no PDF (aproximadamente 1:8)
  const OFFSET_X = 20;
  const OFFSET_Y = 40;
  const LEGENDA_X = 320;

  resultado.layouts.forEach((layout, idx) => {
    if (idx > 0) doc.addPage();

    // CABEÇALHO
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(`Mapa de Corte - Chapa ${idx + 1}`, OFFSET_X, 20);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`SKU: ${layout.chapa_sku}`, OFFSET_X, 28);
    doc.text(
      `Dimensões: ${layout.largura_original_mm} × ${layout.altura_original_mm} mm`,
      OFFSET_X,
      34
    );

    // DESENHAR CHAPA
    doc.setDrawColor(0);
    doc.setLineWidth(0.5);
    doc.rect(
      OFFSET_X,
      OFFSET_Y,
      layout.largura_original_mm! * ESCALA,
      layout.altura_original_mm! * ESCALA
    );

    // DESENHAR PEÇAS
    layout.pecas_posicionadas.forEach((peca, pecaIdx) => {
      // Fundo da peça (cinza claro)
      doc.setFillColor(220, 235, 255);
      doc.rect(
        OFFSET_X + peca.x * ESCALA,
        OFFSET_Y + peca.y * ESCALA,
        peca.largura * ESCALA,
        peca.altura * ESCALA,
        'F'
      );

      // Borda da peça
      doc.setDrawColor(0, 100, 200);
      doc.setLineWidth(0.3);
      doc.rect(
        OFFSET_X + peca.x * ESCALA,
        OFFSET_Y + peca.y * ESCALA,
        peca.largura * ESCALA,
        peca.altura * ESCALA
      );

      // Número da peça (grande)
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(
        String(pecaIdx + 1),
        OFFSET_X + peca.x * ESCALA + (peca.largura * ESCALA) / 2,
        OFFSET_Y + peca.y * ESCALA + (peca.altura * ESCALA) / 2,
        { align: 'center' }
      );

      // Fio de fita (bordas coloridas)
      if (peca.fio_de_fita) {
        doc.setLineWidth(1);
        
        if (peca.fio_de_fita.topo) {
          doc.setDrawColor(255, 0, 0);
          doc.line(
            OFFSET_X + peca.x * ESCALA,
            OFFSET_Y + peca.y * ESCALA,
            OFFSET_X + (peca.x + peca.largura) * ESCALA,
            OFFSET_Y + peca.y * ESCALA
          );
        }
        
        if (peca.fio_de_fita.baixo) {
          doc.setDrawColor(0, 0, 255);
          doc.line(
            OFFSET_X + peca.x * ESCALA,
            OFFSET_Y + (peca.y + peca.altura) * ESCALA,
            OFFSET_X + (peca.x + peca.largura) * ESCALA,
            OFFSET_Y + (peca.y + peca.altura) * ESCALA
          );
        }
        
        if (peca.fio_de_fita.esquerda) {
          doc.setDrawColor(0, 255, 0);
          doc.line(
            OFFSET_X + peca.x * ESCALA,
            OFFSET_Y + peca.y * ESCALA,
            OFFSET_X + peca.x * ESCALA,
            OFFSET_Y + (peca.y + peca.altura) * ESCALA
          );
        }
        
        if (peca.fio_de_fita.direita) {
          doc.setDrawColor(255, 165, 0);
          doc.line(
            OFFSET_X + (peca.x + peca.largura) * ESCALA,
            OFFSET_Y + peca.y * ESCALA,
            OFFSET_X + (peca.x + peca.largura) * ESCALA,
            OFFSET_Y + (peca.y + peca.altura) * ESCALA
          );
        }
      }
    });

    // LEGENDA LATERAL
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Legenda de Peças', LEGENDA_X, OFFSET_Y);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');

    layout.pecas_posicionadas.forEach((peca, pecaIdx) => {
      const y = OFFSET_Y + 10 + pecaIdx * 5;
      
      if (y > 280) return; // Evitar overflow da página

      doc.text(
        `${pecaIdx + 1}. ${peca.nome}`,
        LEGENDA_X,
        y
      );
      doc.text(
        `${peca.largura}×${peca.altura}mm`,
        LEGENDA_X + 60,
        y
      );
      
      if (peca.rotacionada) {
        doc.setTextColor(255, 100, 0);
        doc.text('ROT', LEGENDA_X + 85, y);
        doc.setTextColor(0);
      }
    });

    // ESTATÍSTICAS RODAPÉ
    const aproveitamento = (layout.area_aproveitada_mm2 / 
      (layout.largura_original_mm! * layout.altura_original_mm!)) * 100;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(
      `Aproveitamento: ${aproveitamento.toFixed(1)}% | Peças: ${layout.pecas_posicionadas.length} | Área útil: ${(layout.area_aproveitada_mm2 / 1000000).toFixed(3)}m²`,
      OFFSET_X,
      285
    );

    // Data de geração
    doc.setFontSize(7);
    doc.setTextColor(100);
    doc.text(
      `Gerado em: ${new Date().toLocaleString('pt-BR')}`,
      OFFSET_X,
      292
    );
  });

  // SALVAR PDF
  const nomeArquivo = `mapa-corte-${Date.now()}.pdf`;
  doc.save(nomeArquivo);
}
