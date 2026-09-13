import { vi } from 'vitest';
import { sql as drizzleSql } from 'drizzle-orm';

/**
 * Mock de sql com .join funcional — simula `drizzle-orm` sql.join.
 *
 * Implementação real em `node_modules/drizzle-orm/sql/sql.js:306`:
 * ```js
 * function join(chunks, separator) {
 *   const result = [];
 *   for (const [i, chunk] of chunks.entries()) {
 *     if (i > 0 && separator !== void 0) result.push(separator);
 *     result.push(chunk);
 *   }
 *   return new SQL(result);
 * }
 * ```
 * `drizzleSql.join` retorna `SQL` que ao ser interpolado em `sql`VALUES ${values}``
 * é expandido inline (não como param).
 *
 * Nosso mock precisa:
 *  - `sql`...`` quando usado para construir fragmentos (ex: `sql`(${r.num}, ...)`` dentro de `rows.map`)
 *    deve retornar `SQL` (via drizzleSql) para que `sql.join` possa concatenar.
 *  - `await sql`SELECT ...`` quando usado para execução deve retornar `Promise<rows>` (mock data).
 *  - `sql.join` deve delegar para `drizzleSql.join` para fidelidade, não apenas `chunks.join(',')`.
 *
 * Heurística para distinguir:
 *  - Fragmento VALUES: primeira string começa com "(" (ex: `sql`(${r.num}, ...)``)
 *  - Execução: primeira string começa com SELECT/INSERT/UPDATE/DELETE/WITH etc.
 *
 * Limitação documentada:
 *  - Não simula 100% o `SQL` object de drizzle (ex: `toQuery()`, `buildQueryFromSourceParams`, typings, `shouldInlineParams`).
 *  - Para o mock, `sql`...`` de execução retorna um thenable `SQL` que resolve para o mock de linhas
 *    via `vi.fn`'s `mockResolvedValueOnce` queue. Quando nenhum mock está enfileirado, resolve para `[]`.
 *  - `sql.query`, `sql.begin` são simplificados para o que os testes usam.
 *  - Se um teste inspecionar `query.sql`/`query.params` gerados, verá o `SQL` real de drizzle, não uma string mockada.
 *    Isso é mais fiel que passthrough raso, mas ainda não executa contra DB.
 */
export function createMockSql() {
  // Base mock function — vi.fn para permitir mockResolvedValueOnce / mockImplementation
  const mockFn: any = vi.fn();

  // Implementação default: decide entre fragmento vs execução
  const defaultImpl = (strings: TemplateStringsArray, ...values: any[]) => {
    const first = String((strings as any)[0] ?? '').trim();
    const lower = first.toLowerCase();

    // Fragmento VALUES: começa com "(" — construir SQL real para join
    if (first.startsWith('(')) {
      // Retorna SQL real de drizzle, que sql.join espera
      return drizzleSql(strings as any, ...values);
    }

    // Execução: SELECT/INSERT/etc — retorna thenable que resolve para [] por padrão
    // mas permite que vi.fn's mock queue (mockResolvedValueOnce) tenha precedência.
    // Como estamos dentro de vi.fn, se o caller setou mockResolvedValueOnce, o vi.fn
    // já teria retornado aquele valor antes de chegar aqui. Este é o fallback.
    const sqlObj: any = drizzleSql(strings as any, ...values);
    // Torna thenable para que `await sql`...`` funcione (await chama .then)
    // Por padrão resolve para [] (ou para o que o teste configurou via mockImplementation)
    const mockRows: any[] = [];
    // Anexa comportamento thenable sem quebrar o SQL object
    const thenable: any = Object.create(sqlObj);
    thenable.then = (onFulfilled: any, onRejected: any) =>
      Promise.resolve(mockRows).then(onFulfilled, onRejected);
    thenable.catch = (onRejected: any) => Promise.resolve(mockRows).catch(onRejected);
    // Também permite `await` direto no objeto retornado por `sql`...``
    // Mas para que `vi.mocked(sql).mockResolvedValueOnce([...])` funcione,
    // precisamos que o vi.fn retorne o valor mockado, não este thenable.
    // O vi.fn já lida com isso: se houver mock enfileirado, ele retorna esse valor
    // em vez de chamar esta implementação. Então este fallback só corre quando
    // não há mock enfileirado.
    return thenable;
  };

  // Define implementação default no vi.fn (será sobrescrita por mockResolvedValueOnce quando houver)
  mockFn.mockImplementation(defaultImpl as any);

  // .join funcional — delega para drizzle real
  mockFn.join = vi.fn((chunks: any[], separator?: any) => {
    // Se separator não fornecido, usa drizzle `, ` (igual a _db.ts: sqlInstance.join)
    const sep = separator ?? drizzleSql`, `;
    // drizzleSql.join espera SQL[] e SQL separator
    return drizzleSql.join(chunks as any, sep as any);
  });

  // .query e .begin para compatibilidade com tests que usam sql.query / sql.begin
  mockFn.query = vi.fn().mockResolvedValue([]);
  mockFn.begin = vi.fn(async (cb: (tx: any) => Promise<any>) => {
    // tx deve ter .join também
    const tx: any = vi.fn((strings: any, ...values: any[]) => {
      // Para tx, similar: fragmento vs execução
      const first = String((strings as any)[0] ?? '').trim();
      if (first.startsWith('(')) {
        return drizzleSql(strings as any, ...values);
      }
      const sqlObj: any = drizzleSql(strings as any, ...values);
      const thenable: any = Object.create(sqlObj);
      thenable.then = (onFulfilled: any) => Promise.resolve([]).then(onFulfilled);
      thenable.catch = (onRejected: any) => Promise.resolve([]).catch(onRejected);
      return thenable;
    });
    tx.join = mockFn.join;
    tx.query = mockFn.query;
    return await cb(tx);
  });

  return mockFn;
}
