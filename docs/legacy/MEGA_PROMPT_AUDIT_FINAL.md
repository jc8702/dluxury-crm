# 🎯 MEGA PROMPT FINAL - AUDIT COMPLETO PÓS-FASES

## Execute isto DEPOIS que todas as fases (1-7) forem completadas

---

## ⚠️ INSTRUÇÕES

Este prompt deve ser enviado ao agente (MiniMax M3, DeepSeek ou similar) APÓS a conclusão de todas as Fases (2B, 3, 4, 5, 6, 7).

O objetivo é obter um relatório COMPLETO do estado atual do projeto:

- ✅ O que está funcionando
- ❌ O que não está funcionando
- ⚠️ O que está quebrado
- 🔴 O que é crítico
- ⏳ O que está pendente

---

## 📋 PROMPT PARA O AGENTE

```
TAREFA: Audit Completo do Projeto D'Luxury CRM Após Refatoração Completa

REFERÊNCIA: Projeto em branch codex/prospeccao-marcenaria-antigravity
DATA: [DATA ATUAL]
OBJETIVO: Mapear estado COMPLETO do projeto

═══════════════════════════════════════════════════════════════

PARTE 1: VALIDAÇÃO DE BUILD & AMBIENTE

PASSO 1.1: Validação de Node/npm
[ ] Node version: (node -v)
[ ] npm version: (npm -v)
[ ] package-lock.json updated? (SIM/NÃO)
[ ] npm ci funciona? (SIM/NÃO)

PASSO 1.2: Validação de Build
npm run build

Resultado:
[ ] Build sucesso? (SIM/NÃO)
[ ] Se NÃO, erro principal:
    ┌─ Arquivo:
    ├─ Erro:
    └─ Stack:

[ ] Tamanho do bundle (dist/):
    ├─ Total:
    ├─ Maior arquivo:
    └─ Aceitável (< 300KB)? SIM/NÃO

[ ] Sem warnings do build? (SIM/NÃO)
[ ] Se NÃO, quantos warnings:

═══════════════════════════════════════════════════════════════

PARTE 2: VALIDAÇÃO DE LINT & FORMATTING

PASSO 2.1: ESLint
npm run lint

Resultado:
[ ] Erros ESLint: [NÚMERO]
[ ] Se > 0, maiores categorias:
    └─ [Categoria]: [Número]

[ ] Warnings ESLint: [NÚMERO]

PASSO 2.2: Prettier (se configurado)
npm run format:check

Resultado:
[ ] Arquivos mal formatados: [NÚMERO]

═══════════════════════════════════════════════════════════════

PARTE 3: VALIDAÇÃO DE TESTES

PASSO 3.1: Vitest (Unit Tests)
npm test

Resultado:
[ ] Total testes: [NÚMERO]
[ ] Testes passando: [NÚMERO]
[ ] Testes falhando: [NÚMERO]
[ ] Coverage: [PERCENTUAL]%

Se falhando:
┌─ Arquivo:
├─ Testes falhando: [LISTA]
└─ Erro:

[ ] Tempo de execução: [TEMPO]

PASSO 3.2: Playwright (E2E Tests)
npx playwright test

Resultado:
[ ] Total specs: [NÚMERO]
[ ] Specs passando: [NÚMERO]
[ ] Specs falhando: [NÚMERO]

Se falhando:
┌─ Arquivo:
├─ Spec:
└─ Erro:

[ ] Browser testado: [Chrome/Firefox/Safari]
[ ] Tempo de execução: [TEMPO]

PASSO 3.3: Coverage (se disponível)
npm test -- --coverage

Resultado:
[ ] Statements: [%]
[ ] Branches: [%]
[ ] Functions: [%]
[ ] Lines: [%]
[ ] Target (80%)? (SIM/NÃO)

═══════════════════════════════════════════════════════════════

PARTE 4: VALIDAÇÃO DE SEGURANÇA

PASSO 4.1: npm audit
npm audit

Resultado:
[ ] Vulnerabilidades: [NÚMERO]
[ ] Se > 0:
    ├─ Critical: [NÚMERO]
    ├─ High: [NÚMERO]
    └─ Medium: [NÚMERO]

PASSO 4.2: Verificação de Secrets
grep -r "password\|secret\|api_key" src/ --include="*.ts" --include="*.tsx" | grep -v ".env" | grep -v "process.env"

Resultado:
[ ] Secrets hardcoded: [NÚMERO]
[ ] Se > 0, listar:
    └─ [Arquivo]: [Linha]

PASSO 4.3: Verificação de .env
ls -la | grep .env

Resultado:
[ ] .env.example existe? (SIM/NÃO)
[ ] .env está em .gitignore? (SIM/NÃO)
[ ] .env.local está em .gitignore? (SIM/NÃO)

═══════════════════════════════════════════════════════════════

PARTE 5: ESTRUTURA DE PROJETO

PASSO 5.1: Árvore de diretórios críticos
ls -la src/

Resultado:
Listar estrutura:
src/
├─ components/
├─ pages/
├─ hooks/
├─ services/
├─ stores/
├─ types/
├─ schemas/
├─ utils/
├─ styles/
├─ db/
├─ api-lib/
└─ [OUTROS]

PASSO 5.2: Verificar componentes duplicados
find src/components -name "*.tsx" -o -name "*.ts" | sort

Resultado:
[ ] Componentes duplicados? (SIM/NÃO)
[ ] Se SIM:
    └─ [Componente]: [Localizações]

PASSO 5.3: Verificar imports órfãos
grep -r "from.*design-system" src/ 2>/dev/null | wc -l

Resultado:
[ ] Imports de design-system deletado: [NÚMERO]
[ ] Imports de paths inválidos: [NÚMERO]

═══════════════════════════════════════════════════════════════

PARTE 6: VALIDAÇÃO DE DATABASE

PASSO 6.1: Conexão Neon
echo "SELECT version();" | npm run db:query 2>/dev/null (ou similar)

Resultado:
[ ] Database conectado? (SIM/NÃO)
[ ] Se NÃO, erro:

PASSO 6.2: Schema Drizzle
ls -la src/db/schema/

Resultado:
[ ] Arquivos schema: [NÚMERO]
[ ] Listar:
    └─ [Arquivo]

[ ] Tabelas redundantes (9 → 3 consolidadas)? (SIM/NÃO)
[ ] Se NÃO consolidado:
    └─ Tabelas ainda redundantes:
        ├─ orcamentos
        ├─ orcamentos_pro
        ├─ orcamento_items
        └─ [OUTRAS]

PASSO 6.3: Migrations
ls -la src/db/migrations/ 2>/dev/null || echo "Migrations folder not found"

Resultado:
[ ] Pasta migrations existe? (SIM/NÃO)
[ ] Migrations aplicadas: [NÚMERO]
[ ] Migrations pendentes: [NÚMERO]

═══════════════════════════════════════════════════════════════

PARTE 7: VALIDAÇÃO DE MÓDULOS

Para CADA módulo abaixo, validar:

MÓDULO 1: CRM (Clientes, Leads)
[ ] Tabelas existem? (SIM/NÃO)
[ ] API endpoints funcionam? (SIM/NÃO)
[ ] UI pages renderizam? (SIM/NÃO)
[ ] CRUD funciona? (SIM/NÃO)
[ ] Testes passam? (SIM/NÃO)
[ ] Status: ✅ COMPLETO / ⚠️ PARCIAL / ❌ QUEBRADO

MÓDULO 2: Orçamentos/Quotations
[ ] Mini-BOM (chapa/fita/ferragens)? (SIM/NÃO)
[ ] SKU Matching (3 estratégias)? (SIM/NÃO)
[ ] Campo Fita de Borda funciona? (SIM/NÃO)
[ ] Margem % calcula? (SIM/NÃO)
[ ] Export PDF? (SIM/NÃO)
[ ] Testes passam? (SIM/NÃO)
[ ] Status: ✅ COMPLETO / ⚠️ PARCIAL / ❌ QUEBRADO

MÓDULO 3: Engenharia (SKUs, Calculadora)
[ ] Calculadora m² funciona? (SIM/NÃO)
[ ] SKU management? (SIM/NÃO)
[ ] Fórmulas parametrizadas? (SIM/NÃO)
[ ] Testes passam? (SIM/NÃO)
[ ] Status: ✅ COMPLETO / ⚠️ PARCIAL / ❌ QUEBRADO

MÓDULO 4: Produção (Kanban, PCP)
[ ] Kanban renderiza? (SIM/NÃO)
[ ] Drag-drop funciona? (SIM/NÃO)
[ ] Plano de Corte? (SIM/NÃO)
[ ] QR code rastreamento? (SIM/NÃO)
[ ] Simulador CNC 3D? (SIM/NÃO)
[ ] Testes passam? (SIM/NÃO)
[ ] Status: ✅ COMPLETO / ⚠️ PARCIAL / ❌ QUEBRADO

MÓDULO 5: Estoque (Granular, Compras)
[ ] Estoque atualiza? (SIM/NÃO)
[ ] Movimentos registram? (SIM/NÃO)
[ ] Compras integrado? (SIM/NÃO)
[ ] Fornecedores? (SIM/NÃO)
[ ] Testes passam? (SIM/NÃO)
[ ] Status: ✅ COMPLETO / ⚠️ PARCIAL / ❌ QUEBRADO

MÓDULO 6: Financeiro (DRE, Fluxo, Aging)
[ ] Dashboard financeiro renderiza? (SIM/NÃO)
[ ] Cálculos financeiros corretos? (SIM/NÃO)
[ ] Aging de recebíveis? (SIM/NÃO)
[ ] Fluxo de caixa? (SIM/NÃO)
[ ] Relatórios exportam? (SIM/NÃO)
[ ] Testes passam? (SIM/NÃO)
[ ] Status: ✅ COMPLETO / ⚠️ PARCIAL / ❌ QUEBRADO

MÓDULO 7: Pós-Venda (Garantia, Assistência)
[ ] Renderiza? (SIM/NÃO)
[ ] Testes passam? (SIM/NÃO)
[ ] Status: ✅ COMPLETO / ⚠️ PARCIAL / ❌ QUEBRADO

MÓDULO 8: Billing/SaaS (Asaas webhook)
[ ] Asaas integrado? (SIM/NÃO)
[ ] Webhook funciona? (SIM/NÃO)
[ ] Feature gates por plano? (SIM/NÃO)
[ ] Testes passam? (SIM/NÃO)
[ ] Status: ✅ COMPLETO / ⚠️ PARCIAL / ❌ QUEBRADO

MÓDULO 9: Prospecção Marcenaria (NOVO)
[ ] Schema tables criadas? (SIM/NÃO)
[ ] API endpoints? (SIM/NÃO)
[ ] Pages implementadas? (SIM/NÃO)
[ ] Testes? (SIM/NÃO)
[ ] Status: ✅ COMPLETO / ⚠️ PARCIAL / ❌ NÃO INICIADO

═══════════════════════════════════════════════════════════════

PARTE 8: VALIDAÇÃO DE UI/UX

PASSO 8.1: Design System
[ ] Colors definidas? (SIM/NÃO)
[ ] Typography definida? (SIM/NÃO)
[ ] Spacing scale? (SIM/NÃO)
[ ] Componentes base (Button, Card, Input, Modal): [NÚMERO]

PASSO 8.2: Dark Mode
npm run dev (abrir em browser)
[ ] Tema claro funciona? (SIM/NÃO)
[ ] Tema escuro funciona? (SIM/NÃO)
[ ] Toggle funciona? (SIM/NÃO)
[ ] Persiste em localStorage? (SIM/NÃO)

PASSO 8.3: Responsividade
Testar em 3 resoluções (F12 → Device Emulation):
[ ] Mobile (375px): OK? (SIM/NÃO)
[ ] Tablet (768px): OK? (SIM/NÃO)
[ ] Desktop (1920px): OK? (SIM/NÃO)

═══════════════════════════════════════════════════════════════

PARTE 9: VALIDAÇÃO DE PERFORMANCE

PASSO 9.1: Bundle Analysis
npm run build (já feito em Parte 1)
[ ] Total size: [SIZE]
[ ] Maior arquivo: [SIZE]
[ ] Aceitável (< 300KB total)? (SIM/NÃO)

PASSO 9.2: Lighthouse (se disponível)
npm run test -- src/test/performance/lighthouse.test.ts (se existe)
[ ] Performance score: [SCORE]/100
[ ] Accessibility score: [SCORE]/100
[ ] Best Practices score: [SCORE]/100
[ ] Target (>= 90): (SIM/NÃO)

PASSO 9.3: Dev Server Performance
npm run dev
[ ] Dev server inicia? (SIM/NÃO)
[ ] HMR funciona? (SIM/NÃO)
[ ] Recompila rápido? (SIM/NÃO)

═══════════════════════════════════════════════════════════════

PARTE 10: VALIDAÇÃO DE DEPLOYMENT

PASSO 10.1: Deploy Target
[ ] Vercel configurado? (SIM/NÃO)
[ ] Environment variables em Vercel? (SIM/NÃO)
[ ] Database URL configurado? (SIM/NÃO)

PASSO 10.2: Deployment Preview (se possível)
[ ] Já fez deploy em staging? (SIM/NÃO)
[ ] Já fez deploy em produção? (SIM/NÃO)
[ ] Se SIM, URL: [URL]

═══════════════════════════════════════════════════════════════

PARTE 11: DOCUMENTAÇÃO

PASSO 11.1: README.md
[ ] Existe? (SIM/NÃO)
[ ] Atualizado? (SIM/NÃO)
[ ] Instruções claras? (SIM/NÃO)

PASSO 11.2: Documentação Interna
[ ] Architecture.md? (SIM/NÃO)
[ ] Contributing.md? (SIM/NÃO)
[ ] API docs? (SIM/NÃO)

═══════════════════════════════════════════════════════════════

PARTE 12: PROBLEMAS CONHECIDOS & PENDÊNCIAS

PASSO 12.1: Listar Problemas Críticos (🔴)
┌─ Problema 1:
│  ├─ O que é:
│  ├─ Onde está:
│  ├─ Impacto: CRITICAL / HIGH / MEDIUM / LOW
│  └─ Como resolver:
│
├─ Problema 2:
│  └─ [Similar]
│
└─ [LISTAR TODOS]

PASSO 12.2: Listar Problemas Altos (🟠)
[Similar ao 12.1]

PASSO 12.3: Listar Warnings (🟡)
[Similar ao 12.1]

PASSO 12.4: Listar Pendências (⏳)
┌─ Pendência 1:
│  ├─ O que é:
│  ├─ Bloqueador?
│  └─ Esforço:
│
└─ [LISTAR TODAS]

═══════════════════════════════════════════════════════════════

PARTE 13: RESUMO EXECUTIVO

Preencher DEPOIS de completar as partes 1-12:

[ ] Projeto está pronto para produção? (SIM/NÃO/PARCIALMENTE)
[ ] Principais bloqueadores: [LISTAR]
[ ] % de completude estimado: [PERCENTUAL]%

Status por categoria:
├─ Build: ✅ / ⚠️ / ❌
├─ Tests: ✅ / ⚠️ / ❌
├─ Lint: ✅ / ⚠️ / ❌
├─ Security: ✅ / ⚠️ / ❌
├─ Database: ✅ / ⚠️ / ❌
├─ Modules (1-8): ✅ / ⚠️ / ❌
├─ UI/UX: ✅ / ⚠️ / ❌
├─ Performance: ✅ / ⚠️ / ❌
└─ Deployment: ✅ / ⚠️ / ❌

═══════════════════════════════════════════════════════════════

PARTE 14: RECOMENDAÇÕES (OPCIONAL)

Baseado em TUDO acima, sugerir:
1. Top 3 coisas a corrigir primeiro
2. Ordem recomendada
3. Tempo estimado para cada
4. Próximas fases após correções

═══════════════════════════════════════════════════════════════

FORMATO ESPERADO DE RESPOSTA:

Use a seguinte estrutura para responder:

# AUDIT REPORT — D'Luxury CRM
## Data: [DATA]

### PARTE 1: BUILD & AMBIENTE
- ✅ Build: [Status]
- ⚠️ Warnings: [Número]
- Bundle: [Tamanho]

### PARTE 2: LINT
- Erros: [Número]
- Warnings: [Número]

### PARTE 3: TESTES
- Vitest: [X/Y] passando
- Playwright: [X/Y] specs
- Coverage: [%]

[... continuar para cada parte]

### PARTE 13: RESUMO
- Pronto para produção? SIM/NÃO
- Completude: [%]
- Bloqueadores: [LISTA]

### PARTE 14: RECOMENDAÇÕES
1. [Recomendação 1]
2. [Recomendação 2]
3. [Recomendação 3]

═══════════════════════════════════════════════════════════════

FIM DO PROMPT
```

