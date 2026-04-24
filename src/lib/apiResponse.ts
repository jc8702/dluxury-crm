/**
 * Resposta padronizada para APIs.
 * Garante consistência em todas as respostas do sistema.
 */

export function success(data: any, message?: string) {
  return {
    success: true,
    data,
    message: message || null,
    error: null,
    timestamp: new Date().toISOString()
  };
}

export function failure(error: string, statusCode: number = 400) {
  return {
    success: false,
    data: null,
    message: null,
    error,
    statusCode,
    timestamp: new Date().toISOString()
  };
}

export function validationError(errors: any[]) {
  return {
    success: false,
    data: null,
    message: 'Erro de validação',
    error: errors,
    timestamp: new Date().toISOString()
  };
}