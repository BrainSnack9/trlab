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
  const labels = visualItems(card, researchFallbackLabels(card, studio));
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
  const labels = visualItems(card, dataFallbackLabels(card, studio));
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
  const eyebrow = quoteEyebrow(card);
  const points = quotePoints(card, studio);
  return (
    <Shell style={style}>
      <div className="flex h-full flex-col p-8">
        <p className="text-sm font-black" style={{ color: style.sub }}>{eyebrow}</p>
        <div className="my-auto border-l-8 bg-white p-7 shadow-lg" style={{ borderColor: style.accent, borderRadius: 28 }}>
          <h2 className="break-words text-4xl font-black leading-tight">{card.title}</h2>
          <FormattedBody className="mt-6 text-xl font-semibold leading-snug text-slate-700" text={card.body} />
          <div className="mt-6 grid gap-2">
            {points.map((point, index) => (
              <div key={`${point}-${index}`} className="flex items-center gap-2 rounded-2xl bg-slate-50 px-3 py-2 text-sm font-black">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: index === 0 ? style.accent : style.sub }} />
                {point}
              </div>
            ))}
          </div>
        </div>
        <p className="break-words text-sm font-bold text-slate-500">{card.emphasis || '현실에서 막히는 지점'}</p>
      </div>
    </Shell>
  );
}

function quoteEyebrow(card) {
  const text = `${card?.title ?? ''} ${card?.body ?? ''} ${card?.emphasis ?? ''}`;
  if (/부모|어린이집|유치원|등원|아이|아기|육아/.test(text)) return '현실에서 막히는 순간';
  if (/성분|안전|인증|제품|구매|유해|소재/.test(text)) return '사기 전에 걸리는 질문';
  if (/댓글|반응|커뮤니티|사람들/.test(text)) return '댓글이 모인 이유';
  return '사람들이 멈춘 지점';
}

function quotePoints(card, studio) {
  const text = `${card?.title ?? ''} ${card?.body ?? ''} ${card?.emphasis ?? ''} ${studio?.label ?? ''}`;
  if (/어린이집|유치원|등원|감기|아이 컨디션/.test(text)) return ['아이 컨디션', '출근 시간', '기관 기준'];
  if (/성분|안전|인증|유해|소재|아기 욕조/.test(text)) return ['성분 확인', '사용 조건', '대체 기준'];
  if (/구매|제품|상품|쇼핑|장바구니|생활템/.test(text)) return ['쓸 장면', '가격 이유', '다시 살까'];
  return ['내 상황과 맞나', '비교 기준이 있나', '반복되는 반응인가'];
}

function ChecklistPreview({ card, style, studio }) {
  const lines = visualItems(card, formatCardText(card.body).split('\n').filter(Boolean).slice(0, 4));
  const guide = checklistGuide(card);
  return (
    <Shell style={style}>
      <div className="flex h-full flex-col p-8">
        <p className="text-sm font-black" style={{ color: style.sub }}>{guide.eyebrow}</p>
        <h2 className="mt-3 break-words text-5xl font-black leading-tight">{card.title}</h2>
        <p className="mt-4 break-words text-lg font-black" style={{ color: style.accent }}>{card.emphasis || guide.emphasis}</p>
        <div className="mt-10 grid gap-4">
          {(lines.length ? lines : ['반응이 있었나', '비교가 가능한가', '숫자로 설명되나']).map((line) => (
            <div key={line} className="flex items-start gap-3 rounded-xl border-2 border-black bg-white p-4 text-lg font-black">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-white" style={{ background: style.accent }}>✓</span>
              <span className="min-w-0 break-words">{line}</span>
            </div>
          ))}
        </div>
        <div className="mt-auto rounded-2xl border-2 border-black bg-white p-4 text-sm font-black leading-5 text-slate-600">
          {guide.tip}
        </div>
      </div>
    </Shell>
  );
}

function MapPreview({ card, style, studio }) {
  const labels = visualItems(card, mapFallbackLabels(card, studio));
  return <Shell style={style}><div className="flex h-full flex-col p-8"><Headline card={card} style={style} studio={studio} /><div className="relative mt-5 flex-1 overflow-hidden border-2 border-dashed border-black/60 bg-slate-200"><Rings color={style.sub} left="18%" top="62%" /><Rings color={style.accent} left="72%" top="42%" />{labels.map((v, i) => <span key={v} className="absolute rounded-md bg-black px-2 py-1 text-sm font-black text-white" style={{ left: `${18 + (i * 17) % 62}%`, top: `${20 + (i * 19) % 58}%` }}>{v}</span>)}<Brand style={style} studio={studio} /></div><Foot card={card} /></div></Shell>;
}

function RankingPreview({ card, style, studio }) {
  const labels = visualItems(card, dataFallbackLabels(card, studio));
  const nums = chartMetrics(card, 6).map((metric) => metric.label);
  return <Shell style={style}><div className="p-7"><Headline card={card} style={style} studio={studio} /><div className="mt-5 grid grid-cols-2 gap-2">{nums.map((num, i) => <div key={num} className="min-w-0 border-2 border-black p-3"><b className="text-xs break-words">{labels[i % labels.length]}</b><strong className="block text-3xl font-black" style={{ color: num.startsWith('-') ? style.sub : style.accent }}>{num}</strong><span className="text-sm font-bold">{card.emphasis}</span></div>)}</div><FormattedBody className="mt-5 border-t-2 border-black pt-4 text-base font-bold" text={card.body} /></div></Shell>;
}

