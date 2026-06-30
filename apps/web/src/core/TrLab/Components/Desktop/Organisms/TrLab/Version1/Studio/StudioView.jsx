import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ClipboardList, Copy, Image, Loader2, PencilLine, Search, Send, Trash2, X } from 'lucide-react';
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
          <CardTitle className="flex items-center gap-2"><ClipboardList className="h-5 w-5 text-indigo-600" />제작 결과 패키지</CardTitle>
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
            <span className="text-xs font-black text-slate-500">디자인 방향</span>
            <strong className="mt-1 block text-base leading-7 text-slate-950">{brief.designConcept}</strong>
            {brief.visualConsistency ? <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">{brief.visualConsistency}</p> : null}
          </div>
          <div className="rounded-lg border bg-slate-50 p-4">
            <span className="text-xs font-black text-slate-500">이미지/저작권 전략</span>
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
          <div className="mb-2 text-xs font-black text-slate-500">카드별 제작 지시</div>
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
        <div className="flex items-center gap-1.5 text-xs font-black text-slate-500">{icon}{title}</div>
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
        <div className="mt-2 text-[11px] font-black text-slate-400">{roleLabel(card.role)}</div>
      </div>
      <div className="min-w-0">
        <strong className="block break-words text-sm font-black leading-5 text-slate-900">{card.title}</strong>
        <p className="mt-1 line-clamp-2 whitespace-pre-line text-xs font-semibold leading-5 text-slate-600">{formatCardText(card.body)}</p>
      </div>
      <div className="min-w-0 rounded-md bg-slate-50 p-2">
        {brief.scenario || card.visualPrompt ? <p className="text-xs font-black leading-5 text-slate-700">{brief.scenario || card.visualPrompt}</p> : null}
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
      <input className="h-8 rounded-md border border-slate-200 px-2 text-xs font-bold outline-none focus:border-indigo-400" value={brief.scenario ?? ''} onChange={set('scenario')} placeholder="장면 시나리오" />
      <input className="h-8 rounded-md border border-slate-200 px-2 text-xs font-bold outline-none focus:border-indigo-400" value={brief.pexelsQuery ?? brief.pexels?.query ?? ''} onChange={set('pexelsQuery')} placeholder="Pexels 검색어" />
      <textarea className="min-h-16 resize-y rounded-md border border-slate-200 px-2 py-1.5 text-xs font-semibold leading-5 outline-none focus:border-indigo-400" value={brief.backgroundPrompt ?? ''} onChange={set('backgroundPrompt')} placeholder="배경 생성 프롬프트" />
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
              {card.visualBrief?.pexelsQuery ? <p className="mt-2 rounded-md bg-indigo-50 p-2 text-[11px] font-black leading-4 text-indigo-700">Pexels: {card.visualBrief.pexelsQuery}</p> : null}
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
        <strong className="font-black text-emerald-800">검증 데이터</strong>
        <span className="rounded-full bg-white px-2 py-0.5 font-black text-emerald-700">{data.type === 'bar_chart' ? '그래프 SVG' : '표 SVG'}</span>
      </div>
      <p className="mt-1 font-black leading-4 text-slate-800">{data.title}</p>
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
