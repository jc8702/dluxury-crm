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
  if (req.method === 'GET') {
    const { cliente_id, status, data_inicio, data_fim } = req.query;
    let query = sql`SELECT * FROM titulos_receber WHERE deletado = false`;
    
    if (cliente_id) query = sql`${query} AND cliente_id = ${cliente_id}`;
    if (status) query = sql`${query} AND status = ${status}`;
    if (data_inicio && data_fim) query = sql`${query} AND data_vencimento BETWEEN ${data_inicio} AND ${data_fim}`;
    
    const result = await query;
    return res.status(200).json({ success: true, data: result });
  }

  if (req.method === 'POST') {
    const f = req.body;
    
    // Se houver condição de pagamento, geramos as parcelas
    if (f.condicao_pagamento_id) {
      const cond = (await sql`SELECT * FROM condicoes_pagamento WHERE id = ${f.condicao_pagamento_id}`)[0];
      if (!cond) return res.status(400).json({ success: false, error: 'Condição de pagamento não encontrada' });

      const totalParcelas = cond.parcelas;
      const valorTotal = Number(f.valor_original);
      const valorParcela = valorTotal / totalParcelas;
      const dataEmissao = new Date();
      
      const titulos = [];
      for (let i = 1; i <= totalParcelas; i++) {
        const vencimento = new Date();
        vencimento.setMonth(vencimento.getMonth() + (i - 1));
        
        const t = await sql`
          INSERT INTO titulos_receber (
            numero_titulo, cliente_id, projeto_id, orcamento_id,
            valor_original, valor_liquido, valor_aberto,
            data_emissao, data_vencimento, data_competencia,
            classe_financeira_id, forma_recebimento_id,
            status, parcela, total_parcelas, observacoes
          ) VALUES (
            ${`REC-${Date.now()}-${i}`}, ${f.cliente_id}, ${f.projeto_id || null}, ${f.orcamento_id || null},
            ${valorParcela}, ${valorParcela}, ${valorParcela},
            ${dataEmissao}, ${vencimento}, ${dataEmissao},
            ${f.classe_financeira_id}, ${f.forma_recebimento_id},
            'aberto', ${i}, ${totalParcelas}, ${f.observacoes || ''}
          ) RETURNING *`;
        titulos.push(t[0]);
      }
      return res.status(201).json({ success: true, data: titulos });
    }

    const result = await sql`
      INSERT INTO titulos_receber (
        numero_titulo, cliente_id, projeto_id, orcamento_id,
        valor_original, valor_liquido, valor_aberto,
        data_emissao, data_vencimento, data_competencia,
        classe_financeira_id, forma_recebimento_id,
        status, parcela, total_parcelas, observacoes
      ) VALUES (
        ${f.numero_titulo}, ${f.cliente_id}, ${f.projeto_id || null}, ${f.orcamento_id || null},
        ${f.valor_original}, ${f.valor_liquido}, ${f.valor_aberto},
        ${f.data_emissao}, ${f.data_vencimento}, ${f.data_competencia},
        ${f.classe_financeira_id}, ${f.forma_recebimento_id},
        ${f.status || 'aberto'}, ${f.parcela || 1}, ${f.total_parcelas || 1}, ${f.observacoes || ''}
      ) RETURNING *`;
    return res.status(201).json({ success: true, data: result[0] });
  }

  if ((req.method === 'PATCH' || req.method === 'PUT') && id) {
    const f = req.body;
    const result = await sql`
      UPDATE titulos_receber SET 
        valor_aberto = COALESCE(${f.valor_aberto}, valor_aberto),
        status = COALESCE(${f.status}, status),
        data_pagamento = COALESCE(${f.data_pagamento}, data_pagamento),
        atualizado_em = NOW()
      WHERE id = ${id} RETURNING *`;
    return res.status(200).json({ success: true, data: result[0] });
  }

  if (req.method === 'DELETE' && id) {
    await sql`UPDATE titulos_receber SET deletado = true, excluido_em = NOW() WHERE id = ${id}`;
    return res.status(200).json({ success: true });
  }

  if (req.method === 'POST' && id && req.url.includes('baixar')) {
    const f = req.body;
    
    return await sql.begin(async (tx) => {
      const titulo = (await tx`SELECT * FROM titulos_receber WHERE id = ${id}`)[0];
      if (!titulo) throw new Error('Título não encontrado');

      const valorBaixa = Number(f.valor_baixa) || titulo.valor_aberto;
      
      // 1. Registrar Baixa
      await tx`
        INSERT INTO baixas (tipo, titulo_id, valor_baixa, data_baixa, conta_interna_id, observacoes)
        VALUES ('recebimento', ${id}, ${valorBaixa}, ${f.data_baixa || new Date()}, ${f.conta_interna_id}, ${f.observacoes || ''})`;

      // 2. Atualizar Título
      const novoValorAberto = Number(titulo.valor_aberto) - valorBaixa;
      const novoStatus = novoValorAberto <= 0 ? 'pago' : 'pago_parcial';
      await tx`
        UPDATE titulos_receber SET 
          valor_aberto = ${novoValorAberto}, 
          status = ${novoStatus}, 
          data_pagamento = ${novoStatus === 'pago' ? new Date() : null}
        WHERE id = ${id}`;

      // 3. Atualizar Saldo da Conta
      await tx`
        UPDATE contas_internas SET saldo_atual = saldo_atual + ${valorBaixa}
        WHERE id = ${f.conta_interna_id}`;

      return res.status(200).json({ success: true, message: 'Baixa realizada com sucesso' });
    });
  }

  return res.status(405).end();
}

