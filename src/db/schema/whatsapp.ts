import { pgTable, uuid, varchar, text, timestamp, boolean, integer, serial } from 'drizzle-orm/pg-core';
import { tenants } from './tenants.js';
import { quotations } from './quotations.js';
import { ordensProd } from './producao.js';

// NOVA TABELA: Histórico de Conversas WhatsApp (conversas_whatsapp)
export const conversasWhatsApp = pgTable('conversas_whatsapp', {
  id: serial('id').primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }),
  orcamentoId: uuid('orcamento_id').references(() => quotations.id, { onDelete: 'cascade' }),
  operacaoProdId: uuid('operacao_prod_id').references(() => ordensProd.id, { onDelete: 'cascade' }),
  numeroTelefone: varchar('numero_telefone', { length: 20 }).notNull(),
  contatoNome: varchar('contato_nome', { length: 255 }),
  ultimaMensagem: text('ultima_mensagem'),
  timestampUltimaMsg: timestamp('timestamp_ultima_msg', { withTimezone: true }),
  mensagensNaoLidas: integer('mensagens_nao_lidas').default(0),
  statusConversa: varchar('status_conversa', { length: 50 }).default('ativa'),
  tags: varchar('tags', { length: 500 }),
  dataCriacao: timestamp('data_criacao', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// NOVA TABELA: Mensagens individuais (mensagens_whatsapp)
export const mensagensWhatsApp = pgTable('mensagens_whatsapp', {
  id: serial('id').primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }),
  conversaWhatsAppId: integer('conversa_whatsapp_id').references(() => conversasWhatsApp.id, { onDelete: 'cascade' }).notNull(),
  usuarioId: uuid('usuario_id'), // ID do usuário do sistema (nulo se for o cliente)
  tipoMsg: varchar('tipo_msg', { length: 50 }).notNull(), // 'entrada', 'saida'
  conteudoMsg: text('conteudo_msg').notNull(),
  arquivoUrl: varchar('arquivo_url', { length: 500 }),
  timestampMsg: timestamp('timestamp_msg', { withTimezone: true }).defaultNow(),
  lido: boolean('lido').default(false),
  whatsappMsgId: varchar('whatsapp_msg_id', { length: 100 }).unique(),
  statusEntrega: varchar('status_entrega', { length: 50 }), // 'enviado', 'entregue', 'lido'
});

// NOVA TABELA: Modelos de Mensagens Automáticas (modelos_msg_whatsapp)
export const modelosMsgWhatsApp = pgTable('modelos_msg_whatsapp', {
  id: serial('id').primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }),
  titulo: varchar('titulo', { length: 100 }).notNull(),
  conteudoTemplate: text('conteudo_template').notNull(),
  tipoAcionador: varchar('tipo_acionador', { length: 50 }),
  ativo: boolean('ativo').default(true),
  criadoPor: uuid('criado_por'), // ID do usuário que criou
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});
