import { useMemo, useState } from 'react';
import { Copy, Download, Images, Palette, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCardText } from '@/lib/card-text';
import { autoStyle, cardStyles, styleTraits, templateSlots } from './card-news-styles';
import { downloadCard, makePrompt } from './card-news-export';
import { CardImageGenerator } from './CardImageGenerator';
import { CardNewsPreview } from './CardNewsPreview';

export function CardNewsMaker({ studio, plan, onRegenerate, regenerating }) {
  const [selected, setSelected] = useState(0);
  const [styleKey, setStyleKey] = useState(() => autoStyle(studio));
  const cards = useMemo(() => (plan.cards ?? []).map((card, index) => ({ ...card, page: card.page ?? index + 1 })), [plan]);
  const card = cards[selected] ?? cards[0];
  const style = cardStyles[styleKey];
  if (!card) return null;
  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
      <CardWorkspace cards={cards} selected={selected} setSelected={setSelected} card={card} style={style} studio={studio} />
      <ControlPanel cards={cards} card={card} selected={selected} styleKey={styleKey} setStyleKey={setStyleKey} style={style} studio={studio} plan={plan} onRegenerate={onRegenerate} regenerating={regenerating} />
    </div>
  );
}

function CardWorkspace({ cards, selected, setSelected, card, style, studio }) {
  return (
    <div className="space-y-3">
      <div className="flex gap-2 overflow-x-auto pb-1">{cards.map((item, index) => <Button key={item.page} size="sm" variant={selected === index ? 'default' : 'outline'} onClick={() => setSelected(index)}>Card {item.page}</Button>)}</div>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]"><CardNewsPreview card={card} style={style} studio={studio} /><ScriptList cards={cards} selected={selected} /></div>
    </div>
  );
}

function ScriptList({ cards, selected }) {
  return <div className="max-h-[680px] space-y-2 overflow-y-auto">{cards.map((card, index) => <div key={card.page} className={`rounded-lg border p-3 text-sm ${selected === index ? 'border-indigo-300 bg-indigo-50' : 'bg-white'}`}><span className="text-xs font-black text-slate-500">Card {card.page}</span><strong className="mt-2 line-clamp-2 block">{card.title}</strong><p className="mt-1 line-clamp-4 whitespace-pre-line text-xs text-muted-foreground">{formatCardText(card.body)}</p></div>)}</div>;
}

function ControlPanel({ cards, card, selected, styleKey, setStyleKey, style, studio, plan, onRegenerate, regenerating }) {
  return (
    <Card className="h-fit">
      <CardHeader><CardDescription>Production Controls</CardDescription><CardTitle className="flex items-center gap-2"><Images className="h-5 w-5 text-indigo-600" />카드 출력</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <Button className="w-full" onClick={onRegenerate} disabled={regenerating}><RefreshCw className={`h-4 w-4 ${regenerating ? 'animate-spin' : ''}`} />내용 다시 생성</Button>
        <div><div className="mb-2 flex items-center gap-2 text-sm font-black"><Palette className="h-4 w-4" />캔버스 템플릿</div><div className="grid gap-2">{Object.entries(cardStyles).map(([key, item]) => <Button key={key} variant={styleKey === key ? 'default' : 'outline'} className="h-auto justify-start p-3 text-left" onClick={() => setStyleKey(key)}><span><b className="block">{item.name}</b><small className="text-xs opacity-75">{item.desc}</small></span></Button>)}</div></div>
        <TemplateBlueprint style={style} />
        <div className="rounded-lg bg-slate-50 p-3"><div className="mb-2 text-xs font-black text-slate-500">스타일 규칙</div><div className="flex flex-wrap gap-1.5">{styleTraits(styleKey).map((trait) => <span key={trait} className="rounded bg-white px-2 py-1 text-xs font-bold">{trait}</span>)}</div></div>
        <div className="grid grid-cols-2 gap-2"><Button onClick={() => downloadCard(card, selected, studio, style, 'png')}><Download className="h-4 w-4" />PNG</Button><Button variant="outline" onClick={() => downloadCard(card, selected, studio, style, 'svg')}>SVG</Button></div>
        <Button className="w-full" variant="secondary" onClick={() => cards.forEach((item, index) => setTimeout(() => downloadCard(item, index, studio, style, 'png'), index * 250))}>전체 PNG 다운로드</Button>
        <CardImageGenerator card={card} selected={selected} style={style} studio={studio} plan={plan} />
        <Button className="w-full" variant="outline" onClick={() => navigator.clipboard?.writeText(makePrompt(studio, plan, card, style.name))}><Copy className="h-4 w-4" />이미지 프롬프트 복사</Button>
        <div className="rounded-lg bg-slate-50 p-3 text-xs text-muted-foreground">레퍼런스는 인스타 정보 계정형 카드뉴스입니다. 핵심은 큰 제목, 촘촘한 근거, 표/지도/트리 같은 구조화입니다.</div>
      </CardContent>
    </Card>
  );
}

function TemplateBlueprint({ style }) {
  return <div className="rounded-lg border bg-white p-3"><div className="mb-2 text-xs font-black text-slate-500">고정 캔버스 슬롯</div><div className="grid grid-cols-2 gap-1.5">{templateSlots(style).map((slot) => <span key={slot} className="rounded-md bg-slate-100 px-2 py-1.5 text-xs font-bold text-slate-700">{slot}</span>)}</div><p className="mt-2 text-[11px] text-muted-foreground">AI는 슬롯에 들어갈 내용과 보조 그래픽만 제안하고, 한글 텍스트는 TrLab 렌더러가 정확히 얹습니다.</p></div>;
}
