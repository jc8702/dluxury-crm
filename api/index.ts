import { sql, validateAuth, extractAndVerifyToken } from '../src/api-lib/_db.js';
import { calculateBOM } from '../src/api-lib/_bomEngine.js';
import { reserveStockForProject, writeOffStockForProject } from '../src/api-lib/_inventory.js';
import { runInitDB } from '../src/api-lib/_init.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { google } from '@ai-sdk/google';
import { generateText, generateObject } from 'ai';
import { z } from 'zod';

const JWT_SECRET = process.env.APP_JWT_SECRET || 'dluxury-industrial-secret-2024';

// ─── ROUTER PRINCIPAL ─────────────────────────────────────────

export default async function handler(req: any, res: any) {
  // Configuração global de CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const url = req.url || '';
  const cleanUrl = url.split('?')[0];

  try {
    if (cleanUrl.startsWith('/api/auth')) return await handleAuth(req, res);
    if (cleanUrl.startsWith('/api/clients')) return await handleClients(req, res);
    if (cleanUrl.startsWith('/api/billings')) return await handleBillings(req, res);
    if (cleanUrl.startsWith('/api/estoque')) return await handleEstoque(req, res);
    if (cleanUrl.startsWith('/api/orcamentos')) return await handleOrcamentos(req, res);
    if (cleanUrl.startsWith('/api/ai-copilot')) return await handleAICopilot(req, res);
    if (cleanUrl.startsWith('/api/condicoes-pagamento')) return await handleCondicoesPagamento(req, res);
    if (cleanUrl.startsWith('/api/goals')) return await handleGoals(req, res);
    if (cleanUrl.startsWith('/api/kanban')) return await handleKanban(req, res);
    if (cleanUrl.startsWith('/api/orcamento-tecnico')) return await handleOrcamentoTecnico(req, res);
    if (cleanUrl.startsWith('/api/projects')) return await handleProjects(req, res);
    if (cleanUrl.startsWith('/api/reports')) return await handleReports(req, res);
    if (cleanUrl.startsWith('/api/simulations')) return await handleSimulations(req, res);
    if (cleanUrl.startsWith('/api/users')) return await handleUsers(req, res);
    if (cleanUrl.startsWith('/api/init-db')) return await handleInitDB(req, res);

    return res.status(404).json({ error: 'Rota da API não encontrada', path: cleanUrl });
  } catch (err: any) {
    console.error('API Router Error:', err);
    return res.status(500).json({ error: 'Erro interno no servidor da API', details: err.message });
  }
}

// ─── HANDLERS CONSOLIDADOS ────────────────────────────────────

async function handleAuth(req: any, res: any) {
  const action = req.query.action || 'login';
  if (req.method === 'POST') {
    if (action === 'login') {
      const { email, password } = req.body;
      const normalizedEmail = String(email).trim().toLowerCase();
      const users = await sql`SELECT * FROM users WHERE email = ${normalizedEmail}`;
      if (users.length === 0) return res.status(401).json({ error: 'Usuário não encontrado' });
      const user = users[0];
      const valid = await bcrypt.compare(password, user.password_hash);
      if (!valid) return res.status(401).json({ error: 'Senha incorreta' });
      const token = jwt.sign({ id: user.id, email: user.email, role: user.role, name: user.name }, JWT_SECRET, { expiresIn: '7d' });
      return res.status(200).json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
    }
    if (action === 'register') {
      const { user: requestingUser, error } = extractAndVerifyToken(req);
      if (error || requestingUser?.role !== 'admin') return res.status(403).json({ error: 'Acesso negado' });
      const { name, email, password, role } = req.body;
      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash(password, salt);
      const result = await sql`INSERT INTO users (name, email, password_hash, role) VALUES (${name}, ${email}, ${hash}, ${role}) RETURNING id, name, email, role`;
      return res.status(201).json(result[0]);
    }
  }
  if (req.method === 'GET' && action === 'me') {
    const { user, error } = extractAndVerifyToken(req);
    if (error) return res.status(401).json({ error });
    return res.status(200).json({ user });
  }
  return res.status(405).end();
}

async function handleClients(req: any, res: any) {
  const { authorized, error } = validateAuth(req);
  if (!authorized) return res.status(401).json({ error });
  if (req.method === 'GET') {
    const result = await sql`SELECT * FROM clients ORDER BY created_at DESC`;
    return res.status(200).json(result);
  }
  if (req.method === 'POST') {
    const { nome, cpf, telefone, email, endereco, bairro, cidade, uf, tipo_imovel, comodos_interesse, origem, observacoes, status, razao_social } = req.body;
    const comodosStr = Array.isArray(comodos_interesse) ? comodos_interesse.join(', ') : (comodos_interesse || '');
    const result = await sql`INSERT INTO clients (nome, cpf, telefone, email, endereco, bairro, cidade, uf, tipo_imovel, comodos_interesse, origem, observacoes, status, razao_social, cnpj, municipio, situacao_cadastral) VALUES (${nome}, ${cpf}, ${telefone}, ${email}, ${endereco}, ${bairro}, ${cidade}, ${uf}, ${tipo_imovel}, ${comodosStr}, ${origem}, ${observacoes}, ${status || 'ativo'}, ${razao_social || nome}, ${cpf}, ${cidade}, ${status === 'ativo' ? 'ATIVA' : 'INATIVA'}) RETURNING *`;
    return res.status(201).json(result[0]);
  }
  if (req.method === 'PATCH') {
    const { id } = req.query;
    const f = req.body;
    const comodosStr = Array.isArray(f.comodos_interesse) ? f.comodos_interesse.join(', ') : (f.comodos_interesse || null);
    const result = await sql`UPDATE clients SET nome = COALESCE(${f.nome}, nome), cpf = COALESCE(${f.cpf}, cpf), telefone = COALESCE(${f.telefone}, telefone), email = COALESCE(${f.email}, email), endereco = COALESCE(${f.endereco}, endereco), bairro = COALESCE(${f.bairro}, bairro), cidade = COALESCE(${f.cidade}, cidade), uf = COALESCE(${f.uf}, uf), tipo_imovel = COALESCE(${f.tipo_imovel}, tipo_imovel), comodos_interesse = COALESCE(${comodosStr}, comodos_interesse), origem = COALESCE(${f.origem}, origem), observacoes = COALESCE(${f.observacoes}, observacoes), status = COALESCE(${f.status}, status), razao_social = COALESCE(${f.razao_social}, razao_social) WHERE id = ${id} RETURNING *`;
    return res.status(200).json(result[0]);
  }
  if (req.method === 'DELETE') {
    await sql`DELETE FROM clients WHERE id = ${req.query.id}`;
    return res.status(200).json({ success: true });
  }
  return res.status(405).end();
}

