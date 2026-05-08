import { forwardRef, ButtonHTMLAttributes } from 'react';
import { cva } from 'class-variance-authority';
import type { VariantProps } from 'class-variance-authority';
import { cn } from '../utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 font-medium transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed',
  {
    variants: {
      variant: {
        primary: 'bg-primary text-primary-foreground hover:bg-primary-hover focus:ring-ring',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80 focus:ring-ring',
        outline: 'border-2 border-primary text-primary hover:bg-primary/10',
        ghost: 'text-foreground/60 hover:text-foreground hover:bg-foreground/10',
        danger: 'bg-destructive text-destructive-foreground hover:bg-destructive/90 focus:ring-destructive',
      },
      size: {
        sm: 'px-3 py-1.5 text-sm rounded-lg',
        md: 'px-4 py-2 text-base rounded-xl',
        lg: 'px-6 py-3 text-lg rounded-xl',
      },
      fullWidth: {
        true: 'w-full',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  isLoading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, fullWidth, isLoading, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={buttonVariants({ variant, size, fullWidth, className })}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? (
          <>
            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            <span>Carregando...</span>
          </>
        ) : (
          children
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';