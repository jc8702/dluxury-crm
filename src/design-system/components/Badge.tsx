import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-[#00A99D] text-white hover:bg-[#008A7E]',
        secondary: 'border-transparent bg-white/10 text-white/80 hover:bg-white/20',
        destructive: 'border-transparent bg-red-500 text-white hover:bg-red-600',
        outline: 'text-white border-white/20',
        success: 'border-transparent bg-green-500/10 text-green-400 border-green-500/20',
        warning: 'border-transparent bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}