import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  moduleName?: string;
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
    console.error(`Uncaught error in ${this.props.moduleName || 'Component'}:`, error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{ 
          padding: '2rem', 
          margin: '2rem', 
          background: 'rgba(239, 68, 68, 0.1)', 
          border: '1px solid #ef4444', 
          borderRadius: '12px',
          color: '#ef4444'
        }}>
          <h2 style={{ marginBottom: '1rem' }}>Ops! O módulo {this.props.moduleName} falhou.</h2>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
            Ocorreu um erro técnico que impediu a renderização desta página.
          </p>
          <pre style={{ 
            background: 'rgba(0,0,0,0.3)', 
            padding: '1rem', 
            borderRadius: '8px', 
            fontSize: '0.8rem',
            overflowX: 'auto',
            color: '#ff8a8a'
          }}>
            {this.state.error?.toString()}
          </pre>
          <button 
            onClick={() => window.location.reload()}
            className="btn btn-primary"
            style={{ marginTop: '1.5rem' }}
          >
            Recarregar Aplicativo
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
