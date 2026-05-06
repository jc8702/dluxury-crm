import React from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { AlertTriangle } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'primary';
  isLoading?: boolean;
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  variant = 'danger',
  isLoading = false,
}: ConfirmDialogProps) {
  const iconColor = 
    variant === 'danger' ? 'text-destructive' : 
    variant === 'warning' ? 'text-warning' : 
    'text-primary';

  const iconBg = 
    variant === 'danger' ? 'bg-destructive/10' : 
    variant === 'warning' ? 'bg-warning/10' : 
    'bg-primary/10';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Confirmação" size="sm">
      <div className="flex flex-col items-center text-center p-4">
        <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-6 ${iconBg}`}>
          <AlertTriangle className={`w-8 h-8 ${iconColor}`} />
        </div>
        <h3 className="text-xl font-bold text-foreground mb-3">{title}</h3>
        <p className="text-muted-foreground mb-8">{description}</p>
        
        <div className="flex w-full gap-3">
          <Button variant="outline" className="flex-1" onClick={onClose} disabled={isLoading}>
            {cancelLabel}
          </Button>
          <Button variant={variant === 'primary' ? 'primary' : 'danger'} className="flex-1" onClick={onConfirm} isLoading={isLoading}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
