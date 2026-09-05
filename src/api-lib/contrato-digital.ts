import { sql } from './_db.js';
import { withTenant, type TenantHandler } from './middleware/tenantMiddleware.js';
import { db } from './drizzle-db.js';
import { quotations, quotationItems } from '../db/schema/index.js';
import { eq, and } from 'drizzle-orm';
import { logger } from './logger.js';

// Refatorado para usar quotations via Drizzle ORM
// Rotas afetadas: /api/contratos/{status,gerar-e-enviar,webhook-assinatura}.

// Função para gerar o HTML do contrato com base no orçamento e cliente
function gerarHTMLContrato(quotation: any, cliente: any, itens: any[]): string {
  const itensHtml = itens
    .map(
      (item: any) => `
    <tr>
      <td style="padding: 8px; border: 1px solid #ddd;">${item.sku_codigo || 'N/A'}</td>
      <td style="padding: 8px; border: 1px solid #ddd;">${item.nome_customizado || item.sku_descricao || 'Item de Engenharia'}</td>
      <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${Number(item.quantidade).toFixed(0)}</td>
      <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">R$ ${Number(item.preco_venda_unitario || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
      <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">R$ ${Number(item.preco_venda_unitario * item.quantidade || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
    </tr>
  `,
    )
    .join('');

  const valorTotal = Number(quotation.valor_total_venda || 0);

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: Arial, sans-serif; margin: 40px; color: #333; line-height: 1.6; }
        .header { text-align: center; margin-bottom: 40px; border-bottom: 2px solid #333; padding-bottom: 20px; }
        .header h1 { margin: 0; font-size: 24px; text-transform: uppercase; letter-spacing: 1px; }
        .header p { margin: 5px 0 0 0; color: #666; font-size: 14px; }
        .section { margin-bottom: 30px; }
        .section h2 { font-size: 18px; border-left: 4px solid #0D66CC; padding-left: 10px; margin-bottom: 15px; }
        table { width: 100%; border-collapse: collapse; margin-top: 15px; }
        th { background: #f3f4f6; padding: 10px; border: 1px solid #ddd; font-weight: bold; font-size: 14px; text-align: left; }
        .total-box { margin-top: 20px; text-align: right; font-size: 16px; font-weight: bold; background: #f3f4f6; padding: 15px; border-radius: 4px; }
        .signature-area { margin-top: 60px; display: flex; justify-content: space-between; }
        .signature-line { width: 45%; border-top: 1px solid #999; text-align: center; padding-top: 8px; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>D'LUXURY MÓVEIS PLANEJADOS</h1>
        <p>CNPJ: 12.345.678/0001-90 | contato@dluxury.com.br</p>
      </div>
      
      <div class="section">
        <h2>CONTRATO DE PRESTAÇÃO DE SERVIÇOS E FABRICAÇÃO DE MÓVEIS</h2>
        <p>Por este instrumento particular, as partes qualificadas acordam com a fabricação, entrega e montagem dos móveis planejados sob medida, conforme especificações descritas no orçamento técnico de referência.</p>
        <p><strong>Contrato Nº:</strong> CONT-${quotation.numero_orcamento || quotation.id.substring(0, 8).toUpperCase()}</p>
        <p><strong>Orçamento Ref:</strong> ${quotation.numero_orcamento}</p>
        <p><strong>Data:</strong> ${new Date().toLocaleDateString('pt-BR')}</p>
      </div>

      <div class="section">
        <h2>CONTRATANTE (CLIENTE)</h2>
        <p><strong>Nome/Razão Social:</strong> ${cliente?.nome || 'Cliente não qualificado'}</p>
        <p><strong>CPF/CNPJ:</strong> ${cliente?.cnpj || cliente?.cpf || 'Não informado'}</p>
        <p><strong>Email:</strong> ${cliente?.email || 'Não informado'}</p>
        <p><strong>Telefone:</strong> ${cliente?.telefone || 'Não informado'}</p>
        <p><strong>Endereço de Entrega:</strong> ${cliente?.logradouro || ''}, ${cliente?.numero || ''} - ${cliente?.cidade || ''}/${cliente?.uf || ''}</p>
      </div>
      
      <div class="section">
        <h2>DETALHAMENTO DOS ITENS E PROJETOS</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr>
              <th style="padding: 10px; border: 1px solid #ddd;">SKU</th>
              <th style="padding: 10px; border: 1px solid #ddd;">Ambiente/Móvel</th>
              <th style="padding: 10px; border: 1px solid #ddd; text-align: center;">Qtd</th>
              <th style="padding: 10px; border: 1px solid #ddd; text-align: right;">Unitário</th>
              <th style="padding: 10px; border: 1px solid #ddd; text-align: right;">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            ${itensHtml}
          </tbody>
        </table>
        <div class="total-box">
          VALOR TOTAL DO CONTRATO: R$ ${valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
        </div>
      </div>

      <div class="section">
        <h2>CLÁUSULA PRIMEIRA - DO OBJETO E PRAZOS</h2>
        <p>O prazo de entrega e montagem final dos produtos é de até <strong>${quotation.prazo_entrega_dias || 45} dias úteis</strong>, contados a partir da data de assinatura deste contrato e validação das medidas técnicas pelo engenheiro responsável.</p>
      </div>

      <div class="section">
        <h2>CLÁUSULA SEGUNDA - DA ASSINATURA DIGITAL</h2>
        <p>Este contrato é assinado eletronicamente por meio da plataforma DocuSign/Assina.ai em total conformidade com a MP nº 2.200-2/2001, garantindo validade jurídica, autenticidade e integridade das assinaturas apostas.</p>
      </div>
      
      <div class="signature-area">
        <div class="signature-line">
          Representante D'Luxury Planejados<br>
          Assinado eletronicamente
        </div>
        <div class="signature-line">
          ${cliente?.nome || 'Contratante'}<br>
          Assinatura eletrônica pendente
        </div>
      </div>
    </body>
    </html>
  `;
}

const handleContratoDigitalCore: TenantHandler = async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const user = req.tenantUser;
    const method = req.method;
    const url = req.url || '';

    // ────────────────────────────────────────────────────────────────────────────────
    // GET /api/contratos/status
    // ────────────────────────────────────────────────────────────────────────────────
    if (method === 'GET' && url.includes('/status')) {
      const { quotation_id } = req.query;

      if (!quotation_id) {
        return res
          .status(400)
          .json({ success: false, error: 'Parâmetro quotation_id é obrigatório' });
      }

      const [contrato] = await sql`
        SELECT * FROM contrato_digital 
        WHERE quotation_id = ${quotation_id}::uuid AND tenant_id = ${tenantId}::uuid
      `;

      if (!contrato) {
        return res.status(200).json({ success: true, contrato: null });
      }

      const historico = await sql`
        SELECT * FROM historico_assinatura_digital 
        WHERE contrato_id = ${contrato.id} AND tenant_id = ${tenantId}::uuid
        ORDER BY timestamp_acao DESC
      `;

      return res.status(200).json({ success: true, contrato, historico });
    }

    // ────────────────────────────────────────────────────────────────────────────────
    // POST /api/contratos/gerar-e-enviar
    // ────────────────────────────────────────────────────────────────────────────────
    if (method === 'POST' && url.includes('/gerar-e-enviar')) {
      const { quotation_id } = req.body;

      if (!quotation_id) {
        return res
          .status(400)
          .json({ success: false, error: 'Parâmetro quotation_id é obrigatório' });
      }

      // 1. Buscar orçamento com Drizzle
      const [orc] = await db
        .select()
        .from(quotations)
        .where(and(eq(quotations.id, quotation_id), eq(quotations.tenantId, tenantId)))
        .limit(1);

      if (!orc) {
        return res.status(404).json({ success: false, error: 'Orçamento não encontrado' });
      }

      const mappedOrc = {
        id: orc.id,
        numero: orc.numeroOrcamento,
        numero_orcamento: orc.numeroOrcamento,
        cliente_id: orc.clienteId,
        projeto_id: orc.projetoId,
        valor_total_venda: orc.valorTotalVenda ? parseFloat(orc.valorTotalVenda) : 0,
        prazo_entrega_dias: orc.prazoEntregaDias || 45,
        status: orc.status,
      };

      // 2. Buscar cliente associado
      let cliente = null;
      if (mappedOrc.cliente_id) {
        const [cliRow] = await sql`
          SELECT * FROM clients 
          WHERE id::text = ${mappedOrc.cliente_id.toString()} AND tenant_id = ${tenantId}::uuid
        `;
        cliente = cliRow;
      }

      // 3. Buscar itens do orçamento com Drizzle
      const itens = await db
        .select()
        .from(quotationItems)
        .where(
          and(eq(quotationItems.quotationId, quotation_id), eq(quotationItems.tenantId, tenantId)),
        );

      const mappedItens = itens.map((item) => ({
        id: item.id,
        quotation_id: item.quotationId,
        sku_codigo: item.skuCodigo || '',
        nome_customizado: item.nomeCustomizado || '',
        sku_descricao: item.skuDescricao || '',
        quantidade: item.quantidade ? parseFloat(item.quantidade) : 0,
        preco_venda_unitario: item.precoVendaUnitario ? parseFloat(item.precoVendaUnitario) : 0,
      }));

      // 4. Gerar HTML do contrato
      const htmlContrato = gerarHTMLContrato(mappedOrc, cliente, mappedItens);

      // 5. Simular PDF e Envelope DocuSign
      const numeroContrato = `CONT-${mappedOrc.numero || mappedOrc.id.substring(0, 8).toUpperCase()}`;
      const envelopeId = 'docusign_env_' + Math.random().toString(36).substring(2, 15);
      const urlAssinaturaSimulada = `/assinar/${envelopeId}`;

      // 6. Verificar se já existe um contrato para esse orçamento
      const [contratoExistente] = await sql`
        SELECT id FROM contrato_digital 
        WHERE quotation_id = ${quotation_id}::uuid AND tenant_id = ${tenantId}::uuid
      `;

      let contratoId: number;

      if (contratoExistente) {
        contratoId = contratoExistente.id;
        // Atualizar contrato existente
        await sql`
          UPDATE contrato_digital
          SET numero_contrato = ${numeroContrato},
              empresa_nome = 'D''Luxury Planejados LTDA',
              empresa_cnpj = '12.345.678/0001-90',
              cliente_nome = ${cliente?.nome || 'Cliente'},
              cliente_cpf_cnpj = ${cliente?.cnpj || cliente?.cpf || ''},
              html_contrato = ${htmlContrato},
              arquivo_pdf_url = ${`/contracts/${numeroContrato}.pdf`},
              status_assinatura = 'pendente',
              id_assinatura_externa = ${envelopeId},
              url_assinatura = ${urlAssinaturaSimulada},
              data_solicitacao_assinatura = NOW(),
              updated_at = NOW()
          WHERE id = ${contratoId} AND tenant_id = ${tenantId}::uuid
        `;
      } else {
        // Criar novo contrato
        const [newContract] = await sql`
          INSERT INTO contrato_digital 
          (tenant_id, quotation_id, numero_contrato, empresa_nome, empresa_cnpj, cliente_nome, cliente_cpf_cnpj, html_contrato, arquivo_pdf_url, status_assinatura, id_assinatura_externa, url_assinatura, data_solicitacao_assinatura)
          VALUES 
          (${tenantId}::uuid, ${quotation_id}::uuid, ${numeroContrato}, 'D''Luxury Planejados LTDA', '12.345.678/0001-90', ${cliente?.nome || 'Cliente'}, ${cliente?.cnpj || cliente?.cpf || ''}, ${htmlContrato}, ${`/contracts/${numeroContrato}.pdf`}, 'pendente', ${envelopeId}, ${urlAssinaturaSimulada}, NOW())
          RETURNING id
        `;
        contratoId = newContract.id;
      }

      // 7. Registrar histórico
      await sql`
        INSERT INTO historico_assinatura_digital (tenant_id, contrato_id, acao, detalhes, usuario_id)
        VALUES (${tenantId}::uuid, ${contratoId}, 'contrato_gerado', 'Contrato digital emitido e enviado para DocuSign/Assina.ai', ${user.id}::uuid)
      `;

      return res.status(200).json({
        success: true,
        contrato_id: contratoId,
        numero_contrato: numeroContrato,
        url_assinatura: urlAssinaturaSimulada,
        status: 'pendente',
      });
    }

    // ────────────────────────────────────────────────────────────────────────────────
    // POST /api/contratos/webhook-assinatura
    // ────────────────────────────────────────────────────────────────────────────────
    if (method === 'POST' && url.includes('/webhook-assinatura')) {
      const { envelope_id, status } = req.body;

      if (!envelope_id || !status) {
        return res
          .status(400)
          .json({ success: false, error: 'Parâmetros envelope_id e status são obrigatórios' });
      }

      // 1. Buscar contrato associado ao envelope externo
      const [contrato] = await sql`
        SELECT * FROM contrato_digital 
        WHERE id_assinatura_externa = ${envelope_id} AND tenant_id = ${tenantId}::uuid
      `;

      if (!contrato) {
        return res
          .status(404)
          .json({ success: false, error: 'Contrato não localizado para este envelope' });
      }

      if (contrato.status_assinatura === 'assinado') {
        return res.status(200).json({ success: true, message: 'Contrato já assinado' });
      }

      if (status === 'completed') {
        const hashDoc = 'sha256_hash_' + Math.random().toString(36).substring(2, 15);
        const docAssinadoUrl = `/contracts/signed-${contrato.numero_contrato}.pdf`;

        // 2. Atualizar contrato
        await sql`
          UPDATE contrato_digital
          SET status_assinatura = 'assinado',
              documento_assinado_url = ${docAssinadoUrl},
              hash_documento = ${hashDoc},
              data_assinatura_cliente = NOW(),
              data_assinatura_empresa = NOW(),
              certificado_validade = NOW() + INTERVAL '5 years',
              updated_at = NOW()
          WHERE id = ${contrato.id} AND tenant_id = ${tenantId}::uuid
        `;

        // 3. Inserir histórico
        await sql`
          INSERT INTO historico_assinatura_digital (tenant_id, contrato_id, acao, detalhes)
          VALUES (${tenantId}::uuid, ${contrato.id}, 'assinado', 'Contrato completamente assinado por ambas as partes via assinatura digital')
        `;

        // 4. Buscar o orçamento para acionar o fluxo completo de aprovação
        const [orc] = await db
          .select()
          .from(quotations)
          .where(and(eq(quotations.id, contrato.quotation_id), eq(quotations.tenantId, tenantId)))
          .limit(1);

        const mappedOrc = orc
          ? {
              id: orc.id,
              numero: orc.numeroOrcamento,
              status: orc.status,
              prazoEntregaDias: orc.prazoEntregaDias,
            }
          : null;

        if (mappedOrc && mappedOrc.status !== 'fechada') {
          // 4.1 Atualizar status do orçamento na tabela física
          await db
            .update(quotations)
            .set({
              status: 'fechada',
              updatedAt: new Date(),
            })
            .where(
              and(eq(quotations.id, contrato.quotation_id), eq(quotations.tenantId, tenantId)),
            );

          // 4.2 Gerar OP no Kanban de Produção (Fase 1)
          const numeroOp = `OP-${mappedOrc.numero || mappedOrc.id.substring(0, 8).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
          const dataPrazo = new Date();
          dataPrazo.setDate(dataPrazo.getDate() + Number(mappedOrc.prazoEntregaDias || 45));

          const [newOp] = await sql`
            INSERT INTO ordens_prod (id, tenant_id, quotation_id, numero_op, status, prioridade, data_prazo, created_at, updated_at)
            VALUES (gen_random_uuid(), ${tenantId}::uuid, ${contrato.quotation_id}::uuid, ${numeroOp}, 'planejamento', 5, ${dataPrazo.toISOString().split('T')[0]}, NOW(), NOW())
            RETURNING id
          `;

          if (newOp?.id) {
            const etapasPadrao = [
              { numero: 1, nome: 'MEDIÇÃO' },
              { numero: 2, nome: 'PROJETO' },
              { numero: 3, nome: 'PRODUÇÃO' },
              { numero: 4, nome: 'MONTAGEM' },
              { numero: 5, nome: 'ENTREGA' },
            ];

            for (const et of etapasPadrao) {
              await sql`
                INSERT INTO etapas_prod_kanban (tenant_id, operacao_prod_id, etapa_numero, etapa_nome, status_kanban, ordem_display, created_at, updated_at)
                VALUES (${tenantId}::uuid, ${newOp.id}::uuid, ${et.numero}, ${et.nome}, 'a_fazer', ${et.numero}, NOW(), NOW())
              `;
            }
          }

          // 4.3 Provisionar materiais consumidos no estoque detalhado (Fase 3)
          const itensOrcamento = await db
            .select()
            .from(quotationItems)
            .where(
              and(
                eq(quotationItems.quotationId, contrato.quotation_id),
                eq(quotationItems.tenantId, tenantId),
              ),
            );

          const mappedItensOrcamento = itensOrcamento.map((item) => ({
            id: item.id,
            sku_codigo: item.skuCodigo || '',
            quantidade: item.quantidade ? parseFloat(item.quantidade) : 0,
          }));

          for (const item of mappedItensOrcamento) {
            const sku = item.sku_codigo;
            const qtd = Number(item.quantidade || 0);

            if (sku && qtd > 0) {
              const [estItem] = await sql`
                SELECT quantidade_disponivel, quantidade_provisionado FROM estoque_materiais_detalhado
                WHERE sku_codigo = ${sku} AND tenant_id = ${tenantId}::uuid
              `;

              if (estItem) {
                const dispAtual = Number(estItem.quantidade_disponivel || 0);
                const provAtual = Number(estItem.quantidade_provisionado || 0);

                const novoDisp = Math.max(0, dispAtual - qtd);
                const novoProv = provAtual + qtd;

                // Atualizar o estoque
                await sql`
                  UPDATE estoque_materiais_detalhado
                  SET quantidade_disponivel = ${novoDisp},
                      quantidade_provisionado = ${novoProv},
                      updated_at = NOW()
                  WHERE sku_codigo = ${sku} AND tenant_id = ${tenantId}::uuid
                `;

                // Registrar auditoria da reserva
                await sql`
                  INSERT INTO movimento_estoque_granular 
                  (tenant_id, sku_codigo, operacao_prod_id, tipo_movimento, quantidade_movimento, status_anterior, status_novo, saldo_anterior, saldo_novo, motivo_descricao, usuario_id)
                  VALUES 
                  (${tenantId}::uuid, ${sku}, ${newOp?.id || null}::uuid, 'reserva_automatica', ${qtd}, 'disponivel', 'provisionado', ${dispAtual}, ${novoDisp}, 'Reserva automática - Assinatura do Contrato ' || ${contrato.numero_contrato}, ${user.id}::uuid)
                `;
              }
            }
          }
        }

        return res.status(200).json({
          success: true,
          message:
            'Contrato assinado eletronicamente. OP criada e estoque provisionado com sucesso.',
          status: 'assinado',
        });
      }

      return res
        .status(200)
        .json({ success: true, message: 'Status do webhook recebido e logado.' });
    }

    return res.status(405).json({ success: false, error: 'Método não permitido' });
  } catch (err: any) {
    logger.error('Erro na API de contratos:', err);
    return res
      .status(500)
      .json({ success: false, error: err.message || 'Erro interno do servidor' });
  }
};

export const handleContratoDigital = withTenant(handleContratoDigitalCore);
