# 🔍 TESTE GRANULAR COMPLETO - D'LUXURY CRM

## Teste CADA campo, CADA seleção, CADA interação possível

---

Skill: **e2e-testing** (ou **computer-use-agents**)

---

## 📋 CONTEXTO

**Sistema:** D'Luxury CRM
**Objetivo:** Testar ABSOLUTAMENTE TUDO que um usuário pode fazer
**Escopo:** Cada campo, cada select, cada integração com estoque

**Problema identificado:** Módulo Orçamentos → Edição → Item → "Fita de Borda" não permite selecionar item do estoque

**Solução:** Teste CADA campo de CADA formulário com TODAS as possibilidades

---

## 🔬 METODOLOGIA

Para CADA campo em CADA formulário, execute:

```
TESTE PADRÃO POR CAMPO:

1. Deixar vazio
2. Preencher com valor simples
3. Preencher com caracteres especiais
4. Selecionar item estoque (se selecionável)
5. Editar valor
6. Deletar/limpar
7. Valores extremos
8. Caracteres proibidos
```

---

# 📊 TESTES GRANULARES POR MÓDULO

## MÓDULO 1: ORÇAMENTOS → EDIÇÃO → ITEM

### Item Principal - Teste Completo

#### 🔹 Campo: SKU/Produto Principal

**Teste 1.1.1: Selecionar SKU Válido**

```
Passos:
1. Menu → Orçamentos
2. Abra orçamento existente
3. Clique em item (linha)
4. Procure campo: "SKU", "Produto" ou "Material"
5. Clique no campo (é dropdown/select?)
6. Selecione SKU do estoque
7. Valide que produto populou corretamente

Validações:
✓ Dropdown abre?
✓ Mostra itens do estoque?
✓ Descrição do SKU preenche?
✓ Preço pre-popula do estoque?
✓ Sem erro ao selecionar?

RESULTADO: [ ] ✅ / [ ] ❌
Erro: [se houver]
```

**Teste 1.1.2: Buscar SKU no Dropdown**

```
Passos:
1. Abra dropdown de SKU
2. Digite no input de busca: "SKU-" ou parte do código
3. Verifique resultado

Validações:
✓ Filtra conforme digita?
✓ Retorna SKUs corretos?
✓ Sem erro?

RESULTADO: [ ] ✅ / [ ] ❌
```

**Teste 1.1.3: Trocar SKU**

```
Passos:
1. Campo SKU já preenchido
2. Clique para abrir dropdown
3. Selecione outro SKU diferente
4. Valide que preço também muda

Validações:
✓ SKU muda?
✓ Preço atualiza?
✓ Descrição muda?

RESULTADO: [ ] ✅ / [ ] ❌
```

**Teste 1.1.4: Limpar SKU**

```
Passos:
1. Campo com SKU selecionado
2. Procure botão "X" ou "Limpar"
3. Clique
4. Valide limpeza

Validações:
✓ Campo limpa?
✓ Preço limpa?
✓ Item fica inválido?

RESULTADO: [ ] ✅ / [ ] ❌
```

---

#### 🔹 Campo: Quantidade

**Teste 1.2.1: Inserir Quantidade Simples**

```
Passos:
1. Campo "Quantidade"
2. Digite: 10
3. Tabule/saia do campo
4. Valide cálculo

Validações:
✓ Aceita número?
✓ Total recalcula (Qtd × Preço)?
✓ Sem erro?

RESULTADO: [ ] ✅ / [ ] ❌
```

**Teste 1.2.2: Editar Quantidade**

```
Passos:
1. Campo com quantidade: 10
2. Altere para: 15
3. Salve
4. Valide

Validações:
✓ Quantidade atualizada?
✓ Total recalcula?

RESULTADO: [ ] ✅ / [ ] ❌
```

**Teste 1.2.3: Quantidade Decimal**

```
Passos:
1. Digite: 10.5
2. Salve

Validações:
✓ Aceita decimal?
✓ Cálculo correto?

RESULTADO: [ ] ✅ / [ ] ❌
```

**Teste 1.2.4: Quantidade Negativa**

```
Passos:
1. Digite: -5
2. Tente salvar

Validações:
✓ Rejeita quantidade negativa?
✓ Mensagem de erro clara?

RESULTADO: [ ] ✅ / [ ] ❌
```

**Teste 1.2.5: Quantidade Muito Grande**

```
Passos:
1. Digite: 999999
2. Salve

Validações:
✓ Aceita?
✓ Sem overflow?
✓ Cálculo correto?

RESULTADO: [ ] ✅ / [ ] ❌
```

**Teste 1.2.6: Quantidade Vazia**

```
Passos:
1. Limpe o campo
2. Tente salvar

Validações:
✓ Rejeita vazio?
✓ Mensagem de erro?

RESULTADO: [ ] ✅ / [ ] ❌
```

