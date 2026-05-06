import { ResultadoPlano } from '../../../utils/planodeCorte';

interface PrintEtiquetasProps {
  resultado: ResultadoPlano | null;
}

export const PrintEtiquetas = ({ resultado }: PrintEtiquetasProps) => {
  return (
    <>
      <style>{`
        @media print {
          .hide-on-print, .sidebar, .topbar, nav, header, button, .modal-overlay { 
            display: none !important; 
          }
          .app-content, .page-container, .main-layout, #root, body, html {
            padding: 0 !important;
            margin: 0 !important;
            background: white !important;
            color: black !important;
            overflow: visible !important;
            height: auto !important;
          }
          .print-only { 
            display: block !important; 
            position: absolute;
            top: 0; left: 0; width: 100%;
          }
          .print-etiquetas { display: grid; grid-template-columns: 1fr 1fr; gap: 8mm; padding: 10mm; }
          .etiqueta { width: 95mm; height: 45mm; border: 1px solid #000; padding: 4mm; color: #000; font-family: sans-serif; position: relative; display: flex; break-inside: avoid; margin-bottom: 2mm; }
          .etiqueta-content { flex: 1; }
          .etiqueta-header { display: flex; justify-content: space-between; font-size: 7pt; border-bottom: 1px solid #ddd; margin-bottom: 1mm; font-weight: bold; }
          .etiqueta-title { font-size: 10pt; font-weight: 800; margin-bottom: 1mm; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
          .etiqueta-dim { font-size: 18pt; font-weight: 900; margin: 1mm 0; }
          .etiqueta-footer { position: absolute; bottom: 4mm; left: 4mm; right: 25mm; font-size: 7pt; color: #666; display: flex; justify-content: space-between; }
          .etiqueta-qr { width: 20mm; height: 20mm; margin-left: 2mm; align-self: center; }
        }
        @media screen {
          .print-only { display: none !important; }
        }
      `}</style>
      
      <div className="print-only">
        <div className="print-etiquetas">
          {resultado?.grupos.flatMap(g => g.superficies.flatMap(s => s.pecasPositionadas.map(p => (
            <div key={`${p.pecaId}-${p.numeroEtiqueta}`} className="etiqueta">
              <div className="etiqueta-content">
                <div className="etiqueta-header">
                  <span>D'LUXURY ERP</span>
                  <span>#{String(p.numeroEtiqueta).padStart(3, '0')}</span>
                </div>
                <div className="etiqueta-title">{p.descricao}</div>
                <div className="etiqueta-dim">{p.largura} × {p.altura} <span style={{fontSize: '10pt'}}>mm</span></div>
                <div className="etiqueta-footer">
                  <span>{p.ambiente} | {p.movel || 'Geral'}</span>
                  <span style={{fontWeight: 'bold'}}>{g.sku}</span>
                </div>
              </div>
              <img 
                className="etiqueta-qr" 
                src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=ID:${p.pecaId}|DIM:${p.largura}x${p.altura}|MAT:${g.sku}`} 
                alt="QR Code" 
              />
            </div>
          ))))}
        </div>
      </div>
    </>
  );
};
