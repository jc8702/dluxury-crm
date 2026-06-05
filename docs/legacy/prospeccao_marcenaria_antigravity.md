# Módulo de Prospecção Comercial para Marcenaria

**Instrução principal para o agente**

Leia este arquivo do início ao fim e siga exatamente a ordem das fases. Antes de implementar qualquer coisa, faça um levantamento curto da base atual do ERP e confirme quais partes podem ser reaproveitadas. Não crie uma aplicação separada. O objetivo é implementar um módulo nativo de prospecção comercial dentro do ERP D'LUXURY CRM.

---

## Objetivo

Projetar e implementar um módulo nativo de prospecção comercial para uma marcenaria, com foco em:

1. Cliente final local
2. Arquitetos e designers de interiores
3. Empresas, obras, construtoras e escritórios

O módulo deve:

- descobrir leads públicos e permitidos
- enriquecer dados de contato e contexto
- remover duplicados
- classificar leads por score e prioridade
- registrar o funil e a abordagem
- permitir follow-up
- exportar listas qualificadas para o CRM
- gerar relatórios operacionais

---

## Contexto do ERP

O projeto já possui módulos de CRM, projetos, orçamentos, produção, financeiro, estoque e relatórios.

Este novo módulo deve se integrar ao ERP existente, reaproveitando:

- autenticação
- tenant isolation
- audit log
- padrão visual
- API server
- banco de dados já existente

Se houver entidades ou fluxos parecidos, prefira reaproveitar e adaptar em vez de duplicar.

---

## Fontes permitidas

Use somente fontes públicas e permitidas:

- Google Maps Search & Extract
- Apollo People Search
- Apollo Organization Search
- Hunter Discover Companies
- Firecrawl / extração de páginas públicas
- Sites públicos, diretórios públicos e perfis públicos

### Restrições

- Não usar scraping agressivo em plataformas fechadas.
- Respeitar ToS, robots e limites de acesso.
- Não inventar dados ausentes.
- Quando telefone, email, site ou rede social não existirem, salvar `null` ou `"não encontrado"`.
- Registrar a fonte exata de cada lead e de cada campo enriquecido.
- Se uma fonte falhar, documentar a limitação e seguir com as demais.
- Não quebrar tenant isolation.
- Não comprometer performance do ERP principal.
- Não duplicar lógica de CRM já existente se puder reaproveitar.

---

## ICPs

Mapeie estes perfis:

1. Cliente final local
2. Arquiteto
3. Designer de interiores
4. Empresa / obra / construtora / incorporadora

Para cada ICP, definir:

- cidade
- bairros alvo
- raio de atendimento
- palavras-chave
- sinais de intenção
- ticket estimado
- canal ideal de abordagem

---

## Escopo funcional

### Funções obrigatórias

- capturar leads
- importar leads em lote
- enriquecer dados
- deduplicar registros
- pontuar leads
- alterar status do funil
- registrar interações
- gerar mensagem de abordagem
- exportar para CSV/CRM
- gerar relatório executivo

### Funil

- novo
- enriquecido
- deduplicado
- score_ok
- a_contatar
- contatado
- respondeu
- reunião_marcada
- orçamento_enviado
- ganho
- perdido

### Prioridade

- hoje
- semana
- nutrir
- arquivar

---

## Campos do lead

### Campos padrão

- `id`
- `tenant_id`
- `nome`
- `tipo_lead`
- `empresa`
- `cargo`
- `cidade`
- `bairro`
- `telefone`
- `email`
- `site`
- `instagram`
- `linkedin`
- `fonte`
- `subfonte`
- `origem_busca`
- `score`
- `prioridade`
- `status_funil`
- `ultima_interacao`
- `proxima_acao`
- `observacoes`
- `created_at`
- `updated_at`
- `created_by`
- `updated_by`
- `deleted_at`

### Campos de enriquecimento

- `dominio`
- `segmento`
- `porte_estimado`
- `bairro_raio`
- `sinais_intencao`
- `tags`
- `nome_fantasia`
- `dados_fonte_json`
- `resumo_contexto`

