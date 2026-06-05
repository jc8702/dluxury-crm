import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getEnvVar, getJWTSecret, getDatabaseURL, getGoogleAPIKey, BCRYPT_ROUNDS } from '../config.js';

describe('config.ts', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('deve obter variavel de ambiente com sucesso', () => {
    process.env.TEST_VAR = 'hello';
    expect(getEnvVar('TEST_VAR')).toBe('hello');
  });

  it('deve lancar erro se variavel de ambiente nao existir', () => {
    delete process.env.TEST_VAR;
    expect(() => getEnvVar('TEST_VAR')).toThrow('Variável de ambiente TEST_VAR não está definida');
  });

  it('deve obter segredo JWT', () => {
    process.env.APP_JWT_SECRET = 'secret123';
    expect(getJWTSecret()).toBe('secret123');
  });

  it('deve obter URL do banco', () => {
    process.env.DATABASE_URL = 'postgres://db';
    expect(getDatabaseURL()).toBe('postgres://db');
  });

  it('deve obter chave API do Google por ordem de prioridade', () => {
    process.env.GOOGLE_GENERATIVE_AI_API_KEY = 'key1';
    expect(getGoogleAPIKey()).toBe('key1');

    delete process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    process.env.GEMINI_API_KEY = 'key2';
    expect(getGoogleAPIKey()).toBe('key2');

    delete process.env.GEMINI_API_KEY;
    process.env.GOOGLE_GENERATION_AI_API_KEY = 'key3';
    expect(getGoogleAPIKey()).toBe('key3');
  });

  it('deve ter BCRYPT_ROUNDS igual a 14', () => {
    expect(BCRYPT_ROUNDS).toBe(14);
  });

  it('deve parsear ALLOWED_ORIGINS quando fornecido no env', async () => {
    vi.resetModules();
    process.env.ALLOWED_ORIGINS = 'http://site1.com, http://site2.com';
    const configMod = await import('../config.js');
    expect(configMod.ALLOWED_ORIGINS).toEqual(['http://site1.com', 'http://site2.com']);
  });
});
