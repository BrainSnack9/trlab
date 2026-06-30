import { Copy } from 'lucide-react';
import { Button } from '@/core/TrLab/Components/Desktop/Atoms/TrLab/Common/Button/Button';

export function PublishCopyPanel({ plan, actions }) {
  const copy = actions.makePostCopy();
  if (!copy) return null;
  return (
    <div className="rounded-lg border bg-white p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <strong className="text-sm">게시 원고</strong>
        <Button size="sm" variant="outline" onClick={actions.copyPost}>
          <Copy className="h-3.5 w-3.5" />
          복사
        </Button>
      </div>
      {plan.captionFirstLine ? <strong className="block text-sm leading-5">{plan.captionFirstLine}</strong> : null}
      {plan.captionBody ? <p className="mt-2 whitespace-pre-line text-xs font-semibold leading-5 text-slate-600">{plan.captionBody}</p> : null}
      {plan.captionCTA ? <p className="mt-2 rounded-md bg-slate-50 p-2 text-xs font-semibold leading-5 text-slate-600">{plan.captionCTA}</p> : null}
      {Array.isArray(plan.hashtags) && plan.hashtags.length ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {plan.hashtags.map((tag) => <span key={tag} className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600">{tag}</span>)}
        </div>
      ) : null}
    </div>
  );
}
