import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { logger } from '../../utils/logger';

interface Props {
  children: ReactNode;
  moduleName?: string;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logger.error(
      `ErrorBoundary capturou um erro no módulo: ${this.props.moduleName || 'Global'}`,
      error,
      { errorInfo },
    );
  }

  handleReset = () => {
    localStorage.clear();
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex flex-col items-center justify-center min-h-[300px] h-full bg-background/50 border border-border rounded-lg text-foreground gap-4 p-8 text-center">
          <div className="text-4xl">⚠️</div>
          <h2 className="m-0 font-bold text-xl tracking-tight text-destructive">
            Ops! Algo deu errado {this.props.moduleName ? `no módulo ${this.props.moduleName}` : ''}
          </h2>
          <p className="text-muted-foreground max-w-[500px] text-sm leading-relaxed">
            Ocorreu um erro inesperado que impediu a renderização. {this.state.error?.message}
          </p>

          <div className="flex gap-3 mt-4">
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="px-4 py-2 bg-secondary text-secondary-foreground rounded hover:bg-secondary/80 transition-colors text-sm font-semibold"
            >
              Tentar Novamente
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 border border-border text-foreground rounded hover:bg-accent transition-colors text-sm font-semibold"
            >
              Recarregar Página
            </button>
          </div>

          <details className="mt-6 w-full max-w-2xl text-left bg-muted/50 p-4 rounded-md text-xs text-muted-foreground">
            <summary className="cursor-pointer font-semibold mb-2 hover:text-foreground">
              Detalhes técnicos do erro
            </summary>
            <pre className="whitespace-pre-wrap overflow-x-auto m-0">{this.state.error?.stack}</pre>
          </details>
        </div>
      );
    }

    return this.props.children;
  }
}
