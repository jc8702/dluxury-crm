import { describe, it, expect, vi, afterEach } from 'vitest';
import { apiCall } from '../api';

/** Resposta fake mínima no shape usado pelo `apiCall`. */
const okResponse = (data: unknown) =>
  ({
    ok: true,
    status: 200,
    json: async () => ({ success: true, data }),
  }) as unknown as Response;

/** `fetch` que só rejeita quando o signal for abortado (servidor mudo). */
const hangingFetch = (init: RequestInit | undefined) =>
  new Promise<Response>((_resolve, reject) => {
    init?.signal?.addEventListener('abort', () => {
      const abortError = new Error('The operation was aborted.');
      abortError.name = 'AbortError';
      reject(abortError);
    });
  });

describe('apiCall — timeout (AbortController)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('responde normalmente quando a API responde antes do timeout', async () => {
    const fetchMock = vi.fn().mockResolvedValue(okResponse([{ id: 'c1' }]));
    vi.stubGlobal('fetch', fetchMock);

    await expect(apiCall('clients')).resolves.toEqual([{ id: 'c1' }]);

    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(init.signal).toBeDefined();
    expect((init.signal as AbortSignal).aborted).toBe(false);
  });

  it('aborta a requisição e lança erro 408 quando o servidor não responde', async () => {
    const fetchMock = vi.fn((_url: string, init?: RequestInit) => hangingFetch(init));
    vi.stubGlobal('fetch', fetchMock);

    const promise = apiCall('clients', 'POST', { nome: 'Teste' }, { timeoutMs: 20 });

    await expect(promise).rejects.toThrow(/Tempo de resposta esgotado/);
    await expect(
      apiCall('clients', 'POST', { nome: 'Teste' }, { timeoutMs: 20 }),
    ).rejects.toMatchObject({ status: 408 });
  });

  it('não aborta requisições que respondem rápido mesmo com timeout curto', async () => {
    const fetchMock = vi.fn().mockResolvedValue(okResponse({ id: 'c2' }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      apiCall('clients', 'POST', { nome: 'Teste' }, { timeoutMs: 5000 }),
    ).resolves.toEqual({ id: 'c2' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
