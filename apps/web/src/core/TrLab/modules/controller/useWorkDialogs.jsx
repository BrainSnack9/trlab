'use client';

import useGlobalDialog from '@/core/TrLab/modules/controller/useGlobalDialog';
import useTrLabWorkspace from '@/core/TrLab/modules/controller/useTrLabWorkspace';

export default function useWorkDialogs() {
  const { openDialog } = useGlobalDialog();
  const { works, currentWork, createWork, updateCurrentWork, duplicateWork, deleteWork, setWorks } = useTrLabWorkspace();

  const createWorkWithDialog = ({ initialTitle, stage = 'metadata', workInput = {} } = {}) => {
    openWorkNameDialog({
      openDialog,
      title: '새 작업물 만들기',
      description: '작업물 이름을 입력하면 정보 설정 단계로 이동합니다.',
      initialValue: initialTitle ?? `카드뉴스 작업물 ${(works?.length ?? 0) + 1}`,
      confirmLabel: '생성',
      onConfirm: (name) => createWork({ ...workInput, title: name, stage })
    });
  };

  const renameWorkWithDialog = (work = currentWork, options = {}) => {
    if (!work) return;
    openWorkNameDialog({
      openDialog,
      title: '작업물 이름 수정',
      description: '목록과 상세 화면에 표시될 이름입니다.',
      initialValue: work.title,
      confirmLabel: '수정',
      onConfirm: (name) => {
        if (currentWork?.id === work.id) updateCurrentWork({ title: name });
        setWorks((items = []) => items.map((item) => item.id === work.id ? { ...item, title: name, updatedAt: new Date().toISOString() } : item));
        options.afterRename?.(name);
      }
    });
  };

  const duplicateWorkWithDialog = (work = currentWork) => {
    if (!work) return;
    openWorkNameDialog({
      openDialog,
      title: '작업물 복제',
      description: '복제본의 이름을 입력하세요.',
      initialValue: `${work.title} 복사본`,
      confirmLabel: '복제',
      onConfirm: (name) => {
        const copied = duplicateWork(work.id);
        if (copied) {
          setWorks((items = []) => items.map((item) => item.id === copied.id ? { ...item, title: name, updatedAt: new Date().toISOString() } : item));
        }
      }
    });
  };

  const deleteWorkWithDialog = (work = currentWork) => {
    if (!work) return;
    openDialog({
      title: '작업물 삭제',
      description: `"${work.title}" 작업물은 삭제 후 되돌릴 수 없습니다.`,
      tone: 'danger',
      confirmLabel: '삭제',
      cancelLabel: '취소',
      content: (
        <div className="rounded-md border border-red-100 bg-red-50 px-3 py-2 text-sm font-medium leading-6 text-red-700">
          작업물에 저장된 정보, 템플릿, 기획, 제작 결과가 함께 삭제됩니다.
        </div>
      ),
      onConfirm: () => deleteWork(work.id)
    });
  };

  return {
    createWorkWithDialog,
    renameWorkWithDialog,
    duplicateWorkWithDialog,
    deleteWorkWithDialog
  };
}

function openWorkNameDialog({ openDialog, title, description, initialValue, confirmLabel, onConfirm }) {
  let inputElement = null;
  openDialog({
    title,
    description,
    confirmLabel,
    cancelLabel: '취소',
    content: (
      <label className="grid gap-2 text-sm font-medium text-slate-700">
        작업물 이름
        <input
          id="work-dialog-name"
          name="workDialogName"
          ref={(node) => {
            inputElement = node;
            if (node) {
              requestAnimationFrame(() => {
                node.focus();
                node.select();
              });
            }
          }}
          className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-950 outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
          defaultValue={initialValue}
          placeholder="작업물 이름"
        />
      </label>
    ),
    onConfirm: () => {
      const name = inputElement?.value.trim() ?? '';
      if (!name) {
        inputElement?.focus();
        return false;
      }
      onConfirm(name);
      return true;
    }
  });
}
