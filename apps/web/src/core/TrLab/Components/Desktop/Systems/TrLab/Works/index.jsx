'use client';

import { Copy, Download, FolderOpen, ImageOff, Pencil, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/core/TrLab/Components/Desktop/Atoms/TrLab/Common/Button/Button';
import useTrLabWorkspace from '@/core/TrLab/modules/controller/useTrLabWorkspace';
import useWorkDialogs from '@/core/TrLab/modules/controller/useWorkDialogs';

const progressSteps = [
  ['metadata', '정보'],
  ['planning', '기획'],
  ['templates', '템플릿'],
  ['plan', '설계'],
  ['cardnews', '제작']
];

export default function Works() {
  const { works, currentWork, openWork } = useTrLabWorkspace();
  const { createWorkWithDialog, renameWorkWithDialog, duplicateWorkWithDialog, deleteWorkWithDialog } = useWorkDialogs();
  const sortedWorks = [...(works ?? [])].sort((a, b) => `${b.updatedAt}`.localeCompare(`${a.updatedAt}`));

  const createBlankWork = () => {
    createWorkWithDialog({ initialTitle: `카드뉴스 작업물 ${sortedWorks.length + 1}` });
  };

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div className="flex h-10 items-center justify-between gap-3">
        <h1 className="text-xl font-semibold tracking-normal text-slate-950">작업물 목록</h1>
        <Button onClick={createBlankWork} title="새 작업물">
          <Plus className="h-4 w-4" />
          새 작업물
        </Button>
      </div>

      {sortedWorks.length ? (
        <section className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {sortedWorks.map((work) => (
            <WorkCard
              key={work.id}
              work={work}
              active={currentWork?.id === work.id}
              onOpen={() => openWork(work.id)}
              onRename={() => renameWorkWithDialog(work)}
              onExport={() => exportWork(work)}
              onDuplicate={() => duplicateWorkWithDialog(work)}
              onDelete={() => deleteWorkWithDialog(work)}
            />
          ))}
        </section>
      ) : (
        <section className="grid min-h-[360px] place-items-center rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center">
          <div>
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-lg bg-slate-100 text-slate-500">
              <FolderOpen className="h-5 w-5" />
            </div>
            <h2 className="mt-4 text-lg font-semibold text-slate-950">아직 작업물이 없습니다</h2>
            <p className="mt-2 text-sm font-semibold text-slate-500">새 작업물을 만들고 작업물 정보부터 정리하세요.</p>
            <Button className="mt-5" onClick={createBlankWork}>
              <Plus className="h-4 w-4" />
              새 작업물
            </Button>
          </div>
        </section>
      )}
    </div>
  );
}