function TreePreview({ card, style, studio }) {
  const labels = visualItems(card, decisionFallbackLabels(card, studio));
  return <Shell style={style}><div className="p-7"><Headline card={card} style={style} studio={studio} /><div className="mt-7 grid gap-4 text-center"><TreeNode text={card.emphasis || '판단 기준'} main /><div className="grid grid-cols-2 gap-4"><TreeNode text={labels[0] || '내 상황'} /><TreeNode text={labels[1] || '확인 기준'} /></div><div className="grid grid-cols-3 gap-3"><TreeNode text={card.dataPoint || labels[2] || '근거 확인'} /><TreeNode text={card.insight || labels[3] || '읽을 포인트'} /><TreeNode text={card.action || '다음 행동'} /></div></div><p className="mt-8 rounded-md border-2 border-black bg-white/70 p-3 text-center text-lg font-black">{card.action || '내 기준에 맞는지 확인하세요'}</p></div></Shell>;
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

function dataFallbackLabels(card, studio) {
  const text = [studio?.label, studio?.keyword, card?.title, card?.body, card?.emphasis].filter(Boolean).join(' ');
  if (/등원|어린이집|유치원|감기|돌봄/.test(text)) return ['등원 고민', '아이 컨디션', '기관 기준'];
  if (/성분|안전|유해|인증|소재|아기 욕조/.test(text)) return ['성분 기준', '사용 조건', '확인 필요'];
  if (/구매|제품|쇼핑|상품|생활템|장바구니/.test(text)) return ['구매 이유', '사용 장면', '반복 언급'];
  return ['대표 신호', '반복 언급', '확인 기준'];
}

function researchFallbackLabels(card, studio) {
  const text = [studio?.label, studio?.keyword, card?.title, card?.body, card?.emphasis].filter(Boolean).join(' ');
  if (/등원|어린이집|유치원|감기|돌봄/.test(text)) return ['부모 현실', '기관 기준', '아이 상태'];
  if (/성분|안전|유해|인증|소재|아기 욕조/.test(text)) return ['제품 기준', '성분 확인', '사용 조건'];
  if (/구매|제품|쇼핑|상품|생활템|장바구니/.test(text)) return ['구매 이유', '가격 기준', '쓸 장면'];
  return ['핵심 신호', '비교 기준', '확인 근거'];
}

function decisionFallbackLabels(card, studio) {
  const text = [studio?.label, studio?.keyword, card?.title, card?.body, card?.emphasis].filter(Boolean).join(' ');
  if (/등원|어린이집|유치원|감기|돌봄/.test(text)) return ['아이 상태', '기관 기준', '가족 상황', '등원 판단'];
  if (/성분|안전|유해|인증|소재|아기 욕조/.test(text)) return ['성분 기준', '사용 조건', '대체 기준', '구매 판단'];
  if (/구매|제품|쇼핑|상품|생활템|장바구니/.test(text)) return ['사용 장면', '가격 기준', '재구매 이유', '구매 판단'];
  return ['내 상황', '확인 기준', '근거 확인', '다음 행동'];
}

function mapFallbackLabels(card, studio) {
  const text = [studio?.label, studio?.keyword, card?.title, card?.body, card?.emphasis].filter(Boolean).join(' ');
  if (/장소|여행|카페|놀이터|동네|지역/.test(text)) return ['후보 지역', '방문 동선', '체크 지점', '저장 장소'];
  return decisionFallbackLabels(card, studio);
}

function checklistGuide(card) {
  const text = `${card?.title ?? ''} ${card?.body ?? ''}`;
  if (/등원|어린이집|유치원|아이 컨디션/.test(text)) {
    return { eyebrow: '보내기 전 확인할 것', emphasis: '등원 판단 기준', tip: '판단이 애매할수록 상황, 제도, 아이 컨디션을 나눠보세요.' };
  }
  if (/구매|사기|성분|소재|인증|사용 연령|대체품|가격|재구매/.test(text)) {
    return { eyebrow: '사기 전 확인할 것', emphasis: '구매 판단 기준', tip: '구매 전에는 용도, 기준, 다시 쓸 장면을 먼저 확인하세요.' };
  }
  if (/실행|오늘|주의점|방법/.test(text)) {
    return { eyebrow: '바로 하기 전 확인할 것', emphasis: '실행 기준', tip: '바로 할 수 있는지, 주의점이 분명한지 먼저 확인하세요.' };
  }
  return { eyebrow: '마지막으로 확인할 것', emphasis: '확인 기준', tip: '내 상황, 비교 기준, 확인 근거를 나눠보세요.' };
}

function channelName(studio) {
  const text = `${studio?.channelName ?? studio?.manualBrief?.channelName ?? '@trlab.insight'}`.trim();
  if (!text) return '@trlab.insight';
  return text.startsWith('@') ? text : `@${text}`;
}

function chartMetrics(card, count = 4) {
  const values = extractNumbers([card.dataPoint, card.sourceLine, card.body, card.emphasis].join(' '));
  const fallbackNames = dataFallbackLabels(card, {});
  const normalized = values.length ? values : [80, 62, 44, 30, 24, 18].slice(0, count).map((value, index) => ({
    value,
    label: fallbackNames[index] ?? `신호 ${index + 1}`
  }));
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
