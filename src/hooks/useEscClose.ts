import { useEffect } from 'react';

/**
 * Hook para fechar modais/overlays com a tecla ESC.
 * Registra o listener ao montar e remove ao desmontar.
 * @param onClose Função chamada ao pressionar ESC
 * @param enabled Se true (default), escuta o evento. Passar false para desativar.
 */
export function useEscClose(onClose: () => void, enabled: boolean = true) {
  useEffect(() => {
    if (!enabled) return;
    
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose, enabled]);
}

