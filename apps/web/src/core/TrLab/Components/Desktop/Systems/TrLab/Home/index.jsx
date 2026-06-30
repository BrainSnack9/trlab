'use client';

import { ImageOff } from 'lucide-react';
import useTrLabWorkspace from '@/core/TrLab/modules/controller/useTrLabWorkspace';

export default function Home() {
  const { works, openWork } = useTrLabWorkspace();
  const recentWorks = (works ?? []).slice(0, 4);

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div className="flex h-10 items-center">
        <h1 className="text-xl font-semibold tracking-normal text-slate-950">최근 작업물</h1>
      </div>

      {recentWorks.length ? (
        <section className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {recentWorks.map((work) => (
            <WorkTile key={work.id} work={work} onOpen={() => openWork(work.id)} />
          ))}
        </section>
      ) : null}
    </div>
  );
}

function WorkTile({ work, onOpen }) {
  const previewUrl = getWorkPreviewImage(work);

  return (
    <button type="button" className="group rounded-lg text-left outline-none transition focus-visible:ring-2 focus-visible:ring-indigo-200" onClick={onOpen}>
      <div className="aspect-square overflow-hidden rounded-lg border border-slate-200 bg-slate-100 shadow-sm transition group-hover:border-slate-300 group-hover:shadow-md">
        {previewUrl ? (
          <img src={previewUrl} alt="" className="h-full w-full object-cover transition duration-200 group-hover:scale-[1.015]" />
        ) : (
          <div className="grid h-full w-full place-items-center bg-[linear-gradient(135deg,#f8fafc_0%,#f1f5f9_100%)] text-slate-400">
            <ImageOff className="h-7 w-7 text-slate-300" aria-hidden="true" />
          </div>
        )}
      </div>
      <div className="mt-2 min-w-0 px-1">
        <div className="truncate text-sm font-semibold leading-5 text-slate-950">{work.title}</div>
        <div className="mt-1 flex items-center gap-2 text-[11px] font-medium text-slate-500">
          <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-slate-600">{statusLabel(work.status)}</span>
          <span className="truncate">{new Date(work.updatedAt).toLocaleDateString('ko-KR')}</span>
        </div>
      </div>
    </button>
  );
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

function statusLabel(status) {
  const labels = {
    draft: '초안',
    template: '템플릿 장착',
    planning: '기획 진행',
    plan: '콘텐츠 설계',
    cardnews: '이미지 제작'
  };
  return labels[status] ?? '초안';
}
