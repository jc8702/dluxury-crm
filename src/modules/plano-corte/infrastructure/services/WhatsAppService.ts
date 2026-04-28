/**
 * SERVIÇO: WhatsAppService (CRM Conversacional)
 * 
 * Simula a integração com API do WhatsApp (ex: Z-API, Evolution API).
 * Automatiza a comunicação com o cliente durante o fluxo de produção.
 */

export class WhatsAppService {
  /**
   * Envia notificação de início de produção
   */
  static async notificarProducaoIniciada(clienteNome: string, clienteTelefone: string, projetoNome: string) {
    const mensagem = `Olá ${clienteNome}! 👋 Aqui é da D'Luxury. 
Passando para avisar que o seu projeto *${projetoNome}* acaba de entrar em produção na nossa oficina! 🔨📐
Em breve seu sonho estará pronto.`;

    console.log(`[WA] Enviando para ${clienteTelefone}: ${mensagem}`);
    // Simulação de delay de rede
    return new Promise(resolve => setTimeout(resolve, 800));
  }

  /**
   * Envia notificação de conclusão (Pronto para entrega)
   */
  static async notificarProjetoPronto(clienteNome: string, clienteTelefone: string, projetoNome: string) {
    const mensagem = `Boas notícias, ${clienteNome}! 🎉 
O seu projeto *${projetoNome}* foi finalizado e passou por toda a nossa inspeção de qualidade. 
Nossa equipe entrará em contato para agendar a entrega/montagem.`;

    console.log(`[WA] Enviando para ${clienteTelefone}: ${mensagem}`);
    return new Promise(resolve => setTimeout(resolve, 800));
  }
}
