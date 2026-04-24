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
│   ├── ui/            # Componentes base (Botões, Inputs, etc)
│   └── ...
├── design-system/     # Sistema de Design oficializado
│   ├── components/    # Componentes base (Button, Modal, etc)
│   ├── tokens.ts      # Definição de tokens de design
│   └── utils.ts       # Utilitários (cn - className merge)
├── hooks/             # Custom Hooks
│   └── useEscClose.ts # Hook para fechar modais com ESC
├── lib/               # Configurações e utilitários
│   └── api.ts         # Cliente HTTP
├── pages/             # Páginas principais
└── test/              # Configuração de testes
```

## Design System

O projeto utiliza um Design System centralizado em `src/design-system/`.

### Componentes
- **Button**: `import { Button } from '@/design-system'`
- **Modal**: `import { Modal } from '@/design-system'`
- **Input**: `import { Input } from '@/design-system'`
- **Card**: `import { Card } from '@/design-system'`

### Tokens
Disponíveis em `src/design-system/tokens.ts`.

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

1. Criar componente no `design-system` se for base.
2. Usar tokens do design system (evitar cores hardcoded).
3. Sempre usar `useEscClose` para modais.
4. Escrever testes para novos componentes.

## Auditoria de Qualidade

Ver `AUDIT_REPORT_SUMMARY.md` para detalhes da última auditoria e refatorações realizadas.