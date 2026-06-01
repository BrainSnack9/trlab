import { useEffect, useMemo, useState } from 'react';
import { Copy, Download, Images, Palette, RefreshCw } from 'lucide-react';
import { Button } from '@/core/TrLab/Components/Desktop/Atoms/TrLab/Common/Button/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/core/TrLab/Components/Desktop/Atoms/TrLab/Common/Card';
import { formatCardText } from '@/lib/card-text';
import { autoStyle, cardStyles, referenceVisualGuide, styleTraits, templateSlots } from './card-news-styles';
import { downloadCard, makeCarouselScript, makePostCopy, makePrompt } from './card-news-export';
import { CardImageGenerator } from './CardImageGenerator';
import { CardNewsPreview } from './CardNewsPreview';
import { evaluateCardNewsPlan } from './card-news-quality';

export function CardNewsMaker({ studio, plan, onRegenerate, regenerating }) {
  const draftKey = useMemo(() => makeMakerDraftKey(studio, plan), [studio, plan]);
  const [selected, setSelected] = useState(0);
  const [styleKey, setStyleKey] = useState(() => autoStyle(studio, plan));
  const cards = useMemo(() => (plan.cards ?? []).map((card, index) => ({ ...card, page: card.page ?? index + 1 })), [plan]);
  const safeSelected = clampIndex(selected, cards.length);
  const card = cards[safeSelected] ?? cards[0];
  const resolvedStyleKey = cardStyles[styleKey] ? styleKey : autoStyle(studio, plan);
  const style = cardStyles[resolvedStyleKey] ?? Object.values(cardStyles)[0];

  useEffect(() => {
    const draft = loadMakerDraft(draftKey);
    setSelected(clampIndex(draft.selected ?? 0, cards.length));
    setStyleKey(cardStyles[draft.styleKey] ? draft.styleKey : autoStyle(studio, plan));
  }, [draftKey]);

  useEffect(() => {
    setSelected((value) => clampIndex(value, cards.length));
  }, [cards.length]);

  useEffect(() => {
    saveMakerDraft(draftKey, { selected: safeSelected, styleKey: resolvedStyleKey });
  }, [draftKey, safeSelected, resolvedStyleKey]);

  if (!card) return null;
  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
      <CardWorkspace cards={cards} selected={safeSelected} setSelected={setSelected} card={card} style={style} studio={studio} />
      <ControlPanel cards={cards} card={card} selected={safeSelected} styleKey={resolvedStyleKey} setStyleKey={setStyleKey} style={style} studio={studio} plan={plan} onRegenerate={onRegenerate} regenerating={regenerating} />
    </div>
  );
}

function CardWorkspace({ cards, selected, setSelected, card, style, studio }) {
  return (
    <div className="space-y-3">
      <div className="flex gap-2 overflow-x-auto pb-1">{cards.map((item, index) => <Button key={item.page} size="sm" variant={selected === index ? 'default' : 'outline'} onClick={() => setSelected(index)}>Card {item.page} · {roleLabel(item.role)}</Button>)}</div>
      <CarouselStrip cards={cards} selected={selected} setSelected={setSelected} style={style} />
      <CardNewsPreview card={card} style={style} studio={studio} />
    </div>
  );
}

