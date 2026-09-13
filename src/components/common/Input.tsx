import { forwardRef } from 'react';
import type { ReactNode } from 'react';
import { Input as UIInput } from '../ui/Input';
import type { InputProps as UIInputProps } from '../ui/Input';

export interface InputProps extends Omit<UIInputProps, 'size' | 'invalid' | 'error' | 'hint'> {
  variant?: 'default' | 'error' | 'success';
  inputSize?: 'sm' | 'md' | 'lg';
  size?: 'sm' | 'md' | 'lg';
  error?: string;
  helperText?: string;
  hint?: ReactNode;
}

/**
 * Wrapper compatível — delega ao oficial src/components/ui/Input.tsx
 * Preserva regra de negócio: uppercase automático (exceto password/email)
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ variant, inputSize, size, error, helperText, hint, onChange, type, ...props }, ref) => {
    const mappedSize = size ?? inputSize;
    const invalid = variant === 'error' || !!error;
    const mappedHint = helperText ?? hint;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (type !== 'password' && type !== 'email' && typeof e.target.value === 'string') {
        e.target.value = e.target.value.toUpperCase();
      }
      onChange?.(e as React.ChangeEvent<HTMLInputElement>);
    };

    return (
      <UIInput
        ref={ref}
        size={mappedSize as UIInputProps['size']}
        invalid={invalid}
        error={error}
        hint={mappedHint}
        type={type}
        onChange={handleChange}
        {...props}
      />
    );
  },
);

Input.displayName = 'Input';
