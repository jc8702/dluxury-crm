# Sentry Setup

## Status: ✅ Configurado (aguarda DSN para ativação)

## Configuração

### Backend (api/index.ts)

Sentry é inicializado em `api/index.ts:2-22` apenas quando:
- `process.env.SENTRY_DSN` está definida
- `process.env.NODE_ENV === 'production'`

```ts
import * as Sentry from '@sentry/node';

if (process.env.SENTRY_DSN && process.env.NODE_ENV === 'production') {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV,
    tracesSampleRate: 0.1,
    beforeSend(event) {
      if (event.request?.cookies) delete event.request.cookies;
      if (event.user) {
        delete event.user.ip_address;
        delete event.user.email;
      }
      return event;
    },
  });
}
```

### Frontend (src/main.tsx)

Sentry é inicializado em `src/main.tsx:11-24` apenas quando:
- `import.meta.env.PROD` é true
- `import.meta.env.VITE_SENTRY_DSN` está definida

```ts
import * as Sentry from '@sentry/react';

if (import.meta.env.PROD && import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN as string,
    environment: import.meta.env.MODE,
    integrations: [Sentry.browserTracingIntegration()],
    tracesSampleRate: 0.1,
    beforeSend(event) {
      if (event.user) {
        delete event.user.ip_address;
        delete event.user.email;
      }
      return event;
    },
  });
}
```

### ErrorBoundary (src/components/common/ErrorBoundary.tsx)

Captura automática de erros de renderização:

```ts
public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
  logger.error(...);
  Sentry.withScope((scope) => {
    scope.setTag('errorBoundary.module', this.props.moduleName || 'Global');
    scope.setExtra('componentStack', errorInfo.componentStack);
    Sentry.captureException(error);
  });
}
```

## Próximos passos para ativar

1. **Criar projeto Sentry**:
   - Acesse [sentry.io](https://sentry.io) e crie uma organização/projeto
   - Crie 2 projetos: `dluxury-crm-backend` (Node) e `dluxury-crm-frontend` (React)

2. **Configurar env vars no Vercel**:
   ```bash
   vercel env add SENTRY_DSN production
   # Cole a DSN do projeto Node
   vercel env add VITE_SENTRY_DSN production
   # Cole a DSN do projeto React
   ```

3. **Source Maps** (recomendado para stack traces legíveis):
   - Adicionar `@sentry/vite-plugin` ao `vite.config.ts`:
     ```ts
     import { sentryVitePlugin } from "@sentry/vite-plugin";
     // ...
     plugins: [react(), sentryVitePlugin({
       org: "sua-org",
       project: "dluxury-crm-frontend"
     })]
     ```
   - Adicionar `SENTRY_AUTH_TOKEN` no Vercel

4. **Alertas** (configurar no painel Sentry):
   - Email/Slack para novos issues
   - Threshold de frequência (ex: >10 ocorrências/hora)
   - Tags de filtro por ambiente (production, staging)

## O que é capturado

| Origem | Tipo | Onde |
|---|---|---|
| Erros do backend (api/index.ts) | Exceções não tratadas no router | `api/index.ts:524-530` |
| Erros do React | Render errors em qualquer componente | `ErrorBoundary.tsx:32-37` |
| Promise rejections | Async errors em window/global | `src/main.tsx:34-37` |
| Erros window | Erros síncronos não capturados | `src/main.tsx:30-33` |

## O que NÃO é capturado (LGPD)

- Cookies de sessão
- Endereço IP
- Email do usuário
- Qualquer campo de `event.user` (sanitizado em `beforeSend`)

## Teste manual após deploy

```bash
# Em produção com DSN configurada, abrir o console e rodar:
throw new Error('Sentry test from browser');
```

Verificar o evento no painel Sentry em até 30 segundos.
