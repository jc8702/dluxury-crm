import { sql } from "../../../api-lib/_db.js";
import { Evento, EventoSchema } from "../domain/Evento.js";
import { normalizeObjetivo } from "../domain/normalizeObjetivo.js";

export class EventosRepository {
  async list(filters: { inicio?: Date, fim?: Date, tipo?: string, responsavel_id?: string } = {}) {
    let query = sql`
      SELECT e.*, 
             c.nome as cliente_nome,
             c.telefone as cliente_telefone,
             p.ambiente as projeto_nome,
             u.name as responsavel_nome
      FROM eventos e
      LEFT JOIN clients c ON e.cliente_id::TEXT = c.id::TEXT
      LEFT JOIN projects p ON e.projeto_id::TEXT = p.id::TEXT
      LEFT JOIN users u ON e.responsavel_id::TEXT = u.id::TEXT
      WHERE 1=1
    `;

    if (filters.inicio) {
      query = sql`${query} AND e.data_inicio >= ${filters.inicio}`;
    }
    if (filters.fim) {
      query = sql`${query} AND e.data_inicio <= ${filters.fim}`;
    }
    if (filters.tipo) {
      query = sql`${query} AND e.tipo = ${filters.tipo}`;
    }
    if (filters.responsavel_id) {
      query = sql`${query} AND e.responsavel_id = ${filters.responsavel_id}`;
    }

    query = sql`${query} ORDER BY e.data_inicio ASC`;
    
    return await query;
  }

  async getById(id: string) {
    const results = await sql`SELECT * FROM eventos WHERE id::TEXT = ${id}::TEXT`;
    return results[0] || null;
  }

  async create(data: Evento) {
    const validated = EventoSchema.parse(data);
    
    // NORMALIZAÇÃO FORÇADA - ponto único de entrada
    const objetivoNormalizado = normalizeObjetivo(validated.objetivo);
    console.log('[REPO] objetivo normalizado:', objetivoNormalizado);
    
    const results = await sql`
      INSERT INTO eventos (
        tipo, titulo, descricao, data_inicio, data_fim, dia_inteiro,
        cliente_id, projeto_id, visita_id, orcamento_id, endereco, objetivo, status_visita,
        responsavel_id, criado_por, cor, lembrete_minutos
      ) VALUES (
        ${validated.tipo}, ${validated.titulo}, ${validated.descricao}, ${validated.data_inicio}, ${validated.data_fim}, ${validated.dia_inteiro},
        ${validated.cliente_id}::TEXT, ${validated.projeto_id}::TEXT, ${validated.visita_id}::TEXT, ${validated.orcamento_id}::TEXT, ${validated.endereco}, ${objetivoNormalizado}, ${validated.status_visita},
        ${validated.responsavel_id}::TEXT, ${validated.criado_por}::TEXT, ${validated.cor}, ${validated.lembrete_minutos}
      )
      RETURNING *
    `;

    return results[0];
  }

  async update(id: string, data: Partial<Evento>) {
    const current = await this.getById(id);
    if (!current) throw new Error("Evento não encontrado");

    const merged = { ...current, ...data };
    const validated = EventoSchema.parse(merged);
    
    // NORMALIZAÇÃO FORÇADA
    const objetivoNormalizado = normalizeObjetivo(validated.objetivo);

    const results = await sql`
      UPDATE eventos SET
        tipo = ${validated.tipo},
        titulo = ${validated.titulo},
        descricao = ${validated.descricao},
        data_inicio = ${validated.data_inicio},
        data_fim = ${validated.data_fim},
        dia_inteiro = ${validated.dia_inteiro},
        cliente_id = ${validated.cliente_id}::TEXT,
        projeto_id = ${validated.projeto_id}::TEXT,
        visita_id = ${validated.visita_id}::TEXT,
        orcamento_id = ${validated.orcamento_id}::TEXT,
        endereco = ${validated.endereco},
        objetivo = ${objetivoNormalizado},
        status_visita = ${validated.status_visita},
        resultado_visita = ${validated.resultado_visita},
        responsavel_id = ${validated.responsavel_id}::TEXT,
        cor = ${validated.cor},
        lembrete_minutos = ${validated.lembrete_minutos},
        updated_at = NOW()
      WHERE id::TEXT = ${id}::TEXT
      RETURNING *
    `;

    return results[0];
  }

  async delete(id: string) {
    await sql`DELETE FROM eventos WHERE id::TEXT = ${id}::TEXT`;
    return true;
  }

  async updateStatus(id: string, status: string, resultado?: string) {
    const results = await sql`
      UPDATE eventos SET
        status_visita = ${status},
        resultado_visita = ${resultado || null},
        updated_at = NOW()
      WHERE id::TEXT = ${id}::TEXT
      RETURNING *
    `;
    return results[0];
  }

  async getHistorico(eventoId: string) {
    return await sql`
      SELECT h.*, u.name as alterado_por_nome
      FROM eventos_historico h
      LEFT JOIN users u ON h.alterado_por::TEXT = u.id::TEXT
      WHERE h.evento_id::TEXT = ${eventoId}::TEXT
      ORDER BY h.alterado_em DESC
    `;
  }
}