**Teste 1.2.7: Apagar e Reescrever**

```
Passos:
1. Campo com: 10
2. Selecione tudo (Ctrl+A)
3. Digite: 20
4. Salve

Validações:
✓ Sobrescreve corretamente?

RESULTADO: [ ] ✅ / [ ] ❌
```

---

#### 🔹 Campo: Preço Unitário

**Teste 1.3.1: Preço Auto-populado**

```
Passos:
1. Selecione SKU (Teste 1.1.1)
2. Valide se preço vem do estoque

Validações:
✓ Preço pre-popula?
✓ Valor correto (custo ou venda)?

RESULTADO: [ ] ✅ / [ ] ❌
```

**Teste 1.3.2: Editar Preço Manual**

```
Passos:
1. Preço pre-populado: 250.00
2. Edite para: 300.00
3. Salve

Validações:
✓ Aceita edição?
✓ Total recalcula?

RESULTADO: [ ] ✅ / [ ] ❌
```

**Teste 1.3.3: Preço com Decimais**

```
Passos:
1. Digite: 250.99
2. Salve

Validações:
✓ Aceita decimais?
✓ Mostra 2 casas decimais?

RESULTADO: [ ] ✅ / [ ] ❌
```

**Teste 1.3.4: Preço Negativo**

```
Passos:
1. Digite: -100
2. Tente salvar

Validações:
✓ Rejeita negativo?

RESULTADO: [ ] ✅ / [ ] ❌
```

**Teste 1.3.5: Preço Zero**

```
Passos:
1. Digite: 0
2. Salve

Validações:
✓ Aceita zero (brinde)?
✓ Cálculo correto (0 × Qtd = 0)?

RESULTADO: [ ] ✅ / [ ] ❌
```

**Teste 1.3.6: Preço com R$**

```
Passos:
1. Digite: R$ 250,00
2. Valide aceitação

Validações:
✓ Formata automaticamente?
✓ Salva número limpo?

RESULTADO: [ ] ✅ / [ ] ❌
```

---

#### 🔹 Campo: Descrição/Observação

**Teste 1.4.1: Descrição Simples**

```
Passos:
1. Campo: "Descrição" ou "Observação"
2. Digite: "Teste descrição"
3. Salve

Validações:
✓ Salva texto?
✓ Mostra ao listar?

RESULTADO: [ ] ✅ / [ ] ❌
```

**Teste 1.4.2: Descrição com Caracteres Especiais**

```
Passos:
1. Digite: "Madeira Ação - Açúcar/Madeira & Tinta"
2. Salve

Validações:
✓ Aceita caracteres especiais?
✓ Mostra corretamente?

RESULTADO: [ ] ✅ / [ ] ❌
```

**Teste 1.4.3: Descrição Muito Longa**

```
Passos:
1. Digite 500+ caracteres
2. Salve

Validações:
✓ Aceita tamanho?
✓ Trunca ou salva tudo?

RESULTADO: [ ] ✅ / [ ] ❌
```

**Teste 1.4.4: Descrição Vazia**

```
Passos:
1. Deixe vazio
2. Salve

Validações:
✓ Campo obrigatório ou opcional?

RESULTADO: [ ] ✅ / [ ] ❌
```

---

### 🔴 CAMPO PROBLEMÁTICO: FITA DE BORDA

Este é o campo que ESTÁ FALHANDO. Teste completo:

#### 🔹 Campo: Fita de Borda

**Teste 2.1: Fita de Borda - Dropdown Abre?**

```
Passos:
1. Menu → Orçamentos
2. Abra item para editar
3. Procure campo: "Fita de Borda" ou "Borda"
4. Clique no campo
5. Valide se dropdown abre

Validações:
✓ Campo é select/dropdown?
✓ Dropdown abre quando clica?
✓ Mostra opções?
✓ Quais opções aparecem? (lista)

RESULTADO: [ ] ✅ / [ ] ❌
ERRO ESPECÍFICO: [descrição exata do que acontece]
SCREENSHOT: [descreva o que vê]
```

**Teste 2.2: Fita de Borda - Selecionar Item Estoque**

```
Passos:
1. Clique em "Fita de Borda"
2. Procure por: "Buscar", "SKU", "Material"
3. Digite SKU de fita de borda existente no estoque
4. Tente selecionar
5. Valide seleção

Validações:
✓ Aparece campo de busca?
✓ Consegue digitar SKU?
✓ Retorna resultados?
✓ Consegue selecionar?
✓ Item aparece após seleção?

RESULTADO: [ ] ✅ / [ ] ❌
ERRO ESPECÍFICO: [o que exactamente não funciona]
```

