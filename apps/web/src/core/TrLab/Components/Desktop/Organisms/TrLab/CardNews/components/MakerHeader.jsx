import { cardNewsMakerViewHelpers } from '../lib/card-news-maker-view.helpers';
import { MakerStat } from './MakerStat';

export function MakerHeader({ studio, plan, cards, selected }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-end">
        <div className="min-w-0">
          <div className="text-xs font-medium uppercase tracking-[0.12em] text-slate-400">Production Desk</div>
          <h2 className="mt-2 break-keep text-xl font-semibold leading-tight tracking-normal text-slate-950 [overflow-wrap:anywhere]">{plan.selectedHookTitle || plan.coreAngle || studio.label}</h2>
          <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-slate-500">{plan.summary || plan.coreAngle}</p>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <MakerStat label="현재 카드" value={`${selected + 1}/${cards.length}`} />
          <MakerStat label="채널" value={studio.channelName || '@trlab'} />
          <MakerStat label="템플릿" value={plan.referenceStyle ? cardNewsMakerViewHelpers.referenceLabel(plan.referenceStyle) : '자동'} />
        </div>
      </div>
    </section>
  );
}