function CarouselStrip({ cards, selected, setSelected, style }) {
  return (
    <div className="rounded-lg border bg-white p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <strong className="text-sm">전체 흐름 미리보기</strong>
        <span className="text-xs font-bold text-muted-foreground">{cards.length}장 캐러셀</span>
      </div>
      <div className="grid gap-2 sm:grid-cols-4 xl:grid-cols-7">
        {cards.map((card, index) => (
          <button key={card.page} type="button" onClick={() => setSelected(index)} className={`min-w-0 rounded-md border p-1 text-left transition ${selected === index ? 'border-indigo-400 bg-indigo-50 shadow-sm' : 'bg-slate-50 hover:border-indigo-200'}`}>
            <div className="aspect-[4/5] overflow-hidden rounded border bg-white p-2" style={{ color: style.ink }}>
              <div className="mb-2 flex items-center justify-between gap-1 text-[9px] font-black" style={{ color: style.sub }}>
                <span>{String(card.page).padStart(2, '0')}</span>
                <span>{roleLabel(card.role)}</span>
              </div>
              <strong className="line-clamp-3 block text-[13px] font-black leading-tight">{card.title}</strong>
              {card.emphasis ? <span className="mt-2 inline-block max-w-full truncate rounded-full px-2 py-0.5 text-[9px] font-black text-white" style={{ background: style.accent }}>{card.emphasis}</span> : null}
              <p className="mt-2 line-clamp-4 whitespace-pre-line text-[9px] font-bold leading-3 text-slate-500">{formatCardText(card.body)}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}


function ControlPanel({ cards, card, selected, styleKey, setStyleKey, style, studio, plan, onRegenerate, regenerating }) {
  return (
    <Card className="h-fit">
      <CardHeader><CardDescription>Production Controls</CardDescription><CardTitle className="flex items-center gap-2"><Images className="h-5 w-5 text-indigo-600" />카드 출력</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <Button className="w-full" onClick={onRegenerate} disabled={regenerating}><RefreshCw className={`h-4 w-4 ${regenerating ? 'animate-spin' : ''}`} />내용 다시 생성</Button>
        <div><div className="mb-2 flex items-center gap-2 text-sm font-black"><Palette className="h-4 w-4" />캔버스 템플릿</div><div className="grid gap-2">{Object.entries(cardStyles).map(([key, item]) => <Button key={key} variant={styleKey === key ? 'default' : 'outline'} className="h-auto justify-start p-3 text-left" onClick={() => setStyleKey(key)}><span><b className="block">{item.name}</b><small className="text-xs opacity-75">{item.desc}</small></span></Button>)}</div></div>
        <TemplateBlueprint style={style} />
        <ReferenceRhythmPanel plan={plan} />
        <ReferenceVisualPanel plan={plan} />
        <QualityPanel plan={plan} />
        <div className="rounded-lg bg-slate-50 p-3"><div className="mb-2 text-xs font-black text-slate-500">스타일 규칙</div><div className="flex flex-wrap gap-1.5">{styleTraits(styleKey).map((trait) => <span key={trait} className="rounded bg-white px-2 py-1 text-xs font-bold">{trait}</span>)}</div></div>
        <div className="grid grid-cols-2 gap-2"><Button onClick={() => downloadCard(card, selected, studio, style, 'png')}><Download className="h-4 w-4" />PNG</Button><Button variant="outline" onClick={() => downloadCard(card, selected, studio, style, 'svg')}>SVG</Button></div>
        <Button className="w-full" variant="secondary" onClick={() => cards.forEach((item, index) => setTimeout(() => downloadCard(item, index, studio, style, 'png'), index * 250))}>전체 PNG 다운로드</Button>
        <Button className="w-full" variant="outline" onClick={() => navigator.clipboard?.writeText(makeCarouselScript({ ...plan, cards }))}><Copy className="h-4 w-4" />전체 원고 복사</Button>
        <PublishPackage plan={plan} />
        <CardImageGenerator card={card} selected={selected} style={style} studio={studio} plan={plan} />
        <Button className="w-full" variant="outline" onClick={() => navigator.clipboard?.writeText(makePrompt(studio, plan, card, style.name))}><Copy className="h-4 w-4" />이미지 프롬프트 복사</Button>
        <div className="rounded-lg bg-slate-50 p-3 text-xs text-muted-foreground">레퍼런스는 인스타 정보 계정형 카드뉴스입니다. 핵심은 큰 후크, 짧은 본문, 한 카드 한 역할, 비교/그래프/반응의 시각화입니다.</div>
      </CardContent>
    </Card>
  );
}

function ReferenceVisualPanel({ plan }) {
  const guide = referenceVisualGuide(plan.referenceStyle);
  const rows = [
    ['계정', guide.account],
    ['표지', guide.cover],
    ['본문', guide.body],
    ['글자', guide.typography],
    ['금지', guide.avoid]
  ];
  return (
    <div className="rounded-lg border bg-white p-3">
      <div className="mb-2 text-xs font-black text-slate-500">시각 가이드</div>
      <div className="grid gap-1.5">
        {rows.map(([label, value]) => (
          <div key={label} className="grid grid-cols-[44px_minmax(0,1fr)] gap-2 text-xs leading-5">
            <b className={label === '금지' ? 'text-rose-500' : 'text-slate-500'}>{label}</b>
            <span className="font-semibold text-slate-700">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function QualityPanel({ plan }) {
  const quality = evaluateCardNewsPlan(plan);
  return (
    <div className="rounded-lg border bg-white p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="text-xs font-black text-slate-500">레퍼런스 QA</div>
        <span className={`rounded-full px-2 py-1 text-xs font-black ${quality.score >= 80 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>{quality.label} {quality.score}</span>
      </div>
      <div className="grid gap-1.5">
        {quality.checks.map((item) => (
          <div key={item.label} className="rounded-md bg-slate-50 p-2">
            <div className="flex justify-between gap-2 text-xs font-bold">
              <span className={item.passed ? 'text-slate-700' : 'text-amber-700'}>{item.passed ? '✓' : '!'} {item.label}</span>
              <span className="shrink-0 text-slate-400">{item.detail}</span>
            </div>
            {!item.passed ? <p className="mt-1 text-[11px] font-semibold leading-4 text-amber-700">{item.action}</p> : null}
          </div>
        ))}
      </div>
    </div>
  );
}

function ReferenceRhythmPanel({ plan }) {
  const pattern = plan.referencePattern;
  const rows = pattern ? [
    ['카드 수', pattern.deckLength],
    ['표지', pattern.coverRhythm],
    ['본문', pattern.bodyRhythm],
    ['마무리', pattern.endingRhythm]
  ].filter(([, value]) => value) : [];
  const blueprint = Array.isArray(plan.carouselBlueprint) ? plan.carouselBlueprint.slice(0, 6) : [];
  if (!rows.length && !blueprint.length) return null;
  return (
    <div className="rounded-lg border bg-white p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="text-xs font-black text-slate-500">레퍼런스 리듬</div>
        <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-black text-slate-600">{plan.referenceStyle || 'reference'}</span>
      </div>
      <div className="grid gap-1.5">
        {rows.map(([label, value]) => (
          <div key={label} className="grid grid-cols-[44px_minmax(0,1fr)] gap-2 text-xs leading-5">
            <b className="text-slate-500">{label}</b>
            <span className="font-semibold text-slate-700">{value}</span>
          </div>
        ))}
      </div>
      {blueprint.length ? (
        <div className="mt-3 rounded-md bg-slate-50 p-2">
          <div className="mb-1 text-[11px] font-black text-slate-500">흐름 체크</div>
          <ol className="grid gap-1 text-[11px] font-semibold leading-4 text-slate-600">
            {blueprint.map((item, index) => <li key={`${index}-${item}`} className="line-clamp-2">{index + 1}. {item}</li>)}
          </ol>
        </div>
      ) : null}
    </div>
  );
}

function PublishPackage({ plan }) {
  if (!plan.captionFirstLine && !plan.captionBody && !plan.hashtags?.length) return null;
  return (
    <div className="rounded-lg border bg-white p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="text-xs font-black text-slate-500">게시 문구</div>
        <Button size="sm" variant="outline" onClick={() => navigator.clipboard?.writeText(makePostCopy(plan))}><Copy className="h-3.5 w-3.5" />복사</Button>
      </div>
      {plan.captionFirstLine ? <strong className="block text-sm leading-5">{plan.captionFirstLine}</strong> : null}
      {plan.captionBody ? <p className="mt-2 line-clamp-6 whitespace-pre-line text-xs font-semibold leading-5 text-slate-600">{plan.captionBody}</p> : null}
      {plan.captionCTA ? <p className="mt-2 rounded-md bg-indigo-50 p-2 text-xs font-black leading-5 text-indigo-700">{plan.captionCTA}</p> : null}
      {plan.hashtags?.length ? <p className="mt-2 line-clamp-2 text-xs font-bold leading-5 text-slate-500">{plan.hashtags.join(' ')}</p> : null}
    </div>
  );
}

function TemplateBlueprint({ style }) {
  return <div className="rounded-lg border bg-white p-3"><div className="mb-2 text-xs font-black text-slate-500">고정 캔버스 슬롯</div><div className="grid grid-cols-2 gap-1.5">{templateSlots(style).map((slot) => <span key={slot} className="rounded-md bg-slate-100 px-2 py-1.5 text-xs font-bold text-slate-700">{slot}</span>)}</div><p className="mt-2 text-[11px] text-muted-foreground">AI는 슬롯에 들어갈 내용과 보조 그래픽만 제안하고, 한글 텍스트는 TrLab 렌더러가 정확히 얹습니다.</p></div>;
}

function roleLabel(value) {
  return {
    cover: '표지',
    why_now: '왜 지금',
    community_signal: '반응',
    comparison: '비교',
    data_scene: '데이터',
    misconception: '오해',
    content_angle: '각도',
    checklist: '체크',
    closing: '마무리'
  }[value] ?? '카드';
}

const MAKER_DRAFT_PREFIX = 'trlab.cardnews.maker.v1';

function makeMakerDraftKey(studio, plan) {
  const id = studio?.id || studio?.label || plan?.topic || 'draft';
  return `${MAKER_DRAFT_PREFIX}:${encodeURIComponent(`${id}`)}`;
}

function loadMakerDraft(key) {
  if (typeof window === 'undefined') return {};
  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) || '{}');
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function saveMakerDraft(key, draft) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify({
      savedAt: new Date().toISOString(),
      selected: Number.isFinite(draft.selected) ? draft.selected : 0,
      styleKey: draft.styleKey
    }));
  } catch {
    // Ignore localStorage quota/private mode failures.
  }
}

function clampIndex(value, length) {
  if (!length) return 0;
  const number = Number.isFinite(value) ? value : 0;
  return Math.max(0, Math.min(length - 1, number));
}