**Teste 2.3: Fita de Borda - Listar Itens Disponíveis**

```
Passos:
1. Clique em "Fita de Borda"
2. Dropdown deve mostrar todos os itens de "Fita de Borda" do estoque
3. Procure por SKU com nome tipo: "FITA-MADEIRA-BRANCA"

Validações:
✓ Mostra lista de fitas?
✓ Filtra por tipo correto?
✓ Mostra descrição e preço?

RESULTADO: [ ] ✅ / [ ] ❌
LISTA DE ITENS QUE DEVERIA MOSTRAR: [quais SKUs de fita estão no estoque?]
```

**Teste 2.4: Fita de Borda - Editar Seleção**

```
Passos:
1. Selecione uma fita de borda (se conseguir no Teste 2.2)
2. Clique novamente para trocar
3. Selecione outra fita
4. Valide mudança

Validações:
✓ Aceita mudança?
✓ Campo atualiza?

RESULTADO: [ ] ✅ / [ ] ❌
```

**Teste 2.5: Fita de Borda - Limpar Seleção**

```
Passos:
1. Selecione uma fita
2. Procure botão "X" ou clique para limpar
3. Valide limpeza

Validações:
✓ Campo limpa?
✓ Fica vazio?

RESULTADO: [ ] ✅ / [ ] ❌
```

**Teste 2.6: Fita de Borda - Campo Obrigatório?**

```
Passos:
1. Deixe campo vazio
2. Tente salvar item
3. Valide rejeição

Validações:
✓ Rejeita vazio?
✓ Mensagem de erro clara?
✓ Ou permite sem fita?

RESULTADO: [ ] ✅ / [ ] ❌
COMPORTAMENTO: [ ] Obrigatório / [ ] Opcional
```

**Teste 2.7: Fita de Borda - Quantidade de Fita**

```
Passos:
1. Selecione fita
2. Procure campo: "Quantidade Fita", "Metros", "Comprimento"
3. Digite quantidade
4. Valide cálculo se há

Validações:
✓ Tem campo de quantidade?
✓ Aceita valores?
✓ Recalcula preço (se integrado)?

RESULTADO: [ ] ✅ / [ ] ❌
```

**Teste 2.8: Fita de Borda - Preço da Fita**

```
Passos:
1. Selecione fita
2. Valide se preço vem do estoque
3. Teste editar preço manualmente

Validações:
✓ Preço auto-popula?
✓ Pode editar?
✓ Cálculo correto?

RESULTADO: [ ] ✅ / [ ] ❌
```

---

### 🔴 OUTROS CAMPOS POSSÍVEIS DE ITEM

Teste CADA campo que aparecer no formulário de edição:

#### 🔹 Campo: Rodapé/Acabamento (se existir)

**Teste 3.1: Rodapé - Seleção de Estoque**

```
Passos:
[Similar aos testes de Fita de Borda]

Validações:
✓ Dropdown abre?
✓ Mostra itens do estoque?
✓ Consegue selecionar?

RESULTADO: [ ] ✅ / [ ] ❌
```

#### 🔹 Campo: Puxador/Maçaneta (se existir)

**Teste 4.1: Puxador - Seleção de Estoque**

```
Passos:
[Similar]

RESULTADO: [ ] ✅ / [ ] ❌
```

#### 🔹 Campo: Tinta/Acabamento (se existir)

**Teste 5.1: Tinta - Seleção de Estoque**

```
Passos:
[Similar]

RESULTADO: [ ] ✅ / [ ] ❌
```

#### 🔹 Campo: Vidro (se existir)

**Teste 6.1: Vidro - Seleção de Estoque**

```
Passos:
[Similar aos testes de Fita de Borda]

RESULTADO: [ ] ✅ / [ ] ❌
```

#### 🔹 Qualquer outro campo SELECIONÁVEL de estoque

```
Para CADA campo que permita selecionar item do estoque:

1. Teste se dropdown abre
2. Teste se busca funciona
3. Teste se consegue selecionar
4. Teste se edita seleção
5. Teste se limpa campo
6. Teste se é obrigatório
7. Teste se integra quantidade/preço
```

---

## 🔧 TESTES TÉCNICOS ADICIONAIS

### Teste de Integração: Recalcular Totais

**Teste A.1: Total Item com Múltiplos Componentes**

```
Passos:
1. Item com:
   - Produto principal: R$ 100 × 5 = R$ 500
   - Fita de borda: R$ 10 × 10m = R$ 100
   - Tinta: R$ 20
   - Total esperado: R$ 620

2. Edite quantidade fita para 20m
3. Valide recalcular para R$ 720

Validações:
✓ Soma todos os componentes?
✓ Recalcula quando edita?
✓ Aplica margem corretamente?

RESULTADO: [ ] ✅ / [ ] ❌
```

