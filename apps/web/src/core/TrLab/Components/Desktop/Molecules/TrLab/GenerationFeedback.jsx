'use client';

import { useEffect, useState } from 'react';
import { Loader2, X } from 'lucide-react';
import { Button } from '@/core/TrLab/Components/Desktop/Atoms/TrLab/Common/Button/Button';

const DEFAULT_STEPS = [
  '입력 내용을 정리하고 있어요',
  '제목 후보와 시나리오를 만들고 있어요',
  '카드별 대본과 제작 지시를 구성하고 있어요',
  '결과 화면으로 넘길 준비를 하고 있어요'
];

export function GenerationOverlay({ open, title = 'AI가 생성 중입니다', description = '잠시만 기다려 주세요.', steps = DEFAULT_STEPS }) {
  const [activeStep, setActiveStep] = useState(0);
  const visibleSteps = steps.length ? steps : DEFAULT_STEPS;

  useEffect(() => {
    if (!open) {
      setActiveStep(0);
      return undefined;
    }
    const timer = window.setInterval(() => {
      setActiveStep((current) => Math.min(current + 1, visibleSteps.length - 1));
    }, 1800);
    return () => window.clearInterval(timer);
  }, [open, visibleSteps.length]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-950/55 px-4 backdrop-blur-sm" role="status" aria-live="polite">
      <div className="w-full max-w-md rounded-xl border border-white/20 bg-white p-5 shadow-2xl">
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-indigo-50 text-indigo-600">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-black tracking-normal text-slate-950">{title}</h2>
            <p className="mt-1 text-sm font-semibold leading-6 text-slate-500">{description}</p>
          </div>
        </div>
        <div className="mt-5 grid gap-2">
          {visibleSteps.map((step, index) => {
            const done = index < activeStep;
            const active = index === activeStep;
            return (
              <div
                key={`${index}-${step}`}
                className={[
                  'flex items-center gap-3 rounded-lg border px-3 py-2 text-sm font-bold transition',
                  active ? 'border-indigo-200 bg-indigo-50 text-indigo-800' : 'border-slate-100 bg-slate-50 text-slate-500',
                  done ? 'text-emerald-700' : ''
                ].join(' ')}
              >
                <span className={[
                  'grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-black',
                  done ? 'bg-emerald-100 text-emerald-700' : active ? 'bg-indigo-600 text-white' : 'bg-white text-slate-400'
                ].join(' ')}>
                  {done ? '✓' : index + 1}
                </span>
                <span>{step}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function NoticeToast({ message, title = '알림', tone = 'error', onClose }) {
  if (!message) return null;
  const isError = tone === 'error';
  return (
    <div className="fixed right-4 top-4 z-[90] w-[min(420px,calc(100vw-32px))] rounded-xl border bg-white p-4 shadow-2xl" role="alert">
      <div className="flex items-start gap-3">
        <div className={['mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full', isError ? 'bg-red-500' : 'bg-indigo-500'].join(' ')} />
        <div className="min-w-0 flex-1">
          <strong className={['block text-sm font-black', isError ? 'text-red-700' : 'text-slate-900'].join(' ')}>{title}</strong>
          <p className="mt-1 break-words text-sm font-semibold leading-6 text-slate-600">{message}</p>
        </div>
        {onClose ? (
          <Button size="sm" variant="outline" className="h-8 w-8 shrink-0 p-0" onClick={onClose} aria-label="알림 닫기">
            <X className="h-4 w-4" />
          </Button>
        ) : null}
      </div>
    </div>
  );
}
