import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

// Estender jsPDF com autoTable (necessário para TS)
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

export const reportService = {
  /**
   * Gera o Romaneio de Produção (Oficina)
   */
  async generateRomaneioProducao(projetoNome: string, itens: any[]) {
    const doc = new jsPDF();
    const date = new Date().toLocaleDateString('pt-BR');

    // Header Premium
    doc.setFontSize(22);
    doc.setTextColor(212, 175, 55); // Ouro D'Luxury
    doc.text('D\'LUXURY', 105, 20, { align: 'center' });
    
    doc.setFontSize(14);
    doc.setTextColor(40, 40, 40);
    doc.text('ROMANEIO TÉCNICO DE PRODUÇÃO', 105, 30, { align: 'center' });
    
    doc.setFontSize(10);
    doc.text(`Projeto: ${projetoNome}`, 14, 45);
    doc.text(`Emissão: ${date}`, 14, 50);
    doc.line(14, 55, 196, 55);

    // Tabela de Itens
    doc.autoTable({
      startY: 60,
      head: [['Ambiente', 'Componente', 'Material (SKU)', 'Qtd.', 'Un.']],
      body: itens.map(i => [
        i.ambiente,
        i.componente_nome,
        `${i.sku_nome} (${i.sku_code})`,
        i.quantidade_com_perda,
        i.unidade_medida
      ]),
      headStyles: { fillStyle: 'var(--primary)', fillColor: [212, 175, 55], textColor: [0, 0, 0] },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      margin: { top: 60 }
    });

    // Footer
    const finalY = (doc as any).lastAutoTable.finalY + 20;
    doc.setFontSize(9);
    doc.setTextColor(150, 150, 150);
    doc.text('Este documento contém especificações técnicas proprietárias da D\'Luxury Móveis.', 105, 285, { align: 'center' });

    doc.save(`Romaneio_${projetoNome.replace(/\s/g, '_')}.pdf`);
  },

  /**
   * Gera Análise de Rentabilidade
   */
  async generateMapaCustos(dados: any[]) {
    const doc = new jsPDF();
    const date = new Date().toLocaleDateString('pt-BR');

    doc.setFontSize(20);
    doc.setTextColor(212, 175, 55);
    doc.text('RELATÓRIO DE RENTABILIDADE INDUSTRIAL', 105, 20, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text(`Data Base: ${date}`, 14, 30);

    doc.autoTable({
      startY: 40,
      head: [['Projeto', 'Cliente', 'Ambiente', 'Módulos', 'Custo Material (R$)']],
      body: dados.map(d => [
        `PRJ-${d.project_id.substring(0,6).toUpperCase()}`,
        d.cliente,
        d.ambiente,
        d.total_modulos,
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(d.custo_material_total)
      ]),
      headStyles: { fillColor: [40, 40, 40], textColor: [255, 255, 255] },
      foot: [['', '', '', 'TOTAL:', new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(dados.reduce((acc, curr) => acc + Number(curr.custo_material_total), 0))]],
      footStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' }
    });

    doc.save(`Mapa_Custos_${new Date().getTime()}.pdf`);
  }
};
