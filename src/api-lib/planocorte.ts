import { db } from './drizzle-db.js';
import { planosDeCorte, erpChapas, erpSkusEngenharia, retalhosEstoque, movimentacoesEstoque } from '../db/schema/planos-de-corte.js';
import { skuEngenharia } from '../db/schema/engenharia-orcamentos.js';
import { eq, ilike, or, isNull, and, sql } from 'drizzle-orm';
import { auditLog, sql as rawSql, validateAuth } from './_db.js';

/**
 * MÓDULO PLANO DE CORTE INDUSTRIAL - REESCRITA COM DRIZZLE
 */

// --- 1. Handler Principal (CRUD de Planos) ---
export async function handlePlanoCorte(req: any, res: any) {
  const method = req.method;
  const { id } = req.query || {};

  try {
    switch (method) {
      case 'GET':
        if (id) {
          const [plano] = await db.select().from(planosDeCorte).where(and(eq(planosDeCorte.id, id), isNull(planosDeCorte.deleted_at)));
          if (!plano) return res.status(404).json({ success: false, error: 'Plano não encontrado' });
          return res.status(200).json({ success: true, data: plano });
        } else {
          const planos = await db.select().from(planosDeCorte).where(isNull(planosDeCorte.deleted_at));
          return res.status(200).json({ success: true, data: planos });
        }

      case 'POST':
        // Criar ou Salvar Resultado
        const { action } = req.query || {};
        
        if (action === 'criar_plano') {
          const { user } = validateAuth(req);
          const [novo] = await db.insert(planosDeCorte).values({
            nome: req.body.nome,
            kerf_mm: req.body.kerf_mm || 3,
            materiais: req.body.materiais || [],
            sku_engenharia: req.body.sku_engenharia,
            visita_id: req.body.visita_id || null,
            projeto_id: req.body.projeto_id || null,
            orcamento_id: req.body.orcamento_id || null,
            ordem_producao_id: req.body.ordem_producao_id || null,
          }).returning();
          
          await auditLog('planos_de_corte', novo.id, 'CREATE', user?.id, null, novo);
          
          return res.status(201).json({ success: true, data: novo });
        } else if (action === 'aprovar_producao') {
          const { user } = validateAuth(req);
          const { materiais_consumidos, retalhos_gerados } = req.body;
          
          // 1. Processar Materiais Consumidos
          for (const item of materiais_consumidos) {
            if (item.id_retalho) {
              // Uso de Retalho Existente
              await db.update(retalhosEstoque)
                .set({ 
                  disponivel: false, 
                  utilizado_em_id: item.plano_id, 
                  data_utilizacao: new Date(),
                  updated_at: new Date()
                })
                .where(eq(retalhosEstoque.id, item.id_retalho));

              await db.insert(movimentacoesEstoque).values({
                tipo: 'uso_plano',
                item_tipo: 'retalho',
                retalho_id: item.id_retalho,
                plano_corte_id: item.plano_id,
                quantidade: 1,
                motivo: 'Consumo em produção',
                usuario_id: user?.id
              });
            } else {
              // Uso de Chapa Inteira
              await db.execute(sql`
                UPDATE erp_chapas 
                SET estoque = COALESCE(estoque, 0) - ${item.qtd || 1} 
                WHERE sku = ${item.sku}
              `);

              await db.insert(movimentacoesEstoque).values({
                tipo: 'uso_plano',
                item_tipo: 'chapa',
                chapa_id: item.chapa_id, // Idealmente passar o ID
                plano_corte_id: item.plano_id,
                quantidade: item.qtd || 1,
                motivo: `Consumo SKU: ${item.sku}`,
                usuario_id: user?.id
              });
            }
          }

          // 2. Gerar Novos Retalhos (Sobras Reutilizáveis)
          if (retalhos_gerados && Array.isArray(retalhos_gerados)) {
            for (const r of retalhos_gerados) {
              const [novoRetalho] = await db.insert(retalhosEstoque).values({
                largura_mm: r.largura_mm,
                altura_mm: r.altura_mm,
                espessura_mm: r.espessura_mm,
                sku_chapa: r.sku_chapa,
                origem: 'sobra_plano_corte',
                plano_corte_origem_id: r.plano_corte_id,
                usuario_criou: user?.id || 'sistema',
                disponivel: true,
                descartado: false,
                metadata: { automatico: true }
              }).returning();

              await db.insert(movimentacoesEstoque).values({
                tipo: 'entrada',
                item_tipo: 'retalho',
                retalho_id: novoRetalho.id,
                plano_corte_id: r.plano_corte_id,
                quantidade: 1,
                motivo: 'Geração automática de sobra',
                usuario_id: user?.id
              });
            }
          }

          // 3. Criar Ordem de Produção (Problem 5)
          const op_id = `OP-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
          
          await rawSql`
            INSERT INTO ordens_producao (id, op_id, produto, status, projeto_id, orcamento_id, visita_id, created_at, updated_at)
            VALUES (
              gen_random_uuid(), 
              ${op_id}, 
              ${req.body.nome_projeto || 'PLANO DE CORTE'}, 
              'AGUARDANDO', 
              ${req.body.projeto_id || null}, 
              ${req.body.orcamento_id || null}, 
              ${req.body.visita_id || null},
              NOW(),
              NOW()
            )
          `;

          return res.status(200).json({ 
            success: true, 
            message: 'Produção aprovada! Ordem de Produção gerada e estoque atualizado.',
            data: { op_id }
          });
        } else {
          const { user } = validateAuth(req);
          const { plano_id, materiais, resultado, KPIs } = req.body;
          const [before] = await db.select().from(planosDeCorte).where(eq(planosDeCorte.id, plano_id));
          
          const [atualizado] = await db.update(planosDeCorte)
            .set({ 
              materiais, 
              resultado, 
              updated_at: new Date() 
            })
            .where(eq(planosDeCorte.id, plano_id))
            .returning();

          await auditLog('planos_de_corte', plano_id, 'SAVE_RESULT', user?.id, before, atualizado);
          
          return res.status(200).json({ success: true, data: atualizado });
        }

      case 'PUT':
        const [upd] = await db.update(planosDeCorte)
          .set({ ...req.body, updated_at: new Date() })
          .where(eq(planosDeCorte.id, id))
          .returning();
        return res.status(200).json({ success: true, data: upd });

      case 'DELETE':
        const { user } = validateAuth(req);
        const [existing] = await db.select().from(planosDeCorte).where(eq(planosDeCorte.id, id));
        if (!existing) return res.status(404).json({ success: false, error: 'Plano não encontrado' });

        await db.update(planosDeCorte).set({ deleted_at: new Date() }).where(eq(planosDeCorte.id, id));
        
        await auditLog('planos_de_corte', id, 'DELETE', user?.id, existing, { status: 'deleted' });
        
        return res.status(200).json({ success: true });

      default:
        return res.status(405).json({ success: false, error: 'Método não permitido' });
    }
  } catch (err: any) {
    console.error('PLANO_CORTE_API_ERROR:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}

// --- 2. Handler de Chapas (Estoque) ---
export async function handleChapas(req: any, res: any) {
  const { q } = req.query || {};
  try {
    const termText = String(q || '').trim();
    if (termText) {
      const term = `%${termText}%`;
      const results = await db.select()
        .from(erpChapas)
        .where(or(
          ilike(erpChapas.sku, term), 
          ilike(erpChapas.nome, term),
          sql`LOWER(${erpChapas.nome}) LIKE LOWER(${term})`,
          sql`LOWER(${erpChapas.sku}) = LOWER(${termText})`
        ));
      return res.status(200).json({ success: true, data: results });
    }
    const all = await db.select().from(erpChapas);
    return res.status(200).json({ success: true, data: all });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

// --- 3. Handler de Engenharia (Integrado com Orçamentos Pro) ---
export async function handleEngenhariaSKUs(req: any, res: any) {
  const { q } = req.query || {};
  try {
    const termText = String(q || '').trim();
    if (termText) {
      const term = `%${termText}%`;
      const results = await db.select()
        .from(skuEngenharia)
        .where(or(ilike(skuEngenharia.codigo, term), ilike(skuEngenharia.nome, term)));
      return res.status(200).json({ success: true, data: results });
    }
    const all = await db.select().from(skuEngenharia).limit(50);
    return res.status(200).json({ success: true, data: all });
  } catch (err: any) {
    console.error('ERRO_ENGENHARIA_SKUS:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}

/**
 * IMPORTAÇÃO DE DESENHO TÉCNICO (FASE 1 - EXTRAÇÃO DE TEXTO)
 */
export async function handleImportarDesenho(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).end();
  
  try {
    const { fileBase64 } = req.body;
    if (!fileBase64) return res.status(400).json({ success: false, error: 'Arquivo não fornecido' });
    
    // Decodificar Base64
    const { fileName } = req.body;
    const buffer = Buffer.from(fileBase64, 'base64');
    let text = '';
    
    // Detectar se é DXF (pela extensão ou cabeçalho '0')
    const isDXF = fileName?.toLowerCase().endsWith('.dxf') || (buffer.length > 4 && buffer.toString('utf8', 0, 1).trim() === '0');

    if (isDXF) {
      // Parse otimizado de DXF (Fase 5)
      const rawText = buffer.toString('utf-8');
      const dxfLines = rawText.split(/\r?\n/);
      let extractedFromDXF = '';
      
      // Limite de 500k linhas para evitar travamento em arquivos gigantescos
      const maxLines = Math.min(dxfLines.length, 500000);
      
      for (let i = 0; i < maxLines; i++) {
        const line = dxfLines[i].trim();
        // Group Codes: 1 (Texto), 3 (Texto Adicional), 100 (Subclasse)
        if (line === '1' || line === '3') { 
          const val = (dxfLines[i+1] || '').trim();
          if (val && val.length > 1 && !val.startsWith('$')) {
            extractedFromDXF += val + '\n';
          }
        }
      }
      text = extractedFromDXF;
    } else {
      // Extrair texto do PDF (Fases 1-4) com PDF.js Engine (Mais estável em Serverless)
      try {
        const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
        const loadingTask = pdfjs.getDocument({ 
          data: new Uint8Array(buffer),
          useSystemFonts: true,
          disableFontFace: true
        });
        
        const pdfDoc = await loadingTask.promise;
        let fullText = '';
        
        // Limitar processamento a 20 páginas para evitar timeout em arquivos gigantes
        const pagesToProcess = Math.min(pdfDoc.numPages, 20);
        
        for (let i = 1; i <= pagesToProcess; i++) {
          const page = await pdfDoc.getPage(i);
          const textContent = await page.getTextContent();
          const pageText = textContent.items
            .map((item: any) => ('str' in item ? item.str : ''))
            .filter(s => s.trim().length > 0)
            .join(' ');
          fullText += pageText + '\n';
        }
        text = fullText;

        if (!text.trim()) throw new Error('PDF sem conteúdo de texto extraível');

      } catch (pdfErr: any) {
        console.error('[API] Falha crítica na extração de PDF:', pdfErr);
        return res.status(500).json({ 
          success: false, 
          error: 'Este PDF não contém dados de texto extraíveis. Tente usar o arquivo DXF original.',
          details: pdfErr.message 
        });
      }
    }
    
    const pecas: any[] = [];
    const lines = text.split('\n');
    
    // Lista expandida de materiais e acabamentos industriais (Fase 2.1)
    const materialKeywords = [
      'MDF', 'MDP', 'COMPENSADO', 'OSB', 'HDF',
      'BRANCO', 'GRAFITE', 'CARVALHO', 'FREIJO', 'LOUREIRO', 
      'PRETO', 'CINZA', 'CANELA', 'AMARULA', 'GELATO', 'NOVAES', 
      'GIANDUIA', 'TITANIO', 'CHUMBO', 'CAPRI', 'EBANO', 'MARFIM',
      'CEDRO', 'IMBUIA', 'WENGUE', 'NOCE', 'LARICE', 'CALCATA'
    ];
    
    /**
     * Regex para identificar padrões de peças e dimensões (LxAxE)
     * Suporta: "Peça: 800x600x18", "Base 800 * 600 * 18", "Lateral 800 x 600 x 18"
     */
    const regexDimensoes = /(?:([a-zA-ZÀ-ÿ0-9\s\-_]{2,})[:\-\s]+)?(\d+(?:[.,]\d+)?)\s*(?:mm|cm)?\s*[xX*]\s*(\d+(?:[.,]\d+)?)\s*(?:mm|cm)?\s*[xX*]\s*(\d+(?:[.,]\d+)?)\s*(?:mm|cm)?/;
    
    /**
     * Regex para Tabelas (Fase 3): 
     * Suporta linhas de softwares como CorteCloud, Promob, SketchUp
     */
    const regexTabela = /(?:(\d+)\s+)?([a-zA-ZÀ-ÿ0-9\s\-_]{3,})\s+(\d+(?:[.,]\d+)?)\s+(\d+(?:[.,]\d+)?)\s+(\d+(?:[.,]\d+)?)(?:\s+(\d+))?/;

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine || trimmedLine.length < 5) continue;

      // Limpeza de ruído de PDF (caracteres de controle)
      const cleanLine = trimmedLine.replace(/[\x00-\x1F\x7F-\x9F]/g, '');

      // 1. Tenta Padrão de Dimensões Explícitas
      let match = cleanLine.match(regexDimensoes);
      
      // 2. Se não achou, tenta Padrão de Tabela
      if (!match) {
        match = cleanLine.match(regexTabela);
        if (match) {
          const nome = match[2]?.trim();
          const largura = match[3];
          const comprimento = match[4];
          const espessura = match[5];
          const quantidade = match[6] || '1';

          pecas.push({
            id: `p-${Math.random().toString(36).substring(2, 7)}`,
            nome: nome || `Item ${match[1] || pecas.length + 1}`,
            largura: parseFloat(largura.replace(',', '.')),
            comprimento: parseFloat(comprimento.replace(',', '.')),
            espessura: parseFloat(espessura.replace(',', '.')),
            quantidade: parseInt(quantidade),
            material: '' 
          });
          
          const lastPeca = pecas[pecas.length - 1];
          const upperLine = cleanLine.toUpperCase();
          for (const kw of materialKeywords) {
            if (upperLine.includes(kw)) {
              lastPeca.material = kw;
              break;
            }
          }
          continue;
        }
      }

      // 3. Processamento Final (Match de Dimensões)
      if (match) {
        const nomeFinal = match[1]?.trim() || `Peça ${pecas.length + 1}`;
        
        // Detecção inteligente de material
        const upperLine = cleanLine.toUpperCase();
        let materialDetectado = '';
        for (const kw of materialKeywords) {
          if (upperLine.includes(kw)) {
            // Pega a palavra do material e possivelmente o próximo termo (ex: MDF BRANCO)
            const parts = upperLine.split(/\s+/);
            const idx = parts.findIndex(p => p.includes(kw));
            materialDetectado = parts.slice(idx, idx + 2).join(' ').replace(/[:\d\-\*xX]/g, '').trim();
            break;
          }
        }

        pecas.push({
          id: `p-${Math.random().toString(36).substring(2, 7)}`,
          nome: nomeFinal,
          largura: parseFloat(match[2].replace(',', '.')),
          comprimento: parseFloat(match[3].replace(',', '.')),
          espessura: parseFloat(match[4].replace(',', '.')),
          quantidade: 1,
          material: materialDetectado || '' 
        });
      }
    }
    
    // Filtragem e Normalização (Fase 5)
    // - Remove peças com dimensões irreais
    // - Ordena para que Largura seja sempre a maior dimensão (orientação de fibra padrão)
    const pecasValidas = pecas
      .filter(p => p.largura > 5 && p.comprimento > 5 && p.espessura > 0)
      .map(p => {
        if (p.comprimento > p.largura) {
          return { ...p, largura: p.comprimento, comprimento: p.largura };
        }
        return p;
      });
    
    console.log(`[IMPORT] Sucesso: ${pecasValidas.length} peças extraídas.`);
    
    return res.status(200).json({ 
      success: true, 
      data: pecasValidas,
      count: pecasValidas.length,
      debug: { textLength: text.length, rawCount: pecas.length }
    });
  } catch (err: any) {
    console.error('IMPORT_DESENHO_ERROR:', err);
    return res.status(500).json({ success: false, error: 'Erro ao processar PDF: ' + err.message });
  }
}