async function handleTitulosPagar(req: any, res: any, id?: string) {
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
    
    if (f.condicao_pagamento_id) {
      const cond = (await sql`SELECT * FROM condicoes_pagamento WHERE id = ${f.condicao_pagamento_id}`)[0];
      if (!cond) return res.status(400).json({ success: false, error: 'Condição de pagamento não encontrada' });

      const totalParcelas = cond.parcelas;
      const valorTotal = Number(f.valor_original);
      const valorParcela = valorTotal / totalParcelas;
      const dataEmissao = new Date();
      
      const titulos = [];
      for (let i = 1; i <= totalParcelas; i++) {
        const vencimento = new Date();
        vencimento.setMonth(vencimento.getMonth() + (i - 1));
        
        const t = await sql`
          INSERT INTO titulos_pagar (
            numero_titulo, fornecedor_id, nota_fiscal, pedido_compra_id,
            valor_original, valor_liquido, valor_aberto,
            data_emissao, data_vencimento, data_competencia,
            classe_financeira_id, forma_pagamento_id, conta_bancaria_id,
            status, parcela, total_parcelas, observacoes
          ) VALUES (
            ${`PAG-${Date.now()}-${i}`}, ${f.fornecedor_id}, ${f.nota_fiscal || null}, ${f.pedido_compra_id || null},
            ${valorParcela}, ${valorParcela}, ${valorParcela},
            ${dataEmissao}, ${vencimento}, ${dataEmissao},
            ${f.classe_financeira_id}, ${f.forma_pagamento_id}, ${f.conta_bancaria_id},
            'aberto', ${i}, ${totalParcelas}, ${f.observacoes || ''}
          ) RETURNING *`;
        titulos.push(t[0]);
      }
      return res.status(201).json({ success: true, data: titulos });
    }

    const result = await sql`
      INSERT INTO titulos_pagar (
        numero_titulo, fornecedor_id, nota_fiscal, pedido_compra_id,
        valor_original, valor_liquido, valor_aberto,
        data_emissao, data_vencimento, data_competencia,
        classe_financeira_id, forma_pagamento_id, conta_bancaria_id,
        status, parcela, total_parcelas, observacoes
      ) VALUES (
        ${f.numero_titulo}, ${f.fornecedor_id}, ${f.nota_fiscal || null}, ${f.pedido_compra_id || null},
        ${f.valor_original}, ${f.valor_liquido}, ${f.valor_aberto},
        ${f.data_emissao}, ${f.data_vencimento}, ${f.data_competencia},
        ${f.classe_financeira_id}, ${f.forma_pagamento_id}, ${f.conta_bancaria_id},
        ${f.status || 'aberto'}, ${f.parcela || 1}, ${f.total_parcelas || 1}, ${f.observacoes || ''}
      ) RETURNING *`;
    return res.status(201).json({ success: true, data: result[0] });
  }

  if ((req.method === 'PATCH' || req.method === 'PUT') && id) {
    const f = req.body;
    const result = await sql`
      UPDATE titulos_pagar SET 
        valor_aberto = COALESCE(${f.valor_aberto}, valor_aberto),
        status = COALESCE(${f.status}, status),
        data_pagamento = COALESCE(${f.data_pagamento}, data_pagamento),
        atualizado_em = NOW()
      WHERE id = ${id} RETURNING *`;
    return res.status(200).json({ success: true, data: result[0] });
  }

  if (req.method === 'DELETE' && id) {
    await sql`UPDATE titulos_pagar SET deletado = true, excluido_em = NOW() WHERE id = ${id}`;
    return res.status(200).json({ success: true });
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
      if (Number(conta.saldo_atual) < valorBaixa) {
        saldoWarning = true;
      }
      
      await tx`
        INSERT INTO baixas (tipo, titulo_id, valor_baixa, data_baixa, conta_interna_id, observacoes)
        VALUES ('pagamento', ${id}, ${valorBaixa}, ${f.data_baixa || new Date()}, ${f.conta_interna_id || titulo.conta_bancaria_id}, ${f.observacoes || ''})`;

      const novoValorAberto = Number(titulo.valor_aberto) - valorBaixa;
      const novoStatus = novoValorAberto <= 0 ? 'pago' : 'pago_parcial';
      await tx`
        UPDATE titulos_pagar SET 
          valor_aberto = ${novoValorAberto}, 
          status = ${novoStatus}, 
          data_pagamento = ${novoStatus === 'pago' ? new Date() : null}
        WHERE id = ${id}`;

      await tx`
        UPDATE contas_internas SET saldo_atual = saldo_atual - ${valorBaixa}
        WHERE id = ${f.conta_interna_id || titulo.conta_bancaria_id}`;

      return res.status(200).json({ 
        success: true, 
        message: 'Baixa realizada com sucesso',
        warning: saldoWarning ? 'Saldo insuficiente na conta, mas o pagamento foi processado.' : undefined
      });
    });
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

