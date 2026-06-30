import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ClipboardList, Copy, Image, Loader2, PencilLine, Search, Send, Trash2, X } from 'lucide-react';
import { Badge } from '@/core/TrLab/Components/Desktop/Atoms/TrLab/Common/Badge/Badge';
import { Button } from '@/core/TrLab/Components/Desktop/Atoms/TrLab/Common/Button/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/core/TrLab/Components/Desktop/Atoms/TrLab/Common/Card';
import { formatCardText } from '@/lib/card-text';
import { GenerationOverlay, NoticeToast } from '@/core/TrLab/Components/Desktop/Molecules/TrLab/GenerationFeedback';
import { StageHead } from '@/core/TrLab/Components/Desktop/Molecules/TrLab/Common';
import { useContentPlanController } from '@/core/TrLab/modules/controller/content-plan/useContentPlanController';

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
      <div className="space-y-5 rounded-lg border bg-white p-5 shadow-sm">
        <WorkflowHeader
          eyebrow="Studio"
          title="콘텐츠 제작실"
          description="직접 브리프를 입력해 카드뉴스 기획을 시작합니다."
        >
          <Button variant="outline" onClick={() => setView('planning')}><ArrowLeft className="h-4 w-4" />기획</Button>
          <Button onClick={() => setView('plan')}><PencilLine className="h-4 w-4" />직접 기획</Button>
        </WorkflowHeader>
        <div className="rounded-lg border border-dashed bg-slate-50 p-8 text-sm font-semibold leading-6 text-slate-500">
          직접 기획을 시작하면 제목 후보와 제작 플로우가 열립니다.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <WorkflowHeader
        eyebrow="Title Lab"
        title={`${studio.label} 제작 방향 선택`}
        description="후크 제목을 먼저 확정하면 다음 단계에서 카드 구성, 이미지 지시, 게시 원고를 한 번에 생성합니다."
      >
        <Button variant="outline" onClick={() => setView('planning')}><ArrowLeft className="h-4 w-4" />기획</Button>
        <Button onClick={chooseTitle} disabled={!selected.trim()}><Send className="h-4 w-4" />기획으로 이동</Button>
      </WorkflowHeader>

      <WorkflowSteps current="title" />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="rounded-lg border bg-white p-4 shadow-sm">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Hook candidates</span>
              <h2 className="mt-1 text-xl font-semibold tracking-normal text-slate-950">제목 후보</h2>
            </div>
            <Badge variant="secondary">{titleCandidates.length}개 후보</Badge>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {titleCandidates.map((title, index) => (
              <button
                key={`${index}-${title}`}
                type="button"
                className={[
                  'min-h-[168px] rounded-lg border p-4 text-left transition',
                  selected === title ? 'border-slate-300 bg-slate-50 shadow-sm ring-2 ring-slate-100' : 'border-slate-200 bg-slate-50 hover:border-slate-200 hover:bg-white'
                ].join(' ')}
                onClick={() => setSelectedTitle(title)}
              >
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <Badge variant={index === 0 ? 'default' : 'secondary'}>{titleTypeLabel(index)}</Badge>
                  <Badge variant="outline">{inferFormat(title)}</Badge>
                </div>
                <strong className="block break-keep text-lg font-semibold leading-snug text-slate-950 [overflow-wrap:anywhere]">{title}</strong>
                <p className="mt-3 text-xs font-semibold leading-5 text-slate-500">{scoreTitle(title, studio)}</p>
              </button>
            ))}
          </div>
          <label className="mt-4 grid gap-1.5">
            <span className="text-xs font-semibold text-slate-500">직접 수정</span>
            <input className="h-12 rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold outline-none focus:border-slate-400" value={selected} onChange={(event) => setSelectedTitle(event.target.value)} placeholder="선택할 콘텐츠 제목" />
          </label>
        </section>

        <aside className="space-y-3">
          <StudioSnapshot studio={studio} selected={selected} />
          <div className="rounded-lg border bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900"><ClipboardList className="h-4 w-4 text-slate-500" />선택 후 생성되는 것</div>
            <div className="mt-3 grid gap-2 text-xs font-bold leading-5 text-slate-600">
              <div className="rounded-md bg-slate-50 p-2">카드별 제목, 본문, 강조 문구</div>
              <div className="rounded-md bg-slate-50 p-2">배경/제품/데이터 시각화 제작 지시</div>
              <div className="rounded-md bg-slate-50 p-2">게시 원고와 해시태그 패키지</div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

