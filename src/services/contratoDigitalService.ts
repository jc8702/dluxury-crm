import { apiCall } from '../lib/api.js';

export interface ContratoDigital {
  id: number;
  orcamentoId: string;
  numeroContrato: string;
  dataCriacao: string;
  dataDocumento: string | null;
  empresaNome: string;
  empresaCnpj: string;
  clienteNome: string;
  clienteCpfCnpj: string;
  htmlContrato: string;
  arquivoPdfUrl: string;
  statusAssinatura: 'pendente' | 'assinado' | 'expirado';
  dataSolicitacaoAssinatura: string;
  idAssinaturaExterna: string;
  urlAssinatura: string;
  dataAssinaturaEmpresa: string | null;
  dataAssinaturaCliente: string | null;
  certificadoValidade: string | null;
  documentoAssinadoUrl: string | null;
  hashDocumento: string | null;
}

export interface HistoricoAssinatura {
  id: number;
  contratoId: number;
  acao: 'contrato_gerado' | 'enviado_para_assinatura' | 'assinado' | 'rejeitado';
  timestampAcao: string;
  usuarioId: string | null;
  detalhes: string | null;
}

export const contratoDigitalService = {
  async getStatus(quotation_id: string): Promise<{ success: boolean; contrato: ContratoDigital | null; historico?: HistoricoAssinatura[] }> {
    return apiCall<{ success: boolean; contrato: ContratoDigital | null; historico?: HistoricoAssinatura[] }>(`contratos/status?quotation_id=${quotation_id}`);
  },

  async gerarEEnviar(quotation_id: string): Promise<{ success: boolean; contrato_id: number; numero_contrato: string; url_assinatura: string; status: string }> {
    return apiCall<{ success: boolean; contrato_id: number; numero_contrato: string; url_assinatura: string; status: string }>('contratos/gerar-e-enviar', 'POST', { quotation_id });
  },

  async webhookAssinaturaMock(envelope_id: string, status: 'completed' | 'declined'): Promise<{ success: boolean; message: string }> {
    return apiCall<{ success: boolean; message: string }>('contratos/webhook-assinatura', 'POST', { envelope_id, status });
  }
};
