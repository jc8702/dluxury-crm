
import { pgTable, uuid, varchar, text, timestamp, boolean, integer, pgEnum, index, check } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { users } from "./auth"; // Preciso descobrir onde users está definido
import { clients } from "./clients"; // E clients
import { projects } from "./projects"; // E projects

// Como não encontrei os arquivos auth, clients e projects em src/db/schema,
// vou assumir que eles podem não existir como esquemas Drizzle ou estão em outro lugar.
// Se eu não os encontrar, vou definir as tabelas de referência de forma mínima ou usar raw UUID/INT.

export const tipoEventoEnum = ["visita", "reuniao", "compromisso", "deadline", "outro"] as const;
export const objetivoVisitaEnum = ["apresentacao", "medicao", "instalacao", "pos_venda", "outro"] as const;
export const statusVisitaEnum = ["agendado", "realizado", "follow_up", "cancelado"] as const;

export const eventos = pgTable("eventos", {
  id: uuid("id").primaryKey().defaultRandom(),
  
  // Tipo e Classificação
  tipo: varchar("tipo", { length: 30 }).notNull(), // visita, reuniao, compromisso, deadline, outro
  titulo: varchar("titulo", { length: 255 }).notNull(),
  descricao: text("descricao"),
  
  // Temporal
  dataInicio: timestamp("data_inicio", { withTimezone: true }).notNull(),
  dataFim: timestamp("data_fim", { withTimezone: true }).notNull(),
  diaInteiro: boolean("dia_inteiro").default(false),
  
  // Relacionamentos (Usando raw columns para evitar quebra de importação se os outros esquemas não existirem)
  clienteId: varchar("cliente_id", { length: 50 }), // Flexível (pode ser UUID ou INT legado)
  projetoId: varchar("projeto_id", { length: 50 }), // Flexível
  
  // Específico de Visitas
  endereco: varchar("endereco", { length: 500 }),
  objetivo: varchar("objetivo", { length: 50 }), // apresentacao, medicao, instalacao, pos_venda, outro
  statusVisita: varchar("status_visita", { length: 30 }), // agendado, realizado, follow_up, cancelado
  resultadoVisita: text("resultado_visita"),
  
  // Metadados
  createdBy: varchar("created_by", { length: 50 }).notNull(), // Flexível
  responsavelId: varchar("responsavel_id", { length: 50 }).notNull(), // Flexível
  cor: varchar("cor", { length: 7 }),
  lembreteMinutos: integer("lembrete_minutos"),
  
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
}, (table) => ({
  idxTipo: index("idx_eventos_tipo").on(table.tipo),
  idxStatusVisita: index("idx_eventos_status_visita").on(table.statusVisita).where(sql`tipo = 'visita'`),
  idxDataInicio: index("idx_eventos_data_inicio").on(table.dataInicio),
  idxResponsavel: index("idx_eventos_responsavel").on(table.responsavelId),
}));

export const eventosHistorico = pgTable("eventos_historico", {
  id: uuid("id").primaryKey().defaultRandom(),
  eventoId: uuid("evento_id").notNull(), // Referencia eventos(id)
  campoAlterado: varchar("campo_alterado", { length: 50 }).notNull(),
  valorAnterior: text("valor_anterior"),
  valorNovo: text("valor_novo"),
  alteradoPor: uuid("alterado_por").notNull(), // Referencia users(id)
  observacao: text("observacao"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
}, (table) => ({
  idxEvento: index("idx_historico_evento").on(table.eventoId, table.updatedAt),
}));

export const tiposEventoConfig = pgTable("tipos_evento_config", {
  tipo: varchar("tipo", { length: 30 }).primaryKey(),
  corPadrao: varchar("cor_padrao", { length: 7 }).notNull(),
  icone: varchar("icone", { length: 50 }),
});
