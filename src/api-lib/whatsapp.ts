import { sql } from './_db.js';
import { withTenant, type TenantHandler } from './middleware/tenantMiddleware.js';
import { requireFeature } from './middleware/featureGate.js';
import { logger } from './logger.js';

const handleWhatsAppCore: TenantHandler = async (req, res) => {
  try {
    await requireFeature('whatsapp')(req, res, () => {});
    if (res.headersSent) return;
    const tenantId = req.tenantId;
    const user = req.tenantUser;
    const method = req.method;
    const url = req.url || '';

    // Garantir que existam modelos de teste
    await seedDefaultModelos(tenantId);

    // ────────────────────────────────────────────────────────────────────────────────
    // GET /api/whatsapp/mensagens
    // ────────────────────────────────────────────────────────────────────────────────
    if (method === 'GET' && url.includes('/mensagens')) {
      const { quotation_id, operacao_prod_id } = req.query;

      let queryStr = `
        SELECT 
          m.id,
          m.tipo_msg,
          m.conteudo_msg,
          m.timestamp_msg,
          m.status_entrega,
          m.arquivo_url,
          u.name as usuario_nome
        FROM mensagens_whatsapp m
        LEFT JOIN users u ON m.usuario_id = u.id
        JOIN conversas_whatsapp c ON m.conversa_whatsapp_id = c.id
        WHERE m.tenant_id = $1::uuid
      `;

      const params: any[] = [tenantId];
      let paramCount = 1;

      if (quotation_id) {
        paramCount++;
        queryStr += ` AND c.quotation_id = $${paramCount}::uuid`;
        params.push(quotation_id);
      } else if (operacao_prod_id) {
        paramCount++;
        queryStr += ` AND c.operacao_prod_id = $${paramCount}::uuid`;
        params.push(operacao_prod_id);
      } else {
        return res.status(400).json({
          success: false,
          error: 'Parâmetro quotation_id ou operacao_prod_id é obrigatório',
        });
      }

      queryStr += ` ORDER BY m.timestamp_msg ASC`;

      const result = await sql(queryStr as any, ...params);

      // Obter tags e metadados da conversa
      let conversaQuery = `
        SELECT tags, numero_telefone, contato_nome 
        FROM conversas_whatsapp 
        WHERE tenant_id = $1::uuid
      `;
      const cParams = [tenantId];
      if (quotation_id) {
        conversaQuery += ` AND quotation_id = $2::uuid`;
        cParams.push(quotation_id);
      } else {
        conversaQuery += ` AND operacao_prod_id = $2::uuid`;
        cParams.push(operacao_prod_id);
      }

      const cRows = await sql(conversaQuery as any, ...cParams);
      const tagsRaw = cRows[0]?.tags || '';
      const tags = tagsRaw ? tagsRaw.split(',') : [];

      return res.status(200).json({
        success: true,
        mensagens: result.map((r: any) => ({
          id: r.id,
          tipo_msg: r.tipo_msg,
          conteudo_msg: r.conteudo_msg,
          timestamp_msg: r.timestamp_msg,
          status_entrega: r.status_entrega,
          arquivo_url: r.arquivo_url,
          usuario_nome: r.usuario_nome,
        })),
        tags,
        numero_telefone: cRows[0]?.numero_telefone || '',
        contato_nome: cRows[0]?.contato_nome || '',
      });
    }

    // ────────────────────────────────────────────────────────────────────────────────
    // POST /api/whatsapp/enviar-mensagem
    // ────────────────────────────────────────────────────────────────────────────────
    if (method === 'POST' && url.includes('/enviar-mensagem')) {
      const { quotation_id, operacao_prod_id, numero_telefone, conteudo_msg, tags } = req.body;

      if (!conteudo_msg || !numero_telefone) {
        return res.status(400).json({
          success: false,
          error: 'Parâmetros numero_telefone e conteudo_msg são obrigatórios',
        });
      }

      // 1. Verificar/criar conversa
      let conversa_id: number;
      let cQuery = `
        SELECT id FROM conversas_whatsapp 
        WHERE tenant_id = $1::uuid
      `;
      const cParams = [tenantId];
      if (quotation_id) {
        cQuery += ` AND quotation_id = $2::uuid`;
        cParams.push(quotation_id);
      } else if (operacao_prod_id) {
        cQuery += ` AND operacao_prod_id = $2::uuid`;
        cParams.push(operacao_prod_id);
      } else {
        cQuery += ` AND numero_telefone = $2`;
        cParams.push(numero_telefone);
      }

      const conversaRows = await sql(cQuery as any, ...cParams);

      const tagsStr = Array.isArray(tags) ? tags.join(',') : '';

      if (conversaRows.length === 0) {
        // Obter nome do cliente da OP/Orçamento se possível
        let contatoNome = 'Cliente';
        if (quotation_id) {
          const [oRow] = await sql`
            SELECT c.nome FROM quotations o 
            LEFT JOIN clients c ON o.cliente_id::text = c.id::text AND o.tenant_id = c.tenant_id
            WHERE o.id = ${quotation_id}::uuid
          `;
          if (oRow?.nome) contatoNome = oRow.nome;
        } else if (operacao_prod_id) {
          const [oRow] = await sql`
            SELECT c.nome FROM ordens_prod op
            JOIN quotations o ON op.quotation_id = o.id
            LEFT JOIN clients c ON o.cliente_id::text = c.id::text AND o.tenant_id = c.tenant_id
            WHERE op.id = ${operacao_prod_id}::uuid
          `;
          if (oRow?.nome) contatoNome = oRow.nome;
        }

        const [newConv] = await sql`
          INSERT INTO conversas_whatsapp (tenant_id, quotation_id, operacao_prod_id, numero_telefone, contato_nome, ultima_mensagem, timestamp_ultima_msg, tags)
          VALUES (${tenantId}::uuid, ${quotation_id || null}::uuid, ${operacao_prod_id || null}::uuid, ${numero_telefone}, ${contatoNome}, ${conteudo_msg}, NOW(), ${tagsStr})
          RETURNING id
        `;
        conversa_id = newConv.id;
      } else {
        conversa_id = conversaRows[0].id;
        // Atualizar última mensagem e tags
        await sql`
          UPDATE conversas_whatsapp
          SET ultima_mensagem = ${conteudo_msg},
              timestamp_ultima_msg = NOW(),
              tags = ${tagsStr},
              updated_at = NOW()
          WHERE id = ${conversa_id}
        `;
      }

      // 2. Criar mensagem com status 'enviado'
      const waMsgId = 'wa_msg_' + Math.random().toString(36).substring(2, 15);
      const [newMsg] = await sql`
        INSERT INTO mensagens_whatsapp (tenant_id, conversa_whatsapp_id, usuario_id, tipo_msg, conteudo_msg, whatsapp_msg_id, status_entrega, timestamp_msg)
        VALUES (${tenantId}::uuid, ${conversa_id}, ${user.id}::uuid, 'saida', ${conteudo_msg}, ${waMsgId}, 'enviado', NOW())
        RETURNING id
      `;

      // 3. Simular envio e atualização de status em background (entrega -> leitura em segundos)
      simulateDeliveryPipeline(newMsg.id, tenantId).catch(logger.error);

      return res.status(200).json({
        success: true,
        id: newMsg.id,
        status_entrega: 'enviado',
        whatsapp_msg_id: waMsgId,
      });
    }

    // ────────────────────────────────────────────────────────────────────────────────
    // GET /api/whatsapp/modelos
    // ────────────────────────────────────────────────────────────────────────────────
    if (method === 'GET' && url.includes('/modelos')) {
      const modelos = await sql`
        SELECT * FROM modelos_msg_whatsapp 
        WHERE tenant_id = ${tenantId}::uuid AND ativo = TRUE
        ORDER BY titulo ASC
      `;

      return res.status(200).json({
        success: true,
        modelos: modelos.map((m: any) => ({
          id: m.id,
          titulo: m.titulo,
          conteudo_template: m.conteudo_template,
          tipo_acionador: m.tipo_acionador,
        })),
      });
    }

    // ────────────────────────────────────────────────────────────────────────────────
    // POST /api/whatsapp/webhook (Mock para o webhook que simula resposta do cliente)
    // ────────────────────────────────────────────────────────────────────────────────
    if (method === 'POST' && url.includes('/webhook')) {
      const { from_number, message_text, quotation_id, operacao_prod_id } = req.body;

      if (!from_number || !message_text) {
        return res
          .status(400)
          .json({ success: false, error: 'from_number e message_text são obrigatórios' });
      }

      // 1. Achar conversa ou criar
      let conversa_id: number;
      const cQuery = `
        SELECT id FROM conversas_whatsapp 
        WHERE tenant_id = $1::uuid AND numero_telefone = $2
      `;
      const cParams = [tenantId, from_number];
      const conversaRows = await sql(cQuery as any, ...cParams);

      if (conversaRows.length === 0) {
        const [newConv] = await sql`
          INSERT INTO conversas_whatsapp (tenant_id, quotation_id, operacao_prod_id, numero_telefone, contato_nome, ultima_mensagem, timestamp_ultima_msg)
          VALUES (${tenantId}::uuid, ${quotation_id || null}::uuid, ${operacao_prod_id || null}::uuid, ${from_number}, 'Cliente Autônomo', ${message_text}, NOW())
          RETURNING id
        `;
        conversa_id = newConv.id;
      } else {
        conversa_id = conversaRows[0].id;
        await sql`
          UPDATE conversas_whatsapp
          SET ultima_mensagem = ${message_text},
              timestamp_ultima_msg = NOW(),
              mensagens_nao_lidas = mensagens_nao_lidas + 1,
              updated_at = NOW()
          WHERE id = ${conversa_id}
        `;
      }

      // 2. Inserir mensagem de entrada
      const waMsgId = 'wa_in_' + Math.random().toString(36).substring(2, 15);
      const [newMsg] = await sql`
        INSERT INTO mensagens_whatsapp (tenant_id, conversa_whatsapp_id, tipo_msg, conteudo_msg, whatsapp_msg_id, status_entrega, timestamp_msg)
        VALUES (${tenantId}::uuid, ${conversa_id}, 'entrada', ${message_text}, ${waMsgId}, 'lido', NOW())
        RETURNING id
      `;

      return res.status(200).json({ success: true, data: newMsg });
    }

    return res.status(405).json({ success: false, error: 'Método não permitido' });
  } catch (err: any) {
    logger.error('[WHATSAPP_ERROR]', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

export const handleWhatsApp = withTenant(handleWhatsAppCore);

// ────────────────────────────────────────────────────────────────────────────────
// Pipeline de Simulação Assíncrona de Entrega
// ────────────────────────────────────────────────────────────────────────────────
async function simulateDeliveryPipeline(msgId: number, tenantId: string) {
  // Atraso de 1.5s -> Entregue
  await new Promise((r) => setTimeout(r, 1500));
  await sql`
    UPDATE mensagens_whatsapp
    SET status_entrega = 'entregue'
    WHERE id = ${msgId} AND tenant_id = ${tenantId}::uuid
  `;

  // Atraso de mais 2.5s -> Lido (✓✓ azul)
  await new Promise((r) => setTimeout(r, 2500));
  await sql`
    UPDATE mensagens_whatsapp
    SET status_entrega = 'lido'
    WHERE id = ${msgId} AND tenant_id = ${tenantId}::uuid
  `;
}

// ────────────────────────────────────────────────────────────────────────────────
// Seed de Modelos Padrão de WhatsApp
// ────────────────────────────────────────────────────────────────────────────────
async function seedDefaultModelos(tenantId: string) {
  try {
    const rows = await sql`
      SELECT count(*) as count FROM modelos_msg_whatsapp WHERE tenant_id = ${tenantId}::uuid
    `;
    if (rows.length && parseInt(rows[0].count, 10) === 0) {
      await sql`
        INSERT INTO modelos_msg_whatsapp (tenant_id, titulo, conteudo_template, tipo_acionador, ativo)
        VALUES 
          (${tenantId}::uuid, 'Confirmação de Medição', 'Olá {cliente}, agendamos a medição técnica para o seu projeto no dia {data_prazo}. Por favor, confirme se este horário está adequado.', 'medicao', true),
          (${tenantId}::uuid, 'Produção Iniciada', 'Olá {cliente}, temos ótimas notícias! O seu pedido {numero_op} entrou em fase de produção na fábrica.', 'producao_iniciada', true),
          (${tenantId}::uuid, 'Pronta Entrega', 'Olá {cliente}, seu projeto {numero_op} já está concluído e pronto. Entraremos em contato em breve para agendar a montagem.', 'pronta_entrega', true)
      `;
    }
  } catch (e: any) {
    logger.error('Seed Default Modelos Error:', e.message);
  }
}
