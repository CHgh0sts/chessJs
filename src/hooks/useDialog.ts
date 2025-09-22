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
      
      // Résoudre avec false si l'utilisateur ferme sans confirmer
      const handleClose = () => {
        setIsOpen(false);
        resolve(false);
      };
      
      // Remplacer temporairement hideDialog
      const originalHideDialog = hideDialog;
      const tempHideDialog = () => {
        originalHideDialog();
        resolve(false);
      };
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
