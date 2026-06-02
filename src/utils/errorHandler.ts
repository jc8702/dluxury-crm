export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public details?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const handleError = (error: unknown) => {
  if (error instanceof AppError) {
    return { message: error.message, statusCode: error.statusCode };
  }
  if (error instanceof Error) {
    return { message: error.message, statusCode: 500 };
  }
  return { message: 'Erro interno', statusCode: 500 };
};
