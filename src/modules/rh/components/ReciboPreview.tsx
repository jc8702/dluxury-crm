import React, { useEffect, useState, useRef } from 'react';
import { X, Download, Printer, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '../../../components/common/Button';
import { api } from '../../../lib/api';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ReciboPreviewProps {
  folhaId: string;
  itemId: string;
  onClose: () => void;
}

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

export const ReciboPreview: React.FC<ReciboPreviewProps> = ({ folhaId, itemId, onClose }) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function loadRecibo() {
      try {
        setLoading(true);
        setError(null);
        const res = await api.get(`/rh/folhas/${folhaId}/recibo/${itemId}/pdf`);
        if (res.success && res.data) {
          setData(res.data);
        } else {
          setError(res.error || 'Erro ao obter dados do recibo');
        }
      } catch (err: any) {
        setError(err.message || 'Falha ao carregar recibo de pagamento');
      } finally {
        setLoading(false);
      }
    }
    loadRecibo();
  }, [folhaId, itemId]);

  const handleDownloadPDF = () => {
    if (!data) return;
    const { folha, item } = data;
    const doc = new jsPDF();

    // Cabeçalho
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('RECIBO DE PAGAMENTO DE SALÁRIO / PRÓ-LABORE', 14, 20);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Competência: ${folha?.competencia || '—'}`, 14, 28);
    doc.text(`Data de Emissão: ${new Date().toLocaleDateString('pt-BR')}`, 14, 34);

    // Dados do Colaborador
    doc.setDrawColor(200);
    doc.line(14, 38, 196, 38);

    doc.setFont('helvetica', 'bold');
    doc.text('Colaborador:', 14, 45);
    doc.setFont('helvetica', 'normal');
    doc.text(`${item?.colaborador_nome || '—'}`, 45, 45);

    doc.setFont('helvetica', 'bold');
    doc.text('Cargo/Função:', 14, 52);
    doc.setFont('helvetica', 'normal');
    doc.text(`${item?.cargo || 'Colaborador'}`, 45, 52);

    doc.setFont('helvetica', 'bold');
    doc.text('CPF:', 130, 45);
    doc.setFont('helvetica', 'normal');
    doc.text(`${item?.cpf || 'Não informado'}`, 145, 45);

    // Tabela de Vencimentos e Descontos
    const tableRows = [
      ['Salário Base', fmt(Number(item?.salario_base || 0)), '—'],
      [
        `Horas Extras (${item?.horas_extras_qtd || 0}h - ${item?.horas_extras_tipo || 50}%)`,
        fmt(Number(item?.valor_horas_extras || 0)),
        '—',
      ],
      ['Bônus / Produção', fmt(Number(item?.bonus_producao || 0)), '—'],
      [`Faltas (${item?.faltas_dias || 0} dias)`, '—', fmt(Number(item?.valor_faltas || 0))],
      ['Adiantamento Salarial', '—', fmt(Number(item?.adiantamento || 0))],
      [
        `Outros Descontos ${item?.outros_descricao ? `(${item.outros_descricao})` : ''}`,
        '—',
        fmt(Number(item?.outros_descontos || 0)),
      ],
    ];

    autoTable(doc, {
      startY: 60,
      head: [['Descrição', 'Vencimentos', 'Descontos']],
      body: tableRows,
      theme: 'grid',
      headStyles: { fillColor: [40, 40, 40], textColor: [255, 255, 255] },
      styles: { fontSize: 9 },
    });

    const finalY = (doc as any).lastAutoTable.finalY + 10;

    // Totais e Líquido
    const vencimentosTotal =
      Number(item?.salario_base || 0) +
      Number(item?.valor_horas_extras || 0) +
      Number(item?.bonus_producao || 0);

    const descontosTotal =
      Number(item?.valor_faltas || 0) +
      Number(item?.adiantamento || 0) +
      Number(item?.outros_descontos || 0);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`Total Vencimentos: ${fmt(vencimentosTotal)}`, 14, finalY);
    doc.text(`Total Descontos: ${fmt(descontosTotal)}`, 14, finalY + 7);

    doc.setFontSize(12);
    doc.text(`VALOR LÍQUIDO A RECEBER: ${fmt(Number(item?.valor_liquido || 0))}`, 14, finalY + 16);

    // Linha de Assinatura
    const signY = finalY + 45;
    doc.setDrawColor(150);
    doc.line(30, signY, 110, signY);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('Assinatura do Colaborador', 45, signY + 6);
    doc.text(`Recebi a quantia líquida supra em _____/_____/_________`, 14, signY + 16);

    doc.save(
      `recibo_${folha?.competencia || 'folha'}_${item?.colaborador_nome || 'colaborador'}.pdf`,
    );
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-card text-card-foreground border rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between p-4 border-b bg-muted/40">
          <h3 className="text-lg font-bold">Recibo de Pagamento</h3>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          {loading && (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Loader2 className="animate-spin text-primary" size={32} />
              <p className="text-sm text-muted-foreground">Carregando dados do recibo...</p>
            </div>
          )}

          {error && (
            <div className="p-4 rounded-lg bg-destructive/10 text-destructive flex items-center gap-3">
              <AlertCircle size={20} />
              <span>{error}</span>
            </div>
          )}

          {!loading && !error && data && (
            <div ref={previewRef} className="space-y-6">
              <div className="border rounded-lg p-5 bg-background space-y-4">
                <div className="border-b pb-3 flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-base">COMPROVANTE DE PAGAMENTO</h4>
                    <p className="text-xs text-muted-foreground">
                      Competência:{' '}
                      <span className="font-semibold text-foreground">
                        {data.folha?.competencia}
                      </span>
                    </p>
                  </div>
                  <span className="text-xs bg-primary/10 text-primary font-mono px-2 py-0.5 rounded">
                    RH D-Luxury
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Colaborador</p>
                    <p className="font-semibold">{data.item?.colaborador_nome}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">CPF</p>
                    <p className="font-mono">{data.item?.cpf || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Cargo</p>
                    <p>{data.item?.cargo || 'Colaborador'}</p>
                  </div>
                </div>

                <table className="w-full text-xs text-left border-t border-b">
                  <thead>
                    <tr className="border-b text-muted-foreground">
                      <th className="py-2">Descrição</th>
                      <th className="py-2 text-right">Vencimentos</th>
                      <th className="py-2 text-right">Descontos</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    <tr>
                      <td className="py-2 font-medium">Salário Base</td>
                      <td className="py-2 text-right font-mono">
                        {fmt(Number(data.item?.salario_base || 0))}
                      </td>
                      <td className="py-2 text-right font-mono">—</td>
                    </tr>
                    {Number(data.item?.valor_horas_extras) > 0 && (
                      <tr>
                        <td className="py-2 font-medium">
                          Horas Extras ({data.item?.horas_extras_qtd}h a{' '}
                          {data.item?.horas_extras_tipo || 50}%)
                        </td>
                        <td className="py-2 text-right font-mono">
                          {fmt(Number(data.item?.valor_horas_extras))}
                        </td>
                        <td className="py-2 text-right font-mono">—</td>
                      </tr>
                    )}
                    {Number(data.item?.bonus_producao) > 0 && (
                      <tr>
                        <td className="py-2 font-medium">Bônus de Produção</td>
                        <td className="py-2 text-right font-mono">
                          {fmt(Number(data.item?.bonus_producao))}
                        </td>
                        <td className="py-2 text-right font-mono">—</td>
                      </tr>
                    )}
                    {Number(data.item?.valor_faltas) > 0 && (
                      <tr>
                        <td className="py-2 font-medium">Faltas ({data.item?.faltas_dias} dias)</td>
                        <td className="py-2 text-right font-mono">—</td>
                        <td className="py-2 text-right font-mono text-destructive">
                          {fmt(Number(data.item?.valor_faltas))}
                        </td>
                      </tr>
                    )}
                    {Number(data.item?.adiantamento) > 0 && (
                      <tr>
                        <td className="py-2 font-medium">Adiantamento Salarial</td>
                        <td className="py-2 text-right font-mono">—</td>
                        <td className="py-2 text-right font-mono text-destructive">
                          {fmt(Number(data.item?.adiantamento))}
                        </td>
                      </tr>
                    )}
                    {Number(data.item?.outros_descontos) > 0 && (
                      <tr>
                        <td className="py-2 font-medium">
                          Outros Descontos{' '}
                          {data.item?.outros_descricao ? `(${data.item.outros_descricao})` : ''}
                        </td>
                        <td className="py-2 text-right font-mono">—</td>
                        <td className="py-2 text-right font-mono text-destructive">
                          {fmt(Number(data.item?.outros_descontos))}
                        </td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot>
                    <tr className="border-t font-bold text-sm">
                      <td className="py-3">LÍQUIDO A RECEBER</td>
                      <td
                        colSpan={2}
                        className="py-3 text-right font-mono text-base text-primary font-black"
                      >
                        {fmt(Number(data.item?.valor_liquido || 0))}
                      </td>
                    </tr>
                  </tfoot>
                </table>

                <div className="pt-6 text-center text-xs text-muted-foreground border-t border-dashed">
                  <div className="w-64 border-b border-foreground/30 mx-auto mb-1"></div>
                  <p>Assinatura do Colaborador</p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 p-4 border-t bg-muted/20">
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
          <Button variant="outline" onClick={handlePrint} disabled={!data}>
            <Printer size={14} className="mr-1.5" /> Imprimir
          </Button>
          <Button onClick={handleDownloadPDF} disabled={!data}>
            <Download size={14} className="mr-1.5" /> Baixar PDF
          </Button>
        </div>
      </div>
    </div>
  );
};
