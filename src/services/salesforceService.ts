/**
 * SALESFORCE INTEGRATION SERVICE (ACL & SRE PATTERNS)
 * Implementação de Camada Anticorrupção (ACL) e Circuit Breaker.
 */

export interface SalesforceCase {
  Subject: string;
  Description: string;
  Status: string;
  Priority: string;
  Custom_Negotiation_Data__c: {
    product: string;
    basePrice: number;
    subsidy: number;
    finalPrice: number;
    minAllowed: number;
  };
}

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

class SalesforceService {
  private failureThreshold = 3;
  private failures = 0;
  private state: CircuitState = 'CLOSED';
  private lastErrorTime: number = 0;
  private resetTimeout = 30000; // 30 seconds

  // CAMADA ANTICORRUPÇÃO (ACL): Message Translator
  private translateToSalesforce(data: any): SalesforceCase {
    return {
      Subject: `Solicitação de Alçada: ${data.product.descricao}`,
      Description: `Alçada especial solicitada para o produto código ${data.product.codigo || 'N/A'}.`,
      Status: 'New',
      Priority: 'High',
      Custom_Negotiation_Data__c: {
        product: data.product.descricao,
        basePrice: data.basePrice,
        subsidy: data.subsidio,
        finalPrice: data.finalPrice,
        minAllowed: data.minAllowed
      }
    };
  }

  // CIRCUIT BREAKER LOGIC
  public async openCase(simulationData: any): Promise<{ success: boolean; message: string; queued?: boolean }> {
    // Check if circuit is open
    if (this.state === 'OPEN') {
      const now = Date.now();
      if (now - this.lastErrorTime > this.resetTimeout) {
        this.state = 'HALF_OPEN';
      } else {
        return { success: false, message: 'Circuit Breaker OPEN', queued: true };
      }
    }

    // FAIL FAST: Basic Validation
    if (!simulationData.product || !simulationData.basePrice) {
      throw new Error('FAIL FAST: Parâmetros obrigatórios ausentes.');
    }

    const payload = this.translateToSalesforce(simulationData);
    console.log('[ACL Translator] Payload formatado para Salesforce:', payload);

    // TIMEOUT (5s) with AbortController
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    try {
      // MOCK CALL: Simulating Salesforce API Endpoint
      // In a real environment, this would be a fetch() to our Backend or Salesforce REST API
      await this.mockFetch(payload, controller.signal);
      
      clearTimeout(timeoutId);
      this.resetCircuit();
      return { success: true, message: 'Caso aberto com sucesso no Salesforce.' };
    } catch (error: any) {
      clearTimeout(timeoutId);
      this.handleFailure();
      
      if (error.name === 'AbortError') {
        return { success: false, message: 'TIMEOUT: Salesforce demorou mais de 5s para responder.', queued: true };
      }
      return { success: false, message: `ERRO DE CONEXÃO: ${error.message}`, queued: true };
    }
  }

  private async mockFetch(payload: any, signal: AbortSignal): Promise<any> {
    return new Promise((resolve, reject) => {
      // Simulate network delay between 500ms and 2000ms
      const delay = 800 + Math.random() * 1200;
      
      const timer = setTimeout(() => {
        // Toggle this logic to test failures manually if needed
        const simulateFailure = window.localStorage.getItem('force_sf_failure') === 'true';
        if (simulateFailure) {
          reject(new Error('Serviço Salesforce Indisponível (503)'));
        } else {
          console.log('[SRE] Request to Salesforce SUCCESS', payload);
          resolve({ id: '500xx000000x123' });
        }
      }, delay);

      signal.addEventListener('abort', () => {
        clearTimeout(timer);
        reject({ name: 'AbortError' });
      });
    });
  }

  private handleFailure() {
    this.failures++;
    if (this.failures >= this.failureThreshold) {
      this.state = 'OPEN';
      this.lastErrorTime = Date.now();
      console.warn('[CIRCUIT BREAKER] State changed to OPEN');
    }
  }

  private resetCircuit() {
    this.failures = 0;
    this.state = 'CLOSED';
    console.log('[CIRCUIT BREAKER] State changed to CLOSED');
  }

  public getCircuitStatus() {
    return { state: this.state, failures: this.failures };
  }
}

export const salesforceService = new SalesforceService();
