import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export async function gerarPropostaPDF(orcamento: any, cliente: any): Promise<void> {
  const element = document.getElementById('proposta-pdf-template');
  
  if (!element) {
    console.error('Template da proposta não encontrado no DOM');
    return;
  }

  try {
    // Forçar visibilidade temporária para captura
    const originalLeft = element.style.left;
    element.style.left = '0';
    element.style.zIndex = '-100';

    const canvas = await html2canvas(element, {
      scale: 2, // Aumentar resolução
      logging: false,
      useCORS: true,
      backgroundColor: '#ffffff'
    });

    // Restaurar estado oculto
    element.style.left = originalLeft;
    element.style.zIndex = '';

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const imgProps = pdf.getImageProperties(imgData);
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    
    const fileName = `Proposta_DLuxury_${cliente.nome.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
    pdf.save(fileName);

  } catch (error) {
    console.error('Falha ao gerar PDF:', error);
    alert('Erro ao gerar PDF. Verifique o console para mais detalhes.');
  }
}

export function enviarWhatsAppProposta(orcamento: any, cliente: any): void {
  const telefone = cliente.telefone.replace(/\D/g, '');
  const mensagem = encodeURIComponent(
    `Olá ${cliente.nome}! 👋\n\nSegue a proposta D'Luxury para o seu projeto: *${orcamento.numero}*.\n\nFicamos à disposição para qualquer dúvida! ✨`
  );
  
  const url = `https://wa.me/55${telefone}?text=${mensagem}`;
  window.open(url, '_blank');
}
