# D'Luxury CRM & ERP (Fatto OS)

Bem-vindo ao repositório oficial do D'Luxury CRM (Fatto OS), um sistema Enterprise-Ready desenvolvido com as melhores práticas de Arquitetura e Engenharia de Software.

## 🎯 Visão Geral

Este sistema foi construído e refatorado em 7 fases rigorosas para atender ao ecossistema de marcenarias e prestadores de serviços de luxo. Ele cobre todas as necessidades de:

- **Gestão de Clientes & CRM**
- **Engenharia e Catálogo de SKUs**
- **Orçamentos Paramétricos (Inteligentes e Manuais)**
- **Planejamento e Controle de Produção (Kanban e Agenda)**
- **Estoque, Entradas e Saídas (Almoxarifado)**
- **Gestão Financeira e Contratos Digitais**
- **Aprovação de Projetos e Workflow 3D**
- **Pós-Venda e Dashboard Analítico**

## 🏗️ Stack Tecnológica

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS v4, Radix UI, Lucide Icons
- **Backend/API:** Node.js (via Serverless Functions na Vercel)
- **Banco de Dados:** Neon PostgreSQL (Serverless) + Drizzle ORM
- **Deployment:** Vercel (Produção e Staging)
- **Segurança & Auth:** Autenticação via JWT com RBAC (Role-Based Access Control)
- **Inteligência Artificial:** Gemini AI SDK e Vercel AI SDK (`@ai-sdk/google`)

## 🚀 Como Iniciar (Desenvolvimento Local)

### Pré-requisitos

