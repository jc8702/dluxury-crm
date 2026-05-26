import fetch from 'node-fetch'; // No Node moderno, fetch é nativo, mas importamos ou usamos global para compatibilidade

export interface AsaasCustomerParams {
  name: string;
  email: string;
  phone?: string;
  cpfCnpj?: string;
  externalReference: string; // tenant_id
}

export interface AsaasSubscriptionParams {
  customer: string; // ID do customer retornado pelo Asaas
  plano: 'basic' | 'pro' | 'enterprise';
  valor: number;
  externalReference: string; // tenant_id
}

export class AsaasService {
  private baseUrl: string;
  private apiKey: string;

  constructor() {
    const isSandbox = (process.env.ASAAS_ENVIRONMENT || 'sandbox') === 'sandbox';
    this.baseUrl = isSandbox ? 'https://sandbox.asaas.com/api/v3' : 'https://api.asaas.com/v3';
    this.apiKey = process.env.ASAAS_API_KEY || '';
  }

  private async request<T>(path: string, method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET', body?: any): Promise<T> {
    if (!this.apiKey) {
      console.warn('[ASAAS_SERVICE] Chave ASAAS_API_KEY ausente. Simulando resposta.');
      return this.simulateFallback<T>(path, method, body);
    }

    const url = `${this.baseUrl}${path}`;
    const headers = {
      'Content-Type': 'application/json',
      'access_token': this.apiKey
    };

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error(`[ASAAS_API_ERROR] ${method} ${path}: Status ${response.status}`, errText);
        throw new Error(`Erro na API do Asaas: ${response.status} - ${errText}`);
      }

      return (await response.json()) as T;
    } catch (err: any) {
      console.error(`[ASAAS_REQUEST_FAILED] ${method} ${path}:`, err.message);
      throw err;
    }
  }

  // Simular em Sandbox local se chave não estiver configurada no .env
  private simulateFallback<T>(path: string, method: string, body: any): any {
    const tenantId = body?.externalReference || 'mock-tenant-id';
    
    if (path.startsWith('/customers') && method === 'POST') {
      return {
        object: 'customer',
        id: `cus_mock_${Math.random().toString(36).substring(2, 10)}`,
        name: body.name,
        email: body.email,
        externalReference: tenantId
      };
    }
    
    if (path.startsWith('/subscriptions') && method === 'POST') {
      const subId = `sub_mock_${Math.random().toString(36).substring(2, 10)}`;
      return {
        object: 'subscription',
        id: subId,
        customer: body.customer,
        value: body.value,
        cycle: 'MONTHLY',
        status: 'ACTIVE',
        externalReference: tenantId,
        invoiceUrl: `https://sandbox.asaas.com/i/mock_invoice_${subId}`
      };
    }

    if (path.startsWith('/subscriptions/') && method === 'GET') {
      return {
        id: path.split('/').pop(),
        status: 'ACTIVE',
        value: 197.00,
        cycle: 'MONTHLY',
        nextDueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      };
    }

    return { success: true };
  }

  /**
   * Cria um cliente no painel do Asaas.
   */
  async criarCliente(params: AsaasCustomerParams): Promise<{ id: string }> {
    console.log(`[ASAAS_SERVICE] Criando cliente para tenant ${params.externalReference}`);
    const data = await this.request<{ id: string }>('/customers', 'POST', {
      name: params.name,
      email: params.email,
      phone: params.phone,
      cpfCnpj: params.cpfCnpj || undefined,
      externalReference: params.externalReference,
      notificationDisabled: false
    });
    return { id: data.id };
  }

  /**
   * Cria uma assinatura mensal recorrente para o cliente.
   */
  async criarAssinatura(params: AsaasSubscriptionParams): Promise<{ id: string; invoiceUrl: string }> {
    console.log(`[ASAAS_SERVICE] Criando assinatura para customer ${params.customer}, plano ${params.plano}`);
    
    // Vencimento da primeira parcela: 3 dias a partir de hoje
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 3);
    const formattedDueDate = dueDate.toISOString().split('T')[0];

    const data = await this.request<any>('/subscriptions', 'POST', {
      customer: params.customer,
      billingType: 'UNDEFINED', // Permite Cartão, Boleto ou PIX no portal de pagamento
      value: params.valor,
      nextDueDate: formattedDueDate,
      cycle: 'MONTHLY',
      description: `Assinatura mensal D'Luxury CRM - Plano ${params.plano.toUpperCase()}`,
      externalReference: params.externalReference
    });

    return { 
      id: data.id,
      invoiceUrl: data.invoiceUrl || `https://sandbox.asaas.com/i/${data.id}` // Fallback para sandbox link
    };
  }

  /**
   * Consulta o status atual de uma assinatura no Asaas.
   */
  async consultarStatusAssinatura(subscriptionId: string): Promise<{ status: string; nextDueDate: string }> {
    const data = await this.request<any>(`/subscriptions/${subscriptionId}`, 'GET');
    return {
      status: data.status, // ACTIVE, OVERDUE, SUSPENDED, CANCELED
      nextDueDate: data.nextDueDate
    };
  }
}
