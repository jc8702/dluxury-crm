import { sql, validateAuth } from './_db.js';

// Função para calcular a similaridade de strings (Sorensen-Dice Coefficient)
function stringSimilarity(s1: string, s2: string): number {
  const norm1 = s1.toLowerCase().replace(/[^a-z0-9]/g, '');
  const norm2 = s2.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (norm1 === norm2) return 1.0;
  if (norm1.length < 2 || norm2.length < 2) return 0.0;

  const bigrams1 = new Map<string, number>();
  for (let i = 0; i < norm1.length - 1; i++) {
    const bigram = norm1.substring(i, i + 2);
    bigrams1.set(bigram, (bigrams1.get(bigram) || 0) + 1);
  }

  let intersection = 0;
  for (let i = 0; i < norm2.length - 1; i++) {
    const bigram = norm2.substring(i, i + 2);
    const count = bigrams1.get(bigram) || 0;
    if (count > 0) {
      intersection++;
      bigrams1.set(bigram, count - 1);
    }
  }

  return (2.0 * intersection) / (norm1.length + norm2.length - 2);
}

// Verifica e insere alertas de estoque conforme limites mínimos/máximos
async function verificarAlertas(skuCodigo: string, tenantId: string) {
  try {
    const [item] = await sql`
      SELECT sku_codigo, quantidade_disponivel, quantidade_minima, quantidade_maxima 
      FROM estoque_materiais_detalhado 
      WHERE sku_codigo = ${skuCodigo} AND tenant_id = ${tenantId}::uuid
    `;

    if (!item) return;

    const qtdDisp = Number(item.quantidade_disponivel || 0);
    const qtdMin = Number(item.quantidade_minima || 0);
    const qtdMax = Number(item.quantidade_maxima || 0);

    // Desativar alertas anteriores para esse SKU
    await sql`
      UPDATE alertas_estoque 
      SET ativo = false, data_resolucao = NOW() 
      WHERE sku_codigo = ${skuCodigo} AND tenant_id = ${tenantId}::uuid AND ativo = true
    `;

    if (qtdDisp === 0) {
      // Alerta de em falta
      await sql`
        INSERT INTO alertas_estoque (tenant_id, sku_codigo, tipo_alerta, quantidade_atual, limite_alerta, severidade, ativo)
        VALUES (${tenantId}::uuid, ${skuCodigo}, 'em_falta', ${qtdDisp}, ${qtdMin}, 'critica', true)
      `;
    } else if (qtdDisp <= qtdMin) {
      // Alerta de mínimo atingido
      await sql`
        INSERT INTO alertas_estoque (tenant_id, sku_codigo, tipo_alerta, quantidade_atual, limite_alerta, severidade, ativo)
        VALUES (${tenantId}::uuid, ${skuCodigo}, 'minimo_atingido', ${qtdDisp}, ${qtdMin}, 'alerta', true)
      `;
    } else if (qtdDisp >= qtdMax) {
      // Alerta de máximo excedido
      await sql`
        INSERT INTO alertas_estoque (tenant_id, sku_codigo, tipo_alerta, quantidade_atual, limite_alerta, severidade, ativo)
        VALUES (${tenantId}::uuid, ${skuCodigo}, 'maximo_excedido', ${qtdDisp}, ${qtdMax}, 'aviso', true)
      `;
    }
  } catch (err) {
    console.error('Erro ao verificar alertas de estoque:', err);
  }
}

