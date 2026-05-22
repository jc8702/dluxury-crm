# Matriz de Status Inicial (ERP D'Luxury)

Esta matriz apresenta a avaliação inicial de qualidade e confiabilidade de todos os 18 módulos do sistema antes de qualquer correção de código (Fase 0/1).

| ID | Módulo | Status | Justificativa | Testes Unitários | Observação |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | **Painel Geral** | Amarelo 🟡 | Sem testes automatizados. Funciona no smoke test local. | 0% | Sem cobertura direta. |
| 2 | **Clientes** | Amarelo 🟡 | Sem testes automatizados. Funciona no smoke test local. | 0% | Sem cobertura direta. |
| 3 | **Orçamentos** | Verde 🟢 | Testes específicos aprovados. Smoke test aprovado sem erros. | Cobertura PRO (>80%) | Bem estruturado e robusto. |
| 4 | **Projetos** | Amarelo 🟡 | Falha de migração interna silenciosa capturada no console. | 0% | Coluna ki.created_at inexistente. |
| 5 | **Visitas** | Amarelo 🟡 | Sem testes automatizados. Funciona no smoke test local. | 0% | Sem cobertura direta. |
| 6 | **Produção** | Amarelo 🟡 | Sem testes automatizados. Funciona no smoke test local. | 0% | Sem cobertura direta. |
| 7 | **Plano de Corte** | Verde 🟢 | Suíte de testes densa aprovada. Smoke test local respondendo 200 OK. | Alta (>80%) | Ótima cobertura, mas teste flaky ocasional de CPU jitter. |
| 8 | **Engenharia** | Amarelo 🟡 | Sem testes de integração reais. Smoke test responde 200 OK. | 0% (Cobertura indireta) | Depende de mocks. |
| 9 | **Calendário** | Amarelo 🟡 | Sem testes automatizados. Funciona no smoke test local. | 0% | Sem cobertura direta. |
| 10 | **Pós-Vendas** | Vermelho 🔴 | Falha Crítica Funcional (HTTP 500) por incompatibilidade de tipos na query SQL. | 0% | operator does not exist: text = integer. |
| 11 | **Compras** | Amarelo 🟡 | Sem testes automatizados. Funciona no smoke test local. | 0% | Sem cobertura direta. |
| 12 | **Estoque** | Amarelo 🟡 | Sem testes automatizados. Funciona no smoke test local. | 0% | Sem cobertura direta. |
| 13 | **Fornecedores** | Amarelo 🟡 | Sem testes automatizados. Funciona no smoke test local. | 0% | Sem cobertura direta. |
| 14 | **Financeiro** | Amarelo 🟡 | Módulo muito complexo, mas sem testes automatizados. Smoke test funciona. | 0% | Risco de regressão devido à falta de testes. |
| 15 | **Notificações** | Amarelo 🟡 | Sem testes automatizados. Funciona no smoke test local. | 0% | Sem cobertura direta. |
| 16 | **Peças / SKUs** | Verde 🟢 | Suíte de testes dedicada aprovada. Smoke test local OK. | Cobertura do Parser (>85%) | Bom nível de cobertura inicial no parser. |
| 17 | **Relatórios** | Amarelo 🟡 | Sem testes automatizados. Funciona no smoke test local. | 0% | Sem cobertura direta. |
| 18 | **Configurações** | Amarelo 🟡 | Sem testes automatizados. Funciona no smoke test local. | 0% | Sem cobertura direta. |

### Legenda de Status
* 🟢 **Verde:** Validado com testes e smoke tests sem falhas operacionais.
* 🟡 **Amarelo:** Funciona no smoke test, mas cobertura de testes inexistente/incompleta ou falha silenciosa de menor gravidade.
* 🔴 **Vermelho:** Falha funcional impeditiva (Erro HTTP 500 ou quebra em operação crítica).
