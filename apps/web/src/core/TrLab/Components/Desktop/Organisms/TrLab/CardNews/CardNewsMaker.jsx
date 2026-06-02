import { useEffect, useMemo, useState } from 'react';
import { Copy, Download, Images, Palette } from 'lucide-react';
import { Button } from '@/core/TrLab/Components/Desktop/Atoms/TrLab/Common/Button/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/core/TrLab/Components/Desktop/Atoms/TrLab/Common/Card';
import { formatCardText } from '@/lib/card-text';
import { autoStyle, cardStyles, styleRecommendation } from './card-news-styles';
import { downloadCard, makeCarouselScript, makePostCopy } from './card-news-export';
import { CardImageGenerator } from './CardImageGenerator';
import { CardNewsPreview } from './CardNewsPreview';

export function CardNewsMaker({ studio, plan }) {
  const draftKey = useMemo(() => makeMakerDraftKey(studio, plan), [studio, plan]);
  const [selected, setSelected] = useState(0);
  const [styleKey, setStyleKey] = useState(() => autoStyle(studio, plan));
  const [channelName, setChannelName] = useState(() => studio?.channelName || studio?.manualBrief?.channelName || '@trlab.insight');
  const [generatedImages, setGeneratedImages] = useState({});
  const cards = useMemo(() => (plan.cards ?? []).map((card, index) => ({ ...card, page: card.page ?? index + 1 })), [plan]);
  const safeSelected = clampIndex(selected, cards.length);
  const card = cards[safeSelected] ?? cards[0];
  const resolvedStyleKey = cardStyles[styleKey] ? styleKey : autoStyle(studio, plan);
  const style = cardStyles[resolvedStyleKey] ?? Object.values(cardStyles)[0];
  const displayStudio = useMemo(() => ({ ...studio, channelName: normalizeChannelName(channelName) }), [studio, channelName]);

  useEffect(() => {
    const draft = loadMakerDraft(draftKey);
    setSelected(clampIndex(draft.selected ?? 0, cards.length));
    setStyleKey(cardStyles[draft.styleKey] ? draft.styleKey : autoStyle(studio, plan));
    setChannelName(draft.channelName || studio?.channelName || studio?.manualBrief?.channelName || '@trlab.insight');
    setGeneratedImages(sanitizeGeneratedImages(draft.generatedImages, cards));
  }, [draftKey]);

  useEffect(() => {
    setSelected((value) => clampIndex(value, cards.length));
    setGeneratedImages((value) => sanitizeGeneratedImages(value, cards));
  }, [cards.length]);

  useEffect(() => {
    saveMakerDraft(draftKey, {
      selected: safeSelected,
      styleKey: resolvedStyleKey,
      channelName: normalizeChannelName(channelName),
      generatedImages: sanitizeGeneratedImages(generatedImages, cards)
    });
  }, [draftKey, safeSelected, resolvedStyleKey, channelName, generatedImages, cards]);

  if (!card) return null;
  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
      <CardWorkspace
        cards={cards}
        selected={safeSelected}
        setSelected={setSelected}
        card={card}
        style={style}
        studio={displayStudio}
        plan={plan}
        generatedImage={generatedImages[cardImageKey(card, safeSelected)]}
        setGeneratedImage={(image) => setGeneratedImages((value) => ({ ...value, [cardImageKey(card, safeSelected)]: image }))}
      />
      <ControlPanel cards={cards} card={card} selected={safeSelected} styleKey={resolvedStyleKey} setStyleKey={setStyleKey} style={style} studio={displayStudio} plan={plan} channelName={channelName} setChannelName={setChannelName} />
    </div>
  );
}

