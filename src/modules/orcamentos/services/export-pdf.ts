import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ExportData {
    numeroOrcamento: string;
    cliente: {
        nome: string;
        cidade: string;
        uf: string;
    };
    itens: Array<{
        nome: string;
        quantidade: number;
        precoVenda: number;
    }>;
    resumo: {
        totalCusto: number;
        margem: number;
        totalVenda: number;
        desconto: number;
    };
    condicoes: string;
}

export const exportBudgetToPDF = (data: ExportData) => {
    const doc = new jsPDF() as any;
    const pageWidth = doc.internal.pageSize.getWidth();

    // 1. HEADER & LOGO
    doc.setFillColor(31, 31, 31); // Dark gray/black
    doc.rect(0, 0, pageWidth, 40, 'F');
    
    doc.setTextColor(255, 102, 0); // Orange
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('D\'LUXURY', 15, 25);
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('DESIGN & EXCELÊNCIA INDUSTRIAL', 15, 32);

    doc.setFontSize(12);
    doc.text(`ORÇAMENTO: #${data.numeroOrcamento}`, pageWidth - 15, 25, { align: 'right' });
    doc.text(format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR }), pageWidth - 15, 32, { align: 'right' });

    // 2. CLIENT INFO
    doc.setTextColor(31, 31, 31);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('DADOS DO CLIENTE', 15, 55);
    
    doc.setDrawColor(255, 102, 0);
    doc.setLineWidth(0.5);
    doc.line(15, 57, 60, 57);

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(`Nome/Razão Social: ${data.cliente.nome}`, 15, 65);
    doc.text(`Localidade: ${data.cliente.cidade} - ${data.cliente.uf}`, 15, 71);

    // 3. ITEMS TABLE
    doc.autoTable({
        startY: 85,
        head: [['ITEM / PRODUTO DE ENGENHARIA', 'QTD', 'VALOR UNIT.', 'TOTAL']],
        body: data.itens.map(item => [
            item.nome,
            item.quantidade,
            new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.precoVenda),
            new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.precoVenda * item.quantidade)
        ]),
        headStyles: { fillColor: [31, 31, 31], textColor: [255, 102, 0], fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [245, 245, 245] },
        styles: { fontSize: 10, cellPadding: 5 },
        columnStyles: {
            1: { halign: 'center' },
            2: { halign: 'right' },
            3: { halign: 'right' }
        }
    });

    // 4. FINANCIAL SUMMARY
    const finalY = (doc as any).lastAutoTable.finalY + 10;
    
    doc.setFillColor(255, 102, 0);
    doc.rect(pageWidth - 90, finalY, 75, 45, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.text('SUBTOTAL:', pageWidth - 85, finalY + 10);
    doc.text(new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(data.resumo.totalVenda + data.resumo.desconto), pageWidth - 20, finalY + 10, { align: 'right' });

    doc.text('DESCONTO:', pageWidth - 85, finalY + 20);
    doc.text(`- ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(data.resumo.desconto)}`, pageWidth - 20, finalY + 20, { align: 'right' });

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('TOTAL FINAL:', pageWidth - 85, finalY + 35);
    doc.text(new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(data.resumo.totalVenda), pageWidth - 20, finalY + 35, { align: 'right' });

    // 5. CONDITIONS
    doc.setTextColor(31, 31, 31);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('CONDIÇÕES E PAGAMENTO', 15, finalY + 10);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const splitText = doc.splitTextToSize(data.condicoes || 'Pagamento conforme acordado. Validade de 15 dias.', 80);
    doc.text(splitText, 15, finalY + 18);

    // 6. FOOTER
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text('Este documento é uma proposta técnica comercial baseada em BOM de engenharia.', pageWidth / 2, 285, { align: 'center' });
    doc.text('D\'Luxury CRM Industrial - Processamento Automatizado', pageWidth / 2, 290, { align: 'center' });

    doc.save(`Orcamento_${data.numeroOrcamento}.pdf`);
};