---

## Score

Criar score de 0 a 100 com a seguinte lógica:

- 30 pontos: está na cidade ou raio atendido
- 20 pontos: ICP aderente
- 15 pontos: contato fácil disponível
- 15 pontos: sinal de intenção ou necessidade
- 10 pontos: decisor ou influência real
- 10 pontos: potencial de ticket alto

### Classificação

- 80 a 100: contato hoje
- 60 a 79: contato na semana
- 40 a 59: nutrir
- abaixo de 40: arquivar

---

## Deduplicação

Deduplicar por:

- nome + empresa
- telefone
- email
- domínio/site
- nome + cidade
- combinação fuzzy com threshold configurável

Se houver duplicados, manter o registro principal com melhor fonte e maior completude.

---

## Arquitetura do módulo

### Backend

- endpoints REST para leads, importação, enriquecimento, deduplicação, score, funil, interações, campanhas e relatórios
- serviços de prospecção
- regras de scoring
- integração com o CRM existente
- auditoria de ações
- filtros e paginação

### Banco

- tabelas novas para prospecção
- chaves por tenant
- timestamps
- soft delete
- índices para busca e deduplicação
- relacionamentos com o CRM existente quando fizer sentido

### Frontend

- dashboard de prospecção
- lista de leads
- detalhe do lead
- importação e captura
- score e priorização
- campanhas e follow-up
- relatórios

### Integração ERP

- reutilizar autenticação e tenant
- reutilizar audit log
- integrar com CRM e clientes existentes
- manter visual consistente com o sistema

---

## Estrutura de banco recomendada

Criar schema Drizzle em:

- `src/db/schema/prospeccao.ts`

Criar migration SQL com nome claro e sequencial, seguindo o padrão do repositório.

### Tabelas sugeridas

- `leads_prospeccao`
- `leads_prospeccao_fontes`
- `leads_prospeccao_scores`
- `leads_prospeccao_interacoes`
- `leads_prospeccao_segmentos`
- `leads_prospeccao_importacoes`
- `leads_prospeccao_deduplicados`
- `leads_prospeccao_config`
- `leads_prospeccao_campanhas`

### Regras de banco

- toda tabela com `tenant_id`
- toda tabela com `created_at` e `updated_at`
- soft delete com `deleted_at` onde fizer sentido
- índices para:
  - `tenant_id`
  - `status_funil`
  - `prioridade`
  - `score`
  - `tipo_lead`
  - `cidade`
  - `fonte`
  - `email`
  - `telefone`
  - `dominio`
- unique constraints quando apropriado para evitar duplicados evidentes

### Relacionamentos sugeridos

- `leads_prospeccao -> tenants`
- `leads_prospeccao -> users`
- `leads_prospeccao_interacoes -> leads_prospeccao`
- `leads_prospeccao_scores -> leads_prospeccao`
- `leads_prospeccao_importacoes -> leads_prospeccao`
- `leads_prospeccao_campanhas -> leads_prospeccao`

---

## Arquivos sugeridos

### Backend

- `src/api-lib/prospeccao.ts`
- `src/api-lib/queries/prospeccao_migration.ts`
- `src/api-lib/queries/prospeccao_dedup.ts`
- `src/api-lib/queries/prospeccao_scoring.ts`
- `src/api-lib/queries/prospeccao_enrichment.ts`

### Schema

- `src/db/schema/prospeccao.ts`

### Frontend

- `src/pages/ProspecaoPage.tsx`
- `src/pages/ProspecaoLeadDetailPage.tsx`
- `src/pages/ProspecaoImportPage.tsx`
- `src/pages/ProspecaoReportsPage.tsx`

### Components

