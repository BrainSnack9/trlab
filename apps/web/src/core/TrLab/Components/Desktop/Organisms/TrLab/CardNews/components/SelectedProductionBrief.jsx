import { ClipboardList, Copy, Search } from 'lucide-react';
import { Button } from '@/core/TrLab/Components/Desktop/Atoms/TrLab/Common/Button/Button';

export function SelectedProductionBrief({ card, actions }) {
  const brief = card.visualBrief ?? {};
  const candidates = Array.isArray(brief.productCandidates) ? brief.productCandidates.filter((item) => item?.name).slice(0, 4) : [];
  if (!brief.scenario && !brief.pexelsQuery && !brief.backgroundPrompt && !candidates.length) return null;
  const copyText = [
    `카드 ${card.page} 제작 지시`,
    `제목: ${card.title ?? ''}`,
    `장면: ${brief.scenario ?? ''}`,
    `Pexels: ${brief.pexelsQuery ?? ''}`,
    `프롬프트: ${brief.backgroundPrompt ?? ''}`,
    candidates.length ? `제품 후보:\n${candidates.map((item) => `- ${item.name}${item.role ? `: ${item.role}` : ''}`).join('\n')}` : ''
  ].filter(Boolean).join('\n');
  return (
    <div className="rounded-lg border bg-white p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-semibold"><ClipboardList className="h-4 w-4 text-slate-500" />선택 카드 제작 지시</div>
        <Button size="sm" variant="outline" onClick={() => actions.copyText(copyText)}>
          <Copy className="h-3.5 w-3.5" />
        </Button>
      </div>
      {brief.scenario ? <p className="rounded-md bg-slate-50 p-2 text-xs font-bold leading-5 text-slate-700">{brief.scenario}</p> : null}
      {brief.pexelsQuery ? (
        <div className="mt-2 flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs font-semibold text-slate-600">
          <Search className="h-3.5 w-3.5" />
          <span className="min-w-0 flex-1 break-words">{brief.pexelsQuery}</span>
          <Button size="sm" variant="outline" onClick={() => actions.copyText(brief.pexelsQuery)}>복사</Button>
        </div>
      ) : null}
      {candidates.length ? (
        <div className="mt-2 grid gap-1.5">
          {candidates.map((item) => (
            <div key={item.name} className="rounded-md bg-slate-50 px-2 py-1.5 text-xs font-semibold leading-5 text-slate-600">
              <b className="text-slate-800">{item.name}</b>{item.role ? ` · ${item.role}` : ''}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
