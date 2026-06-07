import { sql } from './_db.js';
import { withTenant, type TenantHandler } from './middleware/tenantMiddleware.js';
import { db } from './drizzle-db.js';
import { quotations, clientes } from '../db/schema/index.js';
import { eq, and, lt } from 'drizzle-orm';

const handleNotificacoesCore: TenantHandler = async (req, res) => {
  try {
    const { method } = req;
    const { id } = req.query;

    const tenantId = req.tenantId;
    const user = req.tenantUser;

    if (method === 'GET') {
      if (req.url.includes('contar')) {
        await gerarNotificacoesAutomaticas(tenantId).catch(console.error);
        const count =
          await sql`SELECT count(*) FROM notificacoes WHERE lida = false AND tenant_id = ${tenantId}`;
        return res.status(200).json({ success: true, data: parseInt(count[0].count) });
      }
      const limit = req.query.limit || 50;
      const unreadOnly = req.query.unread === 'true';
      const query = unreadOnly
        ? sql`SELECT id, tipo, titulo, mensagem, prioridade, referencia_tipo, referencia_id, url_destino, lida, data_leitura, created_at, updated_at FROM notificacoes WHERE lida = false AND tenant_id = ${tenantId} ORDER BY created_at DESC LIMIT ${limit}`
        : sql`SELECT id, tipo, titulo, mensagem, prioridade, referencia_tipo, referencia_id, url_destino, lida, data_leitura, created_at, updated_at FROM notificacoes WHERE tenant_id = ${tenantId} ORDER BY created_at DESC LIMIT ${limit}`;

      const result = await query;
      return res.status(200).json({ success: true, data: result });
    }

    if (method === 'PUT' || method === 'PATCH') {
      if (req.url.includes('marcar-todas')) {
        await sql`UPDATE notificacoes SET lida = true, data_leitura = NOW() WHERE lida = false AND tenant_id = ${tenantId}`;
        return res.status(200).json({ success: true });
      }
      await sql`UPDATE notificacoes SET lida = true, data_leitura = NOW() WHERE id = ${id} AND tenant_id = ${tenantId}`;
      return res.status(200).json({ success: true });
    }

    if (method === 'POST' && req.url.includes('gerar')) {
      const stats = await gerarNotificacoesAutomaticas(tenantId);
      return res.status(200).json({ success: true, stats });
    }

    return res.status(405).end();
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

export const handleNotificacoes = withTenant(handleNotificacoesCore);

async function bulkInsertNotificacoes(
  tenantId: string,
  tipo: string,
  referenciaTipo: string,
  urlDestino: string,
  rows: Array<{ id: string; titulo: string; mensagem: string; prioridade: string }>,
) {
  if (rows.length === 0) return 0;

  const refIds = rows.map((r) => r.id);
  const existing = await sql`
    SELECT referencia_id FROM notificacoes
    WHERE lida = false AND tipo = ${tipo} AND referencia_id = ANY(${refIds}) AND tenant_id = ${tenantId}
  `;
  const existingSet = new Set(existing.map((r: any) => r.referencia_id));
  const toInsert = rows.filter((r) => !existingSet.has(r.id));
  if (toInsert.length === 0) return 0;

  const values = toInsert.map(
    (r) =>
      sql`(${tipo}, ${r.titulo}, ${r.mensagem}, ${r.prioridade}, ${referenciaTipo}, ${r.id}, ${urlDestino}, ${tenantId})`,
  );
  await sql`
    INSERT INTO notificacoes (tipo, titulo, mensagem, prioridade, referencia_tipo, referencia_id, url_destino, tenant_id)
    VALUES ${sql.join(values, sql`, `)}
  `;
  return toInsert.length;
}

export async function gerarNotificacoesAutomaticas(tenantId: string) {
  let criadas = 0;

  try {
    const materiais = await sql`
      SELECT id, nome, sku, estoque_atual, estoque_minimo 
      FROM materiais 
      WHERE estoque_atual <= estoque_minimo AND ativo = true AND tenant_id = ${tenantId}
    `;
    criadas += await bulkInsertNotificacoes(
      tenantId,
      'estoque_critico',
      'material',
      '/estoque',
      materiais.map((m: any) => ({
        id: m.id,
        titulo: `Estoque crítico: ${m.sku}`,
        mensagem: `${m.nome} está com ${m.estoque_atual} unidades (mínimo: ${m.estoque_minimo})`,
        prioridade: m.estoque_atual <= 0 ? 'critica' : 'alta',
      })),
    );
  } catch (e) {
    console.error('Erro ao gerar notificações de estoque:', e);
  }

  try {
    const projetos = await sql`
      SELECT id, ambiente, created_at, prazo_entrega
      FROM projects
      WHERE status NOT IN ('concluded', 'concluido', 'cancelado')
      AND prazo_entrega IS NOT NULL
      AND tenant_id = ${tenantId}
      AND (prazo_entrega::date - CURRENT_DATE) BETWEEN 0 AND 3
    `;
    criadas += await bulkInsertNotificacoes(
      tenantId,
      'prazo_projeto',
      'projeto',
      '/projetos',
      projetos.map((p: any) => ({
        id: p.id,
        titulo: `Entrega Próxima: ${p.ambiente}`,
        mensagem: 'Entrega prevista para os próximos dias.',
        prioridade: 'alta',
      })),
    );
  } catch (e) {
    console.error('Erro ao gerar notificações de projetos:', e);
  }

  try {
    const limitDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const orcamentosPendentes = await db
      .select({
        id: quotations.id,
        numero: quotations.numeroOrcamento,
        cliente: clientes.nome,
      })
      .from(quotations)
      .innerJoin(clientes, eq(quotations.clienteId, clientes.id))
      .where(
        and(
          eq(quotations.status, 'enviado'),
          eq(quotations.tenantId, tenantId),
          lt(quotations.updatedAt, limitDate),
        ),
      );
    criadas += await bulkInsertNotificacoes(
      tenantId,
      'orcamento_sem_resposta',
      'quotation',
      '/quotations',
      orcamentosPendentes.map((o: any) => ({
        id: o.id,
        titulo: `Orçamento sem retorno: ${o.numero}`,
        mensagem: `Cliente ${o.cliente} não responde há 7 dias.`,
        prioridade: 'normal',
      })),
    );
  } catch (e) {
    console.error('Erro ao gerar notificações de orçamentos:', e);
  }

  try {
    const garantias = await sql`
      SELECT id, numero, titulo
      FROM chamados_garantia
      WHERE status IN ('aberto', 'agendado') AND tenant_id = ${tenantId}
      AND created_at < NOW() - INTERVAL '3 days'
    `;
    criadas += await bulkInsertNotificacoes(
      tenantId,
      'garantia_pendente',
      'chamado',
      '/pos-venda',
      garantias.map((g: any) => ({
        id: g.id,
        titulo: `Garantia Pendente: ${g.numero}`,
        mensagem: `Chamado "${g.titulo}" aguarda atendimento há 3 dias.`,
        prioridade: 'alta',
      })),
    );
  } catch (e) {
    console.error('Erro ao gerar notificações de garantia:', e);
  }

  try {
    const cobrancas = await sql`
      SELECT id, nf, pedido, valor, due_date, cliente
      FROM billings
      WHERE status NOT IN ('PAGO', 'pago', 'concluido') AND tenant_id = ${tenantId}
      AND due_date < CURRENT_DATE
    `;
    criadas += await bulkInsertNotificacoes(
      tenantId,
      'cobranca_vencida',
      'financeiro',
      '/financeiro',
      cobrancas.map((c: any) => ({
        id: c.id,
        titulo: `Pagamento Vencido: ${c.nf || c.pedido || 'N/A'}`,
        mensagem: `O pagamento de ${c.cliente || 'cliente'} no valor de R$ ${c.valor} venceu em ${new Date(c.due_date).toLocaleDateString()}.`,
        prioridade: 'critica',
      })),
    );
  } catch (e) {
    console.error('Erro ao gerar notificações de cobrança:', e);
  }

  return { criadas };
}
