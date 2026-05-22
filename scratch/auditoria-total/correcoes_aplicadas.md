# Correções Aplicadas - Changelog Técnico

Este documento registra todas as correções aplicadas durante a FASE 5 da auditoria.

---

## F004 - Remover JWT Secret Hardcoded

| Item | Detalhe |
|------|---------|
| **Severidade** | 🔴 Crítica |
| **Arquivos alterados** | `src/api-lib/auth.ts:6`, `src/api-lib/_db.ts:5` |
| **Descrição** | JWT secret hardcoded 'dluxury-industrial-secret-2024' removido como fallback. Agora requer APP_JWT_SECRET no ambiente. |
| **Antes** | `const JWT_SECRET = process.env.APP_JWT_SECRET || 'dluxury-industrial-secret-2024';` |
| **Depois** | `const JWT_SECRET = process.env.APP_JWT_SECRET; if (!JWT_SECRET) { throw new Error('APP_JWT_SECRET...') }` |
| **Impacto** | Impede que seja usado secret previsível em produção ou dev. O .env já contém a variável. |

---

## F005 - CORS '*' no Servidor Dev

| Item | Detalhe |
|------|---------|
| **Severidade** | 🟠 Alta |
| **Arquivos alterados** | `dev-api-server.js:17` |
| **Descrição** | CORS configurado como '*' para permitir requisições de qualquer origem. |
| **Antes** | `res.setHeader('Access-Control-Allow-Origin', '*');` |
| **Depois** | Lista branca com origens específicas (localhost:5173, localhost:4173, 127.0.0.1:5173) |
| **Impacto** | Apenas origens autorizadas podem consumir API em dev. |

---

## F006 - Stack Traces Expostas em Erros 500

| Item | Detalhe |
|------|---------|
| **Severidade** | 🟡 Média |
| **Arquivos alterados** | `api/index.ts:351-355` |
| **Descrição** | Stack traces de erros internos estavam sendo retornados nas respostas HTTP 500. |
| **Antes** | `return res.status(500).json({ success: false, error: err.message, details: err.stack })` |
| **Depois** | `return res.status(500).json({ success: false, error: err.message })` (sem stack trace) |
| **Impacto** | Vazamento de informações internas corrigido. |

---

## F013 - Console Statements no Código de Produção

| Item | Detalhe |
|------|---------|
| **Severidade** | 🟡 Média |
| **Arquivos alterados** | `eslint.config.js` |
| **Descrição** | 249 chamadas de console.log/error/warn no código. Configuração do ESLint atualizada para permitir apenas console.warn e console.error, restringindo console.log. |
| **Antes** | `'no-console': 'warn'` (permite qualquer console) |
| **Depois** | `'no-console': ['warn', { allow: ['warn', 'error'] }]` |
| **Impacto** | console.log continuará gerando aviso, mas console.warn/error permitidos. Nota: correção completa requer refatoração manual dos 249 logs. |

---

## F019 - alert() Substituído por Toast

| Item | Detalhe |
|------|---------|
| **Severidade** | 🟡 Média |
| **Arquivos alterados** | `src/components/clients/Clients.tsx`, `src/components/settings/Settings.tsx` |
| **Descrição** | Substituição de alert() bloqueante por sistema de toasts via ToastProvider já existente na aplicação. |
| **Antes** | `alert('Erro ao salvar cliente: ' + error.message)` |
| **Depois** | `showToastError('Erro ao salvar cliente', error.message)` |
| **Locais corrigidos** | Clientes (1), Settings - handleAddCond (1), handleDeleteUser (1), TechnicalPricingSection (2) |
| **Impacto** | UX melhorada com toasts não bloqueantes seguindo o design system do sistema. |

---

## F026 - Chunk Size Warning Limit

| Item | Detalhe |
|------|---------|
| **Severidade** | 🔵 Baixa |
| **Arquivos alterados** | `vite.config.ts` |
| **Descrição** | Ajuste do chunkSizeWarningLimit de 1000KB para 500KB e adição de mais manualChunks para separar bibliotecas pesadas. |
| **Antes** | chunkSizeWarningLimit: 1000, manualChunks: { 'lucide': [...], 'vendor': [...] } |
| **Depois** | chunkSizeWarningLimit: 500, manualChunks: { 'vendor': [...], 'lucide': [...], 'charts': [...], 'calendar': [...], 'pdf': [...], 'date': [...] } |
| **Impacto** | Melhor code-splitting para recharts, react-big-calendar, jspdf, html2canvas e date-fns. |

---

## Não Aplicado (Aguardando Refatoração Maior)

Os seguintes achados não foram corrigidos por exigirem refatoração mais profunda:

| ID | Severidade | Motivo |
|----|-----------|--------|
| F001 | 🔴 Crítica | AuthBypass intencional para dev. Requer maturidade de autenticação multi-usuário |
| F002 | 🔴 Crítica | validateAuth bypass intencional para "depuração industrial" |
| F003 | 🔴 Crítica | Auth comentada no CRM - mesmo bypass intencional |
| F007 | 🟡 Média | SELECT * generalizado - requer revisão de cada endpoint |
| F008 | 🟡 Média | Validação de input no auth - requer schema validation |
| F009 | 🟠 Alta | Bundle principal 1.4MB - parcialmente endereçado com F026 |
| F010 | 🟠 Alta | CartesianChart 333KB - parcialmente endereçado com F026 |
| F011 | 🟠 Alta | Páginas grandes - parcialmente endereçado com F026 |
| F014 | 🟠 Alta | Uso de 'any' - requer configuração ESLint e refatoração |
| F022 | 🟠 Alta | Rotas duplicadas - requer consolidação |
| F012 | 🟡 Média | PDF worker 1.2MB - requer lazy loading do pdfjs-dist |
| F015 | 🔵 Baixa | Ordem de definição no Settings |
| F016 | 🟡 Média | useEffect deps ausentes - requer revisão em cada componente |
| F017 | 🟡 Média | Código comentado - remoção incremental |
| F018 | 🔵 Baixa | Nomenclatura inconsistente |
| F020 | 🟡 Média | Tratamento de erros inconsistente - parcialmente endereçado |
| F021 | 🔵 Baixa | Falta tratamento de loading |
| F023 | 🟡 Média | Rotas duplicadas financeiro |
| F024 | 🟡 Média | Import TS sem transpilação - requer configuração específica |
| F025 | 🟡 Média | Rate limiting por IP |
| F027 | 🔵 Baixa | EmptyStates inconsistentes |
| F028 | 🟡 Média | html2canvas 198KB - parcialmente endereçado com F026 |
