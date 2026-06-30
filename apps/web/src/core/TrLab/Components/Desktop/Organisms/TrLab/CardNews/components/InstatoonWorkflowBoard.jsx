import { useEffect, useMemo, useState } from 'react';
import {
  BadgeCheck,
  ChevronRight,
  FileImage,
  ImagePlus,
  Layers3,
  MessageCircle,
  Palette,
  PenTool,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
  UserRound
} from 'lucide-react';
import { Badge } from '@/core/TrLab/Components/Desktop/Atoms/TrLab/Common/Badge/Badge';
import { Button } from '@/core/TrLab/Components/Desktop/Atoms/TrLab/Common/Button/Button';
import { referenceVisualGuide } from '../lib/card-news-styles';

const baseWorkflowSteps = [
  {
    id: 'references',
    label: '레퍼런스',
    icon: FileImage,
    goal: '직접 업로드한 이미지로 레퍼런스 보관함을 구성합니다.',
    output: '참조 카드 세트'
  },
  {
    id: 'style',
    label: '스타일',
    icon: Palette,
    goal: '배경, 선, 글꼴, 강조색, 장식 규칙을 잠급니다.',
    output: '스타일 프리셋'
  },
  {
    id: 'brand',
    label: '브랜드',
    icon: ShieldCheck,
    goal: '서비스명, CTA, 로고 노출 방식, 금지 표현을 정합니다.',
    output: '브랜드 키트'
  },
  {
    id: 'character',
    label: '캐릭터',
    icon: UserRound,
    goal: '인물 역할, 표정, 포즈를 에셋 단위로 확정합니다.',
    output: '캐릭터 시트'
  },
  {
    id: 'storyboard',
    label: '스토리보드',
    icon: Layers3,
    goal: '카드별 역할과 장면을 순서대로 구성합니다.',
    output: '카드별 와이어'
  },
  {
    id: 'copy',
    label: '문구',
    icon: MessageCircle,
    goal: '큰 문장, 말풍선, 앱 화면 문구를 이미지 생성 전에 고정합니다.',
    output: '확정 원고'
  },
  {
    id: 'assets',
    label: '에셋',
    icon: ImagePlus,
    goal: '캐릭터, 말풍선, 폰 프레임, 장식을 먼저 생성해 고릅니다.',
    output: '에셋 보관함'
  },
  {
    id: 'qa',
    label: '검수',
    icon: BadgeCheck,
    goal: '전체 흐름, 글자량, 캐릭터 일관성, CTA를 확인합니다.',
    output: '출력 준비'
  }
];

const workflowStepIds = ['references', 'style', 'character', 'copy', 'storyboard', 'assets', 'brand', 'qa'];

const defaultCompleted = [];
const referenceLibraryKey = 'trlab.cardnews.reference-library.v1';
const defaultReferenceMeta = {
  preset: 'custom_instatoon_reference',
  canvas: '1080x1080 또는 1080x1350',
  background: '업로드한 레퍼런스에서 추출',
  line: '업로드한 레퍼런스에서 추출',
  typography: '업로드한 레퍼런스에서 추출',
  color: '업로드한 레퍼런스에서 추출',
  productionRule: '선택한 레퍼런스 보관함을 기준으로 스타일과 에셋을 단계별 확정'
};
const assetCandidates = [
  { name: '놀란 학생', meta: '휴대폰을 든 SD 캐릭터' },
  { name: '질문 말풍선', meta: '두꺼운 손그림 외곽선' },
  { name: '폰 프레임', meta: '앱 화면 삽입용 빈 프레임' },
  { name: '강조 장식', meta: '별, 밑줄, 점선' }
];

