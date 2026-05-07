import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const exportBudgetToPDF = (orcamento: any) => {
    if (!orcamento) return;

    const doc = new jsPDF() as any;
    const pageWidth = doc.internal.pageSize.getWidth();

    // 1. HEADER & LOGO
    doc.setFillColor(15, 15, 15); // Black-ish
    doc.rect(0, 0, pageWidth, 45, 'F');
    
    doc.setTextColor(255, 102, 0); // Orange
    doc.setFontSize(28);
    doc.setFont('helvetica', 'bold');
    doc.text('D\'LUXURY', 20, 28);
    
    doc.setTextColor(150, 150, 150);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('DESIGN & EXCELÊNCIA INDUSTRIAL', 20, 36);

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(`ORÇAMENTO: #${orcamento.numeroOrcamento}`, pageWidth - 20, 25, { align: 'right' });
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR }), pageWidth - 20, 33, { align: 'right' });

    // 2. CLIENT INFO
    doc.setTextColor(15, 15, 15);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('DADOS DO CLIENTE', 20, 60);
    
    doc.setDrawColor(255, 102, 0);
    doc.setLineWidth(0.8);
    doc.line(20, 62, 50, 62);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 60, 60);
    
    const clienteNome = orcamento.cliente?.nome || 'NÃO INFORMADO';
    const clienteLocal = orcamento.cliente ? `${orcamento.cliente.cidade || ''} - ${orcamento.cliente.uf || ''}` : '---';

    doc.text(`Nome / Razão Social:`, 20, 72);
    doc.setTextColor(15, 15, 15);
    doc.setFont('helvetica', 'bold');
    doc.text(clienteNome, 60, 72);
    
    doc.setTextColor(60, 60, 60);
    doc.setFont('helvetica', 'normal');
    doc.text(`Localidade:`, 20, 78);
    doc.setTextColor(15, 15, 15);
    doc.text(clienteLocal, 60, 78);

    doc.setTextColor(60, 60, 60);
    doc.text(`Validade da Proposta:`, 20, 84);
    doc.setTextColor(15, 15, 15);
    doc.text(`${orcamento.validadeDias} dias`, 60, 84);

    // 3. ITEMS TABLE
    const tableBody = (orcamento.itens || []).map((item: any) => [
        { content: item.skuEngenharia?.nome || 'ITEM SEM NOME', styles: { fontStyle: 'bold' } },
        item.quantidade,
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(item.custoUnitarioCalculado) * (1 + Number(orcamento.margemLucroPercentual) / 100)),
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.valorVendaCalculado || (Number(item.custoUnitarioCalculado) * item.quantidade * (1 + Number(orcamento.margemLucroPercentual) / 100)))
    ]);

    doc.autoTable({
        startY: 95,
        head: [['MÓDULO / SKU ENGENHARIA', 'QTD', 'VALOR UNIT.', 'TOTAL']],
        body: tableBody,
        headStyles: { 
            fillColor: [15, 15, 15], 
            textColor: [255, 102, 0], 
            fontSize: 10,
            fontStyle: 'bold',
            cellPadding: 5
        },
        bodyStyles: { 
            fontSize: 9,
            cellPadding: 4,
            textColor: [40, 40, 40]
        },
        alternateRowStyles: { 
            fillColor: [250, 250, 250] 
        },
        columnStyles: {
            1: { halign: 'center', width: 20 },
            2: { halign: 'right', width: 40 },
            3: { halign: 'right', width: 40 }
        },
        margin: { left: 20, right: 20 }
    });

    // 4. FINANCIAL SUMMARY
    const finalY = (doc as any).lastAutoTable.finalY + 15;
    
    // Total Box
    doc.setFillColor(255, 102, 0);
    doc.rect(pageWidth - 95, finalY, 75, 35, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('TOTAL DA PROPOSTA', pageWidth - 85, finalY + 12);

    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    const totalVendaStr = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(orcamento.valorTotalVenda));
    doc.text(totalVendaStr, pageWidth - 85, finalY + 25);

    // Condições
    doc.setTextColor(15, 15, 15);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('OBSERVAÇÕES E CONDIÇÕES', 20, finalY + 10);
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 80, 80);
    const condicoes = [
        `- Proposta válida por ${orcamento.validadeDias} dias.`,
        `- Taxa financeira inclusa: ${orcamento.taxaFinanceiraPercentual}%.`,
        `- Itens baseados em explosão de BOM industrial.`,
        `- Prazo de entrega a combinar conforme cronograma de produção.`
    ];
    doc.text(condicoes, 20, finalY + 18);

    // 5. FOOTER
    const pageHeight = doc.internal.pageSize.getHeight();
    doc.setDrawColor(240, 240, 240);
    doc.line(20, pageHeight - 25, pageWidth - 20, pageHeight - 25);
    
    doc.setFontSize(7);
    doc.setTextColor(180, 180, 180);
    doc.text('D\'LUXURY AMBIENTES - SISTEMA DE GESTÃO INDUSTRIAL ERP', pageWidth / 2, pageHeight - 15, { align: 'center' });
    doc.text('Documento gerado eletronicamente. Proposta sujeita a análise técnica final.', pageWidth / 2, pageHeight - 11, { align: 'center' });

    doc.save(`Proposta_DLuxury_${orcamento.numeroOrcamento}.pdf`);
};
