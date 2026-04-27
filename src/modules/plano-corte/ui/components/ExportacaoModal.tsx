import React, { useState } from 'react';
import { FileText, Download, Layers, Printer, X, FileSpreadsheet } from 'lucide-react';
import { ExportadorPDF } from '../../infrastructure/exports/ExportadorPDF';
import { ExportadorGCode } from '../../infrastructure/exports/ExportadorGCode';
import { ExportadorEtiquetas } from '../../infrastructure/exports/ExportadorEtiquetas';
import type { ResultadoPlano, Superficie } from '../../../../utils/planodeCorte';

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

  // Reúne todas as superfícies de todos os grupos
  const todasSuperficies = resultado.grupos.flatMap(g => g.superficies);

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
      await ExportadorPDF.exportarPlano(todasSuperficies, planoNome);
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
      await ExportadorEtiquetas.exportar(todasSuperficies, planoNome);
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
      ExportadorGCode.exportarChapa(activeSuperficie, activeChapaIdx, kerfMm);
    } catch (e) {
      console.error(e);
      alert('Erro ao gerar G-Code.');
    } finally {
      setIsExporting(false);
      onClose();
    }
  };

  return (
    <div className="modal-overlay hide-on-print" onClick={onClose} onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }} tabIndex={-1}>
      <div className="modal-content animate-pop-in" style={{ width: '650px', background: 'var(--surface)' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: '900', color: 'var(--text)' }}>Central de Exportação</h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Escolha o formato de saída para produção industrial</p>
          </div>
          <button onClick={onClose} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-muted)' }}>
            <X size={24} />
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
          
          {/* Mapa de Corte */}
          <div className="card hover-scale" onClick={handleExportMapaPDF} style={{ cursor: isExporting ? 'wait' : 'pointer', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ background: 'rgba(212, 175, 55, 0.1)', padding: '0.75rem', borderRadius: '8px', color: 'var(--primary)' }}>
                <Download size={28} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: '800' }}>Mapa de Corte (PDF)</h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>Escala 1:10 para conferência e montagem manual.</p>
              </div>
            </div>
          </div>

          {/* Etiquetas */}
          <div className="card hover-scale" onClick={handleExportEtiquetas} style={{ cursor: isExporting ? 'wait' : 'pointer', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '0.75rem', borderRadius: '8px', color: '#3B82F6' }}>
                <Printer size={28} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: '800' }}>Etiquetas (Térmica)</h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>Gerar PDF para impressora térmica com QR Code.</p>
              </div>
            </div>
          </div>

          {/* G-Code CNC */}
          <div className="card hover-scale" onClick={handleExportGCode} style={{ cursor: isExporting ? 'wait' : 'pointer', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', border: '1px solid var(--border)', opacity: activeSuperficie ? 1 : 0.5 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '0.75rem', borderRadius: '8px', color: '#10B981' }}>
                <Layers size={28} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: '800' }}>Arquivo CNC (G-Code)</h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  {activeSuperficie ? `Chapa atual (${activeSuperficie.id})` : 'Selecione uma chapa no painel primeiro.'}
                </p>
              </div>
            </div>
          </div>

          {/* Lista de Produção (CSV) */}
          <div className="card hover-scale" onClick={handleExportCSV} style={{ cursor: isExporting ? 'wait' : 'pointer', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ background: 'rgba(236, 72, 153, 0.1)', padding: '0.75rem', borderRadius: '8px', color: '#EC4899' }}>
                <FileSpreadsheet size={28} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: '800' }}>Lista de Peças (CSV)</h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>Lista bruta de peças para integração com outros sistemas.</p>
              </div>
            </div>
          </div>

        </div>
        
        {isExporting && (
          <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.85rem', color: 'var(--primary)', fontWeight: 'bold' }}>
            Gerando arquivo, aguarde...
          </div>
        )}
      </div>
    </div>
  );
};
