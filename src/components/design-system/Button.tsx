import { forwardRef } from 'react';
import { Button as OfficialButton, type ButtonProps as OfficialProps } from '../ui/Button';

/**
 * Wrapper de compatibilidade — delega ao componente oficial src/components/ui/Button.tsx
 * Mantido para não quebrar imports legados; novas páginas devem importar de '@/components/ui/Button'.
 */
export type ButtonProps = OfficialProps;

export const Button = forwardRef<HTMLButtonElement, ButtonProps>((props, ref) => {
  return <OfficialButton ref={ref} {...props} />;
});

Button.displayName = 'Button';
