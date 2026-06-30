'use client';

import { Copy, Download, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/core/TrLab/Components/Desktop/Atoms/TrLab/Common/Button/Button';
import useTrLabWorkspace from '@/core/TrLab/modules/controller/useTrLabWorkspace';
import useWorkDialogs from '@/core/TrLab/modules/controller/useWorkDialogs';

export default function WorkCommandBar() {
  const { currentWork } = useTrLabWorkspace();
  const { renameWorkWithDialog, duplicateWorkWithDialog, deleteWorkWithDialog } = useWorkDialogs();

  if (!currentWork) return null;

  const renameWork = () => {
    renameWorkWithDialog(currentWork);
  };

  const copyWork = () => {
    duplicateWorkWithDialog(currentWork);
  };

  const removeWork = () => {
    deleteWorkWithDialog(currentWork);
  };

  return (
    <div className="shrink-0 border-b border-slate-200 bg-white">
      <div className="mx-auto flex h-16 w-full max-w-[1480px] items-center gap-3 px-4 md:px-6 lg:px-8">
        <div className="min-w-0 flex-1">
          <div className="truncate px-2 text-sm font-medium text-slate-900" title={currentWork.title}>{currentWork.title}</div>
        </div>
        <div className="ml-auto flex shrink-0 items-center justify-end gap-1.5">
          <Button variant="ghost" size="icon" className={actionButtonClass} onClick={renameWork} title="수정" aria-label="수정">
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className={actionButtonClass} onClick={() => exportWork(currentWork)} title="Export" aria-label="Export">
            <Download className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className={actionButtonClass} onClick={copyWork} title="복제" aria-label="복제">
            <Copy className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className={`${actionButtonClass} text-red-500 hover:bg-red-50 hover:text-red-600`} onClick={removeWork} title="삭제" aria-label="삭제">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

const actionButtonClass = 'h-8 w-8 rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-950';

function exportWork(work) {
  const blob = new Blob([JSON.stringify(work, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${safeFilename(work.title)}.trlab.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function safeFilename(value) {
  return `${value || 'trlab-work'}`.replace(/[\\/:*?"<>|]/g, '-').slice(0, 80);
}
