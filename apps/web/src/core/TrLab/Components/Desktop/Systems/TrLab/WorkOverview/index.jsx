'use client';

import { ArrowRight, CheckCircle2, Circle, FileJson2, Image, Info, LayoutTemplate, ListChecks } from 'lucide-react';
import { Button } from '@/core/TrLab/Components/Desktop/Atoms/TrLab/Common/Button/Button';
import useTrLabWorkspace from '@/core/TrLab/modules/controller/useTrLabWorkspace';
import useWorkDialogs from '@/core/TrLab/modules/controller/useWorkDialogs';

const steps = [
  ['metadata', '정보', '작업 목적과 대상을 정리합니다.', Info],
  ['planning', '기획', '주제와 독자에 맞춰 상세 기획서를 만듭니다.', ListChecks],
  ['templates', '템플릿', '상세 기획서에 맞는 구조를 선택합니다.', LayoutTemplate],
  ['plan', '설계', '카드별 문장과 흐름을 확정합니다.', FileJson2],
  ['cardnews', '제작', '이미지와 최종 결과물을 편집합니다.', Image]
];

export default function WorkOverview() {
  const { currentWork, setView } = useTrLabWorkspace();
  const { createWorkWithDialog } = useWorkDialogs();

  if (!currentWork) {
    return (
      <div className="mx-auto grid min-h-[420px] max-w-2xl place-items-center rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center">
        <div>
          <h1 className="text-xl font-semibold text-slate-950">작업물을 먼저 만들어 주세요</h1>
          <p className="mt-2 text-sm font-medium leading-6 text-slate-500">작업물 개요는 파일을 연 뒤 볼 수 있습니다.</p>
          <Button className="mt-5" onClick={() => createWorkWithDialog({ initialTitle: '새 카드뉴스 작업물' })}>새 작업물 만들기</Button>
        </div>
      </div>
    );
  }

  const nextStep = getNextStep(currentWork);
  const completion = steps.filter(([stage]) => isStepDone(currentWork, stage)).length;
  const draftCount = workDraftCount(currentWork);

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <div className="text-xs font-medium uppercase tracking-[0.12em] text-slate-400">작업물 개요</div>
            <h1 className="mt-2 truncate text-2xl font-semibold tracking-normal text-slate-950">{currentWork.title}</h1>
            <p className="mt-2 text-sm font-medium text-slate-500">{completion}/{steps.length} 단계 완료</p>
            {draftCount ? <p className="mt-2 text-sm font-semibold text-indigo-600">기획 초안 {draftCount}개 저장됨</p> : null}
          </div>
          <Button onClick={() => setView(nextStep.stage)}>
            {nextStep.cta}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-5">
        {steps.map(([stage, title, description, Icon]) => {
          const done = isStepDone(currentWork, stage);
          const active = nextStep.stage === stage;
          return (
            <button key={stage} type="button" className={stepClass(active)} onClick={() => setView(stage)}>
              <div className="flex items-center justify-between gap-3">
                <div className="grid h-9 w-9 place-items-center rounded-md bg-slate-100 text-slate-500">
                  <Icon className="h-4 w-4" />
                </div>
                {done ? <CheckCircle2 className="h-4 w-4 text-indigo-600" /> : <Circle className="h-4 w-4 text-slate-300" />}
              </div>
              <div className="mt-4 text-sm font-semibold text-slate-950">{title}</div>
              <p className="mt-1 min-h-10 text-xs font-medium leading-5 text-slate-500">{description}</p>
            </button>
          );
        })}
      </section>
    </div>
  );
}

function stepClass(active) {
  return [
    'rounded-lg border bg-white p-4 text-left shadow-sm transition hover:border-slate-300 hover:shadow-md',
    active ? 'border-indigo-200 ring-2 ring-indigo-100' : 'border-slate-200'
  ].join(' ');
}

function getNextStep(work) {
  if (!isStepDone(work, 'metadata')) return { stage: 'metadata', cta: '정보 입력' };
  if (!isStepDone(work, 'planning')) return { stage: 'planning', cta: '상세 기획하기' };
  if (!isStepDone(work, 'templates')) return { stage: 'templates', cta: '템플릿 추천' };
  if (!isStepDone(work, 'plan')) return { stage: 'plan', cta: '설계 확인' };
  return { stage: 'cardnews', cta: '제작하기' };
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
