import { forwardRef } from 'react';
import { cn } from '@/utils/cn';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string | null;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ error, className, ...props }, ref) => (
    <div className="flex flex-col gap-1">
      <input
        ref={ref}
        className={cn(
          'w-full rounded-md border px-3 py-2 text-sm outline-none transition-colors',
          'border-border bg-background text-foreground',
          'placeholder:text-muted-foreground',
          'focus:border-primary focus:ring-1 focus:ring-primary',
          error && 'border-destructive',
          className,
        )}
        {...props}
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  ),
);
Input.displayName = 'Input';