async function handleBillings(req: any, res: any) {
  const { authorized } = validateAuth(req);
  if (req.method !== 'GET' && !authorized) return res.status(401).json({ error: 'Não autorizado' });
  if (req.method === 'GET') {
    const result = await sql`SELECT * FROM billings ORDER BY data DESC, id DESC`;
    return res.status(200).json(result);
  }
  if (req.method === 'POST') {
    const f = req.body;
    const result = await sql`INSERT INTO billings (descricao, tipo, project_id, valor, data, categoria, status, nf, pedido, cliente) VALUES (${f.descricao || f.nf || ''}, ${f.tipo || 'entrada'}, ${f.projectId || null}, ${f.valor}, ${f.data}, ${f.categoria || 'outros'}, ${f.status || 'PAGO'}, ${f.nf || f.descricao || ''}, ${f.pedido || '-'}, ${f.cliente || '-'}) RETURNING *`;
    return res.status(201).json(result[0]);
  }
  if (req.method === 'PATCH') {
    const f = req.body;
    const result = await sql`UPDATE billings SET descricao = COALESCE(${f.descricao}, descricao), tipo = COALESCE(${f.tipo}, tipo), valor = COALESCE(${f.valor}, valor), data = COALESCE(${f.data}, data), categoria = COALESCE(${f.categoria}, categoria), status = COALESCE(${f.status}, status), project_id = COALESCE(${f.projectId}, project_id), cliente = COALESCE(${f.cliente}, cliente) WHERE id = ${req.query.id} RETURNING *`;
    return res.status(200).json(result[0]);
  }
  if (req.method === 'DELETE') {
    await sql`DELETE FROM billings WHERE id = ${req.query.id}`;
    return res.status(200).json({ success: true });
  }
  return res.status(405).end();
}

