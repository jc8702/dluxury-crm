import { apiCall } from '../lib/api.js';
import { AppError } from '../utils/errorHandler';

export interface MensagemWhatsApp {
  id: number;
  tipo_msg: 'entrada' | 'saida';
  conteudo_msg: string;
  timestamp_msg: string;
  usuario_nome?: string;
  status_entrega?: 'enviado' | 'entregue' | 'lido';
  arquivo_url?: string;
}

export interface ConversaWhatsAppResponse {
  success: boolean;
  mensagens: MensagemWhatsApp[];
  tags: string[];
  numero_telefone: string;
  contato_nome: string;
}

export interface ModeloMsgWhatsApp {
  id: number;
  titulo: string;
  conteudo_template: string;
  tipo_acionador: string;
}

export const whatsappService = {
  async getMensagens(filtros: {
    quotation_id?: string;
    operacao_prod_id?: string;
  }): Promise<ConversaWhatsAppResponse> {
    try {
      const params = new URLSearchParams();
      if (filtros.quotation_id) params.append('quotation_id', filtros.quotation_id);
      if (filtros.operacao_prod_id) params.append('operacao_prod_id', filtros.operacao_prod_id);
      return await apiCall<ConversaWhatsAppResponse>(`whatsapp/mensagens?${params.toString()}`);
    } catch (error) {
      throw new AppError('Erro ao buscar mensagens do WhatsApp', 400, error);
    }
  },

  async enviarMensagem(data: {
    quotation_id?: string;
    operacao_prod_id?: string;
    numero_telefone: string;
    conteudo_msg: string;
    tags: string[];
  }): Promise<{ success: boolean; id: number; status_entrega: string; whatsapp_msg_id: string }> {
    return apiCall<{
      success: boolean;
      id: number;
      status_entrega: string;
      whatsapp_msg_id: string;
    }>('whatsapp/enviar-mensagem', 'POST', data);
  },

  async getModelos(): Promise<{ success: boolean; modelos: ModeloMsgWhatsApp[] }> {
    return apiCall<{ success: boolean; modelos: ModeloMsgWhatsApp[] }>('whatsapp/modelos');
  },

  async receberWebhook(data: {
    from_number: string;
    message_text: string;
    quotation_id?: string;
    operacao_prod_id?: string;
  }): Promise<{ success: boolean; data: any }> {
    try {
      return await apiCall<{ success: boolean; data: any }>('whatsapp/webhook', 'POST', data);
    } catch (error) {
      throw new AppError('Erro ao processar webhook do WhatsApp', 400, error);
    }
  },
};
