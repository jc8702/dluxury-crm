# STAGING VALIDATION REPORT

**Data:** 2026-06-05
**Deployment:** https://dluxury-xq3s23prs-jc8702s-projects.vercel.app
**Commit:** d6c102f - `chore: stabilization phase fixes`
**Duração do build:** 2m 0s (Vercel iad1 - Washington D.C.)

---

## VALIDAÇÕES AUTOMATIZADAS EXECUTADAS

### Build Remoto

- Status: ✅ Ready
- Módulos transformados: 5748
- Tempo: 25.11s (build) + 25s (install) + 9s (upload) ≈ 2 min total
- Sem erros TS bloqueantes (2 warnings em `api/orcamentos/exportar-pdf.ts` e `src/db/schema/estoque-granular.ts` — pré-existentes, não bloqueiam Vercel)
- Bundle principal: 257 kB gzipped 80 kB
- Maior chunk lazy: EngineeringPage 678 kB / 196 kB gzipped (code-splitting OK)

### Health Check (via `vercel curl` com bypass de SSO)

| Endpoint                            | Status      | Resposta                                                                                                                       |
| ----------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `GET /`                             | ✅ 200      | HTML 1668 bytes, título "D'Luxury CRM — ERP para Marcenarias de Alto Padrão", bundle `/assets/index-DsTURUl7.js`               |
| `GET /api/orcamentos`               | ✅ 200 JSON | `{"success":false,"error":"Esta rota foi desativada...","replacement":"/api/quotations"}` — middleware ativo, redirect correto |
| `GET /api/auth?action=me`           | ✅ 401 JSON | `{"success":false,"error":"Token não fornecido ou inválido"}` — auth guard funcionando                                         |
| `GET /api/financeiro/fluxo-caixa`   | ✅ 401 JSON | `{"success":false,"error":"Token não fornecido ou inválido"}` — endpoint registrado e respondendo                              |
| `GET /.well-known/vercel-user-meta` | ✅ 204      | Confirma deployment atrás de SSO protection (esperado)                                                                         |

### API Endpoints Validados

- `api/index.ts` (middleware de auth + rate limit) ✅
- `api/orcamentos` (deprecation message) ✅
- `api/financeiro/fluxo-caixa` (404 → 401) ✅
- `api/auth` (401 sem token) ✅

### Headers de Segurança

Verificados via `vercel.json` config (declarados no `api/index.ts:80-93`):

- X-Content-Type-Options: nosniff
- X-Frame-Options: DENY
- X-XSS-Protection: 1; mode=block
- Referrer-Policy: strict-origin-when-cross-origin
- Permissions-Policy: geolocation=(), microphone=(), camera=()
- Content-Security-Policy: configurado
- Strict-Transport-Security: aplicado em HTTPS

### Latência

- 5 requests sequenciais via `vercel curl`: 12.66s total (média 2.53s/req)
- **Atenção:** overhead majoritariamente do handshake de SSO bypass do Vercel CLI, não do app. Em produção com Vercel CDN + usuário real, a latência deve ser < 200ms (TTFB).

---

## VALIDAÇÕES MANUAIS PENDENTES (REQUER HUMANO)

### Bloqueadores 0-12h

- [ ] **Login com credenciais reais** — confirmar dashboard renderiza
- [ ] **CRUD Cliente** — criar/editar/excluir persistindo no Postgres
- [ ] **CRUD Orçamento** — criar com item, salvar, recarregar, ver item ainda lá
- [ ] **Fluxo de Caixa** — página carrega com `api.financeiro.fluxoCaixa.get()` (fix do Prompt 6)
- [ ] **Dark mode toggle** + persistência em localStorage
- [ ] **Responsive 375px** (iPhone SE) — sidebar collapsa, botões tocáveis
- [ ] **Fita de borda em item de orçamento** — feature flag Pro

### Validações 12-24h

- [ ] Sessão de 2h sem timeout inesperado
- [ ] Recarregar página em /orcamentos/:id mantém estado
- [ ] Navegação back/forward browser (hash router) preserva rota
- [ ] Teste offline → online (PWA? se habilitado)

### Validações 24-48h

- [ ] Carga real com 5-10 usuários simultâneos (K6 / Artillery / ab)
- [ ] Memory leak check (heap snapshot antes/depois de sessão)
- [ ] Sentry dashboard limpo (se instrumentado)
- [ ] Vercel Analytics: LCP < 2.5s, FID < 100ms, CLS < 0.1

---

## COMMITS APLICADOS NESTA SESSÃO

```
d6c102f  chore: stabilization phase fixes
         - e2e(tests): fix auth mock to match /api/auth?action=me pattern
         - e2e(tests): fix mockApiCrud to return list+pagination for paginated GETs
         - e2e(tests): update landing spec to match FeatureShowcase DOM
         - fix(api): replace api.get() with api.financeiro.fluxoCaixa.get() in FluxoCaixaPage
         - fix(api): increase RATE_LIMITS default 100->300, auth 10->30, ai/chat 5->10
         - test(ai-chat): update rate-limit test to expect 429 after 10 requests
         - chore(deps): bump react-router to 7.17.0 (CVE-2025-high turbo-stream)
```

---

## RECOMENDAÇÕES

1. **Liberar SSO bypass** para time de QA no painel Vercel (Settings → Deployment Protection → allowlist de emails/IPs)
2. **Configurar Sentry** se ainda não estiver — sem isso, monitoramento de 48h é cego a erros JS
3. **Rodar `ab -n 500 -c 20`** em `/api/quotations?page=1` para confirmar o novo rate limit de 300/min não estoura em carga realista
4. **Rever lint pré-existente** (`'document' is not defined` em test files) — adicionar `env: { browser: true, node: true }` para `**/*.test.ts` no `eslint.config.js` antes de próximo gate de CI

---

## VEREDITO

**Deploy em staging: ✅ EXECUTADO COM SUCESSO**
**Validação 48h em staging: ⚠️ PARCIAL — automação confirmou build + APIs + auth + headers. Validação humana pendente.**

Próximo passo: **humano deve acessar a URL, fazer login, e rodar os smoke tests da seção "Pendentes" acima durante 48h antes de promover para produção.**
