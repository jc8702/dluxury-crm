import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
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

// Capturar erros não tratados em produção para diagnóstico
window.addEventListener('error', (event) => {
  console.error('[Global Error]', event.error);
  Sentry.captureException(event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('[Unhandled Promise]', event.reason);
  Sentry.captureException(event.reason);
});

const rootElement = document.getElementById('root');

if (!rootElement) {
  document.body.innerHTML = `
    <div style="color:#E2AC00;background:#0D1117;height:100vh;
    display:flex;align-items:center;justify-content:center;
    font-family:sans-serif;font-size:18px;text-align:center;padding:20px;">
      Erro crítico de inicialização: elemento #root não encontrado.<br/>
      Por favor, tente recarregar a página.
    </div>
  `;
} else {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}
