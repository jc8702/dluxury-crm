# 🗺️ MAPEADOR AUTOMÁTICO DE CAMPOS

## Descobrir TODOS os campos e suas propriedades

---

Skill: **computer-use-agents** (ou **e2e-testing**)

---

## 🎯 TAREFA

Você é um agente que explora o sistema e mapeia TODOS os campos de CADA formulário.

**Objetivo:** Criar mapa completo de campos do formulário de edição de item

---

## 📋 PROCEDIMENTO

### FASE 1: Navegar até formulário de edição

```
1. Abra: https://dluxury-crm.vercel.app
2. Login com credenciais
3. Menu → Orçamentos
4. Selecione orçamento existente
5. Clique em um item da lista
6. Clique em "Editar" ou ícone de edição
7. Verifique que modal/página de edição abriu
```

### FASE 2: Inspecionar DOM e mapear campos

Para CADA elemento que parece ser um campo:

```javascript
// Abra DevTools Console (F12)
// Cole este script para mapear campos:

const campos = [];
const inputs = document.querySelectorAll('input, select, textarea, [contenteditable]');

inputs.forEach((input, index) => {
  const campo = {
    index: index,
    type: input.tagName.toLowerCase(),
    inputType: input.type,
    label: document.querySelector(`label[for="${input.id}"]`)?.textContent,
    name: input.name,
    id: input.id,
    placeholder: input.placeholder,
    value: input.value,
    required: input.required,
    classes: input.className,
    visible: input.offsetParent !== null,
    disabled: input.disabled,
  };
  campos.push(campo);
  console.log(`Campo ${index}: ${input.type} - ${label} - ${input.id}`);
});

console.table(campos);
console.log(JSON.stringify(campos, null, 2));
```

### FASE 3: Documentar cada campo

Para CADA campo encontrado:

```
CAMPO #[N]: [NOME]

Propriedades Técnicas:
- Type: [text/number/select/textarea/etc]
- ID: [id técnico]
- Name: [atributo name]
- Label: [rótulo visível]
- Required: [true/false]
- Placeholder: [ajuda texto]
- Disabled: [true/false]
- Classes: [classe CSS]

Propriedades Visuais:
- Rótulo: [o que diz]
- Ajuda: [texto de ajuda, se houver]
- Posição: [acima, ao lado, etc]
- Tamanho: [pequeno, médio, grande]

Tipo de Componente:
- [ ] Input text
- [ ] Input number
- [ ] Input email
- [ ] Input date
- [ ] Select/Dropdown
- [ ] Textarea
- [ ] Checkbox
- [ ] Radio
- [ ] Toggle/Switch
- [ ] Busca/Autocomplete
- [ ] Multi-select
- [ ] Data picker
- [ ] Outro: [qual]

Integração com Estoque:
- [ ] Permite selecionar SKU?
- [ ] Mostra busca?
- [ ] Mostra lista disponível?
- [ ] Integra preço?
- [ ] Integra quantidade?

Estado:
- [ ] Obrigatório
- [ ] Opcional
- [ ] Desabilitado (sempre)
- [ ] Desabilitado (condicional)
- [ ] Hidden (escondido)
- [ ] Readony (somente leitura)

Validação:
- [ ] Min/max length
- [ ] Min/max value
- [ ] Pattern/regex
- [ ] Mensagem de erro personalizada
- [ ] Sem validação

Valor Padrão:
- Auto-populado: [sim/não]
- De quê: [do SKU, do orçamento, etc]
- Editável: [sim/não]
```

---

## 🔍 MAPEAMENTO ESPERADO - ORÇAMENTOS > EDIÇÃO > ITEM

Você deve encontrar campos tipo:

```
CAMPO 1: SKU/Produto Principal
- Type: Select/Dropdown
- Label: "SKU", "Produto" ou "Material"
- Integra estoque: SIM
- Valida: Obrigatório
- Auto-popula: Se vindo de orçamento

CAMPO 2: Quantidade
- Type: Input number
- Label: "Quantidade", "Qtd"
- Integra estoque: Sim (valida disponibilidade?)
- Valida: Obrigatório, mín 0, máx [valor]

CAMPO 3: Preço Unitário
- Type: Input number
- Label: "Preço", "Preço Unitário", "Valor"
- Auto-popula: Do SKU selecionado
- Editável: Sim

CAMPO 4: Descrição/Observação
- Type: Textarea
- Label: "Descrição", "Observação", "Notas"
- Integra estoque: Não
- Validação: Nenhuma

CAMPO 5: Fita de Borda ⚠️ PROBLEMÁTICO
- Type: Select/Dropdown
- Label: "Fita de Borda", "Borda", "Edge Band"
- Integra estoque: SIM (MAS NÃO FUNCIONA!)
- Valida: Obrigatório? Opcional?

CAMPO 6: [Puxador/Maçaneta - se existir]
- Type: Select/Dropdown
- Label: "Puxador", "Maçaneta", "Handle"
- Integra estoque: SIM
- Valida: Obrigatório? Opcional?

CAMPO 7: [Rodapé - se existir]
- Type: Select/Dropdown
- Label: "Rodapé", "Baseboard", "Socle"
- Integra estoque: SIM

CAMPO 8: [Tinta/Acabamento - se existir]
- Type: Select/Dropdown
- Label: "Tinta", "Acabamento", "Finish"
- Integra estoque: SIM

CAMPO 9: [Vidro - se existir]
- Type: Select/Dropdown
- Label: "Vidro", "Glass", "Vitrine"
- Integra estoque: SIM

[... continuar para TODOS os campos encontrados ...]
```