- Node.js 24+
- Conta no [Neon.tech](https://neon.tech) para banco de dados local ou utilize a connection string de homologação fornecida no ambiente.

### Passos

1. **Instalar Dependências**
   \`\`\`bash
   npm install
   \`\`\`

2. **Configurar Variáveis de Ambiente**
   Crie um arquivo \`.env\` na raiz do projeto com o seguinte formato:
   \`\`\`env
   DATABASE_URL="postgresql://user:password@endpoint.neon.tech/neondb?sslmode=require"
   APP_JWT_SECRET="seu-segredo-super-forte-2024"
   APP_INIT_KEY="chave-de-inicializacao-banco"
   GOOGLE_GENERATIVE_AI_API_KEY="sua-api-key-gemini"
   \`\`\`

3. **Gerar e Migrar o Banco de Dados (Drizzle)**
   \`\`\`bash
   npm run db:generate
   npm run db:push
   \`\`\`

4. **Rodar o Servidor de Desenvolvimento Frontend**
   \`\`\`bash
   npm run dev
   \`\`\`

5. **(Opcional) Rodar o Servidor API Localmente**
   Se o Frontend não rotear diretamente pelo Vite Proxy, rode:
   \`\`\`bash
   npm run dev:api
   \`\`\`

## 📦 Deploy em Produção (Vercel)

O sistema está otimizado e configurado para o Vercel.

1. Conecte o repositório Github ao Vercel.
2. Nas configurações do projeto, adicione TODAS as variáveis de ambiente presentes no seu \`.env.local\`. É obrigatório que as variáveis `APP_JWT_SECRET` e `DATABASE_URL` estejam presentes nos ambientes de `Production` e `Preview`.
3. O comando de build já está definido no \`package.json\` como \`npm run build\`.
4. O Output Directory padrão do Vite é \`dist\`.
5. Ao fazer o Deploy, a Vercel utilizará as funções localizadas na pasta \`/api\` automaticamente como Serverless Functions.

## 🛠️ Guia de Troubleshooting

### Erro 500 no Login / Autenticação Falhando

- **Causa Comum:** Variável \`APP_JWT_SECRET\` ausente no ambiente atual.
- **Solução:** No painel da Vercel (Settings > Environment Variables), adicione \`APP_JWT_SECRET\` e marque-a para todos os ambientes de interesse (Production, Preview, Development). Refaça o deploy (\`vercel --prod\`) para que a alteração seja capturada pelas funções serverless.

### Tabelas não Encontradas no Banco de Dados

- **Causa Comum:** Você alterou o banco, mas não aplicou as migrações.
- **Solução:** Execute \`npx drizzle-kit push\` ou \`npx tsx src/db/migrate.ts\` garantindo que o seu \`DATABASE_URL\` está apontando para o banco de dados correto.

### Rotas API Retornando 404 Localmente

- **Causa Comum:** O Vite Server proxy não está conseguindo bater no dev server backend da porta 3000.
- **Solução:** Inicie o \`npm run dev:api\` em um terminal separado. Alternativamente, confira se o seu `vite.config.ts` possui a configuração de proxy apontando para a porta 3000.

## 📖 Documentação de Negócio (Quickstart e Onboarding)

Verifique o arquivo `docs/quickstart.md` para o guia de uso e onboarding do usuário final (treinamento do sistema).

## 🎨 Design System

Tokens canônicos de UI centralizados em dois arquivos, consumidos por todo o app:

| Camada        | Arquivo                       | Responsabilidade                                                                                                |
| ------------- | ----------------------------- | --------------------------------------------------------------------------------------------------------------- |
| **TS Tokens** | `src/styles/design-system.ts` | Fonte única de valores tipados (paleta, espaçamento, tipografia, sombras, raio). Importável em código React/TS. |
| **CSS Layer** | `src/styles/global.css`       | Espelha os tokens em CSS Custom Properties (`--ds-*`) + reset global. Importado em `src/main.tsx`.              |

### Estrutura

```
Design System:
├─ Colors        → colors.primary.{50,100,500,600,900} / secondary.* / accent / semantic
├─ Typography    → fontFamily, fontSizes.{xs..3xl}, fontWeights, lineHeights
├─ Spacing       → escala 4px (xs=4, sm=8, md=16, lg=24, xl=32, 2xl=48)
├─ Shadows       → sm, md, lg (rgba 5-10%)
└─ Border radius → sm=4, md=8, lg=12, full=9999
```

### Paleta (resumo)

| Token                                    | Hex                                           | Uso                                      |
| ---------------------------------------- | --------------------------------------------- | ---------------------------------------- |
| `primary.500`                            | `#0D66CC`                                     | Ação primária (links, botões principais) |
| `primary.600`                            | `#0D5FB8`                                     | Hover de ação primária                   |
| `primary.900`                            | `#003D82`                                     | Texto/realce de alta hierarquia          |
| `secondary.500`                          | `#00A99D`                                     | Ação secundária / destaque complementar  |
| `accent`                                 | `#E2AC00`                                     | Acento decorativo (badges, ícones)       |
| `background`                             | `#FAFAFA`                                     | Fundo de página                          |
| `surface`                                | `#FFFFFF`                                     | Cards, modais, superfícies elevadas      |
| `text.primary`                           | `#1A1A1A`                                     | Texto principal                          |
| `text.secondary`                         | `#666666`                                     | Texto secundário/labels                  |
| `error` / `success` / `warning` / `info` | `#DC3545` / `#28A745` / `#FFC107` / `#17A2B8` | Semânticas                               |

### Convenção de coexistência

Os tokens deste design system usam prefixo `--ds-*` (CSS) e `designSystem.*` (TS) para conviver sem colisão com o tema Tailwind v4 legado em `src/index.css` (`--primary`, `--secondary`, etc.). Isso permite migração gradual e uso combinado.

### Como usar

```ts
import { designSystem } from '@/styles/design-system';

const cardStyle = {
  background: designSystem.colors.surface,
  padding: designSystem.spacing.md,
  borderRadius: designSystem.borderRadius.md,
  boxShadow: designSystem.shadows.md,
  fontFamily: designSystem.typography.fontFamily,
};
```

```css
.my-button {
  background: var(--ds-color-primary-500);
  padding: var(--ds-spacing-sm) var(--ds-spacing-md);
  border-radius: var(--ds-radius-md);
}
```

### Próximos passos

- **FASE 6.2** — Redesenhar Dashboard usando os tokens.
- Migrar gradualmente o tema Tailwind em `src/index.css` para os tokens `--ds-*`.
