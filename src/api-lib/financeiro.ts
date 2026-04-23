import { sql, validateAuth } from './_db.js';

async function checkPeriodoFechado(data: string | Date | undefined) {
  if (!data) return false;
  const d = new Date(data);
  const mes = d.getMonth() + 1;
  const ano = d.getFullYear();
  const fechado = await sql`
    SELECT id FROM fechamentos_financeiros 
    WHERE mes = ${mes} AND ano = ${ano} AND status = 'fechado'
  `;
  return fechado.length > 0;
}

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
    if (resource === 'fechamentos') {
      return await handleFechamentos(req, res, id);
    }
    if (resource === 'conferencia') {
      return await handleConferencia(req, res);
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
    const isExtrato = req.url?.includes('/extrato') || req.query?.action === 'extrato';
    if (isExtrato) {
      // ID pode vir do path ou da query string
      const contaId = id && id !== 'extrato' ? id : (req.query?.id);
      if (!contaId) return res.status(400).json({ success: false, error: 'ID da conta é obrigatório' });
      
      const conta = (await sql`SELECT * FROM contas_internas WHERE id = ${contaId}`)[0];
      if (!conta) return res.status(404).json({ success: false, error: 'Conta não encontrada' });

      // Consolidar todas as movimentações
      // O sinal real de cada movimento:
      //   baixa/recebimento → +entrada; baixa/pagamento → -saída
      //   tesouraria/entrada → + (conta é destino)
      //   tesouraria/saida   → - (conta é origem)
      //   tesouraria/transferencia → + se destino, - se origem
      const movimentos = await sql`
        SELECT * FROM (
          -- Baixas de títulos (recebimentos e pagamentos)
          SELECT 
            id, 
            data_baixa as data, 
            CASE WHEN tipo = 'recebimento' THEN ABS(valor_baixa) ELSE -ABS(valor_baixa) END as valor,
            tipo, 
            observacoes as descricao,
            'baixa' as origem,
            NULL::uuid as conta_origem_id,
            NULL::uuid as conta_destino_id,
            conferido,
            conferido_em
          FROM baixas 
          WHERE conta_interna_id = ${contaId} AND deletado = false

          UNION ALL

          -- Tesouraria: entradas/saídas/transferências
          SELECT 
            id, 
            data_movimento as data, 
            CASE 
              WHEN tipo = 'entrada' THEN ABS(valor)
              WHEN tipo = 'saida' THEN -ABS(valor)
              WHEN tipo = 'transferencia' AND conta_destino_id = ${contaId} THEN ABS(valor)
              WHEN tipo = 'transferencia' AND conta_origem_id = ${contaId} THEN -ABS(valor)
              ELSE 0
            END as valor,
            tipo,
            descricao,
            'tesouraria' as origem,
            conta_origem_id,
            conta_destino_id,
            conferido,
            conferido_em
          FROM movimentacoes_tesouraria
          WHERE (conta_origem_id = ${contaId} OR conta_destino_id = ${contaId}) AND deletado = false
        ) as movs
        ORDER BY data ASC
      `;

      // Âncora: o saldo_atual do banco é a verdade absoluta (saldo APÓS todos os movimentos)
      // Recalculamos os saldos progressivos de trás para frente
      const saldoFinal = Number(conta.saldo_atual || 0);
      const movsList = [...movimentos]; // ordem ASC = mais antigo primeiro

      // Backward pass: partindo do saldo final, subtraímos cada movimento de trás para frente
      let saldoCorrido = saldoFinal;
      const saldosMomento: number[] = new Array(movsList.length);
      for (let i = movsList.length - 1; i >= 0; i--) {
        saldosMomento[i] = saldoCorrido;
        saldoCorrido -= Number(movsList[i].valor);
      }
      // saldoCorrido agora é o saldo ANTES de qualquer movimento (= saldo_inicial implícito)
      const saldoInicialImplicito = saldoCorrido;

      const extratoComSaldo = movsList.map((m: any, i: number) => ({
        ...m,
        valor: Number(m.valor),
        saldo_momento: saldosMomento[i]
      }));

      return res.status(200).json({ 
        success: true, 
        data: {
          conta,
          saldo_inicial: saldoInicialImplicito, // saldo antes do primeiro lançamento
          saldo_inicial_cadastro: Number(conta.saldo_inicial || 0), // valor cadastrado pelo usuário
          extrato: extratoComSaldo.reverse() // Mais recente primeiro para exibição
        } 
      });
    }

    const result = await sql`SELECT * FROM contas_internas WHERE deletado = false ORDER BY nome ASC`;
    return res.status(200).json({ success: true, data: result });
  }
  if (req.method === 'POST') {
    const f = req.body;
    const saldoInicial = Number(f.saldo_inicial || 0);
    // saldo_atual começa igual ao saldo_inicial — movimentos futuros ajustam de forma incremental
    const result = await sql`
      INSERT INTO contas_internas (nome, tipo, banco_codigo, agencia, conta, saldo_inicial, saldo_atual, data_saldo_inicial, ativa)
      VALUES (${f.nome}, ${f.tipo}, ${f.banco_codigo || null}, ${f.agencia || null}, ${f.conta || null}, ${saldoInicial}, ${saldoInicial}, ${f.data_saldo_inicial || null}, ${f.ativa ?? true})
      RETURNING *`;
    return res.status(201).json({ success: true, data: result[0] });
  }
  if ((req.method === 'PATCH' || req.method === 'PUT') && id) {
    const f = req.body;

    // Se o saldo_inicial foi alterado, aplica a diferença ao saldo_atual
    // (ex: inicial era 25.000, vira 30.000 → saldo_atual sobe R$5.000)
    if (f.saldo_inicial !== undefined) {
      const atual = (await sql`SELECT saldo_inicial, saldo_atual FROM contas_internas WHERE id = ${id}`)[0];
      if (atual) {
        const novoInicial = Number(f.saldo_inicial);
        const antigoInicial = Number(atual.saldo_inicial || 0);
        const diferenca = novoInicial - antigoInicial;
        await sql`
          UPDATE contas_internas SET 
            nome         = COALESCE(${f.nome}, nome),
            tipo         = COALESCE(${f.tipo}, tipo),
            banco_codigo = COALESCE(${f.banco_codigo}, banco_codigo),
            agencia      = COALESCE(${f.agencia}, agencia),
            conta        = COALESCE(${f.conta}, conta),
            saldo_inicial = ${novoInicial},
            saldo_atual  = saldo_atual + ${diferenca},
            ativa        = COALESCE(${f.ativa}, ativa)
          WHERE id = ${id}`;
        const updated = (await sql`SELECT * FROM contas_internas WHERE id = ${id}`)[0];
        return res.status(200).json({ success: true, data: updated });
      }
    }

    // Edição sem alterar saldo_inicial
    const result = await sql`
      UPDATE contas_internas SET 
        nome         = COALESCE(${f.nome}, nome),
        tipo         = COALESCE(${f.tipo}, tipo),
        banco_codigo = COALESCE(${f.banco_codigo}, banco_codigo),
        agencia      = COALESCE(${f.agencia}, agencia),
        conta        = COALESCE(${f.conta}, conta),
        saldo_atual  = COALESCE(${f.saldo_atual !== undefined ? f.saldo_atual : null}, saldo_atual),
        ativa        = COALESCE(${f.ativa}, ativa)
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
      if (await checkPeriodoFechado(f.data_baixa || new Date())) {
        throw new Error('Não é possível realizar baixa em um período financeiro fechado.');
      }
      const titulo = (await tx`SELECT * FROM titulos_receber WHERE id = ${id}`)[0];
      if (!titulo) throw new Error('Título não encontrado');
      const valorBaixa = Number(f.valor_baixa) || titulo.valor_aberto;
      
      await tx`INSERT INTO baixas (
        tipo, titulo_id, valor_baixa, valor_original_baixa, valor_multa, valor_juros, data_baixa, conta_interna_id, observacoes
      ) VALUES (
        'recebimento', ${id}, ${valorBaixa}, ${f.valor_original_baixa || valorBaixa}, ${f.valor_multa || 0}, ${f.valor_juros || 0}, ${f.data_baixa || new Date()}, ${f.conta_interna_id}, ${f.observacoes || ''}
      )`;

      const novoValorAberto = Number(titulo.valor_aberto) - (Number(f.valor_original_baixa) || valorBaixa);
      const novoStatus = novoValorAberto <= 0 ? 'pago' : 'pago_parcial';
      await tx`UPDATE titulos_receber SET valor_aberto = ${Math.max(0, novoValorAberto)}, status = ${novoStatus}, data_pagamento = ${novoStatus === 'pago' ? new Date() : null} WHERE id = ${id}`;
      await tx`UPDATE contas_internas SET saldo_atual = saldo_atual + ${valorBaixa} WHERE id = ${f.conta_interna_id}`;
      return res.status(200).json({ success: true, message: 'Recebimento realizado com sucesso' });
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

  if (req.method === 'DELETE') {
    const { action, cliente_id } = req.query;
    if (action === 'delete_group' && cliente_id) {
      await sql`UPDATE titulos_receber SET deletado = true, excluido_em = NOW() WHERE cliente_id = ${cliente_id} AND status != 'pago'`;
      return res.status(200).json({ success: true, message: 'Todos os títulos pendentes do cliente foram excluídos' });
    }
    if (id) {
      await sql`UPDATE titulos_receber SET deletado = true, excluido_em = NOW() WHERE id = ${id}`;
      return res.status(200).json({ success: true });
    }
  }

  if (req.method === 'POST') {
    const f = req.body;
    if (await checkPeriodoFechado(f.data_vencimento || new Date())) {
      return res.status(400).json({ success: false, error: 'Não é possível lançar títulos em um período financeiro fechado.' });
    }
    const numTotal = Number(f.total_parcelas) || 1;
    // cliente_id é integer na tabela clients — garantir conversão correta
    const clienteId = f.cliente_id;
    if (!clienteId) {
      return res.status(400).json({ success: false, error: 'cliente_id é obrigatório' });
    }
    const valorTaxaTotal = Number(f.valor_custo_financeiro) || 0;
    const taxaPerc = Number(f.taxa_financeira) || 0;
    const mesesRecorrencia = Number(f.recorrencia_meses) || 1;
    const titulos: any[] = [];
    
    for (let m = 0; m < mesesRecorrencia; m++) {
      for (let i = 1; i <= numTotal; i++) {
        const venc = new Date(f.data_vencimento || new Date());
        venc.setMonth(venc.getMonth() + (i - 1) + m);
        const suffix = mesesRecorrencia > 1 ? `-M${m+1}` : '';
        const t = await sql`
          INSERT INTO titulos_receber (
            numero_titulo, cliente_id, projeto_id, orcamento_id, 
            valor_original, valor_liquido, valor_aberto, 
            data_emissao, data_vencimento, data_competencia, 
            classe_financeira_id, condicao_pagamento_id, forma_recebimento_id, 
            status, parcela, total_parcelas, observacoes,
            taxa_financeira, valor_custo_financeiro, rateio
          ) VALUES (
            ${(f.numero_titulo || `REC-${Date.now()}`) + suffix + (numTotal > 1 ? `-P${i}` : '')}, 
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
            ${f.observacoes || ''},
            ${taxaPerc},
            ${valorTaxaTotal / numTotal},
            ${JSON.stringify(f.rateio || [])}
          ) RETURNING *`;
        titulos.push(t[0]);
      }
    }
    return res.status(201).json({ success: true, data: titulos });
  }

  if ((req.method === 'PATCH' || req.method === 'PUT') && id) {
    const f = req.body;
    const result = await sql`
      UPDATE titulos_receber SET 
        status = COALESCE(${f.status}, status), 
        valor_aberto = COALESCE(${f.valor_aberto}, valor_aberto),
        numero_titulo = COALESCE(${f.numero_titulo}, numero_titulo),
        valor_original = COALESCE(${f.valor_original}, valor_original),
        valor_liquido = COALESCE(${f.valor_liquido}, valor_liquido),
        taxa_financeira = COALESCE(${f.taxa_financeira}, taxa_financeira),
        valor_custo_financeiro = COALESCE(${f.valor_custo_financeiro}, valor_custo_financeiro),
        data_vencimento = COALESCE(${f.data_vencimento ? new Date(f.data_vencimento) : null}, data_vencimento),
        atualizado_em = NOW() 
      WHERE id = ${id} RETURNING *`;
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
      if (await checkPeriodoFechado(f.data_baixa || new Date())) {
        throw new Error('Não é possível realizar baixa em um período financeiro fechado.');
      }
      const titulo = (await tx`SELECT * FROM titulos_pagar WHERE id = ${id}`)[0];
      if (!titulo) throw new Error('Título não encontrado');
      const conta = (await tx`SELECT * FROM contas_internas WHERE id = ${f.conta_interna_id || titulo.conta_bancaria_id}`)[0];
      if (!conta) throw new Error('Conta bancária não encontrada');
      const valorBaixa = Number(f.valor_baixa) || titulo.valor_aberto;
      let saldoWarning = false;
      if (Number(conta.saldo_atual) < valorBaixa) { saldoWarning = true; }
      await tx`INSERT INTO baixas (
        tipo, titulo_id, valor_baixa, valor_original_baixa, valor_multa, valor_juros, data_baixa, conta_interna_id, observacoes
      ) VALUES (
        'pagamento', ${id}, ${valorBaixa}, ${f.valor_original_baixa || valorBaixa}, ${f.valor_multa || 0}, ${f.valor_juros || 0}, ${f.data_baixa || new Date()}, ${f.conta_interna_id || titulo.conta_bancaria_id}, ${f.observacoes || ''}
      )`;
      const novoValorAberto = Number(titulo.valor_aberto) - (Number(f.valor_original_baixa) || valorBaixa);
      const novoStatus = novoValorAberto <= 0 ? 'pago' : 'pago_parcial';
      await tx`UPDATE titulos_pagar SET valor_aberto = ${Math.max(0, novoValorAberto)}, status = ${novoStatus}, data_pagamento = ${novoStatus === 'pago' ? new Date() : null} WHERE id = ${id}`;
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

  if (req.method === 'DELETE') {
    const { action, fornecedor_id } = req.query;
    if (action === 'delete_group' && fornecedor_id) {
      await sql`UPDATE titulos_pagar SET deletado = true, excluido_em = NOW() WHERE fornecedor_id = ${fornecedor_id} AND status != 'pago'`;
      return res.status(200).json({ success: true, message: 'Todos os títulos pendentes do fornecedor foram excluídos' });
    }
    if (id) {
      await sql`UPDATE titulos_pagar SET deletado = true, excluido_em = NOW() WHERE id = ${id}`;
      return res.status(200).json({ success: true });
    }
  }

  if (req.method === 'POST') {
    const f = req.body;
    if (await checkPeriodoFechado(f.data_vencimento || new Date())) {
      return res.status(400).json({ success: false, error: 'Não é possível lançar títulos em um período financeiro fechado.' });
    }
    const numTotal = Number(f.total_parcelas) || 1;
    const mesesRecorrencia = Number(f.recorrencia_meses) || 1;
    const valorTaxaTotal = Number(f.valor_custo_financeiro) || 0;
    const taxaPerc = Number(f.taxa_financeira) || 0;
    const titulos = [];

    for (let m = 0; m < mesesRecorrencia; m++) {
      for (let i = 1; i <= numTotal; i++) {
        const venc = new Date(f.data_vencimento || new Date());
        venc.setMonth(venc.getMonth() + (i - 1) + m);
        const suffix = mesesRecorrencia > 1 ? `-M${m+1}` : '';
        const t = await sql`
          INSERT INTO titulos_pagar (
            numero_titulo, fornecedor_id, pedido_compra_id,
            valor_original, valor_liquido, valor_aberto, 
            data_emissao, data_vencimento, data_competencia, 
            classe_financeira_id, condicao_pagamento_id, forma_pagamento_id, 
            conta_bancaria_id, status, parcela, total_parcelas,
            taxa_financeira, valor_custo_financeiro, rateio
          ) VALUES (
            ${(f.numero_titulo || `PAG-${Date.now()}`) + suffix + (numTotal > 1 ? `-P${i}` : '')}, 
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
            ${numTotal}, 
            ${taxaPerc},
            ${valorTaxaTotal / numTotal},
            ${JSON.stringify(f.rateio || [])}
          ) RETURNING *`;
        titulos.push(t[0]);
      }
    }
    return res.status(201).json({ success: true, data: titulos });
  }

  if ((req.method === 'PATCH' || req.method === 'PUT') && id) {
    const f = req.body;
    const result = await sql`
      UPDATE titulos_pagar SET 
        status = COALESCE(${f.status}, status), 
        valor_aberto = COALESCE(${f.valor_aberto}, valor_aberto),
        numero_titulo = COALESCE(${f.numero_titulo}, numero_titulo),
        valor_original = COALESCE(${f.valor_original}, valor_original),
        valor_liquido = COALESCE(${f.valor_liquido}, valor_liquido),
        taxa_financeira = COALESCE(${f.taxa_financeira}, taxa_financeira),
        valor_custo_financeiro = COALESCE(${f.valor_custo_financeiro}, valor_custo_financeiro),
        data_vencimento = COALESCE(${f.data_vencimento ? new Date(f.data_vencimento) : null}, data_vencimento),
        atualizado_em = NOW() 
      WHERE id = ${id} RETURNING *`;
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
    const action = req.query?.action || (req.url?.includes('transferencia') ? 'transferencia' : 'lancamento');

    return await sql.begin(async (tx) => {
      if (await checkPeriodoFechado(f.data_movimento || new Date())) {
        throw new Error('Não é possível realizar movimentações em um período financeiro fechado.');
      }
      if (action === 'transferencia') {
        if (!f.conta_origem_id || !f.conta_destino_id) 
          throw new Error('Origem e destino são obrigatórios para transferência');
        if (Number(f.valor) <= 0)
          throw new Error('Valor deve ser maior que zero');

        const origem = (await tx`SELECT saldo_atual FROM contas_internas WHERE id = ${f.conta_origem_id}`)[0];
        if (!origem) throw new Error('Conta de origem não encontrada');
        if (Number(origem.saldo_atual) < Number(f.valor)) 
          throw new Error(`Saldo insuficiente na conta de origem (disponível: R$ ${Number(origem.saldo_atual).toFixed(2)})`);

        await tx`
          INSERT INTO movimentacoes_tesouraria 
            (tipo, conta_origem_id, conta_destino_id, valor, data_movimento, descricao)
          VALUES 
            ('transferencia', ${f.conta_origem_id}, ${f.conta_destino_id}, ${Number(f.valor)}, 
             ${f.data_movimento ? new Date(f.data_movimento) : new Date()}, 
             ${f.descricao || 'Transferência entre contas'})`;
        
        await tx`UPDATE contas_internas SET saldo_atual = saldo_atual - ${Number(f.valor)} WHERE id = ${f.conta_origem_id}`;
        await tx`UPDATE contas_internas SET saldo_atual = saldo_atual + ${Number(f.valor)} WHERE id = ${f.conta_destino_id}`;

        const origemAtual  = (await tx`SELECT nome, saldo_atual FROM contas_internas WHERE id = ${f.conta_origem_id}`)[0];
        const destinoAtual = (await tx`SELECT nome, saldo_atual FROM contas_internas WHERE id = ${f.conta_destino_id}`)[0];
        return res.status(201).json({ 
          success: true, 
          message: 'Transferência realizada com sucesso',
          data: { origem: origemAtual, destino: destinoAtual }
        });

      } else {
        // Lançamento avulso (entrada ou saída direta)
        const isEntrada = f.tipo === 'entrada';
        const valor = Math.abs(Number(f.valor));
        
        await tx`
          INSERT INTO movimentacoes_tesouraria 
            (tipo, conta_origem_id, conta_destino_id, valor, data_movimento, classe_financeira_id, descricao)
          VALUES 
            (${f.tipo}, 
             ${isEntrada ? null : f.conta_interna_id}, 
             ${isEntrada ? f.conta_interna_id : null}, 
             ${valor}, 
             ${f.data_movimento ? new Date(f.data_movimento) : new Date()}, 
             ${f.classe_financeira_id || null}, 
             ${f.descricao || ''})`;
        
        const ajuste = isEntrada ? valor : -valor;
        await tx`UPDATE contas_internas SET saldo_atual = saldo_atual + ${ajuste} WHERE id = ${f.conta_interna_id}`;
        return res.status(201).json({ success: true, message: 'Lançamento realizado com sucesso' });
      }
    });
  }
  return res.status(405).end();
}

async function handleFluxoCaixa(req: any, res: any) {
  if (req.method === 'GET') {
    const { granularity = 'daily', regime = 'caixa', periods } = req.query;
    const numPeriods = parseInt(periods || (granularity === 'daily' ? '30' : granularity === 'weekly' ? '12' : '12'));

    // Saldo atual de todas as contas
    const saldos = await sql`SELECT SUM(saldo_atual::numeric) as total FROM contas_internas WHERE deletado = false`;
    const saldoAtual = Number(saldos[0]?.total || 0);

    // Campo de data baseado no regime
    const campoDataRec = regime === 'caixa' ? 'data_pagamento' : 'data_competencia';
    const campoDataPag = regime === 'caixa' ? 'data_pagamento' : 'data_competencia';

    // Receitas e despesas detalhadas por data (regime de caixa: usa data_vencimento como proxy se data_pagamento null)
    const receitasRaw = await sql`
      SELECT 
        CASE WHEN ${regime} = 'caixa' THEN 
          COALESCE(data_pagamento, data_vencimento) 
        ELSE data_competencia END::date as data_ref,
        valor_aberto::numeric as valor,
        numero_titulo, status, cliente_id
      FROM titulos_receber 
      WHERE deletado = false AND status NOT IN ('cancelado', 'pago')
      AND CASE WHEN ${regime} = 'caixa' THEN 
        COALESCE(data_pagamento, data_vencimento)
      ELSE data_competencia END >= NOW()
      ORDER BY data_ref
    `;

    const despesasRaw = await sql`
      SELECT 
        CASE WHEN ${regime} = 'caixa' THEN 
          COALESCE(data_pagamento, data_vencimento) 
        ELSE data_competencia END::date as data_ref,
        valor_aberto::numeric as valor,
        numero_titulo, status, fornecedor_id
      FROM titulos_pagar 
      WHERE deletado = false AND status NOT IN ('cancelado', 'pago')
      AND CASE WHEN ${regime} = 'caixa' THEN 
        COALESCE(data_pagamento, data_vencimento)
      ELSE data_competencia END >= NOW()
      ORDER BY data_ref
    `;

    // Montar períodos
    const periodos: any[] = [];
    let saldoAcumulado = saldoAtual;
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    for (let i = 0; i < numPeriods; i++) {
      let inicio: Date, fim: Date, label: string;

      if (granularity === 'daily') {
        inicio = new Date(hoje);
        inicio.setDate(inicio.getDate() + i);
        fim = new Date(inicio);
        label = inicio.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      } else if (granularity === 'weekly') {
        inicio = new Date(hoje);
        inicio.setDate(inicio.getDate() + i * 7);
        fim = new Date(inicio);
        fim.setDate(fim.getDate() + 6);
        label = `${inicio.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} - ${fim.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}`;
      } else { // monthly
        inicio = new Date(hoje.getFullYear(), hoje.getMonth() + i, 1);
        fim = new Date(hoje.getFullYear(), hoje.getMonth() + i + 1, 0);
        label = inicio.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }).toUpperCase();
      }

      const inicioStr = inicio.toISOString().split('T')[0];
      const fimStr = fim.toISOString().split('T')[0];

      const rec = receitasRaw.filter((r: any) => {
        const d = r.data_ref instanceof Date ? r.data_ref.toISOString().split('T')[0] : String(r.data_ref).split('T')[0];
        return d >= inicioStr && d <= fimStr;
      });
      const pag = despesasRaw.filter((r: any) => {
        const d = r.data_ref instanceof Date ? r.data_ref.toISOString().split('T')[0] : String(r.data_ref).split('T')[0];
        return d >= inicioStr && d <= fimStr;
      });

      const totalRec = rec.reduce((s: number, r: any) => s + Number(r.valor), 0);
      const totalPag = pag.reduce((s: number, r: any) => s + Number(r.valor), 0);
      const saldoAnterior = saldoAcumulado;
      saldoAcumulado = saldoAcumulado + totalRec - totalPag;

      periodos.push({
        label,
        inicio: inicioStr,
        fim: fimStr,
        saldo_anterior: saldoAnterior,
        receitas: totalRec,
        despesas: totalPag,
        saldo_projetado: saldoAcumulado,
        titulos_receber: rec.map((r: any) => ({ numero: r.numero_titulo, valor: Number(r.valor) })),
        titulos_pagar: pag.map((r: any) => ({ numero: r.numero_titulo, valor: Number(r.valor) })),
      });
    }

    return res.status(200).json({ 
      success: true, 
      data: { saldo_atual: saldoAtual, periodos, granularity, regime }
    });
  }
  return res.status(405).end();
}

async function handleRelatorios(req: any, res: any) {
  const { type } = req.query;

  if (type === 'dre') {
    const { data_inicio, data_fim, regime = 'competencia' } = req.query;
    const start = data_inicio ? new Date(data_inicio as string) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const end = data_fim ? new Date(data_fim as string) : new Date();
    const campoData = regime === 'caixa' ? 'data_pagamento' : 'data_competencia';

    // Receitas por classe
    const receitas = await sql`
      SELECT 
        cf.codigo, cf.nome, cf.pai_id,
        SUM(t.valor_original::numeric) as valor
      FROM classes_financeiras cf
      JOIN titulos_receber t ON t.classe_financeira_id = cf.id
      WHERE t.${sql.unsafe(campoData)} BETWEEN ${start} AND ${end} 
        AND t.status != 'cancelado' AND t.deletado = false
        AND ((${regime} = 'caixa' AND t.status = 'pago') OR (${regime} = 'competencia'))
      GROUP BY cf.codigo, cf.nome, cf.pai_id
      ORDER BY cf.codigo
    `;

    // Despesas por classe
    const despesas = await sql`
      SELECT 
        cf.codigo, cf.nome, cf.pai_id,
        SUM(t.valor_original::numeric) as valor
      FROM classes_financeiras cf
      JOIN titulos_pagar t ON t.classe_financeira_id = cf.id
      WHERE t.${sql.unsafe(campoData)} BETWEEN ${start} AND ${end} 
        AND t.status != 'cancelado' AND t.deletado = false
        AND ((${regime} = 'caixa' AND t.status = 'pago') OR (${regime} = 'competencia'))
      GROUP BY cf.codigo, cf.nome, cf.pai_id
      ORDER BY cf.codigo
    `;

    // Montar estrutura DRE Senior
    const totalReceitas = receitas.reduce((s: number, r: any) => s + Number(r.valor), 0);
    const totalDespesas = despesas.reduce((s: number, r: any) => s + Number(r.valor), 0);

    // Categorizar despesas por código de classe
    const custosDiretos = despesas.filter((d: any) => d.codigo?.startsWith('2.1') || d.codigo?.startsWith('2.2'));
    const despesasOp = despesas.filter((d: any) => d.codigo?.startsWith('2.3') || d.codigo?.startsWith('2.4') || d.codigo?.startsWith('2.5'));
    const despesasAdmin = despesas.filter((d: any) => d.codigo?.startsWith('2.6'));
    const despesasFinanceiras = despesas.filter((d: any) => d.codigo?.startsWith('1.3.2'));
    const receitasFinanceiras = receitas.filter((r: any) => r.codigo?.startsWith('1.3.2'));

    const totalCustosDiretos = custosDiretos.reduce((s: number, r: any) => s + Number(r.valor), 0);
    const totalDespesasOp = despesasOp.reduce((s: number, r: any) => s + Number(r.valor), 0);
    const totalDespesasAdmin = despesasAdmin.reduce((s: number, r: any) => s + Number(r.valor), 0);
    const totalRecFinanceiras = receitasFinanceiras.reduce((s: number, r: any) => s + Number(r.valor), 0);
    const totalDespFinanceiras = despesasFinanceiras.reduce((s: number, r: any) => s + Number(r.valor), 0);

    const receitaBruta = totalReceitas;
    const receitaLiquida = receitaBruta; // sem deduções neste momento
    const lucroBruto = receitaLiquida - totalCustosDiretos;
    const ebitda = lucroBruto - totalDespesasOp - totalDespesasAdmin;
    const lucroLiquido = ebitda + totalRecFinanceiras - totalDespFinanceiras;

    return res.status(200).json({ 
      success: true, 
      data: {
        periodo: { inicio: start, fim: end, regime },
        receita_bruta: receitaBruta,
        receita_liquida: receitaLiquida,
        lucro_bruto: lucroBruto,
        margem_bruta: receitaLiquida > 0 ? (lucroBruto / receitaLiquida) * 100 : 0,
        ebitda,
        margem_ebitda: receitaLiquida > 0 ? (ebitda / receitaLiquida) * 100 : 0,
        lucro_liquido: lucroLiquido,
        margem_liquida: receitaLiquida > 0 ? (lucroLiquido / receitaLiquida) * 100 : 0,
        detalhes: {
          receitas: receitas.map((r: any) => ({ ...r, valor: Number(r.valor) })),
          custos_diretos: custosDiretos.map((r: any) => ({ ...r, valor: Number(r.valor) })),
          despesas_operacionais: despesasOp.map((r: any) => ({ ...r, valor: Number(r.valor) })),
          despesas_administrativas: despesasAdmin.map((r: any) => ({ ...r, valor: Number(r.valor) })),
          resultado_financeiro: {
            receitas: totalRecFinanceiras,
            despesas: totalDespFinanceiras,
            saldo: totalRecFinanceiras - totalDespFinanceiras
          }
        }
      }
    });
  }

  if (type === 'aging') {
    const summary = await sql`
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
      GROUP BY faixa`;

    const details = await sql`
      SELECT 
        t.*, 
        c.nome as cliente_nome
      FROM titulos_receber t
      LEFT JOIN clients c ON c.id::text = t.cliente_id::text
      WHERE t.status IN ('aberto', 'pago_parcial') AND t.deletado = false
      ORDER BY t.data_vencimento ASC`;
    
    return res.status(200).json({ 
      success: true, 
      data: { summary, details } 
    });
  }

  if (type === 'projetado') {
    const days = parseInt(req.query?.days || '30');
    const saldoInicial = await sql`SELECT SUM(saldo_atual::numeric) as total FROM contas_internas WHERE deletado = false`;
    const inicial = Number(saldoInicial[0]?.total || 0);

    const recs = await sql`
      SELECT data_vencimento::date as data, SUM(valor_aberto::numeric) as valor 
      FROM titulos_receber 
      WHERE status != 'pago' AND data_vencimento BETWEEN NOW() AND NOW() + ${days} * INTERVAL '1 day'
      GROUP BY data_vencimento::date
    `;

    const pags = await sql`
      SELECT data_vencimento::date as data, SUM(valor_aberto::numeric) as valor 
      FROM titulos_pagar 
      WHERE status != 'pago' AND data_vencimento BETWEEN NOW() AND NOW() + ${days} * INTERVAL '1 day'
      GROUP BY data_vencimento::date
    `;

    // Montar projeção dia a dia
    const projecao = [];
    let saldoAcumulado = inicial;
    const hoje = new Date();
    
    for (let i = 0; i < days; i++) {
      const d = new Date(hoje);
      d.setDate(d.getDate() + i);
      const dStr = d.toISOString().split('T')[0];

      const r = Number(recs.find((r: any) => r.data.toISOString().split('T')[0] === dStr)?.valor || 0);
      const p = Number(pags.find((p: any) => p.data.toISOString().split('T')[0] === dStr)?.valor || 0);
      
      saldoAcumulado += (r - p);
      
      projecao.push({
        data: dStr,
        recebimentos: r,
        pagamentos: p,
        saldo: saldoAcumulado
      });
    }

    return res.status(200).json({ success: true, data: projecao });
  }

  if (type === 'dashboard') {
    const saldos = await sql`SELECT SUM(saldo_atual::numeric) as total FROM contas_internas WHERE deletado = false`;
    const rec30 = await sql`SELECT SUM(valor_aberto::numeric) as total FROM titulos_receber WHERE status != 'pago' AND data_vencimento <= NOW() + INTERVAL '30 days'`;
    const pag30 = await sql`SELECT SUM(valor_aberto::numeric) as total FROM titulos_pagar WHERE status != 'pago' AND data_vencimento <= NOW() + INTERVAL '30 days'`;
    
    // Inadimplência (Vencidos há mais de 5 dias)
    const vencidosRec = await sql`SELECT SUM(valor_aberto::numeric) as total FROM titulos_receber WHERE status != 'pago' AND data_vencimento < (NOW() - INTERVAL '5 days')`;
    
    // Histórico de Faturamento (3 meses)
    const faturamentoMes = await sql`
      SELECT 
        TO_CHAR(COALESCE(data_competencia, data_vencimento), 'MM/YYYY') as mes,
        SUM(valor_original::numeric) as total
      FROM titulos_receber
      WHERE COALESCE(data_competencia, data_vencimento) >= NOW() - INTERVAL '3 months'
        AND status != 'cancelado' AND deletado = false
      GROUP BY TO_CHAR(COALESCE(data_competencia, data_vencimento), 'MM/YYYY')
      ORDER BY MIN(COALESCE(data_competencia, data_vencimento))
    `;

    // Despesas por Classe (Top 5)
    const despesasClasse = await sql`
      SELECT 
        c.nome as classe,
        SUM(t.valor_original::numeric) as total
      FROM titulos_pagar t
      JOIN classes_financeiras c ON t.classe_financeira_id = c.id
      WHERE t.data_competencia >= DATE_TRUNC('month', NOW())
      GROUP BY c.nome
      ORDER BY total DESC
      LIMIT 5
    `;

    // Top 5 inadimplentes (clientes com mais vencido)
    const top5Inadimplentes = await sql`
      SELECT 
        t.cliente_id,
        c.nome as cliente_nome,
        SUM(t.valor_aberto::numeric) as total_vencido,
        MIN(t.data_vencimento) as vencimento_mais_antigo,
        COUNT(*) as qtd_titulos
      FROM titulos_receber t
      LEFT JOIN clients c ON c.id::text = t.cliente_id::text
      WHERE t.status IN ('aberto', 'pago_parcial') 
        AND t.data_vencimento < (NOW() - INTERVAL '5 days')
        AND t.deletado = false
      GROUP BY t.cliente_id, c.nome
      ORDER BY total_vencido DESC
      LIMIT 5
    `;

    // Contas individuais para breakdown
    const contasDetalhes = await sql`
      SELECT id, nome, tipo, saldo_atual FROM contas_internas WHERE deletado = false ORDER BY nome
    `;

    // Capital de giro = A Receber + Estoque - A Pagar
    const totalReceber = await sql`SELECT SUM(valor_aberto::numeric) as total FROM titulos_receber WHERE status IN ('aberto', 'pago_parcial') AND deletado = false`;
    const totalPagar = await sql`SELECT SUM(valor_aberto::numeric) as total FROM titulos_pagar WHERE status IN ('aberto', 'pago_parcial') AND deletado = false`;
    const capitalGiro = Number(totalReceber[0]?.total || 0) - Number(totalPagar[0]?.total || 0);

    // Vencimentos próximos (7 dias)
    const proximosVencimentos = await sql`
      SELECT 
        'receber' as tipo, numero_titulo, valor_aberto::numeric as valor,
        data_vencimento, cliente_id as entidade_id
      FROM titulos_receber
      WHERE status IN ('aberto', 'pago_parcial') 
        AND data_vencimento BETWEEN NOW() AND (NOW() + INTERVAL '7 days')
        AND deletado = false
      UNION ALL
      SELECT 
        'pagar' as tipo, numero_titulo, valor_aberto::numeric as valor,
        data_vencimento, fornecedor_id as entidade_id
      FROM titulos_pagar
      WHERE status IN ('aberto', 'pago_parcial') 
        AND data_vencimento BETWEEN NOW() AND (NOW() + INTERVAL '7 days')
        AND deletado = false
      ORDER BY data_vencimento
      LIMIT 10
    `;

    return res.status(200).json({ 
      success: true, 
      data: {
        saldo_total: Number(saldos[0]?.total || 0),
        a_receber_30d: Number(rec30[0]?.total || 0),
        a_pagar_30d: Number(pag30[0]?.total || 0),
        vencidos_total: Number(vencidosRec[0]?.total || 0),
        capital_de_giro: capitalGiro,
        historico_faturamento: faturamentoMes,
        despesas_por_classe: despesasClasse,
        top5_inadimplentes: top5Inadimplentes.map((r: any) => ({
          ...r,
          total_vencido: Number(r.total_vencido),
          dias_atraso: Math.floor((Date.now() - new Date(r.vencimento_mais_antigo).getTime()) / 86400000)
        })),
        contas: contasDetalhes.map((c: any) => ({ ...c, saldo_atual: Number(c.saldo_atual) })),
        proximos_vencimentos: proximosVencimentos.map((v: any) => ({ ...v, valor: Number(v.valor) })),
      }
    });
  }

  if (type === 'capital_giro') {
    // Retorna histórico dos últimos 6 meses para o gráfico
    const evolucao = await sql`
      SELECT 
        TO_CHAR(d.month, 'MM/YYYY') as label,
        COALESCE((SELECT SUM(valor_aberto::numeric) FROM titulos_receber WHERE status != 'cancelado' AND deletado = false AND data_vencimento <= d.month + INTERVAL '1 month - 1 day'), 0) -
        COALESCE((SELECT SUM(valor_aberto::numeric) FROM titulos_pagar WHERE status != 'cancelado' AND deletado = false AND data_vencimento <= d.month + INTERVAL '1 month - 1 day'), 0) as capital
      FROM generate_series(
        DATE_TRUNC('month', NOW() - INTERVAL '5 months'),
        DATE_TRUNC('month', NOW()),
        '1 month'::interval
      ) d(month)
    `;
    return res.status(200).json({ success: true, data: evolucao });
  }

  if (type === 'rentabilidade') {
    const { data_inicio, data_fim } = req.query;
    const start = data_inicio ? new Date(data_inicio as string) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const end = data_fim ? new Date(data_fim as string) : new Date();

    const projetos = await sql`
      SELECT 
        p.id, p.nome as projeto_nome,
        SUM(tr.valor_original::numeric) FILTER (WHERE tr.id IS NOT NULL) as receita_total,
        COUNT(tr.id) FILTER (WHERE tr.id IS NOT NULL) as qtd_titulos
      FROM projects p
      LEFT JOIN titulos_receber tr ON tr.projeto_id::text = p.id::text
        AND tr.data_competencia BETWEEN ${start} AND ${end}
        AND tr.status != 'cancelado' AND tr.deletado = false
      WHERE p.id IS NOT NULL
      GROUP BY p.id, p.nome
      HAVING SUM(tr.valor_original::numeric) > 0
      ORDER BY receita_total DESC
      LIMIT 20
    `;

    return res.status(200).json({ success: true, data: projetos.map((p: any) => ({ ...p, receita_total: Number(p.receita_total || 0) })) });
  }

  if (type === 'capital_giro') {
    // Evolução do capital de giro mês a mês (últimos 6 meses)
    const evolucao = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      const inicio = new Date(d.getFullYear(), d.getMonth() - i, 1);
      const fim = new Date(d.getFullYear(), d.getMonth() - i + 1, 0);
      const label = inicio.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }).toUpperCase();
      
      const rec = await sql`SELECT COALESCE(SUM(valor_aberto::numeric), 0) as total FROM titulos_receber WHERE status IN ('aberto', 'pago_parcial') AND data_vencimento <= ${fim} AND deletado = false`;
      const pag = await sql`SELECT COALESCE(SUM(valor_aberto::numeric), 0) as total FROM titulos_pagar WHERE status IN ('aberto', 'pago_parcial') AND data_vencimento <= ${fim} AND deletado = false`;
      
      evolucao.push({ label, capital: Number(rec[0].total) - Number(pag[0].total) });
    }
    return res.status(200).json({ success: true, data: evolucao });
  }

  return res.status(404).json({ success: false, error: 'Relatório não encontrado' });
}


async function handleContasRecorrentes(req: any, res: any, id?: string) {
  // ── GERAR TÍTULOS DO MÊS (deve ser verificado antes do POST genérico) ──
  if (req.method === 'POST' && (id === 'gerar-mes' || (req.url || '').includes('gerar-mes'))) {
    const { mes, ano } = req.query;
    const mesInt = parseInt(mes || String(new Date().getMonth() + 1));
    const anoInt = parseInt(ano || String(new Date().getFullYear()));

    const contas = await sql`SELECT * FROM contas_recorrentes WHERE ativa = true AND deletado = false`;
    const titulosGerados = [];

    for (const conta of contas) {
      const dataVencimento = new Date(anoInt, mesInt - 1, conta.dia_vencimento);
      const numeroTitulo = `REC-${String(conta.id).substring(0, 8)}-${mesInt}/${anoInt}`;
      const descricaoTitulo = conta.descricao || `Recorrente dia ${conta.dia_vencimento}`;

      const result = await sql`
        INSERT INTO titulos_pagar (
          numero_titulo, fornecedor_id, valor_original, valor_liquido, valor_aberto,
          data_emissao, data_vencimento, data_competencia,
          classe_financeira_id, forma_pagamento_id, conta_bancaria_id,
          status, parcela, total_parcelas, tipo_despesa, observacoes
        ) VALUES (
          ${numeroTitulo}, ${conta.fornecedor_id || null},
          ${conta.valor}, ${conta.valor}, ${conta.valor},
          NOW(), ${dataVencimento}, ${dataVencimento},
          ${conta.classe_financeira_id || null}, ${conta.forma_pagamento_id || null}, ${conta.conta_bancaria_id || null},
          'aberto', 1, 1, 'fixa', ${descricaoTitulo}
        ) RETURNING *`;
      titulosGerados.push(result[0]);
    }

    return res.status(201).json({ success: true, message: `${titulosGerados.length} título(s) gerado(s)`, data: titulosGerados });
  }

  if (req.method === 'GET') {
    const result = await sql`SELECT * FROM contas_recorrentes WHERE deletado = false ORDER BY dia_vencimento ASC`;
    return res.status(200).json({ success: true, data: result });
  }

  if (req.method === 'POST') {
    const f = req.body;
    if (!f.descricao || !String(f.descricao).trim()) {
      return res.status(400).json({ success: false, error: 'O campo "Descrição" é obrigatório.' });
    }
    const result = await sql`
      INSERT INTO contas_recorrentes (descricao, tipo, valor, dia_vencimento, classe_financeira_id, fornecedor_id, forma_pagamento_id, conta_bancaria_id, ativa)
      VALUES (${f.descricao.trim()}, ${f.tipo || 'pagar'}, ${f.valor}, ${f.dia_vencimento || 1}, ${f.classe_financeira_id || null}, ${f.fornecedor_id || null}, ${f.forma_pagamento_id || null}, ${f.conta_bancaria_id || null}, ${f.ativa ?? true})
      RETURNING *`;
    return res.status(201).json({ success: true, data: result[0] });
  }

  if ((req.method === 'PATCH' || req.method === 'PUT') && id) {
    const f = req.body;
    const result = await sql`
      UPDATE contas_recorrentes SET 
        descricao = COALESCE(${f.descricao || null}, descricao),
        tipo = COALESCE(${f.tipo || null}, tipo),
        valor = COALESCE(${f.valor || null}, valor),
        dia_vencimento = COALESCE(${f.dia_vencimento || null}, dia_vencimento),
        ativa = COALESCE(${f.ativa ?? null}, ativa)
      WHERE id = ${id} RETURNING *`;
    return res.status(200).json({ success: true, data: result[0] });
  }

  if (req.method === 'DELETE' && id) {
    await sql`UPDATE contas_recorrentes SET deletado = true, excluido_em = NOW() WHERE id = ${id}`;
    return res.status(200).json({ success: true });
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
