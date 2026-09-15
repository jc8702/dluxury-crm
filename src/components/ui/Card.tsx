import { forwardRef } from 'react';
import type { HTMLAttributes, ReactNode } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../utils/cn';

const cardVariants = cva(
  cn(
    'bg-[var(--ui-surface)]/95 backdrop-blur-md border border-[var(--ui-border)] rounded-[var(--ui-radius-lg)]',
    'transition-all duration-[var(--ui-duration-base)] ease-[var(--ui-ease-out)]',
  ),
  {
    variants: {
      variant: {
        default: 'shadow-[var(--ui-shadow-1)]',
        elevated: 'shadow-[var(--ui-shadow-2)]',
        flat: 'shadow-none',
        outlined: 'shadow-none bg-transparent',
        accent: cn(
          'border-[hsl(var(--secondary)/0.20)] bg-[hsl(var(--secondary)/0.12)]',
          'shadow-[var(--ui-shadow-1)]',
        ),
      },
      padding: {
        none: '',
        sm: 'p-3',
        md: 'p-4',
        lg: 'p-6',
      },
      interactive: {
        true: cn(
          'cursor-pointer hover:shadow-[var(--ui-shadow-2)] hover:border-[var(--ui-border-strong)]',
          'hover:-translate-y-px',
        ),
        false: '',
      },
    },
    defaultVariants: { variant: 'default', padding: 'md', interactive: false },
  },
);

export interface CardProps
  extends HTMLAttributes<HTMLDivElement>, VariantProps<typeof cardVariants> {}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, padding, interactive, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(cardVariants({ variant, padding, interactive }), className)}
      {...props}
    />
  ),
);
Card.displayName = 'Card';

export const CardHeader = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'px-4 py-3 border-b border-[var(--ui-border)] flex items-center justify-between gap-3',
        className,
      )}
      {...props}
    />
  ),
);
CardHeader.displayName = 'CardHeader';

export const CardTitle = forwardRef<HTMLHeadingElement, HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn(
        'text-[var(--ui-text-lg)] font-semibold text-[var(--ui-text-primary)] tracking-tight',
        className,
      )}
      {...props}
    />
  ),
);
CardTitle.displayName = 'CardTitle';

export const CardDescription = forwardRef<
  HTMLParagraphElement,
  HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn('text-[var(--ui-text-sm)] text-[var(--ui-text-secondary)]', className)}
    {...props}
  />
));
CardDescription.displayName = 'CardDescription';

export const CardBody = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => <div ref={ref} className={cn('p-4', className)} {...props} />,
);
CardBody.displayName = 'CardBody';

export const CardFooter = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'px-4 py-3 border-t border-[var(--ui-border)] bg-[var(--ui-bg-subtle)]',
        'flex items-center justify-end gap-2',
        className,
      )}
      {...props}
    />
  ),
);
CardFooter.displayName = 'CardFooter';

export interface CardStatProps extends HTMLAttributes<HTMLDivElement> {
  label: ReactNode;
  value: ReactNode;
  delta?: ReactNode;
  icon?: ReactNode;
  tone?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent';
}

const toneClasses: Record<NonNullable<CardStatProps['tone']>, string> = {
  default: 'bg-[hsl(var(--primary)/0.12)] text-[hsl(var(--primary))]',
  success: 'bg-[hsl(var(--success)/0.12)] text-[hsl(var(--success))]',
  warning: 'bg-[hsl(var(--warning)/0.14)] text-[hsl(var(--warning))]',
  danger: 'bg-[hsl(var(--destructive)/0.12)] text-[hsl(var(--destructive))]',
  info: 'bg-[hsl(var(--info)/0.12)] text-[hsl(var(--info))]',
  accent: 'bg-[hsl(var(--accent)/0.14)] text-[hsl(var(--accent))]',
};

export const CardStat = forwardRef<HTMLDivElement, CardStatProps>(
  ({ label, value, delta, icon, tone = 'default', className, ...props }, ref) => (
    <Card ref={ref} className={cn('p-4 h-full', className)} {...props}>
      <div className="grid grid-cols-[1fr_auto] items-start gap-3">
        <div className="min-w-0 flex flex-col">
          <p className="text-[var(--ui-text-xs)] font-medium uppercase tracking-[var(--ui-tracking-wide)] text-[var(--ui-text-secondary)] leading-tight">
            {label}
          </p>
          <p className="mt-1 text-[var(--ui-text-2xl)] font-semibold tracking-tight text-[var(--ui-text-primary)] leading-tight">
            {value}
          </p>
          {delta && (
            <p className="mt-1 text-[var(--ui-text-xs)] text-[var(--ui-text-secondary)] leading-tight">
              {delta}
            </p>
          )}
        </div>
        {icon && (
          <div
            className={cn(
              'h-9 w-9 rounded-[var(--ui-radius-md)] flex items-center justify-center shrink-0',
              toneClasses[tone],
            )}
            aria-hidden="true"
          >
            {icon}
          </div>
        )}
      </div>
    </Card>
  ),
);
CardStat.displayName = 'CardStat';
