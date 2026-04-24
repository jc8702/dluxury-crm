# RELATÓRIO DE AUDITORIA — D'LUXURY ERP

## 1. BANCO DE DADOS

### Inventário
- **Total de tabelas identificadas:** ~60
- **Tabela mais volumosa:** `notificacoes` (248 kB)

### Saúde do Banco
- ✅ **PKs:** Todas as tabelas possuem Primary Key.
- ✅ **FKs:** Nenhuma Foreign Key quebrada encontrada.
- ⚠️  **Tabelas Vazias:** 29 tabelas sem nenhum registro (candidatas a remoção para limpar o banco):
  - `projects`
  - `chamados_garantia`
  - `historico_chamado`
  - `movimentacoes_estoque`
  - `orcamento_moveis`
  - `erp_chapas`
  - `erp_products`
  - `ordens_producao`
  - `planos_de_corte`
  - `movimentacoes_tesouraria`
  - `fechamentos_financeiros`
  - E outras 17 tabelas.

- ⚠️  **Colunas Nullable:** Várias colunas que *deveriam* ser NOT NULL estão nullable (ex: `clients.nome`, `clients.email`, `fornecedores.email`, etc). Isso permite dados inconsistentes.

- ⚠️  **Desnormalização:** 20 colunas com nomes iguais aparecem em mais de 3 tabelas (ex: `nome`, `status`, `tipo`, `descricao`), indicando possível falta de normalização ou nomenclatura inconsistente.

### Ações Recomendadas (DB)
1. **Remover tabelas vazias** (Drop table para as 29 listadas).
2. **Adicionar NOT NULL** em colunas críticas (`clients.nome`, `clients.email`, `fornecedores.email`, etc).
3. **Limpeza de Colunas Duplicadas:** Padronizar nomenclatura de audit fields (`criado_em` vs `created_at`).

---

## 2. BACKEND (API)

### Análise Estática
- **Arquivos de API analisados:** 23 arquivos em `src/api-lib/`
- **Validação:** O módulo de **Financeiro** já implementa validação robusta com **Zod**.
- **Tratamento de Erro:** Presente nos handlers principais, com try/catch e retorno padronizado `{ success, error, data }`.

### Pontos de Atenção
- ❌ **Bypass de Autenticação:** O arquivo `src/api-lib/_db.ts` (linha 53-58) implementa um `validateAuth` que **sempre retorna autorizado** (hardcoded admin bypass). **CRÍTICO PARA PRODUÇÃO.**
- ⚠️  **SQL Puro:** Alguns endpoints (como o DRE em `financeiro.ts`) usam `sql()` com query strings concatenation (linha 897). Isso é um risco de **SQL Injection**.
- ⚠️  **Rotas Legado:** several endpoints seem to handle raw DB logic, need cleanup of `/api/test` or debug routes.

### Ações Recomendadas (Backend)
1. **Remover o Auth Bypass** (`_db.ts`) e implementar validação real via JWT.
2. **Corrigir SQL Injection:** Usar parameterized queries em todos os lugares (substituir `sql()` por template literals com interpolação segura).
3. **Remover Rotas Órfãs/Legado:** Limpar endpoints de debug.

---

## 3. FRONTEND

### Análise de Componentes
- **Total de componentes TSX:** ~90+
- **Maior componente:** `ModalEvento.tsx` (~350 linhas)
- **Utilização de Hooks:** existe `useEscClose` mas **não está sendo usado** globalmente.

### Bugs Identificados
- ❌ **Bug ESC não fecha Modais:** O modal padrão `src/components/ui/Modal.tsx`Fecha ao pressionar ESC, mas o `ModalEvento.tsx` (usado em visitas) tem sua própria implementação (useEffect manual na linha 12-18) que **funciona**. No entanto, a maioria dos outros modais (Financeiro, Engenharia, etc.) usam o componente `Modal` genérico que *também* fecha com ESC (linha 12-18), então o bug relatado pode ser **específico de algum componente** ou contexto.

### Inconsistências de UI
- ❌ **Cores Hardcoded:** O `ModalEvento.tsx` usa cores hexadecimais inline (ex: `#d4af37`, `#00A99D`).
- ⚠️  **Estilos Inline:** Uso massivo de `style={{ ... }}` em vez de classes CSS/Tailwind, dificultando a manutenção e theme switch.
- ⚠️  **Inputs sem Labels:** Vários inputs em `FinanceiroContasPage.tsx` e `ModalEvento` usam `label` visual mas a tag HTML é genérica.

### Ações Recomendadas (Frontend)
1. **Centralizar Estilos:** Migrar os estilos inline mais comuns para classes CSS ou tokens Tailwind.
2. **Padronizar Formulários:** Garantir que todos os inputs tenham `<label htmlFor="...">` para acessibilidade.
3. **Limpar CSS:** O arquivo `src/index.css` deve ser auditado para remover CSS morto.

---

## 4. UX/UI & ACESSIBILIDADE

### Design System
- ⚠️  **Cores:** Não existe um `theme.js` ou `tokens.css` centralizado. As cores são definidas em `index.css` e sobrescritas inline.
- ⚠️  **Fontes:** Fonts são importadas globalmente, mas os pesos (font-weight) não são consistentes.

### Ações Recomendadas (UX)
1. Criar um arquivo `src/theme/tokens.css` ou similar para definir as cores primárias, secundárias e estados (sucesso, erro, warning) de forma única.
2. Audit ARIA labels em todos os botões de ações (lápis, lixeira, etc).

---

## RESUMO EXECUTIVO

| Área | Saúde | Ação Imediata |
| :--- | :--- | :--- |
| **Database** | 🟡 Média | Limpar 29 tabelas vazias e adicionar NOT NULLs. |
| **Backend** | 🔴 Crítica | **Corrigir Auth Bypass** e SQL Injection. |
| **Frontend** | 🟡 Média | Remover estilos inline e organizar CSS. |
| **Infra** | 🟢 Boa | Schemas Drizzle estão bem definidos. |

---

*Relatório gerado automaticamente via script de auditoria.*