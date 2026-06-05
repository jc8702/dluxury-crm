import { forwardRef, useEffect, useRef } from 'react';
import type { HTMLAttributes, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../utils/cn';

const overlayVariants = cva('fixed inset-0 flex items-center justify-center p-4', {
  variants: {
    placement: {
      center: 'items-center justify-center',
      top: 'items-start justify-center pt-[10vh]',
      right: 'items-stretch justify-end',
    },
  },
  defaultVariants: { placement: 'center' },
});

const surfaceVariants = cva(
  cn(
    'relative bg-[var(--ui-surface)] border border-[var(--ui-border)]',
    'shadow-[var(--ui-shadow-3)] rounded-[var(--ui-radius-lg)]',
    'flex flex-col max-h-[90vh] overflow-hidden',
    'animate-[fadeIn_var(--ui-duration-base)_var(--ui-ease-out)]',
  ),
  {
    variants: {
      size: {
        sm: 'w-full max-w-sm',
        md: 'w-full max-w-md',
        lg: 'w-full max-w-lg',
        xl: 'w-full max-w-2xl',
        full: 'w-full max-w-[95vw] h-[90vh]',
      },
    },
    defaultVariants: { size: 'md' },
  },
);

export interface ModalProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'title'> {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  description?: ReactNode;
  size?: VariantProps<typeof surfaceVariants>['size'];
  placement?: VariantProps<typeof overlayVariants>['placement'];
  closeOnEscape?: boolean;
  closeOnOverlayClick?: boolean;
  hideCloseButton?: boolean;
  footer?: ReactNode;
  children: ReactNode;
}

export const Modal = forwardRef<HTMLDivElement, ModalProps>(
  (
    {
      open,
      onClose,
      title,
      description,
      size = 'md',
      placement = 'center',
      closeOnEscape = true,
      closeOnOverlayClick = true,
      hideCloseButton = false,
      footer,
      className,
      children,
      ...props
    },
    _ref,
  ) => {
    const surfaceRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      if (!open) return;
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prev;
      };
    }, [open]);

    useEffect(() => {
      if (!open || !closeOnEscape) return;
      const onKey = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
      };
      document.addEventListener('keydown', onKey);
      return () => document.removeEventListener('keydown', onKey);
    }, [open, closeOnEscape, onClose]);

    useEffect(() => {
      if (open && surfaceRef.current) {
        surfaceRef.current.focus();
      }
    }, [open]);

    if (!open) return null;
    if (typeof document === 'undefined') return null;

    return createPortal(
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'ui-modal-title' : undefined}
        className={cn(
          'fixed inset-0 z-[var(--ui-z-modal)]',
          'bg-[rgb(13_17_23_/_0.55)] backdrop-blur-[2px]',
        )}
        onClick={closeOnOverlayClick ? onClose : undefined}
      >
        <div className={cn(overlayVariants({ placement }))} aria-hidden="true">
          <div
            ref={surfaceRef}
            tabIndex={-1}
            className={cn(surfaceVariants({ size }), className)}
            onClick={(e) => e.stopPropagation()}
            {...props}
          >
            {(title || !hideCloseButton) && (
              <header
                className={cn(
                  'flex items-start justify-between gap-3 px-4 py-3',
                  'border-b border-[var(--ui-border)]',
                )}
              >
                <div className="min-w-0">
                  {title && (
                    <h2
                      id="ui-modal-title"
                      className="text-[var(--ui-text-lg)] font-semibold text-[var(--ui-text-primary)] tracking-tight"
                    >
                      {title}
                    </h2>
                  )}
                  {description && (
                    <p className="mt-0.5 text-[var(--ui-text-sm)] text-[var(--ui-text-secondary)]">
                      {description}
                    </p>
                  )}
                </div>
                {!hideCloseButton && (
                  <button
                    type="button"
                    onClick={onClose}
                    aria-label="Fechar"
                    className={cn(
                      'h-8 w-8 rounded-[var(--ui-radius-sm)] flex items-center justify-center',
                      'text-[var(--ui-text-secondary)] hover:text-[var(--ui-text-primary)]',
                      'hover:bg-[var(--ui-surface-hover)] transition-colors',
                    )}
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </header>
            )}

            <div className="flex-1 overflow-y-auto ui-scroll px-4 py-4">{children}</div>

            {footer && (
              <footer
                className={cn(
                  'flex items-center justify-end gap-2 px-4 py-3',
                  'border-t border-[var(--ui-border)] bg-[var(--ui-bg-subtle)]',
                )}
              >
                {footer}
              </footer>
            )}
          </div>
        </div>
      </div>,
      document.body,
    );
  },
);
Modal.displayName = 'Modal';

export interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: ReactNode;
  description?: ReactNode;
  confirmText?: ReactNode;
  cancelText?: ReactNode;
  tone?: 'default' | 'danger';
  isLoading?: boolean;
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  tone = 'default',
  isLoading = false,
}: ConfirmDialogProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      size="sm"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className={cn(
              'h-9 px-3 rounded-[var(--ui-radius-md)] text-[var(--ui-text-sm)] capitalize',
              'text-[var(--ui-text-secondary)] hover:bg-[var(--ui-surface-hover)]',
              'hover:text-[var(--ui-text-primary)]',
            )}
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={cn(
              'h-9 px-4 rounded-[var(--ui-radius-md)] text-[var(--ui-text-sm)] font-medium capitalize',
              tone === 'danger'
                ? 'bg-[var(--ui-action-danger)] text-[var(--ui-action-danger-fg)] hover:bg-[var(--ui-action-danger-hover)]'
                : 'bg-[var(--ui-action-primary)] text-[var(--ui-action-primary-fg)] hover:bg-[var(--ui-action-primary-hover)]',
              'disabled:opacity-50',
            )}
          >
            {isLoading ? 'Aguarde...' : confirmText}
          </button>
        </>
      }
    >
      <div />
    </Modal>
  );
}
