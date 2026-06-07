import { cn } from '@/utils/cn';

export function Card({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('rounded-lg border border-border bg-card p-4 shadow-sm', className)}
      {...props}
    >
      {children}
    </div>
  );
}
