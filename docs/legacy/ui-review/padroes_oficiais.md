# Padrões Oficiais do Design System — D'Luxury CRM

Este documento descreve a especificação técnica dos tokens, componentes globais e regras de interação adotados no ERP D'Luxury CRM.

## 1. Tokens de Design (Cores e Temas)

O design system baseia-se em variáveis de cores CSS declaradas em HSL no arquivo [index.css](file:///c:/Users/jc-pr/.gemini/antigravity/scratch/dluxury-crm/src/index.css). As variáveis principais são:

### Tema Escuro (Padrão)

- `--background`: `20 14% 5%` (Preto quente texturizado)
- `--foreground`: `30 20% 96%` (Branco suave)
- `--card`: `24 12% 8%` (Cinza escuro para cards)
- `--primary`: `22 100% 54%` (Laranja assinatura D'Luxury)
- `--primary-hover`: `22 95% 48%`
- `--secondary`: `24 8% 14%`
- `--border`: `24 10% 16%`
- `--input`: `24 10% 14%`
- `--success`: `142 71% 45%`
- `--warning`: `38 92% 50%`
- `--destructive`: `0 84% 60%`

### Tema Claro

- `--background`: `30 25% 98%`
- `--foreground`: `24 20% 10%`
- `--card`: `0 0% 100%`
- `--border`: `24 10% 90%`
- `--primary`: `22 95% 50%`

---

## 2. Tipografia e Espaçamentos

- **Fonte Global:** `Inter, system-ui, -apple-system, sans-serif`
- **Arredondamento:**
  - Cards e Modais: `rounded-2xl` (`14px` / `0.875rem`)
  - Inputs e Botões grandes: `rounded-xl` (`12px` / `0.75rem`)
  - Badges e Botões pequenos: `rounded-lg` (`8px` / `0.5rem`)
- **Grades e Paddings:**
  - Estrutura de grid padrão para telas: `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6`
  - Padding interno padrão em Cards: `p-6`

---

## 3. Padrão de Componentes Compartilhados

### A. Card Base (`<Card>`)

Estrutura semântica para agregação de informações:

- **`<Card>`**: Wrapper principal com borda sutil (`border-border`) e fundo contrastante (`bg-card`).
- **`<CardHeader>`**: Container superior de título.
- **`<CardTitle>`**: Título principal em negrito (`text-lg font-semibold`).
- **`<CardDescription>`**: Texto descritivo com opacidade reduzida (`text-white/60`).
- **`<CardContent>`**: Área principal de dados.
- **`<CardFooter>`**: Área inferior de botões ou ações.

### B. Modal Base (`<Modal>`)

Regras rígidas de comportamento e interação:

1. **Comportamento ESC:** Pressionar a tecla `Escape` fecha o modal ativo de forma consistente (`closeOnEscape = true`).
2. **Focus Trap:** Foco automático no primeiro campo editável ao abrir; limitação do foco via tecla `Tab` para dentro da caixa do modal; retorno do foco ao elemento de disparo ao fechar.
3. **Scroll Lock:** Bloqueio automático de rolagem na janela do navegador de fundo (`overflow: hidden` aplicado ao `body` ao abrir, e removido ao fechar).
4. **Fechamento por Clique Externo:** Clicar no overlay escuro de fundo fecha o modal, exceto em fluxos de formulários complexos.

### C. Botão Base (`<Button>`)

- **Variantes:**
  - `primary`: Fundo laranja assinatura, texto escuro.
  - `secondary`: Cinza escuro para ações secundárias ou de fechamento.
  - `outline`: Borda laranja com fundo transparente.
  - `ghost`: Ações sutis em tabelas ou headers.
  - `danger`: Ações destrutivas (excluir/cancelar).
- **Estado Loading:** Substituição do conteúdo do botão por um spinner animado (`animate-spin`) e o texto "Carregando..." para evitar cliques duplos.

### D. Scrollbar Base

- Ocultação dos controles nativos brutos em navegadores modernos.
- Aplicação de trilho customizado em navegadores baseados em Chromium e Webkit:

```css
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}
::-webkit-scrollbar-track {
  background: transparent;
}
::-webkit-scrollbar-thumb {
  background: hsl(var(--border));
  border-radius: 999px;
}
::-webkit-scrollbar-thumb:hover {
  background: hsl(var(--primary) / 0.5);
}
```
