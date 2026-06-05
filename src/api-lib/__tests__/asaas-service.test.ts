import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AsaasService } from '../asaas-service.js';

vi.mock('node-fetch', () => ({
  default: vi.fn(),
}));

import fetch from 'node-fetch';

describe('AsaasService', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('Sem ASAAS_API_KEY (Simulação Fallback)', () => {
    beforeEach(() => {
      delete process.env.ASAAS_API_KEY;
    });

    it('deve simular criarCliente no fallback', async () => {
      const service = new AsaasService();
      const res = await service.criarCliente({
        name: 'Cliente Teste',
        email: 'teste@exemplo.com',
        externalReference: 'tenant-123',
      });
      expect(res.id).toContain('cus_mock_');
    });

    it('deve simular criarAssinatura no fallback', async () => {
      const service = new AsaasService();
      const res = await service.criarAssinatura({
        customer: 'cus_mock_123',
        plano: 'pro',
        valor: 197,
        externalReference: 'tenant-123',
      });
      expect(res.id).toContain('sub_mock_');
      expect(res.invoiceUrl).toContain('https://sandbox.asaas.com/i/mock_invoice_');
    });

    it('deve simular consultarStatusAssinatura no fallback', async () => {
      const service = new AsaasService();
      const res = await service.consultarStatusAssinatura('sub_mock_123');
      expect(res.status).toBe('ACTIVE');
      expect(res.nextDueDate).toBeDefined();
    });
  });

  describe('Com ASAAS_API_KEY (API Real)', () => {
    beforeEach(() => {
      process.env.ASAAS_API_KEY = 'real-api-key-test';
      process.env.ASAAS_ENVIRONMENT = 'production'; // Para usar baseurl de producao
    });

    it('deve chamar fetch para criarCliente com sucesso', async () => {
      const mockFetchResponse = {
        ok: true,
        json: async () => ({ id: 'cus_real_123' }),
      };
      vi.mocked(fetch).mockResolvedValueOnce(mockFetchResponse as any);

      const service = new AsaasService();
      const res = await service.criarCliente({
        name: 'Cliente Real',
        email: 'real@exemplo.com',
        externalReference: 'tenant-456',
      });

      expect(fetch).toHaveBeenCalledTimes(1);
      expect(res.id).toBe('cus_real_123');
    });

    it('deve chamar fetch para criarAssinatura com sucesso', async () => {
      const mockFetchResponse = {
        ok: true,
        json: async () => ({ id: 'sub_real_123', invoiceUrl: 'https://realurl.com' }),
      };
      vi.mocked(fetch).mockResolvedValueOnce(mockFetchResponse as any);

      const service = new AsaasService();
      const res = await service.criarAssinatura({
        customer: 'cus_real_123',
        plano: 'enterprise',
        valor: 497,
        externalReference: 'tenant-456',
      });

      expect(fetch).toHaveBeenCalledTimes(1);
      expect(res.id).toBe('sub_real_123');
      expect(res.invoiceUrl).toBe('https://realurl.com');
    });

    it('deve chamar fetch para consultarStatusAssinatura com sucesso', async () => {
      const mockFetchResponse = {
        ok: true,
        json: async () => ({ status: 'OVERDUE', nextDueDate: '2026-07-01' }),
      };
      vi.mocked(fetch).mockResolvedValueOnce(mockFetchResponse as any);

      const service = new AsaasService();
      const res = await service.consultarStatusAssinatura('sub_real_123');

      expect(fetch).toHaveBeenCalledTimes(1);
      expect(res.status).toBe('OVERDUE');
      expect(res.nextDueDate).toBe('2026-07-01');
    });

    it('deve lançar erro se a chamada de fetch retornar !ok', async () => {
      const mockFetchResponse = {
        ok: false,
        status: 400,
        text: async () => 'Parâmetros inválidos',
      };
      vi.mocked(fetch).mockResolvedValueOnce(mockFetchResponse as any);

      const service = new AsaasService();
      await expect(service.criarCliente({
        name: 'Erro',
        email: 'erro@exemplo.com',
        externalReference: 'tenant-err',
      })).rejects.toThrow('Erro na API do Asaas: 400 - Parâmetros inválidos');
    });

    it('deve relançar erro se fetch falhar (erro de conexao)', async () => {
      vi.mocked(fetch).mockRejectedValueOnce(new Error('Connection timeout'));

      const service = new AsaasService();
      await expect(service.consultarStatusAssinatura('sub_err')).rejects.toThrow('Connection timeout');
    });
  });
});
