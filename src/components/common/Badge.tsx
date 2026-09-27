import { Badge as UIBadge } from '../ui/Badge';
import type { BadgeProps as UIBadgeProps } from '../ui/Badge';

const variantToTone: Record<string, UIBadgeProps['tone']> = {
  default: 'primary',
  primary: 'primary',
  secondary: 'teal',
  teal: 'teal',
  destructive: 'danger',
  danger: 'danger',
  info: 'info',
  neutral: 'neutral',
  accent: 'accent',
  outline: 'outline',
  success: 'success',
  warning: 'warning',
};

export interface BadgeProps extends Omit<UIBadgeProps, 'tone' | 'variant'> {
  variant?: string;
  tone?: UIBadgeProps['tone'];
}

/**
 * Wrapper compatível — delega ao oficial src/components/ui/Badge.tsx
 * Suporta `variant` legado (common) mapeado para `tone` do ui.
 */
export function Badge({ variant, tone, ...props }: BadgeProps) {
  const mappedTone = tone ?? (variant ? variantToTone[variant] : undefined);
  return <UIBadge tone={mappedTone} {...props} />;
}