- `src/components/prospeccao/ProspeccaoDashboard.tsx`
- `src/components/prospeccao/LeadList.tsx`
- `src/components/prospeccao/LeadDetail.tsx`
- `src/components/prospeccao/LeadImportModal.tsx`
- `src/components/prospeccao/LeadScoreBadge.tsx`
- `src/components/prospeccao/LeadFilters.tsx`
- `src/components/prospeccao/LeadCampaigns.tsx`
- `src/components/prospeccao/LeadTimeline.tsx`

### Store

- `src/stores/useProspeccaoStore.ts`

### Types / Schemas

- `src/types/prospeccao.ts`
- `src/schemas/prospeccao.schema.ts`
- `src/validators/prospeccaoSchema.ts`

---

## Rotas API

Implementar endpoints para:

- listar leads
- criar lead
- atualizar lead
- deletar soft delete
- importar em lote
- enriquecer lead
- deduplicar lead
- pontuar lead
- registrar interação
- mover funil
- gerar mensagem de abordagem
- exportar leads
- gerar relatório

---

## Contratos de payload

### 1. Criar lead

`POST /api/prospeccao/leads`

```json
{
  "nome": "string",
  "tipo_lead": "cliente_final|arquiteto|designer|empresa",
  "empresa": "string|null",
  "cargo": "string|null",
  "cidade": "string|null",
  "bairro": "string|null",
  "telefone": "string|null",
  "email": "string|null",
  "site": "string|null",
  "instagram": "string|null",
  "linkedin": "string|null",
  "fonte": "string",
  "subfonte": "string|null",
  "origem_busca": "string|null",
  "observacoes": "string|null"
}
```

### 2. Importar lote

`POST /api/prospeccao/importar`

```json
{
  "leads": [
    {
      "nome": "string",
      "tipo_lead": "string",
      "empresa": "string|null",
      "telefone": "string|null"
    }
  ],
  "fonte": "string",
  "subfonte": "string|null"
}
```

### 3. Enriquecer lead

`POST /api/prospeccao/leads/:id/enriquecer`

```json
{
  "provider": "google_maps|apollo|hunter|firecrawl|manual",
  "force_refresh": false
}
```

### 4. Deduplicar lead

`POST /api/prospeccao/leads/:id/deduplicar`

```json
{
  "strategy": "strict|fuzzy",
  "threshold": 0.85
}
```

### 5. Atualizar score

`POST /api/prospeccao/leads/:id/score`

```json
{
  "override": false
}
```

### 6. Registrar interação

`POST /api/prospeccao/leads/:id/interacoes`

```json
{
  "canal": "whatsapp|email|telefone|instagram|linkedin|reuniao|outro",
  "tipo": "primeiro_contato|follow_up|reuniao|orcamento|outro",
  "descricao": "string",
  "resultado": "string|null",
  "proxima_acao": "string|null"
}
```

### 7. Mover funil

`PATCH /api/prospeccao/leads/:id/status`

```json
{
  "status_funil": "novo|enriquecido|deduplicado|score_ok|a_contatar|contatado|respondeu|reunião_marcada|orçamento_enviado|ganho|perdido",
  "prioridade": "hoje|semana|nutrir|arquivar"
}
```

### 8. Gerar mensagem

`POST /api/prospeccao/leads/:id/mensagem`

```json
{
  "canal": "whatsapp|email|instagram|linkedin",
  "tom": "curto|profissional|consultivo|direto"
}
```

---

## Regras de implementação

- usar validação de entrada
- manter consistência com tenant
- registrar audit log nas operações críticas
- paginar listas
- permitir filtros por ICP, cidade, score, status e fonte
- usar nomes coerentes com o padrão do ERP
- evitar duplicar lógica de CRM já existente
- onde já houver stores, hooks ou handlers parecidos, reaproveitar antes de criar do zero
- se já existir uma entidade de cliente ou projeto relacionada, mapear a relação com o lead em vez de duplicar cadastro

---

## Fases de execução

### Fase 1 - Levantamento e plano curto