export function PlanView({ queue, studio, setView, setQueue, contentPlans, setContentPlans, updateCurrentWork }) {
  const titleCandidates = useMemo(() => makeTitleCandidates(studio), [studio]);
  const contentBrief = studio?.contentBrief ?? studio?.contentSetup?.contentBrief ?? null;
  const plan = studio?.id ? contentPlans[studio.id] : null;
  const {
    setup,
    setSetup,
    loading,
    error,
    cached,
    dismissGenerationError,
    createTrendPlan
  } = useContentPlanController({
    studio,
    titleCandidates,
    setQueue,
    setView,
    setContentPlans,
    updateCurrentWork,
    defaultCardCount: DEFAULT_CARD_COUNT
  });
  const updateCurrentPlan = useCallback((updater) => {
    if (!studio?.id) return;
    setContentPlans((plans) => {
      const current = plans[studio.id];
      if (!current) return plans;
      return { ...plans, [studio.id]: updater(current) };
    });
  }, [studio?.id, setContentPlans]);
  if (!studio) {
    return (
      <div className="space-y-5">
        <StageHead title="AI 추천 결과">
          <Button variant="outline" onClick={() => setView('planning')}><ArrowLeft className="h-4 w-4" />기획으로</Button>
        </StageHead>
        <div className="rounded-lg border bg-white p-8 text-sm font-semibold leading-6 text-slate-500 shadow-sm">
          먼저 기획 화면에서 주제와 독자를 입력하고 AI 추천을 생성해 주세요.
        </div>
      </div>
    );
  }
  return (
    <div className="space-y-5">
      <GenerationOverlay
        open={loading}
        title="기획 내용을 카드에 배치하고 있어요"
        description="확정된 컷 흐름을 유지한 채 제목, 본문, 시각 지시 영역에 나눠 담습니다."
      />
      <NoticeToast
        title="기획 배치 실패"
        message={error}
        onClose={dismissGenerationError}
      />
      <WorkflowHeader
        eyebrow="설계"
        title="콘텐츠 설계"
        description="기획에서 확정한 컷 수와 템플릿은 유지하고, 표지 제목과 카드별 구성을 확정합니다."
      >
        <Button variant="outline" onClick={() => setView('planning')}><ArrowLeft className="h-4 w-4" />기획 수정</Button>
      </WorkflowHeader>
      {loading && <LoadingBox />}
      {error && <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
      {!plan && !loading ? <PlanSetupPanel studio={studio} contentBrief={contentBrief} setup={setup} setSetup={setSetup} titleCandidates={titleCandidates} loading={loading} onGenerate={createTrendPlan} /> : null}
      {plan ? <PlanRecommendationReview plan={plan} studio={studio} cached={cached} updatePlan={updateCurrentPlan} onConfirm={() => setView('cardnews')} /> : null}
    </div>
  );
}

function PlanRecommendationReview({ plan, studio, cached, updatePlan, onConfirm }) {
  const cards = plan.cards ?? [];
  const coverTitle = cards[0]?.title ?? plan.hookTitles?.[0] ?? '';
  const recommendationTitle = recommendationDisplayTitle(plan, studio);
  const scenarioOptions = useMemo(() => makeScenarioFlowOptions(plan), [plan]);
  const initialScenarioId = plan.selectedScenarioFlowId || scenarioOptions[0]?.id || '';
  const initialScenario = scenarioOptions.find((option) => option.id === initialScenarioId) || scenarioOptions[0];
  const [titleChosen, setTitleChosen] = useState(Boolean(plan.selectedHookTitle));
  const [scenarioFinalized, setScenarioFinalized] = useState(Boolean(plan.scenarioFinalized));
  const [selectedScenarioId, setSelectedScenarioId] = useState(initialScenarioId);
  const [scenarioDraft, setScenarioDraft] = useState(initialScenario?.items ?? []);
  const applyTitle = (title) => {
    updatePlan((current) => {
      const nextCards = current.cards?.length ? [...current.cards] : [];
      if (nextCards[0]) nextCards[0] = { ...nextCards[0], title };
      return { ...current, selectedHookTitle: title, scenarioFinalized: false, cards: nextCards };
    });
    setTitleChosen(true);
    setScenarioFinalized(false);
  };
  const applyScenarioFlow = (option) => {
    setSelectedScenarioId(option.id);
    setScenarioDraft(option.items);
    setScenarioFinalized(false);
  };
  const updateScenarioDraft = (index, value) => {
    setScenarioDraft((items) => items.map((item, itemIndex) => (itemIndex === index ? value : item)));
    setScenarioFinalized(false);
  };
  const finalizeScenario = () => {
    const selectedOption = scenarioOptions.find((option) => option.id === selectedScenarioId) || scenarioOptions[0];
    const items = scenarioDraft.map((item) => item.trim()).filter(Boolean);
    if (!items.length) return;
    updatePlan((current) => ({
      ...current,
      selectedScenarioFlowId: selectedOption?.id,
      selectedScenarioFlowLabel: selectedOption?.label,
      scenarioFinalized: true,
      carouselBlueprint: items
    }));
    setScenarioFinalized(true);
  };

  return (
    <div className="grid gap-5">
      {titleChosen ? (
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <CardTitle>{recommendationTitle}</CardTitle>
              <div className="flex flex-wrap gap-1.5">
                {plan.generation?.provider ? <Badge variant="outline">{plan.generation.provider}</Badge> : null}
                {cached ? <Badge variant="secondary">저장본</Badge> : null}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {plan.generation?.source === 'fallback' ? (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-bold leading-6 text-red-700">
                {plan.generation.message || '기획 배치에 실패해 임시 배치안이 표시 중입니다.'}
              </div>
            ) : null}
            {plan.summary ? <p className="text-sm font-semibold leading-6 text-slate-600">{plan.summary}</p> : null}
            <div className="flex flex-wrap gap-1.5">
              {plan.targetAudience ? <Badge variant="secondary">대상 {plan.targetAudience}</Badge> : null}
              {plan.referenceStyle ? <Badge variant="outline">{referenceLabel(plan.referenceStyle)}</Badge> : null}
              {cards.length ? <Badge variant="outline">{cards.length}장</Badge> : null}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {titleChosen ? <TemplatePlanSummary plan={plan} /> : null}

      {(plan.hookTitles?.length || cards.length) ? (
        <Card>
          <CardHeader><CardTitle>1. 표지 제목 확정</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <label className="grid gap-1.5">
              <span className="text-xs font-semibold text-slate-500">표지 제목 직접 입력</span>
              <input
                className="h-11 rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 outline-none focus:border-slate-400"
                value={coverTitle}
                onChange={(event) => applyTitle(event.target.value)}
                placeholder="첫 카드에 들어갈 제목을 입력하세요"
              />
            </label>
            {plan.hookTitles?.length ? (
              <div className="grid gap-3 md:grid-cols-3">
              {plan.hookTitles.slice(0, 6).map((title, index) => (
              <button
                key={`${index}-${title}`}
                type="button"
                onClick={() => applyTitle(title)}
                className={[
                  'min-h-28 rounded-lg border p-4 text-left transition',
                  coverTitle === title ? 'border-slate-300 bg-slate-50 ring-2 ring-slate-100' : 'border-slate-200 bg-slate-50 hover:border-slate-200 hover:bg-white'
                ].join(' ')}
              >
                <Badge variant={index === 0 ? 'default' : 'outline'}>{titleTypeLabel(index)}</Badge>
                <strong className="mt-3 block break-keep text-base font-semibold leading-snug text-slate-950 [overflow-wrap:anywhere]">{title}</strong>
              </button>
              ))}
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {titleChosen && scenarioOptions.length ? (
        <Card>
          <CardHeader><CardTitle>2. 카드 배치 확인/수정</CardTitle></CardHeader>
          <CardContent className="grid gap-3 lg:grid-cols-2">
            {scenarioOptions.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => applyScenarioFlow(option)}
                className={[
                  'rounded-lg border p-4 text-left transition',
                  selectedScenarioId === option.id ? 'border-slate-300 bg-slate-50 ring-2 ring-slate-100' : 'border-slate-200 bg-slate-50 hover:border-slate-200 hover:bg-white'
                ].join(' ')}
              >
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <Badge variant={selectedScenarioId === option.id ? 'default' : 'outline'}>{option.label}</Badge>
                  <span className="text-xs font-semibold text-slate-400">{option.items.length}단계</span>
                </div>
                <p className="text-sm font-bold leading-6 text-slate-700">{option.summary}</p>
                <div className="mt-3 grid gap-1.5">
                  {option.items.slice(0, 4).map((item, index) => (
                    <div key={`${option.id}-${index}-${item}`} className="flex gap-2 rounded-md bg-white/75 px-2 py-1.5 text-xs font-semibold leading-5 text-slate-600">
                      <span className="shrink-0 font-semibold text-indigo-500">{String(index + 1).padStart(2, '0')}</span>
                      <span>{item}</span>
                    </div>
                  ))}
                  {option.items.length > 4 ? <div className="text-xs font-semibold text-slate-400">+ {option.items.length - 4}단계 더 보기</div> : null}
                </div>
              </button>
            ))}
            <div className="rounded-lg border border-dashed bg-white p-4 lg:col-span-2">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="text-xs font-semibold text-slate-500">선택한 시나리오 직접 수정</div>
                  <p className="mt-1 text-xs font-semibold text-slate-400">기획 흐름을 카드별 문장으로 다듬은 뒤 배치를 확정하세요.</p>
                </div>
                <Badge variant="secondary">{scenarioDraft.length}단계</Badge>
              </div>
              <div className="grid gap-2">
                {scenarioDraft.map((item, index) => (
                  <label key={`${selectedScenarioId}-${index}`} className="grid gap-1.5 rounded-lg border bg-slate-50 p-3">
                    <span className="text-xs font-semibold text-slate-500">{String(index + 1).padStart(2, '0')}</span>
                    <textarea
                      className="min-h-16 resize-y rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-bold leading-6 text-slate-700 outline-none focus:border-slate-400"
                      value={item}
                      onChange={(event) => updateScenarioDraft(index, event.target.value)}
                    />
                  </label>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {scenarioFinalized ? (
        <Card>
          <CardHeader><CardTitle>3. 카드 배치 결과</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="mb-2 text-xs font-semibold text-slate-600">확정된 시나리오</div>
              <div className="grid gap-2 md:grid-cols-2">
                {scenarioDraft.map((item, index) => (
                  <div key={`final-scenario-${index}-${item}`} className="rounded-lg bg-white/80 p-3">
                    <span className="text-xs font-semibold text-slate-500">{String(index + 1).padStart(2, '0')}</span>
                    <p className="mt-1 text-sm font-bold leading-6 text-slate-700">{item}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {cards.map((card, index) => (
                <div key={`${card.page}-${index}`} className="rounded-lg border bg-white p-4 shadow-sm">
                  <div className="mb-3 flex flex-wrap items-center gap-1.5">
                    <Badge variant="outline">카드 {index + 1}</Badge>
                    {card.role ? <Badge variant="secondary">{roleLabel(card.role)}</Badge> : null}
                  </div>
                  <strong className="block break-keep text-lg font-semibold leading-snug text-slate-950 [overflow-wrap:anywhere]">{card.title}</strong>
                  <p className="mt-3 whitespace-pre-line text-sm font-semibold leading-6 text-slate-600">{formatCardText(card.body)}</p>
                  {card.visualPrompt ? <p className="mt-3 rounded-md bg-slate-50 p-2 text-xs font-bold leading-5 text-slate-500">{card.visualPrompt}</p> : null}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}
      <div className="sticky bottom-4 z-10 rounded-lg border bg-white/95 p-4 shadow-lg backdrop-blur">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <strong className="text-sm font-semibold text-slate-950">{scenarioFinalized ? '이 배치로 제작 단계로 갈까요?' : titleChosen ? '카드 배치를 확정할까요?' : '먼저 제목을 선택해 주세요.'}</strong>
            <p className="mt-1 text-xs font-semibold text-slate-500">{scenarioFinalized ? '다음 단계에서 레퍼런스, 캐릭터, 배경 에셋을 만듭니다.' : '기획 흐름을 확인한 뒤 카드 배치를 확정하세요.'}</p>
          </div>
          {scenarioFinalized ? (
            <Button onClick={onConfirm}><Image className="h-4 w-4" />이 결과로 제작 단계 이동</Button>
          ) : (
            <Button onClick={finalizeScenario} disabled={!titleChosen || !scenarioDraft.some((item) => item.trim())}>
              <Send className="h-4 w-4" />배치 확정
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function TemplatePlanSummary({ plan }) {
  const setup = plan?.contentSetup ?? {};
  const production = setup.templateProduction ?? plan?.templateProduction;
  const cardPlan = setup.templateCardPlan ?? plan?.templateCardPlan ?? [];
  const settings = setup.templateSettings ?? plan?.templateSettings ?? {};
  if (!production?.groups?.length && !cardPlan.length && !Object.keys(settings).length) return null;
  return (
    <Card>
      <CardHeader><CardTitle>템플릿 제작 기준</CardTitle></CardHeader>
      <CardContent className="grid gap-4 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <div>
          <div className="mb-2 flex flex-wrap gap-1.5">
            {setup.templateLabel ? <Badge variant="secondary">{setup.templateLabel}</Badge> : null}
            {setup.templateCanvas ? <Badge variant="outline">{setup.templateCanvas}</Badge> : null}
            {setup.templateFormatSignal ? <Badge variant="outline">{setup.templateFormatSignal}</Badge> : null}
          </div>
          <div className="grid gap-2">
            {(production?.groups ?? []).map(([title, items]) => (
              <div key={title} className="rounded-lg bg-slate-50 p-3">
                <div className="text-xs font-semibold text-slate-700">{title}</div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {items.map((item) => {
                    const active = Array.isArray(settings?.[title]) && settings[title].includes(item);
                    return <span key={item} className={active ? 'rounded-full bg-slate-950 px-2 py-1 text-[11px] font-bold text-white' : 'rounded-full bg-white px-2 py-1 text-[11px] font-bold text-slate-600 ring-1 ring-slate-100'}>{item}</span>;
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div>
          <div className="mb-2 text-xs font-semibold text-slate-500">컷별 역할</div>
          <div className="grid gap-1.5">
            {cardPlan.slice(0, 8).map(([title, note], index) => (
              <div key={`${title}-${index}`} className="grid grid-cols-[32px_minmax(0,1fr)] gap-2 rounded-lg bg-slate-50 px-3 py-2">
                <div className="text-[11px] font-semibold text-slate-400">{index + 1}</div>
                <div>
                  <div className="text-xs font-semibold text-slate-800">{title}</div>
                  <div className="mt-0.5 text-[11px] font-semibold leading-4 text-slate-500">{note}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
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
              <span className="text-xs font-semibold text-slate-500">주제</span>
              <input className="h-10 rounded-md border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-slate-400" value={values.topic} onChange={update('topic')} placeholder="예: 30대 직장인을 위한 저속노화 식단" />
            </label>
            <label className="grid gap-1.5">
              <span className="text-xs font-semibold text-slate-500">컷 수</span>
              <input className="h-10 rounded-md border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-slate-400" type="number" min="3" max="12" value={values.cardCount} onChange={update('cardCount')} />
            </label>
          </div>
          <label className="grid gap-1.5">
            <span className="text-xs font-semibold text-slate-500">만들고 싶은 내용</span>
            <textarea className="min-h-28 resize-y rounded-md border border-slate-200 px-3 py-2 text-sm font-semibold leading-6 outline-none focus:border-slate-400" value={values.prompt} onChange={update('prompt')} placeholder="어떤 관점으로, 어떤 독자에게, 어떤 페이지 흐름으로 만들고 싶은지 자연어로 적어주세요." />
          </label>
          <label className="grid gap-1.5">
            <span className="text-xs font-semibold text-slate-500">채널명</span>
            <input className="h-10 rounded-md border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-slate-400" value={values.channelName} onChange={update('channelName')} placeholder="@my_channel" />
          </label>
          {!compact ? (
            <div className="grid gap-3 md:grid-cols-2">
              <label className="grid gap-1.5">
                <span className="text-xs font-semibold text-slate-500">대상 독자</span>
                <input className="h-10 rounded-md border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-slate-400" value={values.audience} onChange={update('audience')} placeholder="예: 인스타 저장형 정보를 좋아하는 20대 후반" />
              </label>
              <label className="grid gap-1.5">
                <span className="text-xs font-semibold text-slate-500">톤</span>
                <input className="h-10 rounded-md border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-slate-400" value={values.tone} onChange={update('tone')} placeholder="예: 친근하지만 근거 있는 말투" />
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
      <span className="text-xs font-semibold text-slate-400">{label}</span>
      <strong className="mt-1 block break-words text-sm font-semibold text-slate-800">{value || '-'}</strong>
    </div>
  );
}

function WorkflowHeader({ eyebrow, title, description, children }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <span className="text-xs font-medium uppercase tracking-[0.12em] text-slate-400">{eyebrow}</span>
          <h1 className="mt-2 break-keep text-xl font-semibold leading-tight tracking-normal text-slate-950 [overflow-wrap:anywhere]">{title}</h1>
          {description ? <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-slate-500">{description}</p> : null}
        </div>
        <div className="flex flex-wrap gap-2">{children}</div>
      </div>
    </section>
  );
}

function WorkflowSteps({ current }) {
  const steps = [
    { id: 'title', label: '제목 확정' },
    { id: 'plan', label: '10컷 설계' },
    { id: 'make', label: '제작 이동' }
  ];
  const currentIndex = Math.max(0, steps.findIndex((step) => step.id === current));
  return (
    <div className="grid gap-2 rounded-lg border bg-white p-3 shadow-sm md:grid-cols-3">
      {steps.map((step, index) => (
        <div
          key={step.id}
          className={[
            'flex min-h-12 items-center gap-3 rounded-lg border px-3 py-2',
            index <= currentIndex ? 'border-slate-200 bg-slate-50 text-slate-700' : 'border-slate-200 bg-slate-50 text-slate-500'
          ].join(' ')}
        >
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-white text-xs font-semibold shadow-sm">{index + 1}</span>
          <strong className="text-sm font-semibold">{step.label}</strong>
        </div>
      ))}
    </div>
  );
}

function StudioSnapshot({ studio, selected }) {
  return (
    <div className="rounded-lg border bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
        <Search className="h-4 w-4 text-slate-500" />
        선택 기준
      </div>
      <div className="grid gap-3 text-sm font-semibold leading-6 text-slate-600">
        <InfoLine label="원본 키워드" value={studio.keyword ?? studio.label} />
        <InfoLine label="제작 점수" value={`${studio.production?.score ?? studio.score ?? '-'}점`} />
        <InfoLine label="추천 포맷" value={inferFormat(selected)} />
      </div>
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

function titleTypeLabel(index) {
  return ['어그로형', '팩트형', '추천형'][index] ?? `추가 후보 ${index - 2}`;
}

function recommendationDisplayTitle(plan = {}, studio = {}) {
  const sourceLabel = studio.label || studio.keyword || plan.primaryTopic || '';
  const candidates = [
    plan.hookTitles?.[0],
    plan.cards?.[0]?.title,
    plan.coreAngle,
    plan.summary
  ].map((item) => `${item ?? ''}`.trim()).filter(Boolean);
  return candidates.find((item) => !isInputEchoTitle(item, sourceLabel)) || 'AI가 제안한 제작 방향';
}

function makeScenarioFlowOptions(plan = {}) {
  const cards = plan.cards ?? [];
  const baseItems = normalizeScenarioItems(plan.carouselBlueprint, cards);
  if (!baseItems.length) return [];
  const count = baseItems.length;
  const title = plan.hookTitles?.[0] || cards[0]?.title || '표지';
  return [
    {
      id: 'ai-recommended',
      label: 'AI 추천 흐름',
      summary: 'AI가 처음 구성한 카드 순서를 유지합니다.',
      items: baseItems
    },
    {
      id: 'empathy-first',
      label: '공감형 흐름',
      summary: '독자의 불안이나 상황을 먼저 건드린 뒤 기준으로 정리합니다.',
      items: fitScenarioItems([
        `${title}로 공감 후킹`,
        '독자가 겪는 막막함이나 반복 상황 제시',
        '왜 같은 문제가 반복되는지 원인 분리',
        '바로 적용할 판단 기준 제시',
        '저장할 체크리스트로 마무리'
      ], count, cards)
    },
    {
      id: 'fact-first',
      label: '정보형 흐름',
      summary: '감정보다 핵심 사실, 비교 기준, 적용 순서를 먼저 보여줍니다.',
      items: fitScenarioItems([
        `${title}로 핵심 정보 약속`,
        '먼저 알아야 할 사실 정리',
        '비교해야 보이는 기준 제시',
        '오해하기 쉬운 지점 분리',
        '실행 순서와 확인 포인트 정리'
      ], count, cards)
    },
    {
      id: 'recommendation-first',
      label: '추천형 흐름',
      summary: '독자가 바로 따라 할 수 있는 방법과 선택 기준을 앞세웁니다.',
      items: fitScenarioItems([
        `${title}로 결과 약속`,
        '가장 먼저 해볼 방법 제안',
        '상황별 선택 기준 분리',
        '실패를 줄이는 체크 포인트',
        '다음 행동으로 이어지는 마무리'
      ], count, cards)
    }
  ];
}

function normalizeScenarioItems(items = [], cards = []) {
  const fromBlueprint = (items ?? []).map((item) => `${item ?? ''}`.trim()).filter(Boolean);
  if (fromBlueprint.length) return fromBlueprint;
  return cards.map((card, index) => `${index + 1}. ${card.title || roleLabel(card.role)}`).filter(Boolean);
}

function fitScenarioItems(items, count, cards = []) {
  const desired = Math.max(1, count || items.length);
  const next = items.slice(0, desired);
  while (next.length < desired) {
    const card = cards[next.length];
    next.push(card?.title ? `${next.length + 1}. ${card.title}` : `${next.length + 1}. 추가 관점 정리`);
  }
  return next.map((item, index) => item.match(/^\d+[.)]/) ? item : `${index + 1}. ${item}`);
}

function isInputEchoTitle(value = '', source = '') {
  const normalizedValue = normalizeDisplayCompare(value);
  const normalizedSource = normalizeDisplayCompare(source);
  if (!normalizedValue || !normalizedSource) return false;
  if (normalizedValue === normalizedSource) return true;
  if (normalizedValue === `${normalizedSource}카드뉴스기획`) return true;
  return normalizedValue.startsWith(normalizedSource) && normalizedValue.length <= normalizedSource.length + 10;
}

function normalizeDisplayCompare(value = '') {
  return `${value}`.replace(/[\s,./!?'"“”‘’()[\]{}:;·_-]+/g, '').toLowerCase();
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

function PlanSetupPanel({ studio, contentBrief, setup, setSetup, titleCandidates, loading, onGenerate }) {
  const selectedTitle = setup.title || titleCandidates[0] || studio.label;
  const generation = contentBrief?.generation ?? {};
  const template = contentBrief?.template ?? {};
  const planning = contentBrief?.planning ?? {};
  const update = (patch) => setSetup((current) => ({ ...current, ...patch }));
  return (
    <Card className="border-slate-200 bg-slate-50/40">
      <CardHeader><CardTitle>기획 배치 전 확인</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 md:grid-cols-4">
          <InfoLine label="주제" value={generation.topic || studio.label} />
          <InfoLine label="형식" value={contentBrief?.format?.label || planning.formatLabel || planning.format} />
          <InfoLine label="컷 수" value={`${generation.cardCount || setup.cardCount || 0}컷`} />
          <InfoLine label="템플릿" value={template.label || studio.contentSetup?.templateLabel} />
        </div>
        {generation.contentDirection ? (
          <div className="rounded-lg border border-slate-200 bg-white p-3">
            <div className="text-xs font-semibold text-slate-400">전개 요청</div>
            <p className="mt-1 line-clamp-3 text-sm font-semibold leading-6 text-slate-700">{generation.contentDirection}</p>
          </div>
        ) : null}
        <div className="grid gap-3">
          <label className="grid gap-1.5">
            <span className="text-xs font-semibold text-slate-500">표지 제목 직접 입력</span>
            <input id="plan-setup-title" name="planSetupTitle" className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold outline-none focus:border-slate-400" value={selectedTitle} onChange={(event) => update({ title: event.target.value })} placeholder="표지 제목을 입력하세요" />
          </label>
        </div>
        <div>
          <div className="mb-2 text-xs font-semibold text-slate-500">제목 후보</div>
          <div className="flex flex-wrap gap-2">
            {titleCandidates.map((title, index) => (
              <Button key={`${index}-${title}`} size="sm" variant={selectedTitle === title ? 'default' : 'outline'} onClick={() => update({ title })}>
                {title}
              </Button>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs font-semibold leading-5 text-muted-foreground">컷 수와 흐름은 기획에서 정한 값을 유지합니다. 여기서는 표지 제목을 확정하고 기획 내용을 카드 요소에 배치합니다.</p>
          <Button onClick={onGenerate} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {`${generation.cardCount || setup.cardCount || ''}컷 기획 배치`}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function PlanGrid({ plan, queue, cached, updatePlan, removeFromQueue }) {
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <div className="space-y-4">
        <PlanSummary plan={plan} cached={cached} />
        <ProductionPackagePanel plan={plan} />
        <DesignControls plan={plan} updatePlan={updatePlan} />
        <PublishPackage plan={plan} />
        <CardPreview cards={plan.cards} />
        <ReferenceData plan={plan} />
      </div>
      <QueuePanel queue={queue} removeFromQueue={removeFromQueue} />
    </div>
  );
}

function ProductionPackagePanel({ plan }) {
  const brief = effectiveProductionBrief(plan);
  if (!brief) return null;
  const cards = plan.cards ?? [];
  const productCandidates = uniqueProductCandidates(cards);
  const pexelsQueries = uniqueQueries(plan);
  const packageText = makeProductionPackageText(plan, productCandidates, pexelsQueries);
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <CardTitle className="flex items-center gap-2"><ClipboardList className="h-5 w-5 text-slate-500" />제작 결과 패키지</CardTitle>
          <Button size="sm" variant="outline" onClick={() => navigator.clipboard?.writeText(packageText)}>
            <Copy className="h-3.5 w-3.5" />
            전체 복사
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-lg border bg-white p-4">
            <div className="mb-2 flex flex-wrap gap-1.5">
              {brief.contentCategory ? <Badge variant="secondary">{categoryLabel(brief.contentCategory)}</Badge> : null}
              {(brief.moodKeywords ?? []).slice(0, 4).map((item) => <Badge key={`mood-${item}`} variant="outline">{item}</Badge>)}
            </div>
            <span className="text-xs font-semibold text-slate-500">디자인 방향</span>
            <strong className="mt-1 block text-base leading-7 text-slate-950">{brief.designConcept}</strong>
            {brief.visualConsistency ? <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">{brief.visualConsistency}</p> : null}
          </div>
          <div className="rounded-lg border bg-slate-50 p-4">
            <span className="text-xs font-semibold text-slate-500">이미지/저작권 전략</span>
            <p className="mt-1 text-sm font-semibold leading-6 text-slate-700">{brief.assetStrategy}</p>
            {brief.imageGenerationPolicy ? <p className="mt-2 rounded-md bg-white p-2 text-xs font-bold leading-5 text-slate-500">{brief.imageGenerationPolicy}</p> : null}
          </div>
        </div>

        <div className="grid gap-3 lg:grid-cols-3">
          <ProductionMiniSection icon={<Image className="h-4 w-4" />} title="컬러/톤" items={[...(brief.palette ?? []), brief.typographyTone].filter(Boolean)} />
          <ProductionMiniSection icon={<Search className="h-4 w-4" />} title="Pexels 검색" items={pexelsQueries} copy />
          <ProductionMiniSection icon={<ClipboardList className="h-4 w-4" />} title="제품/이미지 후보" items={productCandidates.map((item) => `${item.name}${item.role ? ` · ${item.role}` : ''}`)} />
        </div>

        <div>
          <div className="mb-2 text-xs font-semibold text-slate-500">카드별 제작 지시</div>
          <div className="grid gap-2">
            {cards.map((card, index) => <CardProductionRow key={`${card.page}-${index}`} card={card} index={index} />)}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ProductionMiniSection({ icon, title, items = [], copy = false }) {
  const visible = items.filter(Boolean).slice(0, 6);
  if (!visible.length) return null;
  return (
    <div className="rounded-lg border bg-white p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">{icon}{title}</div>
        {copy ? <Button size="sm" variant="outline" onClick={() => navigator.clipboard?.writeText(visible.join('\n'))}><Copy className="h-3.5 w-3.5" /></Button> : null}
      </div>
      <div className="grid gap-1.5">
        {visible.map((item, index) => <div key={`${title}-${index}-${item}`} className="rounded-md bg-slate-50 px-2 py-1.5 text-xs font-bold leading-5 text-slate-600">{item}</div>)}
      </div>
    </div>
  );
}

function CardProductionRow({ card, index }) {
  const brief = card.visualBrief ?? {};
  return (
    <div className="grid gap-2 rounded-lg border bg-white p-3 lg:grid-cols-[72px_minmax(0,0.9fr)_minmax(0,1.1fr)]">
      <div>
        <Badge variant="outline">카드 {index + 1}</Badge>
        <div className="mt-2 text-[11px] font-semibold text-slate-400">{roleLabel(card.role)}</div>
      </div>
      <div className="min-w-0">
        <strong className="block break-words text-sm font-semibold leading-5 text-slate-900">{card.title}</strong>
        <p className="mt-1 line-clamp-2 whitespace-pre-line text-xs font-semibold leading-5 text-slate-600">{formatCardText(card.body)}</p>
      </div>
      <div className="min-w-0 rounded-md bg-slate-50 p-2">
        {brief.scenario || card.visualPrompt ? <p className="text-xs font-semibold leading-5 text-slate-700">{brief.scenario || card.visualPrompt}</p> : null}
        <div className="mt-1 flex flex-wrap gap-1.5">
          {brief.scenarioType ? <Badge variant="secondary">{brief.scenarioType}</Badge> : null}
          {brief.pexelsQuery ? <Badge variant="outline">Pexels: {brief.pexelsQuery}</Badge> : null}
          {brief.overlaySafeArea ? <Badge variant="outline">{brief.overlaySafeArea}</Badge> : null}
        </div>
      </div>
    </div>
  );
}

function effectiveProductionBrief(plan = {}) {
  if (plan.productionBrief) return plan.productionBrief;
  const reference = referenceLabel(plan.referenceStyle);
  return {
    contentCategory: 'general',
    designConcept: plan.coreAngle || plan.summary || '카드뉴스 제작용 정보 패키지',
    moodKeywords: [reference, 'editorial', 'practical'].filter(Boolean),
    palette: ['white', 'slate', 'indigo accent'],
    typographyTone: '굵은 제목과 짧은 본문 중심',
    visualConsistency: '카드마다 제목, 본문, 이미지 여백을 같은 리듬으로 반복합니다.',
    assetStrategy: '기존 제작 연출과 카드별 시각 요소를 바탕으로 Pexels/AI 백플레이트를 선택합니다.',
    imageGenerationPolicy: '이미지는 텍스트 없는 배경으로 만들고 문구는 SVG 편집기에서 얹습니다.',
    pexelsStrategy: { enabled: true, globalQueries: [], orientation: 'portrait', usePolicy: '카드별 제작 연출을 기준으로 검색어를 보강하세요.' }
  };
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
  const generation = plan.generation ?? {};
  const enrichment = effectiveVisualDataEnrichment(plan);
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <CardTitle>{plan.coreAngle}</CardTitle>
          <div className="flex flex-wrap gap-1.5">
            {generation.source ? <Badge variant={generationBadgeVariant(generation)}>{generationLabel(generation)}</Badge> : null}
            {enrichment.enabled ? <Badge variant={enrichment.cardCount ? 'default' : 'outline'}>{visualDataEnrichmentLabel(enrichment)}</Badge> : null}
            {generation.provider ? <Badge variant="outline">{generation.provider}</Badge> : null}
            {cached ? <Badge variant="secondary">저장본</Badge> : null}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {generation.source === 'fallback' ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-bold leading-6 text-red-700">
            {generation.message || 'AI 생성에 실패해 로컬 대체 문구가 표시 중입니다. 다시 작성이 필요합니다.'}
          </div>
        ) : null}
        <p className="text-sm text-muted-foreground">{plan.summary}</p>
        <div className="flex flex-wrap gap-1.5">
          <Badge variant="secondary">타깃 {plan.targetAudience}</Badge>
          {plan.referenceStyle ? <Badge variant="outline">레퍼런스 {referenceLabel(plan.referenceStyle)}</Badge> : null}
          {enrichment.searchStatus ? <Badge variant="outline">검색 {searchStatusLabel(enrichment)}</Badge> : null}
        </div>
        <Blueprint items={plan.carouselBlueprint} />
        <NoteList title="주의할 표현" items={plan.riskNotes} />
      </CardContent>
    </Card>
  );
}

function visualDataEnrichmentLabel(enrichment = {}) {
  if (enrichment.mode === 'curated_verified_profile') return `검증 데이터 ${enrichment.cardCount ?? 0}장`;
  if (enrichment.mode === 'ai_researched_visualData') return `AI 데이터 보강 ${enrichment.aiAppliedCount ?? enrichment.cardCount ?? 0}장`;
  if (enrichment.aiStatus === 'skipped_no_source_material') return '데이터 근거 없음';
  if (enrichment.aiStatus === 'failed') return '데이터 보강 실패';
  return `데이터 보강 ${enrichment.cardCount ?? 0}장`;
}

function searchStatusLabel(enrichment = {}) {
  if (enrichment.searchStatus === 'searched') return `${enrichment.searchResultCount ?? 0}건`;
  if (enrichment.searchStatus === 'searched_no_results') return '결과 없음';
  if (enrichment.searchStatus === 'skipped_no_queries') return '질의 없음';
  if (enrichment.searchStatus === 'failed') return '실패';
  return enrichment.searchStatus;
}

function generationLabel(generation = {}) {
  if (generation.source === 'fallback') {
    if (generation.reason === 'no_provider') return 'AI 설정 없음';
    return 'AI 생성 실패';
  }
  if (generation.source === 'ai_with_local_rewrite') return `AI 후 보강 ${generation.aiCardCount ?? 0}/${generation.requestedCardCount ?? '-'}`;
  if (generation.source === 'ai') return `AI 원문 ${generation.aiCardCount ?? 0}/${generation.requestedCardCount ?? '-'}`;
  return generation.source;
}

function generationBadgeVariant(generation = {}) {
  if (generation.source === 'fallback') return 'destructive';
  if (generation.replacedCards) return 'secondary';
  return 'outline';
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
            <span className="text-xs font-semibold text-slate-500">컷 수</span>
            <input className="h-10 rounded-md border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-slate-400" type="number" min="3" max="12" value={cards.length} onChange={setCardCount} />
          </label>
          <div className="grid gap-1.5">
            <span className="text-xs font-semibold text-slate-500">표지 제목</span>
            <input className="h-10 rounded-md border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-slate-400" value={coverTitle} onChange={(event) => applyTitle(event.target.value)} placeholder="표지 제목을 입력하세요" />
          </div>
        </div>
        {plan.hookTitles?.length ? (
          <div>
            <div className="mb-2 text-xs font-semibold text-slate-500">제목 후보</div>
            <div className="flex flex-wrap gap-2">
              {plan.hookTitles.map((title, index) => (
                <Button key={`${index}-${title}`} size="sm" variant={coverTitle === title ? 'default' : 'outline'} onClick={() => applyTitle(title)}>
                  {titleTypeLabel(index)}
                </Button>
              ))}
            </div>
          </div>
        ) : null}
        <div className="space-y-2">
          <div className="text-xs font-semibold text-slate-500">카드별 문구와 제작 연출</div>
          {cards.map((card, index) => (
            <div key={`${card.page}-${index}`} className="rounded-lg border bg-slate-50 p-3">
              <div className="mb-2 flex flex-wrap items-center gap-1.5">
                <Badge variant="outline">카드 {index + 1}</Badge>
              </div>
              <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                <div className="rounded-md border border-slate-200 bg-white p-3">
                  <div className="mb-2 text-xs font-semibold text-slate-500">카드 문구</div>
                  <input className="h-9 w-full rounded-md border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-slate-400" value={card.title ?? ''} onChange={(event) => updateCard(index, { title: event.target.value })} placeholder="카드 제목" />
                  <textarea className="mt-2 min-h-24 w-full resize-y rounded-md border border-slate-200 px-3 py-2 text-sm font-semibold leading-6 outline-none focus:border-slate-400" value={formatCardText(card.body)} onChange={(event) => updateCard(index, { body: event.target.value })} placeholder="카드 본문" />
                </div>
                <div className="rounded-md border border-slate-200 bg-white p-3">
                  <div className="mb-2 text-xs font-semibold text-slate-500">제작 연출</div>
                  <textarea className="min-h-24 w-full resize-y rounded-md border border-slate-200 px-3 py-2 text-sm font-semibold leading-6 outline-none focus:border-slate-400" value={card.visualPrompt ?? ''} onChange={(event) => updateCard(index, { visualPrompt: event.target.value })} placeholder="배경, 그림, 그래프, 표 구도" />
                  <input className="mt-2 h-9 w-full rounded-md border border-slate-200 px-3 text-xs font-bold outline-none focus:border-slate-400" value={(card.visualItems ?? []).join(', ')} onChange={(event) => updateCard(index, { visualItems: event.target.value.split(',').map((item) => item.trim()).filter(Boolean) })} placeholder="시각 요소, 쉼표로 구분" />
                  <VisualBriefFields card={card} update={(visualBrief) => updateCard(index, { visualBrief })} />
                  <VerifiedDataPanel data={card.visualData} compact />
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function VisualBriefFields({ card, update }) {
  const brief = card.visualBrief ?? {};
  const set = (key) => (event) => update({ ...brief, [key]: event.target.value });
  return (
    <div className="mt-2 grid gap-2 rounded-md border border-slate-100 bg-slate-50 p-2">
      <input className="h-8 rounded-md border border-slate-200 px-2 text-xs font-bold outline-none focus:border-slate-400" value={brief.scenario ?? ''} onChange={set('scenario')} placeholder="장면 시나리오" />
      <input className="h-8 rounded-md border border-slate-200 px-2 text-xs font-bold outline-none focus:border-slate-400" value={brief.pexelsQuery ?? brief.pexels?.query ?? ''} onChange={set('pexelsQuery')} placeholder="Pexels 검색어" />
      <textarea className="min-h-16 resize-y rounded-md border border-slate-200 px-2 py-1.5 text-xs font-semibold leading-5 outline-none focus:border-slate-400" value={brief.backgroundPrompt ?? ''} onChange={set('backgroundPrompt')} placeholder="배경 생성 프롬프트" />
    </div>
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
        {plan.captionFirstLine ? <div className="rounded-lg border bg-white p-3"><span className="text-xs font-semibold text-slate-500">첫 줄</span><strong className="mt-1 block">{plan.captionFirstLine}</strong></div> : null}
        {plan.captionBody ? <div className="whitespace-pre-line rounded-lg border bg-slate-50 p-3 text-sm font-semibold leading-6 text-slate-700">{plan.captionBody}</div> : null}
        {plan.captionCTA ? <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm font-semibold text-slate-600">{plan.captionCTA}</div> : null}
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
              <strong className="mt-5 block text-2xl font-semibold leading-tight tracking-normal">{card.title}</strong>
              <p className="mt-5 whitespace-pre-line text-[15px] font-semibold leading-6 text-slate-700">{formatCardText(card.body)}</p>
              {card.visualPrompt ? <p className="mt-4 rounded-md bg-white/80 p-2 text-[11px] font-bold leading-4 text-slate-500">{card.visualPrompt}</p> : null}
              {card.visualBrief?.pexelsQuery ? <p className="mt-2 rounded-md bg-slate-50 p-2 text-[11px] font-semibold leading-4 text-slate-600">Pexels: {card.visualBrief.pexelsQuery}</p> : null}
              <VerifiedDataPanel data={card.visualData} compact />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function ReferenceData({ plan }) {
  const enrichment = effectiveVisualDataEnrichment(plan);
  const items = [
    enrichment.mode ? { label: '검증 데이터 보강', value: summarizeVisualDataEnrichment(enrichment) } : null,
    ...(enrichment.searchQueries ?? []).map((value, index) => ({ label: `데이터 검색 질의 ${index + 1}`, value })),
    ...(plan.sourceNotes ?? []).map((value) => ({ label: '근거', value })),
    ...(plan.cards ?? []).flatMap((card, index) => [
      card.sourceLine ? { label: `카드 ${index + 1} 출처`, value: card.sourceLine } : null,
      card.dataPoint ? { label: `카드 ${index + 1} 참고`, value: card.dataPoint } : null,
      card.visualBrief?.scenario ? { label: `카드 ${index + 1} 장면`, value: card.visualBrief.scenario } : null,
      card.visualBrief?.pexelsQuery ? { label: `카드 ${index + 1} Pexels`, value: card.visualBrief.pexelsQuery } : null,
      card.visualData ? { label: `카드 ${index + 1} 검증 데이터`, value: summarizeVisualData(card.visualData) } : null
    ]).filter(Boolean)
  ].filter((item) => item?.value);
  if (!items.length) return null;
  return (
    <details className="rounded-lg border bg-white p-4 text-sm">
      <summary className="cursor-pointer font-semibold text-slate-600">참고 데이터</summary>
      <div className="mt-3 grid gap-2">
        {items.slice(0, 12).map((item, index) => (
          <div key={`${item.label}-${index}`} className="rounded-md bg-slate-50 px-3 py-2">
            <span className="text-xs font-semibold text-slate-400">{item.label}</span>
            <p className="mt-1 break-words text-xs font-semibold leading-5 text-slate-600">{item.value}</p>
          </div>
        ))}
      </div>
    </details>
  );
}

function uniqueProductCandidates(cards = []) {
  const seen = new Set();
  return cards
    .flatMap((card) => card.visualBrief?.productCandidates ?? [])
    .map((item) => ({
      name: `${item?.name ?? ''}`.trim(),
      role: `${item?.role ?? ''}`.trim(),
      imageUsePolicy: `${item?.imageUsePolicy ?? ''}`.trim()
    }))
    .filter((item) => {
      if (!item.name || seen.has(item.name)) return false;
      seen.add(item.name);
      return true;
    })
    .slice(0, 8);
}

function uniqueQueries(plan = {}) {
  const queries = [
    ...(plan.productionBrief?.pexelsStrategy?.globalQueries ?? []),
    ...(plan.cards ?? []).map((card) => card.visualBrief?.pexelsQuery)
  ]
    .map((item) => `${item ?? ''}`.trim())
    .filter(Boolean);
  return [...new Set(queries)].slice(0, 10);
}

function makeProductionPackageText(plan = {}, productCandidates = uniqueProductCandidates(plan.cards), pexelsQueries = uniqueQueries(plan)) {
  const brief = plan.productionBrief ?? {};
  const cards = plan.cards ?? [];
  return [
    `[카드뉴스 제작 패키지]`,
    `주제: ${plan.primaryTopic ?? plan.selectedHookTitle ?? ''}`,
    `핵심 각도: ${plan.coreAngle ?? ''}`,
    ``,
    `디자인 방향`,
    `- 콘셉트: ${brief.designConcept ?? ''}`,
    `- 무드: ${(brief.moodKeywords ?? []).join(', ')}`,
    `- 컬러: ${(brief.palette ?? []).join(', ')}`,
    `- 통일감: ${brief.visualConsistency ?? ''}`,
    ``,
    `이미지 전략`,
    `- ${brief.assetStrategy ?? ''}`,
    `- Pexels: ${pexelsQueries.join(' / ')}`,
    ``,
    productCandidates.length ? `제품/이미지 후보\n${productCandidates.map((item) => `- ${item.name}${item.role ? `: ${item.role}` : ''}${item.imageUsePolicy ? ` (${item.imageUsePolicy})` : ''}`).join('\n')}` : '',
    ``,
    `카드별 구성`,
    cards.map((card, index) => [
      `${index + 1}. ${card.title}`,
      `본문: ${formatCardText(card.body).replace(/\n/g, ' / ')}`,
      `장면: ${card.visualBrief?.scenario ?? card.visualPrompt ?? ''}`,
      `Pexels: ${card.visualBrief?.pexelsQuery ?? ''}`,
      `배경 프롬프트: ${card.visualBrief?.backgroundPrompt ?? ''}`
    ].join('\n')).join('\n\n')
  ].filter((line) => line !== '').join('\n');
}

function categoryLabel(value) {
  return {
    beauty: '화장품/뷰티',
    parenting_product: '육아용품',
    automotive: '자동차',
    food: '식품/음료',
    tech: '테크/기기',
    pet: '펫용품',
    finance: '금융/투자',
    real_estate: '부동산',
    general: '일반'
  }[value] ?? value;
}

function VerifiedDataPanel({ data, compact = false }) {
  if (!data || typeof data !== 'object') return null;
  const rows = visualDataRows(data);
  const sources = Array.isArray(data.sources) ? data.sources.map((source) => source.label).filter(Boolean).slice(0, 2) : [];
  return (
    <div className={`mt-3 rounded-md border border-emerald-100 bg-emerald-50 p-2 ${compact ? 'text-[11px]' : 'text-xs'}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <strong className="font-semibold text-emerald-800">검증 데이터</strong>
        <span className="rounded-full bg-white px-2 py-0.5 font-semibold text-emerald-700">{data.type === 'bar_chart' ? '그래프 SVG' : '표 SVG'}</span>
      </div>
      <p className="mt-1 font-semibold leading-4 text-slate-800">{data.title}</p>
      {data.subtitle ? <p className="mt-0.5 font-semibold leading-4 text-emerald-700">{data.subtitle}</p> : null}
      {rows.length ? (
        <div className="mt-2 grid gap-1">
          {rows.slice(0, compact ? 3 : 6).map((row, index) => (
            <div key={`${row}-${index}`} className="rounded bg-white/80 px-2 py-1 font-semibold leading-4 text-slate-700">{row}</div>
          ))}
        </div>
      ) : null}
      {sources.length ? <p className="mt-2 font-bold leading-4 text-emerald-700">출처: {sources.join(', ')}</p> : null}
    </div>
  );
}

function visualDataRows(data = {}) {
  if (Array.isArray(data.items)) {
    return data.items.map((item) => `${item.label}: ${item.display ?? item.value ?? ''}${item.note ? ` · ${item.note}` : ''}`);
  }
  if (Array.isArray(data.rows)) {
    return data.rows.map((row) => Array.isArray(row) ? row.join(' / ') : `${row}`);
  }
  return [];
}

function summarizeVisualData(data = {}) {
  const rows = visualDataRows(data);
  const sources = Array.isArray(data.sources) ? data.sources.map((source) => source.label).filter(Boolean).join(', ') : '';
  return [
    data.title ? `${data.title}${data.subtitle ? ` · ${data.subtitle}` : ''}` : '',
    rows.join('\n'),
    sources ? `출처: ${sources}` : ''
  ].filter(Boolean).join('\n');
}

function summarizeVisualDataEnrichment(enrichment = {}) {
  const cards = Array.isArray(enrichment.cards) ? enrichment.cards : [];
  const aiCards = Array.isArray(enrichment.aiCards) ? enrichment.aiCards : [];
  const cardLines = (aiCards.length ? aiCards : cards)
    .map((card) => `카드 ${card.page}: ${card.title || card.type}${card.sources?.length ? ` · ${card.sources.join(', ')}` : ''}`)
    .join('\n');
  return [
    `방식: ${enrichment.mode}`,
    enrichment.profiles?.length ? `프로필: ${enrichment.profiles.join(', ')}` : '',
    enrichment.aiStatus ? `AI 보강: ${enrichment.aiStatus}` : '',
    enrichment.searchStatus ? `검색: ${searchStatusLabel(enrichment)}` : '',
    cardLines,
    enrichment.sourcePolicy
  ].filter(Boolean).join('\n');
}

function effectiveVisualDataEnrichment(plan = {}) {
  const explicit = plan.generation?.visualDataEnrichment;
  if (explicit?.enabled || explicit?.mode) return explicit;
  const cards = (plan.cards ?? [])
    .filter((card) => card?.visualData)
    .map((card) => ({
      page: card.page,
      role: card.role,
      layout: card.layout,
      type: card.visualData.type,
      title: card.visualData.title,
      sources: (card.visualData.sources ?? []).map((source) => source.label).filter(Boolean).slice(0, 3)
    }));
  if (!cards.length) return {};
  return {
    enabled: true,
    mode: 'existing_visualData',
    cardCount: cards.length,
    cards,
    sourcePolicy: '이 플랜에는 검증 데이터 구조가 포함되어 있으며 이미지 제작 단계에서 SVG 오버레이로 렌더링됩니다.'
  };
}

function Blueprint({ items }) {
  if (!items?.length) return null;
  return (
    <div>
      <div className="mb-1 text-xs font-semibold text-slate-500">카드 흐름</div>
      <div className="grid gap-1.5">
        {items.slice(0, 9).map((item, index) => (
          <div key={`${index}-${item}`} className="flex gap-2 rounded-md bg-slate-50 px-2 py-1.5 text-xs font-semibold text-slate-600">
            <span className="shrink-0 font-semibold text-slate-400">{String(index + 1).padStart(2, '0')}</span>
            <span>{item}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function NoteList({ title, items }) {
  if (!items?.length) return null;
  return <div><div className="mb-1 text-xs font-semibold text-slate-500">{title}</div><div className="flex flex-wrap gap-1.5">{items.slice(0, 5).map((item, index) => <Badge key={`${title}-${index}`} variant="outline">{item}</Badge>)}</div></div>;
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
