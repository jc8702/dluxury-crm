/**
 * MOTOR DE PREVISÃO INDUSTRIAL - MES 4.0
 * Calcula Lead Time baseado em fila e capacidade.
 */

const CAPACIDADE = {
  CORTE: 480,      // minutos por dia (8h)
  MONTAGEM: 480
};

export interface OrdemProducao {
  op_id: string;
  pecas: number;
  status: string;
  created_at?: string | number | Date;
  data_inicio?: string | number | Date;
  data_fim?: string | number | Date;
  tempo_previsto_corte?: number;
  tempo_previsto_montagem?: number;
  data_prevista_entrega?: Date | number;
}

/**
 * Estima tempos base simplificada
 */
export function estimarTempoOP(pecas: number) {
  return {
    corte: pecas * 2,       // 2 min por peça
    montagem: pecas * 3     // 3 min por peça
  };
}

/**
 * Calcula a previsão de entrega para toda a fila ativa
 */
export function calcularPrevisaoEntrega(ordens: OrdemProducao[]): OrdemProducao[] {
  // 1. Filtrar e Ordenar fila (apenas pendentes ou em produção)
  const fila = ordens
    .filter(op => op.status !== "FINALIZADA")
    .sort((a, b) => {
      const dateA = new Date(a.created_at || 0).getTime();
      const dateB = new Date(b.created_at || 0).getTime();
      return dateA - dateB;
    });

  let acumuladoCorte = 0;
  let acumuladoMontagem = 0;

  const agora = Date.now();

  return fila.map(op => {
    const tempo = estimarTempoOP(op.pecas || 0);

    // Soma carga à fila
    acumuladoCorte += tempo.corte;
    acumuladoMontagem += tempo.montagem;

    // Converte minutos acumulados em dias de carga (considerando capacidade diária)
    const diasCorte = acumuladoCorte / CAPACIDADE.CORTE;
    const diasMontagem = acumuladoMontagem / CAPACIDADE.MONTAGEM;

    // O gargalo determina a entrega final
    const diasTotais = Math.max(diasCorte, diasMontagem);

    // Projeta data final (agora + lead time da fila)
    // Nota: Em um sistema real, pularíamos finais de semana aqui.
    const dataPrevista = agora + (diasTotais * 24 * 60 * 60 * 1000);

    return {
      ...op,
      tempo_previsto_corte: tempo.corte,
      tempo_previsto_montagem: tempo.montagem,
      data_prevista_entrega: dataPrevista
    };
  });
}
