import React from 'react';
import Modal from './ui/Modal';
import { FiPrinter, FiX, FiCheckCircle } from 'react-icons/fi';

interface ReciboModalProps {
  isOpen: boolean;
  onClose: () => void;
  titulo: any;
  tipo: 'pagar' | 'receber';
  beneficiarioOuPagador: string;
}

const ReciboModal: React.FC<ReciboModalProps> = ({ isOpen, onClose, titulo, tipo, beneficiarioOuPagador }) => {
  if (!titulo) return null;

  const handlePrint = () => {
    const printContent = document.getElementById('recibo-print-area');
    const windowUrl = 'about:blank';
    const uniqueName = new Date().getTime();
    const windowName = 'Print' + uniqueName;
    const printWindow = window.open(windowUrl, windowName, 'left=50,top=50,width=800,height=900');
    
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Recibo de Quitação - ${titulo.numero_titulo}</title>
            <style>
              body { font-family: sans-serif; padding: 40px; color: #333; }
              .recibo { border: 2px solid #eee; padding: 40px; position: relative; }
              .header { border-bottom: 2px solid #eee; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; }
              .title { font-size: 24px; font-weight: 800; color: #000; margin: 0; }
              .valor { font-size: 20px; font-weight: 700; background: #f4f4f4; padding: 10px 20px; border-radius: 4px; }
              .content { line-height: 1.6; font-size: 16px; margin-bottom: 50px; }
              .footer { margin-top: 80px; display: flex; flex-direction: column; align-items: center; }
              .signature { border-top: 1px solid #000; width: 300px; text-align: center; padding-top: 10px; margin-top: 40px; }
              .details { font-size: 12px; color: #666; margin-top: 40px; border-top: 1px solid #eee; padding-top: 20px; }
              @media print { .no-print { display: none; } }
            </style>
          </head>
          <body>
            ${printContent?.innerHTML}
            <script>
              window.onload = function() { window.print(); window.close(); }
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Recibo de Quitação" width="700px">
      <div id="recibo-print-area">
        <div className="recibo" style={{ padding: '2rem', border: '1px solid var(--border)', borderRadius: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', borderBottom: '1px solid var(--border)', paddingBottom: '1.5rem' }}>
            <div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 900, margin: 0 }}>RECIBO DE QUITAÇÃO</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '0.25rem 0 0 0' }}>Título Nº {titulo.numero_titulo}</p>
            </div>
            <div style={{ padding: '0.75rem 1.25rem', background: 'var(--card-bg)', borderRadius: '8px', border: '1px solid var(--border)', fontWeight: 900, fontSize: '1.25rem' }}>
              R$ {Number(titulo.valor_original).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
          </div>

          <div style={{ lineHeight: 1.8, fontSize: '1rem', color: 'var(--text)', marginBottom: '3rem' }}>
            <p>
              Recebemos {tipo === 'receber' ? 'de' : 'para'} <strong>{beneficiarioOuPagador.toUpperCase()}</strong> a importância de 
              <strong> R$ {Number(titulo.valor_original).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>, 
              referente à quitação do título mencionado acima, com vencimento em <strong>{new Date(titulo.data_vencimento).toLocaleDateString('pt-BR')}</strong>.
            </p>
            <p>
              Pela presente, damos plena, geral e irrevogável quitação do referido valor, para nada mais reclamar a qualquer título ou tempo.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '4rem' }}>
            <p style={{ fontSize: '0.9rem', marginBottom: '3rem' }}>
              Blumenau/SC, {new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
            </p>
            <div style={{ width: '250px', borderTop: '1px solid var(--text)', textAlign: 'center', paddingTop: '0.5rem', fontSize: '0.85rem', fontWeight: 600 }}>
              D'LUXURY MARCENARIA
            </div>
          </div>

          <div style={{ marginTop: '3rem', paddingTop: '1.5rem', borderTop: '1px dotted var(--border)', fontSize: '0.7rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
            <span>Autenticação Eletrônica: {titulo.id?.substring(0,18).toUpperCase()}</span>
            <span>Emitido via D'Luxury ERP</span>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '2rem' }}>
        <button className="btn btn-outline" onClick={onClose}>
          <FiX /> FECHAR
        </button>
        <button className="btn btn-primary" onClick={handlePrint}>
          <FiPrinter /> IMPRIMIR RECIBO
        </button>
      </div>
    </Modal>
  );
};

export default ReciboModal;
