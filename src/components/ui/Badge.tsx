import type { HTMLAttributes, ReactNode, ButtonHTMLAttributes } from 'react';
import { X } from 'lucide-react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../utils/cn';

const badgeVariants = cva(
  cn(
    'inline-flex items-center gap-1 rounded-[var(--ui-radius-full)]',
    'border px-2 py-0.5 text-[var(--ui-text-xs)] font-medium',
    'whitespace-nowrap',
    'transition-colors duration-[var(--ui-duration-fast)]',
  ),
  {
    variants: {
      tone: {
        neutral:
          'bg-[var(--ui-bg-subtle)] text-[var(--ui-text-secondary)] border-[var(--ui-border)]',
        primary:
          'bg-[var(--ui-color-navy-50)] text-[var(--ui-color-navy-700)] border-[var(--ui-color-navy-100)]',
        teal: 'bg-[var(--ui-color-teal-50)] text-[var(--ui-color-teal-700)] border-[var(--ui-color-teal-200)]',
        accent:
          'bg-[var(--ui-color-gold-50)] text-[var(--ui-color-gold-700)] border-[var(--ui-color-gold-100)]',
        success:
          'bg-[var(--ui-color-success-soft)] text-[var(--ui-color-success)] border-transparent',
        warning:
          'bg-[var(--ui-color-warning-soft)] text-[var(--ui-color-warning)] border-transparent',
        danger: 'bg-[var(--ui-color-danger-soft)] text-[var(--ui-color-danger)] border-transparent',
        info: 'bg-[var(--ui-color-info-soft)] text-[var(--ui-color-info)] border-transparent',
        outline: 'bg-transparent text-[var(--ui-text-secondary)] border-[var(--ui-border-strong)]',
      },
      size: {
        sm: 'text-[10px] px-1.5 py-0',
        md: 'text-[var(--ui-text-xs)]',
        lg: 'text-[var(--ui-text-sm)] px-2.5 py-1',
      },
    },
    defaultVariants: { tone: 'neutral', size: 'md' },
  },
);

export interface BadgeProps
  extends Omit<HTMLAttributes<HTMLSpanElement>, 'children'>, VariantProps<typeof badgeVariants> {
  icon?: ReactNode;
  dismissible?: boolean;
  onDismiss?: () => void;
  children?: ReactNode;
}

export function Badge({
  tone,
  size,
  className,
  icon,
  dismissible,
  onDismiss,
  children,
  ...props
}: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ tone, size }), className)} {...props}>
      {icon && <span className="shrink-0">{icon}</span>}
      {children}
      {dismissible && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Remover"
          className={cn(
            'ml-0.5 -mr-1 inline-flex h-4 w-4 items-center justify-center rounded-full',
            'hover:bg-black/10 transition-colors',
          )}
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </span>
  );
}

export interface StatusDotProps {
  tone: 'success' | 'warning' | 'danger' | 'info' | 'neutral';
  pulse?: boolean;
  label?: ReactNode;
  className?: string;
}

const dotTone: Record<StatusDotProps['tone'], string> = {
  success: 'bg-[var(--ui-color-success)]',
  warning: 'bg-[var(--ui-color-warning)]',
  danger: 'bg-[var(--ui-color-danger)]',
  info: 'bg-[var(--ui-color-info)]',
  neutral: 'bg-[var(--ui-text-muted)]',
};

export function StatusDot({ tone, pulse, label, className }: StatusDotProps) {
  return (
    <span className={cn('inline-flex items-center gap-1.5', className)}>
      <span className="relative inline-flex h-2 w-2">
        {pulse && (
          <span
            className={cn(
              'absolute inset-0 inline-flex h-full w-full animate-ping rounded-full opacity-60',
              dotTone[tone],
            )}
            aria-hidden="true"
          />
        )}
        <span className={cn('relative inline-flex h-2 w-2 rounded-full', dotTone[tone])} />
      </span>
      {label && (
        <span className="text-[var(--ui-text-xs)] text-[var(--ui-text-secondary)]">{label}</span>
      )}
    </span>
  );
}

export interface ChipProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  active?: boolean;
  children: ReactNode;
}

export function Chip({ active, className, children, ...props }: ChipProps) {
  return (
    <button
      type="button"
      className={cn(
        'inline-flex items-center gap-1.5 h-7 px-3 rounded-[var(--ui-radius-full)]',
        'text-[var(--ui-text-xs)] font-medium border transition-colors',
        active
          ? 'bg-[var(--ui-color-teal-500)] text-white border-[var(--ui-color-teal-500)]'
          : 'bg-[var(--ui-surface)] text-[var(--ui-text-secondary)] border-[var(--ui-border)] hover:border-[var(--ui-border-strong)]',
        className,
      )}
      aria-pressed={active}
      {...props}
    >
      {children}
    </button>
  );
}
