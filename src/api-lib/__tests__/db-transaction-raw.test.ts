import { describe, it, expect } from 'vitest';
import { sql } from '../_db.js';

describe('Real Database Transaction Raw & Params', () => {
  // Ignorar os testes caso DATABASE_URL não esteja configurada no ambiente
  const runDbTests = !!process.env.DATABASE_URL;

  if (!runDbTests) {
    it.skip('Ignorando testes de transação real do banco de dados (DATABASE_URL ausente)', () => {});
    return;
  }

  it('deve realizar rollback ao lançar erro dentro do callback do transaction', async () => {
    const testId = '00000000-0000-0000-0000-deadbeef9999';

    // 1. Garantir que não existe o tenant de teste no banco
    await sql`DELETE FROM tenants WHERE id = ${testId}`;

    // 2. Executar sql.begin que insere e depois lança erro
    try {
      await sql.begin(async (tx: any) => {
        // Usando tagged template para insert
        await tx`INSERT INTO tenants (id, nome, subdominio, plano_tier, status) VALUES (${testId}, 'Test Rollback Inc', 'test-rollback-raw', 'basic', 'ativo')`;

        // Verificar que está visível dentro da transação
        const inside = await tx`SELECT id FROM tenants WHERE id = ${testId}`;
        expect(inside).toHaveLength(1);

        throw new Error('Erro intencional para forçar rollback');
      });
    } catch (err: any) {
      expect(err.message).toBe('Erro intencional para forçar rollback');
    }

    // 3. Verificar fora da transação que o registro não foi criado (rollback efetivo)
    const outside = await sql`SELECT id FROM tenants WHERE id = ${testId}`;
    expect(outside).toHaveLength(0);
  });

  it('deve fazer commit com sucesso e suportar ambas as formas: tagged template e raw function com parâmetros', async () => {
    const testId1 = '00000000-0000-0000-0000-deadbeef1111';
    const testId2 = '00000000-0000-0000-0000-deadbeef2222';

    // Limpar registros anteriores
    await sql`DELETE FROM tenants WHERE id IN (${testId1}, ${testId2})`;

    try {
      await sql.begin(async (tx: any) => {
        // Forma A: Tagged template (tx`...`)
        await tx`INSERT INTO tenants (id, nome, subdominio, plano_tier, status) VALUES (${testId1}, 'Test Commit A', 'test-commit-a', 'basic', 'ativo')`;

        // Forma B: Função com parâmetros (tx('...', [params]))
        await tx(
          'INSERT INTO tenants (id, nome, subdominio, plano_tier, status) VALUES ($1, $2, $3, $4, $5)',
          [testId2, 'Test Commit B', 'test-commit-b', 'basic', 'ativo'],
        );
      });

      // Verificar que ambos foram commitados
      const rows =
        await sql`SELECT id, nome FROM tenants WHERE id IN (${testId1}, ${testId2}) ORDER BY nome`;
      expect(rows).toHaveLength(2);
      expect(rows[0].nome.toUpperCase()).toBe('TEST COMMIT A');
      expect(rows[1].nome.toUpperCase()).toBe('TEST COMMIT B');
    } finally {
      // Limpar registros
      await sql`DELETE FROM tenants WHERE id IN (${testId1}, ${testId2})`;
    }
  });
});
