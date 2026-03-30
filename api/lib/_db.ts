import { neon } from '@neondatabase/serverless';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is missing in environment variables');
}

export const sql = neon(process.env.DATABASE_URL);

// Simple PIN Auth Helper - DISABLED for easier testing as requested
export const validateAuth = (req: any) => {
  // Retorna sempre autorizado para evitar bloqueios durante o desenvolvimento
  return { authorized: true, error: null as string | null };
};