async function handleEstoque(req: any, res: any) {
  const { user, error } = extractAndVerifyToken(req);
  if (error) return res.status(401).json({ error });
  const { method } = req;
  const { id, type } = req.query;

  if (type === 'movimentacoes') {
    if (method === 'GET') {
      const { material_id, limit: ql } = req.query;
      const lim = Number(ql) || 100;
      const res = material_id ? await sql`SELECT mov.*, m.nome as material_nome FROM movimentacoes_estoque mov LEFT JOIN materiais m ON mov.material_id = m.id WHERE mov.material_id = ${material_id} ORDER BY mov.criado_em DESC LIMIT ${lim}` : await sql`SELECT mov.*, m.nome as material_nome FROM movimentacoes_estoque mov LEFT JOIN materiais m ON mov.material_id = m.id ORDER BY mov.criado_em DESC LIMIT ${lim}`;
      return res.status(200).json(res);
    }
    if (method === 'POST') {
      const { material_id, tipo, quantidade, motivo, projeto_id, orcamento_id, preco_unitario } = req.body;
      const mRes = await sql`SELECT estoque_atual, fator_conversao, preco_custo FROM materiais WHERE id = ${material_id}`;
      if (!mRes.length) throw new Error('Material não encontrado');
      const mat = mRes[0];
      let estD = Number(mat.estoque_atual);
      if (tipo === 'entrada') estD += Number(quantidade);
      else if (tipo === 'saida') estD -= Number(quantidade);
      else if (tipo === 'ajuste') estD = Number(quantidade);
      if (estD < 0 && tipo === 'saida') throw new Error('Estoque insuficiente');
      const mov = await sql`INSERT INTO movimentacoes_estoque (material_id, tipo, quantidade, quantidade_uso, motivo, projeto_id, orcamento_id, preco_unitario, valor_total, estoque_antes, estoque_depois, criado_por) VALUES (${material_id}, ${tipo}, ${quantidade}, ${Number(quantidade) * Number(mat.fator_conversao)}, ${motivo}, ${projeto_id || null}, ${orcamento_id || null}, ${preco_unitario || mat.preco_custo}, ${Number(quantidade) * (preco_unitario || Number(mat.preco_custo))}, ${mat.estoque_atual}, ${estD}, ${user.name}) RETURNING *`;
      await sql`UPDATE materiais SET estoque_atual = ${estD}, preco_custo = ${tipo === 'entrada' ? (preco_unitario || mat.preco_custo) : mat.preco_custo}, atualizado_em = CURRENT_TIMESTAMP WHERE id = ${material_id}`;
      return res.status(201).json(mov[0]);
    }
  }

  if (type === 'fornecedores') {
    if (method === 'GET') return res.status(200).json(id ? (await sql`SELECT * FROM fornecedores WHERE id = ${id}`)[0] : await sql`SELECT * FROM fornecedores WHERE ativo = true ORDER BY nome ASC`);
    if (method === 'POST') {
      const f = req.body;
      const r = await sql`INSERT INTO fornecedores (nome, cnpj, contato, telefone, email, cidade, estado, observacoes) VALUES (${f.nome}, ${f.cnpj}, ${f.contato}, ${f.telefone}, ${f.email}, ${f.cidade}, ${f.estado}, ${f.observacoes}) RETURNING *`;
      return res.status(201).json(r[0]);
    }
    if (method === 'PATCH') {
      const f = req.body;
      const r = await sql`UPDATE fornecedores SET nome = ${f.nome}, cnpj = ${f.cnpj}, contato = ${f.contato}, telefone = ${f.telefone}, email = ${f.email}, cidade = ${f.cidade}, estado = ${f.estado}, observacoes = ${f.observacoes} WHERE id = ${id} RETURNING *`;
      return res.status(200).json(r[0]);
    }
    if (method === 'DELETE') {
      if (user.role !== 'admin') return res.status(403).json({ error: 'Acesso negado' });
      await sql`UPDATE fornecedores SET ativo = false WHERE id = ${id}`;
      return res.status(200).json({ success: true });
    }
  }

  if (type === 'categories') {
    if (method === 'GET') return res.status(200).json(await sql`SELECT * FROM categorias_material ORDER BY nome ASC`);
    if (method === 'POST') return res.status(201).json((await sql`INSERT INTO categorias_material (nome, slug, icone) VALUES (${req.body.nome}, ${req.body.slug}, ${req.body.icone}) RETURNING *`)[0]);
  }

  if (method === 'GET') {
    if (id) {
      const mat = await sql`SELECT m.*, c.nome as categoria_nome FROM materiais m LEFT JOIN categorias_material c ON m.categoria_id = c.id WHERE m.id = ${id}`;
      const movs = await sql`SELECT * FROM movimentacoes_estoque WHERE material_id = ${id} ORDER BY criado_em DESC LIMIT 50`;
      return res.status(200).json({ ...mat[0], movements: movs });
    }
    return res.status(200).json(await sql`SELECT m.*, c.nome as categoria_nome FROM materiais m LEFT JOIN categorias_material c ON m.categoria_id = c.id WHERE m.ativo = true ORDER BY m.nome ASC`);
  }

  if (method === 'POST' || method === 'PATCH') {
    const f = req.body;
    if (method === 'POST') {
      const r = await sql`INSERT INTO materiais (sku, nome, descricao, categoria_id, subcategoria, unidade_compra, unidade_uso, fator_conversao, estoque_minimo, preco_custo, fornecedor_principal, observacoes, cfop, ncm, largura_mm, altura_mm, preco_venda, margem_lucro, icms, icms_st, ipi, pis, cofins, origem, marca) VALUES (${f.sku}, ${f.nome}, ${f.descricao}, ${f.categoria_id}, ${f.subcategoria}, ${f.unidade_compra}, ${f.unidade_uso}, ${f.fator_conversao}, ${f.estoque_minimo}, ${f.preco_custo}, ${f.fornecedor_principal}, ${f.observacoes}, ${f.cfop}, ${f.ncm}, ${f.largura_mm}, ${f.altura_mm}, ${f.preco_venda}, ${f.margem_lucro}, ${f.icms}, ${f.icms_st}, ${f.ipi}, ${f.pis}, ${f.cofins}, ${f.origem}, ${f.marca}) RETURNING *`;
      return res.status(201).json(r[0]);
    }
    const r = await sql`UPDATE materiais SET sku = ${f.sku}, nome = ${f.nome}, descricao = ${f.descricao}, categoria_id = ${f.categoria_id}, subcategoria = ${f.subcategoria}, unidade_compra = ${f.unidade_compra}, unidade_uso = ${f.unidade_uso}, fator_conversao = ${f.fator_conversao}, estoque_minimo = ${f.estoque_minimo}, preco_custo = ${f.preco_custo}, fornecedor_principal = ${f.fornecedor_principal}, observacoes = ${f.observacoes}, cfop = ${f.cfop}, ncm = ${f.ncm}, largura_mm = ${f.largura_mm}, altura_mm = ${f.altura_mm}, preco_venda = ${f.preco_venda}, margem_lucro = ${f.margem_lucro}, icms = ${f.icms}, icms_st = ${f.icms_st}, ipi = ${f.ipi}, pis = ${f.pis}, cofins = ${f.cofins}, origem = ${f.origem}, marca = ${f.marca}, atualizado_em = CURRENT_TIMESTAMP WHERE id = ${id} RETURNING *`;
    return res.status(200).json(r[0]);
  }

  if (method === 'DELETE') {
    if (user.role !== 'admin') return res.status(403).json({ error: 'Acesso negado' });
    await sql`UPDATE materiais SET ativo = false WHERE id = ${id}`;
    return res.status(200).json({ success: true });
  }
}

