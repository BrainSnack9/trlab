import { Badge } from '@/core/TrLab/Components/Desktop/Atoms/TrLab/Common/Badge/Badge';
import { formatCardText } from '@/lib/card-text';

export function CardNewsPreview({ card, style, studio }) {
  if (card.layout === 'cover_text' || card.layout === 'cover_photo') return <CoverPreview card={card} style={style} studio={studio} />;
  if (card.layout === 'comparison_board') return <ComparisonPreview card={card} style={style} studio={studio} />;
  if (card.layout === 'data_chart') return <DataChartPreview card={card} style={style} studio={studio} />;
  if (card.layout === 'quote_card') return <QuotePreview card={card} style={style} studio={studio} />;
  if (card.layout === 'checklist') return <ChecklistPreview card={card} style={style} studio={studio} />;
  if (card.layout === 'handwritten_research') return <ResearchNotePreview card={card} style={style} studio={studio} />;
  if (style.name.includes('지도')) return <MapPreview card={card} style={style} studio={studio} />;
  if (style.name.includes('사다리')) return <TreePreview card={card} style={style} studio={studio} />;
  if (style.name.includes('파워 포토')) return <PowerPhotoPreview card={card} style={style} studio={studio} />;
  if (style.name.includes('노트')) return <NotePreview card={card} style={style} studio={studio} />;
  if (style.name.includes('스토리')) return <StoryPreview card={card} style={style} studio={studio} />;
  return <RankingPreview card={card} style={style} studio={studio} />;
}

function Shell({ style, children }) {
  return <div className="grid place-items-center rounded-lg border bg-slate-100 p-4"><div className="aspect-[4/5] w-full max-w-[560px] overflow-hidden rounded-md border-4 border-black shadow-2xl [word-break:break-word]" style={{ background: style.bg, color: style.ink }}>{children}</div></div>;
}

function CoverPreview({ card, style, studio }) {
  const photo = card.layout === 'cover_photo';
  const labels = visualItems(card, [card.emphasis, studio?.label]).slice(0, 3);
  return (
    <Shell style={style}>
      <div className={`flex h-full flex-col p-8 ${photo ? 'justify-end bg-gradient-to-b from-slate-300 via-slate-200 to-black text-white' : 'justify-between'}`}>
        <div className="flex items-center justify-between gap-3 text-sm font-black opacity-80">
          <span>{channelName(studio)}</span>
          <span className="rounded-full border px-3 py-1">{String(card.page ?? 1).padStart(2, '0')}</span>
        </div>
        <div className="my-auto">
          <span className="inline-block rounded-full px-4 py-2 text-sm font-black text-white" style={{ background: style.accent }}>{card.emphasis || '지금 봐야 할 신호'}</span>
          <h2 className="mt-7 max-w-full break-words text-6xl font-black leading-none tracking-normal">{card.title}</h2>
          <div className="mt-6 h-3 w-36 rounded-full" style={{ background: photo ? '#fff' : style.accent }} />
          <FormattedBody className="mt-7 text-2xl font-black leading-snug" text={card.body} />
        </div>
        <div>
          <div className="mb-4 flex flex-wrap gap-2">
            {labels.map((label) => <span key={label} className="rounded-full bg-white/90 px-3 py-1 text-xs font-black text-slate-700">{label}</span>)}
          </div>
          <p className="max-w-full break-words text-sm font-bold opacity-75">{studio?.label}</p>
        </div>
      </div>
    </Shell>
  );
}