function CardWorkspace({ cards, selected, setSelected, card, style, studio, plan, generatedImage, setGeneratedImage }) {
  return (
    <div className="space-y-3">
      <div className="flex gap-2 overflow-x-auto pb-1">{cards.map((item, index) => <Button key={item.page} size="sm" variant={selected === index ? 'default' : 'outline'} onClick={() => setSelected(index)}>카드 {item.page} · {roleLabel(item.role)}</Button>)}</div>
      <CarouselStrip cards={cards} selected={selected} setSelected={setSelected} style={style} />
      <CardNewsPreview card={card} style={style} studio={studio} />
      <CardImageGenerator card={card} selected={selected} style={style} studio={studio} plan={plan} generatedImage={generatedImage} onGenerated={setGeneratedImage} />
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


function ControlPanel({ cards, card, selected, styleKey, setStyleKey, style, studio, plan, channelName, setChannelName }) {
  const recommendation = styleRecommendation(studio, plan);
  const recommendedKey = recommendation.key;
  return (
    <Card className="h-fit">
      <CardHeader><CardTitle className="flex items-center gap-2"><Images className="h-5 w-5 text-indigo-600" />카드 출력</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <label className="grid gap-1.5 rounded-lg border bg-white p-3">
          <span className="text-xs font-black text-slate-500">채널명</span>
          <input
            className="h-10 rounded-md border border-slate-200 px-3 text-sm font-black outline-none focus:border-indigo-400"
            value={channelName}
            onChange={(event) => setChannelName(event.target.value)}
            placeholder="@my_channel"
          />
          <span className="text-[11px] font-semibold text-muted-foreground">AI 이미지 하단 브랜드 표기에 사용됩니다.</span>
        </label>
        <div className="rounded-lg border border-indigo-100 bg-indigo-50 p-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-xs font-black text-indigo-700">추천 템플릿</div>
              <strong className="mt-1 block text-sm">{recommendation.style?.name}</strong>
              <p className="mt-1 text-xs font-semibold leading-5 text-indigo-700/80">{recommendation.reason}</p>
            </div>
            <Button size="sm" variant={styleKey === recommendedKey ? 'secondary' : 'default'} onClick={() => setStyleKey(recommendedKey)} disabled={styleKey === recommendedKey}>
              {styleKey === recommendedKey ? '적용됨' : '추천 적용'}
            </Button>
          </div>
        </div>
        <div><div className="mb-2 flex items-center gap-2 text-sm font-black"><Palette className="h-4 w-4" />캔버스 템플릿</div><div className="grid gap-2">{Object.entries(cardStyles).map(([key, item]) => <Button key={key} variant={styleKey === key ? 'default' : 'outline'} className="h-auto justify-start p-3 text-left" onClick={() => setStyleKey(key)}><span><b className="block">{item.name}{key === recommendedKey ? ' · 추천' : ''}</b><small className="text-xs opacity-75">{item.desc}</small></span></Button>)}</div></div>
        <Button className="w-full" onClick={() => downloadCard(card, selected, studio, style, 'png')}><Download className="h-4 w-4" />현재 카드 PNG 다운로드</Button>
        <Button className="w-full" variant="outline" onClick={() => navigator.clipboard?.writeText(makeCarouselScript({ ...plan, cards }))}><Copy className="h-4 w-4" />전체 원고 복사</Button>
        <PublishCopyPanel plan={plan} />
      </CardContent>
    </Card>
  );
}

function PublishCopyPanel({ plan }) {
  const copy = makePostCopy(plan);
  if (!copy) return null;
  return (
    <div className="rounded-lg border bg-white p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <strong className="text-sm">게시 원고</strong>
        <Button size="sm" variant="outline" onClick={() => navigator.clipboard?.writeText(copy)}>
          <Copy className="h-3.5 w-3.5" />
          복사
        </Button>
      </div>
      {plan.captionFirstLine ? <strong className="block text-sm leading-5">{plan.captionFirstLine}</strong> : null}
      {plan.captionBody ? <p className="mt-2 whitespace-pre-line text-xs font-semibold leading-5 text-slate-600">{plan.captionBody}</p> : null}
      {plan.captionCTA ? <p className="mt-2 rounded-md bg-indigo-50 p-2 text-xs font-black leading-5 text-indigo-700">{plan.captionCTA}</p> : null}
      {Array.isArray(plan.hashtags) && plan.hashtags.length ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {plan.hashtags.map((tag) => <span key={tag} className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-black text-slate-600">{tag}</span>)}
        </div>
      ) : null}
    </div>
  );
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
      styleKey: draft.styleKey,
      channelName: normalizeChannelName(draft.channelName),
      generatedImages: draft.generatedImages ?? {}
    }));
  } catch {
    // Ignore localStorage quota/private mode failures.
  }
}

function cardImageKey(card, index) {
  return `${card?.page ?? index + 1}`;
}

function sanitizeGeneratedImages(value, cards = []) {
  if (!value || typeof value !== 'object') return {};
  const allowed = new Set(cards.map((card, index) => cardImageKey(card, index)));
  const entries = Object.entries(value).filter(([key, image]) => {
    return (!allowed.size || allowed.has(key)) && image && typeof image === 'object' && typeof image.url === 'string';
  });
  return Object.fromEntries(entries);
}

function clampIndex(value, length) {
  if (!length) return 0;
  const number = Number.isFinite(value) ? value : 0;
  return Math.max(0, Math.min(length - 1, number));
}

function normalizeChannelName(value) {
  const text = `${value ?? ''}`.trim();
  if (!text) return '@trlab.insight';
  return text.startsWith('@') ? text : `@${text}`;
}
