import type { ApiResponse } from '../types';

/**
 * Utilitário central para chamadas de API do sistema,
 * padronizando o Error Handling e Request Interceptors.
 */
import { logger } from '../utils/logger';

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = '/api') {
    this.baseUrl = baseUrl;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    try {
      const url = `${this.baseUrl}${endpoint}`;

      const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
      };

      const response = await fetch(url, { ...options, headers });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        logger.error(
          `[API Error] ${options.method || 'GET'} ${url}`,
          new Error(`HTTP ${response.status}`),
          {
            status: response.status,
            endpoint,
            responseData: data,
          },
        );

        return {
          success: false,
          error: {
            code: data.error?.code || 'REQUEST_FAILED',
            message: data.error?.message || 'Falha na requisição.',
            details: data.error?.details,
          },
        };
      }

      return {
        success: true,
        data: data as T,
      };
    } catch (err: any) {
      logger.error(`[Network Error] ${options.method || 'GET'} ${endpoint}`, err, { endpoint });
      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: err.message || 'Erro de conexão com o servidor.',
        },
      };
    }
  }

  async get<T>(endpoint: string, options?: RequestInit) {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  async post<T>(endpoint: string, body: any, options?: RequestInit) {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async put<T>(endpoint: string, body: any, options?: RequestInit) {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(body),
    });
  }

  async delete<T>(endpoint: string, options?: RequestInit) {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }
}

export const api = new ApiClient();
