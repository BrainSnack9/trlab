import { ArrowLeft } from 'lucide-react';
import { Button } from '@/core/TrLab/Components/Desktop/Atoms/TrLab/Common/Button/Button';
import { CardNewsMaker } from './CardNewsMaker';
import { InstatoonWorkflowBoard } from './components/InstatoonWorkflowBoard';

export function CardNewsView({ studio, work, assetLibrary, setView, contentPlans }) {
  const plan = studio?.id ? contentPlans[studio.id] : null;
  if (!studio) {
    const fallbackStudio = { label: 'Medical Decision', channelName: '@medical.decision' };
    return (
      <div className="space-y-5">
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <h1 className="text-xl font-semibold tracking-normal text-slate-950">제작 보드</h1>
              <p className="mt-2 text-sm font-medium leading-6 text-slate-500">레퍼런스와 스타일을 먼저 세팅합니다.</p>
            </div>
            <Button variant="outline" onClick={() => setView('planning')}><ArrowLeft className="h-4 w-4" />기획으로 이동</Button>
          </div>
        </section>
        <InstatoonWorkflowBoard studio={fallbackStudio} plan={{ cards: [], referenceStyle: 'handdrawn_research' }} styleKey="note" />
      </div>
    );
  }
  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <h1 className="text-xl font-semibold tracking-normal text-slate-950">제작 보드</h1>
            <p className="mt-2 text-sm font-medium leading-6 text-slate-500">레퍼런스와 카드 편집을 진행합니다.</p>
          </div>
          <Button variant="outline" onClick={() => setView('plan')}><ArrowLeft className="h-4 w-4" />콘텐츠 설계</Button>
        </div>
      </section>
      {plan ? (
        <CardNewsMaker studio={studio} plan={plan} work={work} assetLibrary={assetLibrary} />
      ) : (
        <InstatoonWorkflowBoard studio={studio} plan={{ cards: [], referenceStyle: 'handdrawn_research' }} styleKey="note" templateProduction={studio.contentSetup} />
      )}
    </div>
  );
}