async function handleOrcamentos(req: any, res: any) {
  const { authorized, error } = validateAuth(req);
  if (!authorized) return res.status(401).json({ error });
  const { id } = req.query;

  if (req.method === 'GET') {
    if (id) {
      const orc = (await sql`SELECT * FROM orcamentos WHERE id = ${id}`)[0];
      const itms = await sql`SELECT * FROM itens_orcamento WHERE orcamento_id = ${id} ORDER BY id ASC`;
      return res.status(200).json({ ...orc, itens: itms });
    }
    return res.status(200).json(await sql`SELECT o.*, c.nome as cliente_nome FROM orcamentos o LEFT JOIN clients c ON o.cliente_id::text = c.id::text ORDER BY o.criado_em DESC`);
  }

  if (req.method === 'POST') {
    const f = req.body;
    const year = new Date().getFullYear();
    const last = await sql`SELECT numero FROM orcamentos WHERE numero LIKE ${`ORC-${year}-%`} ORDER BY numero DESC LIMIT 1`;
    const num = `ORC-${year}-${(last.length ? (parseInt(last[0].numero.split('-')[2]) + 1) : 1).toString().padStart(3, '0')}`;
    const orc = await sql`INSERT INTO orcamentos (cliente_id, projeto_id, numero, status, valor_base, taxa_mensal, condicao_pagamento_id, valor_final, prazo_entrega_dias, prazo_tipo, adicional_urgencia_pct, observacoes, materiais_consumidos) VALUES (${f.cliente_id}, ${f.projeto_id || null}, ${num}, ${f.status || 'rascunho'}, ${f.valor_base}, ${f.taxa_mensal}, ${f.condicao_pagamento_id}, ${f.valor_final}, ${f.prazo_entrega_dias}, ${f.prazo_tipo || 'padrao'}, ${f.adicional_urgencia_pct}, ${f.observacoes}, ${f.materiais_consumidos ? JSON.stringify(f.materiais_consumidos) : '[]'}::jsonb) RETURNING *`;
    const orcId = orc[0].id;
    if (Array.isArray(f.itens)) {
      for (const itm of f.itens) {
        await sql`INSERT INTO itens_orcamento (orcamento_id, descricao, ambiente, largura_cm, altura_cm, profundidade_cm, material, acabamento, quantidade, valor_unitario, valor_total) VALUES (${orcId}, ${itm.descricao}, ${itm.ambiente}, ${itm.largura_cm}, ${itm.altura_cm}, ${itm.profundidade_cm}, ${itm.material}, ${itm.acabamento}, ${itm.quantidade || 1}, ${itm.valor_unitario}, ${itm.valor_total})`;
      }
    }
    return res.status(201).json({ ...orc[0], itens: f.itens });
  }

  if (req.method === 'PATCH') {
    const f = req.body;
    const orc = await sql`UPDATE orcamentos SET status = COALESCE(${f.status}, status), valor_base = COALESCE(${f.valor_base}, valor_base), taxa_mensal = COALESCE(${f.taxa_mensal}, taxa_mensal), condicao_pagamento_id = COALESCE(${f.condicao_pagamento_id}, condicao_pagamento_id), valor_final = COALESCE(${f.valor_final}, valor_final), prazo_entrega_dias = COALESCE(${f.prazo_entrega_dias}, prazo_entrega_dias), prazo_tipo = COALESCE(${f.prazo_tipo}, prazo_tipo), adicional_urgencia_pct = COALESCE(${f.adicional_urgencia_pct}, adicional_urgencia_pct), observacoes = COALESCE(${f.observacoes}, observacoes), materiais_consumidos = COALESCE(${f.materiais_consumidos ? JSON.stringify(f.materiais_consumidos) : null}::jsonb, materiais_consumidos), atualizado_em = NOW() WHERE id = ${id} RETURNING *`;
    if (Array.isArray(f.itens)) {
      await sql`DELETE FROM itens_orcamento WHERE orcamento_id = ${id}`;
      for (const itm of f.itens) {
        await sql`INSERT INTO itens_orcamento (orcamento_id, descricao, ambiente, largura_cm, altura_cm, profundidade_cm, material, acabamento, quantidade, valor_unitario, valor_total) VALUES (${id}, ${itm.descricao}, ${itm.ambiente}, ${itm.largura_cm}, ${itm.altura_cm}, ${itm.profundidade_cm}, ${itm.material}, ${itm.acabamento}, ${itm.quantidade || 1}, ${itm.valor_unitario}, ${itm.valor_total})`;
      }
    }
    if (f.status === 'aprovado') {
      const itms = await sql`SELECT * FROM itens_orcamento WHERE orcamento_id = ${id} AND erp_product_id IS NOT NULL`;
      for (const itm of itms) {
        const bom = await sql`SELECT * FROM erp_product_bom WHERE product_id = ${itm.erp_product_id}`;
        if (bom.length) {
          const results = await calculateBOM(itm.erp_parametros, bom as any);
          const pItem = await sql`INSERT INTO erp_project_items (project_id, product_id, label, parametros_definidos, status) VALUES (${orc[0].projeto_id || id}, ${itm.erp_product_id}, ${itm.descricao}, ${itm.erp_parametros}, 'aprovado') RETURNING id`;
          for (const r of results) {
            await sql`INSERT INTO erp_consumption_results (project_item_id, sku_id, quantidade_liquida, quantidade_com_perda) VALUES (${pItem[0].id}, ${r.sku_id}, ${r.quantidade_liquida}, ${r.quantidade_com_perda})`;
          }
          await reserveStockForProject(pItem[0].id);
        }
      }
    }
    return res.status(200).json({ ...orc[0], itens: f.itens });
  }

  if (req.method === 'DELETE') {
    await sql`DELETE FROM orcamentos WHERE id = ${id}`;
    return res.status(200).json({ success: true });
  }
}

import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateText, generateObject, tool } from 'ai';
import { z } from 'zod';

const aiApiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GOOGLE_GENERATION_AI_API_KEY;
const google = createGoogleGenerativeAI({ 
  apiKey: aiApiKey,
});

// Cadeia de modelos Super Atualizada para Fallback (Com base no Raio-X)
const modelFlash = google('gemini-2.5-flash'); // Modelo ultra-rápido confirmado na sua chave
const modelPro = google('gemini-2.5-pro');     // Modelo pesado/inteligente confirmado na sua chave
const modelLegacy = google('gemini-flash-latest'); // Fallback garantido que apareceu na lista

async function listAvailableModels(key: string) {
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
    const data = await res.json();
    if (data.models) return data.models.map((m: any) => m.name.replace('models/', '')).join(', ');
    return 'Nenhum (Chave inválida ou sem permissão)';
  } catch (e) {
    return 'Erro ao consultar Google AI';
  }
}

