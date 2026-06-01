import { useCallback } from 'react';
import { useToast } from '../context/ToastContext';
import { AppError, ValidationError, AuthenticationError, ApiError } from '../utils/errors';
import { z } from 'zod';

export function useErrorHandler() {
  const { error: showErrorToast, warning: showWarningToast } = useToast();

  const handleError = useCallback(
    (error: unknown) => {
      console.error('[Error Handler]', error);

      if (error instanceof z.ZodError) {
        showWarningToast('Erro de validação', 'Verifique os campos preenchidos e tente novamente.');
        return;
      }

      if (error instanceof ValidationError) {
        showWarningToast('Dados Inválidos', error.message);
        return;
      }

      if (error instanceof AuthenticationError) {
        showErrorToast('Erro de Autenticação', error.message);
        // Aqui poderíamos forçar logout ou redirect
        return;
      }

      if (error instanceof ApiError) {
        showErrorToast(
          'Erro de Comunicação',
          error.message || 'Tivemos um problema de comunicação com o servidor.',
        );
        return;
      }

      if (error instanceof AppError) {
        showErrorToast('Atenção', error.message);
        return;
      }

      if (error instanceof Error) {
        showErrorToast('Erro Inesperado', error.message);
        return;
      }

      showErrorToast('Erro Desconhecido', 'Ocorreu um erro não mapeado no sistema.');
    },
    [showErrorToast, showWarningToast],
  );

  return { handleError };
}
