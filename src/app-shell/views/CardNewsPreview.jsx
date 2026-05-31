import { Badge } from '@/components/ui/badge';
import { formatCardText } from '@/lib/card-text';

export function CardNewsPreview({ card, style, studio }) {
  if (style.name.includes('지도')) return <MapPreview card={card} style={style} studio={studio} />;
  if (style.name.includes('사다리')) return <TreePreview card={card} style={style} studio={studio} />;
  if (style.name.includes('노트')) return <NotePreview card={card} style={style} studio={studio} />;
  if (style.name.includes('스토리')) return <StoryPreview card={card} style={style} studio={studio} />;
  return <RankingPreview card={card} style={style} studio={studio} />;
}

function Shell({ style, children }) {
  return <div className="grid place-items-center rounded-lg border bg-slate-100 p-4"><div className="aspect-square w-full max-w-[680px] overflow-hidden rounded-md border-4 border-black shadow-2xl" style={{ background: style.bg, color: style.ink }}>{children}</div></div>;
}

function MapPreview({ card, style, studio }) {
  return <Shell style={style}><div className="flex h-full flex-col p-8"><Headline card={card} style={style} /><div className="relative mt-5 flex-1 overflow-hidden border-2 border-dashed border-black/60 bg-slate-200"><Rings color={style.sub} left="18%" top="62%" /><Rings color={style.accent} left="72%" top="42%" />{['서울', '판교', '분당', '수지', '광교', '동탄', '고덕', '성수', '구리'].map((v, i) => <span key={v} className="absolute rounded-md bg-black px-2 py-1 text-sm font-black text-white" style={{ left: `${18 + (i * 13) % 62}%`, top: `${20 + (i * 17) % 58}%` }}>{v}</span>)}<Brand style={style} studio={studio} /></div><Foot card={card} /></div></Shell>;
}

function RankingPreview({ card, style }) {
  const nums = ['+467%', '+1021%', '+341%', '+186%', '+90%', '-10%'];
  return <Shell style={style}><div className="p-7"><Headline card={card} style={style} /><div className="mt-5 grid grid-cols-2 gap-2">{nums.map((num, i) => <div key={num} className="border-2 border-black p-3"><b className="text-xs">지표 {i + 1}</b><strong className="block text-3xl font-black" style={{ color: num.startsWith('-') ? style.sub : style.accent }}>{num}</strong><span className="text-sm font-bold">{card.emphasis}</span></div>)}</div><FormattedBody className="mt-5 border-t-2 border-black pt-4 text-base font-bold" text={card.body} /></div></Shell>;
}

function TreePreview({ card, style }) {
  return <Shell style={style}><div className="p-7"><Headline card={card} style={style} /><div className="mt-7 grid gap-4 text-center"><TreeNode text="내 상황에 맞나?" main /><div className="grid grid-cols-2 gap-4"><TreeNode text="성장성이 중요" /><TreeNode text="안정성이 중요" /></div><div className="grid grid-cols-3 gap-3"><TreeNode text={card.dataPoint || '근거'} /><TreeNode text={card.insight || '해석'} /><TreeNode text={card.action || '행동'} /></div></div><p className="mt-8 rounded-md border-2 border-black bg-white/70 p-3 text-center text-lg font-black">내 선택 기준은 댓글/저장!</p></div></Shell>;
}

function TreeNode({ text, main }) {
  return <div className={`rounded-lg border-2 border-black bg-white/80 p-3 font-black ${main ? 'mx-auto w-64 text-lg' : 'text-sm'}`}>{text}</div>;
}

function NotePreview({ card, style }) {
  return <Shell style={style}><div className="p-10"><p className="text-sm font-bold" style={{ color: style.sub }}>Episode {String(card.page).padStart(2, '0')}</p><h2 className="mt-8 text-center text-4xl font-black leading-tight">{card.title}</h2><div className="mx-auto mt-6 h-2 w-36 rounded-full" style={{ background: style.accent }} /><FormattedBody className="mt-10 text-center text-lg font-bold leading-relaxed" text={card.body} /><div className="mt-10 rounded-lg border-2 border-dashed p-4 text-center font-black">{card.emphasis}</div></div></Shell>;
}

function StoryPreview({ card, style }) {
  return <Shell style={style}><div className="p-5"><div className="h-64 bg-gradient-to-br from-slate-300 to-slate-100" /><h2 className="mt-4 text-3xl font-black">{card.title}</h2><FormattedBody className="mt-4 text-lg font-semibold leading-relaxed" text={card.body} /><div className="mt-4 text-sm font-bold text-slate-500">@trlab.insight</div></div></Shell>;
}

function FormattedBody({ text, className }) {
  return <p className={className}>{formatCardText(text).split('\n').map((line) => <span key={line} className="block">{line}</span>)}</p>;
}

function Headline({ card, style }) {
  return <><p className="text-sm font-black" style={{ color: style.sub }}>TrLab Insight #{card.page}</p><h2 className="mt-2 text-4xl font-black leading-tight">{card.title}</h2><Badge className="mt-3" style={{ background: style.accent }}>{card.emphasis}</Badge></>;
}

function Rings({ color, left, top }) {
  return <div className="absolute h-80 w-80 rounded-full border-4 border-dashed opacity-70" style={{ borderColor: color, left, top, transform: 'translate(-50%,-50%)' }} />;
}

function Brand({ style, studio }) {
  return <div className="absolute bottom-8 right-8 text-5xl font-black" style={{ color: style.sub }}>{studio.label?.split(' ')[0] ?? 'TrLab'}</div>;
}

function Foot({ card }) {
  return <div className="mt-3 text-sm font-bold">출처/근거: {card.dataPoint || card.visualPrompt}</div>;
}