async function generateBOM(payload: any) {
  const materiais = await sql`SELECT id, nome, categoria_id, preco_custo, unidade_uso FROM materiais WHERE ativo = true`;
  try {
    const { object } = await generateObject({
      model: modelPro,
      schema: z.object({
        itens: z.array(z.object({
          material_id: z.string().uuid().optional(),
          descricao: z.string(),
          quantidade: z.number(),
          dimensoes: z.string().optional(),
          justificativa: z.string()
        })),
        estimativa_custo_total: z.number(),
        dificuldade_producao: z.enum(['baixa', 'media', 'alta'])
      }),
      prompt: `Gere uma lista de materiais (BOM) para: ${payload.tipo} (Dimensões: L:${payload.medidas.L}, A:${payload.medidas.A}, P:${payload.medidas.P}). Materiais: ${JSON.stringify(materiais)}`
    });
    return object;
  } catch (error) {
    console.warn("Fallback on generateBOM due to error.");
    return { itens: [], estimativa_custo_total: 0, dificuldade_producao: 'media' };
  }
}

async function auditSKU(payload: any) {
  const existentes = await sql`SELECT nome, descricao, categoria_id FROM materiais WHERE ativo = true`;
  try {
    const { object } = await generateObject({
      model: modelPro,
      schema: z.object({
        is_duplicado: z.boolean(),
        similaridade_pct: z.number(),
        item_conflitante: z.string().optional(),
        categoria_sugerida: z.string(),
        recomendacao: z.string()
      }),
      prompt: `Verifique se o SKU "${payload.nome}" (${payload.descricao}) é duplicado. Itens: ${JSON.stringify(existentes)}`
    });
    return object;
  } catch (err) {
    return { is_duplicado: false, similaridade_pct: 0, categoria_sugerida: 'Geral', recomendacao: 'Falha na validação IA.' };
  }
}

async function purchaseSuggestion() {
  const estoque = await sql`
    SELECT m.nome, m.estoque_atual, m.estoque_minimo, m.unidade_compra,
           (SELECT COUNT(*) FROM movimentacoes_estoque WHERE material_id = m.id AND tipo = 'saida' AND criado_em > NOW() - INTERVAL '30 days') as consumo_30d
    FROM materiais m WHERE m.ativo = true AND m.estoque_atual <= m.estoque_minimo * 1.5
  `;
  try {
    const { object } = await generateObject({
      model: modelPro,
      schema: z.object({
        pedidos_sugeridos: z.array(z.object({
          material: z.string(),
          quantidade_sugerida: z.number(),
          prioridade: z.enum(['critica', 'alta', 'media']),
          motivo: z.string()
        }))
      }),
      prompt: `Analise o estoque e sugira compras: ${JSON.stringify(estoque)}`
    });
    return object;
  } catch(e) { return { pedidos_sugeridos: [] }; }
}

async function detectAnomalies() {
  const dados = await sql`
    SELECT m.nome, m.preco_custo, 
           (SELECT AVG(quantidade) FROM movimentacoes_estoque WHERE material_id = m.id AND tipo = 'saida') as media_saida
    FROM materiais m WHERE m.ativo = true
  `;
  try {
    const { object } = await generateObject({
      model: modelPro,
      schema: z.object({
        anomalias: z.array(z.object({ item: z.string(), tipo_anomalia: z.string(), gravidade: z.enum(['baixa', 'media', 'critica']), detalhes: z.string() }))
      }),
      prompt: `Identifique anomalias nos dados: ${JSON.stringify(dados)}`
    });
    return object;
  } catch(e) { return { anomalias: [] }; }
}

