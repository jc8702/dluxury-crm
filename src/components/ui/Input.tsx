import { forwardRef } from 'react';
import type {
  InputHTMLAttributes,
  TextareaHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
} from 'react';
import { AlertCircle, Check, ChevronDown } from 'lucide-react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../utils/cn';

const fieldBase = cn(
  'flex w-full bg-[var(--ui-surface)] text-[var(--ui-text-primary)]',
  'border border-[var(--ui-border)] rounded-[var(--ui-radius-md)]',
  'placeholder:text-[var(--ui-text-muted)]',
  'transition-colors duration-[var(--ui-duration-fast)] ease-[var(--ui-ease-out)]',
  'focus:outline-none focus:border-[var(--ui-color-teal-500)]',
  'focus:shadow-[var(--ui-shadow-focus)]',
  'disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-[var(--ui-bg-subtle)]',
);

const inputSize = cva(fieldBase, {
  variants: {
    size: {
      sm: 'h-8 px-3 text-[var(--ui-text-sm)]',
      md: 'h-9 px-3 text-[var(--ui-text-sm)]',
      lg: 'h-11 px-4 text-[var(--ui-text-base)]',
    },
    invalid: {
      true: cn(
        'border-[var(--ui-color-danger)] focus:border-[var(--ui-color-danger)]',
        'focus:shadow-[var(--ui-shadow-danger-focus)]',
      ),
      false: '',
    },
  },
  defaultVariants: { size: 'md', invalid: false },
});

export interface FieldWrapperProps {
  id?: string;
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  required?: boolean;
  children: ReactNode;
  className?: string;
}

export function FieldWrapper({
  id,
  label,
  hint,
  error,
  required,
  children,
  className,
}: FieldWrapperProps) {
  const hintId = id ? `${id}-hint` : undefined;
  const errId = id ? `${id}-error` : undefined;
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label && (
        <label
          htmlFor={id}
          className="text-[var(--ui-text-sm)] font-medium text-[var(--ui-text-primary)]"
        >
          {label}
          {required && (
            <span className="ml-0.5 text-[var(--ui-color-danger)]" aria-hidden="true">
              *
            </span>
          )}
        </label>
      )}
      {children}
      {error ? (
        <p
          id={errId}
          className="flex items-center gap-1 text-[var(--ui-text-xs)] text-[var(--ui-color-danger)]"
        >
          <AlertCircle className="h-3 w-3" aria-hidden="true" />
          <span>{error}</span>
        </p>
      ) : hint ? (
        <p id={hintId} className="text-[var(--ui-text-xs)] text-[var(--ui-text-secondary)]">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export interface InputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'>, VariantProps<typeof inputSize> {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    { className, size, invalid, label, hint, error, leftIcon, rightIcon, required, id, ...props },
    ref,
  ) => {
    const inputId = id || (typeof label === 'string' ? label : undefined);
    return (
      <FieldWrapper id={inputId} label={label} hint={hint} error={error} required={required}>
        <div className="relative">
          {leftIcon && (
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-[var(--ui-text-muted)] pointer-events-none">
              {leftIcon}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              inputSize({ size, invalid: !!error || invalid }),
              leftIcon && 'pl-9',
              rightIcon && 'pr-9',
              className,
            )}
            aria-invalid={!!error || undefined}
            required={required}
            {...props}
          />
          {rightIcon && (
            <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-[var(--ui-text-muted)] pointer-events-none">
              {rightIcon}
            </span>
          )}
        </div>
      </FieldWrapper>
    );
  },
);
Input.displayName = 'Input';

export interface TextareaProps
  extends TextareaHTMLAttributes<HTMLTextAreaElement>, VariantProps<typeof inputSize> {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, size, invalid, label, hint, error, required, id, rows = 4, ...props }, ref) => {
    const inputId = id || (typeof label === 'string' ? label : undefined);
    return (
      <FieldWrapper id={inputId} label={label} hint={hint} error={error} required={required}>
        <textarea
          ref={ref}
          id={inputId}
          rows={rows}
          className={cn(
            inputSize({ size, invalid: !!error || invalid }),
            'py-2 leading-[var(--ui-leading-normal)] min-h-[80px] resize-y',
            className,
          )}
          aria-invalid={!!error || undefined}
          required={required}
          {...props}
        />
      </FieldWrapper>
    );
  },
);
Textarea.displayName = 'Textarea';

export interface SelectProps
  extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size'>, VariantProps<typeof inputSize> {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  options?: Array<{ value: string; label: string }>;
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      className,
      size,
      invalid,
      label,
      hint,
      error,
      options,
      placeholder,
      required,
      id,
      children,
      ...props
    },
    ref,
  ) => {
    const inputId = id || (typeof label === 'string' ? label : undefined);
    return (
      <FieldWrapper id={inputId} label={label} hint={hint} error={error} required={required}>
        <div className="relative">
          <select
            ref={ref}
            id={inputId}
            className={cn(
              inputSize({ size, invalid: !!error || invalid }),
              'appearance-none pr-9 cursor-pointer',
              className,
            )}
            aria-invalid={!!error || undefined}
            required={required}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options?.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
            {children}
          </select>
          <ChevronDown
            className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--ui-text-muted)] pointer-events-none"
            aria-hidden="true"
          />
        </div>
      </FieldWrapper>
    );
  },
);
Select.displayName = 'Select';

export interface CheckboxProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, hint, error, id, required, ...props }, ref) => {
    const inputId = id || (typeof label === 'string' ? label : undefined);
    return (
      <FieldWrapper id={inputId} label={undefined} hint={hint} error={error}>
        <label
          htmlFor={inputId}
          className="inline-flex items-center gap-2 cursor-pointer select-none"
        >
          <span className="relative inline-flex h-4 w-4 items-center justify-center">
            <input
              ref={ref}
              id={inputId}
              type="checkbox"
              className={cn(
                'peer h-4 w-4 appearance-none rounded-[var(--ui-radius-xs)] border border-[var(--ui-border-strong)] bg-[var(--ui-surface)]',
                'checked:bg-[var(--ui-color-teal-500)] checked:border-[var(--ui-color-teal-500)]',
                'focus-visible:outline-none focus-visible:shadow-[var(--ui-shadow-focus)]',
                'transition-colors',
                className,
              )}
              required={required}
              {...props}
            />
            <Check
              className="absolute h-3 w-3 text-white opacity-0 peer-checked:opacity-100 pointer-events-none"
              aria-hidden="true"
            />
          </span>
          {label && (
            <span className="text-[var(--ui-text-sm)] text-[var(--ui-text-primary)]">{label}</span>
          )}
        </label>
      </FieldWrapper>
    );
  },
);
Checkbox.displayName = 'Checkbox';
