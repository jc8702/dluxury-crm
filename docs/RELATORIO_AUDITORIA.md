# RELATÓRIO DE AUDITORIA DO SISTEMA E PLANO DE AÇÃO DEFINITIVO

## 1. Mapeamento de Tabelas (Órfãs vs Ativas)

Realizamos uma varredura completa no esquema do banco de dados Neon (ambiente de Produção/Development via a chave da Vercel).

- **quotations** **ESTÁ ATIVA** (substituiu a antiga tabela `orcamentos`).
- **fornecedores** **ESTÁ ATIVA**. A tabela existe e possui a estrutura completa (id, nome, cnpj, etc.).
- **eventos_calendario** **ESTÁ ATIVA** e possui a coluna `quotation_id`.
  _Análise:_ Os erros relatados por você como "does not exist" no Calendário e Fornecedores ocorreram no passado antes das alterações do banco refletirem na Vercel, ou representam chamadas da aplicação feitas a modelos ORM desatualizados (cache/build da Vercel) que ainda buscam nomes antigos.

## 2. Inconsistências de Design e Padronização

O sistema de `--ui-` tokens foi auditado:

- **Botões e Modais em Minúsculo:** Botões de "Cancelar", "Confirmar" e genéricos estavam sem o padrão de capitalização. A classe `capitalize` já foi injetada nativamente em `Button.tsx`, `Badge.tsx` e `Modal.tsx`.
- **Dark/Light Mode:** A remoção de classes estáticas `dark:bg-*` foi bem sucedida. O Tailwind agora obedece o mapeamento dos tokens dinâmicos.
- **Padrão de Janelas (Cards/Kanban):** Todos utilizam `var(--ui-radius-lg)` mantendo as proporções exatas da nova UI.

## 3. Funcionalidades Quebradas e Acesso

- **Erro Módulo Produção:** A query via backend ainda invoca `orcamentos`. É necessária a refatoração total de "orcamento" para "quotation" nos controllers, types e stores.
- **Acesso ao Sistema:** O cadastro do usuário foi reinicializado. Caso o erro de "usuário inexistente" persista, forçaremos um script nativo no banco para garantir o usuário `admin@admin.com` com senha `123456`.
- **Erro Módulo Catálogo de SKUs:** Ao cadastrar, o payload divergente entre Frontend e Tabela do Neon (e.g. `sku_componente` vs `erp_skus`) resulta em erro silencioso ou falha no save.

## 4. Integração: Estoque Local + Catálogo de SKUs

Concordo com a redundância. **Plano de Unificação**:

1. Levar o Catálogo de SKUs para dentro do Módulo de Estoque como a "Aba de Definição de Produtos".
2. Acoplar a ação de Salvar SKU à criação automática da linha de saldo zerado na tabela `estoque_materiais_detalhado`.
3. Rodar validação dos campos ponta a ponta.

## 5. Classificação dos Arquivos Instrucionais (.md)

Os arquivos Markdown foram categorizados:

- **Documentos de Regra Global (Ativos):** O sistema deve se balizar unicamente pelas _Custom Instructions_ da prompt inicial e o `RESUMO_PROJETO.md` da raiz.
- **Arquivos Residuais/Planos Passados:** Todos os antigos arquivos de roadmap (ex: UI Review, Auditoria Total e arquivos soltos do antigo GPT) já foram realocados dentro das pastas `/scratch` e `/docs/legacy`, limpando a árvore de decisão do modelo e mitigando "alucinações" de instruções velhas.

---

### 👉 Como Resolveremos os Erros do Frontend Hoje (Próxima Ação)

Preciso aplicar um "Find & Replace" em massa nos diretórios `src/` alterando todas as dependências obsoletas de `orcamento` para `quotation`, além de revisar a chamada da API de `fornecedores` que está dando erro de existência.

Vou proceder com a documentação em `RESUMO_PROJETO.md` e aguardo o comando caso queira que eu rode a refatoração do banco no código agora.
