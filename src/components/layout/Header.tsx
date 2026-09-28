import React from 'react';
import { BackButton } from '../ui/BackButton';

interface HeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  /** Padrão de navegação de páginas dedicadas: botão "Voltar" à esquerda. */
  onBack?: () => void;
  backLabel?: string;
}

const Header: React.FC<HeaderProps> = ({ title, subtitle, actions, onBack, backLabel }) => {
  return (
    <header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between px-4 md:px-6 py-4 border-b border-[var(--ui-border)] bg-[var(--ui-surface)]/80 backdrop-blur-md sticky top-0 z-30 rounded-t-[var(--ui-radius-lg)]">
      <div className="flex flex-col gap-1 min-w-0">
        {onBack && (
          <div className="-ml-1">
            <BackButton
              onClick={onBack}
              label={backLabel}
              style={{ marginBottom: 0, fontSize: '0.8125rem' }}
            />
          </div>
        )}
        <h1 className="text-xl md:text-2xl font-semibold tracking-tight text-[var(--ui-text-primary)] leading-tight">
          {title}
        </h1>
        {subtitle && (
          <p className="text-sm text-[var(--ui-text-secondary)] leading-normal">{subtitle}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-3 shrink-0">{actions}</div>}
    </header>
  );
};

export default Header;