const chatTools = {
  cadastrarProjeto: tool({
    description: 'Cadastra um novo projeto, lead ou oportunidade no sistema do CRM para um cliente',
    parameters: z.object({
      client_name: z.string().describe('Nome do cliente interessado'),
      ambiente: z.string().describe('Nome do ambiente principal (ex: Cozinha Planejada)'),
      descricao: z.string().describe('Breve descrição do escopo do projeto'),
    }),
    execute: async (args) => {
      // Inserção com dados base. Os demais campos (valor, prazo) ficam nulos para preenchimento humano posterior
      try {
        const r = await sql`INSERT INTO projects (client_name, ambiente, descricao, status, valor_estimado, valor_final) VALUES (${args.client_name}, ${args.ambiente}, ${args.descricao}, 'lead', 0, 0) RETURNING id`;
        return { success: true, project_id: r[0].id, message: `Projeto estruturado e salvo com ID ${r[0].id}` };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }
  }),
  cadastrarMaterial: tool({
    description: 'Cadastra um novo item de material solto no estoque/catálogo. O sistema irá gerar um SKU automaticamente.',
    parameters: z.object({
      nome: z.string().describe('Nome curto do material (ex: Dobradiça Curva HD)'),
      descricao: z.string().describe('Descrição estendida técnica do material'),
      unidade_uso: z.string().describe('Unidade de medida padrão para uso e compra (ex: UN, MT, M2, CX)'),
      preco_custo: z.number().describe('Preço de custo unitário base (usar 0 se não souber)')
    }),
    execute: async (args) => {
      try {
        // Gera o SKU Sequencial
        const lastSkuQuery = await sql`SELECT sku FROM materiais ORDER BY id DESC LIMIT 1`;
        let proximoSku = 'SKU-0001';
        if (lastSkuQuery.length > 0 && lastSkuQuery[0].sku) {
           const match = lastSkuQuery[0].sku.match(/\d+/);
           if (match) {
              proximoSku = `SKU-${(parseInt(match[0], 10) + 1).toString().padStart(4, '0')}`;
           }
        }
        
        // Inserção tolerante no banco. Categoria null pois o usuário terá que classificar visualmente.
        const r = await sql`INSERT INTO materiais (sku, nome, descricao, unidade_uso, unidade_compra, preco_custo, margem_lucro, preco_venda, categoria_id, ativo) VALUES (${proximoSku}, ${args.nome}, ${args.descricao}, ${args.unidade_uso}, ${args.unidade_uso}, ${args.preco_custo}, 50, ${args.preco_custo * 1.5}, null, true) RETURNING id`;
        return { success: true, sku_gerado: proximoSku, material_id: r[0].id, message: `Material ${args.nome} inserido com SKU ${proximoSku}` };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }
  })
};

async function generateChatResponse(payload: any) {
  const promptText = `Você é o D'Luxury Copilot, uma IA integrada com acesso vivo ao CRM. Responda dúvidas, converse, e se o usuário pedir para CADASTRAR UM MATERIAL ou CADASTRAR UM PROJETO, use a tool correspondente e confirme para ele a conclusão informando os dados (como o SKU). Se faltar algo obrigatório, use o placeholder genérico ou 0, e avise o usuário para editar. Histórico: ${JSON.stringify(payload.history || [])}. Usuário: ${payload.message}`;
  
  const aiConfig = { tools: chatTools, maxSteps: 5, prompt: promptText };

  try {
    const { text } = await generateText({ model: modelFlash, ...aiConfig });
    return { content: text };
  } catch (errorFlash: any) {
    try {
      const { text } = await generateText({ model: modelPro, ...aiConfig });
      return { content: text };
    } catch (errorPro: any) {
      try {
         // Fallback Legacy (Sem agent steps pois v1 não suporta tool array dinâmico às vezes)
         const { text } = await generateText({ model: modelLegacy, prompt: promptText });
         return { content: text };
      } catch (errorLegacy: any) {
         const modelosDisponiveis = await listAvailableModels(aiApiKey as string);
         throw new Error(`Falha nos 3 modelos (Flash, Pro, Legacy). A sua Vercel está com permissão para estes modelos do Google: [${modelosDisponiveis}]. Erro original: ${errorLegacy.message}`);
      }
    }
  }
}

async function handleAICopilot(req: any, res: any) {
  const { authorized, error } = validateAuth(req);
  if (!authorized) return res.status(401).json({ error });
  if (req.method !== 'POST') return res.status(405).end();
  
  const { skill, payload } = req.body;
  if (!aiApiKey) return res.status(500).json({ error: 'Configuração de IA (API Key) ausente' });

  try {
    switch (skill) {
      case 'chat': return res.status(200).json(await generateChatResponse(payload));
      case 'generate-bom': return res.status(200).json(await generateBOM(payload));
      case 'audit-sku': return res.status(200).json(await auditSKU(payload));
      case 'purchase-suggestion': return res.status(200).json(await purchaseSuggestion());
      case 'detect-anomalies': return res.status(200).json(await detectAnomalies());
      default: return res.status(400).json({ error: 'Skill de IA não reconhecida' });
    }
  } catch (err: any) {
    console.error('AI Copilot Error:', err);
    return res.status(500).json({ error: 'Erro ao processar inteligência', details: err.message });
  }
}

async function handleCondicoesPagamento(req: any, res: any) {
  const { authorized, error } = validateAuth(req);
  if (!authorized) return res.status(401).json({ error });
  if (req.method === 'GET') return res.status(200).json(await sql`SELECT * FROM condicoes_pagamento WHERE ativo = true ORDER BY n_parcelas ASC`);
  if (req.method === 'POST') return res.status(201).json((await sql`INSERT INTO condicoes_pagamento (nome, n_parcelas) VALUES (${req.body.nome}, ${req.body.n_parcelas}) RETURNING *`)[0]);
  if (req.method === 'PATCH') return res.status(200).json((await sql`UPDATE condicoes_pagamento SET nome = COALESCE(${req.body.nome}, nome), n_parcelas = COALESCE(${req.body.n_parcelas}, n_parcelas), ativo = COALESCE(${req.body.ativo}, ativo) WHERE id = ${req.query.id} RETURNING *`)[0]);
  if (req.method === 'DELETE') { await sql`DELETE FROM condicoes_pagamento WHERE id = ${req.query.id}`; return res.status(200).json({ success: true }); }
}

async function handleGoals(req: any, res: any) {
  const { authorized, error } = validateAuth(req);
  if (!authorized) return res.status(401).json({ error });
  if (req.method === 'GET') {
    const result = await sql`SELECT period, amount FROM monthly_goals ORDER BY period ASC`;
    const goals: Record<string, number> = {};
    result.forEach((r: any) => goals[r.period] = parseFloat(r.amount));
    return res.status(200).json(goals);
  }
  if (req.method === 'POST') {
    const r = await sql`INSERT INTO monthly_goals (period, amount) VALUES (${req.body.period}, ${req.body.amount}) ON CONFLICT (period) DO UPDATE SET amount = ${req.body.amount}, updated_at = CURRENT_TIMESTAMP RETURNING *`;
    return res.status(200).json(r[0]);
  }
}

async function handleKanban(req: any, res: any) {
  const { authorized } = validateAuth(req);
  if (req.method !== 'GET' && !authorized) return res.status(401).json({ error: 'Não autorizado' });
  if (req.method === 'GET') return res.status(200).json(await sql`SELECT * FROM kanban_items ORDER BY updated_at DESC`);
  if (req.method === 'POST') {
    const f = req.body;
    const r = await sql`INSERT INTO kanban_items (title, subtitle, label, status, type, contact_name, contact_role, email, phone, city, state, value, temperature, visit_date, visit_time, visit_type, observations) VALUES (${f.title}, ${f.subtitle}, ${f.label}, ${f.status}, ${f.type}, ${f.contact_name}, ${f.contact_role}, ${f.email}, ${f.phone}, ${f.city}, ${f.state}, ${f.value}, ${f.temperature}, ${f.visit_date}, ${f.visit_time}, ${f.visit_type}, ${f.observations}) RETURNING *`;
    return res.status(201).json(r[0]);
  }
  if (req.method === 'PATCH' || req.method === 'PUT') return res.status(200).json((await sql`UPDATE kanban_items SET status = ${req.body.status}, updated_at = CURRENT_TIMESTAMP WHERE id = ${req.query.id} RETURNING *`)[0]);
}

async function handleOrcamentoTecnico(req: any, res: any) {
  const { authorized, error } = validateAuth(req);
  if (!authorized) return res.status(401).json({ error });
  const { type, id, orcamento_id, ambiente_id, movel_id } = req.query;

  if (req.method === 'GET') {
    if (type === 'config') return res.status(200).json((await sql`SELECT * FROM configuracoes_precificacao LIMIT 1`)[0] || {});
    if (orcamento_id && type === 'tree') {
      const ambs = await sql`SELECT * FROM orcamento_ambientes WHERE orcamento_id = ${orcamento_id} ORDER BY ordem ASC`;
      for (const amb of ambs) {
        amb.moveis = await sql`SELECT * FROM orcamento_moveis WHERE ambiente_id = ${amb.id} ORDER BY ordem ASC`;
        for (const mov of amb.moveis) {
          mov.pecas = await sql`SELECT * FROM orcamento_pecas WHERE movel_id = ${mov.id} ORDER BY criado_em ASC`;
          mov.ferragens = await sql`SELECT * FROM orcamento_ferragens WHERE movel_id = ${mov.id} ORDER BY criado_em ASC`;
        }
      }
      return res.status(200).json({ ambientes: ambs, extras: await sql`SELECT * FROM orcamento_custos_extras WHERE orcamento_id = ${orcamento_id} ORDER BY criado_em ASC` });
    }
  }
  if (req.method === 'POST') {
    const f = req.body;
    if (type === 'ambiente') return res.status(201).json((await sql`INSERT INTO orcamento_ambientes (orcamento_id, nome, ordem) VALUES (${orcamento_id}, ${f.nome}, ${f.ordem || 0}) RETURNING *`)[0]);
    if (type === 'movel') return res.status(201).json((await sql`INSERT INTO orcamento_moveis (ambiente_id, nome, tipo_movel, largura_total_cm, altura_total_cm, profundidade_total_cm, observacoes, ordem) VALUES (${ambiente_id}, ${f.nome}, ${f.tipo_movel}, ${f.largura_total_cm}, ${f.altura_total_cm}, ${f.profundidade_total_cm}, ${f.observacoes}, ${f.ordem || 0}) RETURNING *`)[0]);
    if (type === 'peca') return res.status(201).json((await sql`INSERT INTO orcamento_pecas (movel_id, material_id, sku, descricao_peca, largura_cm, altura_cm, quantidade, m2_unitario, m2_total, fator_perda_pct, m2_com_perda, preco_custo_m2, custo_total_peca, metros_fita_borda, fita_material_id) VALUES (${movel_id}, ${f.material_id}, ${f.sku}, ${f.descricao_peca}, ${f.largura_cm}, ${f.altura_cm}, ${f.quantidade}, ${f.m2_unitario}, ${f.m2_total}, ${f.fator_perda_pct}, ${f.m2_com_perda}, ${f.preco_custo_m2}, ${f.custo_total_peca}, ${f.metros_fita_borda}, ${f.fita_material_id || null}) RETURNING *`)[0]);
    if (type === 'ferragem') return res.status(201).json((await sql`INSERT INTO orcamento_ferragens (movel_id, material_id, sku, descricao, quantidade, unidade, preco_custo_unitario, custo_total) VALUES (${movel_id}, ${f.material_id}, ${f.sku}, ${f.descricao}, ${f.quantidade}, ${f.unidade}, ${f.preco_custo_unitario}, ${f.custo_total}) RETURNING *`)[0]);
    if (type === 'extra') return res.status(201).json((await sql`INSERT INTO orcamento_custos_extras (orcamento_id, descricao, tipo, forma_calculo, percentual_ou_valor, m2_total_referencia, valor_calculado) VALUES (${orcamento_id}, ${f.descricao}, ${f.tipo}, ${f.forma_calculo}, ${f.percentual_ou_valor}, ${f.m2_total_referencia}, ${f.valor_calculado}) RETURNING *`)[0]);
  }
  if (req.method === 'PATCH') {
    if (type === 'config') return res.status(200).json((await sql`UPDATE configuracoes_precificacao SET fator_perda_padrao = ${req.body.fator_perda_padrao}, markup_padrao = ${req.body.markup_padrao}, aliquota_imposto = ${req.body.aliquota_imposto}, mo_producao_pct_padrao = ${req.body.mo_producao_pct_padrao}, mo_instalacao_pct_padrao = ${req.body.mo_instalacao_pct_padrao}, margem_minima_alerta = ${req.body.margem_minima_alerta}, atualizado_em = NOW() RETURNING *`)[0]);
  }
  if (req.method === 'DELETE') {
    if (type === 'ambiente') await sql`DELETE FROM orcamento_ambientes WHERE id = ${id}`;
    if (type === 'movel') await sql`DELETE FROM orcamento_moveis WHERE id = ${id}`;
    if (type === 'peca') await sql`DELETE FROM orcamento_pecas WHERE id = ${id}`;
    if (type === 'ferragem') await sql`DELETE FROM orcamento_ferragens WHERE id = ${id}`;
    if (type === 'extra') await sql`DELETE FROM orcamento_custos_extras WHERE id = ${id}`;
    return res.status(200).json({ success: true });
  }
}

async function handleProjects(req: any, res: any) {
  const { authorized } = validateAuth(req);
  if (req.method !== 'GET' && !authorized) return res.status(401).json({ error: 'Não autorizado' });
  if (req.method === 'GET') {
    const { client_id, status } = req.query;
    return res.status(200).json(client_id ? await sql`SELECT * FROM projects WHERE client_id = ${client_id} ORDER BY created_at DESC` : status ? await sql`SELECT * FROM projects WHERE status = ${status} ORDER BY created_at DESC` : await sql`SELECT * FROM projects ORDER BY updated_at DESC`);
  }
  if (req.method === 'POST') {
    const f = req.body;
    return res.status(201).json((await sql`INSERT INTO projects (client_id, client_name, ambiente, descricao, valor_estimado, valor_final, prazo_entrega, status, etapa_producao, responsavel, observacoes) VALUES (${f.client_id}, ${f.client_name}, ${f.ambiente}, ${f.descricao}, ${f.valor_estimado}, ${f.valor_final}, ${f.prazo_entrega}, ${f.status || 'lead'}, ${f.etapa_producao}, ${f.responsavel}, ${f.observacoes}) RETURNING *`)[0]);
  }
  if (req.method === 'PATCH' || req.method === 'PUT') {
    const f = req.body;
    const r = await sql`UPDATE projects SET client_id = COALESCE(${f.client_id}, client_id), client_name = COALESCE(${f.client_name}, client_name), ambiente = COALESCE(${f.ambiente}, ambiente), descricao = COALESCE(${f.descricao}, descricao), valor_estimado = COALESCE(${f.valor_estimado}, valor_estimado), valor_final = COALESCE(${f.valor_final}, valor_final), prazo_entrega = COALESCE(${f.prazo_entrega}, prazo_entrega), status = COALESCE(${f.status}, status), etapa_producao = COALESCE(${f.etapa_producao}, etapa_producao), responsavel = COALESCE(${f.responsavel}, responsavel), observacoes = COALESCE(${f.observacoes}, observacoes), updated_at = CURRENT_TIMESTAMP WHERE id = ${req.query.id} RETURNING *`;
    if (r.length && f.status === 'concluido') {
      const itms = await sql`SELECT id FROM erp_project_items WHERE project_id = ${req.query.id}`;
      for (const itm of itms) await writeOffStockForProject(itm.id);
    }
    return res.status(200).json(r[0]);
  }
  if (req.method === 'DELETE') { await sql`DELETE FROM projects WHERE id = ${req.query.id}`; return res.status(200).json({ success: true }); }
}

async function handleReports(req: any, res: any) {
  const { authorized, error } = validateAuth(req);
  if (!authorized) return res.status(401).json({ error });
  const { type, projectId } = req.query;
  if (type === 'fin-rentabilidade') return res.status(200).json(await sql`SELECT * FROM bi_custos_projeto ORDER BY custo_material_total DESC`);
  if (type === 'ind-romaneio') return res.status(200).json(await sql`SELECT pi.label as ambiente, cr.componente_nome, s.nome as sku_nome, s.sku_code, cr.quantidade_com_perda, s.unidade_medida FROM erp_project_items pi JOIN erp_consumption_results cr ON cr.project_item_id = pi.id JOIN erp_skus s ON s.id = cr.sku_id WHERE pi.project_id = ${projectId} ORDER BY pi.label, cr.componente_nome`);
  if (type === 'com-necessidade') return res.status(200).json(await sql`SELECT s.sku_code, s.nome, s.categoria, i.estoque_atual, i.estoque_reservado, abc.classe_abc FROM erp_skus s JOIN erp_inventory i ON i.sku_id = s.id LEFT JOIN bi_curva_abc_materiais abc ON abc.id = s.id WHERE (i.estoque_atual - i.estoque_reservado) < i.ponto_pedido OR abc.classe_abc = 'A' ORDER BY abc.classe_abc ASC`);
  return res.status(400).json({ error: 'Tipo inválido' });
}

async function handleSimulations(req: any, res: any) {
  const { authorized, error } = validateAuth(req);
  if (!authorized) return res.status(401).json({ error });
  if (req.method === 'GET') return res.status(200).json(req.query.clienteId ? await sql`SELECT * FROM erp_simulations WHERE cliente_id = ${req.query.clienteId} ORDER BY created_at DESC` : await sql`SELECT * FROM erp_simulations ORDER BY created_at DESC`);
  if (req.method === 'POST') return res.status(201).json((await sql`INSERT INTO erp_simulations (cliente_id, cliente_nome, dados_simulacao, dados_input) VALUES (${req.body.cliente_id}, ${req.body.cliente_nome}, ${JSON.stringify(req.body.dados_simulacao)}, ${JSON.stringify(req.body.dados_input)}) RETURNING *`)[0]);
  if (req.method === 'DELETE') { await sql`DELETE FROM erp_simulations WHERE id = ${req.query.id}`; return res.status(200).json({ success: true }); }
}

async function handleUsers(req: any, res: any) {
  const { user, error } = extractAndVerifyToken(req);
  if (error || user?.role !== 'admin') return res.status(403).json({ error: 'Acesso negado' });
  if (req.method === 'GET') return res.status(200).json(await sql`SELECT id, name, email, role, created_at FROM users ORDER BY created_at ASC`);
  if (req.method === 'DELETE') { if (req.query.id === user.id) return res.status(400).json({ error: 'Auto-exclusão negada' }); await sql`DELETE FROM users WHERE id = ${req.query.id}`; return res.status(200).json({ success: true }); }
  if (req.method === 'PATCH') {
    const { email, password } = req.body;
    if (password) {
      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash(password, salt);
      await sql`UPDATE users SET email = ${email}, password_hash = ${hash} WHERE id = ${user.id}`;
    } else await sql`UPDATE users SET email = ${email} WHERE id = ${user.id}`;
    return res.status(200).json({ success: true });
  }
}

async function handleInitDB(req: any, res: any) {
  try {
    const result = await runInitDB();
    return res.status(200).json(result);
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
}
