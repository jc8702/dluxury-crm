import React, { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  moduleName?: string;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`[ErrorBoundary] Erro em ${this.props.moduleName || 'Global'}:`, error, errorInfo);
  }

  handleReset = () => {
    localStorage.clear();
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          backgroundColor: '#0D1117',
          color: '#E2AC00',
          fontFamily: 'sans-serif',
          gap: '20px',
          padding: '40px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '4rem' }}>⚠️</div>
          <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '800' }}>
            Ops! Algo deu errado {this.props.moduleName ? `no módulo ${this.props.moduleName}` : ''}
          </h2>
          <p style={{ color: '#9CA3AF', maxWidth: '500px', lineHeight: '1.6' }}>
            Ocorreu um erro inesperado que impediu a renderização. {this.state.error?.message}
          </p>
          
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={() => window.location.reload()}
              style={{
                background: 'rgba(255,255,255,0.05)',
                color: '#fff',
                border: '1px solid rgba(255,255,255,0.1)',
                padding: '12px 24px',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: '600'
              }}
            >
              Recarregar Página
            </button>
            <button
              onClick={this.handleReset}
              style={{
                background: '#E2AC00',
                color: '#000',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              Reset Total (Limpar Cache)
            </button>
          </div>

          <details style={{ 
            color: '#6B7280', 
            fontSize: '12px', 
            marginTop: '20px', 
            width: '100%', 
            maxWidth: '600px',
            textAlign: 'left',
            background: 'rgba(0,0,0,0.2)',
            padding: '16px',
            borderRadius: '8px'
          }}>
            <summary style={{ cursor: 'pointer', marginBottom: '8px' }}>Detalhes técnicos do erro</summary>
            <pre style={{ whiteSpace: 'pre-wrap', overflowX: 'auto', margin: 0 }}>
              {this.state.error?.stack}
            </pre>
          </details>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

