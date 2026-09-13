import { forwardRef } from 'react';
import { Card as UICard } from '../ui/Card';
import type { CardProps as UICardProps } from '../ui/Card';

/**
 * Wrapper de compatibilidade — delega ao oficial src/components/ui/Card.tsx
 */
export type CardProps = UICardProps;

export const Card = forwardRef<HTMLDivElement, CardProps>((props, ref) => {
  return <UICard ref={ref} {...props} />;
});
Card.displayName = 'Card';