export async function handleEstoqueGranular(req: any, res: any) {
  try {
    const { authorized, error, user } = validateAuth(req);
    if (!authorized) return res.status(401).json({ success: false, error });
    const tenantId = user?.tenantId || '00000000-0000-0000-0000-000000000000';
    const method = req.method;
    const url = req.url || '';

    // ────────────────────────────────────────────────────────────────────────────────
    // GET /api/estoque/items
    // ────────────────────────────────────────────────────────────────────────────────
    if (method === 'GET' && url.includes('/items')) {
      const { filtro, busca } = req.query;

      let queryStr = `
        SELECT 
          e.sku_codigo,
          e.descricao,
          e.unidade_medida,
          e.quantidade_disponivel,
          e.quantidade_em_transito,
          e.quantidade_provisionado,
          e.quantidade_defeituoso,
          e.quantidade_vencido,
          (e.quantidade_disponivel + e.quantidade_em_transito + e.quantidade_provisionado + e.quantidade_defeituoso + e.quantidade_vencido) as quantidade_total,
          e.quantidade_minima,
          e.quantidade_maxima,
          e.preco_custo_unitario,
          e.valor_total_estoque,
          e.data_proxima_reposicao,
          CASE 
            WHEN e.quantidade_disponivel = 0 THEN 'critica'
            WHEN e.quantidade_disponivel <= e.quantidade_minima THEN 'alerta'
            ELSE 'ok'
          END as status_alerta
        FROM estoque_materiais_detalhado e
        WHERE e.tenant_id = $1::uuid
      `;
      
      const params: any[] = [tenantId];
      let paramCount = 1;

      if (busca) {
        paramCount++;
        queryStr += ` AND (e.sku_codigo ILIKE $${paramCount} OR e.descricao ILIKE $${paramCount})`;
        params.push(`%${busca}%`);
      }

      if (filtro === 'critica') {
        queryStr += ` AND e.quantidade_disponivel = 0`;
      } else if (filtro === 'alerta') {
        queryStr += ` AND e.quantidade_disponivel <= e.quantidade_minima AND e.quantidade_disponivel > 0`;
      } else if (filtro === 'minimo') {
        queryStr += ` AND e.quantidade_disponivel <= (e.quantidade_minima * 1.5)`;
      } else if (filtro === 'emfalta') {
        queryStr += ` AND e.quantidade_disponivel = 0`;
      }

      queryStr += ` ORDER BY e.quantidade_disponivel ASC, e.sku_codigo ASC`;

      const result = await sql(queryStr as any, ...params);
      return res.status(200).json({ success: true, items: result });
    }

    // ────────────────────────────────────────────────────────────────────────────────
    // GET /api/estoque/alertas
    // ────────────────────────────────────────────────────────────────────────────────
    if (method === 'GET' && url.includes('/alertas')) {
      const result = await sql`
        SELECT a.id, a.sku_codigo, a.tipo_alerta, a.quantidade_atual, a.limite_alerta, a.severidade, a.data_alerta, e.descricao 
        FROM alertas_estoque a
        LEFT JOIN estoque_materiais_detalhado e ON a.sku_codigo = e.sku_codigo AND a.tenant_id = e.tenant_id
        WHERE a.tenant_id = ${tenantId}::uuid AND a.ativo = true
        ORDER BY a.severidade DESC, a.data_alerta DESC
      `;
      return res.status(200).json({ success: true, alertas: result });
    }

    // ────────────────────────────────────────────────────────────────────────────────
    // POST /api/estoque/registrar-movimento
    // ────────────────────────────────────────────────────────────────────────────────
    if (method === 'POST' && url.includes('/registrar-movimento')) {
      const { sku_codigo, tipo_movimento, quantidade, status_alvo, operacao_prod_id, motivo } = req.body;

      if (!sku_codigo || !tipo_movimento || quantidade === undefined || !status_alvo) {
        return res.status(400).json({ success: false, error: 'Parâmetros sku_codigo, tipo_movimento, quantidade e status_alvo são obrigatórios' });
      }

      const qtdMov = Number(quantidade);
      if (isNaN(qtdMov) || qtdMov <= 0) {
        return res.status(400).json({ success: false, error: 'Quantidade de movimentação deve ser maior que zero' });
      }

      // 1. Buscar item no estoque granular
      const [item] = await sql`
        SELECT * FROM estoque_materiais_detalhado 
        WHERE sku_codigo = ${sku_codigo} AND tenant_id = ${tenantId}::uuid
      `;

      if (!item) {
        return res.status(404).json({ success: false, error: `SKU '${sku_codigo}' não encontrado no estoque detalhado` });
      }

      // Mapear status_alvo para a coluna física correspondente
      const colunaMapeada: Record<string, string> = {
        'disponivel': 'quantidade_disponivel',
        'em_transito': 'quantidade_em_transito',
        'provisionado': 'quantidade_provisionado',
        'defeituoso': 'quantidade_defeituoso',
        'vencido': 'quantidade_vencido'
      };

      const colunaFisica = colunaMapeada[status_alvo];
      if (!colunaFisica) {
        return res.status(400).json({ success: false, error: 'Status alvo inválido. Deve ser: disponivel, em_transito, provisionado, defeituoso ou vencido' });
      }

      const saldoAnterior = Number(item[colunaFisica] || 0);
      let saldoNovo = saldoAnterior;

      if (tipo_movimento === 'entrada_compra' || tipo_movimento === 'devolucao' || tipo_movimento === 'ajuste_entrada') {
        saldoNovo += qtdMov;
      } else if (tipo_movimento === 'saida_producao' || tipo_movimento === 'descarte' || tipo_movimento === 'rejeicao_qc' || tipo_movimento === 'ajuste_saida') {
        saldoNovo -= qtdMov;
      } else {
        return res.status(400).json({ success: false, error: 'Tipo de movimento inválido' });
      }

      if (saldoNovo < 0) {
        return res.status(400).json({ success: false, error: `Estoque insuficiente para a coluna ${status_alvo} (Saldo atual: ${saldoAnterior}, Tentativa de saída: ${qtdMov})` });
      }

      // 2. Registrar na tabela movimento_estoque_granular
      await sql`
        INSERT INTO movimento_estoque_granular 
        (tenant_id, sku_codigo, operacao_prod_id, tipo_movimento, quantidade_movimento, status_anterior, status_novo, saldo_anterior, saldo_novo, motivo_descricao, usuario_id)
        VALUES 
        (${tenantId}::uuid, ${sku_codigo}, ${operacao_prod_id || null}::uuid, ${tipo_movimento}, ${qtdMov}, ${status_alvo}, ${status_alvo}, ${saldoAnterior}, ${saldoNovo}, ${motivo || null}, ${user.id}::uuid)
      `;

      // 3. Atualizar estoque na tabela
      const custoUnitario = Number(item.preco_custo_unitario || 0);
      
      let updateQuery = `
        UPDATE estoque_materiais_detalhado 
        SET ${colunaFisica} = $1,
            updated_at = NOW()
        WHERE sku_codigo = $2 AND tenant_id = $3::uuid
      `;
      await sql(updateQuery as any, saldoNovo, sku_codigo, tenantId);

      // Recalcular valor total do estoque do item
      const [updatedItem] = await sql`
        SELECT (quantidade_disponivel + quantidade_em_transito + quantidade_provisionado + quantidade_defeituoso + quantidade_vencido) as total 
        FROM estoque_materiais_detalhado 
        WHERE sku_codigo = ${sku_codigo} AND tenant_id = ${tenantId}::uuid
      `;
      const novoTotal = Number(updatedItem?.total || 0);
      const novoValorTotal = novoTotal * custoUnitario;

      await sql`
        UPDATE estoque_materiais_detalhado 
        SET valor_total_estoque = ${novoValorTotal}
        WHERE sku_codigo = ${sku_codigo} AND tenant_id = ${tenantId}::uuid
      `;

      // 4. Verificar alertas (mínimo atingido, falta)
      await verificarAlertas(sku_codigo, tenantId);

      return res.status(200).json({ success: true, saldo_novo: saldoNovo, quantidade_total: novoTotal, valor_total_estoque: novoValorTotal });
    }

    // ────────────────────────────────────────────────────────────────────────────────
    // POST /api/estoque/finalizar-op
    // ────────────────────────────────────────────────────────────────────────────────
    if (method === 'POST' && url.includes('/finalizar-op')) {
      const { operacao_prod_id } = req.body;

      if (!operacao_prod_id) {
        return res.status(400).json({ success: false, error: 'Parâmetro operacao_prod_id é obrigatório' });
      }

      // 1. Buscar a OP e os materiais do orçamento associado
      const [op] = await sql`
        SELECT * FROM ordens_prod WHERE id = ${operacao_prod_id}::uuid AND tenant_id = ${tenantId}::uuid
      `;

      if (!op) {
        return res.status(404).json({ success: false, error: 'Ordem de Produção não encontrada' });
      }

      // 2. Buscar itens consumidos do orçamento
      const [orc] = await sql`
        SELECT materiais_consumidos FROM orcamentos WHERE id = ${op.quotation_id}::uuid AND tenant_id = ${tenantId}::uuid
      `;

      const materiais = orc?.materiais_consumidos || [];
      if (!Array.isArray(materiais) || materiais.length === 0) {
        return res.status(200).json({ success: true, message: 'Nenhum material provisionado encontrado para consumo' });
      }

      // 3. Para cada material consumido, deduzir do provisionado e dar saída de produção
      const resultados = [];
      for (const mat of materiais) {
        const sku = mat.sku || mat.sku_codigo;
        const qtd = Number(mat.quantidade || 0);
        if (!sku || qtd <= 0) continue;

        // Verificar se SKU existe no estoque detalhado
        const [estItem] = await sql`
          SELECT quantidade_provisionado, quantidade_disponivel FROM estoque_materiais_detalhado
          WHERE sku_codigo = ${sku} AND tenant_id = ${tenantId}::uuid
        `;

        if (!estItem) continue;

        const provisionadoAtual = Number(estItem.quantidade_provisionado || 0);
        const novoProvisionado = Math.max(0, provisionadoAtual - qtd);

        // Mover de provisionado para consumido físico (redução de provisionado, e opcionalmente redução do total)
        await sql`
          UPDATE estoque_materiais_detalhado
          SET quantidade_provisionado = ${novoProvisionado},
              updated_at = NOW()
          WHERE sku_codigo = ${sku} AND tenant_id = ${tenantId}::uuid
        `;

        // Registrar auditoria da movimentação
        await sql`
          INSERT INTO movimento_estoque_granular 
          (tenant_id, sku_codigo, operacao_prod_id, tipo_movimento, quantidade_movimento, status_anterior, status_novo, saldo_anterior, saldo_novo, motivo_descricao, usuario_id)
          VALUES 
          (${tenantId}::uuid, ${sku}, ${operacao_prod_id}::uuid, 'saida_producao', ${qtd}, 'provisionado', 'consumido', ${provisionadoAtual}, ${novoProvisionado}, 'Consumo de material na conclusão da OP', ${user.id}::uuid)
        `;

        resultados.push({ sku, quantidade_consumida: qtd, novo_provisionado: novoProvisionado });
      }

      return res.status(200).json({ success: true, message: 'Reservas de estoque consumidas com sucesso', resultados });
    }

    // ────────────────────────────────────────────────────────────────────────────────
    // POST /api/orcamentos/sku-matching
    // ────────────────────────────────────────────────────────────────────────────────
    if (method === 'POST' && url.includes('/sku-matching')) {
      const { quotation_id, itens_csv } = req.body;

      if (!itens_csv || !Array.isArray(itens_csv)) {
        return res.status(400).json({ success: false, error: 'Parâmetro itens_csv deve ser uma lista válida' });
      }

      // Buscar todo o estoque detalhado do tenant para matching fuzzy
      const estoqueItems = await sql`
        SELECT sku_codigo, descricao, quantidade_disponivel, preco_custo_unitario 
        FROM estoque_materiais_detalhado 
        WHERE tenant_id = ${tenantId}::uuid
      `;

      // Buscar mapeamentos salvos anteriormente para esse tenant
      const mapeamentosExistentes = await sql`
        SELECT sku_promob, sku_interno 
        FROM mapeamento_sku 
        WHERE tenant_id = ${tenantId}::uuid
      `;
      const mapCache = new Map<string, string>();
      for (const mapItem of mapeamentosExistentes) {
        mapCache.set(mapItem.sku_promob, mapItem.sku_interno);
      }

      const resultados = [];

      for (const item of itens_csv) {
        const skuProcurado = item.sku_promob || '';
        const descricaoProcurada = item.descricao || '';
        const quantidade = Number(item.quantidade || 0);

        let matchEncontrado: any = null;
        let tipoMatch: 'exato' | 'fuzzy' | 'descricao' | null = null;
        let confianca = 0;
        let sugestoes: any[] = [];

        // 1. MATCH EXATO VIA CACHE OU SKU DIRETO
        if (mapCache.has(skuProcurado)) {
          const skuInterno = mapCache.get(skuProcurado);
          const estItem = estoqueItems.find((e: any) => e.sku_codigo === skuInterno);
          if (estItem) {
            matchEncontrado = estItem;
            tipoMatch = 'exato';
            confianca = 100;
          }
        }

        if (!matchEncontrado) {
          const estItem = estoqueItems.find((e: any) => e.sku_codigo.toLowerCase() === skuProcurado.toLowerCase());
          if (estItem) {
            matchEncontrado = estItem;
            tipoMatch = 'exato';
            confianca = 100;
          }
        }

        // 2. MATCH FUZZY (SIMILARIDADE DE STRINGS)
        if (!matchEncontrado) {
          let melhorScore = 0;
          let melhorItem: any = null;

          for (const estItem of estoqueItems) {
            // Testar similaridade por SKU
            const similaritySku = stringSimilarity(skuProcurado, estItem.sku_codigo);
            // Testar similaridade por Descrição
            const similarityDesc = stringSimilarity(descricaoProcurada, estItem.descricao);
            
            const maxScore = Math.max(similaritySku, similarityDesc);
            if (maxScore > melhorScore) {
              melhorScore = maxScore;
              melhorItem = estItem;
            }
          }

          if (melhorScore >= 0.75) {
            matchEncontrado = melhorItem;
            tipoMatch = 'fuzzy';
            confianca = Math.round(melhorScore * 100);
          }
        }

        // 3. BUSCA POR CATEGORIA/DESCRITIVA (SUGESTÕES)
        if (!matchEncontrado) {
          const primeiraPalavra = descricaoProcurada.split(' ')[0] || skuProcurado.split('-')[0] || '';
          if (primeiraPalavra.length > 2) {
            const matchesCategoria = estoqueItems.filter((e: any) => 
              e.descricao.toLowerCase().includes(primeiraPalavra.toLowerCase()) ||
              e.sku_codigo.toLowerCase().includes(primeiraPalavra.toLowerCase())
            );

            sugestoes = matchesCategoria.slice(0, 3).map((e: any) => ({
              sku_interno: e.sku_codigo,
              nome: e.descricao,
              confianca: 50,
              tipo_match: 'descricao',
              quantidade_disponivel: Number(e.quantidade_disponivel || 0),
              preco_custo: Number(e.preco_custo_unitario || 0)
            }));
          }
        }

        // Montar a resposta desse item
        const listSugestoes = matchEncontrado ? [{
          sku_interno: matchEncontrado.sku_codigo,
          nome: matchEncontrado.descricao,
          confianca,
          tipo_match: tipoMatch,
          quantidade_disponivel: Number(matchEncontrado.quantidade_disponivel || 0),
          preco_custo: Number(matchEncontrado.preco_custo_unitario || 0)
        }, ...sugestoes] : sugestoes;

        const melhorMatch = listSugestoes[0] || null;

        // Se o quotation_id for informado, salvar auditoria do matching
        if (quotation_id) {
          await sql`
            INSERT INTO historico_sku_matching (tenant_id, quotation_id, sku_procurado, skus_sugeridos, sku_selecionado, usuario_id)
            VALUES (${tenantId}::uuid, ${quotation_id}::uuid, ${skuProcurado}, ${JSON.stringify(listSugestoes)}, ${melhorMatch?.sku_interno || null}, ${user.id}::uuid)
          `;
        }

        resultados.push({
          sku_procurado: skuProcurado,
          descricao_original: descricaoProcurada,
          quantidade,
          skus_encontrados: listSugestoes,
          sku_selecionado: melhorMatch?.sku_interno || '',
          requer_validacao_manual: !matchEncontrado || confianca < 100
        });
      }

      // Se for orçamento ativo, salvar também no mapeamento persistente se for exato/fuzzy aceito
      return res.status(200).json({
        success: true,
        total_itens: itens_csv.length,
        itens_com_match_exato: resultados.filter(r => !r.requer_validacao_manual).length,
        itens_requer_validacao: resultados.filter(r => r.requer_validacao_manual).length,
        resultados
      });
    }

    return res.status(405).json({ success: false, error: 'Método não permitido' });
  } catch (err: any) {
    console.error('Erro na API de estoque granular:', err);
    return res.status(500).json({ success: false, error: err.message || 'Erro interno do servidor' });
  }
}
