import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Loader2, PencilLine, Send, Trash2, X } from 'lucide-react';
import { Badge } from '@/core/TrLab/Components/Desktop/Atoms/TrLab/Common/Badge/Badge';
import { Button } from '@/core/TrLab/Components/Desktop/Atoms/TrLab/Common/Button/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/core/TrLab/Components/Desktop/Atoms/TrLab/Common/Card';
import { formatCardText } from '@/lib/card-text';
import { StageHead } from '@/core/TrLab/Components/Desktop/Molecules/TrLab/Common';
import { createContentPlan } from '@/core/TrLab/modules/clients/api';

const DEFAULT_CARD_COUNT = 5;

export function StudioView({ studio, setView, setQueue }) {
  const [selectedTitle, setSelectedTitle] = useState('');
  const titleCandidates = useMemo(() => makeTitleCandidates(studio), [studio]);
  const selected = selectedTitle || titleCandidates[0] || studio?.label || '';

  useEffect(() => {
    setSelectedTitle(makeTitleCandidates(studio)[0] ?? '');
  }, [studio?.id]);

  const chooseTitle = () => {
    if (!studio) return;
    const title = (selected || studio.label || studio.keyword || '').trim();
    const nextStudio = {
      ...studio,
      selectedHookTitle: title,
      contentSetup: {
        ...(studio.contentSetup ?? {}),
        title,
        cardCount: studio.contentSetup?.cardCount ?? studio.cardCount ?? DEFAULT_CARD_COUNT
      }
    };
    setQueue((items = []) => {
      const rest = items.filter((item) => item?.id !== studio.id);
      return [nextStudio, ...rest];
    });
    setView('plan');
  };

  if (!studio) {
    return (
      <div className="space-y-5">
        <StageHead title="제목 후보 선택">
          <Button variant="outline" onClick={() => setView('dashboard')}><ArrowLeft className="h-4 w-4" />트렌드 감지로</Button>
          <Button onClick={() => setView('plan')}><PencilLine className="h-4 w-4" />직접 기획</Button>
        </StageHead>
        <Card>
          <CardContent className="p-6">
            <div className="rounded-lg border border-dashed p-6 text-sm font-semibold text-muted-foreground">검색 검증을 통과한 키워드를 먼저 선택하면 제목 후보를 고를 수 있습니다.</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <StageHead title={`${studio.label} 제목 선택`}>
        <Button variant="outline" onClick={() => setView('search')}><ArrowLeft className="h-4 w-4" />검증 근거로</Button>
        <Button onClick={chooseTitle} disabled={!selected.trim()}><Send className="h-4 w-4" />이 제목으로 기획</Button>
      </StageHead>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <Card className="border-indigo-200 bg-indigo-50/40">
          <CardHeader>
            <CardTitle>콘텐츠 제목 후보</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3">
              {titleCandidates.map((title, index) => (
                <button
                  key={`${index}-${title}`}
                  type="button"
                  className={[
                    'w-full rounded-lg border bg-white p-4 text-left transition',
                    selected === title ? 'border-indigo-400 ring-2 ring-indigo-100' : 'border-slate-200 hover:border-indigo-200'
                  ].join(' ')}
                  onClick={() => setSelectedTitle(title)}
                >
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <Badge variant={index === 0 ? 'default' : 'secondary'}>후보 {index + 1}</Badge>
                    <Badge variant="outline">{inferFormat(title)}</Badge>
                  </div>
                  <strong className="block break-words text-lg font-black leading-snug text-slate-950">{title}</strong>
                  <p className="mt-2 text-xs font-semibold leading-5 text-muted-foreground">{scoreTitle(title, studio)}</p>
                </button>
              ))}
            </div>
            <label className="grid gap-1.5">
              <span className="text-xs font-black text-slate-500">직접 수정</span>
              <input className="h-11 rounded-md border border-slate-200 bg-white px-3 text-sm font-black outline-none focus:border-indigo-400" value={selected} onChange={(event) => setSelectedTitle(event.target.value)} placeholder="선택할 콘텐츠 제목" />
            </label>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>선택 기준</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm font-semibold leading-6 text-slate-600">
            <InfoLine label="원본 키워드" value={studio.keyword ?? studio.label} />
            <InfoLine label="검색 검증" value={studio.searchVerification?.verification?.grade ?? studio.searchVerification?.grade ?? '검증 완료'} />
            <InfoLine label="제작 점수" value={`${studio.production?.score ?? studio.score ?? '-'}점`} />
            <InfoLine label="추천 포맷" value={inferFormat(selected)} />
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs font-semibold leading-5 text-slate-500">
              이 단계에서는 카드 본문을 만들지 않습니다. 검증된 키워드를 인스타 콘텐츠로 확장할 제목 하나만 고릅니다.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export function PlanView({ queue, studio, setView, setQueue, contentPlans, setContentPlans }) {
  const [manualState, setManualState] = useState({ loading: false, error: '' });
  const [manualOpen, setManualOpen] = useState(false);
  const [generationState, setGenerationState] = useState({ loading: false, error: '', cached: false });
  const [setup, setSetup] = useState(() => ({ cardCount: DEFAULT_CARD_COUNT, title: '' }));
  const titleCandidates = useMemo(() => makeTitleCandidates(studio), [studio]);
  const plan = studio?.id ? contentPlans[studio.id] : null;
  const loading = generationState.loading;
  const error = generationState.error;
  const cached = generationState.cached;
  useEffect(() => {
    setSetup({
      cardCount: studio?.contentSetup?.cardCount ?? studio?.cardCount ?? DEFAULT_CARD_COUNT,
      title: studio?.selectedHookTitle ?? studio?.contentSetup?.title ?? makeTitleCandidates(studio)[0] ?? ''
    });
    setGenerationState({ loading: false, error: '', cached: false });
  }, [studio?.id]);
  const updateCurrentPlan = useCallback((updater) => {
    if (!studio?.id) return;
    setContentPlans((plans) => {
      const current = plans[studio.id];
      if (!current) return plans;
      return { ...plans, [studio.id]: updater(current) };
    });
  }, [studio?.id, setContentPlans]);
  const createTrendPlan = async () => {
    if (!studio) return;
    const selectedHookTitle = (setup.title || titleCandidates[0] || studio.label || '').trim();
    setGenerationState({ loading: true, error: '', cached: false });
    try {
      const data = await createContentPlan({ ...studio, cardCount: Number(setup.cardCount) || DEFAULT_CARD_COUNT, selectedHookTitle }, { refresh: true });
      setContentPlans((plans) => ({ ...plans, [studio.id]: data.plan }));
      setGenerationState({ loading: false, error: '', cached: Boolean(data.cached) });
    } catch (error) {
      setGenerationState({ loading: false, error: error.message, cached: false });
    }
  };
  const createManualPlan = async (values) => {
    const manualStudio = makeManualStudio(values);
    setManualState({ loading: true, error: '' });
    try {
      const data = await createContentPlan(manualStudio, { refresh: true });
      setQueue((items = []) => [manualStudio, ...items.filter((item) => item?.id !== manualStudio.id)]);
      setContentPlans((plans) => ({ ...plans, [manualStudio.id]: data.plan }));
      setView('plan');
    } catch (error) {
      setManualState({ loading: false, error: error.message });
      return;
    }
    setManualState({ loading: false, error: '' });
  };
  if (!studio) {
    return (
      <div className="space-y-5">
        <StageHead title="직접 콘텐츠 설계">
          <Button variant="outline" onClick={() => setView('dashboard')}><ArrowLeft className="h-4 w-4" />트렌드 감지로</Button>
        </StageHead>
        <ManualBriefPanel onSubmit={createManualPlan} loading={manualState.loading} error={manualState.error} />
      </div>
    );
  }
  return (
    <div className="space-y-5">
      <StageHead title={`${studio.label} 콘텐츠 설계`}>
        <Button variant="outline" onClick={() => setView('studio')}><ArrowLeft className="h-4 w-4" />제목 선택으로</Button>
        <Button variant="outline" onClick={() => setManualOpen((value) => !value)}>{manualOpen ? <X className="h-4 w-4" /> : <PencilLine className="h-4 w-4" />}{manualOpen ? '직접 설계 닫기' : '직접 설계'}</Button>
        <Button onClick={() => setView('cardnews')} disabled={!plan}><Send className="h-4 w-4" />이미지 제작으로</Button>
      </StageHead>
      {manualOpen ? <ManualBriefPanel onSubmit={createManualPlan} loading={manualState.loading} error={manualState.error} compact /> : null}
      {loading && <LoadingBox />}
      {error && <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
      <PlanSetupPanel studio={studio} setup={setup} setSetup={setSetup} titleCandidates={titleCandidates} loading={loading} hasPlan={Boolean(plan)} onGenerate={createTrendPlan} />
      {plan && <PlanGrid plan={plan} queue={queue} cached={cached} updatePlan={updateCurrentPlan} removeFromQueue={(id) => setQueue((items = []) => items.filter((item) => item?.id !== id))} />}
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

function InfoLine({ label, value }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <span className="text-xs font-black text-slate-400">{label}</span>
      <strong className="mt-1 block break-words text-sm font-black text-slate-800">{value || '-'}</strong>
    </div>
  );
}

function inferFormat(title = '') {
  const text = `${title}`;
  if (/비교|차이|vs|VS|기준/.test(text)) return '비교형';
  if (/체크|준비|리스트|주의|조심/.test(text)) return '체크리스트형';
  if (/추천|순위|BEST|베스트/.test(text)) return '랭킹형';
  if (/비용|가격|계산|얼마/.test(text)) return '비용계산형';
  if (/왜|이유|뜰까|뜨는/.test(text)) return '해설형';
  return '저장형';
}

function scoreTitle(title, studio = {}) {
  const format = inferFormat(title);
  const score = Math.min(96, Math.max(72,
    74
    + (/체크|비교|추천|비용|주의|기준/.test(title) ? 8 : 0)
    + ((studio.searchVerification || studio.production?.score >= 75) ? 6 : 0)
    + (title.length <= 24 ? 4 : 0)
  ));
  return `${format} · 저장/공유 예상 ${score}점 · 계정 톤에 맞게 다음 단계에서 카드 구조만 생성`;
}

function PlanSetupPanel({ studio, setup, setSetup, titleCandidates, loading, hasPlan, onGenerate }) {
  const selectedTitle = setup.title || titleCandidates[0] || studio.label;
  const update = (patch) => setSetup((current) => ({ ...current, ...patch }));
  return (
    <Card className={hasPlan ? 'border-slate-200 bg-white' : 'border-indigo-200 bg-indigo-50/40'}>
      <CardHeader><CardTitle>기획 요청</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-[140px_minmax(0,1fr)]">
          <label className="grid gap-1.5">
            <span className="text-xs font-black text-slate-500">컷 수</span>
            <input className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm font-black outline-none focus:border-indigo-400" type="number" min="3" max="12" value={setup.cardCount} onChange={(event) => update({ cardCount: event.target.value })} />
          </label>
          <label className="grid gap-1.5">
            <span className="text-xs font-black text-slate-500">표지 제목</span>
            <input className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm font-black outline-none focus:border-indigo-400" value={selectedTitle} onChange={(event) => update({ title: event.target.value })} placeholder="표지 제목을 입력하세요" />
          </label>
        </div>
        <div>
          <div className="mb-2 text-xs font-black text-slate-500">제목 후보</div>
          <div className="flex flex-wrap gap-2">
            {titleCandidates.map((title, index) => (
              <Button key={`${index}-${title}`} size="sm" variant={selectedTitle === title ? 'default' : 'outline'} onClick={() => update({ title })}>
                {title}
              </Button>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs font-semibold leading-5 text-muted-foreground">표지 제목과 컷 수를 기준으로 카드 문구와 제작 연출을 함께 작성합니다.</p>
          <Button onClick={onGenerate} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {hasPlan ? '이 설정으로 다시 작성' : '기획안 작성'}
          </Button>
        </div>
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

function PlanGrid({ plan, queue, cached, updatePlan, removeFromQueue }) {
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <div className="space-y-4">
        <PlanSummary plan={plan} cached={cached} />
        <DesignControls plan={plan} updatePlan={updatePlan} />
        <PublishPackage plan={plan} />
        <CardPreview cards={plan.cards} />
        <ReferenceData plan={plan} />
      </div>
      <QueuePanel queue={queue} removeFromQueue={removeFromQueue} />
    </div>
  );
}

function QueuePanel({ queue, removeFromQueue }) {
  return (
    <Card>
      <CardHeader><CardTitle>제작 대기열</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        {queue.length ? queue.map((item) => (
          <div key={item.id} className="rounded-lg border bg-slate-50 p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <strong className="line-clamp-2 break-words">{item.label}</strong>
                <p className="mt-1 text-xs text-muted-foreground">{item.production?.tier ?? item.validation?.contentType}</p>
              </div>
              <Button size="sm" variant="outline" className="shrink-0" onClick={() => removeFromQueue(item.id)}>
                <Trash2 className="h-3.5 w-3.5" />
                제거
              </Button>
            </div>
          </div>
        )) : <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">대기 중인 후보가 없습니다.</div>}
      </CardContent>
    </Card>
  );
}

function PlanSummary({ plan, cached }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <CardTitle>{plan.coreAngle}</CardTitle>
          {cached ? <Badge variant="secondary">저장본</Badge> : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">{plan.summary}</p>
        <div className="flex flex-wrap gap-1.5">
          <Badge variant="secondary">타깃 {plan.targetAudience}</Badge>
          {plan.referenceStyle ? <Badge variant="outline">레퍼런스 {referenceLabel(plan.referenceStyle)}</Badge> : null}
        </div>
        <Blueprint items={plan.carouselBlueprint} />
        <NoteList title="주의할 표현" items={plan.riskNotes} />
      </CardContent>
    </Card>
  );
}

function DesignControls({ plan, updatePlan }) {
  const cards = plan.cards ?? [];
  const coverTitle = cards[0]?.title ?? '';
  const updateCards = (nextCards) => updatePlan((current) => ({
    ...current,
    cards: nextCards.map((card, index) => ({ ...card, page: index + 1 })),
    carouselBlueprint: nextCards.map((card, index) => current.carouselBlueprint?.[index] ?? `${index + 1}. ${card.title || roleLabel(card.role)}`)
  }));
  const setCardCount = (event) => {
    const count = Math.min(12, Math.max(3, Number(event.target.value) || cards.length || DEFAULT_CARD_COUNT));
    updateCards(resizeCards(cards, count));
  };
  const applyTitle = (title) => {
    const nextCards = cards.length ? [...cards] : resizeCards([], 3);
    nextCards[0] = { ...nextCards[0], title };
    updatePlan((current) => ({ ...current, selectedHookTitle: title, cards: nextCards }));
  };
  const updateCard = (index, patch) => updateCards(cards.map((card, cardIndex) => (cardIndex === index ? { ...card, ...patch } : card)));

  return (
    <Card>
      <CardHeader><CardTitle>카드 설계</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-[140px_minmax(0,1fr)]">
          <label className="grid gap-1.5">
            <span className="text-xs font-black text-slate-500">컷 수</span>
            <input className="h-10 rounded-md border border-slate-200 px-3 text-sm font-black outline-none focus:border-indigo-400" type="number" min="3" max="12" value={cards.length} onChange={setCardCount} />
          </label>
          <div className="grid gap-1.5">
            <span className="text-xs font-black text-slate-500">표지 제목</span>
            <input className="h-10 rounded-md border border-slate-200 px-3 text-sm font-black outline-none focus:border-indigo-400" value={coverTitle} onChange={(event) => applyTitle(event.target.value)} placeholder="표지 제목을 입력하세요" />
          </div>
        </div>
        {plan.hookTitles?.length ? (
          <div>
            <div className="mb-2 text-xs font-black text-slate-500">제목 후보</div>
            <div className="flex flex-wrap gap-2">
              {plan.hookTitles.map((title, index) => (
                <Button key={`${index}-${title}`} size="sm" variant={coverTitle === title ? 'default' : 'outline'} onClick={() => applyTitle(title)}>
                  후보 {index + 1}
                </Button>
              ))}
            </div>
          </div>
        ) : null}
        <div className="space-y-2">
          <div className="text-xs font-black text-slate-500">카드별 문구와 제작 연출</div>
          {cards.map((card, index) => (
            <div key={`${card.page}-${index}`} className="rounded-lg border bg-slate-50 p-3">
              <div className="mb-2 flex flex-wrap items-center gap-1.5">
                <Badge variant="outline">카드 {index + 1}</Badge>
              </div>
              <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                <div className="rounded-md border border-slate-200 bg-white p-3">
                  <div className="mb-2 text-xs font-black text-slate-500">카드 문구</div>
                  <input className="h-9 w-full rounded-md border border-slate-200 px-3 text-sm font-black outline-none focus:border-indigo-400" value={card.title ?? ''} onChange={(event) => updateCard(index, { title: event.target.value })} placeholder="카드 제목" />
                  <textarea className="mt-2 min-h-24 w-full resize-y rounded-md border border-slate-200 px-3 py-2 text-sm font-semibold leading-6 outline-none focus:border-indigo-400" value={formatCardText(card.body)} onChange={(event) => updateCard(index, { body: event.target.value })} placeholder="카드 본문" />
                </div>
                <div className="rounded-md border border-slate-200 bg-white p-3">
                  <div className="mb-2 text-xs font-black text-slate-500">제작 연출</div>
                  <textarea className="min-h-24 w-full resize-y rounded-md border border-slate-200 px-3 py-2 text-sm font-semibold leading-6 outline-none focus:border-indigo-400" value={card.visualPrompt ?? ''} onChange={(event) => updateCard(index, { visualPrompt: event.target.value })} placeholder="배경, 그림, 그래프, 표 구도" />
                  <input className="mt-2 h-9 w-full rounded-md border border-slate-200 px-3 text-xs font-bold outline-none focus:border-indigo-400" value={(card.visualItems ?? []).join(', ')} onChange={(event) => updateCard(index, { visualItems: event.target.value.split(',').map((item) => item.trim()).filter(Boolean) })} placeholder="시각 요소, 쉼표로 구분" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function resizeCards(cards = [], count) {
  const nextCards = cards.slice(0, count);
  while (nextCards.length < count) {
    const page = nextCards.length + 1;
    const isLast = page === count;
    nextCards.push({
      page,
      role: isLast ? 'checklist' : 'content_angle',
      layout: isLast ? 'checklist' : 'quote_card',
      title: isLast ? '저장 전 체크' : `카드 ${page} 제목`,
      body: isLast ? '지금 확인할 것\n비교할 것\n저장할 것' : '핵심 내용을 입력하세요.',
      emphasis: '',
      sourceLine: '',
      visualPrompt: '',
      visualItems: []
    });
  }
  return nextCards.map((card, index) => ({ ...card, page: index + 1 }));
}

function PublishPackage({ plan }) {
  if (!plan.captionFirstLine && !plan.captionBody && !plan.hashtags?.length) return null;
  return (
    <Card>
      <CardHeader>
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

function CardPreview({ cards }) {
  return (
    <Card>
      <CardHeader><CardTitle>카드 구성 미리보기</CardTitle></CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <div key={card.page} className="rounded-lg border bg-white p-2 shadow-sm">
            <div className="aspect-[4/5] rounded-md border bg-slate-50 p-4">
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge variant="outline">카드 {card.page}</Badge>
              </div>
              <strong className="mt-5 block text-2xl font-black leading-tight tracking-normal">{card.title}</strong>
              <p className="mt-5 whitespace-pre-line text-[15px] font-semibold leading-6 text-slate-700">{formatCardText(card.body)}</p>
              {card.visualPrompt ? <p className="mt-4 rounded-md bg-white/80 p-2 text-[11px] font-bold leading-4 text-slate-500">{card.visualPrompt}</p> : null}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function ReferenceData({ plan }) {
  const items = [
    ...(plan.sourceNotes ?? []).map((value) => ({ label: '근거', value })),
    ...(plan.cards ?? []).flatMap((card, index) => [
      card.sourceLine ? { label: `카드 ${index + 1} 출처`, value: card.sourceLine } : null,
      card.dataPoint ? { label: `카드 ${index + 1} 참고`, value: card.dataPoint } : null
    ]).filter(Boolean)
  ].filter((item) => item.value);
  if (!items.length) return null;
  return (
    <details className="rounded-lg border bg-white p-4 text-sm">
      <summary className="cursor-pointer font-black text-slate-600">참고 데이터</summary>
      <div className="mt-3 grid gap-2">
        {items.slice(0, 12).map((item, index) => (
          <div key={`${item.label}-${index}`} className="rounded-md bg-slate-50 px-3 py-2">
            <span className="text-xs font-black text-slate-400">{item.label}</span>
            <p className="mt-1 break-words text-xs font-semibold leading-5 text-slate-600">{item.value}</p>
          </div>
        ))}
      </div>
    </details>
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

function makeTitleCandidates(studio) {
  if (!studio) return [];
  const aiIdeas = [
    ...(studio.contentIdeas ?? []),
    ...(studio.aiAnalysis?.contentIdeas ?? [])
  ].map(cleanTitleCandidate).filter(Boolean);
  if (aiIdeas.length) return [...new Set(aiIdeas)].slice(0, 6);
  const label = cleanTitleCandidate(studio.label ?? studio.keyword ?? '이 주제');
  const intent = classifyStudioIntent(studio);
  const base = (() => {
    if (intent === 'parent_social_issue') {
      return [
        parentQuestionTitle(studio, '정말 괜찮을까'),
        inferParentSymptomQuestion(studio),
        '부모 탓으로 끝내면 안 돼요',
        `${label} 기준부터 볼게요`
      ];
    }
    if (intent === 'parent_safety_issue') {
      return [
        parentQuestionTitle(studio, '정말 괜찮을까'),
        `${parentProductSubject(studio)} 유해성분 괜찮을까`,
        `${parentProductSubject(studio)} 사도 될까`,
        '불안보다 기준부터 볼게요'
      ];
    }
    if (intent === 'consumer_product_marketing' || intent === 'pet_consumer_product') {
      return ['왜 이걸 사갈까', '예쁜 것보다 쓸모', '살 이유가 있을까', `${label} 살 이유`];
    }
    return ['이게 왜 떴을까', '혼자 보면 착시', '사람들이 멈춘 이유', `${label} 지금 볼 이유`];
  })();
  return [...new Set(base.map(cleanTitleCandidate).filter(Boolean))].slice(0, 5);
}

function cleanTitleCandidate(value) {
  return `${value ?? ''}`.replace(/\s+/g, ' ').trim().slice(0, 26);
}

function classifyStudioIntent(studio = {}) {
  const text = collectStudioIntentText(studio);
  const parenting = /육아|부모|엄마|아빠|맘|워킹맘|아이|아기|신생아|유아|어린이|어린이집|유치원|등원|하원|돌봄|첫돌|소아|키즈/.test(text);
  const safety = /환경호르몬|유해|성분|안전|독성|검출|리콜|욕조|젖병|기저귀|장난감|카시트|유모차|아기용품/.test(text);
  const social = /등원|하원|어린이집|유치원|돌봄|지원|급여|제도|정부|기업|명단|워킹맘|일·가정|양립|감기|아픈|맘충|첫돌|출근|육아휴직/.test(text);
  const product = /쇼핑|추천템|생활|상품|제품|브랜드|아마존|틱톡|품절|구매|소비|템|장바구니|편의점|육아템|펫|용품|장난감|간식|자동|급식기|텀블러|매출|판매/.test(text);
  const pet = /반려|강아지|고양이|펫|집사|산책|사료|간식|동물병원/.test(text);
  if (parenting && safety) return 'parent_safety_issue';
  if (parenting && social) return 'parent_social_issue';
  if (pet && product) return 'pet_consumer_product';
  if (product) return 'consumer_product_marketing';
  return 'general_trend_context';
}

function collectStudioIntentText(studio = {}) {
  return [
    studio.label,
    studio.keyword,
    studio.category,
    studio.summary,
    studio.production?.suggestedAngle,
    studio.validation?.contentType,
    studio.aiAnalysis?.summary,
    ...(studio.sampleTitles ?? []),
    ...(studio.evidence ?? []).map((item) => (typeof item === 'string' ? item : item?.title ?? item?.text ?? item?.label ?? '')),
    ...(studio.searchVerification?.verification?.keyFindings ?? [])
  ].filter(Boolean).join(' ');
}

function parentQuestionTitle(studio, suffix) {
  const text = collectStudioIntentText(studio);
  if (/감기|아픈|열나|기침/.test(text)) return '감기 걸리면 어린이집 보내면 안 될까';
  if (/첫돌|돌 전|돌전|0세|영아/.test(text)) return '첫돌 전 어린이집 정말 괜찮을까';
  if (/등원|하원|어린이집|유치원/.test(text)) return `어린이집 등원, ${suffix}`;
  if (/환경호르몬|유해|성분|욕조/.test(text)) return `${parentProductSubject(studio)} ${suffix}`;
  const label = cleanTitleCandidate(studio.label ?? studio.keyword ?? '이 문제');
  return `${label} ${suffix}`;
}

function inferParentSymptomQuestion(studio) {
  const text = collectStudioIntentText(studio);
  if (/감기|아픈|열나|기침/.test(text)) return '감기 걸리면 어린이집 보내면 안 될까';
  if (/첫돌|돌 전|돌전|0세|영아/.test(text)) return '첫돌 전 어린이집 정말 괜찮을까';
  return '어린이집 등원 기준, 어디까지 괜찮을까';
}

function parentProductSubject(studio) {
  const text = collectStudioIntentText(studio);
  if (/욕조/.test(text)) return '아기 욕조';
  if (/장난감/.test(text)) return '아이 장난감';
  if (/젖병/.test(text)) return '젖병';
  if (/기저귀/.test(text)) return '기저귀';
  const label = cleanTitleCandidate(studio.label ?? studio.keyword ?? '아기 제품');
  return label.length > 12 ? '아기 제품' : label;
}
