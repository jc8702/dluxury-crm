import React, { useState } from 'react';
import { Modal, Button, Badge } from '@/components/ui';
import { CheckCircle2, AlertCircle, FileSpreadsheet, Loader2 } from 'lucide-react';
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
      await onAddItems(results);
      onClose();
      setStatus('idle');
      setResults(null);
      toastSuccess(`${results.length} itens importados com sucesso!`);
    } catch (error: any) {
      console.error('[ImportarProjeto] Erro:', error);
      toastError(`Erro ao importar: ${error.message}`);
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <>
      <Modal
        open={isOpen}
        onClose={() => {
          setStatus('idle');
          onClose();
        }}
        title="Importar Projeto"
        size="md"
      >
        {status === 'idle' && (
          <div className="flex justify-center py-4">
            <button
              type="button"
              onClick={() => {
                setIsCSVModalOpen(true);
                onClose();
              }}
              className="w-full border-2 border-dashed border-[var(--ui-border)] rounded-[var(--ui-radius-lg)] p-8 flex flex-col items-center justify-center gap-3 hover:border-[var(--ui-color-success)]/50 hover:bg-[var(--ui-color-success-soft)] transition-colors group"
            >
              <div className="w-14 h-14 rounded-full bg-[var(--ui-bg-subtle)] flex items-center justify-center group-hover:scale-110 transition-transform">
                <FileSpreadsheet
                  size={28}
                  className="text-[var(--ui-text-secondary)] group-hover:text-[var(--ui-color-success)]"
                />
              </div>
              <div className="text-center">
                <p className="font-semibold text-[var(--ui-text-primary)] text-base">
                  CSV (SketchUp)
                </p>
                <p className="text-xs text-[var(--ui-text-secondary)] mt-1">
                  Clique para abrir o importador CutList Bridge / Report
                </p>
              </div>
            </button>
          </div>
        )}

        {(status === 'parsing' || status === 'uploading') && (
          <div className="flex flex-col items-center justify-center py-8 gap-4">
            <Loader2 size={36} className="text-[var(--ui-color-teal-500)] animate-spin" />
            <p className="animate-pulse text-[var(--ui-text-secondary)]">
              {status === 'parsing' ? 'Extraindo dados...' : 'Sincronizando...'}
            </p>
          </div>
        )}

        {status === 'success' && (
          <div className="flex flex-col items-center justify-center py-2 gap-5">
            <div className="w-14 h-14 rounded-full bg-[var(--ui-color-success-soft)] flex items-center justify-center">
              <CheckCircle2 size={36} className="text-[var(--ui-color-success)]" />
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-lg font-semibold text-[var(--ui-text-primary)]">
                Pronto para importar!
              </h3>
              <div className="text-xs text-[var(--ui-text-secondary)] bg-[var(--ui-bg-subtle)] p-3 rounded-[var(--ui-radius-md)] border border-[var(--ui-border)] text-left space-y-1 min-w-[260px]">
                <div className="flex justify-between">
                  <span>Itens:</span>
                  <span className="text-[var(--ui-text-primary)] font-semibold">
                    {results?.length || 0}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Mapeados:</span>
                  <Badge tone="success">
                    {results?.filter((r: any) => r.match_sugerido).length || 0}
                  </Badge>
                </div>
              </div>
            </div>
            <Button
              variant="primary"
              size="lg"
              block
              onClick={handleConfirmarImportacao}
              isLoading={isAdding}
            >
              Adicionar ao Orçamento
            </Button>
          </div>
        )}

        <div className="mt-4 flex items-start gap-2 p-3 bg-[var(--ui-bg-subtle)] border border-[var(--ui-border)] rounded-[var(--ui-radius-md)] text-[var(--ui-text-xs)] text-[var(--ui-text-secondary)]">
          <AlertCircle size={14} className="shrink-0 mt-0.5" />
          <p>
            Importe listas de peças diretamente dos seus projetos 3D para economizar tempo e evitar
            erros de digitação.
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
