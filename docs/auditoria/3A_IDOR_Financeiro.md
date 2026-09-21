# Objeto 3A — IDOR e Permissoes no Financeiro

**Data:** 2026-09-20
**Branch:** `audit-2026-09`
**Tenants:** A=TEST TENANT (79cf46f8) / B=Teste Basic (dd11ecd6)

---

## Resultados

| #   | Endpoint                           | Acao                | Token   | Esperado       | Obtido        | Status                                               |
| --- | ---------------------------------- | ------------------- | ------- | -------------- | ------------- | ---------------------------------------------------- |
| 1   | /api/financeiro/classes            | POST create         | Admin A | 201            | 201           | PASSOU                                               |
| 2   | /api/financeiro/classes            | GET cross-tenant    | Admin B | not found      | not found     | PASSOU                                               |
| 3   | /api/financeiro/classes            | PATCH cross-tenant  | Admin B | 404            | 404           | PASSOU                                               |
| 4   | /api/financeiro/classes            | DELETE cross-tenant | Admin B | 200 sem efeito | 200           | PASSOU                                               |
| 5   | /api/financeiro/classes            | VERIFY intact       | Admin A | exists         | exists        | PASSOU                                               |
| 6   | /api/financeiro/contas-internas    | POST create         | Admin A | 201            | 201           | PASSOU                                               |
| 7   | /api/financeiro/contas-internas    | GET cross-tenant    | Admin B | not found      | not found     | PASSOU                                               |
| 8   | /api/financeiro/contas-internas    | PATCH cross-tenant  | Admin B | 404            | 200           | **FALHOU (IDOR-vuln)**                               |
| 9   | /api/financeiro/contas-internas    | VERIFY not hacked   | Admin A | nome original  | nome original | PASSOU                                               |
| 10  | /api/financeiro/formas-pagamento   | POST create         | Admin A | 201            | 201           | PASSOU                                               |
| 11  | /api/financeiro/formas-pagamento   | GET cross-tenant    | Admin B | not found      | not found     | PASSOU                                               |
| 12  | /api/financeiro/formas-pagamento   | PATCH cross-tenant  | Admin B | 404            | 200           | **FALHOU (IDOR-vuln)**                               |
| 13  | /api/financeiro/formas-pagamento   | VERIFY not hacked   | Admin A | nome original  | nome original | PASSOU                                               |
| 14  | /api/financeiro/titulos-receber    | POST create         | Admin A | 201            | 400           | NAO TESTADO (tabela fechamentos_financeiros ausente) |
| 15  | /api/financeiro/titulos-pagar      | POST create         | Admin A | 201            | 400           | NAO TESTADO (tabela fechamentos_financeiros ausente) |
| 16  | /api/condicoes-pagamento           | POST create         | Admin A | 201            | 201           | PASSOU                                               |
| 17  | /api/condicoes-pagamento           | GET cross-tenant    | Admin B | not found      | not found     | PASSOU                                               |
| 18  | /api/condicoes-pagamento           | PATCH cross-tenant  | Admin B | 404            | 404           | PASSOU                                               |
| 19  | /api/condicoes-pagamento           | VERIFY not hacked   | Admin A | nome original  | nome original | PASSOU                                               |
| 20  | /api/financeiro/contas-recorrentes | POST create         | Admin A | 201            | 201           | PASSOU                                               |
| 21  | /api/financeiro/contas-recorrentes | GET cross-tenant    | Admin B | not found      | not found     | PASSOU                                               |
| 22  | /api/financeiro/contas-recorrentes | PATCH cross-tenant  | Admin B | 404            | 404           | PASSOU                                               |

---

## Achados

### A6 (ALTO) — IDOR em contas-internas PATCH

`src/api-lib/financeiro.ts:384-385`

O handler retorna 200 com `data: undefined` quando a query UPDATE nao encontra registro (tenant_id mismatch). Deveria verificar `result.length === 0` e retornar 404.

```typescript
// BUG: retorna 200 mesmo quando 0 linhas afetadas
const result = await sql`UPDATE ... WHERE id = ${id} AND tenant_id = ${tenantId} RETURNING *`;
return res.status(200).json({ success: true, data: result[0] }); // result[0] = undefined
```

**Impacto:** Cross-tenant PATCH retorna 200 (sucesso aparente) em vez de 404. Dados nao sao alterados (WHERE filtra), mas o status code engana o cliente.

**Correcao:** Adicionar `if (!result[0]) return res.status(404).json(...)` antes do return.

### A7 (ALTO) — IDOR em formas-pagamento PATCH

`src/api-lib/financeiro.ts:415-423`

Mesmo padrao do A6. PATCH retorna 200 com `data: undefined` quando tenant_id nao bate.

```typescript
const result = await sql`UPDATE ... WHERE id = ${id} AND tenant_id = ${tenantId} RETURNING *`;
return res.status(200).json({ success: true, data: result[0] }); // result[0] = undefined
```

**Correcao:** Mesma do A6.

### A8 (BAIXO) — Tabela fechamentos_financeiros ausente

`titulos-receber` e `titulos-pagar` POST retornam 400 porque `checkPeriodoFechado()` consulta tabela inexistente. Nao e IDOR, mas impede teste completo de titulos.

---

## Resumo

- **22 testes** executados
- **18 PASSOU** (82%)
- **2 FALHOU** (IDOR-vuln): contas-internas PATCH, formas-pagamento PATCH
- **2 NAO TESTADO**: titulos-receber/pagar (infra incompleta)
- **Dados preservados**: todos os VERIFY confirmaram que registros nao foram alterados
