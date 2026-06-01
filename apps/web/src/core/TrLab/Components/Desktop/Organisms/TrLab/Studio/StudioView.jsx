import { useEffect, useState } from 'react';
import { ArrowLeft, Loader2, Send } from 'lucide-react';
import { Badge } from '@/core/TrLab/Components/Desktop/Atoms/TrLab/Common/Badge/Badge';
import { Button } from '@/core/TrLab/Components/Desktop/Atoms/TrLab/Common/Button/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/core/TrLab/Components/Desktop/Atoms/TrLab/Common/Card';
import { formatCardText } from '@/lib/card-text';
import { Empty, StageHead } from '@/core/TrLab/Components/Desktop/Molecules/TrLab/Common';
import { createContentPlan } from '@/core/TrLab/modules/clients/api';
import { evaluateCardNewsPlan } from '../CardNews/card-news-quality';

export function StudioView({ queue, studio, setView, setQueue, contentPlans, setContentPlans }) {
  const [manualState, setManualState] = useState({ loading: false, error: '' });
  const { plan, loading, error, cached } = useContentPlan(studio, contentPlans, setContentPlans);
  const createManualPlan = async (values) => {
    const manualStudio = makeManualStudio(values);
    setManualState({ loading: true, error: '' });
    try {
      const data = await createContentPlan(manualStudio, { refresh: true });
      setQueue((items = []) => [manualStudio, ...items.filter((item) => item?.id !== manualStudio.id)]);
      setContentPlans((plans) => ({ ...plans, [manualStudio.id]: data.plan }));
      setView('studio');
    } catch (error) {
      setManualState({ loading: false, error: error.message });
      return;
    }
    setManualState({ loading: false, error: '' });
  };
  if (!studio) {
    return (
      <div className="space-y-5">
        <ManualBriefPanel onSubmit={createManualPlan} loading={manualState.loading} error={manualState.error} />
        <Empty title="콘텐츠 설계 대기열이 비어 있습니다" onClick={() => setView('dashboard')} />
      </div>
    );
  }
  return (
    <div className="space-y-5">
      <StageHead label="Step 03 · Content Studio" title={`${studio.label} 콘텐츠 설계`} description="LLM이 후보를 카드뉴스 기획안으로 확장합니다.">
        <Button variant="outline" onClick={() => setView('search')}><ArrowLeft className="h-4 w-4" />검증으로</Button>
        <Button onClick={() => setView('cardnews')} disabled={!plan}><Send className="h-4 w-4" />카드뉴스 시나리오로</Button>
      </StageHead>
      <ManualBriefPanel onSubmit={createManualPlan} loading={manualState.loading} error={manualState.error} compact />
      {loading && <LoadingBox />}
      {error && <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
      {plan && <PlanGrid plan={plan} queue={queue} cached={cached} />}
    </div>
  );
}

function ManualBriefPanel({ onSubmit, loading, error, compact = false }) {
  const [values, setValues] = useState({
    topic: '',
    prompt: '',
    cardCount: 8,
    channelName: '@trlab.insight',
    audience: '',
    tone: ''
  });
  const canSubmit = values.topic.trim() && values.prompt.trim() && !loading;
  const update = (key) => (event) => setValues((current) => ({ ...current, [key]: event.target.value }));
  const submit = (event) => {
    event.preventDefault();
    if (!canSubmit) return;
    onSubmit({ ...values, cardCount: Number(values.cardCount) });
  };

  return (
    <Card>
      <CardHeader>
        <CardDescription>Manual Content Brief</CardDescription>
        <CardTitle>원하는 주제로 카드뉴스 설계</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="grid gap-3" onSubmit={submit}>
          <div className={compact ? 'grid gap-3 lg:grid-cols-[minmax(0,1fr)_120px]' : 'grid gap-3 md:grid-cols-[minmax(0,1fr)_140px]'}>
            <label className="grid gap-1.5">
              <span className="text-xs font-black text-slate-500">주제</span>
              <input className="h-10 rounded-md border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-indigo-400" value={values.topic} onChange={update('topic')} placeholder="예: 30대 직장인을 위한 저속노화 식단" />
            </label>
            <label className="grid gap-1.5">
              <span className="text-xs font-black text-slate-500">컷 수</span>
              <input className="h-10 rounded-md border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-indigo-400" type="number" min="3" max="12" value={values.cardCount} onChange={update('cardCount')} />
            </label>
          </div>
          <label className="grid gap-1.5">
            <span className="text-xs font-black text-slate-500">만들고 싶은 내용</span>
            <textarea className="min-h-28 resize-y rounded-md border border-slate-200 px-3 py-2 text-sm font-semibold leading-6 outline-none focus:border-indigo-400" value={values.prompt} onChange={update('prompt')} placeholder="어떤 관점으로, 어떤 독자에게, 어떤 페이지 흐름으로 만들고 싶은지 자연어로 적어주세요." />
          </label>
          <label className="grid gap-1.5">
            <span className="text-xs font-black text-slate-500">채널명</span>
            <input className="h-10 rounded-md border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-indigo-400" value={values.channelName} onChange={update('channelName')} placeholder="@my_channel" />
          </label>
          {!compact ? (
            <div className="grid gap-3 md:grid-cols-2">
              <label className="grid gap-1.5">
                <span className="text-xs font-black text-slate-500">대상 독자</span>
                <input className="h-10 rounded-md border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-indigo-400" value={values.audience} onChange={update('audience')} placeholder="예: 인스타 저장형 정보를 좋아하는 20대 후반" />
              </label>
              <label className="grid gap-1.5">
                <span className="text-xs font-black text-slate-500">톤</span>
                <input className="h-10 rounded-md border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-indigo-400" value={values.tone} onChange={update('tone')} placeholder="예: 친근하지만 근거 있는 말투" />
              </label>
            </div>
          ) : null}
          {error ? <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-bold text-red-700">{error}</div> : null}
          <div className="flex justify-end">
            <Button type="submit" disabled={!canSubmit}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              콘텐츠 설계 생성
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function makeManualStudio(values) {
  const topic = values.topic.trim();
  const prompt = values.prompt.trim();
  const cardCount = Math.min(12, Math.max(3, Number(values.cardCount) || 8));
  const channelName = normalizeChannelName(values.channelName);
  const idSeed = `${topic}-${prompt}-${cardCount}-${Date.now()}`;
  return {
    id: `manual-${hashString(idSeed)}`,
    label: topic,
    keyword: topic,
    category: 'manual',
    sourceMode: 'manual',
    channelName,
    score: 100,
    rank: 1,
    summary: prompt,
    production: {
      tier: 'Manual',
      score: 100,
      suggestedAngle: prompt
    },
    validation: {
      contentType: '사용자 입력'
    },
    manualBrief: {
      topic,
      prompt,
      channelName,
      audience: values.audience?.trim(),
      tone: values.tone?.trim(),
      cardCount
    },
    cardCount,
    evidence: [],
    sampleTitles: [],
    sources: ['manual']
  };
}

function hashString(value) {
  let result = 0;
  for (let index = 0; index < value.length; index += 1) result = (result * 31 + value.charCodeAt(index)) >>> 0;
  return result.toString(36);
}

function PlanGrid({ plan, queue, cached }) {
  return <div className="grid gap-4 lg:grid-cols-[1fr_320px]"><div className="space-y-4"><PlanSummary plan={plan} cached={cached} /><HookList titles={plan.hookTitles} /><PublishPackage plan={plan} /><QualityPanel plan={plan} /><CardPreview cards={plan.cards} /></div><Card><CardHeader><CardDescription>Queue</CardDescription><CardTitle>제작 대기열</CardTitle></CardHeader><CardContent className="space-y-2">{queue.map((item) => <div key={item.id} className="rounded-lg border bg-slate-50 p-3"><strong>{item.label}</strong><p className="text-xs text-muted-foreground">{item.production?.tier ?? item.validation?.contentType}</p></div>)}</CardContent></Card></div>;
}

function PlanSummary({ plan, cached }) {
  return (
    <Card>
      <CardHeader>
        <CardDescription>Creative Brief · {plan.provider}{cached ? ' · 저장본' : ''}</CardDescription>
        <CardTitle>{plan.coreAngle}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">{plan.summary}</p>
        <div className="flex flex-wrap gap-1.5">
          <Badge variant="secondary">타깃 {plan.targetAudience}</Badge>
          {plan.referenceStyle ? <Badge variant="outline">레퍼런스 {referenceLabel(plan.referenceStyle)}</Badge> : null}
        </div>
        <Blueprint items={plan.carouselBlueprint} />
        <NoteList title="주의할 표현" items={plan.riskNotes} />
        <NoteList title="활용 근거" items={plan.sourceNotes} />
      </CardContent>
    </Card>
  );
}

function HookList({ titles }) {
  return <Card><CardHeader><CardDescription>Hooks</CardDescription><CardTitle>후킹 제목 후보</CardTitle></CardHeader><CardContent className="grid gap-2">{titles.map((title, index) => <div key={`${index}-${title}`} className="rounded-lg border bg-white p-3"><span className="text-xs font-black text-slate-500">HOOK {index + 1}</span><strong className="block">{title}</strong></div>)}</CardContent></Card>;
}

function PublishPackage({ plan }) {
  if (!plan.captionFirstLine && !plan.captionBody && !plan.hashtags?.length) return null;
  return (
    <Card>
      <CardHeader>
        <CardDescription>Publish Package</CardDescription>
        <CardTitle>게시 문구 패키지</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {plan.captionFirstLine ? <div className="rounded-lg border bg-white p-3"><span className="text-xs font-black text-slate-500">첫 줄</span><strong className="mt-1 block">{plan.captionFirstLine}</strong></div> : null}
        {plan.captionBody ? <div className="whitespace-pre-line rounded-lg border bg-slate-50 p-3 text-sm font-semibold leading-6 text-slate-700">{plan.captionBody}</div> : null}
        {plan.captionCTA ? <div className="rounded-lg border border-indigo-100 bg-indigo-50 p-3 text-sm font-black text-indigo-700">{plan.captionCTA}</div> : null}
        {plan.hashtags?.length ? <div className="flex flex-wrap gap-1.5">{plan.hashtags.map((tag) => <Badge key={tag} variant="outline">{tag}</Badge>)}</div> : null}
      </CardContent>
    </Card>
  );
}

function QualityPanel({ plan }) {
  const quality = evaluateCardNewsPlan(plan);
  return (
    <Card>
      <CardHeader>
        <CardDescription>Reference QA</CardDescription>
        <CardTitle className="flex items-center justify-between gap-3">카드뉴스 품질 점검 <Badge variant={quality.score >= 80 ? 'default' : 'destructive'}>{quality.label} {quality.score}</Badge></CardTitle>
      </CardHeader>
      <CardContent className="grid gap-2 md:grid-cols-2">
        {quality.checks.map((item) => (
          <div key={item.label} className={`rounded-lg border p-2 text-xs font-bold ${item.passed ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'}`}>
            <span>{item.passed ? '✓' : '!'}</span> {item.label}
            {item.detail ? <span className="ml-1 opacity-70">({item.detail})</span> : null}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function CardPreview({ cards }) {
  return (
    <Card>
      <CardHeader><CardDescription>Storyboard</CardDescription><CardTitle>카드 구성 미리보기</CardTitle></CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <div key={card.page} className="rounded-lg border bg-white p-2 shadow-sm">
            <div className="aspect-[4/5] rounded-md border bg-slate-50 p-4">
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge variant="outline">Card {card.page}</Badge>
                <Badge variant="secondary">{roleLabel(card.role)}</Badge>
              </div>
              <strong className="mt-5 block text-2xl font-black leading-tight tracking-normal">{card.title}</strong>
              {card.emphasis ? <p className="mt-2 text-xs font-black text-indigo-600">{card.emphasis}</p> : null}
              <p className="mt-5 whitespace-pre-line text-[15px] font-semibold leading-6 text-slate-700">{formatCardText(card.body)}</p>
              {card.sourceLine ? <p className="mt-5 border-t pt-2 text-[11px] font-bold leading-4 text-slate-400">{card.sourceLine}</p> : null}
            </div>
            {(card.insight || card.action) ? (
              <details className="mt-2 rounded-md bg-white px-2 py-1.5 text-xs text-slate-600">
                <summary className="cursor-pointer font-black text-slate-500">기획 메모</summary>
                <div className="mt-2 grid gap-1.5">
                  {card.layout ? <span>레이아웃: {layoutLabel(card.layout)}</span> : null}
                  {card.visualPrompt ? <span>시각화: {card.visualPrompt}</span> : null}
                  {card.dataPoint ? <span>참고: {card.dataPoint}</span> : null}
                  {card.insight ? <span>해석: {card.insight}</span> : null}
                  {card.action ? <span>실행: {card.action}</span> : null}
                </div>
              </details>
            ) : null}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function Blueprint({ items }) {
  if (!items?.length) return null;
  return (
    <div>
      <div className="mb-1 text-xs font-black text-slate-500">카드 흐름</div>
      <div className="grid gap-1.5">
        {items.slice(0, 9).map((item, index) => (
          <div key={`${index}-${item}`} className="flex gap-2 rounded-md bg-slate-50 px-2 py-1.5 text-xs font-semibold text-slate-600">
            <span className="shrink-0 font-black text-slate-400">{String(index + 1).padStart(2, '0')}</span>
            <span>{item}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function NoteList({ title, items }) {
  if (!items?.length) return null;
  return <div><div className="mb-1 text-xs font-black text-slate-500">{title}</div><div className="flex flex-wrap gap-1.5">{items.slice(0, 5).map((item, index) => <Badge key={`${title}-${index}`} variant="outline">{item}</Badge>)}</div></div>;
}

function LoadingBox() {
  return <div className="flex items-center gap-2 rounded-lg border border-dashed p-5 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />LLM이 콘텐츠 기획안을 작성하는 중입니다.</div>;
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

function layoutLabel(value) {
  return {
    cover_photo: '사진 표지',
    cover_text: '텍스트 표지',
    handwritten_research: '리서치 노트',
    comparison_board: '비교 보드',
    data_chart: '데이터 차트',
    quote_card: '반응/인용',
    checklist: '체크리스트'
  }[value] ?? value;
}

function referenceLabel(value) {
  return {
    handdrawn_research: '리서치 노트형',
    photo_hook: '사진 후크형',
    magazine_story: '매거진형',
    meme_factcheck: '밈 팩트체크형'
  }[value] ?? value;
}

function normalizeChannelName(value) {
  const text = `${value ?? ''}`.trim();
  if (!text) return '@trlab.insight';
  return text.startsWith('@') ? text : `@${text}`;
}

function useContentPlan(studio, contentPlans, setContentPlans) {
  const key = studio?.id;
  const [state, setState] = useState({ loading: false, error: '', cached: false });
  useEffect(() => {
    if (!studio || contentPlans[key]) return;
    let active = true;
    setState({ loading: true, error: '', cached: false });
    createContentPlan(studio)
      .then((data) => { if (active) { setContentPlans((plans) => ({ ...plans, [key]: data.plan })); setState({ loading: false, error: '', cached: Boolean(data.cached) }); } })
      .catch((error) => active && setState({ loading: false, error: error.message, cached: false }));
    return () => { active = false; };
  }, [studio, key, contentPlans, setContentPlans]);
  return { plan: contentPlans[key], ...state };
}