---

## 📋 COMO USAR ESTE MEGA PROMPT

### Quando usar:

```
DEPOIS QUE TODAS AS FASES FOREM COMPLETADAS:
├─ Fase 2B ✅
├─ Fase 3 ✅
├─ Fase 4 ✅
├─ Fase 5 ✅
├─ Fase 6 ✅
└─ Fase 7 ✅
```

### Como executar:

```
1. Copiar MEGA PROMPT completo acima
2. Enviar para agente (MiniMax/DeepSeek/Nemotron)
3. Aguardar relatório completo (30-60 min)
4. Agente entregará audit COMPLETO do projeto
```

### O que você receberá:

```
✅ Status de TUDO (build, testes, segurança, modules, etc)
✅ O que está funcionando
✅ O que está quebrado
✅ O que é crítico
✅ O que falta
✅ Recomendações prioritárias
```

### Depois:

```
1. Trazer relatório para mim (Claude)
2. Eu faço análise profunda
3. Definimos próximos passos de correção
4. Priorizamos o que fazer primeiro
```

---

## 🎯 VALOR DESTE MEGA PROMPT

```
SEM ESTE PROMPT:
❌ Não sabe o estado real do projeto
❌ Deixa coisas quebradas despercebidas
❌ Funcionalidades incompletas passam
❌ Técnica debt acumula
❌ Próximos passos são adivinhação

COM ESTE PROMPT:
✅ Visão COMPLETA e estruturada
✅ Sabe exatamente o que funciona/não funciona
✅ Identifica bloqueadores críticos
✅ Prioriza correções corretamente
✅ Próximos passos baseados em dados
```

---

## 📌 IMPORTANTE

```
Este prompt deve ser:
✅ Salvo em arquivo: MEGA_PROMPT_AUDIT_FINAL.md
✅ Reutilizável (pode rodar múltiplas vezes)
✅ Enviado para agente EM ETAPA FINAL do projeto
✅ Resultado trazido aqui para análise profunda
```

---

**Status:** ✅ MEGA PROMPT criado e pronto

**Quando usar:** Depois que todas as fases forem completadas

**Próximo passo:** Execute prompt com agente → traga resultado para análise
