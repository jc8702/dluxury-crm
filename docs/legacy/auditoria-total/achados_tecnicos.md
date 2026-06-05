# Achados Técnicos - Auditoria Profunda

Este documento contém os achados técnicos da auditoria realizada, classificados por severidade.

## Resumo

| Severidade | Quantidade | IDs                                                                          |
| ---------- | ---------- | ---------------------------------------------------------------------------- |
| Crítica    | 4          | F001, F002, F003, F004                                                       |
| Alta       | 6          | F005, F009, F010, F011, F014, F022                                           |
| Média      | 13         | F006, F007, F008, F012, F013, F016, F017, F019, F020, F023, F024, F025, F028 |
| Baixa      | 5          | F015, F018, F021, F026, F027                                                 |
| **Total**  | **28**     |                                                                              |

## Lista Detalhada de Achados

### 🔴 CRÍTICOS (4)

#### F001 - AuthBypass forçando admin sem autenticação

- **Módulo:** Autenticação
- **Arquivo:** `src/App.tsx:123-138`
- **Descrição:** AuthBypass define usuário admin automaticamente quando user é null, ignorando fluxo de login
- **Causa Provável:** Bypass de desenvolvimento mantido em produção
- **Impacto:** Acesso admin total sem autenticação

#### F002 - validateAuth sempre retorna authorized=true

- **Módulo:** Autenticação
- **Arquivo:** `src/api-lib/_db.ts:60-71`
- **Descrição:** Função de validação de token JWT sempre permite acesso mesmo sem token válido
- **Causa Provável:** "Depuração industrial" nunca removida
- **Impacto:** APIs aceitam requisições sem token

#### F003 - Auth comentada no handleClients

- **Módulo:** Autenticação
- **Arquivo:** `src/api-lib/crm.ts:6-8`
- **Descrição:** Verificação de token completamente comentada no CRUD de clientes
- **Causa Provável:** Debug local nunca reativado
- **Impacto:** Dados de clientes expostos sem autenticação

#### F004 - JWT Secret hardcoded

- **Módulo:** Segurança
- **Arquivo:** `src/api-lib/auth.ts:6, src/api-lib/_db.ts:5`
- **Descrição:** Secret 'dluxury-industrial-secret-2024' hardcoded como fallback
- **Causa Provável:** Valor padrão inseguro para variável de ambiente
- **Impacto:** Qualquer um pode forjar JWTs

### 🟠 ALTOS (6)

#### F005 - CORS '\*' no servidor dev

- **Módulo:** Segurança
- **Arquivo:** `dev-api-server.js:17`
- **Descrição:** Access-Control-Allow-Origin: '\*'
- **Causa Provável:** Config genérica para dev
- **Impacto:** Qualquer origem pode acessar API em dev

#### F009 - Bundle principal com 1.4MB

- **Módulo:** Performance
- **Arquivo:** `dist/assets/index-CZAzboHn.js`
- **Descrição:** Código principal sem code-splitting granular
- **Causa Provável:** Configuração manualChunks sub-ótima
- **Impacto:** Carregamento inicial lento

#### F010 - CartesianChart com 333KB

- **Módulo:** Performance
- **Arquivo:** `dist/assets/CartesianChart-DGcE6D9H.js`
- **Descrição:** Recharts sem tree-shaking
- **Causa Provável:** Biblioteca pesada sem lazy loading
- **Impacto:** 333KB extra em páginas com gráficos

#### F011 - Páginas individuais muito grandes

- **Módulo:** Performance
- **Arquivo:** `CalendarioPage (251KB), RetalhosPage (257KB)`
- **Descrição:** Páginas com dependências pesadas não code-splitted
- **Causa Provável:** react-big-calendar e plano de corte sem divisão
- **Impacto:** 250KB+ para páginas específicas

#### F014 - Uso excessivo de 'any'

- **Módulo:** Qualidade de Código
- **Arquivo:** `src/pages/*.tsx (94 ocorrências)`
- **Descrição:** ESLint config com '@typescript-eslint/no-explicit-any': 'off'
- **Causa Provável:** Desenvolvimento rápido prioriza funcionalidade
- **Impacto:** Perda de segurança de tipos

#### F022 - Rotas da API duplicadas

