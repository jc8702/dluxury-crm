import { useEffect } from 'react';

/**
 * Hook para fechar modais/overlays com a tecla ESC.
 * Registra o listener ao montar e remove ao desmontar.
 */
export function useEscClose(onClose: () => void) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);
}