---

## 🚨 ANÁLISE DO PROBLEMA: FITA DE BORDA

Após mapear todos os campos, foque no problemático:

### CAMPO: Fita de Borda

```
Pergunta 1: O campo existe?
- [ ] Sim, encontrei em: [posição]
- [ ] Não, não aparece no formulário

Pergunta 2: Se existe, qual é o tipo?
- [ ] Select/Dropdown puro
- [ ] Input com busca (autocomplete)
- [ ] Multi-select
- [ ] Radio buttons
- [ ] Checkbox list
- [ ] Outro: [qual]

Pergunta 3: O que acontece quando clica?
- [ ] Abre dropdown com opções
- [ ] Aparece input de busca
- [ ] Nada acontece (ERRO!)
- [ ] Mensagem de erro
- [ ] Campo fica disabled

Pergunta 4: Qual é o erro exato?
- [ ] Nenhum erro (funciona)
- [ ] Erro no console (qual?)
- [ ] Timeout (API demora)
- [ ] Retorna vazio (sem opções)
- [ ] Rejeita seleção
- [ ] Salva mas depois perde valor

Pergunta 5: Comparar com outro campo similar
- Selecione SKU principal (campo 1) - funciona?
- Selecione Fita de Borda (campo 5) - funciona?
- Qual é a diferença?
```

---

## 🔬 TESTE TÉCNICO PROFUNDO

Se você identificar erro no campo "Fita de Borda", execute:

### Step 1: Inspecionar HTML do campo

```javascript
// No console, rode:
const filtaBordaInput =
  document.querySelector('[id*="borda" i]') ||
  document.querySelector('[name*="borda" i]') ||
  document.querySelector('[placeholder*="borda" i]');

console.log('Elemento HTML:', filtaBordaInput);
console.log('HTML:', filtaBordaInput?.outerHTML);
console.log('Classes:', filtaBordaInput?.className);
console.log(
  'Attributes:',
  Array.from(filtaBordaInput?.attributes || []).map((a) => a.name + '=' + a.value),
);
```

### Step 2: Verificar listeners de evento

```javascript
// Verifique se campo tem listeners
const event = new Event('click', { bubbles: true });
console.log('Tentando clicar...');
filtaBordaInput?.click();

// Verifique no Network tab se faz requisição
```

### Step 3: Verificar estado da API

```javascript
// Abra Network tab (F12)
// Clique no campo de Fita de Borda
// Procure por requisição:
// - GET /api/skus?category=fita
// - GET /api/estoque?tipo=borda
// - Similar

// Valide:
// - Requisição é feita?
// - Status é 200?
// - Dados retornam?
// - Está em application/json?
```

### Step 4: Verificar estado do componente React

```javascript
// Se sistema usa React, no console:
// 1. Inspecione elemento: right-click → Inspect
// 2. No DevTools Console, rode:

// Para encontrar componente React:
const key = Object.keys(document.querySelector('[id*="borda"]'))[0];
const instance = document.querySelector('[id*="borda"]')[key];
console.log(instance);

// Ou procure por React error no Console (vermelho)
```

---

## 📝 SAÍDA ESPERADA

Após mapear e testar, você terá:

```markdown
# 📊 Mapa Completo de Campos - Edição de Item

## Campos Encontrados: [número total]

### Campos Funcionando Corretamente:

- ✅ Campo 1: SKU
- ✅ Campo 2: Quantidade
- ✅ Campo 3: Preço
  [...]

### Campos com Problemas:

- ❌ Campo 5: Fita de Borda
  - Problema: [descrição exata]
  - Erro no console: [qual?]
  - API retorna erro: [qual?]
  - Comportamento: [o que acontece]

- ❌ Campo X: [outro campo problemático]
  - Problema: [...]

## Root Cause - Fita de Borda

### Hipótese 1: Integração com Estoque

- SKU de fita de borda existe no banco? [ ]
- API retorna SKUs de fita? [ ]
- Frontend consegue renderizar select? [ ]

### Hipótese 2: Erro de JavaScript

- Console tem erro? Qual? [ ]
- Component está em estado erro? [ ]
- Event listener não está registrado? [ ]

### Hipótese 3: Validação Rejeita

- Campo tem validação que rejeita? [ ]
- Tipo de dado está errado? [ ]
- Campo é read-only? [ ]

### Hipótese 4: Não Implementado

- Campo existe no HTML mas não tem lógica? [ ]
- Falta implementar integração? [ ]

## Evidência Principal

[Qual é a evidência de root cause?]

## Recomendação para Dev

[O que precisa corrigir?]
```

---

## 🎯 CHECKLIST DE EXPLORAÇÃO

- [ ] Navegou até modal de edição de item
- [ ] Abriu DevTools Console
- [ ] Mapeou TODOS os campos com script
- [ ] Documentou cada campo
- [ ] Identificou campo "Fita de Borda"
- [ ] Testou comportamento ao clicar
- [ ] Verificou Network (API calls)
- [ ] Verificou Console (JS errors)
- [ ] Comparou com campo similar funcionando
- [ ] Identificou causa raiz
- [ ] Gerou relatório com evidências

---

**Objetivo:** Transformar "não funciona" em "não funciona porque X, a solução é Y"

**Tempo estimado:** 30-45 minutos

**Resultado:** Mapa técnico detalhado + causa raiz identificada
