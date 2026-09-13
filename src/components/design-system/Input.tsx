import { forwardRef } from 'react';
import { Input as UIInput } from '../ui/Input';
import type { InputProps as UIInputProps } from '../ui/Input';

export interface InputProps extends Omit<UIInputProps, 'error'> {
  error?: string | null;
}

/**
 * Wrapper de compatibilidade — delega ao oficial src/components/ui/Input.tsx
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(({ error, ...props }, ref) => {
  return <UIInput ref={ref} error={error ?? undefined} {...props} />;
});

Input.displayName = 'Input';
