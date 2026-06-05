import { pgTable, uuid, varchar, text, timestamp, integer, serial } from 'drizzle-orm/pg-core';
import { tenants } from './tenants.js';
import { quotations } from './quotations.js';

// ContratoDigital (contrato_digital)
export const contratoDigital = pgTable('contrato_digital', {
  id: serial('id').primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  orcamentoId: uuid('orcamento_id').references(() => quotations.id, { onDelete: 'cascade' }).unique(),
  numeroContrato: varchar('numero_contrato', { length: 50 }).unique(),
  
  dataCriacao: timestamp('data_criacao', { withTimezone: true }).defaultNow(),
  dataDocumento: timestamp('data_documento', { withTimezone: true }),
  
  empresaNome: varchar('empresa_nome', { length: 255 }),
  empresaCnpj: varchar('empresa_cnpj', { length: 20 }),
  clienteNome: varchar('cliente_nome', { length: 255 }),
  clienteCpfCnpj: varchar('cliente_cpf_cnpj', { length: 20 }),
  
  htmlContrato: text('html_contrato'),
  arquivoPdfUrl: varchar('arquivo_pdf_url', { length: 500 }),
  
  statusAssinatura: varchar('status_assinatura', { length: 50 }).default('pendente'), // 'pendente', 'assinado', 'expirado'
  dataSolicitacaoAssinatura: timestamp('data_solicitacao_assinatura', { withTimezone: true }),
  
  idAssinaturaExterna: varchar('id_assinatura_externa', { length: 100 }),
  urlAssinatura: varchar('url_assinatura', { length: 500 }),
  
  dataAssinaturaEmpresa: timestamp('data_assinatura_empresa', { withTimezone: true }),
  dataAssinaturaCliente: timestamp('data_assinatura_cliente', { withTimezone: true }),
  certificadoValidade: timestamp('certificado_validade', { withTimezone: true }),
  
  documentoAssinadoUrl: varchar('documento_assinado_url', { length: 500 }),
  hashDocumento: varchar('hash_documento', { length: 256 }),
  
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// HistoricoAssinatura (historico_assinatura_digital)
export const historicoAssinaturaDigital = pgTable('historico_assinatura_digital', {
  id: serial('id').primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  contratoId: integer('contrato_id').references(() => contratoDigital.id, { onDelete: 'cascade' }).notNull(),
  acao: varchar('acao', { length: 100 }).notNull(), // 'contrato_gerado', 'enviado_para_assinatura', 'assinado', 'rejeitado'
  timestampAcao: timestamp('timestamp_acao', { withTimezone: true }).defaultNow(),
  usuarioId: uuid('usuario_id'),
  detalhes: text('detalhes'),
});
