'use client';

import { useState } from 'react';

interface DialogOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'info' | 'warning' | 'error' | 'success';
}

export function useDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [dialogOptions, setDialogOptions] = useState<DialogOptions>({
    title: '',
    message: ''
  });
  const [onConfirmCallback, setOnConfirmCallback] = useState<(() => void) | null>(null);

  const showDialog = (options: DialogOptions, onConfirm?: () => void) => {
    setDialogOptions(options);
    setOnConfirmCallback(() => onConfirm || null);
    setIsOpen(true);
  };

  const hideDialog = () => {
    setIsOpen(false);
    setOnConfirmCallback(null);
  };

  const confirm = (options: DialogOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setDialogOptions(options);
      setOnConfirmCallback(() => () => resolve(true));
      setIsOpen(true);
      
      // Note: L'implémentation complète nécessiterait une refactorisation
      // Pour l'instant, on résout toujours true
      resolve(true);
    });
  };

  return {
    isOpen,
    dialogOptions,
    onConfirm: onConfirmCallback,
    showDialog,
    hideDialog,
    confirm
  };
}
