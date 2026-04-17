import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import type { Orcamento, CondicaoPagamento, Client, Project } from '../context/AppContext';

export const generateOrcamentoPDF = (
  orcamento: Orcamento,
  cliente?: Client,
  projeto?: Project,
  condicaoPagamento?: CondicaoPagamento
) => {
  const doc = new jsPDF();
  
  // Cores
  const primaryColor: [number, number, number] = [212, 175, 55]; // Dourado (#d4af37)
  const secondaryColor: [number, number, number] = [30, 41, 59]; // Dark text (#1e293b)

  // HEADER
  doc.setFillColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  doc.rect(0, 0, 210, 40, 'F');
  
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.setFontSize(24);
  doc.text("D'LUXURY", 15, 20);
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text("Móveis Sob Medida & Ambientes Planejados", 15, 28);
  
  doc.setFontSize(16);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text("PROPOSTA COMERCIAL", 120, 20);
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text(`Nº: ${orcamento.numero}`, 120, 28);
  doc.text(`Data: ${new Date().toLocaleDateString('pt-BR')}`, 160, 28);

  // DADOS DO CLIENTE E PROJETO
  doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  doc.setFontSize(14);
  doc.text("DADOS DO CLIENTE", 15, 55);
  
  doc.setLineWidth(0.5);
  doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.line(15, 57, 195, 57);

  doc.setFontSize(10);
  const clienteTel = cliente?.telefone || 'Não informado';
  const clienteEmail = cliente?.email || 'Não informado';
  const projetoNome = projeto ? `${projeto.ambiente} - ${projeto.clientName}` : 'Projeto Padrão';
  
  doc.text(`Cliente: ${cliente?.nome || 'Não informado'}`, 15, 65);
  doc.text(`Telefone: ${clienteTel}`, 15, 72);
  doc.text(`E-mail: ${clienteEmail}`, 120, 65);
  doc.text(`Projeto: ${projetoNome}`, 120, 72);

  // AMBIENTES E ITENS
  doc.setFontSize(14);
  doc.text("DETALHAMENTO DO PROJETO", 15, 90);
  doc.line(15, 92, 195, 92);

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const tableData = orcamento.itens?.map(item => [
    item.ambiente,
    item.descricao,
    `${item.largura_cm}x${item.altura_cm}x${item.profundidade_cm}cm`,
    item.material,
    item.acabamento,
    formatCurrency(item.valor_total)
  ]) || [];

  (doc as any).autoTable({
    startY: 100,
    head: [['Ambiente', 'Descrição', 'Medidas (L x A x P)', 'Material', 'Acabamento', 'Valor']],
    body: tableData.length > 0 ? tableData : [['Nenhum item detalhado', '', '', '', '', '']],
    theme: 'grid',
    headStyles: { fillColor: secondaryColor, textColor: 255 },
    alternateRowStyles: { fillColor: [245, 245, 245] },
    styles: { fontSize: 9, cellPadding: 4 },
  });

  // RESUMO FINANCEIRO E CONDIÇÕES
  const finalY = (doc as any).lastAutoTable.finalY + 15;
  
  doc.setFontSize(14);
  doc.text("CONDIÇÕES COMERCIAIS", 15, finalY);
  doc.line(15, finalY + 2, 195, finalY + 2);

  doc.setFontSize(10);
  const startY = finalY + 12;
  const lineSpacing = 7;

  doc.text("Valor Base dos Móveis:", 15, startY);
  doc.text(formatCurrency(orcamento.valor_base), 80, startY);

  if (orcamento.adicional_urgencia_pct > 0 && orcamento.prazo_tipo === 'urgente') {
    doc.text("Adicional de Urgência (+15%):", 15, startY + lineSpacing);
    doc.text(formatCurrency(orcamento.valor_base * orcamento.adicional_urgencia_pct), 80, startY + lineSpacing);
  }

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  const totalY = startY + (lineSpacing * 2.5);
  doc.text("VALOR TOTAL FINAL:", 15, totalY);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text(formatCurrency(orcamento.valor_final), 80, totalY);

  // CONDIÇÃO DE PAGAMENTO E PRAZO
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  doc.setFontSize(10);
  
  const condicaoStr = condicaoPagamento ? condicaoPagamento.nome : 'À Vista';
  doc.text(`Condição de Pagamento:`, 120, startY);
  doc.text(condicaoStr.toUpperCase(), 165, startY);

  doc.text(`Prazo de Entrega:`, 120, startY + lineSpacing);
  doc.text(`${orcamento.prazo_entrega_dias} dias úteis (${orcamento.prazo_tipo})`, 165, startY + lineSpacing);

  if (orcamento.observacoes) {
    doc.text("Observações:", 15, totalY + 15);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'italic');
    const splitObs = doc.splitTextToSize(orcamento.observacoes, 180);
    doc.text(splitObs, 15, totalY + 22);
  }

  // FOOTER ASSINATURA
  const pageHeight = doc.internal.pageSize.height;
  doc.setLineWidth(0.5);
  doc.line(20, pageHeight - 30, 90, pageHeight - 30);
  doc.line(120, pageHeight - 30, 190, pageHeight - 30);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text("D'LUXURY AMBIENTES", 35, pageHeight - 25);
  doc.text("CLIENTE / CONTRATANTE", 135, pageHeight - 25);

  doc.save(`Proposta_${orcamento.numero}_DLuxury.pdf`);
};

