import React, { useState } from 'react';
import { ConfirmDialog } from '../design-system/components/ConfirmDialog';

export const useConfirm = () => {
  const [promise, setPromise] = useState<{ resolve: (value: boolean) => void } | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [config, setConfig] = useState({
    title: 'Confirmação',
    description: 'Tem certeza que deseja continuar?',
    confirmLabel: 'Confirmar',
    cancelLabel: 'Cancelar',
    variant: 'danger' as 'danger' | 'warning' | 'primary'
  });

  const confirm = (options: {
    title?: string;
    description?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: 'danger' | 'warning' | 'primary'
  }) => {
    setConfig(prev => ({ ...prev, ...options }));
    setIsOpen(true);
    return new Promise<boolean>((resolve) => {
      setPromise({ resolve });
    });
  };

  const handleClose = () => {
    setIsOpen(false);
    promise?.resolve(false);
  };

  const handleConfirm = () => {
    setIsOpen(false);
    promise?.resolve(true);
  };

  const ConfirmationDialog = () => (
    <ConfirmDialog
      isOpen={isOpen}
      onClose={handleClose}
      onConfirm={handleConfirm}
      {...config}
    />
  );

  return [ConfirmationDialog, confirm] as const;
};