- **Módulo:** Integração
- **Arquivo:** `api/index.ts vs src/lib/api.ts`
- **Descrição:** Rotas inconsistentes e abreviações não documentadas
- **Causa Provável:** Crescimento orgânico sem padrão
- **Impacto:** Manutenção confusa, possíveis conflitos

### 🟡 MÉDIOS (13)

#### F006 - Stack traces expostas em erros 500

- **Módulo:** Segurança
- **Arquivo:** `api/index.ts:351-355`
- **Descrição:** err.stack incluso na resposta de erro
- **Impacto:** Vazamento de informação interna

#### F007 - SELECT \* generalizado

- **Módulo:** Segurança
- **Arquivo:** `Múltiplos (59 ocorrências)`
- **Descrição:** Over-fetching de dados sensíveis
- **Impacto:** Dados desnecessários trafegados

#### F008 - Falta validação de entrada em auth

- **Módulo:** Segurança
- **Arquivo:** `src/api-lib/auth.ts:13-14`
- **Descrição:** Sem validação de formato de email/senha
- **Impacto:** Dados malformatados

#### F012 - PDF worker 1.2MB global

- **Módulo:** Performance
- **Arquivo:** `dist/assets/pdf.worker.min-iDqQPrd3.mjs`
- **Descrição:** pdfjs-dist carregado globalmente
- **Impacto:** Download desnecessário de 1.2MB

#### F013 - 249 console.log em produção

- **Módulo:** Qualidade de Código
- **Arquivo:** `Múltiplos (249 ocorrências)`
- **Descrição:** Logs de debug no código
- **Impacto:** Poluição do console, vazamento de info

#### F016 - useEffect com deps ausentes

- **Módulo:** Qualidade de Código
- **Arquivo:** `Múltiplos componentes`
- **Descrição:** 10+ useEffect com array vazio []
- **Impacto:** Possíveis bugs de stale closures

#### F017 - Código de debug comentado

- **Módulo:** Qualidade de Código
- **Arquivo:** `src/api-lib/crm.ts, _init.ts`
- **Descrição:** Bypass de auth comentado no código
- **Impacto:** Risco de reativação acidental

#### F019 - alert() para erros

- **Módulo:** UX/UI
- **Arquivo:** `src/components/clients/Clients.tsx:93, Settings.tsx:41`
- **Descrição:** alert() bloqueante em vez de toasts
- **Impacto:** Má experiência do usuário

#### F020 - Tratamento de erros inconsistente

- **Módulo:** UX/UI
- **Arquivo:** `Múltiplas páginas`
- **Descrição:** Alguns alert(), outros console.error()
- **Impacto:** Erros silenciosos

#### F023 - Rotas duplicadas financeiro

- **Módulo:** Integração
- **Arquivo:** `api/index.ts:236-239`
- **Descrição:** handleFinanceiro gerencia rotas duplicadas
- **Impacto:** Comportamento imprevisível

#### F024 - Import TS sem transpilação

- **Módulo:** Integração
- **Arquivo:** `dev-api-server.js:3`
- **Descrição:** import de .ts sem loader configurado
- **Impacto:** dev:api pode falhar

#### F025 - Rate limiting por IP

- **Módulo:** Segurança
- **Arquivo:** `api/index.ts:60-66`
- **Descrição:** Rate limit por IP pode ser contornado
- **Impacto:** Bloqueio de usuários legítimos

#### F028 - html2canvas 198KB global

- **Módulo:** Performance
- **Arquivo:** `package.json:32`
- **Descrição:** Dependência pesada sem lazy loading
- **Impacto:** 198KB desnecessários

### 🔵 BAIXOS (5)

#### F015 - Ordem de definição no Settings

#### F018 - Nomenclatura inconsistente case

#### F021 - Falta tratamento de loading

#### F026 - chunkSizeWarningLimit alto

#### F027 - EmptyState inconsistente

---

## Plano de Correção

### Prioridade Crítica/ Alta (10 itens):

1. F004 - Remover JWT secret hardcoded
2. F005 - Corrigir CORS dev-api-server
3. F006 - Remover stack trace de erros
4. F013 - Configurar ESLint para console
5. F019 - Substituir alert() por toast

### Prioridade Média (baixo risco):

6. F024 - Corrigir import TS

### Demais itens: Requerem refatoração maior (não aplicado nesta rodada)
