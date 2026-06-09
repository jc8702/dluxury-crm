import React, { useState } from 'react';
import { Download, Layers, Printer, FileSpreadsheet, Loader2 } from 'lucide-react';
import type { ResultadoPlano, Superficie } from '../../../../utils/planodeCorte';
import { exportarMapaCorte } from '../../application/usecases/ExportarMapaCorte';
import { exportarEtiquetas } from '../../application/usecases/ExportarEtiquetas';
import { exportarCNC, salvarArquivoCNC } from '../../application/usecases/ExportarCNC';
import { useToast } from '../../../../context/ToastContext';
import type { ResultadoOtimizacao, LayoutChapa } from '../../domain/entities/CuttingPlan';
// @todo migrar para Modal de @/components/ui (trocar isOpen → open)
import { Modal } from '../../../../components/common';

interface ExportacaoModalProps {
  resultado: ResultadoPlano;
  planoNome: string;
  activeSuperficie?: Superficie;
  activeChapaIdx?: number;
  kerfMm?: number;
  onClose: () => void;
}

export const ExportacaoModal: React.FC<ExportacaoModalProps> = ({
  resultado,
  planoNome,
  activeSuperficie,
  activeChapaIdx = 0,
  onClose,
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const { error: toastError } = useToast();

  // Mapeamento De-Para: Legado (utils/planodeCorte) -> Domínio (entities/CuttingPlan)
  const mapearParaDominio = (): ResultadoOtimizacao => {
    const layouts: LayoutChapa[] = resultado.grupos.flatMap((g) =>
      g.superficies.map((s, idx) => ({
        chapa_sku: g.sku,
        indice_chapa: idx,
        largura_original_mm: s.largura,
        altura_original_mm: s.altura,
        area_aproveitada_mm2: (s.aproveitamentoPct / 100) * (s.largura * s.altura),
        area_desperdicada_mm2: (1 - s.aproveitamentoPct / 100) * (s.largura * s.altura),
        pecas_posicionadas: s.pecasPositionadas.map((p) => ({
          peca_id: p.pecaId,
          nome: p.descricao,
          x: p.x,
          y: p.y,
          largura: p.largura,
          altura: p.altura,
          rotacionada: p.rotacionada,
          fio_de_fita: (p as any).fio_de_fita, // Pass-through if exists
        })),
      })),
    );

    return {
      chapas_necessarias: layouts.length,
      aproveitamento_percentual: resultado.aproveitamentoGeral,
      layouts,
      tempo_calculo_ms: 0,
    };
  };

  const handleExportCSV = () => {
    setIsExporting(true);
    try {
      const headers = [
        'Etiqueta',
        'Descrição',
        'L (mm)',
        'A (mm)',
        'Qtd',
        'Material',
        'Ambiente',
        'Chapa',
      ];
      const rows = resultado.grupos.flatMap((g) =>
        g.superficies.flatMap((s) =>
          s.pecasPositionadas.map((p) => [
            p.numeroEtiqueta,
            p.descricao,
            p.largura,
            p.altura,
            1,
            g.sku,
            p.ambiente || 'N/A',
            s.id,
          ]),
        ),
      );
      const csvContent = [headers, ...rows].map((e) => e.join(',')).join('\n');
      const blob = new Blob([`\ufeff${csvContent}`], { type: 'text/csv;charset=utf-8' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `lista_producao_${planoNome.replace(/\s+/g, '_')}.csv`;
      link.click();
    } finally {
      setIsExporting(false);
      onClose();
    }
  };

  const handleExportMapaPDF = async () => {
    setIsExporting(true);
    try {
      const dadosDominio = mapearParaDominio();
      await exportarMapaCorte(dadosDominio);
    } catch (e) {
      console.error(e);
      toastError('Erro ao gerar PDF do Mapa de Corte.');
    } finally {
      setIsExporting(false);
      onClose();
    }
  };

  const handleExportEtiquetas = async () => {
    setIsExporting(true);
    try {
      const todasPecas = resultado.grupos.flatMap((g) =>
        g.superficies.flatMap((s) =>
          s.pecasPositionadas.map((p) => ({
            ...p,
            nome: p.descricao,
            peca_id: p.pecaId,
            sku_chapa: g.sku,
          })),
        ),
      );
      await exportarEtiquetas(todasPecas, planoNome);
    } catch (e) {
      console.error(e);
      toastError('Erro ao gerar PDF de Etiquetas.');
    } finally {
      setIsExporting(false);
      onClose();
    }
  };

  const handleExportGCode = async () => {
    if (!activeSuperficie) {
      toastError('Selecione uma chapa no painel principal para exportar o G-Code.');
      return;
    }
    setIsExporting(true);
    try {
      const layout: LayoutChapa = {
        chapa_sku: 'CHAPA', // Placeholder
        indice_chapa: activeChapaIdx,
        largura_original_mm: activeSuperficie.largura,
        altura_original_mm: activeSuperficie.altura,
        pecas_posicionadas: activeSuperficie.pecasPositionadas.map((p) => ({
          peca_id: p.pecaId,
          nome: p.descricao,
          x: p.x,
          y: p.y,
          largura: p.largura,
          altura: p.altura,
          rotacionada: p.rotacionada,
        })),
        area_aproveitada_mm2: 0,
        area_desperdicada_mm2: 0,
      };
      const gcode = exportarCNC(layout);
      salvarArquivoCNC(
        gcode,
        `cnc_${planoNome.replace(/\s+/g, '_')}_chapa_${activeChapaIdx + 1}.nc`,
      );
    } catch (e) {
      console.error(e);
      toastError('Erro ao gerar G-Code.');
    } finally {
      setIsExporting(false);
      onClose();
    }
  };

  return (
    <Modal open={true} onClose={onClose} title="Central de Exportação" size="lg">
      <div className="flex flex-col gap-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Mapa de Corte */}
          <button
            onClick={handleExportMapaPDF}
            disabled={isExporting}
            className="group flex flex-col items-start p-5 bg-foreground/5 border border-border/40 rounded-2xl hover:border-primary/50 hover:bg-foreground/10 transition-all text-left disabled:opacity-50"
          >
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary mb-3 group-hover:scale-105 transition-transform border border-primary/20">
              <Download size={24} />
            </div>
            <h3 className="font-bold text-sm text-foreground group-hover:text-primary transition-colors tracking-tight">
              Mapa de Corte (PDF)
            </h3>
            <p className="text-[10px] text-muted-foreground mt-1">
              Escala 1:8 em formato A3 para montagem na fábrica.
            </p>
          </button>

          {/* Etiquetas */}
          <button
            onClick={handleExportEtiquetas}
            disabled={isExporting}
            className="group flex flex-col items-start p-5 bg-foreground/5 border border-border/40 rounded-2xl hover:border-primary/50 hover:bg-foreground/10 transition-all text-left disabled:opacity-50"
          >
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary mb-3 group-hover:scale-105 transition-transform border border-primary/20">
              <Printer size={24} />
            </div>
            <h3 className="font-bold text-sm text-foreground group-hover:text-primary transition-colors tracking-tight">
              Etiquetas (Térmica)
            </h3>
            <p className="text-[10px] text-muted-foreground mt-1">
              Etiquetas 100x50mm com QR Code e informações industriais.
            </p>
          </button>

          {/* G-Code CNC */}
          <button
            onClick={handleExportGCode}
            disabled={isExporting || !activeSuperficie}
            className="group flex flex-col items-start p-5 bg-foreground/5 border border-border/40 rounded-2xl hover:border-primary/50 hover:bg-foreground/10 transition-all text-left disabled:opacity-50"
          >
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary mb-3 group-hover:scale-105 transition-transform border border-primary/20">
              <Layers size={24} />
            </div>
            <h3 className="font-bold text-sm text-foreground group-hover:text-primary transition-colors tracking-tight">
              Arquivo CNC (G-Code)
            </h3>
            <p className="text-[10px] text-muted-foreground mt-1">
              {activeSuperficie
                ? `Chapa atual (Chapa ${activeChapaIdx + 1})`
                : 'Selecione uma chapa no painel primeiro.'}
            </p>
          </button>

          {/* Lista de Produção (CSV) */}
          <button
            onClick={handleExportCSV}
            disabled={isExporting}
            className="group flex flex-col items-start p-5 bg-foreground/5 border border-border/40 rounded-2xl hover:border-primary/50 hover:bg-foreground/10 transition-all text-left disabled:opacity-50"
          >
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary mb-3 group-hover:scale-105 transition-transform border border-primary/20">
              <FileSpreadsheet size={24} />
            </div>
            <h3 className="font-bold text-sm text-foreground group-hover:text-primary transition-colors tracking-tight">
              Lista de Peças (CSV)
            </h3>
            <p className="text-[10px] text-muted-foreground mt-1">
              Exportação bruta de peças para ERPs e planilhas externas.
            </p>
          </button>
        </div>

        {isExporting && (
          <div className="p-4 bg-primary/5 border border-primary/15 rounded-xl flex items-center justify-center gap-3">
            <Loader2 className="w-4 h-4 animate-spin text-primary" />
            <span className="text-xs font-bold text-primary">
              Gerando arquivos de exportação...
            </span>
          </div>
        )}
      </div>
    </Modal>
  );
};
