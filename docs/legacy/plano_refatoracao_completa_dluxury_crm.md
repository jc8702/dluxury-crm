# 🔨 PLANO DE REFATORAÇÃO COMPLETA - D'LUXURY CRM

## Documento de Ação Estratégico para Agente

---

## 📋 ÍNDICE

1. [Visão Geral](#visão-geral)
2. [Diagnóstico Atual](#diagnóstico-atual)
3. [Arquitetura da Refatoração](#arquitetura-da-refatoração)
4. [Fases de Execução](#fases-de-execução)
5. [Skills por Fase](#skills-por-fase)
6. [Checkpoints de Validação](#checkpoints-de-validação)
7. [Timeline e Recursos](#timeline-e-recursos)

---

# 🎯 VISÃO GERAL

## Objetivo

Refatorar completamente o D'Luxury CRM de um MVP caótico para um **sistema enterprise-ready** com:

- ✅ Arquitetura sólida e escalável
- ✅ Código de qualidade production-grade
- ✅ Todas funcionalidades testadas e funcionando
- ✅ Design system coeso
- ✅ UX profissional e intuitiva

## Escopo

- **Tech Stack:** React 18 + TypeScript + Vite + Tailwind CSS + Drizzle ORM + Neon PostgreSQL
- **Deployment:** Vercel (serverless)
- **Duração Estimada:** 6-8 semanas (full-time)
- **Resultado Final:** Sistema auditado, testado 100%, pronto para produção

## Abordagem

- **Fase 1:** Diagnóstico e Planejamento (1 semana)
- **Fase 2:** Refatoração Estrutural (2 semanas)
- **Fase 3:** Qualidade de Código (1.5 semana)
- **Fase 4:** Funcionalidades Completas (2 semanas)
- **Fase 5:** Testes Completos (1.5 semana)
- **Fase 6:** Design System e UX (1 semana)
- **Fase 7:** Deploy e Go-Live (1 semana)

---

# 🔍 DIAGNÓSTICO ATUAL

## Problemas Identificados

### Estrutura

- [ ] Múltiplos padrões de componentes (inconsistência)
- [ ] Falta de separação clara entre módulos
- [ ] Estado global desorganizado
- [ ] Sem design system coeso
- [ ] Dark mode parcialmente implementado
- [ ] Responsividade quebrada em alguns módulos

### Qualidade de Código

- [ ] Falta de validações em diversos campos
- [ ] Erros não tratados adequadamente
- [ ] Duplicação de código (componentes, lógica)
- [ ] Sem pattern padrão de erro handling
- [ ] Performance não otimizada
- [ ] Sem logs estruturados

### Funcionalidades

- [ ] Campo "Fita de Borda" não funciona (não integra estoque)
- [ ] Import CSV de SketchUp incompleto
- [ ] Cálculos de orçamento podem estar errados
- [ ] Falta validação de estoque
- [ ] Sem histórico de edições
- [ ] Sem soft deletes
- [ ] Permissões de usuário não implementadas

### Testes

- [ ] Zero testes automatizados (E2E, Unit, Integration)
- [ ] Não há suite de testes
- [ ] Não há CI/CD pipeline
- [ ] Sem validação antes de deploy

### Design e UX

- [ ] Cores inconsistentes entre páginas
- [ ] Tipografia não padronizada
- [ ] Espaçamento aleatório
- [ ] Componentes não reutilizáveis
- [ ] Formulários com UX ruim
- [ ] Feedback ao usuário inadequado
- [ ] Botão de tema no footer (mal posicionado)
- [ ] "Controle de Produção PCP" duplicado

### Performance

- [ ] Sem otimização de imagens
- [ ] Sem code splitting
- [ ] Sem lazy loading
- [ ] Bundle size grande
- [ ] Lighthouse score baixo

---

# 🏗️ ARQUITETURA DA REFATORAÇÃO

## Estrutura Final Esperada

```
dluxury-crm/
├── src/
│   ├── components/           # Componentes reutilizáveis
│   │   ├── common/          # Button, Modal, Card, etc (design system)
│   │   ├── forms/           # Formulários padrão
│   │   ├── layouts/         # Navbar, Sidebar, Page layout
│   │   └── sections/        # Seções de página (Hero, Cards, etc)
│   │
│   ├── pages/               # Páginas por módulo
│   │   ├── clients/
│   │   ├── quotations/
│   │   ├── products/
│   │   ├── production/
│   │   ├── inventory/
│   │   ├── finance/
│   │   ├── reports/
│   │   └── settings/
│   │
│   ├── modules/             # Lógica de negócio
│   │   ├── clients/
│   │   │   ├── hooks/
│   │   │   ├── services/
│   │   │   ├── types/
│   │   │   └── validators/
│   │   ├── quotations/
│   │   ├── products/
│   │   ├── production/
│   │   ├── inventory/
│   │   ├── finance/
│   │   └── reports/
│   │
│   ├── services/            # Serviços globais
│   │   ├── api/
│   │   ├── auth/
│   │   ├── storage/
│   │   └── logging/
│   │
│   ├── hooks/               # Hooks reutilizáveis
│   │   ├── useForm
│   │   ├── useFetch
│   │   ├── useLocalStorage
│   │   └── useTheme
│   │
│   ├── types/               # TypeScript types globais
│   │   ├── api.ts
│   │   ├── entities.ts
│   │   ├── forms.ts
│   │   └── errors.ts
│   │
│   ├── utils/               # Utilitários
│   │   ├── formatting.ts
│   │   ├── validation.ts
│   │   ├── calculation.ts
│   │   └── helpers.ts
│   │
│   ├── styles/              # CSS global
│   │   ├── globals.css
│   │   ├── design-tokens.css
│   │   └── animations.css
│   │
│   ├── config/              # Configurações
│   │   ├── constants.ts
│   │   ├── routes.ts
│   │   ├── api.ts
│   │   └── theme.ts
│   │
│   └── App.tsx              # Root component
│
├── tests/                   # Testes
│   ├── unit/               # Testes unitários
│   ├── integration/        # Testes de integração
│   ├── e2e/               # Testes end-to-end
│   └── fixtures/          # Dados de teste
│
├── api/                    # Serverless functions (Vercel)
│   ├── clients/
│   ├── quotations/
│   ├── products/
│   ├── production/
│   ├── inventory/
│   └── middleware/
│
├── db/                     # Database
│   ├── schema/             # Drizzle schema
│   ├── migrations/         # Migrations
│   └── seeds/              # Dados iniciais
│
├── public/                 # Assets estáticos
│   ├── icons/
│   ├── logos/
│   └── images/
│
├── docs/                   # Documentação
│   ├── api.md
│   ├── architecture.md
│   ├── setup.md
│   └── contributing.md
│
└── tests.spec.ts           # Configuração Jest
```

---

# 📊 FASES DE EXECUÇÃO

## FASE 1: DIAGNÓSTICO E PLANEJAMENTO (Semana 1)

### Objetivo

Ter visão 360° completa do sistema e plano de ação validado.

### Tarefas

#### 1.1: Auditoria Técnica Completa

- [ ] Mapear estrutura atual do código
- [ ] Listar todos os componentes e sua reutilização
- [ ] Identificar duplicação de código
- [ ] Mapear fluxos de dados
- [ ] Avaliar performance (Lighthouse, bundle size)
- [ ] Verificar type coverage (TypeScript)
- [ ] Listar todas dependências npm
- [ ] Verificar segurança (vulnerabilidades)

**Entrega:** Relatório de auditoria (5-10 páginas)

#### 1.2: Auditoria de Funcionalidades

- [ ] Listar TODAS as funcionalidades (25+)
- [ ] Verificar quais funcionam/não funcionam
- [ ] Priorizar por criticidade
- [ ] Identificar campos que faltam/estão quebrados
- [ ] Testar integração banco de dados
- [ ] Validar cálculos de orçamento
- [ ] Verificar permissões de usuário

**Entrega:** Matriz de funcionalidades (status)

#### 1.3: Auditoria de Design e UX

- [ ] Mapear cores usadas no sistema
- [ ] Listar todas as fontes
- [ ] Documentar inconsistências visuais
- [ ] Avaliar responsividade
- [ ] Verificar accessibility (WCAG)
- [ ] Avaliar feedback ao usuário
- [ ] Documentar componentes duplicados

**Entrega:** Design audit report

#### 1.4: Definir Padrões Técnicos

- [ ] Definir arquitetura de componentes
- [ ] Padrão de naming (arquivos, variáveis, tipos)
- [ ] Pattern de state management
- [ ] Padrão de error handling
- [ ] Padrão de logging
- [ ] Padrão de testes
- [ ] Padrão de commit messages

**Entrega:** Technical Specification Document

#### 1.5: Criar Roadmap Detalhado

- [ ] Timeline realista por fase
- [ ] Dependências entre fases
- [ ] Recursos necessários (horas, agentes)
- [ ] Checkpoints de validação
- [ ] Critérios de sucesso

**Entrega:** Roadmap executivo com timelines

### Skills Recomendadas

- `codebase-cleanup-tech-debt` (auditoria código)
- `architecture-review` (arquitetura)
- `performance-profiling` (performance)
- `security-audit` (segurança)
- `design-taste-frontend` (design)
- `ux-audit` (experiência do usuário)

### Checkpoint 1

- [ ] Todos audits completos
- [ ] Problemas documentados
- [ ] Priorização feita
- [ ] Padrões definidos
- [ ] Roadmap aprovado

**Go/No-go Decision:** Pode prosseguir para Fase 2?

---

## FASE 2: REFATORAÇÃO ESTRUTURAL (Semanas 2-3)

### Objetivo

Reorganizar código seguindo padrões, limpar tech debt, estruturar módulos.

### Tarefas

#### 2.1: Criar Design System Base

- [ ] Definir paleta de cores (5-6 cores base + variações)
- [ ] Definir tipografia (3-4 fontes com pesos)
- [ ] Definir spacing system (base 8px)
- [ ] Definir elevation/shadows
- [ ] Definir border-radius padrão
- [ ] Implementar CSS variables
- [ ] Criar documento de design tokens

**Entrega:** Design system completo em tailwind.config.ts

#### 2.2: Reorganizar Estrutura de Pastas

- [ ] Criar nova estrutura de diretórios
- [ ] Mover componentes para seus locais corretos
- [ ] Consolidar componentes duplicados
- [ ] Criar barris (index.ts) para imports limpos
- [ ] Atualizar todos os imports

**Entrega:** Estrutura reorganizada, sem imports quebrados

#### 2.3: Refatorar Componentes Comuns

- [ ] Criar biblioteca de componentes base (Button, Input, Modal, etc)
- [ ] Padronizar props e interfaces
- [ ] Implementar dark mode em todos
- [ ] Adicionar prop de tamanho/variação
- [ ] Documentar cada componente
- [ ] Criar Storybook (opcional)

**Entrega:** Library de componentes reutilizáveis

#### 2.4: Organizar Types e Interfaces

- [ ] Centralizar tipos globais
- [ ] Criar types por módulo
- [ ] Definir tipos de API response
- [ ] Criar types de erro padronizados
- [ ] Documentar tipos principais

**Entrega:** Type system bem organizado

#### 2.5: Criar Padrão de State Management

- [ ] Definir estratégia (Context API, Zustand, Redux)
- [ ] Criar hooks reutilizáveis
- [ ] Implementar padrão de ações/reducers
- [ ] Adicionar persistência (localStorage)
- [ ] Documentar fluxo de estado

**Entrega:** State management pattern implementado

#### 2.6: Refatorar Services e Utils

- [ ] Criar serviço de API centralizado
- [ ] Criar utils de validação padronizadas
- [ ] Criar utils de formatting
- [ ] Criar utils de cálculos
- [ ] Criar helpers reutilizáveis

**Entrega:** Services e utils organizados

### Skills Recomendadas

- `architecture-patterns`
- `codebase-cleanup-refactor-clean`
- `frontend-design`
- `tailwind-design-system`
- `typescript-expert`
- `code-refactoring-refactor-clean`

### Checkpoint 2

- [ ] Design system implementado
- [ ] Estrutura reorganizada
- [ ] Componentes consolidados
- [ ] Types centralizados
- [ ] State management padrão definido
- [ ] Zero imports quebrados
- [ ] Sistema compila sem erro

**Go/No-go Decision:** Pode prosseguir para Fase 3?

---

## FASE 3: QUALIDADE DE CÓDIGO (Semana 3-4)

### Objetivo

Melhorar qualidade, segurança e manutenibilidade do código.

### Tarefas

#### 3.1: Implementar Error Handling

- [ ] Criar padrão global de error handling
- [ ] Implementar try/catch em todos os módulos
- [ ] Criar custom error classes
- [ ] Adicionar error logging estruturado
- [ ] Criar error boundaries React
- [ ] Implementar retry logic onde necessário

**Entrega:** Error handling consistente em todo sistema

#### 3.2: Adicionar Validações

- [ ] Validação frontend em todos forms
- [ ] Validação backend em todos endpoints
- [ ] Criar validadores reutilizáveis (Zod/Yup)
- [ ] Validar tipos de dados
- [ ] Validar ranges/limits
- [ ] Validar constraints de negócio

**Entrega:** Validações em todos pontos de entrada

#### 3.3: Refatorar Lógica de Negócio

- [ ] Extrair lógica de componentes para services
- [ ] Consolidar regras de cálculos (orçamento, margem, etc)
- [ ] Centralizar validações de negócio
- [ ] Criar helpers para lógicas complexas
- [ ] Documentar regras de negócio

**Entrega:** Lógica de negócio bem organizada

#### 3.4: Optimizar Performance

- [ ] Implementar code splitting
- [ ] Lazy load componentes pesados
- [ ] Otimizar re-renders (React.memo, useMemo)
- [ ] Implementar virtual scrolling para listas grandes
- [ ] Otimizar imagens
- [ ] Minificar assets
- [ ] Implementar caching adequado

**Entrega:** Performance otimizada (Lighthouse 90+)

#### 3.5: Security Review

- [ ] Verificar proteção contra XSS
- [ ] Verificar proteção contra CSRF
- [ ] Verificar proteção contra SQL injection
- [ ] Validar autenticação/autorização
- [ ] Verificar handling de secrets
- [ ] Implementar rate limiting (se necessário)
- [ ] Adicionar CORS corretamente

**Entrega:** Security audit aprovado

#### 3.6: Code Quality Tools

- [ ] Configurar ESLint com regras estritas
- [ ] Configurar Prettier para formatting
- [ ] Implementar pre-commit hooks (husky)
- [ ] Configurar SonarQube ou CodeFactor
- [ ] Rodar primeira analysis

**Entrega:** Code quality tools configurados

### Skills Recomendadas

- `error-handling-patterns`
- `backend-security-coder`
- `frontend-security-coder`
- `performance-optimizer`
- `code-review-excellence`
- `security-auditor`

### Checkpoint 3

- [ ] Todos erros tratados
- [ ] Validações implementadas
- [ ] Performance otimizada
- [ ] Security aprovada
- [ ] Code quality tools configurados
- [ ] Linting passa 100%

**Go/No-go Decision:** Pode prosseguir para Fase 4?

---

## FASE 4: FUNCIONALIDADES COMPLETAS (Semanas 4-5)

### Objetivo

Garantir que TODAS as funcionalidades funcionem perfeitamente, sem bugs.

### Tarefas

#### 4.1: Auditar Cada Módulo

Para CADA módulo (Clientes, Orçamentos, SKU, etc):

```
4.1.1: Módulo CLIENTES
- [ ] Listar clientes funciona?
- [ ] Buscar/filtrar funciona?
- [ ] Criar cliente sem erro?
- [ ] Validações aparecem?
- [ ] Editar cliente funciona?
- [ ] Deletar cliente funciona?
- [ ] Dados salvam corretamente?
- [ ] Pagination funciona?
- [ ] Responsividade OK?
- [ ] Dark mode OK?

4.1.2: Módulo SKU/PRODUTOS
- [ ] Listar SKU funciona?
- [ ] Criar SKU sem erro?
- [ ] Validação de código único?
- [ ] Editar SKU funciona?
- [ ] Deletar SKU funciona?
- [ ] Estoque atualiza?
- [ ] Preços calculam?
- [ ] Integração com orçamento funciona?

4.1.3: Módulo ORÇAMENTOS
- [ ] Criar orçamento funciona?
- [ ] Selecionar cliente funciona?
- [ ] Adicionar items funciona?
- [ ] Calcular margem correto?
- [ ] Total está certo?
- [ ] EDITAR ITEM COMPLETO:
  └─ SKU selecionável?
  └─ Quantidade editável?
  └─ Preço editável?
  └─ 🔴 FITA DE BORDA FUNCIONA? (campo problemático)
  └─ Puxador selecionável?
  └─ Rodapé selecionável?
  └─ Tinta selecionável?
  └─ Vidro selecionável?
  └─ TODOS campos trabalham com estoque?
- [ ] Deletar item funciona?
- [ ] Import CSV funciona?
  └─ Parse arquivo correto?
  └─ SKU matching funciona?
  └─ Totais recalculam?
- [ ] Export PDF gera corretamente?
  └─ Logo aparece?
  └─ Dados corretos?
  └─ Totais precisos?
- [ ] Deletar orçamento funciona?

4.1.4: Módulo PRODUÇÃO
- [ ] Criar ordem funciona?
- [ ] Atualizar status funciona?
- [ ] Plano de corte funciona?
- [ ] Completar ordem funciona?
- [ ] Histórico mantido?

4.1.5: Módulo ESTOQUE
- [ ] Entrada estoque funciona?
- [ ] Saída estoque funciona?
- [ ] Saldo calcula correto?
- [ ] Movimentações registram?
- [ ] Histórico completo?

4.1.6: Módulo FINANCEIRO (se existir)
- [ ] Emitir NF funciona?
- [ ] Registrar pagamento funciona?
- [ ] Status muda correto?
- [ ] Dados salvam?

4.1.7: Módulo RELATÓRIOS (se existir)
- [ ] Gerar relatório funciona?
- [ ] Filtros funcionam?
- [ ] Dados precisos?
- [ ] Export (PDF/Excel) funciona?
```

**Entrega:** Todos módulos funcionando 100%

#### 4.2: Testar Integrações Entre Módulos

- [ ] Cliente → Orçamento (vinculação)
- [ ] Orçamento → Produção (cópia de items)
- [ ] Produção → Estoque (consumo)
- [ ] Estoque → Orçamento (disponibilidade)
- [ ] Orçamento → Financeiro (faturamento)
- [ ] Histórico global (edições rastreadas)

**Entrega:** Integrações sem erros

#### 4.3: Corrigir Campo "Fita de Borda"

- [ ] Identificar por que não funciona
- [ ] Verificar se SKU de fita existe no banco
- [ ] Verificar se API retorna SKUs de fita
- [ ] Verificar se componente select renderiza
- [ ] Verificar se consegue selecionar
- [ ] Verificar se salva no banco
- [ ] Corrigir erro de raiz

**Entrega:** Campo "Fita de Borda" funcionando 100%

#### 4.4: Corrigir Todos Campos Selecionáveis de Estoque

- [ ] Puxador/Maçaneta funciona?
- [ ] Rodapé funciona?
- [ ] Tinta funciona?
- [ ] Vidro funciona?
- [ ] Qualquer outro campo?

**Entrega:** TODOS campos de estoque funcionam

#### 4.5: Implementar Soft Deletes

- [ ] Adicionar campo "deleted_at" no schema
- [ ] Implementar soft delete lógico
- [ ] Atualizar queries para filtrar deletados
- [ ] Adicionar opção de restaurar (admin)
- [ ] Manter auditoria de deleção

**Entrega:** Soft deletes implementado

#### 4.6: Implementar Histórico de Edições

- [ ] Criar tabela de audit/history
- [ ] Registrar toda edição (who, when, what)
- [ ] Mostrar histórico ao usuário
- [ ] Permitir reverter mudanças (se necessário)

**Entrega:** Audit trail completo

#### 4.7: Implementar Permissões de Usuário

- [ ] Definir roles (Admin, Vendedor, Operador, etc)
- [ ] Implementar RBAC (Role-Based Access Control)
- [ ] Restringir ações por role
- [ ] Mostrar/esconder botões baseado em permissão
- [ ] Validar permissões no backend

**Entrega:** RBAC implementado

### Skills Recomendadas

- `code-review-excellence`
- `debugging-toolkit-smart-debug`
- `error-debugging-error-analysis`
- `database-design`
- `api-design-principles`
- `test-automator`

### Checkpoint 4

- [ ] Todos módulos funcionando
- [ ] Integrações sem erros
- [ ] Fita de Borda corrigida
- [ ] Campos de estoque funcionam
- [ ] Soft deletes implementado
- [ ] Histórico funcionando
- [ ] Permissões implementadas
- [ ] Zero erros críticos

**Go/No-go Decision:** Pode prosseguir para Fase 5?

---

## FASE 5: TESTES COMPLETOS (Semanas 5-6)

### Objetivo

Implementar suite de testes que cobrindo 100% das funcionalidades.

### Tarefas

#### 5.1: Configurar Infraestrutura de Testes

- [ ] Instalar Jest + React Testing Library
- [ ] Configurar Playwright para E2E
- [ ] Estruturar pasta de testes
- [ ] Criar fixtures de dados
- [ ] Configurar mocking (API, localStorage)
- [ ] Configurar CI/CD (GitHub Actions)

**Entrega:** Infraestrutura de testes pronta

#### 5.2: Testes Unitários

- [ ] Utils (validação, formatting, cálculos): 100% cobertura
- [ ] Custom hooks: testes de todos hooks
- [ ] Componentes: testes de rendering e props
- [ ] Services: testes de lógica de negócio

**Meta:** 80%+ cobertura de código

**Entrega:** Unit tests executando no CI

#### 5.3: Testes de Integração

- [ ] Teste fluxo Clientes (CRUD)
- [ ] Teste fluxo Orçamentos (criar, adicionar items, calcular)
- [ ] Teste fluxo Produção (criar ordem, atualizar status)
- [ ] Teste fluxo Estoque (entrada/saída)
- [ ] Teste integrações entre módulos

**Entrega:** Integration tests cobrindo principais fluxos

#### 5.4: Testes E2E (End-to-End)

Execute os testes completos da Fase 4 (todos os 50+ testes):

- [ ] Teste COMPLETO login
- [ ] Teste COMPLETO Clientes (criar, editar, deletar, buscar)
- [ ] Teste COMPLETO SKU
- [ ] Teste COMPLETO Orçamentos:
  - Criar orçamento
  - Adicionar items
  - Editar CADA campo (especialmente Fita de Borda)
  - Import CSV
  - Export PDF
  - Deletar
- [ ] Teste COMPLETO Produção
- [ ] Teste COMPLETO Estoque
- [ ] Teste COMPLETO Financeiro
- [ ] Teste dark mode
- [ ] Teste responsividade
- [ ] Teste edge cases

**Meta:** 100% dos fluxos principais testados

**Entrega:** E2E tests cobrindo 100% dos cenários críticos

#### 5.5: Testes de Performance

- [ ] Medir Lighthouse score
- [ ] Medir time to interactive
- [ ] Medir bundle size
- [ ] Testar com 1000+ registros
- [ ] Testar busca com grandes volumes

**Entrega:** Performance report com métricas

#### 5.6: Testes de Acessibilidade

- [ ] Axe accessibility scan
- [ ] WCAG compliance check
- [ ] Keyboard navigation
- [ ] Screen reader compatibility
- [ ] Color contrast validation

**Entrega:** Accessibility report

#### 5.7: Testes de Segurança

- [ ] OWASP top 10 checks
- [ ] XSS vulnerability scan
- [ ] SQL injection checks
- [ ] CSRF protection validation
- [ ] Authentication/authorization tests

**Entrega:** Security test report

#### 5.8: Configurar CI/CD Pipeline

- [ ] GitHub Actions workflow
- [ ] Rodar testes em PR
- [ ] Bloquear merge se testes falham
- [ ] Deploy automático em main branch
- [ ] Notificações de status

**Entrega:** CI/CD pipeline funcional

### Skills Recomendadas

- `e2e-testing`
- `test-automator`
- `unit-testing-test-generate`
- `performance-testing-review-ai-review`
- `security-scanning-security-hardening`

### Checkpoint 5

- [ ] Jest configurado
- [ ] Playwright configurado
- [ ] Unit tests cobrindo 80%+
- [ ] Integration tests cobrindo principais fluxos
- [ ] E2E tests cobrindo 100% cenários críticos
- [ ] Performance OK
- [ ] Accessibility OK
- [ ] Security OK
- [ ] CI/CD pipeline funcionando

**Go/No-go Decision:** Pode prosseguir para Fase 6?

---

## FASE 6: DESIGN SYSTEM E UX (Semana 6-7)

### Objetivo

Redesenhar interface seguindo design system, melhorar UX.

### Tarefas

#### 6.1: Implementar Design System Completo

- [ ] Aplicar paleta de cores globalmente
- [ ] Padronizar tipografia em todas páginas
- [ ] Padronizar spacing e grid
- [ ] Padronizar componentes (Button, Input, Card, Modal, etc)
- [ ] Padronizar ícones
- [ ] Padronizar animações

**Entrega:** Design system visível em 100% do sistema

#### 6.2: Redesenhar Página Principal (Dashboard)

- [ ] Criar layout profissional
- [ ] Adicionar cards com métricas
- [ ] Adicionar gráficos/charts
- [ ] Adicionar quick actions
- [ ] Responsive design
- [ ] Dark mode

**Entrega:** Dashboard redesenhado

#### 6.3: Redesenhar Formulários

- [ ] Padronizar layout de forms
- [ ] Melhorar visual de inputs
- [ ] Adicionar validação visual (ícones)
- [ ] Adicionar ajuda/tooltips
- [ ] Melhorar feedback de erro
- [ ] Mobile-friendly

**Entrega:** Formulários com UX melhorada

#### 6.4: Redesenhar Tabelas

- [ ] Adicionar sorting/filtering visual
- [ ] Melhorar pagination
- [ ] Adicionar inline actions
- [ ] Adicionar busca rápida
- [ ] Mobile-friendly (stack em mobile)

**Entrega:** Tabelas com melhor UX

#### 6.5: Melhorar Navegação

- [ ] Sidebar navegação clara
- [ ] Breadcrumb em páginas aninhadas
- [ ] Menu responsivo em mobile
- [ ] Search global funcional
- [ ] Feedback de página ativa

**Entrega:** Navegação melhorada

#### 6.6: Melhorar Feedback ao Usuário

- [ ] Toast notifications (sucesso, erro, aviso)
- [ ] Loading states em operações
- [ ] Confirmações antes de deletar
- [ ] Mensagens de erro claras
- [ ] Animações de transição
- [ ] Skeleton loading

**Entrega:** Feedback visual em todo sistema

#### 6.7: Implementar Dark Mode Completo

- [ ] Verificar que funciona em TODAS páginas
- [ ] Cores contrastadas
- [ ] Sem bugs visuais
- [ ] Persistência de tema
- [ ] Botão tema no navbar (topo)

**Entrega:** Dark mode 100% funcional

#### 6.8: Responsividade Completa

- [ ] Testar em mobile (375px)
- [ ] Testar em tablet (768px)
- [ ] Testar em desktop (1920px)
- [ ] Sem scroll horizontal
- [ ] Componentes se adaptam
- [ ] Toque vs mouse

**Entrega:** Responsividade 100%

#### 6.9: Remover Redundâncias

- [ ] Remover "Controle de Produção PCP" de módulos desnecessários
- [ ] Manter apenas onde necessário
- [ ] Limpar UI de elementos não utilizados

**Entrega:** UI limpa sem redundâncias

#### 6.10: Documentar Design System

- [ ] Criar Storybook ou Figma
- [ ] Documentar cada componente
- [ ] Mostrar variações
- [ ] Indicar quando usar cada componente

**Entrega:** Design system documentado

### Skills Recomendadas

- `frontend-design`
- `design-taste-frontend`
- `tailwind-patterns`
- `ui-review`
- `ux-audit`
- `high-end-visual-design`

### Checkpoint 6

- [ ] Design system implementado
- [ ] Dashboard redesenhado
- [ ] Formulários melhorados
- [ ] Tabelas melhoradas
- [ ] Navegação clara
- [ ] Feedback ao usuário adequado
- [ ] Dark mode funcional 100%
- [ ] Responsividade 100%
- [ ] UI limpa

**Go/No-go Decision:** Sistema pronto para produção?

---

## FASE 7: DEPLOY E GO-LIVE (Semana 7-8)

### Objetivo

Fazer deploy seguro em produção com validação final.

### Tarefas

#### 7.1: Preparação Final

- [ ] Última auditoria de código
- [ ] Última execução de testes
- [ ] Performance final (Lighthouse)
- [ ] Security final scan
- [ ] Backup de database produção

**Entrega:** Sistema 100% pronto

#### 7.2: Preparar Dados de Produção

- [ ] Migrar dados históricos (se necessário)
- [ ] Validar integridade de dados
- [ ] Fazer backup
- [ ] Testar rollback procedure

**Entrega:** Dados validados

#### 7.3: Deploy em Staging

- [ ] Deploy em environment staging
- [ ] Rodar teste E2E completo
- [ ] Testar em diferentes browsers
- [ ] Testar em mobile
- [ ] Performance OK?

**Entrega:** Aprovação em staging

#### 7.4: Deploy em Produção

- [ ] Configurar variáveis de ambiente
- [ ] Deploy no Vercel
- [ ] Verificar logs
- [ ] Monitorar performance
- [ ] Estar preparado para rollback

**Entrega:** Sistema em produção

#### 7.5: Validação Pós-Deploy

- [ ] Testar principais fluxos
- [ ] Verificar que dados migrados corretamente
- [ ] Monitorar erros/logs
- [ ] Testar em mobile
- [ ] Testar dark mode
- [ ] Ter suporte on-call por 24h

**Entrega:** Validação completa

#### 7.6: Documentação Final

- [ ] Criar README completo
- [ ] Documentar setup/deploy
- [ ] Criar guia de troubleshooting
- [ ] Documentar fluxos principais
- [ ] Criar guia para próximos devs

**Entrega:** Documentação completa

#### 7.7: Treinamento/Onboarding

- [ ] Treinar time se houver
- [ ] Criar quickstart guide
- [ ] Demonstrar principais features

**Entrega:** Time preparado

### Skills Recomendadas

- `deployment-procedures`
- `production-code-audit`
- `devops-deploy`
- `incident-response-smart-fix`

### Checkpoint 7

- [ ] Sistema em produção
- [ ] Tudo funcionando
- [ ] Monitoramento ativo
- [ ] Documentação completa
- [ ] Team treinado
- [ ] Suporte disponível

**Go/No-go Decision:** Refatoração completa! ✅

---

# 🎯 SKILLS POR FASE

## Mapeamento Skills → Fases

### FASE 1: Diagnóstico

- `codebase-cleanup-tech-debt` - Auditoria técnica
- `code-review-excellence` - Revisão geral
- `architecture-patterns` - Padrões
- `performance-profiling` - Performance
- `security-audit` - Segurança
- `design-taste-frontend` - Design audit
- `ux-audit` - UX audit
- `business-analyst` - Análise de negócio

### FASE 2: Refatoração Estrutural

- `architecture-patterns` - Arquitetura
- `codebase-cleanup-refactor-clean` - Refactor
- `frontend-design` - Design system
- `tailwind-design-system` - Tailwind config
- `typescript-expert` - Types
- `code-refactoring-refactor-clean` - Refactor código

### FASE 3: Qualidade

- `error-handling-patterns` - Error handling
- `backend-security-coder` - Backend security
- `frontend-security-coder` - Frontend security
- `performance-optimizer` - Performance
- `code-review-excellence` - Code review
- `security-auditor` - Security review

### FASE 4: Funcionalidades

- `code-review-excellence` - Review
- `debugging-toolkit-smart-debug` - Debug
- `error-debugging-error-analysis` - Root cause
- `database-architect` - Database
- `api-design-principles` - API
- `test-automator` - Automação

### FASE 5: Testes

- `e2e-testing` - E2E tests
- `test-automator` - Automação
- `unit-testing-test-generate` - Unit tests
- `performance-testing-review-ai-review` - Performance tests
- `security-scanning-security-hardening` - Security tests

### FASE 6: Design & UX

- `frontend-design` - Redesign
- `design-taste-frontend` - Design refinement
- `tailwind-patterns` - Tailwind patterns
- `ui-review` - UI review
- `ux-audit` - UX review
- `high-end-visual-design` - Premium design

### FASE 7: Deploy

- `deployment-procedures` - Deploy
- `production-code-audit` - Final audit
- `devops-deploy` - DevOps
- `incident-response-smart-fix` - Suporte

---

# ✅ CHECKPOINTS DE VALIDAÇÃO

## Checkpoint Template

```
CHECKPOINT [número]: [Nome]
Data: [data planejada]

PRÉ-REQUISITOS:
- [ ] Fase anterior completa
- [ ] Testes passando
- [ ] Code review aprovado

CRITÉRIOS DE ACEITAÇÃO:
- [ ] Critério 1
- [ ] Critério 2
- [ ] Critério 3

ARTEFATOS DE ENTREGA:
- [ ] Entrega 1
- [ ] Entrega 2
- [ ] Entrega 3

RISCO & CONTINGÊNCIA:
- Risco 1: [mitigação]
- Risco 2: [mitigação]

GO/NO-GO DECISION:
[ ] GO - Prosseguir próxima fase
[ ] NO-GO - Voltar e corrigir
[ ] PARCIAL - Prosseguir com restrições

Assinado por: [agente/user]
```

---

# 📅 TIMELINE E RECURSOS

## Timeline Detalhada

```
SEMANA 1: Diagnóstico
├─ Dias 1-2: Auditorias técnicas
├─ Dias 3-4: Auditoria de funcionalidades
├─ Dias 5: Preparar roadmap

SEMANA 2-3: Refatoração Estrutural
├─ Dias 6-7: Design system
├─ Dias 8-10: Reorganização de código
├─ Dias 11-12: Componentes base
├─ Dias 13-14: State management

SEMANA 3-4: Qualidade de Código
├─ Dias 15-16: Error handling
├─ Dias 17-18: Validações
├─ Dias 19-20: Security review
├─ Dias 21: QA tools

SEMANA 4-5: Funcionalidades
├─ Dias 22-25: Audit cada módulo
├─ Dias 26-28: Corrigir bugs críticos
├─ Dias 29-30: Implementar features faltantes

SEMANA 5-6: Testes
├─ Dias 31-32: Configurar infraestrutura
├─ Dias 33-35: Unit tests
├─ Dias 36-38: Integration tests
├─ Dias 39-40: E2E tests

SEMANA 6-7: Design & UX
├─ Dias 41-42: Design system completo
├─ Dias 43-44: Redesenhar páginas
├─ Dias 45-46: Feedback visual
├─ Dias 47: Dark mode + responsividade

SEMANA 7-8: Deploy
├─ Dias 48-49: Preparação final
├─ Dias 50: Deploy staging
├─ Dias 51: Deploy produção
├─ Dias 52: Validação + suporte 24h
```

## Alocação de Recursos

### Agentes Necessários

- **Agente Principal (00-andruia-consultant):** Coordenação de todo processo
- **Agente Técnico (code-review/architecture):** Auditorias e refactor
- **Agente QA (e2e-testing):** Testes completos
- **Agente Design (frontend-design):** Design system e UX

### Tempo Estimado

- **Total:** 8 semanas (full-time)
- **Horas:** ~320-400 horas
- **Distribuição:** Fases não são sequenciais 100%, há paralelismo possível

### Melhorias Paralelas Possíveis

- Fase 2 (refactor) pode começar enquanto Fase 1 (diagnóstico) finaliza
- Testes unitários (Fase 5) podem ser criados durante Fase 4
- Design system (Fase 6) pode ser iniciado em Fase 2

---

# 📊 MÉTRICAS DE SUCESSO

## Métricas Técnicas

| Métrica                  | Target     | Validação               |
| ------------------------ | ---------- | ----------------------- |
| Type Coverage            | 95%+       | TypeScript strict mode  |
| Code Coverage            | 80%+       | Jest report             |
| Performance (Lighthouse) | 90+        | Lighthouse              |
| Bundle Size              | < 200KB    | webpack-bundle-analyzer |
| Test Pass Rate           | 100%       | CI/CD pipeline          |
| Code Duplication         | < 5%       | SonarQube               |
| Security Issues          | 0 critical | OWASP scan              |

## Métricas Funcionais

| Métrica                  | Target         | Validação         |
| ------------------------ | -------------- | ----------------- |
| Funcionalidades Cobrindo | 100%           | Test checklist    |
| E2E Tests Pass           | 100%           | Playwright report |
| Zero Critical Bugs       | 0              | Issue tracker     |
| Dark Mode                | 100% funcional | Manual test       |
| Responsividade           | 100%           | Device testing    |
| Acessibilidade           | WCAG AA        | Axe scan          |

## Métricas UX

| Métrica                  | Target     | Validação     |
| ------------------------ | ---------- | ------------- |
| Design System Compliance | 100%       | Design review |
| Tipografia Padronizada   | 3-4 fontes | Audit         |
| Cores Consistentes       | 5-6 base   | Audit         |
| Component Reuse          | 80%+       | Code analysis |

---

# 📝 DOCUMENTAÇÃO DE ENTREGA

Para CADA fase, entregar:

1. **Relatório de Status**
   - O que foi feito
   - O que falta
   - Bloqueadores (se houver)
   - Data de conclusão

2. **Artefatos Técnicos**
   - Código refatorado
   - Testes implementados
   - Documentação atualizada

3. **Métricas**
   - Cobertura de testes
   - Performance
   - Code quality
   - Security score

4. **Checklist de Qualidade**
   - Requisitos cumpridos
   - Riscos mitigados
   - Aprovação para próxima fase

---

# 🚀 PRÓXIMOS PASSOS

## Imediato (Hoje)

1. Validar este plano
2. Alocar resources
3. Começar Fase 1 (Diagnóstico)

## Curto Prazo (Semana 1)

1. Executar auditorias
2. Criar padrões técnicos
3. Definir timeline exata

## Médio Prazo (Semanas 2-4)

1. Refatorar estrutura
2. Melhorar qualidade
3. Corrigir funcionalidades

## Longo Prazo (Semanas 5-8)

1. Testar 100%
2. Redesenhar UX
3. Deploy produção

---

# 📞 ESCALATION & CONTINGÊNCIA

## Bloqueadores Conhecidos

1. **Fita de Borda não funciona** → Prioridade: Fase 4
2. **Componentes duplicados** → Prioridade: Fase 2
3. **Dark mode inconsistente** → Prioridade: Fase 6

## Se Atrasado

- Estender timeline em 1 semana por fase
- Priorizar funcionalidades críticas
- Descartar features nice-to-have

## Se Descobrir Bugs Críticos

- Pausar fase atual
- Corrigir bug crítico
- Retomar fase

## Rollback Plan

- Se deploy falha, voltar versão anterior
- Avisar usuários
- Não perder dados
- Ter suporte 24h

---

**Documento criado como baseline para refatoração completa do D'Luxury CRM**
**Status: Pronto para aprovação e execução**
**Próximo passo: Validar com stakeholders e iniciar Fase 1**
