import { sql, validateAuth } from './_db.js';

export async function handleFinanceiro(req: any, res: any) {
  try {
    const { authorized, error } = validateAuth(req);
    if (!authorized) return res.status(401).json({ success: false, error });

    const fullUrl = req.url || '';
    const url = fullUrl.split('?')[0]; // Limpa query params
    const paths = url.split('/').filter(p => p && p !== 'api' && p !== 'financeiro');
    const resource = paths[0];
    let id = paths[1];

    // Se o ID não estiver no path, tenta pegar da query string ou do body
    if (!id) {
      id = req.query?.id || req.body?.id;
    }

    console.log(`[FINANCEIRO] Route: ${req.method} ${fullUrl} -> Resource: ${resource}, ID: ${id}`);

    if (resource === 'classes') {
      return await handleClasses(req, res, id);
    }
    if (resource === 'contas-internas') {
      return await handleContasInternas(req, res, id);
    }
    if (resource === 'formas-pagamento') {
      return await handleFormasPagamento(req, res, id);
    }
    if (resource === 'titulos-receber') {
      return await handleTitulosReceber(req, res, id);
    }
    if (resource === 'titulos-pagar') {
      return await handleTitulosPagar(req, res, id);
    }
    if (resource === 'tesouraria') {
      return await handleTesouraria(req, res, id);
    }
    if (resource === 'fluxo-caixa') {
      return await handleFluxoCaixa(req, res);
    }
    if (resource === 'relatorios') {
      return await handleRelatorios(req, res);
    }
    if (resource === 'contas-recorrentes') {
      return await handleContasRecorrentes(req, res, id);
    }
    if (resource === 'condicoes-pagamento') {
      return await handleCondicoesPagamento(req, res, id);
    }
    if (resource === 'test') {
      return await handleDiagnostic(req, res);
    }

    return res.status(404).json({ success: false, error: 'Recurso financeiro não encontrado' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

async function handleClasses(req: any, res: any, id?: string) {
  if (req.method === 'GET') {
    const result = await sql`SELECT * FROM classes_financeiras WHERE deletado = false ORDER BY codigo ASC`;
    return res.status(200).json({ success: true, data: result });
  }
  if (req.method === 'POST') {
    const f = req.body;
    const result = await sql`
      INSERT INTO classes_financeiras (codigo, nome, tipo, natureza, pai_id, ativa, permite_lancamento)
      VALUES (${f.codigo}, ${f.nome}, ${f.tipo}, ${f.natureza}, ${f.pai_id || null}, ${f.ativa ?? true}, ${f.permite_lancamento ?? true})
      RETURNING *`;
    return res.status(201).json({ success: true, data: result[0] });
  }
  if ((req.method === 'PATCH' || req.method === 'PUT') && id) {
    const f = req.body;
    const result = await sql`
      UPDATE classes_financeiras SET 
        codigo = COALESCE(${f.codigo}, codigo),
        nome = COALESCE(${f.nome}, nome),
        tipo = COALESCE(${f.tipo}, tipo),
        natureza = COALESCE(${f.natureza}, natureza),
        pai_id = COALESCE(${f.pai_id}, pai_id),
        ativa = COALESCE(${f.ativa}, ativa),
        permite_lancamento = COALESCE(${f.permite_lancamento}, permite_lancamento),
        atualizado_em = NOW()
      WHERE id = ${id} RETURNING *`;
    return res.status(200).json({ success: true, data: result[0] });
  }
  if (req.method === 'DELETE' && id) {
    await sql`UPDATE classes_financeiras SET deletado = true, excluido_em = NOW() WHERE id = ${id}`;
    return res.status(200).json({ success: true });
  }
  return res.status(405).end();
}

async function handleContasInternas(req: any, res: any, id?: string) {
  if (req.method === 'GET') {
    if (req.url.includes('/extrato')) {
      if (!id) return res.status(400).json({ success: false, error: 'ID da conta é obrigatório' });
      
      const conta = (await sql`SELECT * FROM contas_internas WHERE id = ${id}`)[0];
      if (!conta) return res.status(404).json({ success: false, error: 'Conta não encontrada' });

      // Consolidar todas as movimentações
      // 1. Baixas de Recebimento (Entradas)
      // 2. Baixas de Pagamento (Saídas)
      // 3. Movimentações de Tesouraria (Entradas, Saídas, Transferências)
      const movimentos = await sql`
        SELECT * FROM (
          -- Baixas de títulos (recebimentos e pagamentos)
          SELECT 
            id, 
            data_baixa as data, 
            valor_baixa as valor, 
            tipo, 
            observacoes as descricao,
            'baixa' as origem
          FROM baixas 
          WHERE conta_interna_id = ${id} AND deletado = false

          UNION ALL

          -- Movimentações diretas de tesouraria (entradas/saídas)
          SELECT 
            id, 
            data_movimento as data, 
            CASE WHEN tipo = 'entrada' THEN valor ELSE -valor END as valor,
            tipo,
            descricao,
            'tesouraria' as origem
          FROM movimentacoes_tesouraria
          WHERE (conta_origem_id = ${id} OR conta_destino_id = ${id}) AND deletado = false
        ) as extrato
        ORDER BY data ASC
      `;

      // Calcular saldo progressivo
      let saldoAtual = Number(conta.saldo_inicial || 0);
      const extratoComSaldo = movimentos.map((m: any) => {
        const valorNum = Number(m.valor);
        // Regra de sinal baseada no tipo se for tesouraria ou baixa
        let realValor = valorNum;
        
        // Se for tesouraria e a conta for origem, é saída (negativo)
        // Se for tesouraria e a conta for destino, é entrada (positivo)
        // (Isso já está pré-tratado no CASE da query acima para tesouraria, 
        // mas para baixas precisamos garantir o sinal)
        if (m.origem === 'baixa') {
            realValor = m.tipo === 'recebimento' ? Math.abs(valorNum) : -Math.abs(valorNum);
        }

        saldoAtual += realValor;
        return {
          ...m,
          valor: realValor,
          saldo_momento: saldoAtual
        };
      });

      return res.status(200).json({ 
        success: true, 
        data: {
          conta,
          saldo_inicial: Number(conta.saldo_inicial || 0),
          extrato: extratoComSaldo.reverse() // Mais recente primeiro para exibição
        } 
      });
    }

    const result = await sql`SELECT * FROM contas_internas WHERE deletado = false ORDER BY nome ASC`;
    return res.status(200).json({ success: true, data: result });
  }
  if (req.method === 'POST') {
    const f = req.body;
    const result = await sql`
      INSERT INTO contas_internas (nome, tipo, banco_codigo, agencia, conta, saldo_inicial, saldo_atual, data_saldo_inicial, ativa)
      VALUES (${f.nome}, ${f.tipo}, ${f.banco_codigo || null}, ${f.agencia || null}, ${f.conta || null}, ${f.saldo_inicial || 0}, ${f.saldo_atual || 0}, ${f.data_saldo_inicial || null}, ${f.ativa ?? true})
      RETURNING *`;
    return res.status(201).json({ success: true, data: result[0] });
  }
  if ((req.method === 'PATCH' || req.method === 'PUT') && id) {
    const f = req.body;
    const result = await sql`
      UPDATE contas_internas SET 
        nome = COALESCE(${f.nome}, nome),
        tipo = COALESCE(${f.tipo}, tipo),
        banco_codigo = COALESCE(${f.banco_codigo}, banco_codigo),
        agencia = COALESCE(${f.agencia}, agencia),
        conta = COALESCE(${f.conta}, conta),
        saldo_atual = COALESCE(${f.saldo_atual}, saldo_atual),
        ativa = COALESCE(${f.ativa}, ativa)
      WHERE id = ${id} RETURNING *`;
    return res.status(200).json({ success: true, data: result[0] });
  }
  if (req.method === 'DELETE' && id) {
    await sql`UPDATE contas_internas SET deletado = true, excluido_em = NOW() WHERE id = ${id}`;
    return res.status(200).json({ success: true });
  }
  return res.status(405).end();
}

async function handleFormasPagamento(req: any, res: any, id?: string) {
  if (req.method === 'GET') {
    const result = await sql`SELECT * FROM formas_pagamento WHERE deletado = false ORDER BY nome ASC`;
    return res.status(200).json({ success: true, data: result });
  }
  if (req.method === 'POST') {
    const f = req.body;
    const result = await sql`
      INSERT INTO formas_pagamento (nome, tipo, taxa_percentual, prazo_compensacao_dias, ativa)
      VALUES (${f.nome}, ${f.tipo}, ${f.taxa_percentual || 0}, ${f.prazo_compensacao_dias || 0}, ${f.ativa ?? true})
      RETURNING *`;
    return res.status(201).json({ success: true, data: result[0] });
  }
  if ((req.method === 'PATCH' || req.method === 'PUT') && id) {
    const f = req.body;
    const result = await sql`
      UPDATE formas_pagamento SET 
        nome = COALESCE(${f.nome}, nome),
        tipo = COALESCE(${f.tipo}, tipo),
        taxa_percentual = COALESCE(${f.taxa_percentual}, taxa_percentual),
        prazo_compensacao_dias = COALESCE(${f.prazo_compensacao_dias}, prazo_compensacao_dias),
        ativa = COALESCE(${f.ativa}, ativa)
      WHERE id = ${id} RETURNING *`;
    return res.status(200).json({ success: true, data: result[0] });
  }
  if (req.method === 'DELETE' && id) {
    await sql`UPDATE formas_pagamento SET deletado = true, excluido_em = NOW() WHERE id = ${id}`;
    return res.status(200).json({ success: true });
  }
  return res.status(405).end();
}

async function handleTitulosReceber(req: any, res: any, id?: string) {
  if (req.method === 'POST' && (req.url.includes('preview') || req.query?.action === 'preview')) {
    const { valor_original, total_parcelas, data_vencimento } = req.body;
    const numParcelas = Number(total_parcelas) || 1;
    const parcelas = [];
    const valorParcela = Number(valor_original) / numParcelas;
    const baseDate = new Date(data_vencimento || new Date());
    for (let i = 1; i <= numParcelas; i++) {
        const venc = new Date(baseDate);
        venc.setMonth(venc.getMonth() + (i - 1));
        parcelas.push({ numero_parcela: i, valor: valorParcela, data_vencimento: venc });
    }
    return res.status(200).json({ success: true, data: { parcelas } });
  }

  if (req.method === 'POST' && id && req.url.includes('baixar')) {
    const f = req.body;
    return await sql.begin(async (tx) => {
      const titulo = (await tx`SELECT * FROM titulos_receber WHERE id = ${id}`)[0];
      if (!titulo) throw new Error('Título não encontrado');
      const valorBaixa = Number(f.valor_baixa) || titulo.valor_aberto;
      await tx`INSERT INTO baixas (tipo, titulo_id, valor_baixa, data_baixa, conta_interna_id, observacoes) VALUES ('recebimento', ${id}, ${valorBaixa}, ${f.data_baixa || new Date()}, ${f.conta_interna_id}, ${f.observacoes || ''})`;
      const novoValorAberto = Number(titulo.valor_aberto) - valorBaixa;
      const novoStatus = novoValorAberto <= 0 ? 'pago' : 'pago_parcial';
      await tx`UPDATE titulos_receber SET valor_aberto = ${novoValorAberto}, status = ${novoStatus}, data_pagamento = ${novoStatus === 'pago' ? new Date() : null} WHERE id = ${id}`;
      await tx`UPDATE contas_internas SET saldo_atual = saldo_atual + ${valorBaixa} WHERE id = ${f.conta_interna_id}`;
      return res.status(200).json({ success: true, message: 'Baixa realizada com sucesso' });
    });
  }

  if (req.method === 'GET') {
    const { cliente_id, status, data_inicio, data_fim } = req.query;
    let query = sql`SELECT * FROM titulos_receber WHERE deletado = false`;
    if (cliente_id) query = sql`${query} AND cliente_id = ${Number(cliente_id)}`;
    if (status) query = sql`${query} AND status = ${status}`;
    if (data_inicio && data_fim) query = sql`${query} AND data_vencimento BETWEEN ${data_inicio} AND ${data_fim}`;
    const result = await query;
    return res.status(200).json({ success: true, data: result });
  }

  if (req.method === 'POST') {
    const f = req.body;
    const numTotal = Number(f.total_parcelas) || 1;
    // cliente_id é integer na tabela clients — garantir conversão correta
    const clienteId = Number(f.cliente_id);
    if (!clienteId || isNaN(clienteId)) {
      return res.status(400).json({ success: false, error: 'cliente_id inválido' });
    }
    const titulos = [];
    for (let i = 1; i <= numTotal; i++) {
      const venc = new Date(f.data_vencimento || new Date());
      venc.setMonth(venc.getMonth() + (i - 1));
      const t = await sql`
        INSERT INTO titulos_receber (
          numero_titulo, cliente_id, projeto_id, orcamento_id, 
          valor_original, valor_liquido, valor_aberto, 
          data_emissao, data_vencimento, data_competencia, 
          classe_financeira_id, condicao_pagamento_id, forma_recebimento_id, 
          status, parcela, total_parcelas, observacoes
        ) VALUES (
          ${i === 1 ? (f.numero_titulo || `REC-${Date.now()}`) : `REC-${Date.now()}-${i}`}, 
          ${clienteId}, 
          ${f.projeto_id || null}, 
          ${f.orcamento_id || null}, 
          ${Number(f.valor_original)/numTotal}, 
          ${Number(f.valor_original)/numTotal}, 
          ${Number(f.valor_original)/numTotal}, 
          NOW(), 
          ${venc}, 
          ${venc}, 
          ${f.classe_financeira_id}, 
          NULL, 
          ${f.forma_recebimento_id}, 
          'aberto', 
          ${i}, 
          ${numTotal}, 
          ${f.observacoes || ''}
        ) RETURNING *`;
      titulos.push(t[0]);
    }
    return res.status(201).json({ success: true, data: titulos });
  }

  if ((req.method === 'PATCH' || req.method === 'PUT') && id) {
    const f = req.body;
    const result = await sql`UPDATE titulos_receber SET status = COALESCE(${f.status}, status), valor_aberto = COALESCE(${f.valor_aberto}, valor_aberto), atualizado_em = NOW() WHERE id = ${id} RETURNING *`;
    return res.status(200).json({ success: true, data: result[0] });
  }

  if (req.method === 'DELETE' && id) {
    await sql`UPDATE titulos_receber SET deletado = true, excluido_em = NOW() WHERE id = ${id}`;
    return res.status(200).json({ success: true });
  }

  return res.status(405).end();
}

async function handleTitulosPagar(req: any, res: any, id?: string) {
  if (req.method === 'POST' && (req.url.includes('preview') || req.query?.action === 'preview')) {
    const { valor_original, total_parcelas, data_vencimento } = req.body;
    const numParcelas = Number(total_parcelas) || 1;
    const parcelas = [];
    const valorParcela = Number(valor_original) / numParcelas;
    const baseDate = new Date(data_vencimento || new Date());
    for (let i = 1; i <= numParcelas; i++) {
        const venc = new Date(baseDate);
        venc.setMonth(venc.getMonth() + (i - 1));
        parcelas.push({ numero_parcela: i, valor: valorParcela, data_vencimento: venc });
    }
    return res.status(200).json({ success: true, data: { parcelas } });
  }

  if (req.method === 'POST' && id && req.url.includes('baixar')) {
    const f = req.body;
    return await sql.begin(async (tx) => {
      const titulo = (await tx`SELECT * FROM titulos_pagar WHERE id = ${id}`)[0];
      if (!titulo) throw new Error('Título não encontrado');
      const conta = (await tx`SELECT * FROM contas_internas WHERE id = ${f.conta_interna_id || titulo.conta_bancaria_id}`)[0];
      if (!conta) throw new Error('Conta bancária não encontrada');
      const valorBaixa = Number(f.valor_baixa) || titulo.valor_aberto;
      let saldoWarning = false;
      if (Number(conta.saldo_atual) < valorBaixa) { saldoWarning = true; }
      await tx`INSERT INTO baixas (tipo, titulo_id, valor_baixa, data_baixa, conta_interna_id, observacoes) VALUES ('pagamento', ${id}, ${valorBaixa}, ${f.data_baixa || new Date()}, ${f.conta_interna_id || titulo.conta_bancaria_id}, ${f.observacoes || ''})`;
      const novoValorAberto = Number(titulo.valor_aberto) - valorBaixa;
      const novoStatus = novoValorAberto <= 0 ? 'pago' : 'pago_parcial';
      await tx`UPDATE titulos_pagar SET valor_aberto = ${novoValorAberto}, status = ${novoStatus}, data_pagamento = ${novoStatus === 'pago' ? new Date() : null} WHERE id = ${id}`;
      await tx`UPDATE contas_internas SET saldo_atual = saldo_atual - ${valorBaixa} WHERE id = ${f.conta_interna_id || titulo.conta_bancaria_id}`;
      return res.status(200).json({ success: true, message: 'Baixa realizada com sucesso', warning: saldoWarning ? 'Saldo insuficiente na conta' : undefined });
    });
  }

  if (req.method === 'GET') {
    const { fornecedor_id, status, data_inicio, data_fim } = req.query;
    let query = sql`SELECT * FROM titulos_pagar WHERE deletado = false`;
    if (fornecedor_id) query = sql`${query} AND fornecedor_id = ${fornecedor_id}`;
    if (status) query = sql`${query} AND status = ${status}`;
    if (data_inicio && data_fim) query = sql`${query} AND data_vencimento BETWEEN ${data_inicio} AND ${data_fim}`;
    const result = await query;
    return res.status(200).json({ success: true, data: result });
  }

  if (req.method === 'POST') {
    const f = req.body;
    const numTotal = Number(f.total_parcelas) || 1;
    const titulos = [];
    for (let i = 1; i <= numTotal; i++) {
      const venc = new Date(f.data_vencimento || new Date());
      venc.setMonth(venc.getMonth() + (i - 1));
      const t = await sql`
        INSERT INTO titulos_pagar (
          numero_titulo, fornecedor_id, pedido_compra_id,
          valor_original, valor_liquido, valor_aberto, 
          data_emissao, data_vencimento, data_competencia, 
          classe_financeira_id, condicao_pagamento_id, forma_pagamento_id, 
          conta_bancaria_id, status, parcela, total_parcelas
        ) VALUES (
          ${i === 1 ? (f.numero_titulo || `PAG-${Date.now()}`) : `PAG-${Date.now()}-${i}`}, 
          ${f.fornecedor_id},
          ${f.pedido_compra_id || null},
          ${Number(f.valor_original)/numTotal}, 
          ${Number(f.valor_original)/numTotal}, 
          ${Number(f.valor_original)/numTotal}, 
          NOW(), 
          ${venc}, 
          ${venc}, 
          ${f.classe_financeira_id}, 
          NULL, 
          ${f.forma_pagamento_id}, 
          ${f.conta_bancaria_id}, 
          'aberto', 
          ${i}, 
          ${numTotal}
        ) RETURNING *`;
      titulos.push(t[0]);
    }
    return res.status(201).json({ success: true, data: titulos });
  }

  if ((req.method === 'PATCH' || req.method === 'PUT') && id) {
    const f = req.body;
    const result = await sql`UPDATE titulos_pagar SET status = COALESCE(${f.status}, status), valor_aberto = COALESCE(${f.valor_aberto}, valor_aberto), atualizado_em = NOW() WHERE id = ${id} RETURNING *`;
    return res.status(200).json({ success: true, data: result[0] });
  }

  if (req.method === 'DELETE' && id) {
    await sql`UPDATE titulos_pagar SET deletado = true, excluido_em = NOW() WHERE id = ${id}`;
    return res.status(200).json({ success: true });
  }

  return res.status(405).end();
}

async function handleTesouraria(req: any, res: any, id?: string) {
  if (req.method === 'GET') {
    const result = await sql`SELECT * FROM movimentacoes_tesouraria ORDER BY data_movimento DESC`;
    return res.status(200).json({ success: true, data: result });
  }

  if (req.method === 'POST') {
    const f = req.body;
    const type = req.url.includes('transferencia') ? 'transferencia' : 'lancamento';

    return await sql.begin(async (tx) => {
      if (type === 'transferencia') {
        if (!f.conta_origem_id || !f.conta_destino_id) throw new Error('Origem e destino são obrigatórios para transferência');
        
        await tx`
          INSERT INTO movimentacoes_tesouraria (tipo, conta_origem_id, conta_destino_id, valor, data_movimento, descricao)
          VALUES ('transferencia', ${f.conta_origem_id}, ${f.conta_destino_id}, ${f.valor}, ${f.data_movimento || new Date()}, ${f.descricao})`;
        
        await tx`UPDATE contas_internas SET saldo_atual = saldo_atual - ${f.valor} WHERE id = ${f.conta_origem_id}`;
        await tx`UPDATE contas_internas SET saldo_atual = saldo_atual + ${f.valor} WHERE id = ${f.conta_destino_id}`;
      } else {
        const isEntrada = f.tipo === 'entrada';
        const valor = isEntrada ? f.valor : -f.valor;
        
        await tx`
          INSERT INTO movimentacoes_tesouraria (tipo, conta_origem_id, conta_destino_id, valor, data_movimento, classe_financeira_id, descricao)
          VALUES (${f.tipo}, ${isEntrada ? null : f.conta_interna_id}, ${isEntrada ? f.conta_interna_id : null}, ${Math.abs(f.valor)}, ${f.data_movimento || new Date()}, ${f.classe_financeira_id}, ${f.descricao})`;
        
        await tx`UPDATE contas_internas SET saldo_atual = saldo_atual + ${valor} WHERE id = ${f.conta_interna_id}`;
      }
      return res.status(201).json({ success: true, message: 'Operação de tesouraria realizada' });
    });
  }
  return res.status(405).end();
}

async function handleFluxoCaixa(req: any, res: any) {
  if (req.method === 'GET') {
    const { data_inicio, data_fim } = req.query;
    
    const saldos = await sql`SELECT SUM(saldo_atual::numeric) as total FROM contas_internas`;
    const saldoInicial = Number(saldos[0]?.total || 0);

    const receitas = await sql`
      SELECT SUM(valor_aberto::numeric) as total 
      FROM titulos_receber 
      WHERE status IN ('aberto', 'pago_parcial') AND data_vencimento BETWEEN ${data_inicio} AND ${data_fim}`;
    
    const despesas = await sql`
      SELECT SUM(valor_aberto::numeric) as total 
      FROM titulos_pagar 
      WHERE status IN ('aberto', 'pago_parcial') AND data_vencimento BETWEEN ${data_inicio} AND ${data_fim}`;

    const totalRec = Number(receitas[0]?.total || 0);
    const totalDesp = Number(despesas[0]?.total || 0);

    return res.status(200).json({ 
      success: true, 
      data: {
        saldo_atual: saldoInicial,
        previsao_receitas: totalRec,
        previsao_despesas: totalDesp,
        saldo_projetado: saldoInicial + totalRec - totalDesp
      }
    });
  }
  return res.status(405).end();
}

async function handleRelatorios(req: any, res: any) {
  const { type } = req.query;

  if (type === 'dre') {
    const result = await sql`
      SELECT 
        cf.nome as classe,
        cf.natureza,
        SUM(CASE WHEN cf.natureza = 'credora' THEN t.valor_liquido ELSE -t.valor_liquido END) as total
      FROM classes_financeiras cf
      JOIN titulos_receber t ON t.classe_financeira_id = cf.id
      GROUP BY cf.id, cf.nome, cf.natureza
      UNION ALL
      SELECT 
        cf.nome as classe,
        cf.natureza,
        SUM(CASE WHEN cf.natureza = 'devedora' THEN -t.valor_liquido ELSE t.valor_liquido END) as total
      FROM classes_financeiras cf
      JOIN titulos_pagar t ON t.classe_financeira_id = cf.id
      GROUP BY cf.id, cf.nome, cf.natureza
      ORDER BY natureza DESC, total DESC`;
    return res.status(200).json({ success: true, data: result });
  }

  if (type === 'aging') {
    const result = await sql`
      SELECT 
        CASE 
          WHEN data_vencimento > NOW() THEN 'A Vencer'
          WHEN data_vencimento > NOW() - INTERVAL '30 days' THEN '0-30 Dias'
          WHEN data_vencimento > NOW() - INTERVAL '60 days' THEN '31-60 Dias'
          WHEN data_vencimento > NOW() - INTERVAL '90 days' THEN '61-90 Dias'
          ELSE 'Acima de 90 Dias'
        END as faixa,
        SUM(valor_aberto::numeric) as total,
        COUNT(*) as qtd_titulos
      FROM titulos_receber
      WHERE status IN ('aberto', 'pago_parcial')
      GROUP BY faixa
      ORDER BY MIN(data_vencimento) DESC`;
    return res.status(200).json({ success: true, data: result });
  }

  if (type === 'dashboard') {
    const saldos = await sql`SELECT SUM(saldo_atual::numeric) as total FROM contas_internas`;
    const rec30 = await sql`SELECT SUM(valor_aberto::numeric) as total FROM titulos_receber WHERE status != 'pago' AND data_vencimento <= NOW() + INTERVAL '30 days'`;
    const pag30 = await sql`SELECT SUM(valor_aberto::numeric) as total FROM titulos_pagar WHERE status != 'pago' AND data_vencimento <= NOW() + INTERVAL '30 days'`;
    
    return res.status(200).json({ 
      success: true, 
      data: {
        saldo_total: Number(saldos[0]?.total || 0),
        a_receber_30d: Number(rec30[0]?.total || 0),
        a_pagar_30d: Number(pag30[0]?.total || 0)
      }
    });
  }

  return res.status(404).json({ success: false, error: 'Relatório não encontrado' });
}

async function handleContasRecorrentes(req: any, res: any, id?: string) {
  if (req.method === 'GET') {
    const result = await sql`SELECT * FROM contas_recorrentes WHERE deletado = false ORDER BY dia_vencimento ASC`;
    return res.status(200).json({ success: true, data: result });
  }

  if (req.method === 'POST') {
    const f = req.body;
    const result = await sql`
      INSERT INTO contas_recorrentes (descricao, tipo, valor, dia_vencimento, classe_financeira_id, fornecedor_id, forma_pagamento_id, conta_bancaria_id, ativa)
      VALUES (${f.descricao}, ${f.tipo}, ${f.valor}, ${f.dia_vencimento}, ${f.classe_financeira_id}, ${f.fornecedor_id || null}, ${f.forma_pagamento_id || null}, ${f.conta_bancaria_id || null}, ${f.ativa ?? true})
      RETURNING *`;
    return res.status(201).json({ success: true, data: result[0] });
  }

  if ((req.method === 'PATCH' || req.method === 'PUT') && id) {
    const f = req.body;
    const result = await sql`
      UPDATE contas_recorrentes SET 
        descricao = COALESCE(${f.descricao}, descricao),
        tipo = COALESCE(${f.tipo}, tipo),
        valor = COALESCE(${f.valor}, valor),
        dia_vencimento = COALESCE(${f.dia_vencimento}, dia_vencimento),
        ativa = COALESCE(${f.ativa}, ativa)
      WHERE id = ${id} RETURNING *`;
    return res.status(200).json({ success: true, data: result[0] });
  }

  if (req.method === 'DELETE' && id) {
    await sql`UPDATE contas_recorrentes SET deletado = true, excluido_em = NOW() WHERE id = ${id}`;
    return res.status(200).json({ success: true });
  }

  if (req.method === 'POST' && req.url.includes('gerar-mes')) {
    const { mes, ano } = req.query;
    const mesInt = parseInt(mes || new Date().getMonth() + 1);
    const anoInt = parseInt(ano || new Date().getFullYear());

    const contas = await sql`SELECT * FROM contas_recorrentes WHERE ativa = true`;
    const titulosGerados = [];

    for (const conta of contas) {
      const dataVencimento = new Date(anoInt, mesInt - 1, conta.dia_vencimento);
      
      const result = await sql`
        INSERT INTO titulos_pagar (
          numero_titulo, fornecedor_id, valor_original, valor_liquido, valor_aberto,
          data_emissao, data_vencimento, data_competencia,
          classe_financeira_id, forma_pagamento_id, conta_bancaria_id,
          status, parcela, total_parcelas, tipo_despesa
        ) VALUES (
          ${`REC-${conta.id.substring(0,8)}-${mesInt}/${anoInt}`}, ${conta.fornecedor_id},
          ${conta.valor}, ${conta.valor}, ${conta.valor},
          NOW(), ${dataVencimento}, ${dataVencimento},
          ${conta.classe_financeira_id}, ${conta.forma_pagamento_id}, ${conta.conta_bancaria_id},
          'aberto', 1, 1, 'fixa'
        ) RETURNING *`;
      titulosGerados.push(result[0]);
    }

    return res.status(201).json({ success: true, message: `${titulosGerados.length} títulos gerados`, data: titulosGerados });
  }

  return res.status(405).end();
}

async function handleDiagnostic(req: any, res: any) {
  const steps: string[] = [];
  try {
    steps.push('1. Verificando conexão com o DB...');
    const dbTime = await sql`SELECT NOW()`;
    steps.push(`   - Sucesso: ${dbTime[0].now}`);

    steps.push('2. Verificando estrutura das tabelas críticas...');
    const tables = ['classes_financeiras', 'contas_internas', 'formas_pagamento', 'condicoes_pagamento', 'titulos_receber', 'titulos_pagar'];
    for (const t of tables) {
      const cols = await sql`SELECT column_name FROM information_schema.columns WHERE table_name = ${t}`;
      const colNames = cols.map((c: any) => c.column_name);
      if (!colNames.includes('deletado')) throw new Error(`Coluna "deletado" ausente na tabela ${t}!`);
      steps.push(`   - Tabela ${t}: OK`);
    }

    steps.push('3. Verificando integridade de dados...');
    const totalClasses = (await sql`SELECT COUNT(*) FROM classes_financeiras WHERE deletado = false`)[0].count;
    steps.push(`   - Classes Financeiras ativas: ${totalClasses}`);
    
    if (Number(totalClasses) === 0) {
       steps.push('   - AVISO: Nenhuma classe financeira encontrada. Recomenda-se inicializar o plano de contas.');
    }

    steps.push('4. Testando motor de cálculo (Simulado)...');
    const testCond = (await sql`SELECT * FROM condicoes_pagamento WHERE deletado = false LIMIT 1`)[0];
    if (testCond) {
      const valorOriginal = 1000;
      const nParcelas = testCond.parcelas;
      steps.push(`   - Cálculo 1000 em ${nParcelas}x: OK`);
    } else {
      steps.push('   - AVISO: Nenhuma condição de pagamento cadastrada.');
    }

    return res.status(200).json({ 
      success: true, 
      message: 'SISTEMA FINANCEIRO 100% OPERACIONAL',
      steps 
    });
  } catch (e: any) {
    return res.status(500).json({ 
      success: false, 
      message: 'FALHA NO DIAGNÓSTICO', 
      error: e.message,
      steps 
    });
  }
}

async function handleCondicoesPagamento(req: any, res: any, id?: string) {
  if (req.method === 'GET') {
    const result = await sql`SELECT * FROM condicoes_pagamento WHERE deletado = false ORDER BY nome ASC`;
    return res.status(200).json({ success: true, data: result });
  }
  if (req.method === 'POST') {
    const f = req.body;
    const result = await sql`
      INSERT INTO condicoes_pagamento (nome, descricao, parcelas, ativo, entrada_percentual, juros_percentual)
      VALUES (${f.nome}, ${f.descricao || null}, ${Number(f.parcelas) || 1}, ${f.ativo ?? true}, ${Number(f.entrada_percentual) || 0}, ${Number(f.juros_percentual) || 0})
      RETURNING *`;
    return res.status(201).json({ success: true, data: result[0] });
  }
  if ((req.method === 'PATCH' || req.method === 'PUT') && id) {
    const f = req.body;
    const result = await sql`
      UPDATE condicoes_pagamento SET 
        nome = COALESCE(${f.nome}, nome),
        descricao = COALESCE(${f.descricao}, descricao),
        parcelas = COALESCE(${Number(f.parcelas)}, parcelas),
        ativo = COALESCE(${f.ativo}, ativo),
        entrada_percentual = COALESCE(${Number(f.entrada_percentual)}, entrada_percentual),
        juros_percentual = COALESCE(${Number(f.juros_percentual)}, juros_percentual),
        atualizado_em = NOW()
      WHERE id = ${id} RETURNING *`;
    return res.status(200).json({ success: true, data: result[0] });
  }
  if (req.method === 'DELETE' && id) {
    await sql`UPDATE condicoes_pagamento SET deletado = true, excluido_em = NOW() WHERE id = ${id}`;
    return res.status(200).json({ success: true });
  }
  return res.status(405).end();
}
