import { Badge as UIBadge } from '../ui/Badge';
import type { BadgeProps as UIBadgeProps } from '../ui/Badge';

const toneMap: Record<string, UIBadgeProps['tone']> = {
  default: 'neutral',
  success: 'success',
  warning: 'warning',
  destructive: 'danger',
  info: 'info',
};

export interface BadgeProps extends Omit<UIBadgeProps, 'tone'> {
  tone?: 'default' | 'success' | 'warning' | 'destructive' | 'info' | UIBadgeProps['tone'];
}

/**
 * Wrapper de compatibilidade — delega ao oficial src/components/ui/Badge.tsx
 */
export function Badge({ tone = 'default', ...props }: BadgeProps) {
  const mapped = (toneMap[tone as string] ?? tone) as UIBadgeProps['tone'];
  return <UIBadge tone={mapped} {...props} />;
}
