interface EnvConfig {
  DATABASE_URL: string;
  APP_JWT_SECRET: string;
  ADMIN_DEFAULT_EMAIL: string;
  NODE_ENV: string;
}

function validateEnv(): EnvConfig {
  const required = ['DATABASE_URL', 'APP_JWT_SECRET', 'ADMIN_DEFAULT_EMAIL'];

  const missing = required.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`[config] Variáveis de ambiente faltando: ${missing.join(', ')}`);
  }

  const jwtSecret = process.env.APP_JWT_SECRET!;
  if (jwtSecret.length < 32) {
    throw new Error('[config] APP_JWT_SECRET deve ter pelo menos 32 caracteres');
  }

  return {
    DATABASE_URL: process.env.DATABASE_URL!,
    APP_JWT_SECRET: jwtSecret,
    ADMIN_DEFAULT_EMAIL: process.env.ADMIN_DEFAULT_EMAIL || 'admin@dluxury.com',
    NODE_ENV: process.env.NODE_ENV || 'development',
  };
}

export const config = validateEnv();
