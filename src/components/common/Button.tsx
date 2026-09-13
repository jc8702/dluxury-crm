import { forwardRef } from 'react';
import { Button as OfficialButton } from '../ui/Button';
import type { ButtonProps as OfficialProps } from '../ui/Button';

/**
 * Wrapper de compatibilidade — delega ao componente oficial src/components/ui/Button.tsx
 * Mantém compatibilidade com prop legada `fullWidth` (mapeada para `block`) e preserva
 * comportamento de `isLoading` que exibia "Carregando..." (teste legado).
 */
export interface ButtonProps extends Omit<OfficialProps, 'block'> {
  fullWidth?: boolean;
  block?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ fullWidth, block, isLoading, children, ...props }, ref) => {
    const blockValue = block ?? fullWidth;
    // Preserva texto "Carregando..." quando isLoading para compatibilidade com teste legado
    const content = isLoading ? 'Carregando...' : children;
    return (
      <OfficialButton ref={ref} block={blockValue} isLoading={isLoading} {...props}>
        {content}
      </OfficialButton>
    );
  },
);

Button.displayName = 'Button';
