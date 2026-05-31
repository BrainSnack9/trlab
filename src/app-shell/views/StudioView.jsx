import { useEffect, useState } from 'react';
import { ArrowLeft, Loader2, Send } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCardText } from '@/lib/card-text';
import { Empty, StageHead } from '../components/Common';

export function StudioView({ queue, studio, setView, contentPlans, setContentPlans }) {
  const { plan, loading, error, cached } = useContentPlan(studio, contentPlans, setContentPlans);
  if (!studio) return <Empty title="스튜디오에 담긴 후보가 없습니다" onClick={() => setView('dashboard')} />;
  return (
    <div className="space-y-5">
      <StageHead label="Step 03 · Content Studio" title={`${studio.label} 콘텐츠 설계`} description="LLM이 후보를 카드뉴스 기획안으로 확장합니다.">
        <Button variant="outline" onClick={() => setView('search')}><ArrowLeft className="h-4 w-4" />검증으로</Button>
        <Button onClick={() => setView('cardnews')} disabled={!plan}><Send className="h-4 w-4" />카드뉴스 시나리오로</Button>
      </StageHead>
      {loading && <LoadingBox />}
      {error && <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
      {plan && <PlanGrid plan={plan} queue={queue} cached={cached} />}
    </div>
  );
}

function PlanGrid({ plan, queue, cached }) {
  return <div className="grid gap-4 lg:grid-cols-[1fr_320px]"><div className="space-y-4"><PlanSummary plan={plan} cached={cached} /><HookList titles={plan.hookTitles} /><CardPreview cards={plan.cards} /></div><Card><CardHeader><CardDescription>Queue</CardDescription><CardTitle>제작 대기열</CardTitle></CardHeader><CardContent className="space-y-2">{queue.map((item) => <div key={item.id} className="rounded-lg border bg-slate-50 p-3"><strong>{item.label}</strong><p className="text-xs text-muted-foreground">{item.production?.tier ?? item.validation?.contentType}</p></div>)}</CardContent></Card></div>;
}

function PlanSummary({ plan, cached }) {
  return <Card><CardHeader><CardDescription>Creative Brief · {plan.provider}{cached ? ' · 저장본' : ''}</CardDescription><CardTitle>{plan.coreAngle}</CardTitle></CardHeader><CardContent className="space-y-3"><p className="text-sm text-muted-foreground">{plan.summary}</p><Badge variant="secondary">타깃 {plan.targetAudience}</Badge><NoteList title="주의할 표현" items={plan.riskNotes} /><NoteList title="활용 근거" items={plan.sourceNotes} /></CardContent></Card>;
}

function HookList({ titles }) {
  return <Card><CardHeader><CardDescription>Hooks</CardDescription><CardTitle>후킹 제목 후보</CardTitle></CardHeader><CardContent className="grid gap-2">{titles.map((title, index) => <div key={`${index}-${title}`} className="rounded-lg border bg-white p-3"><span className="text-xs font-black text-slate-500">HOOK {index + 1}</span><strong className="block">{title}</strong></div>)}</CardContent></Card>;
}

function CardPreview({ cards }) {
  return <Card><CardHeader><CardDescription>Storyboard</CardDescription><CardTitle>카드 구성 미리보기</CardTitle></CardHeader><CardContent className="grid gap-2 md:grid-cols-2">{cards.map((card) => <div key={card.page} className="rounded-lg border bg-slate-50 p-3"><Badge variant="outline">Card {card.page}</Badge><strong className="mt-2 block">{card.title}</strong><p className="mt-1 whitespace-pre-line text-sm text-muted-foreground">{formatCardText(card.body)}</p></div>)}</CardContent></Card>;
}

function NoteList({ title, items }) {
  if (!items?.length) return null;
  return <div><div className="mb-1 text-xs font-black text-slate-500">{title}</div><div className="flex flex-wrap gap-1.5">{items.slice(0, 5).map((item, index) => <Badge key={`${title}-${index}`} variant="outline">{item}</Badge>)}</div></div>;
}

function LoadingBox() {
  return <div className="flex items-center gap-2 rounded-lg border border-dashed p-5 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />LLM이 콘텐츠 기획안을 작성하는 중입니다.</div>;
}

function useContentPlan(studio, contentPlans, setContentPlans) {
  const key = studio?.id;
  const [state, setState] = useState({ loading: false, error: '', cached: false });
  useEffect(() => {
    if (!studio || contentPlans[key]) return;
    let active = true;
    setState({ loading: true, error: '', cached: false });
    fetch('/api/content/plan', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(studio) })
      .then((response) => response.ok ? response.json() : Promise.reject(new Error(`콘텐츠 설계 실패: ${response.status}`)))
      .then((data) => { if (active) { setContentPlans((plans) => ({ ...plans, [key]: data.plan })); setState({ loading: false, error: '', cached: Boolean(data.cached) }); } })
      .catch((error) => active && setState({ loading: false, error: error.message, cached: false }));
    return () => { active = false; };
  }, [studio, key, contentPlans, setContentPlans]);
  return { plan: contentPlans[key], ...state };
}
