// Configuração centralizada - carrega variáveis de ambiente com validação

export function getEnvVar(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Variável de ambiente ${name} não está definida. Verifique seu arquivo .env`);
  }
  return value;
}

export function getJWTSecret(): string {
  return getEnvVar('APP_JWT_SECRET');
}

export function getDatabaseURL(): string {
  return getEnvVar('DATABASE_URL');
}

export function getGoogleAPIKey(): string {
  // Suporta múltiplos nomes de variáveis para compatibilidade
  return process.env.GOOGLE_GENERATIVE_AI_API_KEY 
    || process.env.GEMINI_API_KEY 
    || process.env.GOOGLE_GENERATION_AI_API_KEY 
    || getEnvVar('GOOGLE_GENERATIVE_AI_API_KEY');
}

export const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : ['https://dluxury-crm.vercel.app', 'http://localhost:5173', 'http://localhost:3000'];

export const BCRYPT_ROUNDS = 14;
