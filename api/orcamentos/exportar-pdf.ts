import { db } from '../../src/api-lib/drizzle-db.js';
import { orcamentos, orcamentoItens } from '../../src/db/schema/engenharia-orcamentos.js';
import { eq } from 'drizzle-orm';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

export default async function handler(req: any, res: any) {
    const { id } = req.query;

    if (!id) {
        return res.status(400).json({ error: 'ID do orçamento é obrigatório' });
    }

    try {
        // 1. Buscar dados completos
        const orcamento = await db.query.orcamentos.findFirst({
            where: eq(orcamentos.id, id),
            with: {
                itens: {
                    with: {
                        skuEngenharia: true
                    }
                }
            }
        });

        if (!orcamento) {
            return res.status(404).json({ error: 'Orçamento não encontrado' });
        }

        // 2. Gerar PDF
        const doc = new jsPDF() as any;
        
        doc.setFontSize(22);
        doc.text('D\'LUXURY AMBIENTES', 105, 20, { align: 'center' });
        
        doc.setFontSize(10);
        doc.text('Relatório de Orçamento Industrial', 105, 28, { align: 'center' });
        
        doc.line(20, 35, 190, 35);
        
        doc.setFontSize(12);
        doc.text(`Orçamento Nº: ${orcamento.numeroOrcamento}`, 20, 45);
        doc.text(`Data: ${new Date(orcamento.createdAt!).toLocaleDateString('pt-BR')}`, 20, 52);
        doc.text(`Validade: ${orcamento.validadeDias} dias`, 20, 59);
        
        const tableBody = orcamento.itens.map((item: any) => [
            item.nomeCustomizado || item.skuEngenharia?.nome || 'Item Avulso',
            item.quantidade,
            `${item.largura || '-'} x ${item.altura || '-'} x ${item.espessura || '-'}`,
            item.material || 'Padrão',
            new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(item.precoVendaUnitario || 0))
        ]);

        doc.autoTable({
            startY: 70,
            head: [['Item', 'Qtd', 'Dimensões (LxAxE)', 'Material', 'Preço Unit.']],
            body: tableBody,
            headStyles: { fillColor: [255, 102, 0] }
        });

        const finalY = (doc as any).lastAutoTable.finalY + 10;
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text(`VALOR TOTAL: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(orcamento.valorTotalVenda))}`, 190, finalY, { align: 'right' });

        // 3. Retornar PDF como stream/buffer
        const pdfOutput = doc.output('arraybuffer');
        
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="Orcamento_${orcamento.numeroOrcamento}.pdf"`);
        return res.send(Buffer.from(pdfOutput));

    } catch (error: any) {
        console.error('[EXPORT PDF ERROR]', error);
        return res.status(500).json({ error: 'Erro ao gerar PDF', details: error.message });
    }
}
