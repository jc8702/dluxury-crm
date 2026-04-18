import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import ErrorBoundary from './components/ErrorBoundaries.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary moduleName="Global">
      <App />
    </ErrorBoundary>
  </StrictMode>,
)