1. Identificar como o CRM atual representa clientes, projetos e orçamentos.
2. Identificar como autenticação, tenant e audit log funcionam.
3. Mapear quais tabelas já existem e quais podem ser reaproveitadas.
4. Decidir se o módulo vai criar entidade nova ou se vai ligar em entidades já existentes.
5. Entregar um plano curto com:
   - arquivos a criar
   - arquivos a alterar
   - tabelas a criar
   - riscos
   - ordem de execução

### Fase 2 - Modelo de dados

1. Criar schema Drizzle para prospecção.
2. Criar migrations SQL.
3. Garantir índices de busca e deduplicação.
4. Garantir `tenant_id` em todas as tabelas.
5. Garantir soft delete onde fizer sentido.

### Fase 3 - Backend

1. Criar o serviço principal de prospecção.
2. Implementar CRUD básico de leads.
3. Implementar importação em lote.
4. Implementar enriquecimento.
5. Implementar deduplicação.
6. Implementar score.
7. Implementar interações e funil.
8. Implementar relatórios.
9. Integrar com CRM quando o lead estiver qualificado.

### Fase 4 - Frontend

1. Criar dashboard com KPI de prospecção.
2. Criar lista filtrável de leads.
3. Criar tela de detalhe com timeline.
4. Criar modal/importador de leads.
5. Criar badges de prioridade e score.
6. Criar telas de campanhas e relatórios.
7. Garantir responsividade e consistência visual com o ERP.

### Fase 5 - Abordagem

Gerar templates por ICP:

- Cliente final: orçamento rápido e solução sob medida
- Arquiteto: parceria, prazo e acabamento
- Designer: apoio técnico e execução
- Empresa/obra: escala, previsibilidade e SLA

### Fase 6 - Validação

Testar ponta a ponta:

- criar lead
- importar lote
- enriquecer
- deduplicar
- pontuar
- mover status
- registrar interação
- exportar
- gerar relatório
- verificar tenant isolation
- verificar audit log
- verificar integração com CRM

### Fase 7 - Entrega final

Entregar:

- módulo implementado
- migrations e schema
- rotas API
- componentes UI
- store e types
- documentação breve de uso
- relatório de validação
- riscos remanescentes
- próximos passos

---

## Critério de pronto

O módulo só pode ser considerado pronto quando:

- funciona dentro do ERP existente
- respeita tenant isolation
- armazena e pontua leads corretamente
- elimina duplicados
- gera abordagem por ICP
- mostra relatórios úteis
- integra com CRM quando necessário
- não cria dependências desnecessárias
- não quebra módulos existentes

### Aceitação mínima por tela

- Dashboard mostra KPIs válidos
- Lista filtra por ICP, cidade, score, status e fonte
- Detalhe do lead mostra timeline e histórico
- Importação salva leads em lote
- Score é calculado e persistido
- Interações são registradas
- Relatório resume volume, fonte e prioridade
- Exportação funciona

### Aceitação mínima por backend

- endpoints respondem com validação
- tenant_id sempre é respeitado
- auditoria é registrada
- paginação e filtros funcionam
- duplicados são detectados
- importação não cria registros duplicados óbvios

---

## Ordem de execução obrigatória

Siga esta ordem:

1. Ler a base atual do ERP.
2. Mapear entidades e pontos de integração.
3. Definir o desenho do módulo.
4. Criar schema e migrations.
5. Implementar backend.
6. Implementar frontend.
7. Implementar score e deduplicação.
8. Implementar relatórios.
9. Integrar com CRM.
10. Rodar validação ponta a ponta.
11. Corrigir erros encontrados.
12. Entregar relatório final.

---

## Formato do relatório final

Ao final, entregar um resumo executivo com:

- o que foi criado
- o que foi reaproveitado
- o que ficou pendente
- o que precisa de revisão manual
- principais riscos remanescentes
- próximos passos recomendados

---

## Observação final

Se houver dúvida entre criar algo novo ou reaproveitar algo existente, priorize reaproveitar.

Se existir tabela ou fluxo parecido no CRM atual, integre ao invés de duplicar.

Se o código legado estiver inconsistente, documente a decisão e mantenha a menor superfície de mudança possível.
