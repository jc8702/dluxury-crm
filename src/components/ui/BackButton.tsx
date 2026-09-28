import type { CSSProperties } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from './Button';
import { cn } from '../../utils/cn';

/**
 * Botão "Voltar" padrão — usado pelo `layout/Header` e pelas páginas
 * dedicadas (financeiro, detalhes, formulários), eliminando os blocos
 * duplicados de `ArrowLeft + texto` espalhados pelo código.
 */
export interface BackButtonProps {
  onClick: () => void;
  label?: string;
  iconSize?: number;
  className?: string;
  style?: CSSProperties;
  'aria-label'?: string;
}

export function BackButton({
  onClick,
  label = 'Voltar',
  iconSize = 16,
  className,
  style,
  'aria-label': ariaLabel,
}: BackButtonProps) {
  return (
    <Button
      variant="ghost"
      onClick={onClick}
      aria-label={ariaLabel}
      className={cn('gap-2', className)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        fontSize: '0.8rem',
        color: 'hsl(var(--muted-foreground))',
        marginBottom: '1rem',
        padding: 0,
        height: 'auto',
        background: 'transparent',
        ...style,
      }}
    >
      <ArrowLeft size={iconSize} /> {label}
    </Button>
  );
}

export default BackButton;
