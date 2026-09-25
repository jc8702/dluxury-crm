# S05 — Correção: JWT 7d + middleware sem validação de usuário → sessão com `token_version`/`ativo` (ALTO)

**Data:** 2026-09-23
**Branch:** `fix/S-05` (a partir de `main`) · **Commit:** `7128dc1` `fix(S-05): valida sessão de usuário no middleware (token_version/ativo), JWT 8h e invalidação em delete/troca de senha`
**Host do banco (antes de tudo):** `ep-holy-term-acnj7373-pooler.sa-east-1.aws.neon.tech` (branch `audit-2026-09` apenas; produção intocada)
**Achado:** S-05 (ALTO) — `src/api-lib/auth.ts:59` emite JWT de 7 dias; `tenantMiddleware.ts:271` só checa se o tenant existe, não o usuário. Usuário deletado continua lendo.

---

## Problema

1. **JWT `expiresIn: '7d'`** — sessão longa demais para token de acesso.
2. **Middleware só validava o tenant** (`tenantExists`) — nunca consultava `users`. Com token ainda não expirado:
   - usuário **deletado** continuava autenticado;
   - usuário **inativo** continuava autenticado;
   - após **troca de senha**, tokens antigos continuavam válidos.

## Decisões (aprovadas na sessão)

1. **Expiração JWT = 8 horas** (confirmada pelo usuário; era `7d`).
2. **Stash do WIP S-04** antes de criar `fix/S-05` da `main` (`stash@{0}: On fix/S-03: S-04 WIP antes de fix/S-05`).
3. **Sem endpoint de logout global** — escopo: só DELETE de usuário e PATCH com `password` incrementam `token_version` (+ limpeza de cache).
4. **Claim ausente = versão 0** (token pré-S-05 continua válido enquanto `users.token_version = 0`; após 1º bump de versão, 401).
5. **Testes existentes:** apenas fixtures de mock `FROM users` no `beforeEach` (asserções intocadas) — decisão `1` do usuário quando 16 testes antigos falharam.

## O que foi feito

| Arquivo                                                   | Mudança                                                                                                                                                                                                                                                              |
| --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `drizzle/0019_add_users_token_version.sql` (novo)         | `ADD COLUMN IF NOT EXISTS token_version integer NOT NULL DEFAULT 0` + `ativo boolean DEFAULT true` em `users`. Idempotente.                                                                                                                                          |
| `src/api-lib/auth.ts`                                     | `JWT_EXPIRES_IN = '8h'`; SELECT de login inclui `token_version`/`ativo`; payload JWT com `token_version`; rejeita login se `ativo === false`; PATCH com `password` faz `token_version = token_version + 1` + `__clearUserSessionCache`; DELETE limpa cache.          |
| `src/api-lib/middleware/tenantMiddleware.ts`              | `loadUserSession` consulta `users (id, tenant_id, ativo, token_version)` com **cache em memória 30s**; `validateUserSession` → 401 se não existir / inativo / versão divergir; aplicado em `withTenant` e `resolveTenantRequest`; exporta `__clearUserSessionCache`. |
| `src/types/tenant.ts`                                     | `JwtPayload.token_version?: number`.                                                                                                                                                                                                                                 |
| `src/api-lib/__tests__/auth-token-version.test.ts` (novo) | 11 testes S-05 (reprodução + regressão).                                                                                                                                                                                                                             |
| `src/api-lib/__tests__/auth.test.ts`                      | **Só mock:** `installUserSessionSqlMock()` + `__clearUserSessionCache()` no `beforeEach`. Nenhuma asserção alterada.                                                                                                                                                 |
| `src/api-lib/__tests__/tenantMiddleware.test.ts`          | **Só mock:** idem. Nenhuma asserção alterada.                                                                                                                                                                                                                        |

## Testes (antes → depois)

- **ANTES (reprodução):** `auth-token-version.test.ts` → **8/8 FALHARAM** (middleware não consultava `users`; JWT ainda `7d`).
- **DEPOIS:** **11/11 PASSARAM** (deletado→401, senha trocada→401, inativo→401, versão divergente→401, válido→200, cache 30s = 1 query, JWT `exp-iat = 8h`, `token_version + 1` no PATCH, delete invalida cache).
- **Mock-only nos existentes:** após fixture `FROM users`, `auth.test.ts` + `tenantMiddleware.test.ts` → **44/44 PASS** (16 tinham falhado com a correção crua; asserções originais intactas).
- Suíte completa: **56 arquivos / 728 testes passam, 23 skip**; `npx tsc --noEmit` = 0; `npm run lint` = 0 errors (223 warnings pré-existentes).

## Migration (só branch de auditoria)

1. Host verificado antes: `ep-holy-term-acnj7373-pooler.sa-east-1.aws.neon.tech` (guard aborta em outro host).
2. `drizzle/0019_add_users_token_version.sql` executada via script temporário (removido após).
3. **Resultado:** `information_schema` confirma `users.token_version integer NOT NULL DEFAULT 0` e `users.ativo boolean DEFAULT true`.
4. Produção: **não** executada (regra: nunca produção; merge para `main` futuro exige rodar 0019 no Neon de prod **antes** do deploy do código).

## Riscos / pendências registrados

- **Deploy de código sem a migration no ambiente alvo** quebra login/middleware (`column users.token_version does not exist`) — migrar primeiro.
- Tokens de 7d pré-S-05 permanecem válidos até `exp` ou até o 1º `token_version` bump; claim ausente = 0.
- Cache de sessão 30s é por instância (Vercel); invalidação em delete/troca de senha é local — janela ≤30s em outra instance fria.
- **Concorrência:** working tree também tinha `api/index.ts` e `aprovacao.ts` (não são do S-05) — **não commitados** neste achado; `docs/AUDITORIA_2026-09-20/` untracked (convenção S-03/S-04).
- Stash S-04 WIP preservado em `stash@{0}`.
- Logout global de servidor: **não implementado** (decisão do usuário); logout de cliente continua só limpo `localStorage`.

---

**Status:** correção commitada em `fix/S-05` (`7128dc1`). Migration 0019 executada **somente** no branch `audit-2026-09`. Push/merge/deploy **não** realizados nesta etapa de registro.