function WorkCard({ work, active, onOpen, onRename, onExport, onDuplicate, onDelete }) {
  const previewUrl = getWorkPreviewImage(work);
  const completed = progressSteps.filter(([stage]) => isStepDone(work, stage)).length;
  const nextStep = progressSteps.find(([stage]) => !isStepDone(work, stage))?.[1] ?? '완료';
  const progress = Math.round((completed / progressSteps.length) * 100);
  const draftCount = workDraftCount(work);

  return (
    <article className={workCardClass(active)}>
      <button type="button" className="block w-full text-left outline-none" onClick={onOpen}>
        <div className="relative aspect-square overflow-hidden rounded-lg bg-slate-100">
          {previewUrl ? (
            <img src={previewUrl} alt="" className="h-full w-full object-cover transition duration-200 group-hover:scale-[1.015]" />
          ) : (
            <div className="grid h-full w-full place-items-center bg-[linear-gradient(135deg,#f8fafc_0%,#f1f5f9_100%)] text-slate-300">
              <ImageOff className="h-7 w-7" aria-hidden="true" />
            </div>
          )}
          <span className="absolute left-2 top-2 rounded-full bg-white/90 px-2 py-1 text-[11px] font-medium text-slate-600 shadow-sm ring-1 ring-slate-200/80">{completed}/{progressSteps.length}</span>
        </div>
      </button>

      <div className="mt-3 flex min-w-0 items-start justify-between gap-2">
        <button type="button" className="min-w-0 flex-1 text-left outline-none" onClick={onOpen}>
          <h2 className="truncate text-sm font-semibold leading-5 text-slate-950">{work.title}</h2>
          <p className="mt-1 truncate text-[11px] font-medium text-slate-500">{new Date(work.updatedAt).toLocaleDateString('ko-KR')}</p>
          {draftCount ? <p className="mt-1 text-[11px] font-semibold text-indigo-600">기획 초안 {draftCount}개</p> : null}
        </button>
        <div className="flex shrink-0 items-center gap-1">
          <IconButton label="수정" onClick={onRename}>
            <Pencil className="h-4 w-4" />
          </IconButton>
          <IconButton label="Export" onClick={onExport}>
            <Download className="h-4 w-4" />
          </IconButton>
          <IconButton label="복제" onClick={onDuplicate}>
            <Copy className="h-4 w-4" />
          </IconButton>
          <IconButton label="삭제" tone="danger" onClick={onDelete}>
            <Trash2 className="h-4 w-4" />
          </IconButton>
        </div>
      </div>

      <div className="mt-3">
        <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-indigo-500 transition-all" style={{ width: `${progress}%` }} />
        </div>
        <div className="mt-2 flex items-center justify-between text-[11px] font-medium text-slate-500">
          <span>{nextStep === '완료' ? '완료' : `다음: ${nextStep}`}</span>
          <span>{progress}%</span>
        </div>
      </div>
    </article>
  );
}

function workCardClass(active) {
  return [
    'group rounded-lg bg-white p-2.5 transition-all duration-200',
    active ? 'shadow-[0_12px_28px_rgba(99,102,241,0.14)] ring-2 ring-indigo-100' : 'hover:-translate-y-0.5 hover:shadow-[0_14px_30px_rgba(15,23,42,0.10)]'
  ].join(' ');
}

function IconButton({ label, tone = 'default', onClick, children }) {
  return (
    <Button
      variant="ghost"
      size="icon"
      className={tone === 'danger' ? 'h-8 w-8 text-slate-400 hover:bg-red-50 hover:text-red-600' : 'h-8 w-8 text-slate-400 hover:bg-slate-100 hover:text-slate-700'}
      title={label}
      aria-label={label}
      onClick={onClick}
    >
      {children}
    </Button>
  );
}

function isStepDone(work, stage) {
  if (stage === 'metadata') return hasMetadata(work);
  if (stage === 'templates') return Boolean(work?.equippedItems?.template);
  if (stage === 'planning') return Boolean(work?.equippedItems?.planning || work?.planningDraft || workDraftCount(work));
  if (stage === 'plan') return Boolean(work?.contentPlan);
  if (stage === 'cardnews') return Boolean(work?.output?.cardnews);
  return false;
}

function workDraftCount(work) {
  return Array.isArray(work?.drafts?.planning) ? work.drafts.planning.length : 0;
}

function hasMetadata(work) {
  const metadata = work?.metadata ?? {};
  return Boolean(work?.title?.trim()) && Boolean(metadata.goal || metadata.audienceNote || metadata.notes);
}

function getWorkPreviewImage(work) {
  const cardnews = work?.output?.cardnews;
  const outputCards = work?.output?.cards;
  const assetImages = work?.assets?.images;
  const candidates = [
    cardnews?.previewUrl,
    cardnews?.coverUrl,
    cardnews?.imageUrl,
    Array.isArray(cardnews) ? cardnews[0]?.url || cardnews[0]?.imageUrl || cardnews[0]?.src : '',
    Array.isArray(outputCards) ? outputCards[0]?.url || outputCards[0]?.imageUrl || outputCards[0]?.src : '',
    Array.isArray(assetImages) ? assetImages[0]?.url || assetImages[0]?.imageUrl || assetImages[0]?.src : ''
  ];

  return candidates.find((value) => typeof value === 'string' && value.trim()) ?? '';
}

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