function ResearchNotePreview({ card, style, studio }) {
  const labels = visualItems(card, ['반응 신호', '비교 기준', '확인할 숫자']);
  return (
    <Shell style={style}>
      <div className="flex h-full flex-col bg-white p-8">
        <Headline card={card} style={style} studio={studio} />
        <div className="mt-8 rounded-3xl border-4 border-dashed border-slate-800/80 bg-slate-50 p-5">
          <div className="mb-4 flex flex-wrap gap-2">
            {labels.slice(0, 3).map((label) => <span key={label} className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-600 shadow-sm">{label}</span>)}
          </div>
          <FormattedBody className="mt-4 text-2xl font-black leading-snug" text={card.body} />
        </div>
        <div className="mt-auto rounded-xl bg-slate-100 p-4 text-sm font-bold leading-5 text-slate-600 break-words">{card.emphasis || card.visualPrompt || '다음 카드에서 비교해보세요'}</div>
      </div>
    </Shell>
  );
}

function ComparisonPreview({ card, style, studio }) {
  const labels = visualItems(card, [studio?.label ?? '주제', '비교 대상', '과거 기준', '독자 기준']);
  return (
    <Shell style={style}>
      <div className="flex h-full flex-col p-7">
        <Headline card={card} style={style} studio={studio} />
        <div className="mt-7 grid grid-cols-2 gap-3">
          {labels.map((label, index) => (
            <div key={label} className="min-h-28 border-2 border-black bg-white p-3">
              <b className="text-xs text-slate-500">{index === 0 ? '기준' : index === 1 ? '상대' : '확인'}</b>
              <strong className="mt-3 block break-words text-xl font-black">{label}</strong>
            </div>
          ))}
        </div>
        <FormattedBody className="mt-auto border-t-2 border-black pt-5 text-lg font-black leading-snug" text={card.body} />
        <p className="mt-3 break-words text-xs font-black text-slate-500">{card.emphasis || '비교 기준을 나눠보기'}</p>
      </div>
    </Shell>
  );
}

function DataChartPreview({ card, style, studio }) {
  const labels = visualItems(card, ['대표 지표', '검색량', '댓글 반응', '가격/비중']);
  const metrics = chartMetrics(card, labels.length);
  return (
    <Shell style={style}>
      <div className="flex h-full flex-col p-7">
        <Headline card={card} style={style} studio={studio} />
        <div className="mt-8 flex h-64 items-end gap-4 border-b-4 border-l-4 border-black px-5">
          {metrics.map((metric, index) => (
            <div key={`${metric.label}-${labels[index]}`} className="flex min-w-0 flex-1 flex-col items-center justify-end gap-2" style={{ height: `${metric.height}%` }}>
              <span className="max-w-full break-words text-center text-sm font-black" style={{ color: index === 0 ? style.accent : style.sub }}>{metric.label}</span>
              <div className="w-full min-w-0 flex-1" style={{ background: index === 0 ? style.accent : style.sub }} />
            </div>
          ))}
        </div>
        <div className="mt-2 grid grid-cols-4 gap-2 text-center text-[11px] font-black text-slate-500">
          {labels.map((label) => <span key={label} className="break-words">{label}</span>)}
        </div>
        <FormattedBody className="mt-8 text-xl font-black leading-snug" text={card.body} />
        <p className="mt-auto break-words text-xs font-bold text-slate-500">{card.emphasis || '숫자 하나를 크게 보기'}</p>
      </div>
    </Shell>
  );
}

function QuotePreview({ card, style, studio }) {
  return (
    <Shell style={style}>
      <div className="flex h-full flex-col p-8">
        <p className="text-sm font-black" style={{ color: style.sub }}>사람들이 반응한 지점</p>
        <div className="my-auto rounded-3xl bg-white p-7 shadow-lg">
          <h2 className="break-words text-4xl font-black leading-tight">{card.title}</h2>
          <FormattedBody className="mt-6 text-xl font-black leading-snug text-slate-700" text={card.body} />
        </div>
        <p className="break-words text-sm font-bold text-slate-500">{card.emphasis || '반응이 몰린 지점'}</p>
      </div>
    </Shell>
  );
}

function ChecklistPreview({ card, style, studio }) {
  const lines = visualItems(card, formatCardText(card.body).split('\n').filter(Boolean).slice(0, 4));
  return (
    <Shell style={style}>
      <div className="flex h-full flex-col p-8">
        <p className="text-sm font-black" style={{ color: style.sub }}>저장해두고 볼 기준</p>
        <h2 className="mt-3 break-words text-5xl font-black leading-tight">{card.title}</h2>
        <p className="mt-4 break-words text-lg font-black" style={{ color: style.accent }}>{card.emphasis || '다음에 다시 볼 체크리스트'}</p>
        <div className="mt-10 grid gap-4">
          {(lines.length ? lines : ['반응이 있었나', '비교가 가능한가', '숫자로 설명되나']).map((line) => (
            <div key={line} className="flex items-start gap-3 rounded-xl border-2 border-black bg-white p-4 text-lg font-black">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-white" style={{ background: style.accent }}>✓</span>
              <span className="min-w-0 break-words">{line}</span>
            </div>
          ))}
        </div>
        <div className="mt-auto rounded-2xl border-2 border-black bg-white p-4 text-sm font-black leading-5 text-slate-600">
          저장할 때는 비교 기준과 숫자 하나를 같이 남겨요.
        </div>
      </div>
    </Shell>
  );
}

function MapPreview({ card, style, studio }) {
  return <Shell style={style}><div className="flex h-full flex-col p-8"><Headline card={card} style={style} studio={studio} /><div className="relative mt-5 flex-1 overflow-hidden border-2 border-dashed border-black/60 bg-slate-200"><Rings color={style.sub} left="18%" top="62%" /><Rings color={style.accent} left="72%" top="42%" />{['서울', '판교', '분당', '수지', '광교', '동탄', '고덕', '성수', '구리'].map((v, i) => <span key={v} className="absolute rounded-md bg-black px-2 py-1 text-sm font-black text-white" style={{ left: `${18 + (i * 13) % 62}%`, top: `${20 + (i * 17) % 58}%` }}>{v}</span>)}<Brand style={style} studio={studio} /></div><Foot card={card} /></div></Shell>;
}

function RankingPreview({ card, style, studio }) {
  const nums = ['+467%', '+1021%', '+341%', '+186%', '+90%', '-10%'];
  const labels = visualItems(card, ['대표 지표', '검색량', '댓글 반응', '가격/비중']);
  return <Shell style={style}><div className="p-7"><Headline card={card} style={style} studio={studio} /><div className="mt-5 grid grid-cols-2 gap-2">{nums.map((num, i) => <div key={num} className="min-w-0 border-2 border-black p-3"><b className="text-xs break-words">{labels[i % labels.length]}</b><strong className="block text-3xl font-black" style={{ color: num.startsWith('-') ? style.sub : style.accent }}>{num}</strong><span className="text-sm font-bold">{card.emphasis}</span></div>)}</div><FormattedBody className="mt-5 border-t-2 border-black pt-4 text-base font-bold" text={card.body} /></div></Shell>;
}

function TreePreview({ card, style, studio }) {
  return <Shell style={style}><div className="p-7"><Headline card={card} style={style} studio={studio} /><div className="mt-7 grid gap-4 text-center"><TreeNode text="내 상황에 맞나?" main /><div className="grid grid-cols-2 gap-4"><TreeNode text="성장성이 중요" /><TreeNode text="안정성이 중요" /></div><div className="grid grid-cols-3 gap-3"><TreeNode text={card.dataPoint || '확인 지표'} /><TreeNode text={card.insight || '읽을 포인트'} /><TreeNode text={card.action || '저장 기준'} /></div></div><p className="mt-8 rounded-md border-2 border-black bg-white/70 p-3 text-center text-lg font-black">내 선택 기준은 댓글/저장!</p></div></Shell>;
}

function TreeNode({ text, main }) {
  return <div className={`min-w-0 break-words rounded-lg border-2 border-black bg-white/80 p-3 font-black ${main ? 'mx-auto w-64 text-lg' : 'text-sm'}`}>{text}</div>;
}

function NotePreview({ card, style }) {
  return <Shell style={style}><div className="p-10"><p className="text-sm font-bold" style={{ color: style.sub }}>Episode {String(card.page).padStart(2, '0')}</p><h2 className="mt-8 break-words text-center text-4xl font-black leading-tight">{card.title}</h2><div className="mx-auto mt-6 h-2 w-36 rounded-full" style={{ background: style.accent }} /><FormattedBody className="mt-10 text-center text-lg font-bold leading-relaxed" text={card.body} /><div className="mt-10 break-words rounded-lg border-2 border-dashed p-4 text-center font-black">{card.emphasis}</div></div></Shell>;
}

function StoryPreview({ card, style, studio }) {
  return <Shell style={style}><div className="p-5"><div className="h-64 bg-gradient-to-br from-slate-300 to-slate-100" /><h2 className="mt-4 break-words text-3xl font-black">{card.title}</h2><FormattedBody className="mt-4 text-lg font-semibold leading-relaxed" text={card.body} /><div className="mt-4 text-sm font-bold text-slate-500">{channelName(studio)}</div></div></Shell>;
}

function PowerPhotoPreview({ card, style, studio }) {
  const labels = visualItems(card, [card.emphasis, studio?.label, card.dataPoint]).slice(0, 3);
  return (
    <Shell style={style}>
      <div className="flex h-full flex-col bg-gradient-to-b from-zinc-700 via-zinc-900 to-black p-8 text-white">
        <div className="flex items-center justify-between text-sm font-black text-white/80">
          <span>{channelName(studio)}</span>
          <span>{String(card.page ?? 1).padStart(2, '0')}</span>
        </div>
        <div className="my-auto">
          <span className="inline-block rounded-full px-4 py-2 text-sm font-black text-black" style={{ background: style.accent }}>{card.emphasis || '믿기 어려운 신호'}</span>
          <h2 className="mt-7 break-words text-6xl font-black leading-none">{card.title}</h2>
          <FormattedBody className="mt-7 text-2xl font-black leading-snug text-white/90" text={card.body} />
        </div>
        <div className="grid gap-2">
          <div className="flex flex-wrap gap-2">
            {labels.map((label) => <span key={label} className="rounded-full bg-white/15 px-3 py-1 text-xs font-black text-white">{label}</span>)}
          </div>
          <p className="break-words text-sm font-black text-white/70">{card.emphasis || '다음 카드에서 기준 확인'}</p>
        </div>
      </div>
    </Shell>
  );
}

function FormattedBody({ text, className }) {
  return <p className={`${className} min-w-0 break-words`}>{formatCardText(text).split('\n').map((line) => <span key={line} className="block min-w-0 break-words">{line}</span>)}</p>;
}

function Headline({ card, style, studio }) {
  return <><p className="text-sm font-black" style={{ color: style.sub }}>{channelName(studio)} · {String(card.page).padStart(2, '0')}</p><h2 className="mt-2 break-words text-4xl font-black leading-tight">{card.title}</h2><Badge className="mt-3 max-w-full break-words" style={{ background: style.accent }}>{card.emphasis}</Badge></>;
}

function Rings({ color, left, top }) {
  return <div className="absolute h-80 w-80 rounded-full border-4 border-dashed opacity-70" style={{ borderColor: color, left, top, transform: 'translate(-50%,-50%)' }} />;
}

function Brand({ style, studio }) {
  return <div className="absolute bottom-8 right-8 max-w-[70%] break-words text-right text-5xl font-black" style={{ color: style.sub }}>{studio.label?.split(' ')[0] ?? 'TrLab'}</div>;
}

function Foot({ card }) {
  return <div className="mt-3 break-words text-sm font-bold">{card.emphasis || card.visualPrompt || '핵심 포인트'}</div>;
}

function visualItems(card, fallback) {
  return (card.visualItems?.length ? card.visualItems : fallback).filter(Boolean).slice(0, 4);
}

function channelName(studio) {
  const text = `${studio?.channelName ?? studio?.manualBrief?.channelName ?? '@trlab.insight'}`.trim();
  if (!text) return '@trlab.insight';
  return text.startsWith('@') ? text : `@${text}`;
}

function chartMetrics(card, count = 4) {
  const values = extractNumbers([card.dataPoint, card.sourceLine, card.body, card.emphasis].join(' '));
  const normalized = values.length ? values : [78, 46, 62, 28].slice(0, count).map((value) => ({ value, label: `${value}` }));
  const max = Math.max(...normalized.map((item) => item.value), 1);
  return normalized.slice(0, count).map((item) => ({
    label: item.label,
    height: Math.max(24, Math.round((item.value / max) * 100))
  }));
}

function extractNumbers(text) {
  return [...`${text ?? ''}`.matchAll(/(\d+(?:,\d{3})*(?:\.\d+)?)(\s*[%％]|개|명|건|회|만|억|조|배|위|원)?/g)]
    .map((match) => {
      const value = Number(match[1].replace(/,/g, ''));
      const unit = (match[2] ?? '').trim();
      return Number.isFinite(value) ? { value, label: `${match[1]}${unit}` } : null;
    })
    .filter(Boolean);
}
