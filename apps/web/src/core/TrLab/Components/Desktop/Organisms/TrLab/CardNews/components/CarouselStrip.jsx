import { formatCardText } from '@/lib/card-text';
import { cardNewsMakerViewHelpers } from '../lib/card-news-maker-view.helpers';

export function CarouselStrip({ cards, selected, setSelected }) {
  return (
    <div className="rounded-lg border bg-white p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <strong className="block text-base font-semibold">카드 흐름</strong>
          <span className="mt-1 block text-xs font-bold text-muted-foreground">카드를 누르면 아래 편집 캔버스가 전환됩니다.</span>
        </div>
        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">{selected + 1}/{cards.length} 선택</span>
      </div>
      <div className="grid gap-2 [grid-template-columns:repeat(auto-fit,minmax(150px,1fr))]">
        {cards.map((card, index) => (
          <button
            key={card.page}
            type="button"
            onClick={() => setSelected(index)}
            className={`group min-w-0 rounded-lg border p-2 text-left transition ${selected === index ? 'border-slate-300 bg-slate-50 shadow-md ring-2 ring-slate-100' : 'border-slate-200 bg-slate-50 hover:border-slate-200 hover:bg-white'}`}
          >
            <div className="flex min-h-[210px] flex-col rounded-md border bg-white p-3 text-slate-950 shadow-sm">
              <div className="mb-3 flex items-center justify-between gap-2 text-[10px] font-semibold text-slate-600">
                <span>{String(card.page).padStart(2, '0')}</span>
                <span className="min-w-0 truncate">{cardNewsMakerViewHelpers.roleLabel(card.role)}</span>
              </div>
              <strong className={`${cardNewsMakerViewHelpers.flowTitleClass(card.title)} block whitespace-normal break-keep font-semibold leading-tight [overflow-wrap:anywhere]`}>{card.title}</strong>
              {card.emphasis ? <span className="mt-3 inline-block max-w-full truncate rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-950">{card.emphasis}</span> : null}
              <p className="mt-3 line-clamp-5 whitespace-pre-line text-[12px] font-bold leading-5 text-slate-600">{formatCardText(card.body)}</p>
              <div className={`mt-auto pt-3 text-[11px] font-semibold text-slate-500 transition ${selected === index ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                {selected === index ? '편집 중' : '선택해서 편집'}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
