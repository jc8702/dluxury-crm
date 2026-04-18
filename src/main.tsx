import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

// Capturar erros não tratados em produção para diagnóstico
window.addEventListener('error', (event) => {
  console.error('[Global Error]', event.error)
})

window.addEventListener('unhandledrejection', (event) => {
  console.error('[Unhandled Promise]', event.reason)
})

const rootElement = document.getElementById('root')

if (!rootElement) {
  document.body.innerHTML = `
    <div style="color:#E2AC00;background:#0D1117;height:100vh;
    display:flex;align-items:center;justify-content:center;
    font-family:sans-serif;font-size:18px;text-align:center;padding:20px;">
      Erro crítico de inicialização: elemento #root não encontrado.<br/>
      Por favor, tente recarregar a página.
    </div>
  `
} else {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  )
}
