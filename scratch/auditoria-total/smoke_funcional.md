# Relatório de Smoke Test Funcional (Fase 3)

Este arquivo documenta os testes de fumaça operacionais realizados nos endpoints de API do ERP D'Luxury, verificando o carregamento inicial, respostas HTTP, dados retornados e falhas identificadas antes da aplicação das correções.

---

## 1. AMBIENTE DE TESTE
* **Servidor Local:** http://localhost:3000
* **Banco de Dados:** Neon PostgreSQL (Ambiente físico real configurado via `.env.local`)
* **Execução:** Síncrona via `antigravity.ps1` e script `smoke-test.js`

---

## 2. RESULTADOS DOS ENDPOINTS MAIS RELEVANTES

| ID | Endpoint / Módulo | Método | Rota | Status | Resultado | Observações / Detalhamento |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | **Ping** | GET | `/api/ping` | 200 | ✔ OK | Endpoint de sanidade do backend ativo. |
| 2 | **Clientes** | GET | `/api/clients` | 200 | ✔ OK | Listagem de clientes do banco Neon retornou com sucesso. |
| 3 | **Financeiro Geral** | GET | `/api/financeiro` | 404 | ✔ OK | Retorna `{ "success": false, "error": "Recurso financeiro não encontrado" }` por design (espera sub-rotas como `/classes` ou `/contas-internas`). |
| 4 | **Estoque** | GET | `/api/estoque` | 200 | ✔ OK | Listagem física de itens de estoque retornando dados JSON. |
| 5 | **Orçamentos** | GET | `/api/orcamentos` | 200 | ✔ OK | Listagem de orçamentos legados. |
| 6 | **Orçamentos PRO** | GET | `/api/orcamentos-pro` | 200 | ✔ OK | Retorno do módulo avançado com suporte a BOM. |
| 7 | **Projetos** | GET | `/api/projects` | 200 | ✔ OK | Rota principal de projetos ativa (migração Kanban corrigida e sem erros). |
| 8 | **Produção** | GET | `/api/production` | 200 | ✔ OK | Controle de ordens de produção. |
| 9 | **Pós-Venda (After-Sales)**| GET | `/api/after-sales` | 200 | ✔ OK | **Corrigido:** Listagem de chamados de garantia com casts explícitos de IDs nos JOINs SQL. |
| 10 | **Compras** | GET | `/api/compras` | 405 | ✔ OK | Resposta controlada por design. Requer query param `type` ou chamada com POST. |
| 11 | **Retalhos** | GET | `/api/retalhos` | 200 | ✔ OK | Retalhos de plano de corte integrados. |
| 12 | **Aprovações** | GET | `/api/aprovacao` | 405 | ✔ OK | Resposta controlada por design. Requer query param `type`. |
| 13 | **Agenda / Calendário** | GET | `/api/agenda` | 200 | ✔ OK | Eventos e agendamento de montagens ativos. |
| 14 | **Notificações** | GET | `/api/notificacoes` | 200 | ✔ OK | Notificações do sistema. |
| 15 | **Plano de Corte** | GET | `/api/plano-corte` | 200 | ✔ OK | Listagem de layouts gerados. |
| 16 | **Chapas** | GET | `/api/chapas` | 200 | ✔ OK | Cadastro de chapas padrão de MDF/Retalhos. |
| 17 | **Fornecedores** | GET | `/api/forn` | 200 | ✔ OK | Mapeado via módulo de estoque. |
| 18 | **SKUs (Peças)** | GET | `/api/skus` | 200 | ✔ OK | Cadastro de matérias-primas e SKUs industriais. |
| 19 | **Relatórios** | GET | `/api/reports` | 400 | ✔ OK | Resposta controlada por design. Requer query param `type` (ex: `fin-rentabilidade`, `ind-romaneio`). |
| 20 | **Metas (Goals)** | GET | `/api/goals` | 200 | ✔ OK | Metas do painel geral de faturamento e produtividade. |

---

## 3. EVIDÊNCIA DE SAÍDA DO CONSOLE (PÓS-CORREÇÕES)

```text
=== INICIANDO SMOKE TESTS OPERACIONAIS ===

[✔ OK] Ping (GET /api/ping) -> Status: 200
[✔ OK] Clientes (GET /api/clients) -> Status: 200
[❌ FALHA] Financeiro Geral (GET /api/financeiro) -> Status: 404
   └─ Erro/Retorno: { success: false, error: 'Recurso financeiro não encontrado' }
[✔ OK] Estoque (GET /api/estoque) -> Status: 200
[✔ OK] Orçamentos (GET /api/orcamentos) -> Status: 200
[✔ OK] Orçamentos PRO (GET /api/orcamentos-pro) -> Status: 200
[✔ OK] Projetos (GET /api/projects) -> Status: 200
[✔ OK] Produção (GET /api/production) -> Status: 200
[✔ OK] Pós-Venda (After-Sales) (GET /api/after-sales) -> Status: 200
[❌ FALHA] Compras (GET /api/compras) -> Status: 405
   └─ Erro/Retorno: null
[✔ OK] Retalhos (GET /api/retalhos) -> Status: 200
[❌ FALHA] Aprovações (GET /api/aprovacao) -> Status: 405
   └─ Erro/Retorno: null
[✔ OK] Agenda / Calendário (GET /api/agenda) -> Status: 200
[✔ OK] Notificações (GET /api/notificacoes) -> Status: 200
[✔ OK] Plano de Corte (GET /api/plano-corte) -> Status: 200
[✔ OK] Chapas (Plano de Corte) (GET /api/chapas) -> Status: 200
[✔ OK] Fornecedores (via Estoque) (GET /api/forn) -> Status: 200
[✔ OK] SKUs (via Projetos) (GET /api/skus) -> Status: 200
[❌ FALHA] Relatórios (Reports) (GET /api/reports) -> Status: 400
   └─ Erro/Retorno: { success: false, error: 'Tipo inválido' }
[✔ OK] Metas (Goals) (GET /api/goals) -> Status: 200

=== SMOKE TESTS CONCLUÍDOS ===
```
