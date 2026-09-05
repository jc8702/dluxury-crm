import { cn } from '@/utils/cn';

type Tone = 'default' | 'success' | 'warning' | 'destructive' | 'info';

const toneClasses: Record<Tone, string> = {
  default: 'bg-muted text-muted-foreground',
  success: 'bg-[var(--ui-color-success-soft)] text-[hsl(var(--success))]',
  warning: 'bg-[var(--ui-color-warning-soft)] text-[hsl(38_92%_35%)]',
  destructive: 'bg-[var(--ui-color-danger-soft)] text-[hsl(var(--destructive))]',
  info: 'bg-[var(--ui-color-info-soft)] text-[hsl(var(--info))]',
};

export function Badge({
  tone = 'default',
  className,
  children,
}: {
  tone?: Tone;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
        toneClasses[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
