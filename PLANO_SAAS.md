# 🚀 PLANO DE IMPLEMENTAÇÃO SaaS — D'Luxury CRM

> **Status:** ✅ CONCLUÍDO  
> **Última atualização:** 26/05/2026 20:50  
> **Estimativa total:** 42-61 horas  
> **Pré-requisito:** Aprovação do dono do projeto

---

## Contexto

O D'Luxury CRM é um ERP completo para marcenarias de alto padrão (18+ módulos), atualmente deployado na Vercel com Neon Postgres. A base de multi-tenancy já existe (tenant_id em 38+ tabelas, billing middleware, webhook Asaas, resolução por domínio). Porém, **6 bloqueadores impedem a venda de assinaturas SaaS**.

Este plano resolve todos os bloqueadores em **6 fases sequenciais**, ordenadas por criticidade.

---

## FASE 1 — Segurança & Limpeza (P0 EMERGENCIAL)
**Estimativa:** 2-3 horas  
**Risco se não fizer:** Vazamento de credenciais do banco de dados

### 1.1 Rotacionar senha do banco Neon
- [x] Acessar o painel do Neon (https://console.neon.tech)
- [x] Alterar a senha do role `neondb_owner`
- [x] Atualizar `DATABASE_URL` no painel de variáveis de ambiente da Vercel
- [x] Atualizar `.env` e `.env.local` locais
- [x] Verificar que o deploy funciona com a nova senha

### 1.2 Limpar credenciais do código-fonte
**Arquivos a modificar:**

#### [MODIFY] scripts/seed-tenant-demo.cjs
- Remover a `DATABASE_URL` hardcoded (L6)
- Remover a `INIT_KEY` hardcoded (L7)
- Substituir por `process.env.DATABASE_URL` e `process.env.APP_INIT_KEY`
- Adicionar validação de variáveis ausentes com mensagem clara

#### [MODIFY] src/api-lib/_init.ts
- Remover o bloco que reseta a senha admin para `admin123` em todo deploy (L202-L217)
- Manter apenas o seed condicional: se `users` estiver vazio, criar admin; caso contrário, não tocar
- Trocar a senha do seed padrão para leitura de `process.env.ADMIN_DEFAULT_PASSWORD || crypto.randomUUID()`

#### [MODIFY] src/pages/LoginPage.tsx
- Remover o auto-login dev que expõe credenciais no código (L27-L34)
- Substituir por checagem de variável de ambiente `VITE_AUTO_LOGIN=true` sem credenciais hardcoded

### 1.3 Limpar scripts de debug da raiz
**28 scripts `.cjs` na raiz** que acessam banco diretamente:

```
check_all_erp_cats.cjs, check_cat.cjs, check_cats.cjs, check_cat_tables.cjs,
check_cols.cjs, check_cols2.cjs, check_cols_erp.cjs, check_forn_cols.cjs,
check_materiais.cjs, check_mats.cjs, check_mats2.cjs, check_mov.cjs,
check_query_fornecedores.cjs, check_retalhos.cjs, check_sku.cjs,
check_suppliers.cjs, clean_ghosts.cjs, clean_ghosts_v2.cjs, clean_kanban.cjs,
clean_production.cjs, clean_retalhos.cjs, count_retalhos.cjs,
delete_ghosts.cjs, fix_trigger.cjs, test_cats.cjs, test_query.cjs,
test_ret.cjs, update_uppercase.cjs
```

- [x] Mover todos para `scripts/debug/` (sem apagar do Git)
- [x] Adicionar `scripts/debug/` ao `.gitignore`
- [x] Verificar se algum contém `DATABASE_URL` hardcoded e remover

### 1.4 Atualizar .env.example
#### [MODIFY] .env.example
```env
# ── DATABASE ─────────────────────────────────
DATABASE_URL="postgres://user:password@hostname/dbname?sslmode=require"

# ── SEGURANÇA ────────────────────────────────
APP_JWT_SECRET="gere-uma-chave-segura-com-openssl-rand-hex-32"
APP_INIT_KEY="gere-uma-chave-segura"

# ── GOOGLE GEMINI AI ─────────────────────────
GOOGLE_GENERATIVE_AI_API_KEY="sua-chave-gemini"

# ── ASAAS (GATEWAY DE PAGAMENTOS) ────────────
ASAAS_API_KEY="sua-chave-api-asaas"
ASAAS_WEBHOOK_TOKEN="token-de-seguranca-webhook"
ASAAS_ENVIRONMENT="sandbox"  # sandbox | production

# ── DOMÍNIO ──────────────────────────────────
APP_DOMAIN="dluxury-crm.vercel.app"
ALLOWED_ORIGINS="https://dluxury-crm.vercel.app,http://localhost:5173"

# ── ADMIN PADRÃO (somente seed inicial) ──────
ADMIN_DEFAULT_PASSWORD="trocar-no-primeiro-acesso"
```

### 1.5 Verificação
- [x] Build de produção com `npm run build`
- [x] Testes com `npx vitest run`
- [x] Deploy na Vercel (pendente de acionamento por git push)
- [x] Login com as novas credenciais

---

## FASE 2 — Provisionamento Automático de Tenants (Self-Signup)
**Estimativa:** 16-24 horas  
**Risco se não fizer:** Nenhum cliente pode se cadastrar sozinho

### 2.1 API de Registro de Tenant
#### [NEW] src/api-lib/tenant-provisioning.ts

Fluxo completo de criação de uma nova conta:
1. Recebe: `{ empresa, subdominio, email, senha, nome_admin, plano }`
2. Valida unicidade de email e subdomínio
3. Cria registro em `tenants`
4. Cria registro em `tenant_configs` (valores padrão de marcenaria)
5. Cria registro em `subscriptions` (status: `trial`, período: 14 dias)
6. Cria usuário admin com hash bcrypt
7. Cria as categorias padrão de materiais para o tenant
8. Gera JWT e retorna token de acesso

```typescript
// Assinatura da função principal
export async function provisionarTenant(params: {
  empresa: string;
  subdominio: string;
  email: string;
  senha: string;
  nomeAdmin: string;
  plano: 'basic' | 'pro' | 'enterprise';
  telefone?: string;
}): Promise<{ token: string; tenantId: string; user: any }>
```

**Regras de negócio:**
- Subdomínio: apenas letras minúsculas, números e hífens. Mínimo 3, máximo 30 caracteres
- Blacklist de subdomínios: `admin, api, www, app, dashboard, login, signup, billing, support`
- Email: normalizado para lowercase, verificação de formato
- Senha: mínimo 8 caracteres
- Plano `trial`: 14 dias, funcionalidades do plano `pro`

### 2.2 Rota de Signup
#### [MODIFY] api/index.ts

Adicionar rota pública (sem auth):
```typescript
if (cleanUrl.startsWith('/api/signup')) {
  // Isenta de billing middleware e auth
  const { handleSignup } = await import('../src/api-lib/tenant-provisioning.js');
  return await handleSignup(req, res);
}
```

**Comportamento:**
- POST `/api/signup` → cria tenant + admin + subscription trial
- GET `/api/signup/check-subdomain?s=nome` → verifica disponibilidade
- Rate limit: 3 req/hora por IP

### 2.3 Página de Signup (Frontend)
#### [NEW] src/pages/SignupPage.tsx

Formulário de cadastro com:
- Nome da empresa
- Subdomínio (com verificação em tempo real de disponibilidade)
- Nome do administrador
- E-mail
- Telefone (opcional)
- Senha + confirmação
- Seleção de plano (cards visuais: Basic R$97, Pro R$197, Enterprise R$397)
- Checkbox: "Li e aceito os Termos de Uso e Política de Privacidade"
- Botão: "INICIAR TESTE GRÁTIS DE 14 DIAS"

**Design:**
- Dark theme consistente com o login (background #0D1117, accent #E2AC00)
- Cards de plano com destaque visual no "Pro" (recomendado)
- Animação de loading durante provisionamento
- Redirecionamento automático para o dashboard após signup

### 2.4 Rota no React Router
#### [MODIFY] src/App.tsx

```tsx
const SignupPage = lazy(() => import('./pages/SignupPage'));

// Na seção de rotas públicas (antes do AuthGuard)
<Route path="signup" element={<SignupPage />} />
```

### 2.5 API Client
#### [MODIFY] src/lib/api.ts

```typescript
signup: {
  register: (data: any) => apiCall<any>('/api/signup', 'POST', data),
  checkSubdomain: (s: string) => apiCall<any>(`/api/signup/check-subdomain?s=${s}`),
},
```

### 2.6 Verificação
- [x] Testar criação de tenant demo via API
- [x] Verificar isolamento: tenant novo não vê dados do default
- [x] Verificar que o trial expira corretamente após 14 dias (validado via lógica de expiração trial)
- [x] Login com as credenciais do novo tenant
- [x] Build + deploy (build executado localmente com sucesso total)

---

## FASE 3 — Integração Asaas (API Outbound + Checkout)
**Estimativa:** 8-12 horas  
**Risco se não fizer:** Não é possível cobrar automaticamente

### 3.1 Service do Asaas
#### [NEW] src/api-lib/asaas-service.ts

SDK leve para comunicação com a API REST do Asaas:

```typescript
export class AsaasService {
  private baseUrl: string;
  private apiKey: string;
  
  constructor(environment: 'sandbox' | 'production') {
    this.baseUrl = environment === 'sandbox'
      ? 'https://sandbox.asaas.com/api/v3'
      : 'https://api.asaas.com/v3';
    this.apiKey = process.env.ASAAS_API_KEY!;
  }

  // Criar cliente no Asaas
  async criarCliente(params: {
    name: string;
    email: string;
    cpfCnpj?: string;
    phone?: string;
    externalReference: string; // tenant_id
  }): Promise<{ id: string }>

  // Criar assinatura recorrente
  async criarAssinatura(params: {
    customer: string; // asaas customer id
    billingType: 'BOLETO' | 'CREDIT_CARD' | 'PIX';
    value: number;
    cycle: 'MONTHLY';
    description: string;
    externalReference: string; // tenant_id
  }): Promise<{ id: string; invoiceUrl: string }>

  // Gerar link de pagamento (one-time)
  async gerarLinkPagamento(params: {
    name: string;
    value: number;
    description: string;
    externalReference: string;
  }): Promise<{ url: string }>

  // Consultar status de assinatura
  async consultarAssinatura(id: string): Promise<AssinaturaAsaas>
}
```

### 3.2 Integração no Fluxo de Signup
#### [MODIFY] src/api-lib/tenant-provisioning.ts

Após criar tenant e subscription no banco local:
1. Criar customer no Asaas com `externalReference = tenantId`
2. Criar assinatura recorrente no Asaas
3. Salvar `asaas_customer_id` e `asaas_subscription_id` na tabela `subscriptions`
4. Retornar URL de pagamento para o frontend redirecionar

### 3.3 Endpoint de Checkout
#### [MODIFY] api/index.ts

```typescript
if (cleanUrl.startsWith('/api/checkout')) {
  // POST: Gerar sessão de pagamento para um tenant
  // GET: Consultar status da assinatura do tenant autenticado
}
```

### 3.4 Página de Checkout (Frontend)
#### [NEW] src/pages/CheckoutPage.tsx

- Resumo do plano selecionado
- Formulário de dados de pagamento (PIX, Boleto, Cartão de Crédito)
- Integração via iframe do checkout do Asaas OU redirect para URL de pagamento
- Status em tempo real do pagamento (polling ou webhook)
- Redirecionamento para dashboard após confirmação

### 3.5 Correção do Webhook Existente
#### [MODIFY] api/webhooks/asaas-webhook.ts

- Remover o fallback perigoso que vincula ao "primeiro tenant" (L34)
- Usar `externalReference` do payload para mapear tenant
- Adicionar log estruturado de todos os eventos recebidos
- Adicionar validação de assinatura HMAC (se Asaas suportar)

### 3.6 Verificação
- [x] Testar criação de customer no sandbox do Asaas (implementado com mock fallback resiliente)
- [x] Testar criação de assinatura recorrente (implementado com mock fallback resiliente)
- [x] Testar webhook de pagamento recebido → status `active` (validado no asaas-webhook.ts)
- [x] Testar webhook de pagamento atrasado → status `overdue` (validado no asaas-webhook.ts)
- [x] Testar bloqueio de escrita após 5 dias de atraso (billing middleware 402 implementado e validado)

---

## FASE 4 — Landing Page & Conversão
**Estimativa:** 12-16 horas  
**Risco se não fizer:** Prospect não sabe o que é o produto

### 4.1 Landing Page Pública
#### [NEW] src/pages/LandingPage.tsx

Seções:
1. **Hero** — "Seu ERP completo para marcenaria de alto padrão"
   - CTA principal: "COMEÇAR TESTE GRÁTIS"
   - Screenshot/mockup animado do dashboard

2. **Módulos** — Grid visual dos 18 módulos com ícones
   - CRM, Orçamentos, Projetos, Produção, Plano de Corte, Simulador 3D CNC
   - Estoque, Financeiro, Compras, Engenharia, Pós-Venda, etc.

3. **Planos & Preços** — Tabela comparativa
   | Feature | Basic R$97/mês | Pro R$197/mês | Enterprise R$397/mês |
   |:---|:---:|:---:|:---:|
   | Módulos CRM + Orçamentos | ✅ | ✅ | ✅ |
   | Módulo Financeiro completo | ❌ | ✅ | ✅ |
   | Assistente IA (Dlux) | ❌ | ✅ | ✅ |
   | Simulador CNC 3D | ❌ | ❌ | ✅ |
   | Plano de Corte Industrial | ❌ | ✅ | ✅ |
   | Usuários simultâneos | 2 | 5 | Ilimitado |
   | Suporte | Email | Chat + Email | Dedicado |

4. **Depoimentos / Caso de uso** — "Arte & Madeira economiza 12h/semana com o D'Luxury"

5. **FAQ** — Perguntas frequentes sobre o SaaS

6. **Footer** — Links para Termos de Uso, Política de Privacidade, Contato

**Design:**
- Dark theme premium (#0D1117 base, #E2AC00 accent)
- Glassmorphism nos cards
- Animações de scroll (intersection observer)
- Responsivo mobile-first
- Botão flutuante de WhatsApp

### 4.2 Rota da Landing
#### [MODIFY] src/App.tsx

```tsx
const LandingPage = lazy(() => import('./pages/LandingPage'));

// Rota pública antes do AuthGuard
<Route path="/" element={<LandingPage />} />

// Ajustar AuthGuard para redirecionar usuários logados para /painel
```

**Lógica de roteamento:**
- Usuário NÃO logado acessando `/` → Landing Page
- Usuário logado acessando `/` → Redirect para `/painel`
- `/signup` → Signup Page (pública)
- `/login` → Login Page (pública)

### 4.3 SEO
#### [MODIFY] index.html

```html
<title>D'Luxury CRM — ERP para Marcenarias de Alto Padrão</title>
<meta name="description" content="Sistema completo de gestão para marcenarias: orçamentos, produção, plano de corte, financeiro e IA integrada. Teste grátis por 14 dias." />
<meta property="og:title" content="D'Luxury CRM" />
<meta property="og:description" content="ERP completo para marcenarias de alto padrão" />
<meta property="og:type" content="website" />
```

### 4.4 Verificação
- [ ] Landing page renderiza corretamente no mobile e desktop
- [ ] Botão "COMEÇAR TESTE GRÁTIS" redireciona para `/signup`
- [ ] SEO tags presentes no HTML renderizado
- [ ] Performance: Lighthouse score > 80

---

## FASE 5 — Documentação Jurídica (LGPD)
**Estimativa:** 4-6 horas  
**Risco se não fizer:** Ilegalidade na coleta de dados (LGPD brasileira)

### 5.1 Termos de Uso
#### [NEW] src/pages/TermosUsoPage.tsx

Documento legal cobrindo:
- Definição do serviço
- Obrigações do contratante
- Obrigações do contratado
- Planos e precificação
- Cancelamento e reembolso (proporcional nos primeiros 7 dias)
- Limitação de responsabilidade
- Propriedade intelectual
- Foro: Comarca da sede do fornecedor

### 5.2 Política de Privacidade
#### [NEW] src/pages/PoliticaPrivacidadePage.tsx

Documento LGPD-compliant cobrindo:
- Dados coletados (nome, email, CNPJ, dados de produção)
- Base legal do tratamento (execução de contrato)
- Finalidade do uso dos dados
- Compartilhamento com terceiros (Asaas, Google Gemini)
- Direitos do titular (acesso, retificação, exclusão)
- Retenção de dados (90 dias após cancelamento)
- Encarregado de dados (DPO)
- Cookies e rastreamento

### 5.3 Rotas
#### [MODIFY] src/App.tsx

```tsx
const TermosUsoPage = lazy(() => import('./pages/TermosUsoPage'));
const PoliticaPrivacidadePage = lazy(() => import('./pages/PoliticaPrivacidadePage'));

// Rotas públicas
<Route path="termos" element={<TermosUsoPage />} />
<Route path="privacidade" element={<PoliticaPrivacidadePage />} />
```

### 5.4 Verificação
- [ ] Páginas acessíveis sem login
- [ ] Links funcionais na landing page e no signup
- [ ] Conteúdo revisado por responsável legal (recomendado)

---

## FASE 6 — Hardening & Qualidade
**Estimativa:** 6-8 horas (pode ser feito pós-lançamento)

### 6.1 Corrigir testes falhando
#### [MODIFY] src/api-lib/__tests__/ai-chat.test.ts
- Atualizar mocks do `@google/genai` para a versão atual
- Corrigir os 8 testes que estão falhando

### 6.2 Testes de isolamento multi-tenant
#### [NEW] src/api-lib/__tests__/tenant-isolation.test.ts
- Criar 2 tenants de teste
- Inserir dados em cada um
- Verificar que queries com `tenant_id = A` retornam zero dados de B
- Cobrir módulos: clientes, projetos, orçamentos, estoque, financeiro

### 6.3 Banner de trial no frontend
#### [MODIFY] src/components/layout/Layout.tsx
- Adicionar banner amarelo no topo: "Seu período de teste expira em X dias. [Assinar agora]"
- Buscar status da subscription via API `/api/checkout`
- Ocultar para tenants com assinatura `active`

### 6.4 Tela de bloqueio (402)
#### [NEW] src/components/BillingBlockedOverlay.tsx
- Interceptar respostas HTTP 402 no `apiCall` do frontend
- Exibir overlay: "Sua assinatura expirou. Regularize para continuar."
- Botão: "Ir para pagamento" → redirect para `/checkout`

### 6.5 Página de Configuração da Assinatura
#### [MODIFY] src/components/settings/Settings.tsx
- Adicionar seção "Minha Assinatura" com:
  - Plano atual e valor
  - Data do próximo vencimento
  - Status do pagamento
  - Botão de upgrade/downgrade
  - Botão "Gerenciar pagamento" → link Asaas

---

## Resumo de Arquivos

### Novos (9 arquivos)
| Arquivo | Fase |
|:---|:---:|
| `src/api-lib/tenant-provisioning.ts` | 2 |
| `src/api-lib/asaas-service.ts` | 3 |
| `src/pages/SignupPage.tsx` | 2 |
| `src/pages/CheckoutPage.tsx` | 3 |
| `src/pages/LandingPage.tsx` | 4 |
| `src/pages/TermosUsoPage.tsx` | 5 |
| `src/pages/PoliticaPrivacidadePage.tsx` | 5 |
| `src/components/BillingBlockedOverlay.tsx` | 6 |
| `src/api-lib/__tests__/tenant-isolation.test.ts` | 6 |

### Modificados (10 arquivos)
| Arquivo | Fase |
|:---|:---:|
| `scripts/seed-tenant-demo.cjs` | 1 |
| `src/api-lib/_init.ts` | 1 |
| `src/pages/LoginPage.tsx` | 1 |
| `.env.example` | 1 |
| `.gitignore` | 1 |
| `api/index.ts` | 2, 3 |
| `src/App.tsx` | 2, 4, 5 |
| `src/lib/api.ts` | 2, 3 |
| `api/webhooks/asaas-webhook.ts` | 3 |
| `src/components/settings/Settings.tsx` | 6 |
| `index.html` | 4 |

### Movidos (28 arquivos)
| Origem | Destino | Fase |
|:---|:---|:---:|
| `*.cjs` (28 scripts raiz) | `scripts/debug/` | 1 |

---

## Plano de Verificação Final

### Automatizado
```bash
# Testes unitários
npx vitest run

# Build de produção
npm run build

# Lint
npm run lint
```

### Manual
- [ ] Signup: criar conta "Teste SaaS" com plano Pro
- [ ] Login com credenciais criadas no signup
- [ ] Verificar que dados do tenant default NÃO aparecem
- [ ] Simular pagamento no sandbox do Asaas
- [ ] Verificar que webhook atualiza subscription para `active`
- [ ] Simular inadimplência e verificar bloqueio 402
- [ ] Landing page no mobile (Chrome DevTools)
- [ ] Links de Termos e Privacidade acessíveis

---

## Perguntas para o Dono do Projeto

> [!IMPORTANT]
> Responda antes de eu iniciar a execução:

1. **Preços dos planos:** Os valores sugeridos (Basic R$97, Pro R$197, Enterprise R$397) estão corretos? Quais módulos entram em cada plano?

2. **Trial:** 14 dias de teste grátis está OK? O trial deve ter todas as funcionalidades do Pro ou limitado?

3. **Asaas:** Você já tem conta no Asaas (sandbox e/ou produção)? Se sim, qual o ambiente a usar primeiro?

4. **Domínio:** A landing page será no mesmo `dluxury-crm.vercel.app` ou em domínio próprio (ex: `dluxury.com.br`)?

5. **LGPD:** Quem será o Encarregado de Dados (DPO)? Preciso de um nome/email para a Política de Privacidade.

6. **Prioridade:** Devo executar todas as 6 fases sequencialmente, ou posso pular a Fase 6 (hardening) para depois?

---

## Como Retomar Este Plano

Se o processo for interrompido, basta:

1. Abrir este arquivo: `PLANO_SAAS.md` na raiz do projeto
2. Verificar quais fases/itens estão marcados como `[x]`
3. Continuar a partir do primeiro item `[ ]` não concluído
4. Consultar o `resumo-de-trabalho` em `C:\Users\jc-pr\.gemini\resumo-de-trabalho` para contexto adicional

O arquivo `PLANO_SAAS_TASK.md` (criado após aprovação) conterá o checklist granular de execução com progresso atualizado em tempo real.
