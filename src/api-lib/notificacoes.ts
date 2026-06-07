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
        // Gera notificações antes de contar (centralizado no server)
        await gerarNotificacoesAutomaticas(tenantId).catch(console.error);
        const count =
          await sql`SELECT count(*) FROM notificacoes WHERE lida = false AND tenant_id = ${tenantId}`;
        return res.status(200).json({ success: true, data: parseInt(count[0].count) });
      }
      // Listar todas ou apenas não lidas
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

export async function gerarNotificacoesAutomaticas(tenantId: string) {
  let criadas = 0;

  // 1. Materiais com estoque crítico
  try {
    const materiais = await sql`
      SELECT id, nome, sku, estoque_atual, estoque_minimo 
      FROM materiais 
      WHERE estoque_atual <= estoque_minimo AND ativo = true AND tenant_id = ${tenantId}
    `;
    for (const m of materiais) {
      const exists = await sql`
        SELECT id FROM notificacoes 
        WHERE lida = false AND tipo = 'estoque_critico' AND referencia_id = ${m.id} AND tenant_id = ${tenantId}
      `;
      if (!exists.length) {
        await sql`
          INSERT INTO notificacoes (tipo, titulo, mensagem, prioridade, referencia_tipo, referencia_id, url_destino, tenant_id)
          VALUES ('estoque_critico', 'Estoque crítico: ' || ${m.sku}, ${`${m.nome} está com ${m.estoque_atual} unidades (mínimo: ${m.estoque_minimo})`}, ${m.estoque_atual <= 0 ? 'critica' : 'alta'}, 'material', ${m.id}, '/estoque', ${tenantId})
        `;
        criadas++;
      }
    }
  } catch (e) {
    console.error('Erro ao gerar notificações de estoque:', e);
  }

  // 2. Projetos com entrega próxima (3 dias)
  try {
    const projetos = await sql`
      SELECT id, ambiente, created_at, prazo_entrega
      FROM projects
      WHERE status NOT IN ('concluded', 'concluido', 'cancelado')
      AND prazo_entrega IS NOT NULL
      AND tenant_id = ${tenantId}
      AND (prazo_entrega::date - CURRENT_DATE) BETWEEN 0 AND 3
    `;
    for (const p of projetos) {
      const exists = await sql`
        SELECT id FROM notificacoes 
        WHERE lida = false AND tipo = 'prazo_projeto' AND referencia_id = ${p.id} AND tenant_id = ${tenantId}
      `;
      if (!exists.length) {
        await sql`
          INSERT INTO notificacoes (tipo, titulo, mensagem, prioridade, referencia_tipo, referencia_id, url_destino, tenant_id)
          VALUES ('prazo_projeto', 'Entrega Próxima: ' || ${p.ambiente}, 'Entrega prevista para os próximos dias.', 'alta', 'projeto', ${p.id}, '/projetos', ${tenantId})
        `;
        criadas++;
      }
    }
  } catch (e) {
    console.error('Erro ao gerar notificações de projetos:', e);
  }

  // 3. Orçamentos sem resposta (7 dias)
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
    for (const o of orcamentosPendentes) {
      const exists = await sql`
        SELECT id FROM notificacoes 
        WHERE lida = false AND tipo = 'orcamento_sem_resposta' AND referencia_id = ${o.id} AND tenant_id = ${tenantId}
      `;
      if (!exists.length) {
        await sql`
          INSERT INTO notificacoes (tipo, titulo, mensagem, prioridade, referencia_tipo, referencia_id, url_destino, tenant_id)
          VALUES ('orcamento_sem_resposta', 'Orçamento sem retorno: ' || ${o.numero}, ${`Cliente ${o.cliente} não responde há 7 dias.`}, 'normal', 'quotation', ${o.id}, '/quotations', ${tenantId})
        `;
        criadas++;
      }
    }
  } catch (e) {
    console.error('Erro ao gerar notificações de orçamentos:', e);
  }

  // 4. Garantias pendentes (3 dias)
  try {
    const garantias = await sql`
      SELECT id, numero, titulo
      FROM chamados_garantia
      WHERE status IN ('aberto', 'agendado') AND tenant_id = ${tenantId}
      AND created_at < NOW() - INTERVAL '3 days'
    `;
    for (const g of garantias) {
      const exists = await sql`
        SELECT id FROM notificacoes 
        WHERE lida = false AND tipo = 'garantia_pendente' AND referencia_id = ${g.id} AND tenant_id = ${tenantId}
      `;
      if (!exists.length) {
        await sql`
          INSERT INTO notificacoes (tipo, titulo, mensagem, prioridade, referencia_tipo, referencia_id, url_destino, tenant_id)
          VALUES ('garantia_pendente', 'Garantia Pendente: ' || ${g.numero}, ${`Chamado "${g.titulo}" aguarda atendimento há 3 dias.`}, 'alta', 'chamado', ${g.id}, '/pos-venda', ${tenantId})
        `;
        criadas++;
      }
    }
  } catch (e) {
    console.error('Erro ao gerar notificações de garantia:', e);
  }

  // 5. Cobranças vencidas
  try {
    const cobrancas = await sql`
      SELECT id, nf, pedido, valor, due_date, cliente
      FROM billings
      WHERE status NOT IN ('PAGO', 'pago', 'concluido') AND tenant_id = ${tenantId}
      AND due_date < CURRENT_DATE
    `;
    for (const c of cobrancas) {
      const exists = await sql`
        SELECT id FROM notificacoes 
        WHERE lida = false AND tipo = 'cobranca_vencida' AND referencia_id = ${c.id} AND tenant_id = ${tenantId}
      `;
      if (!exists.length) {
        await sql`
          INSERT INTO notificacoes (tipo, titulo, mensagem, prioridade, referencia_tipo, referencia_id, url_destino, tenant_id)
          VALUES ('cobranca_vencida', 'Pagamento Vencido: ' || ${c.nf || c.pedido || 'N/A'}, ${`O pagamento de ${c.cliente || 'cliente'} no valor de R$ ${c.valor} venceu em ${new Date(c.due_date).toLocaleDateString()}.`}, 'critica', 'financeiro', ${c.id}, '/financeiro', ${tenantId})
        `;
        criadas++;
      }
    }
  } catch (e) {
    console.error('Erro ao gerar notificações de cobrança:', e);
  }

  return { criadas };
}
