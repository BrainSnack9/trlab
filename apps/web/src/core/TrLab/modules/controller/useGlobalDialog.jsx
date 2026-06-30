'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { Button } from '@/core/TrLab/Components/Desktop/Atoms/TrLab/Common/Button/Button';

const GlobalDialogContext = createContext(null);

export function GlobalDialogProvider({ children }) {
  const [dialog, setDialog] = useState(null);

  const closeDialog = useCallback(() => {
    setDialog(null);
  }, []);

  const openDialog = useCallback((config) => {
    setDialog({
      title: '',
      description: '',
      tone: 'default',
      confirmLabel: '확인',
      cancelLabel: '취소',
      showCancel: true,
      closeOnConfirm: true,
      ...config
    });
  }, []);

  const value = useMemo(() => ({ openDialog, closeDialog }), [openDialog, closeDialog]);

  return (
    <GlobalDialogContext.Provider value={value}>
      {children}
      <GlobalDialogRoot dialog={dialog} closeDialog={closeDialog} setDialog={setDialog} />
    </GlobalDialogContext.Provider>
  );
}

export default function useGlobalDialog() {
  const context = useContext(GlobalDialogContext);
  if (!context) throw new Error('useGlobalDialog must be used inside GlobalDialogProvider');
  return context;
}

function GlobalDialogRoot({ dialog, closeDialog, setDialog }) {
  useEffect(() => {
    if (!dialog) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') closeDialog();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [closeDialog, dialog]);

  if (!dialog) return null;

  const confirm = async () => {
    if (dialog.confirmDisabled) return;
    const result = await dialog.onConfirm?.();
    if (result === false) return;
    if (dialog.closeOnConfirm !== false) closeDialog();
  };

  const content = typeof dialog.renderContent === 'function'
    ? dialog.renderContent({ closeDialog, setDialog })
    : dialog.content;

  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/28 px-4 backdrop-blur-[2px]" role="presentation" onMouseDown={closeDialog}>
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="global-dialog-title"
        className="w-full max-w-md overflow-hidden rounded-lg border border-slate-200 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.22)]"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="flex items-start gap-3 border-b border-slate-100 px-5 py-4">
          {dialog.tone === 'danger' ? (
            <div className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-red-50 text-red-600">
              <AlertTriangle className="h-4 w-4" />
            </div>
          ) : null}
          <div className="min-w-0 flex-1">
            <h2 id="global-dialog-title" className="truncate text-base font-semibold text-slate-950">{dialog.title}</h2>
            {dialog.description ? <p className="mt-1 text-sm font-medium leading-5 text-slate-500">{dialog.description}</p> : null}
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-slate-400 hover:bg-slate-100 hover:text-slate-700" onClick={closeDialog} aria-label="닫기">
            <X className="h-4 w-4" />
          </Button>
        </header>

        {content ? <div className="px-5 py-4">{content}</div> : null}

        <footer className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50/70 px-5 py-3">
          {dialog.showCancel ? (
            <Button variant="ghost" onClick={closeDialog}>
              {dialog.cancelLabel}
            </Button>
          ) : null}
          <Button
            variant={dialog.tone === 'danger' ? 'destructive' : 'default'}
            onClick={confirm}
            disabled={dialog.confirmDisabled}
          >
            {dialog.confirmLabel}
          </Button>
        </footer>
      </section>
    </div>
  );
}
