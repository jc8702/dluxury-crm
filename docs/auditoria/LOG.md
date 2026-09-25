# LOG DA AUDITORIA

Branch: `audit-2026-09` | Host de banco usado nesta etapa: **nenhum (banco não acessado)**

---

## ETAPA 1 — Lista fixa de endpoints (denominador de cobertura)

**Situação: CONCLUÍDA — ETAPA CONCLUÍDA**

### O que foi feito

1. Verificação inicial: `docs/auditoria/MATRIZ.md` e `docs/auditoria/LOG.md` **não existiam** (nenhum deles foi lido como insumo; ambos foram criados nesta etapa).
2. Leitura do roteador único `api/index.ts` (608 linhas) e de `vercel.json` (rewrite `/api/(.*)` → `/api/index`; `functions: api/**/*.ts`).
3. Leitura de `src/api-lib/` (handlers), `src/api-lib/feature-gate-middleware.ts`, `src/api-lib/billing-middleware.ts`, `src/api-lib/middleware/tenantMiddleware.ts`, `src/api-lib/middleware/featureGate.ts`, `src/lib/features.ts`, `src/api-lib/_db.ts`.
4. Verificação de flags: `NEW_TENANT_MIDDLEWARE` **não definido** em `.env`/`.env.local` → middleware global de tenant **ligado por default** (`tenantMiddleware.ts:87-91`).
5. Expansão de cada rota agrupada em linhas individuais MÉTODO × CAMINHO, com Auth, Gate, Recebe ID, Status e Evidência (`arquivo:linha`).
6. Conferência automática do arquivo gerado: 306 linhas, numeração 1..306 sem furos nem duplicatas; soma por método = 306.

### Evidências (comandos executados)

- `Get-ChildItem api` → `api/index.ts`, `api/orcamentos/exportar-pdf.ts`, `api/orcamentos/importar-itens.ts`, `api/services/ai-chat.ts`, `api/webhooks/asaas-webhook.ts`
- Leitura de `api/index.ts:89-608` (roteamento dinâmico) e das listas de rotas públicas em `api/index.ts:149-156`
- `feature-gate-middleware.ts:60-88` → gates `ia`, `simulador_cnc`, `plano_corte`, `financeiro`, `rh`, `whatsapp`, `export-xml`, `features`; limite de usuários em `:101-120`
- `billing-middleware.ts:16-25,61-94` → bloqueio 402 apenas para escrita em rotas não públicas
- Conferência de contagem: 306 linhas `| # |` no `MATRIZ.md`

### Resultado

- **TOTAL (DENOMINADOR) = 306 endpoints**
- Distribuição: GET 84, POST 87, PATCH 37, PUT 46, DELETE 32, QUALQUER 20.
- Status de todas as linhas: `NÃO TESTADO`.
- 11 achados de análise estática registrados no fim de `docs/auditoria/MATRIZ.md` (A1..A11), com status `ANÁLISE ESTÁTICA` ou `SUSPEITA`.

### Regras de granularidade adotadas (documentadas em MATRIZ.md)

- `PATCH || PUT` no mesmo `if` → duas linhas (verbos são aceitos de forma diferente entre handlers).
- Discriminador de rota (segmento de path ou `?type=`/`?action=`/`?stats=`) → linha separada.
- ID/filtro opcional → mesma linha, registrado na coluna `Recebe ID`.
- Handler sem guarda de método → uma linha com Método = `QUALQUER`.
- Prefixos alternativos do roteador → linhas próprias (`/api/orcamentos-pro`, `/api/condicoes-pagamento`, `/api/forn`).
- Dead code não gerou linha.

### Arquivos criados/alterados

| Arquivo                    | Ação                                     |
| -------------------------- | ---------------------------------------- |
| `docs/auditoria/MATRIZ.md` | CRIADO (306 linhas de rota + 11 achados) |
| `docs/auditoria/LOG.md`    | CRIADO (este arquivo)                    |

### Dados e banco

- Comandos de banco executados: **nenhum**. Nenhum host foi acessado.
- Dados criados com prefixo `AUDIT_`: **nenhum**.
- Dados removidos: **nenhum** (não havia nada a remover).
- Código-fonte, testes, schema e configuração: **não alterados** (somente leitura).

---

ETAPA CONCLUÍDA
