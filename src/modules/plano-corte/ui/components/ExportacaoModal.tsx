import React, { useState } from 'react';
import { FileText, Download, Layers, Printer, X, FileSpreadsheet, Loader2 } from 'lucide-react';
import type { ResultadoPlano, Superficie } from '../../../../utils/planodeCorte';
import { exportarMapaCorte } from '../../application/usecases/ExportarMapaCorte';
import { exportarEtiquetas } from '../../application/usecases/ExportarEtiquetas';
import { exportarCNC, salvarArquivoCNC } from '../../application/usecases/ExportarCNC';
import type { ResultadoOtimizacao, LayoutChapa } from '../../domain/entities/CuttingPlan';

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
  kerfMm = 3,
  onClose 
}) => {
  const [isExporting, setIsExporting] = useState(false);

  // Mapeamento De-Para: Legado (utils/planodeCorte) -> Domínio (entities/CuttingPlan)
  const mapearParaDominio = (): ResultadoOtimizacao => {
    const layouts: LayoutChapa[] = resultado.grupos.flatMap(g => 
      g.superficies.map((s, idx) => ({
        chapa_sku: g.sku,
        indice_chapa: idx,
        largura_original_mm: s.largura,
        altura_original_mm: s.altura,
        area_aproveitada_mm2: (s.aproveitamentoPct / 100) * (s.largura * s.altura),
        area_desperdicada_mm2: (1 - s.aproveitamentoPct / 100) * (s.largura * s.altura),
        pecas_posicionadas: s.pecasPositionadas.map(p => ({
          peca_id: p.pecaId,
          nome: p.descricao,
          x: p.x,
          y: p.y,
          largura: p.largura,
          altura: p.altura,
          rotacionada: p.rotacionada,
          fio_de_fita: (p as any).fio_de_fita // Pass-through if exists
        }))
      }))
    );

    return {
      chapas_necessarias: layouts.length,
      aproveitamento_percentual: resultado.aproveitamentoGeral,
      layouts,
      tempo_calculo_ms: 0
    };
  };

  const handleExportCSV = () => {
    setIsExporting(true);
    try {
      const headers = ['Etiqueta', 'Descrição', 'L (mm)', 'A (mm)', 'Qtd', 'Material', 'Ambiente', 'Chapa'];
      const rows = resultado.grupos.flatMap(g => 
        g.superficies.flatMap(s => 
          s.pecasPositionadas.map(p => [
            p.numeroEtiqueta, p.descricao, p.largura, p.altura, 1, g.sku, p.ambiente || 'N/A', s.id
          ])
        )
      );
      const csvContent = [headers, ...rows].map(e => e.join(',')).join('\n');
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
      alert('Erro ao gerar PDF do Mapa de Corte.');
    } finally {
      setIsExporting(false);
      onClose();
    }
  };

  const handleExportEtiquetas = async () => {
    setIsExporting(true);
    try {
      const todasPecas = resultado.grupos.flatMap(g => 
        g.superficies.flatMap(s => 
          s.pecasPositionadas.map(p => ({
            ...p,
            nome: p.descricao,
            peca_id: p.pecaId,
            sku_chapa: g.sku
          }))
        )
      );
      await exportarEtiquetas(todasPecas, planoNome);
    } catch (e) {
      console.error(e);
      alert('Erro ao gerar PDF de Etiquetas.');
    } finally {
      setIsExporting(false);
      onClose();
    }
  };

  const handleExportGCode = async () => {
    if (!activeSuperficie) {
      alert("Selecione uma chapa no painel principal para exportar o G-Code.");
      return;
    }
    setIsExporting(true);
    try {
      const layout: LayoutChapa = {
        chapa_sku: "CHAPA", // Placeholder
        indice_chapa: activeChapaIdx,
        largura_original_mm: activeSuperficie.largura,
        altura_original_mm: activeSuperficie.altura,
        pecas_posicionadas: activeSuperficie.pecasPositionadas.map(p => ({
          peca_id: p.pecaId,
          nome: p.descricao,
          x: p.x,
          y: p.y,
          largura: p.largura,
          altura: p.altura,
          rotacionada: p.rotacionada
        })),
        area_aproveitada_mm2: 0,
        area_desperdicada_mm2: 0
      };
      const gcode = exportarCNC(layout);
      salvarArquivoCNC(gcode, `cnc_${planoNome.replace(/\s+/g, '_')}_chapa_${activeChapaIdx + 1}.nc`);
    } catch (e) {
      console.error(e);
      alert('Erro ao gerar G-Code.');
    } finally {
      setIsExporting(false);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-300">
      <div className="glass-elevated w-full max-w-2xl overflow-hidden rounded-3xl border border-border/40 shadow-2xl animate-in zoom-in duration-300">
        <div className="p-8 border-b border-border/40 flex items-center justify-between bg-card/40">
          <div>
            <h2 className="text-2xl font-black text-foreground tracking-tight">CENTRAL DE EXPORTAÇÃO</h2>
            <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest opacity-60">Escolha o formato de saída para produção industrial</p>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 rounded-xl hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all"
          >
            <X size={28} />
          </button>
        </div>

        <div className="p-8 grid grid-cols-2 gap-6 bg-card/20">
          
          {/* Mapa de Corte */}
          <button 
            onClick={handleExportMapaPDF} 
            disabled={isExporting}
            className="group flex flex-col items-start p-6 bg-white/[0.02] border border-border/40 rounded-2xl hover:border-primary/30 hover:bg-white/[0.04] transition-all text-left disabled:opacity-50"
          >
            <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center text-primary mb-4 group-hover:scale-110 transition-transform border border-primary/20">
              <Download size={28} />
            </div>
            <h3 className="font-black text-foreground group-hover:text-primary transition-colors tracking-tight">MAPA DE CORTE (PDF)</h3>
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mt-2">Escala 1:8 em formato A3 para montagem.</p>
          </button>

          {/* Etiquetas */}
          <button 
            onClick={handleExportEtiquetas} 
            disabled={isExporting}
            className="group flex flex-col items-start p-6 bg-white/[0.02] border border-border/40 rounded-2xl hover:border-info/30 hover:bg-white/[0.04] transition-all text-left disabled:opacity-50"
          >
            <div className="w-14 h-14 bg-info/10 rounded-xl flex items-center justify-center text-info mb-4 group-hover:scale-110 transition-transform border border-info/20">
              <Printer size={28} />
            </div>
            <h3 className="font-black text-foreground group-hover:text-info transition-colors tracking-tight">ETIQUETAS (TÉRMICA)</h3>
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mt-2">Etiquetas 100x50mm com QR Code industrial.</p>
          </button>

          {/* G-Code CNC */}
          <button 
            onClick={handleExportGCode} 
            disabled={isExporting || !activeSuperficie}
            className="group flex flex-col items-start p-6 bg-white/[0.02] border border-border/40 rounded-2xl hover:border-success/30 hover:bg-white/[0.04] transition-all text-left disabled:opacity-50"
          >
            <div className="w-14 h-14 bg-success/10 rounded-xl flex items-center justify-center text-success mb-4 group-hover:scale-110 transition-transform border border-success/20">
              <Layers size={28} />
            </div>
            <h3 className="font-black text-foreground group-hover:text-success transition-colors tracking-tight">ARQUIVO CNC (G-CODE)</h3>
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mt-2">
              {activeSuperficie ? `CHAPA ATUAL (${activeSuperficie.id})` : 'SELECIONE UMA CHAPA NO PAINEL PRIMEIRO.'}
            </p>
          </button>

          {/* Lista de Produção (CSV) */}
          <button 
            onClick={handleExportCSV} 
            disabled={isExporting}
            className="group flex flex-col items-start p-6 bg-white/[0.02] border border-border/40 rounded-2xl hover:border-pink-500/30 hover:bg-white/[0.04] transition-all text-left disabled:opacity-50"
          >
            <div className="w-14 h-14 bg-pink-500/10 rounded-xl flex items-center justify-center text-pink-500 mb-4 group-hover:scale-110 transition-transform border border-pink-500/20">
              <FileSpreadsheet size={28} />
            </div>
            <h3 className="font-black text-foreground group-hover:text-pink-500 transition-colors tracking-tight">LISTA DE PEÇAS (CSV)</h3>
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mt-2">Lista bruta para ERPs e sistemas externos.</p>
          </button>

        </div>
        
        {isExporting && (
          <div className="p-6 bg-primary/5 border-t border-border/40 flex items-center justify-center gap-3">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
            <span className="text-xs font-black text-primary uppercase tracking-widest">Gerando arquivo industrial, aguarde...</span>
          </div>
        )}
      </div>
    </div>
  );
};

