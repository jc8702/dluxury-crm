# D'LUXURY ERP - Documentação de Arquitetura

## Visão Geral

ERP Industrial para gestão de vendas, produção e finanças da D'LUXURY.

## Stack Tecnológica

- **Frontend**: React 19 + TypeScript + Vite
- **Backend**: API Node.js (Next.js API Routes ou Vercel Serverless)
- **Database**: PostgreSQL (Neon)
- **ORM**: Drizzle ORM
- **Styling**: Tailwind CSS + Design System Customizado

## Estrutura de Pastas

```
src/
├── api-lib/           # Handlers de API (Backend)
├── components/        # Componentes React reutilizáveis
│   ├── common/        # Componentes base do Design System (Button, Modal, Card, etc)
│   └── ...
├── hooks/             # Custom Hooks
│   └── useEscClose.ts # Hook para fechar modais com ESC
├── lib/               # Configurações e utilitários
│   └── api.ts         # Cliente HTTP
├── pages/             # Páginas principais
└── test/              # Configuração de testes
```

## Design System

O projeto utiliza um Design System centralizado em `src/components/common/`.

### Componentes

- **Button**: `import { Button } from '@/components/common'`
- **Modal**: `import { Modal } from '@/components/common'`
- **Input**: `import { Input } from '@/components/common'`
- **Card**: `import { Card } from '@/components/common'`

### Tokens

Os tokens de estilo estão integrados no tema Tailwind v4 em `src/index.css`.

## Testes

Executar testes unitários:

```bash
npm test
```

Executar com coverage:

```bash
npm run test:coverage
```

## Fluxo de Desenvolvimento

1. Criar componente no `components/common` se for base.
2. Usar classes e utilitários do Tailwind v4 definidos em `src/index.css` (evitar cores hardcoded arbitrárias).
3. Sempre usar `useEscClose` para modais.
4. Escrever testes para novos componentes.

## Auditoria de Qualidade

Ver `AUDIT_REPORT_SUMMARY.md` para detalhes da última auditoria e refatorações realizadas.
