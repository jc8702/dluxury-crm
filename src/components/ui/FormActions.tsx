import type { CSSProperties, ReactNode } from 'react';
import { Button } from './Button';
import { cn } from '../../utils/cn';

/**
 * Rodapé padrão de formulários (página dedicada ou modal).
 *
 * Padrão consolidado (item B da auditoria — Layout de Formulários):
 * - ações alinhadas à direita, separadas por `border-t`;
 * - Cancelar sempre `variant="outline"` e `type="button"`;
 * - Salvar sempre `type="submit"` + `isLoading` (não `disabled` manual);
 * - ações secundárias (ex.: Excluir) vão em `left`.
 */
export interface FormActionsProps {
  /** Ações à esquerda (ex.: Excluir, Voltar). */
  left?: ReactNode;
  onCancel?: () => void;
  cancelLabel?: string;
  /** Rótulo do botão de submit padrão. Use `children` para um botão custom. */
  submitLabel?: string;
  /**
   * Callback de submit para fluxos fora de `<form>` (modais com `onClick`).
   * Quando presente o botão vira `type="button"`; caso contrário, `type="submit"`.
   */
  onSubmit?: () => void;
  loading?: boolean;
  disabled?: boolean;
  /** Substitui o botão de submit padrão (ícone, testid, etc.). */
  children?: ReactNode;
  cancelTestId?: string;
  submitTestId?: string;
  className?: string;
  style?: CSSProperties;
}

export function FormActions({
  left,
  onCancel,
  cancelLabel = 'Cancelar',
  submitLabel,
  onSubmit,
  loading = false,
  disabled = false,
  children,
  cancelTestId,
  submitTestId,
  className,
  style,
}: FormActionsProps) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-end gap-3 mt-6 pt-6 border-t border-[var(--ui-border)]',
        className,
      )}
      style={style}
    >
      {left && <div className="mr-auto flex items-center gap-3">{left}</div>}
      {onCancel && (
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={loading}
          data-testid={cancelTestId}
        >
          {cancelLabel}
        </Button>
      )}
      {children ??
        (submitLabel ? (
          <Button
            type={onSubmit ? 'button' : 'submit'}
            variant="primary"
            onClick={onSubmit}
            isLoading={loading}
            disabled={disabled}
            data-testid={submitTestId}
          >
            {submitLabel}
          </Button>
        ) : null)}
    </div>
  );
}

export default FormActions;
