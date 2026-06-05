import { validateAuth } from './_db.js';
import { db } from './drizzle-db.js';
import { quotations, quotationItems, clientes } from '../db/schema/index.js';
import { eq, and } from 'drizzle-orm';

// Refatorado para usar quotations via Drizzle ORM
// Features afetadas: /aprovar/[token] (rota publica).

export async function handleAprovacao(req: any, res: any) {
  try {
    const { method } = req;
    const { token } = req.query;

    // Rota pública para buscar orçamento pelo token
    if (method === 'GET' && token) {
      const orcList = await db
        .select({
          id: quotations.id,
          cliente_id: quotations.clienteId,
          projeto_id: quotations.projetoId,
          numero: quotations.numeroOrcamento,
          status: quotations.status,
          valor_base: quotations.valorTotalCusto,
          taxa_mensal: quotations.taxaFinanceiraPercentual,
          condicao_pagamento_id: quotations.descritivoPagamento,
          valor_final: quotations.valorTotalVenda,
          prazo_entrega_dias: quotations.prazoEntregaDias,
          prazo_tipo: quotations.validadeDias,
          adicional_urgencia_pct: quotations.descontoPercentual,
          observacoes: quotations.condicoesComerciais,
          materiais_consumidos: quotations.materiaisConsumidos,
          created_at: quotations.createdAt,
          updated_at: quotations.updatedAt,
          token_aprovacao: quotations.tokenAprovacao,
          url_aprovacao: quotations.urlAprovacao,
          aprovado_em: quotations.aprovadoEm,
          aprovado_ip: quotations.aprovadoIp,
          aprovado_nome: quotations.aprovadoNome,
          recusado_em: quotations.recusadoEm,
          motivo_recusa: quotations.motivoRecusa,
          tenant_id: quotations.tenantId,
          cliente_nome: clientes.nome,
          cliente_email: clientes.email,
          cliente_telefone: clientes.telefone,
        })
        .from(quotations)
        .leftJoin(clientes, eq(quotations.clienteId, clientes.id))
        .where(eq(quotations.tokenAprovacao, token))
        .limit(1);

      const orc = orcList[0];
      if (!orc) return res.status(404).json({ success: false, error: 'Proposta não encontrada ou link expirado' });

      // Buscar itens do orçamento usando Drizzle
      const itmsRows = await db
        .select()
        .from(quotationItems)
        .where(
          and(
            eq(quotationItems.quotationId, orc.id),
            eq(quotationItems.tenantId, orc.tenant_id)
          )
        )
        .orderBy(quotationItems.createdAt);

      const itms = itmsRows.map(item => ({
        id: item.id,
        quotation_id: item.quotationId,
        descricao: item.skuDescricao || item.nomeCustomizado || 'Item',
        ambiente: item.nomeCustomizado || 'Geral',
        largura_cm: item.largura ? parseFloat(item.largura) : 0,
        altura_cm: item.altura ? parseFloat(item.altura) : 0,
        profundidade_cm: item.espessura ? parseFloat(item.espessura) : 0,
        material: item.material || '',
        acabamento: item.skuDescricao || '',
        quantidade: item.quantidade ? parseFloat(item.quantidade) : 0,
        valor_unitario: item.precoVendaUnitario ? parseFloat(item.precoVendaUnitario) : 0,
        valor_total: (item.precoVendaUnitario ? parseFloat(item.precoVendaUnitario) : 0) * (item.quantidade ? parseFloat(item.quantidade) : 0),
        erp_product_id: item.skuEngenhariaId || '',
        erp_parametros: item.metadata || {},
        created_at: item.createdAt,
        updated_at: item.updatedAt
      }));

      const condicao = null; // Mapeado para null por compatibilidade (condições comeciais vêm em observações)

      return res.status(200).json({ success: true, data: { ...orc, itens: itms, condicao } });
    }

    // Gerar link (Protegido)
    if (method === 'POST' && req.url.includes('gerar')) {
      const auth = validateAuth(req);
      if (!auth.authorized) return res.status(401).json({ success: false, error: auth.error || 'Não autorizado' });
      const tenantId = auth.user?.tenantId || '00000000-0000-0000-0000-000000000000';

      const { quotation_id } = req.body;
      const newToken = crypto.randomUUID();
      const origin = req.headers.origin || 'https://dluxury-crm.vercel.app';
      const url = `${origin}/aprovar/${newToken}`;

      const result = await db
        .update(quotations)
        .set({
          tokenAprovacao: newToken,
          urlAprovacao: url,
          status: 'enviado',
          updatedAt: new Date()
        })
        .where(
          and(
            eq(quotations.id, quotation_id),
            eq(quotations.tenantId, tenantId)
          )
        )
        .returning({
          id: quotations.id,
          numero: quotations.numeroOrcamento,
          token_aprovacao: quotations.tokenAprovacao,
          url_aprovacao: quotations.urlAprovacao,
          status: quotations.status,
          updated_at: quotations.updatedAt
        });

      return res.status(200).json({ success: true, data: result[0] });
    }

    // Aprovar (Público)
    if (method === 'POST' && req.url.includes('aprovar')) {
      const { nome } = req.body;
      const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

      const result = await db
        .update(quotations)
        .set({
          status: 'aprovado',
          aprovadoEm: new Date(),
          aprovadoIp: typeof ip === 'string' ? ip : String(ip || ''),
          aprovadoNome: nome,
          updatedAt: new Date()
        })
        .where(eq(quotations.tokenAprovacao, token))
        .returning({
          id: quotations.id,
          numero: quotations.numeroOrcamento
        });

      if (result.length === 0) return res.status(404).json({ success: false, error: 'Erro ao aprovar proposta' });

      return res.status(200).json({ success: true, data: result[0] });
    }

    // Recusar (Público)
    if (method === 'POST' && req.url.includes('recusar')) {
      const { motivo } = req.body;
      await db
        .update(quotations)
        .set({
          status: 'revisao_solicitada',
          recusadoEm: new Date(),
          motivoRecusa: motivo,
          updatedAt: new Date()
        })
        .where(eq(quotations.tokenAprovacao, token));
      
      return res.status(200).json({ success: true });
    }

    return res.status(405).end();
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
}