export function InstatoonWorkflowBoard({ studio, plan, styleKey, templateProduction }) {
  const workflowSteps = useMemo(() => makeWorkflowSteps(templateProduction), [templateProduction]);
  const [activeStep, setActiveStep] = useState(workflowSteps[0]?.id ?? 'references');
  const [completedSteps, setCompletedSteps] = useState(() => new Set(defaultCompleted));
  const [referenceLibrary, setReferenceLibrary] = useState([]);
  const [selectedRefs, setSelectedRefs] = useState([]);
  const [referenceMeta] = useState(defaultReferenceMeta);
  const [loadedLibrary, setLoadedLibrary] = useState(false);

  const cards = useMemo(() => plan?.cards ?? [], [plan]);
  const guide = referenceVisualGuide(plan?.referenceStyle ?? 'handdrawn_research');
  const activeIndex = workflowSteps.findIndex((step) => step.id === activeStep);
  const active = workflowSteps[activeIndex] ?? workflowSteps[0];
  const completedCount = completedSteps.size;
  const completion = Math.round((completedCount / workflowSteps.length) * 100);
  const canCompleteActive = active.id !== 'references' || selectedRefs.length > 0;
  const canMoveNext = completedSteps.has(active.id) && activeIndex < workflowSteps.length - 1;
  const blueprint = templateBlueprint(templateProduction);

  useEffect(() => {
    if (!workflowSteps.some((step) => step.id === activeStep)) {
      setActiveStep(workflowSteps[0]?.id ?? 'references');
      setCompletedSteps(new Set(defaultCompleted));
    }
  }, [activeStep, workflowSteps]);

  useEffect(() => {
    const saved = loadReferenceLibrary();
    setReferenceLibrary(saved);
    setSelectedRefs(saved.slice(0, Math.min(8, saved.length)).map((item) => item.id));
    setLoadedLibrary(true);
  }, []);

  useEffect(() => {
    if (!loadedLibrary) return;
    saveReferenceLibrary(referenceLibrary);
  }, [loadedLibrary, referenceLibrary]);

  function completeActiveStep() {
    if (!canCompleteActive) return;
    setCompletedSteps((value) => {
      const next = new Set(value);
      next.add(active.id);
      return next;
    });
  }

  function moveNext() {
    if (!canMoveNext) return;
    const next = workflowSteps[Math.min(workflowSteps.length - 1, activeIndex + 1)];
    setActiveStep(next.id);
  }

  function movePrev() {
    const prev = workflowSteps[Math.max(0, activeIndex - 1)];
    setActiveStep(prev.id);
  }

  function resetWorkflow() {
    setActiveStep(workflowSteps[0]?.id ?? 'references');
    setCompletedSteps(new Set(defaultCompleted));
  }

  function selectStep(stepId, index) {
    const isCurrent = stepId === active.id;
    const isCompleted = completedSteps.has(stepId);
    const isPrevious = index < activeIndex;
    if (isCurrent || isCompleted || isPrevious) setActiveStep(stepId);
  }

  function removeReference(id) {
    setReferenceLibrary((value) => value.filter((item) => item.id !== id));
    setSelectedRefs((value) => value.filter((item) => item !== id));
    setCompletedSteps((value) => {
      if (active.id !== 'references') return value;
      const next = new Set(value);
      next.delete('references');
      return next;
    });
  }

  function toggleReference(id) {
    setSelectedRefs((value) => {
      if (value.includes(id)) return value.filter((item) => item !== id);
      return [...value, id].slice(0, 12);
    });
  }

  async function addUploadedReferences(event) {
    const files = Array.from(event.target.files ?? []).filter((file) => file.type.startsWith('image/'));
    if (!files.length) return;
    const uploaded = await Promise.all(files.slice(0, 8).map(fileToReference));
    setReferenceLibrary((value) => {
      const existing = new Set(value.map((item) => item.id));
      return [...uploaded.filter((item) => !existing.has(item.id)), ...value];
    });
    setSelectedRefs((value) => {
      const next = [...uploaded.map((item) => item.id), ...value];
      return Array.from(new Set(next)).slice(0, 12);
    });
    event.target.value = '';
  }

  return (
    <section className="rounded-lg border bg-white shadow-sm">
      <div className="flex flex-col gap-4 border-b p-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-emerald-600" />
            <h2 className="text-lg font-semibold text-slate-950">{templateLabel(templateProduction) ? `${templateLabel(templateProduction)} 제작 순서` : '카드뉴스 단계 제작'}</h2>
            <Badge variant="outline">{completion}% 확정</Badge>
          </div>
          <p className="mt-1 text-sm font-semibold leading-6 text-slate-500">
            한 단계씩 결과물을 확인하고 확정해야 다음 제작 단계로 넘어갑니다.
          </p>
          {blueprint ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {blueprint.format ? <Badge variant="secondary">{blueprint.format}</Badge> : null}
              {blueprint.idealCards ? <Badge variant="outline">{blueprint.idealCards}</Badge> : null}
              {(blueprint.bestFor ?? []).slice(0, 3).map((item) => <Badge key={item} variant="outline">{item}</Badge>)}
            </div>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={resetWorkflow}>
            <RefreshCw className="h-4 w-4" />초기화
          </Button>
          <Button variant="outline" onClick={movePrev} disabled={activeIndex === 0}>
            이전 단계
          </Button>
          <Button onClick={moveNext} disabled={!canMoveNext}>
            다음 단계<ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="border-b px-5 py-4">
        <div className="grid gap-2 md:grid-cols-4 xl:grid-cols-8">
          {workflowSteps.map((step, index) => {
            const Icon = step.icon;
            const isActive = active.id === step.id;
            const isCompleted = completedSteps.has(step.id);
            const isAvailable = isActive || isCompleted || index < activeIndex;
            return (
              <button
                key={step.id}
                type="button"
                onClick={() => selectStep(step.id, index)}
                disabled={!isAvailable}
                className={[
                  'flex min-h-14 items-center gap-2 rounded-lg border px-3 py-2 text-left transition',
                  isActive ? 'border-slate-950 bg-slate-950 text-white' : '',
                  !isActive && isCompleted ? 'border-emerald-200 bg-emerald-50 text-emerald-950' : '',
                  !isActive && !isCompleted ? 'border-slate-200 bg-slate-50 text-slate-400' : '',
                  isAvailable ? 'hover:border-slate-300' : 'cursor-not-allowed opacity-60'
                ].join(' ')}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="min-w-0">
                  <span className="block text-[10px] font-semibold leading-none">{String(index + 1).padStart(2, '0')}</span>
                  <span className="mt-1 block truncate text-xs font-semibold">{step.label}</span>
                </span>
                {isCompleted ? <BadgeCheck className="ml-auto h-4 w-4 shrink-0 text-emerald-500" /> : null}
              </button>
            );
          })}
        </div>
      </div>

      <div className="p-5">
        <div className="mx-auto max-w-5xl rounded-lg border bg-slate-50 p-5">
          <div className="flex flex-col gap-3 border-b border-slate-200 pb-5 md:flex-row md:items-start md:justify-between">
            <div>
              <Badge variant="outline">Step {activeIndex + 1} / {workflowSteps.length}</Badge>
              <h3 className="mt-2 text-2xl font-semibold text-slate-950">{active.label} 단계</h3>
              <p className="mt-1 text-sm font-semibold leading-6 text-slate-600">{active.goal}</p>
            </div>
            <Button variant={completedSteps.has(active.id) ? 'secondary' : 'default'} onClick={completeActiveStep} disabled={!canCompleteActive}>
              <PenTool className="h-4 w-4" />{completedSteps.has(active.id) ? '이 단계 완료됨' : '이 단계 완료'}
            </Button>
          </div>

          <StepBody
            activeStep={active.id}
            activeWorkflowStep={active}
            templateProduction={templateProduction}
            referenceLibrary={referenceLibrary}
            selectedRefs={selectedRefs}
            toggleReference={toggleReference}
            removeReference={removeReference}
            addUploadedReferences={addUploadedReferences}
            referenceMeta={referenceMeta}
            studio={studio}
            plan={plan}
            cards={cards}
            guide={guide}
            styleKey={styleKey}
          />

          {active.id !== 'references' ? (
            <div className="mt-5 border-t border-slate-200 pt-5">
              <PreviewPanel
                activeStep={active.id}
                selectedRefs={selectedRefs}
                referenceLibrary={referenceLibrary}
                referenceMeta={referenceMeta}
                studio={studio}
                cards={cards}
                workflowSteps={workflowSteps}
              />
            </div>
          ) : null}

          <div className="mt-5 flex flex-col gap-2 border-t border-slate-200 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-xs font-bold leading-5 text-slate-500">
              {completedSteps.has(active.id) ? '완료된 단계입니다. 다음 단계로 넘어갈 수 있습니다.' : '이 단계 결과를 확인한 뒤 완료 처리하세요.'}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={movePrev} disabled={activeIndex === 0}>이전</Button>
              <Button onClick={completeActiveStep} disabled={!canCompleteActive || completedSteps.has(active.id)}>
                단계 완료
              </Button>
              <Button onClick={moveNext} disabled={!canMoveNext}>다음</Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function makeWorkflowSteps(templateProduction) {
  const flow = Array.isArray(templateProduction?.productionFlow)
    ? templateProduction.productionFlow
    : Array.isArray(templateProduction?.templateProductionFlow)
      ? templateProduction.templateProductionFlow
      : [];
  if (!flow.length) return baseWorkflowSteps;
  const usedIds = new Set();
  const steps = flow.slice(0, workflowStepIds.length).map(([title, note], index) => {
    const id = pickStepId(title, note, usedIds, index);
    usedIds.add(id);
    const base = baseWorkflowSteps.find((step) => step.id === id) ?? baseWorkflowSteps[index] ?? baseWorkflowSteps.at(-1);
    return {
      ...base,
      id,
      label: title || base.label,
      goal: note || base.goal,
      output: outputForFlowTitle(title) || base.output
    };
  });
  const hasQa = steps.some((step) => step.id === 'qa');
  return hasQa ? steps : [...steps, baseWorkflowSteps.find((step) => step.id === 'qa')].filter(Boolean);
}

function templateLabel(templateProduction) {
  return templateProduction?.label || templateProduction?.templateLabel || templateProduction?.template?.label || '';
}

function pickStepId(title = '', note = '', usedIds = new Set(), index = 0) {
  const text = `${title} ${note}`;
  const candidates = [
    [/레퍼런스|참조|예시|시안/, 'references'],
    [/폰트|배경|스타일|무드|컬러|분할|명도|여백/, 'style'],
    [/캐릭터|인물|주인공|표정|포즈/, 'character'],
    [/브랜드|로고|심볼|말투/, 'brand'],
    [/대사|문구|글자|캡션|메시지|CTA/, 'copy'],
    [/검수|가독성|전환|문의|출력|내보내/, 'qa'],
    [/이미지|제품|에셋|사진|소품|컷/, 'assets'],
    [/배치|스토리|와이어|비교|표|요소|구성/, 'storyboard']
  ];
  const matched = candidates.find(([pattern, id]) => pattern.test(text) && !usedIds.has(id));
  if (matched) return matched[1];
  return workflowStepIds.find((id) => !usedIds.has(id)) ?? `${workflowStepIds[index % workflowStepIds.length]}-${index}`;
}

function outputForFlowTitle(title = '') {
  if (/레퍼런스|참조/.test(title)) return '참조 기준';
  if (/배경|폰트|스타일|무드/.test(title)) return '스타일 기준';
  if (/캐릭터/.test(title)) return '캐릭터 기준';
  if (/대사|문구|글자/.test(title)) return '확정 문구';
  if (/배치|비교|스토리/.test(title)) return '배치 기준';
  if (/검수|가독성|전환/.test(title)) return '출력 준비';
  return '';
}

function StepBody({
  activeStep,
  activeWorkflowStep,
  templateProduction,
  referenceLibrary,
  selectedRefs,
  toggleReference,
  removeReference,
  addUploadedReferences,
  referenceMeta,
  studio,
  plan,
  cards,
  guide,
  styleKey
}) {
  const stepControls = controlsForStep(activeWorkflowStep, templateProduction);
  const stepGuides = guidesForStep(activeWorkflowStep, templateProduction);
  if (activeStep === 'references') {
    return (
      <div className="mt-5 space-y-4">
        <StepControlPanel controls={stepControls} guides={stepGuides} step={activeWorkflowStep} />
        <div className="rounded-lg border bg-white p-4">
          <div className="flex flex-col gap-3 border-b pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <strong className="text-base text-slate-950">레퍼런스 보관함</strong>
              <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">업로드한 이미지를 넣고 빼면서 이번 제작 기준을 구성합니다.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">{referenceLibrary.length}개 보관</Badge>
              <Badge variant="outline">{selectedRefs.length}개 사용</Badge>
              <label className="inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-md border border-border bg-white px-3.5 py-2 text-sm font-bold leading-none transition hover:border-slate-300 hover:bg-accent">
                <Upload className="h-4 w-4" />
                새로 추가
                <input id="workflow-reference-add" name="workflowReferenceAdd" type="file" accept="image/*" multiple className="sr-only" onChange={addUploadedReferences} />
              </label>
            </div>
          </div>

          {referenceLibrary.length ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {referenceLibrary.map((item) => {
                const selected = selectedRefs.includes(item.id);
                return (
                  <div
                    key={item.id}
                    className={[
                      'overflow-hidden rounded-lg border bg-white transition',
                      selected ? 'border-emerald-500 ring-2 ring-emerald-100' : 'border-slate-200'
                    ].join(' ')}
                  >
                    <button type="button" className="block w-full text-left" onClick={() => toggleReference(item.id)}>
                      <img src={item.previewUrl} alt="" className="aspect-square w-full object-cover" />
                      <span className="block truncate px-3 py-2 text-xs font-semibold text-slate-700">{item.name}</span>
                    </button>
                    <div className="flex items-center justify-between gap-2 border-t px-2 py-2">
                      <Badge variant={selected ? 'secondary' : 'outline'}>{selected ? '사용 중' : '보관 중'}</Badge>
                      <Button size="sm" variant="outline" onClick={() => removeReference(item.id)}>
                        <Trash2 className="h-3.5 w-3.5" />제거
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="mt-4 rounded-lg border border-dashed bg-slate-50 p-8 text-center">
              <Upload className="mx-auto h-8 w-8 text-slate-400" />
              <p className="mt-3 text-sm font-semibold text-slate-700">보관함이 비어 있습니다.</p>
              <p className="mt-1 text-xs font-semibold text-slate-500">카드뉴스 예시, 캐릭터 시트, 로고, 말풍선 샘플 이미지를 업로드하세요.</p>
              <label className="mt-4 inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-md bg-primary px-3.5 py-2 text-sm font-bold leading-none text-primary-foreground transition hover:bg-primary/90">
                <Upload className="h-4 w-4" />
                레퍼런스 업로드
                <input id="workflow-reference-upload" name="workflowReferenceUpload" type="file" accept="image/*" multiple className="sr-only" onChange={addUploadedReferences} />
              </label>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (activeStep === 'style') {
    return <StepSection controls={stepControls} step={activeWorkflowStep} templateProduction={templateProduction}><SettingGrid items={[
        ['프리셋', referenceMeta?.preset ?? 'handdrawn_medical_instatoon'],
        ['캔버스', referenceMeta?.canvas ?? '1080x1080 square carousel'],
        ['배경', referenceMeta?.background ?? guide.cover],
        ['선/그림체', referenceMeta?.line ?? 'thick black hand-drawn stroke'],
        ['글꼴', referenceMeta?.typography ?? guide.typography],
        ['컬러', referenceMeta?.color ?? 'black and white with mint accent'],
        ['현재 템플릿', styleKey]
      ]} /></StepSection>;
  }

  if (activeStep === 'brand') {
    return <StepSection controls={stepControls} step={activeWorkflowStep} templateProduction={templateProduction}><SettingGrid items={[
        ['서비스명', studio?.label ?? plan?.topic ?? 'Medical Decision'],
        ['채널명', studio?.channelName ?? studio?.manualBrief?.channelName ?? '@trlab.insight'],
        ['CTA', '프로필 링크 / 지금 바로 다운로드 / 무료로 시작'],
        ['로고 위치', '앱 화면 또는 마지막 카드 중앙'],
        ['금지 표현', '과장된 합격 보장, 의학적 단정, 긴 광고 문장']
      ]} /></StepSection>;
  }

  if (activeStep === 'character') {
    return <StepSection controls={stepControls} step={activeWorkflowStep} templateProduction={templateProduction}><AssetGrid title="캐릭터 시트 후보" items={[
        ['학생 A', '놀람, 질문, 손가락 가리키기'],
        ['학생 B', '답답함, 반박, 휴대폰 보기'],
        ['안내 캐릭터', '윙크, 추천, 다운로드 유도'],
        ['전문가 톤', '설명, 정리, 체크 표시']
      ]} /></StepSection>;
  }

  if (activeStep === 'storyboard') {
    return (
      <StepSection controls={stepControls} step={activeWorkflowStep} templateProduction={templateProduction}>
        <div className="grid gap-2">
          {cards.slice(0, 10).map((card, index) => (
            <div key={`${card.title}-${index}`} className="grid gap-2 rounded-lg border bg-white p-3 md:grid-cols-[72px_minmax(0,1fr)_160px]">
              <span className="text-xs font-semibold text-slate-500">CARD {index + 1}</span>
              <div className="min-w-0">
                <strong className="block truncate text-sm text-slate-950">{card.title || card.hook || '제목 미정'}</strong>
                <p className="mt-1 line-clamp-2 text-xs font-semibold leading-5 text-slate-500">{card.body || card.caption || '본문 미정'}</p>
              </div>
              <Badge variant="outline">{card.layout || card.role || 'scene'}</Badge>
            </div>
          ))}
        </div>
      </StepSection>
    );
  }

  if (activeStep === 'copy') {
    return <StepSection controls={stepControls} step={activeWorkflowStep} templateProduction={templateProduction}><SettingGrid items={[
        ['메인 문장 제한', '1카드 1메시지, 최대 3줄'],
        ['말풍선 제한', '1~2문장, 감정 중심'],
        ['앱 화면 문구', '문제/해설/오답노트처럼 기능을 직접 보여주는 짧은 문구'],
        ['CTA 문구', '마지막 카드에서만 강하게 노출'],
        ['검사 규칙', '긴 문단, 작은 글씨, 카드 간 반복 문구 경고']
      ]} /></StepSection>;
  }

  if (activeStep === 'assets') {
    return <StepSection controls={stepControls} step={activeWorkflowStep} templateProduction={templateProduction}><AssetGrid title="먼저 뽑을 에셋" items={assetCandidates.map((item) => [item.name, item.meta])} /></StepSection>;
  }

  return <StepSection controls={stepControls} step={activeWorkflowStep} templateProduction={templateProduction}><SettingGrid items={[
      ['흐름', '훅 → 공감 → 문제 제기 → 해결책 → 기능 → CTA'],
      ['일관성', '캐릭터 얼굴, 선 굵기, 말풍선 외곽선 유지'],
      ['가독성', '모바일 기준 큰 글씨와 넓은 여백'],
      ['브랜드', '마지막 카드에서 서비스명과 행동 유도 명확화'],
      ['출력', 'PNG 개별 저장과 ZIP 다운로드 준비']
    ]} /></StepSection>;
}

function StepSection({ controls, step, templateProduction, children }) {
  return (
    <div className="mt-5 space-y-4">
      <StepControlPanel controls={controls} guides={guidesForStep(step, templateProduction)} step={step} />
      {children}
    </div>
  );
}

function StepControlPanel({ controls, guides = [], step }) {
  if (!controls.length && !guides.length) return null;
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="text-xs font-semibold text-slate-500">이번 단계에서 고정할 항목</div>
          <div className="mt-1 text-sm font-semibold text-slate-950">{step?.label}</div>
        </div>
        {step?.output ? <Badge variant="outline">{step.output}</Badge> : null}
      </div>
      {controls.length ? (
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {controls.map(([title, items]) => (
            <div key={title} className="rounded-lg bg-slate-50 p-3">
              <div className="text-xs font-semibold text-slate-800">{title}</div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {items.map((item) => (
                  <span key={item} className="rounded-full bg-white px-2 py-1 text-[11px] font-medium text-slate-600 ring-1 ring-slate-100">
                    {item}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : null}
      {guides.length ? (
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {guides.map(([title, note, items = []]) => (
            <div key={title} className="rounded-lg bg-slate-50 p-3">
              <div className="text-xs font-semibold text-slate-800">{title}</div>
              <div className="mt-1 text-[11px] font-medium leading-4 text-slate-500">{note}</div>
              {items.length ? (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {items.map((item) => <span key={item} className="rounded-full bg-white px-2 py-1 text-[11px] font-medium text-slate-600 ring-1 ring-slate-100">{item}</span>)}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function controlsForStep(step, templateProduction) {
  const groups = templateControlGroups(templateProduction);
  if (!groups.length || !step) return [];
  const text = `${step.label ?? ''} ${step.goal ?? ''}`;
  const direct = groups.filter(([title]) => controlMatchesStep(title, text));
  if (direct.length) return direct;
  if (step.id === 'style') return groups.filter(([title]) => /배경|폰트|글자|무드|브랜드/.test(title));
  if (step.id === 'character') return groups.filter(([title]) => /캐릭터|인물/.test(title));
  if (step.id === 'copy') return groups.filter(([title]) => /말풍선|텍스트|글자|요소|라벨/.test(title));
  if (step.id === 'storyboard') return groups.filter(([title]) => /배치|컷|데이터|요소/.test(title));
  if (step.id === 'assets') return groups.filter(([title]) => /이미지|제품|배경|소품/.test(title));
  if (step.id === 'brand') return groups.filter(([title]) => /브랜드|텍스트|배경/.test(title));
  if (step.id === 'qa') return groups.slice(-2);
  return groups.slice(0, 2);
}

function guidesForStep(step, templateProduction) {
  if (!step || !templateProduction) return [];
  const text = `${step.id ?? ''} ${step.label ?? ''} ${step.goal ?? ''}`;
  const layoutSlots = templateLayoutSlots(templateProduction)
    .filter(([title, note]) => guideMatchesStep(title, note, text))
    .map(([title, note]) => [`배치 슬롯 · ${title}`, note, []]);
  const cardBlueprints = templateBlueprint(templateProduction)?.cardBlueprints ?? [];
  const cardGuides = cardBlueprints
    .filter(([title, note]) => guideMatchesStep(title, note, text))
    .map(([title, note, items]) => [`카드 유형 · ${title}`, note, Array.isArray(items) ? items : []]);
  const exportGuides = step.id === 'qa'
    ? (templateBlueprint(templateProduction)?.platformExport ?? []).slice(0, 3).map((item) => [
      `출력 체크 · ${item.platform}`,
      `${(item.ratios ?? []).join(' / ') || '비율 확인'}`,
      (item.exportCheck ?? []).slice(0, 4)
    ])
    : [];
  const combined = [...layoutSlots, ...cardGuides, ...exportGuides];
  if (combined.length) return combined.slice(0, 4);
  if (step.id === 'storyboard') {
    return cardBlueprints.slice(0, 4).map(([title, note, items]) => [`카드 유형 · ${title}`, note, Array.isArray(items) ? items : []]);
  }
  if (step.id === 'style') {
    return templateLayoutSlots(templateProduction).slice(0, 3).map(([title, note]) => [`배치 슬롯 · ${title}`, note, []]);
  }
  return [];
}

function templateLayoutSlots(templateProduction) {
  if (Array.isArray(templateProduction?.layoutSlots)) return templateProduction.layoutSlots;
  if (Array.isArray(templateProduction?.templateLayoutSlots)) return templateProduction.templateLayoutSlots;
  if (Array.isArray(templateProduction?.template?.layoutSlots)) return templateProduction.template.layoutSlots;
  return [];
}

function templateBlueprint(templateProduction) {
  return templateProduction?.templateBlueprint ?? templateProduction?.template?.templateBlueprint ?? null;
}

function guideMatchesStep(title = '', note = '', stepText = '') {
  const text = `${title} ${note}`;
  if (/배경|제목|본문|강조|요약|기준|비교|데이터|결론|제품|브랜드|메시지|증거|행동/.test(text) && /배경|스타일|폰트|무드|배치|비교|데이터|브랜드/.test(stepText)) return true;
  if (/캐릭터|말풍선|표정|대사/.test(text) && /캐릭터|대사|문구|글자/.test(stepText)) return true;
  if (/CTA|저장|검수|출력|주의/.test(text) && /검수|전환|CTA|출력/.test(stepText)) return true;
  return Boolean(title && stepText && stepText.includes(title.replace(/ 영역|형|컷/g, '')));
}

function templateControlGroups(templateProduction) {
  if (Array.isArray(templateProduction?.editorControls)) return templateProduction.editorControls;
  if (Array.isArray(templateProduction?.templateEditorControls)) return templateProduction.templateEditorControls;
  if (Array.isArray(templateProduction?.template?.editorControls)) return templateProduction.template.editorControls;
  return [];
}

function controlMatchesStep(title = '', stepText = '') {
  const normalized = `${title} ${stepText}`;
  if (/배경/.test(title) && /배경|스타일|무드|레퍼런스/.test(stepText)) return true;
  if (/캐릭터/.test(title) && /캐릭터|인물|주인공|표정/.test(stepText)) return true;
  if (/말풍선|텍스트|글자|폰트|요소|라벨/.test(title) && /대사|문구|글자|폰트|요소|라벨|CTA/.test(stepText)) return true;
  if (/배치|컷|데이터|이미지|제품|브랜드/.test(title) && /배치|컷|이미지|제품|브랜드|검수|전환/.test(stepText)) return true;
  return Boolean(title && stepText && stepText.includes(title));
}

function SettingGrid({ items }) {
  return (
    <div className="mt-4 grid gap-3 md:grid-cols-2">
      {items.map(([label, value]) => (
        <div key={label} className="rounded-lg border bg-white p-4">
          <div className="text-xs font-semibold uppercase tracking-normal text-slate-400">{label}</div>
          <div className="mt-2 break-keep text-sm font-semibold leading-6 text-slate-900 [overflow-wrap:anywhere]">{value}</div>
        </div>
      ))}
    </div>
  );
}

function AssetGrid({ title, items }) {
  return (
    <div className="mt-4">
      <strong className="text-sm text-slate-950">{title}</strong>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        {items.map(([name, meta]) => (
          <div key={name} className="rounded-lg border bg-white p-4">
            <div className="flex h-24 items-center justify-center rounded-md border border-dashed border-slate-300 bg-slate-50">
              <PenTool className="h-7 w-7 text-slate-500" />
            </div>
            <strong className="mt-3 block text-sm text-slate-950">{name}</strong>
            <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">{meta}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function PreviewPanel({ activeStep, selectedRefs, referenceLibrary, referenceMeta, studio, cards, workflowSteps }) {
  const selectedFiles = referenceLibrary.filter((file) => selectedRefs.includes(file.id)).slice(0, 4);
  return (
    <aside className="rounded-lg border bg-white p-4">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-emerald-600" />
        <h3 className="text-sm font-semibold text-slate-950">중간 미리보기</h3>
      </div>
      <div className="mt-4 aspect-square overflow-hidden rounded-lg border bg-[#fffdf7] p-5">
        <div className="flex h-full flex-col justify-between">
          <div>
            <div className="text-xs font-semibold text-red-500 underline decoration-red-400 decoration-2 underline-offset-4">주목!</div>
            <h4 className="mt-6 break-keep text-3xl font-semibold leading-tight tracking-normal text-slate-950">
              {studio?.label ?? 'Medical Decision'} 카드뉴스
            </h4>
            <p className="mt-4 break-keep text-base font-semibold leading-7 text-slate-800">
              {cards[0]?.title ?? '맞춤 해설과 오답노트로 학습 흐름을 잡는 인스타툰'}
            </p>
          </div>
          <div className="flex items-end justify-between gap-3">
            <div className="rounded-full border-4 border-black bg-white px-4 py-3 text-sm font-semibold">무슨 일이지?</div>
            <div className="flex h-28 w-24 items-center justify-center rounded-full border-4 border-black bg-white text-3xl font-semibold">?</div>
          </div>
        </div>
      </div>
      <div className="mt-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500">현재 단계</span>
          <Badge variant="outline">{workflowSteps.find((step) => step.id === activeStep)?.label ?? activeStep}</Badge>
        </div>
        <div className="text-xs font-semibold leading-5 text-slate-500">
          {referenceMeta?.productionRule ?? '에셋을 먼저 고정한 뒤 카드별 장면을 조립합니다.'}
        </div>
        {selectedFiles.length ? (
          <div className="grid grid-cols-4 gap-2">
            {selectedFiles.map((file) => <img key={file.name} src={file.previewUrl} alt="" className="aspect-square rounded-md border object-cover" />)}
          </div>
        ) : null}
      </div>
    </aside>
  );
}

function fileToReference(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve({
      id: `upload:${file.name}:${file.lastModified}:${file.size}`,
      name: file.name,
      previewUrl: String(reader.result ?? ''),
      source: 'upload',
      updatedAt: new Date(file.lastModified || Date.now()).toISOString()
    });
    reader.onerror = () => reject(reader.error ?? new Error('upload_read_failed'));
    reader.readAsDataURL(file);
  });
}

function loadReferenceLibrary() {
  if (typeof window === 'undefined') return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(referenceLibraryKey) || '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item) => item?.id && item?.name && item?.previewUrl).slice(0, 40);
  } catch {
    return [];
  }
}

function saveReferenceLibrary(items) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(referenceLibraryKey, JSON.stringify(items.slice(0, 40)));
  } catch {
    // Large uploaded data URLs can exceed localStorage quota. The in-memory library still works for the session.
  }
}