### Teste de Integração: Estoque Disponível

**Teste A.2: Validar Estoque Disponível**

```
Passos:
1. Selecione fita com estoque: 10 metros
2. Tente usar 15 metros
3. Valide rejeição ou aviso

Validações:
✓ Valida estoque disponível?
✓ Avisa se insuficiente?
✓ Permite mesmo assim (com warning)?

RESULTADO: [ ] ✅ / [ ] ❌
```

### Teste de API

**Teste A.3: Salvar Item com Todos Campos**

```
Passos:
1. Preencha TODOS os campos do item
2. Clique "Salvar"
3. Verifique resposta API

Validações:
✓ API retorna 200/201?
✓ Item aparece na lista?
✓ Dados salvam corretamente no banco?
✓ Nenhum erro no console?

RESULTADO: [ ] ✅ / [ ] ❌
```

### Teste de UI/UX

**Teste A.4: Validações Visuais**

```
Passos:
1. Deixe campo obrigatório vazio
2. Tente salvar
3. Valide feedback visual

Validações:
✓ Campo fica em vermelho?
✓ Mensagem de erro aparece?
✓ Foco vai para campo inválido?

RESULTADO: [ ] ✅ / [ ] ❌
```

---

## 📝 MAPA DE CAMPOS - PREENCHIMENTO

Mapeie TODOS os campos que aparecem ao editar um item:

```
ITEM DE ORÇAMENTO - CAMPOS ENCONTRADOS:

[ ] Campo 1: [nome] - Type: [text/select/number/etc]
    └─ Teste 1: Deixar vazio [ ]
    └─ Teste 2: Preencher [ ]
    └─ Teste 3: Editar [ ]
    └─ Teste 4: Deletar [ ]
    └─ Teste 5: É select? Integra estoque? [ ]

[ ] Campo 2: [nome]
    └─ [testes]

[ ] Campo 3: [nome]
    └─ [testes]

[... adicionar todos os campos encontrados ...]
```

---

## 🚨 CHECKLIST DE COMPLETUDE

- [ ] CADA campo mapeado
- [ ] CADA campo tem CRUD completo testado
- [ ] CADA select/dropdown testado com estoque
- [ ] Fita de Borda testada (campo problemático)
- [ ] Todos campos integradores de estoque testados
- [ ] Validações funcionam
- [ ] Cálculos corretos
- [ ] API retorna correto
- [ ] UI feedback adequado
- [ ] Nenhum erro no console
- [ ] Sem erros críticos
- [ ] Sistema 100% funcional

---

## 📊 RELATÓRIO FINAL

Após completar TODOS os testes, preencha:

```markdown
# 🔍 RELATÓRIO GRANULAR - TESTES DE EDIÇÃO DE ITEM

## Problema Identificado

Campo: Fita de Borda
Módulo: Orçamentos → Edição → Item
Sintoma: Não consegue inserir item do estoque

## Investigação

### Teste 2.1: Dropdown abre?

Status: [ ] ✅ / [ ] ❌
Resultado: [o que acontece]

### Teste 2.2: Consegue selecionar SKU?

Status: [ ] ✅ / [ ] ❌
Resultado: [o que acontece]
Erro específico: [mensagem/comportamento]

[... continuar com todos os testes ...]

## Root Cause Analysis

### Possíveis Causas:

1. [ ] Dropdown não renderiza
2. [ ] Busca de estoque não funciona
3. [ ] SKU de fita não existe no banco
4. [ ] Validação rejeita seleção
5. [ ] Erro de JavaScript no console
6. [ ] Erro de API ao salvar
7. [ ] Integração de estoque não implementada

### Causa Identificada:

[Qual é a causa raiz?]

## Recomendação de Fix

[Como corrigir?]

## Status Geral

- [ ] CRÍTICO - Sistema bloqueado
- [ ] ALTO - Módulo inoperável
- [ ] MÉDIO - Funcionalidade reduzida
- [ ] BAIXO - Apenas melhoria UX

## Próximos Passos

1. [Ação imediata]
2. [Ação secundária]
3. [Validação]
```

---

## 🎯 EXECUÇÃO

1. **Comece pelo problema identificado:** Fita de Borda (Testes 2.1-2.8)
2. **Depois teste campos similares:** Rodapé, Puxador, Tinta, Vidro
3. **Depois teste campos básicos:** SKU, Quantidade, Preço
4. **Depois testes técnicos:** Integração, API, UI/UX
5. **Gere relatório final**

---

**Objetivo:** Encontrar EXATAMENTE onde está o problema com "Fita de Borda" e qualquer outro campo que não funciona.

**Resultado esperado:** Após testes, você saberá EXATAMENTE qual campo, qual ação, qual erro está ocorrendo.
