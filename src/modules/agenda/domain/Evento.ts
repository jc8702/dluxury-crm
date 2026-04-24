
import { z } from "zod";

// Tipos Literais
export const TIPO_EVENTO = {
  VISITA: 'visita',
  REUNIAO: 'reuniao',
  COMPROMISSO: 'compromisso',
  DEADLINE: 'deadline',
  OUTRO: 'outro',
} as const;

export const STATUS_VISITA = {
  AGENDADO: 'agendado',
  REALIZADO: 'realizado',
  FOLLOW_UP: 'follow_up',
  CANCELADO: 'cancelado',
} as const;

export const OBJETIVO_VISITA = {
  APRESENTACAO: 'apresentacao',
  MEDICAO: 'medicao',
  INSTALACAO: 'instalacao',
  POS_VENDA: 'pos_venda',
  OUTRO: 'outro',
} as const;

// Schema Zod para validação e tipagem
export const EventoSchema = z.object({
  id: z.string().uuid().optional(),
  tipo: z.enum(['visita', 'reuniao', 'compromisso', 'deadline', 'outro']),
  titulo: z.string().min(3, "Título deve ter pelo menos 3 caracteres"),
  descricao: z.string().optional().nullable(),
  
  data_inicio: z.date().or(z.string().transform(s => new Date(s))),
  data_fim: z.date().or(z.string().transform(s => new Date(s))),
  dia_inteiro: z.boolean().default(false),
  
  cliente_id: z.number().optional().nullable(),
  projeto_id: z.string().optional().nullable(),
  visita_id: z.string().optional().nullable(),
  orcamento_id: z.string().optional().nullable(),
  
  // Visita specific
  endereco: z.string().optional().nullable(),
  objetivo: z.enum(['apresentacao', 'medicao', 'instalacao', 'pos_venda', 'outro']).default('outro'),
  status_visita: z.enum(['agendado', 'realizado', 'follow_up', 'cancelado']).optional().nullable(),
  resultado_visita: z.string().optional().nullable(),
  
  responsavel_id: z.string(),
  criado_por: z.string().optional(),
  cor: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, "Cor inválida").optional().nullable(),
  lembrete_minutos: z.number().int().min(0).optional().nullable(),
  
  criado_em: z.date().optional(),
  atualizado_em: z.date().optional(),
}).refine(data => data.data_fim > data.data_inicio, {
  message: "A data de fim deve ser posterior à data de início",
  path: ["data_fim"],
}).refine(data => {
  if (data.tipo === 'visita') {
    return !!data.cliente_id && !!data.status_visita;
  }
  return true;
}, {
  message: "Visitas requerem cliente e status",
  path: ["cliente_id"],
});

export type Evento = z.infer<typeof EventoSchema>;

// Lógica de Domínio (Pure Business Logic)
export class EventoDomain {
  static formatForKanban(eventos: Evento[]) {
    return {
      agendado: eventos.filter(e => e.status_visita === 'agendado'),
      realizado: eventos.filter(e => e.status_visita === 'realizado'),
      follow_up: eventos.filter(e => e.status_visita === 'follow_up'),
    };
  }

  static isVisita(evento: Evento): boolean {
    return evento.tipo === 'visita';
  }

  static canMoveTo(evento: Evento, newStatus: string): boolean {
    if (evento.tipo !== 'visita') return false;
    // Regras de transição se houver (ex: não pode voltar de realizado para agendado?)
    // Por enquanto, livre.
    return true;
  }
}
