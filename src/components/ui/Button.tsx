import { forwardRef } from 'react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../utils/cn';

const buttonVariants = cva(
  cn(
    'inline-flex items-center justify-center gap-2 font-medium whitespace-nowrap capitalize',
    'transition-all duration-[var(--ui-duration-fast)] ease-[var(--ui-ease-out)]',
    'focus-visible:outline-none focus-visible:shadow-[var(--ui-focus-ring)]',
    'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none',
    'select-none',
  ),
  {
    variants: {
      variant: {
        primary: cn(
          'bg-[var(--ui-action-primary)] text-[var(--ui-action-primary-fg)]',
          'shadow-[0_0_10px_rgba(234,179,8,0.2)]', // Glow estático sutil
          'hover:bg-[var(--ui-action-primary-hover)] hover:shadow-[0_0_20px_rgba(234,179,8,0.4)]',
          'active:translate-y-px active:shadow-none',
        ),
        secondary: cn(
          'bg-[var(--ui-action-secondary)] text-[var(--ui-action-secondary-fg)]',
          'hover:bg-[var(--ui-action-secondary-hover)]',
          'active:translate-y-px',
        ),
        accent: cn(
          'bg-[var(--ui-action-accent)] text-[var(--ui-action-accent-fg)]',
          'hover:bg-[var(--ui-action-accent-hover)]',
          'active:translate-y-px',
        ),
        outline: cn(
          'bg-transparent text-[var(--ui-text-primary)] border border-[var(--ui-border-strong)]',
          'hover:bg-[var(--ui-surface-hover)] hover:border-[var(--ui-text-muted)]',
        ),
        ghost: cn(
          'bg-transparent text-[var(--ui-text-secondary)]',
          'hover:bg-[var(--ui-surface-hover)] hover:text-[var(--ui-text-primary)]',
        ),
        danger: cn(
          'bg-[var(--ui-action-danger)] text-[var(--ui-action-danger-fg)]',
          'hover:bg-[var(--ui-action-danger-hover)]',
          'active:translate-y-px',
        ),
      },
      size: {
        xs: 'h-7 px-2.5 text-[var(--ui-text-xs)] rounded-[var(--ui-radius-sm)]',
        sm: 'h-8 px-3 text-[var(--ui-text-sm)] rounded-[var(--ui-radius-md)]',
        md: 'h-9 px-4 text-[var(--ui-text-sm)] rounded-[var(--ui-radius-md)]',
        lg: 'h-11 px-5 text-[var(--ui-text-base)] rounded-[var(--ui-radius-md)]',
        icon: 'h-9 w-9 rounded-[var(--ui-radius-md)]',
      },
      block: { true: 'w-full' },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  isLoading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      block,
      isLoading = false,
      leftIcon,
      rightIcon,
      children,
      disabled,
      type = 'button',
      ...props
    },
    ref,
  ) => (
    <button
      ref={ref}
      type={type}
      className={cn(buttonVariants({ variant, size, block }), className)}
      disabled={disabled || isLoading}
      aria-busy={isLoading || undefined}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
      ) : (
        leftIcon && <span className="shrink-0">{leftIcon}</span>
      )}
      <span className="truncate">{children}</span>
      {!isLoading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
    </button>
  ),
);
Button.displayName = 'Button';
