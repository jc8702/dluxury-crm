import React, { useState } from 'react';
import { Modal, Button } from '@/components/common';
import { CheckCircle2, AlertCircle, FileSpreadsheet } from 'lucide-react';
import { useToast } from '@/context/ToastContext';
import { ImportarCSV } from './ImportarCSV';

/**
 * ImportarProjeto - Componente Unificado
 * Suporta PDF (Promob) e CSV (SketchUp)
 */
export function ImportarProjeto({
  isOpen,
  onClose,
  onAddItems,
  orcamentoId,
}: {
  isOpen: boolean;
  onClose: () => void;
  onAddItems: (items: any[]) => Promise<void>;
  orcamentoId: string;
}) {
  const { error: toastError, success: toastSuccess } = useToast();
  const [status, setStatus] = useState<'idle' | 'parsing' | 'uploading' | 'success'>('idle');
  const [results, setResults] = useState<any[] | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [isCSVModalOpen, setIsCSVModalOpen] = useState(false);

  const handleConfirmarImportacao = async () => {
    if (!results) return;
    setIsAdding(true);
    try {
      // Chamar callback que vem do pai (importItems do hook)
      await onAddItems(results);

      // Fechar modal
      onClose();

      setStatus('idle');
      setResults(null);

      toastSuccess(`${results.length} itens importados com sucesso!`);
    } catch (error: any) {
      console.error('âŒ [ImportarProjeto] Erro:', error);
      toastError(`Erro ao importar: ${error.message}`);
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={() => {
          setStatus('idle');
          onClose();
        }}
        title="Importar Projeto"
        size="md"
      >
        <div className="py-8">
          {status === 'idle' && (
            <div className="flex justify-center">
              <div
                onClick={() => {
                  setIsCSVModalOpen(true);
                  onClose();
                }}
                className="w-full border-2 border-dashed border-border rounded-2xl p-10 flex flex-col items-center justify-center gap-4 hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all cursor-pointer group"
              >
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center group-hover:scale-110 transition-transform">
                  <FileSpreadsheet className="w-8 h-8 text-muted-foreground group-hover:text-emerald-500" />
                </div>
                <div className="text-center">
                  <p className="font-bold text-foreground text-base">CSV (SketchUp)</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Clique para abrir o importador CutList Bridge / Report
                  </p>
                </div>
              </div>
            </div>
          )}

          {(status === 'parsing' || status === 'uploading') && (
            <div className="flex flex-col items-center justify-center py-10 gap-4">
              <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
              <p className="animate-pulse text-muted-foreground">
                {status === 'parsing' ? 'Extraindo dados...' : 'Sincronizando...'}
              </p>
            </div>
          )}

          {status === 'success' && (
            <div className="flex flex-col items-center justify-center py-4 gap-6 animate-in zoom-in-95 duration-300">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <CheckCircle2 className="w-10 h-10 text-emerald-500" />
              </div>
              <div className="text-center space-y-2">
                <h3 className="text-lg font-bold text-foreground">Pronto para importar!</h3>
                <div className="text-xs text-muted-foreground bg-muted/50 p-4 rounded-lg border border-border text-left space-y-2 min-w-[280px]">
                  <div className="flex justify-between">
                    <span>Itens:</span>{' '}
                    <span className="text-foreground font-bold">{results?.length || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Mapeados:</span>{' '}
                    <span className="text-emerald-500 font-bold">
                      {results?.filter((r: any) => r.match_sugerido).length || 0}
                    </span>
                  </div>
                </div>
              </div>
              <Button
                className="w-full bg-primary hover:bg-primary-hover h-12 text-primary-foreground font-bold"
                onClick={handleConfirmarImportacao}
                disabled={isAdding}
              >
                {isAdding ? 'Adicionando...' : 'Adicionar ao OrÃ§amento'}
              </Button>
            </div>
          )}
        </div>

        <div className="flex items-start gap-2 p-4 bg-muted/30 border border-border rounded-xl text-[10px] text-muted-foreground">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
          <p>
            Importe listas de peÃ§as diretamente dos seus projetos 3D para economizar tempo e evitar
            erros de digitaÃ§Ã£o.
          </p>
        </div>
      </Modal>

      <ImportarCSV
        isOpen={isCSVModalOpen}
        onClose={() => setIsCSVModalOpen(false)}
        onAddItems={onAddItems}
        orcamentoId={orcamentoId}
      />
    </>
  );
}
