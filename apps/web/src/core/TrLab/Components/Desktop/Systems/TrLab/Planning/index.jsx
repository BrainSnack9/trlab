'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, BookOpenText, Check, ClipboardList, FilePlus2, FolderKanban, Image as ImageIcon, Loader2, Save, Sparkles, UserRound, Wand2, X } from 'lucide-react';
import { Badge } from '@/core/TrLab/Components/Desktop/Atoms/TrLab/Common/Badge/Badge';
import { Button } from '@/core/TrLab/Components/Desktop/Atoms/TrLab/Common/Button/Button';
import { NoticeToast } from '@/core/TrLab/Components/Desktop/Molecules/TrLab/GenerationFeedback';
import { assistPlanningStage, generateContentImage } from '@/core/TrLab/modules/clients/api';
import useTrLabWorkspace from '@/core/TrLab/modules/controller/useTrLabWorkspace';
import useWorkDialogs from '@/core/TrLab/modules/controller/useWorkDialogs';
import { resolveTemplateItem } from '@/core/TrLab/modules/templates/templateCatalog';

const FORMAT_PRESETS = [
  {
    id: 'instatoon',
    label: '인스타툰',
    summary: '툰으로 설명하는 단계형 가이드',
    defaults: {
      title: '인스타툰 카드뉴스 기획',
      goal: '독자가 이해할 내용을 캐릭터의 행동과 짧은 설명으로 보여주고 저장/실행을 유도한다.',
      promptGuide: '사용자가 입력한 전개 요청을 우선한다. 공감 상황, 방법 설명, 루틴 시연, 제품 사용 장면 중 주제에 맞는 방향으로 컷을 구성한다.',
      visualDirection: '심플한 선화, 핵심 행동이 보이는 구도, 짧은 말풍선, 큰 글씨, 필요한 경우 화살표/배지/체크 표시',
      storyFlow: '주제와 약속 제시\n핵심 흐름 한눈에 보기\n첫 번째 장면 또는 단계\n두 번째 장면 또는 단계\n주의점 또는 변형\n저장 체크리스트',
      avoid: '사용자 요청과 다른 감정 서사, 긴 대사, 작은 글씨, 핵심 행동이 보이지 않는 구도'
    }
  },
  {
    id: 'information',
    label: '정보형 카드뉴스',
    summary: '문제-기준-정리 구조',
    defaults: {
      title: '정보형 카드뉴스 기획',
      goal: '독자가 빠르게 이해하고 저장할 수 있는 기준을 제공한다.',
      promptGuide: '카드마다 핵심 문장 하나를 먼저 정하고, 보조 설명은 짧게 제한한다.',
      visualDirection: '넓은 여백, 명확한 제목, 표/체크/비교 요소',
      storyFlow: '문제 제기\n왜 중요한지\n핵심 기준\n예시 또는 비교\n실행 체크리스트',
      avoid: '출처 없는 단정, 긴 문단, 한 카드에 여러 메시지, 작은 표'
    }
  },
  {
    id: 'product',
    label: '제품 추천형',
    summary: '상황-필요-선택 기준',
    defaults: {
      title: '제품 추천 카드뉴스 기획',
      goal: '제품을 바로 팔기보다 어떤 상황에서 필요한지 설득한다.',
      promptGuide: '제품 이미지는 보조 요소로 두고 사용 상황과 선택 기준을 먼저 보여준다.',
      visualDirection: '제품 컷, 사용 장면, 비교 칩, 깔끔한 배경',
      storyFlow: '문제 상황\n필요한 이유\n선택 기준\n추천 포인트\n구매 전 체크',
      avoid: '과장 광고, 브랜드명 남발, 확인 안 된 효능, 복잡한 가격표'
    }
  }
];

const CHARACTER_STYLE_PRESETS = [
  {
    id: 'rough-doodle',
    label: '러프 낙서형',
    summary: '대충 그린 듯한 손그림',
    prompt: 'rough hand-drawn doodle toon style, imperfect marker lines, casual sketchbook feeling, playful uneven strokes, simple black ink, like a quick KakaoTalk-style note illustration'
  },
  {
    id: 'clean-line',
    label: '깔끔한 선화',
    summary: '정돈된 인스타툰 선',
    prompt: 'clean Korean Instagram toon line art, smooth confident outlines, simple rounded shapes, clear facial expressions, minimal flat color accents'
  },
  {
    id: 'detailed-toon',
    label: '디테일 일러스트',
    summary: '소품/복장 디테일 강화',
    prompt: 'polished detailed toon illustration, richer outfit and prop details, clean line art with soft shading, expressive pose, still reusable across panels'
  },
  {
    id: 'semi-real',
    label: '반실사 캐릭터',
    summary: '비율과 표정이 조금 더 현실적',
    prompt: 'semi-realistic Korean webtoon character style, natural body proportions, detailed facial features, soft painterly shading, editorial but still toon-friendly'
  }
];

const CHARACTER_DETAIL_PRESETS = [
  { id: 'simple', label: '단순', prompt: 'very simple silhouette, few details, thick readable lines, no shading' },
  { id: 'balanced', label: '보통', prompt: 'balanced detail, clear outfit, readable expression, light accents only' },
  { id: 'detailed', label: '자세히', prompt: 'more detailed outfit folds, hair texture, props, pose nuance, light shading' }
];

const DEFAULT_FORM = {
  title: '인스타툰 카드뉴스 기획',
  format: 'instatoon',
  topic: '',
  audience: '',
  goal: FORMAT_PRESETS[0].defaults.goal,
  contentDirection: '',
  cardCount: 6,
  detailLevel: 'balanced',
  tone: '',
  characterName: '',
  characterRole: '',
  characterTraits: '',
  characterPrompt: '',
  characterStyleId: 'rough-doodle',
  characterDetailLevel: 'simple',
  characterAssets: [],
  selectedCharacterId: '',
  visualDirection: FORMAT_PRESETS[0].defaults.visualDirection,
  storyFlow: FORMAT_PRESETS[0].defaults.storyFlow,
  promptGuide: FORMAT_PRESETS[0].defaults.promptGuide,
  avoid: FORMAT_PRESETS[0].defaults.avoid,
  templateId: '',
  templateLabel: '',
  templateFormatSignal: '',
  templateCanvas: '',
  templatePlatforms: [],
  templatePlatformSpecs: [],
  templateProduction: null,
  templateCardPlan: [],
  templateEditorControls: [],
  templateProductionFlow: [],
  templateLayoutSlots: [],
  templateChannelStrategy: [],
  templateBlueprint: null,
  templateSettings: {}
};

const PLANNING_FORM_DRAFT_KEY = 'trlab.planning.form-draft.v1';
const metadataLabelMaps = {
  ageGroups: {
    '10s': '10대',
    '20s': '20대',
    '30s': '30대',
    '40s': '40대',
    '50s': '50대 이상',
    all: '전 연령'
  },
  gender: {
    all: '전체',
    female: '여성',
    male: '남성'
  },
  situations: {
    saving: '절약',
    selfDev: '자기계발',
    health: '건강',
    parenting: '육아',
    work: '직장생활',
    relationship: '연애/관계',
    hobby: '취미',
    purchase: '구매 고민',
    search: '정보 탐색',
    trend: '트렌드 확인',
    other: '기타'
  },
  objective: {
    save: '저장 유도',
    share: '공유 유도',
    purchase: '구매 전환',
    comment: '댓글 유도',
    awareness: '브랜드 인지',
    education: '교육/설명',
    other: '기타'
  },
  tone: {
    empathy: '공감형',
    info: '정보형',
    humor: '유머형',
    expert: '전문형',
    emotional: '감성형',
    hook: '자극적 후킹형',
    other: '기타'
  },
  channel: {
    instagram: '인스타그램',
    blog: '블로그',
    threads: '스레드',
    shorts: '유튜브 쇼츠',
    tiktok: '틱톡',
    other: '기타'
  }
};

export default function Planning() {
  const { planningDrafts, setPlanningDrafts, setView, currentWork, equipItem, updateCurrentWork, assetLibrary, saveAsset } = useTrLabWorkspace();
  const { createWorkWithDialog } = useWorkDialogs();
  const [form, setForm] = useState(DEFAULT_FORM);
  const [selectedDraftId, setSelectedDraftId] = useState('');
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [assistState, setAssistState] = useState({ loadingStage: '', error: '' });
  const [characterState, setCharacterState] = useState({ loading: false, error: '' });
  const [savedDraft, setSavedDraft] = useState(null);
  const [imageDialog, setImageDialog] = useState(null);
  const [templateAppliedId, setTemplateAppliedId] = useState('');
  const equippedTemplate = useMemo(() => resolveEquippedTemplate(currentWork?.equippedItems?.template), [currentWork?.equippedItems?.template]);
  const selectedPreset = useMemo(() => FORMAT_PRESETS.find((preset) => preset.id === form.format) ?? FORMAT_PRESETS[0], [form.format]);
  const canSave = form.title.trim() && form.topic.trim();
  const canGenerateCharacter = form.format === 'instatoon' && !characterState.loading;
  const characterPreview = useMemo(() => makeCharacterPreview(form), [form]);
  const flowCards = useMemo(() => parseStoryFlow(form.storyFlow, form.cardCount), [form.storyFlow, form.cardCount]);

  useEffect(() => {
    if (!currentWork?.id) {
      setForm(DEFAULT_FORM);
      setSelectedDraftId('');
      setDraftLoaded(true);
      return;
    }
    setDraftLoaded(false);
    const workDraft = currentWork.planningDraft;
    const localDraft = loadPlanningFormDraft(currentWork.id);
    if (workDraft?.id) {
      setSelectedDraftId(workDraft.id);
      setForm(formFromDraft(workDraft));
    } else if (localDraft) {
      setSelectedDraftId('');
      setForm((current) => mergePlanningLocalDraft({ ...current, ...metadataFormFromWork(currentWork) }, localDraft));
    } else {
      setSelectedDraftId('');
      setForm((current) => ({ ...current, ...metadataFormFromWork(currentWork) }));
    }
    setTemplateAppliedId('');
    setDraftLoaded(true);
  }, [currentWork?.id]);

  useEffect(() => {
    if (!draftLoaded || !currentWork?.id) return;
    savePlanningFormDraft(form, currentWork.id);
  }, [currentWork?.id, draftLoaded, form]);

  useEffect(() => {
    if (!draftLoaded || !currentWork?.id || currentWork?.planningDraft?.id) return;
    const metadataForm = metadataFormFromWork(currentWork);
    setForm((current) => ({
      ...current,
      title: metadataForm.title,
      topic: metadataForm.topic,
      audience: metadataForm.audience,
      goal: metadataForm.goal,
      contentDirection: current.contentDirection || metadataForm.contentDirection,
      tone: metadataForm.tone,
      format: metadataForm.format
    }));
  }, [
    currentWork?.id,
    currentWork?.title,
    currentWork?.metadata?.goal,
    currentWork?.metadata?.audienceNote,
    currentWork?.metadata?.ageGroups,
    currentWork?.metadata?.gender,
    currentWork?.metadata?.situations,
    currentWork?.metadata?.objective,
    currentWork?.metadata?.tone,
    currentWork?.metadata?.channel,
    currentWork?.planningDraft?.id,
    draftLoaded
  ]);

  useEffect(() => {
    if (!draftLoaded || !equippedTemplate || currentWork?.planningDraft || templateAppliedId === equippedTemplate.id) return;
    setForm((current) => applyTemplateToForm(current, equippedTemplate, { preserveTopic: true }));
    setTemplateAppliedId(equippedTemplate.id);
  }, [currentWork?.planningDraft, draftLoaded, equippedTemplate, templateAppliedId]);

  useEffect(() => {
    const draft = currentWork?.planningDraft;
    if (!draftLoaded || !draft?.id || selectedDraftId === draft.id) return;
    setSelectedDraftId(draft.id);
    setForm(formFromDraft(draft));
  }, [currentWork?.id, currentWork?.planningDraft, draftLoaded, selectedDraftId]);

  useEffect(() => {
    if (!savedDraft) return undefined;
    const timer = window.setTimeout(() => setSavedDraft(null), 3600);
    return () => window.clearTimeout(timer);
  }, [savedDraft]);

  useEffect(() => {
    if (!draftLoaded || !form.characterAssets?.length) return;
    form.characterAssets.forEach((asset) => saveAsset?.(asset));
  }, [draftLoaded, form.characterAssets, saveAsset]);

  const update = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));
  const updateTopic = (event) => {
    const topic = event.target.value;
    setForm((current) => ({
      ...current,
      topic,
      title: topic.trim() ? `${topic.trim()} 카드뉴스 기획` : DEFAULT_FORM.title
    }));
  };
  const choosePreset = (preset) => {
    setForm((current) => ({
      ...current,
      format: preset.id,
      title: current.title === selectedPreset.defaults.title || !current.title.trim() ? preset.defaults.title : current.title,
      goal: preset.defaults.goal,
      visualDirection: preset.defaults.visualDirection,
      storyFlow: preset.defaults.storyFlow,
      promptGuide: preset.defaults.promptGuide,
      avoid: preset.defaults.avoid
    }));
  };
  const updateFlowCard = (index, value) => {
    setForm((current) => {
      const cards = parseStoryFlow(current.storyFlow, current.cardCount);
      cards[index] = value;
      return { ...current, storyFlow: cards.join('\n') };
    });
  };
  const addFlowCard = () => {
    setForm((current) => {
      const cards = parseStoryFlow(current.storyFlow, current.cardCount);
      if (cards.length >= 12) return current;
      return { ...current, cardCount: cards.length + 1, storyFlow: [...cards, '새 컷 역할 입력'].join('\n') };
    });
  };
  const removeFlowCard = (index) => {
    setForm((current) => {
      const cards = parseStoryFlow(current.storyFlow, current.cardCount).filter((_, cardIndex) => cardIndex !== index);
      const nextCards = cards.length ? cards : ['첫 컷 역할 입력'];
      return { ...current, cardCount: nextCards.length, storyFlow: nextCards.join('\n') };
    });
  };
  const applyEquippedTemplateToForm = () => {
    if (!equippedTemplate) return;
    setForm((current) => applyTemplateToForm(current, equippedTemplate, { preserveTopic: true }));
    setTemplateAppliedId(equippedTemplate.id);
  };
  const requestPlanningAssist = async (stage) => {
    if (!form.topic.trim()) {
      setAssistState({ loadingStage: '', error: '기본 설정의 주제를 먼저 입력해 주세요.' });
      return;
    }
    setAssistState({ loadingStage: stage, error: '' });
    try {
      const data = await assistPlanningStage(makePlanningAssistPayload(stage, form, selectedPreset, equippedTemplate));
      setForm((current) => applyPlanningAssist(current, data));
    } catch (error) {
      setAssistState({ loadingStage: '', error: error instanceof Error ? error.message : 'AI 도움을 받지 못했습니다.' });
      return;
    }
    setAssistState({ loadingStage: '', error: '' });
  };
  const toggleTemplateSetting = (group, item) => {
    setForm((current) => {
      const currentValues = Array.isArray(current.templateSettings?.[group]) ? current.templateSettings[group] : [];
      const nextValues = currentValues.includes(item)
        ? currentValues.filter((value) => value !== item)
        : [...currentValues, item];
      return {
        ...current,
        templateSettings: {
          ...(current.templateSettings ?? {}),
          [group]: nextValues
        }
      };
    });
  };
  const autoCharacterPrompt = () => {
    setForm((current) => ({ ...current, ...makeAutoCharacterFields(current, selectedPreset) }));
  };
  const generateCharacter = async () => {
    if (!canGenerateCharacter) return;
    setCharacterState({ loading: true, error: '' });
    try {
      const prompt = makeCharacterImagePrompt(form);
      const data = await generateContentImage({
        persist: false,
        preferredProvider: 'openai',
        index: form.characterAssets.length,
        customImagePrompt: prompt,
        card: {
          title: form.characterName || '인스타툰 캐릭터',
          role: 'character_reference',
          layout: 'character_sheet',
          imageSourceMode: 'ai_only',
          visualPrompt: prompt
        },
        studio: {
          label: form.topic || form.title,
          keyword: form.topic || form.title,
          category: '인스타툰 캐릭터'
        },
        plan: {
          id: selectedDraftId || 'planning-character',
          primaryTopic: form.topic || form.title,
          productionBrief: {
            designConcept: 'Reusable Instagram toon character reference sheet',
            imageGenerationPolicy: 'OpenAI로 캐릭터 레퍼런스를 생성하고 카드 편집 단계에서 재사용한다.'
          }
        },
        style: {
          name: 'Instagram toon character sheet',
          imageSourceMode: 'ai_only'
        }
      });
      const asset = normalizeCharacterAsset({ form, image: data.image, prompt, currentWork });
      saveAsset?.(asset);
      setForm((current) => ({
        ...current,
        characterAssets: [asset, ...(current.characterAssets ?? [])].slice(0, 12),
        selectedCharacterId: asset.id
      }));
    } catch (error) {
      setCharacterState({ loading: false, error: error instanceof Error ? error.message : '캐릭터 생성 실패' });
      return;
    }
    setCharacterState({ loading: false, error: '' });
  };
  const selectCharacter = (assetId) => setForm((current) => ({ ...current, selectedCharacterId: assetId }));
  const importCharacterAsset = (asset) => {
    if (!asset?.url) return;
    setForm((current) => ({
      ...current,
      characterAssets: [asset, ...(current.characterAssets ?? []).filter((item) => item.id !== asset.id)].slice(0, 12),
      selectedCharacterId: asset.id,
      characterName: current.characterName || asset.name || '',
      characterRole: current.characterRole || asset.role || '',
      characterTraits: current.characterTraits || asset.traits || ''
    }));
  };
  const removeCharacter = (assetId) => setForm((current) => {
    const nextAssets = (current.characterAssets ?? []).filter((asset) => asset.id !== assetId);
    return {
      ...current,
      characterAssets: nextAssets,
      selectedCharacterId: current.selectedCharacterId === assetId ? nextAssets[0]?.id ?? '' : current.selectedCharacterId
    };
  });
  const saveDraft = () => {
    if (!canSave) return null;
    const draft = normalizeDraft(form, selectedPreset, selectedDraftId);
    setPlanningDrafts((items = []) => [draft, ...items.filter((item) => item.id !== draft.id)]);
    setSelectedDraftId(draft.id);
    equipItem('planning', {
      id: draft.id,
      label: draft.title,
      description: draft.topic || draft.goal,
      meta: `${draft.cardCount ?? form.cardCount}컷`
    });
    updateCurrentWork((work) => ({
      ...work,
      title: work.title === '새 카드뉴스 작업물' || !work.title ? draft.title : work.title,
      drafts: {
        ...(work.drafts ?? {}),
        planning: [draft, ...(work.drafts?.planning ?? []).filter((item) => item.id !== draft.id)].slice(0, 12)
      },
      planningDraft: draft,
      status: 'planning'
    }));
    setSavedDraft({ id: draft.id, title: draft.title, savedAt: draft.updatedAt });
    return draft;
  };
  const completePlanning = () => {
    const draft = saveDraft();
    if (!draft) return;
    setView('templates');
  };
  const loadDraft = (draft) => {
    setSelectedDraftId(draft.id);
    equipItem('planning', {
      id: draft.id,
      label: draft.title,
      description: draft.topic || draft.goal,
      meta: `${draft.cardCount ?? DEFAULT_FORM.cardCount}컷`
    });
    updateCurrentWork((work) => ({
      ...work,
      title: work.title === '새 카드뉴스 작업물' || !work.title ? draft.title : work.title,
      planningDraft: draft,
      status: 'planning'
    }));
    setForm(formFromDraft(draft));
  };

  if (!currentWork) {
    return (
      <div className="mx-auto grid min-h-[420px] max-w-2xl place-items-center rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center">
        <div>
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-lg bg-slate-100 text-slate-500">
            <FolderKanban className="h-5 w-5" />
          </div>
          <h1 className="mt-4 text-xl font-semibold text-slate-950">먼저 작업물을 만들어 주세요</h1>
          <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">기획은 작업물 안에 저장됩니다. 새 작업물을 만들면 먼저 작업물 정보를 정리합니다.</p>
          <Button className="mt-5" onClick={() => createWorkWithDialog({ initialTitle: '새 카드뉴스 작업물', stage: 'metadata' })}>
            <FilePlus2 className="h-4 w-4" />
            새 작업물 만들기
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1120px] space-y-4">
      <NoticeToast
        title="AI 도움 실패"
        message={assistState.error}
        onClose={() => setAssistState((current) => ({ ...current, error: '' }))}
      />
      <NoticeToast
        title="초안 저장 완료"
        message={savedDraft ? `${savedDraft.title} 초안이 작업물에 저장됐습니다.` : ''}
        tone="info"
        placement="bottom-center"
        onClose={() => setSavedDraft(null)}
      />
      {imageDialog ? <ImageDialog image={imageDialog} onClose={() => setImageDialog(null)} /> : null}

      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <div className="min-w-0">
            <h1 className="text-xl font-semibold tracking-normal text-slate-950">기획</h1>
            <p className="mt-2 text-sm font-medium leading-6 text-slate-500">주제, 독자, 컷 흐름, 제작 조건을 먼저 확정한 뒤 이 기획서에 맞는 템플릿을 추천받습니다.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <PlanningStat label="템플릿" value={equippedTemplate?.label || '미선택'} />
              <PlanningStat label="컷 수" value={`${Number(form.cardCount) || 0}컷`} />
              <PlanningStat label="저장 초안" value={`${planningDrafts.length}개`} />
              {savedDraft ? <PlanningStat label="상태" value="방금 저장됨" tone="success" /> : null}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={saveDraft} disabled={!canSave} className={savedDraft ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : ''}>
              {savedDraft ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
              {savedDraft ? '저장됨' : '초안 저장'}
            </Button>
            <Button className="bg-indigo-600 text-white hover:bg-indigo-700" onClick={completePlanning} disabled={!canSave}>
              <ArrowRight className="h-4 w-4" />
              기획 완료하고 템플릿 추천으로
            </Button>
          </div>
        </div>
      </section>

      <main className="grid gap-4">
          <StepSection step="1" icon={ClipboardList} title="기본 설정" description="주제, 독자, 목표를 먼저 확정합니다.">
            <div className="mt-4 grid gap-4">
              <Field label="주제">
                <input id="planning-topic" name="topic" className={inputClass} value={form.topic} onChange={updateTopic} placeholder="예: 홈트레이닝에서 운동 구성을 짜는 방법" />
              </Field>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="대상 독자">
                  <input id="planning-audience" name="audience" className={inputClass} value={form.audience} onChange={update('audience')} placeholder="예: 운동을 막 시작한 사람" />
                </Field>
                <Field label="목표">
                  <input id="planning-goal" name="goal" className={inputClass} value={form.goal} onChange={update('goal')} placeholder="예: 저장, 팔로우, 전환" />
                </Field>
              </div>
              <PromptDirectionEditor
                value={form.contentDirection}
                form={form}
                onChange={(value) => setForm((current) => ({ ...current, contentDirection: value }))}
              />
              <div className="grid gap-4 md:grid-cols-[150px_minmax(0,1fr)]">
                <Field label="컷 수">
                  <input id="planning-card-count" name="cardCount" className={inputClass} type="number" min="3" max="12" value={form.cardCount} onChange={update('cardCount')} />
                </Field>
                <Field label="톤">
                  <input id="planning-tone" name="tone" className={inputClass} value={form.tone} onChange={update('tone')} />
                </Field>
              </div>
            </div>
          </StepSection>

          <StepSection
            step="2"
            icon={BookOpenText}
            title="형식과 흐름"
            description="콘텐츠 형식을 고르고 컷별 순서를 정합니다."
            action={<AssistButton stage="flow" loadingStage={assistState.loadingStage} disabled={!form.topic.trim()} onClick={requestPlanningAssist} />}
          >
            <div className="mt-4 grid gap-2 md:grid-cols-3">
              {FORMAT_PRESETS.map((preset) => (
                <button key={preset.id} type="button" className={presetButtonClass(form.format === preset.id)} onClick={() => choosePreset(preset)}>
                  <span className="block text-sm font-semibold">{preset.label}</span>
                  <span className="mt-1 block text-xs font-medium leading-5 opacity-75">{preset.summary}</span>
                </button>
              ))}
            </div>
            <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
              <FlowCardEditor cards={flowCards} onChange={updateFlowCard} onAdd={addFlowCard} onRemove={removeFlowCard} />
              <div className="grid content-start gap-2">
                <div className="text-xs font-semibold text-slate-500">디테일 수준</div>
                {[
                  ['simple', '간단히', '빠르게 초안'],
                  ['balanced', '적당히', '기본 권장'],
                  ['specific', '구체적으로', '제작 지시 강화']
                ].map(([id, label, note]) => (
                  <button key={id} type="button" className={detailButtonClass(form.detailLevel === id)} onClick={() => setForm((current) => ({ ...current, detailLevel: id }))}>
                    <span>{label}</span>
                    <small>{note}</small>
                  </button>
                ))}
              </div>
            </div>
          </StepSection>

          <StepSection
            step="3"
            icon={Wand2}
            title="제작 지시"
            description="다음 설계 단계로 넘길 시각 방향과 금지 조건입니다."
            action={<AssistButton stage="production" loadingStage={assistState.loadingStage} disabled={!form.topic.trim()} onClick={requestPlanningAssist} />}
          >
            {form.format === 'instatoon' ? (
              <div className="mt-4 rounded-lg border border-slate-200 bg-white p-3 text-xs font-semibold leading-5 text-slate-600">
                캐릭터 그림체: {characterStylePreset(form.characterStyleId).label} · {characterDetailPreset(form.characterDetailLevel).label}
              </div>
            ) : null}
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <Field label="화면/이미지 방향">
                <textarea className={textareaClass} value={form.visualDirection} onChange={update('visualDirection')} rows={6} />
              </Field>
              <Field label="피해야 할 것">
                <textarea className={textareaClass} value={form.avoid} onChange={update('avoid')} rows={6} />
              </Field>
            </div>
            <Field label="제작 프롬프트 가이드">
              <textarea className={`${textareaClass} mt-4`} value={form.promptGuide} onChange={update('promptGuide')} rows={5} />
            </Field>
          </StepSection>

          {form.format === 'instatoon' ? (
            <StepSection
              step="4"
              icon={UserRound}
              title="캐릭터 설정"
              description="인스타툰 계열 템플릿에서 반복 사용할 화자를 정합니다."
              action={<AssistButton stage="character" loadingStage={assistState.loadingStage} disabled={!form.topic.trim()} onClick={requestPlanningAssist} />}
            >
              <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_400px]">
                <div className="grid gap-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label="캐릭터 이름"><input className={inputClass} value={form.characterName} onChange={update('characterName')} /></Field>
                    <Field label="캐릭터 역할"><input className={inputClass} value={form.characterRole} onChange={update('characterRole')} /></Field>
                  </div>
                  <Field label="그림체 레퍼런스">
                    <div className="grid gap-2 sm:grid-cols-2">
                      {CHARACTER_STYLE_PRESETS.map((style) => {
                        const selected = form.characterStyleId === style.id;
                        return (
                          <button
                            key={style.id}
                            type="button"
                            className={`rounded-lg border p-3 text-left transition ${selected ? 'border-indigo-300 bg-indigo-50 text-indigo-900 ring-2 ring-indigo-100' : 'border-slate-200 bg-white text-slate-700 hover:border-indigo-200 hover:bg-indigo-50'}`}
                            onClick={() => setForm((current) => ({ ...current, characterStyleId: style.id }))}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-sm font-semibold">{style.label}</span>
                              <span className={`h-2.5 w-2.5 rounded-full ${selected ? 'bg-indigo-500' : 'bg-slate-200'}`} />
                            </div>
                            <div className="mt-1 text-xs font-medium leading-5 text-slate-500">{style.summary}</div>
                          </button>
                        );
                      })}
                    </div>
                  </Field>
                  <Field label="디테일 정도">
                    <div className="flex flex-wrap gap-2">
                      {CHARACTER_DETAIL_PRESETS.map((detail) => (
                        <button
                          key={detail.id}
                          type="button"
                          className={`${promptChipClass} ${form.characterDetailLevel === detail.id ? 'border-indigo-300 bg-indigo-50 text-indigo-700' : ''}`}
                          onClick={() => setForm((current) => ({ ...current, characterDetailLevel: detail.id }))}
                        >
                          {detail.label}
                        </button>
                      ))}
                    </div>
                  </Field>
                  <Field label="캐릭터 특징"><textarea className={textareaClass} value={form.characterTraits} onChange={update('characterTraits')} rows={4} /></Field>
                  <Field label="추가 이미지 프롬프트"><textarea className={textareaClass} value={form.characterPrompt} onChange={update('characterPrompt')} rows={4} placeholder="선택한 그림체에 더하고 싶은 복장, 포즈, 표정, 소품만 적어주세요." /></Field>
                  <CharacterAssetPicker
                    assets={assetLibrary?.characters ?? []}
                    currentAssets={form.characterAssets ?? []}
                    onImport={importCharacterAsset}
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" onClick={autoCharacterPrompt}><Sparkles className="h-4 w-4" />자동 정리</Button>
                    <Button onClick={generateCharacter} disabled={!canGenerateCharacter}>
                      {characterState.loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
                      캐릭터 생성
                    </Button>
                  </div>
                  {characterState.error ? <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">{characterState.error}</div> : null}
                </div>
                <CharacterPreview
                  form={form}
                  preview={characterPreview}
                  onOpenImage={setImageDialog}
                  onSelectCharacter={selectCharacter}
                  onRemoveCharacter={removeCharacter}
                />
              </div>
            </StepSection>
          ) : null}

          <StepSection step={form.format === 'instatoon' ? '5' : '4'} icon={Save} title="완료" description="상세 기획서를 저장한 뒤 이 기획서에 맞는 템플릿을 추천받습니다.">
            <DraftList drafts={planningDrafts} selectedId={selectedDraftId} onLoad={loadDraft} />
            <div className="mt-4 flex flex-col gap-3 rounded-lg border border-indigo-100 bg-indigo-50 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-sm font-semibold text-slate-950">기획이 끝났다면 템플릿을 추천받으세요</div>
                <p className="mt-1 text-xs font-medium leading-5 text-slate-600">현재 입력값을 상세 기획서로 저장한 뒤 템플릿 추천 페이지로 이동합니다.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={saveDraft} disabled={!canSave} className={savedDraft ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : ''}>
                  {savedDraft ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
                  {savedDraft ? '저장됨' : '초안 저장'}
                </Button>
                <Button className="bg-indigo-600 text-white hover:bg-indigo-700" onClick={completePlanning} disabled={!canSave}>
                  <ArrowRight className="h-4 w-4" />
                  기획 완료하고 템플릿 추천으로
                </Button>
              </div>
            </div>
          </StepSection>
        </main>
    </div>
  );
}

const inputClass = 'h-10 rounded-md border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-300 focus:bg-white focus:ring-2 focus:ring-indigo-100';
const textareaClass = 'min-h-24 resize-y rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium leading-6 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-300 focus:bg-white focus:ring-2 focus:ring-indigo-100';

function PlanningStat({ label, value, tone = 'default' }) {
  const success = tone === 'success';
  return (
    <div className={success ? 'rounded-lg bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-600 ring-1 ring-emerald-100' : 'rounded-lg bg-slate-50 px-3 py-2 text-xs font-medium text-slate-500 ring-1 ring-slate-200'}>
      <span className={success ? 'block text-[11px] font-semibold text-emerald-600' : 'block text-[11px] font-semibold text-slate-500'}>{label}</span>
      <strong className={success ? 'mt-0.5 block max-w-[180px] truncate text-sm font-semibold text-emerald-700' : 'mt-0.5 block max-w-[180px] truncate text-sm font-semibold text-slate-950'}>{value}</strong>
    </div>
  );
}

function SectionTitle({ icon: Icon, title, description }) {
  return (
    <div className="flex items-start gap-3">
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-600">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <h2 className="text-base font-semibold text-slate-950">{title}</h2>
        <p className="mt-1 text-sm font-medium leading-6 text-slate-500">{description}</p>
      </div>
    </div>
  );
}

function StepSection({ step, icon: Icon, title, description, action, children }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-indigo-600 text-sm font-semibold text-white shadow-sm shadow-indigo-100">{step}</div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4 text-slate-500" />
            <h2 className="text-base font-semibold text-slate-950">{title}</h2>
          </div>
          <p className="mt-1 text-sm font-medium leading-6 text-slate-500">{description}</p>
        </div>
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function AssistButton({ stage, loadingStage, disabled, onClick }) {
  const loading = loadingStage === stage;
  return (
    <Button size="sm" variant="outline" onClick={() => onClick(stage)} disabled={disabled || Boolean(loadingStage)}>
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
      {loading ? 'AI 작성 중' : 'AI로 채우기'}
    </Button>
  );
}

function Field({ label, children }) {
  return <label className="grid gap-1.5"><span className="text-xs font-semibold text-slate-500">{label}</span>{children}</label>;
}

function PromptDirectionEditor({ value, form, onChange }) {
  const applyTemplate = (type) => {
    onChange(makeDirectionPrompt(type, form));
  };
  return (
    <div className="grid gap-2">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-xs font-semibold text-slate-500">전개 프롬프트</div>
          <p className="mt-1 text-xs font-medium leading-5 text-slate-500">AI가 형식보다 먼저 따를 제작 지시입니다.</p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <button type="button" className={promptChipClass} onClick={() => applyTemplate('tutorial')}>방법 설명</button>
          <button type="button" className={promptChipClass} onClick={() => applyTemplate('story')}>공감 서사</button>
          <button type="button" className={promptChipClass} onClick={() => applyTemplate('comparison')}>비교</button>
          <button type="button" className={promptChipClass} onClick={() => applyTemplate('product')}>제품/선택</button>
        </div>
      </div>
      <textarea
        id="planning-content-direction"
        name="contentDirection"
        className={`${textareaClass} min-h-36 font-mono text-[13px]`}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={7}
        placeholder={[
          '목적: 이 콘텐츠로 독자가 무엇을 하게 만들지 적어주세요.',
          '포함: 꼭 들어가야 할 장면, 정보, 순서, 숫자, 기준을 적어주세요.',
          '표현: 장면, 자료, 비교, 시연 등 보여주는 방식을 적어주세요.',
          '제외: 원하지 않는 방향을 적어주세요.'
        ].join('\n')}
      />
    </div>
  );
}

const promptChipClass = 'rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700';

function makeDirectionPrompt(type, form = {}) {
  const topic = form.topic || '이 주제';
  const audience = form.audience || '타깃 독자';
  if (type === 'tutorial') {
    return [
      `목적: ${audience}가 ${topic}을 바로 따라 할 수 있게 만든다.`,
      `포함: 준비물/조건, 단계별 순서, 각 단계의 핵심 행동, 필요한 숫자나 기준, 마지막 저장 체크리스트.`,
      `표현: 감정 서사보다 과정을 시연하거나 예시를 보여주는 방식으로 구성한다.`,
      `제외: 시작 전 고민만 보여주는 장면, 주제와 상관없는 표정 중심 컷, 긴 대사, 핵심 행동이 보이지 않는 구도.`
    ].join('\n');
  }
  if (type === 'story') {
    return [
      `목적: ${audience}가 ${topic} 상황에 공감하고 저장/공유하게 만든다.`,
      `포함: 실제로 겪는 상황, 감정 변화, 깨닫는 지점, 짧은 반전 또는 정리, 마지막 행동 유도.`,
      `표현: 캐릭터의 표정과 짧은 대사로 흐름을 보여준다.`,
      `제외: 설명문처럼 딱딱한 문장, 한 컷에 여러 메시지, 과한 설정.`
    ].join('\n');
  }
  if (type === 'comparison') {
    return [
      `목적: ${audience}가 ${topic}을 비교해서 더 좋은 선택을 하게 만든다.`,
      `포함: 비교 기준, A/B 차이, 추천 상황, 피해야 할 조건, 마지막 요약표.`,
      `표현: 같은 기준을 반복해서 보여주고, 표/칩/체크 표시로 차이를 분명히 한다.`,
      `제외: 기준 없는 순위, 근거 없는 단정, 작은 글씨가 많은 표.`
    ].join('\n');
  }
  return [
    `목적: ${audience}가 ${topic}을 선택하거나 구매/신청하기 전에 판단 기준을 알게 만든다.`,
    `포함: 필요한 상황, 선택 기준, 핵심 장점, 주의할 조건, 다음 행동.`,
    `표현: 제품이나 선택지를 바로 팔기보다 사용 상황과 판단 기준을 먼저 보여준다.`,
    `제외: 과장 광고, 확인되지 않은 효능, 가격만 강조하는 구성.`
  ].join('\n');
}

function Summary({ label, value }) {
  return <div className="rounded-lg bg-slate-50 p-3"><div className="text-[11px] font-semibold text-slate-400">{label}</div><div className="mt-1 text-slate-700">{value}</div></div>;
}

function FlowCardEditor({ cards, onChange, onAdd, onRemove }) {
  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between gap-3">
        <div className="text-xs font-semibold text-slate-500">컷별 흐름</div>
        <Button size="sm" variant="outline" onClick={onAdd} disabled={cards.length >= 12}>
          <FilePlus2 className="h-4 w-4" />
          컷 추가
        </Button>
      </div>
      <div className="grid gap-2">
        {cards.map((card, index) => (
          <div key={`${index}-${cards.length}`} className="grid gap-2 rounded-lg border border-slate-200 bg-white p-3 shadow-sm md:grid-cols-[44px_minmax(0,1fr)_auto] md:items-center">
            <div className="grid h-9 w-9 place-items-center rounded-md bg-indigo-50 text-sm font-semibold text-indigo-700 ring-1 ring-indigo-100">{index + 1}</div>
            <input className={inputClass} value={card} onChange={(event) => onChange(index, event.target.value)} placeholder={`${index + 1}컷 역할`} />
            <Button size="icon" variant="ghost" onClick={() => onRemove(index)} disabled={cards.length <= 1} aria-label={`${index + 1}컷 삭제`}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

function DraftList({ drafts, selectedId, onLoad }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-slate-950">저장 초안</div>
          <p className="mt-1 text-xs font-medium text-slate-500">최근 저장한 기획을 다시 불러옵니다.</p>
        </div>
        <Badge variant="outline">{drafts.length}</Badge>
      </div>
      <div className="mt-3 grid gap-2">
        {drafts.length ? drafts.slice(0, 6).map((draft) => (
          <button key={draft.id} type="button" className={draftRowClass(selectedId === draft.id)} onClick={() => onLoad(draft)}>
            <span className="truncate text-sm font-semibold text-slate-900">{draft.title}</span>
            <span className="mt-1 truncate text-xs font-medium text-slate-500">{draft.topic || draft.goal}</span>
          </button>
        )) : (
          <div className="rounded-lg border border-dashed border-slate-200 p-3 text-sm font-medium leading-6 text-slate-500">아직 저장된 기획 초안이 없습니다.</div>
        )}
      </div>
    </section>
  );
}

function presetButtonClass(active) {
  return [
    'rounded-lg border p-3 text-left transition',
    active ? 'border-indigo-300 bg-indigo-50 text-indigo-950 shadow-sm ring-2 ring-indigo-100' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
  ].join(' ');
}

function detailButtonClass(active) {
  return [
    'grid rounded-lg border px-3 py-2 text-left text-sm font-semibold transition',
    active ? 'border-indigo-300 bg-indigo-50 text-indigo-950 ring-2 ring-indigo-100' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50',
    '[&>small]:mt-0.5 [&>small]:text-[11px] [&>small]:font-medium [&>small]:opacity-70'
  ].join(' ');
}

function draftRowClass(active) {
  return [
    'grid rounded-lg border px-3 py-2 text-left transition',
    active ? 'border-slate-900 bg-slate-50 ring-2 ring-slate-100' : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
  ].join(' ');
}

function TemplatePlanningPanel({ template, form, onApply, onToggleSetting, embedded = false }) {
  const Wrapper = embedded ? 'div' : 'section';
  const wrapperClass = embedded ? 'grid gap-4' : 'rounded-lg border border-slate-200 bg-white p-5 shadow-sm';
  if (!template) {
    return (
      <Wrapper className={embedded ? 'rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4' : 'rounded-lg border border-dashed border-slate-300 bg-white p-5'}>
        <div className="text-sm font-semibold text-slate-900">템플릿이 선택되지 않았습니다</div>
        <p className="mt-1 text-sm font-medium leading-6 text-slate-500">상세 기획서를 저장한 뒤 템플릿을 추천받으면 배경, 캐릭터, 폰트, 글자 배치 같은 제작 설정이 연결됩니다.</p>
      </Wrapper>
    );
  }
  const templateSynced = form.templateId === template.id;
  const controlGroups = template.editorControls?.length ? template.editorControls : template.production?.groups ?? [];
  const layoutSlots = template.layoutSlots ?? [];
  const channelStrategy = template.channelStrategy ?? [];
  const blueprint = template.templateBlueprint;
  return (
    <Wrapper className={wrapperClass}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="text-xs font-semibold text-slate-500">선택된 템플릿</div>
          <h2 className="mt-1 text-lg font-semibold text-slate-950">{template.label}</h2>
          <p className="mt-1 text-sm font-medium leading-6 text-slate-500">{template.production?.nextStep || template.description}</p>
        </div>
        <Button variant="outline" size="sm" className="shrink-0" onClick={onApply}>
          {templateSynced ? <Check className="h-4 w-4" /> : <Wand2 className="h-4 w-4" />}
          {templateSynced ? '반영됨' : '템플릿 기준 적용'}
        </Button>
      </div>

      <div className="mt-4 grid gap-2 text-xs font-medium text-slate-600 sm:grid-cols-3">
        <Summary label="유형" value={template.formatSignal || '-'} />
        <Summary label="캔버스" value={template.canvas || '-'} />
        <Summary label="컷 수" value={`${template.pages?.length || form.cardCount}컷`} />
      </div>

      <AICompositionGuide template={template} form={form} />

      {blueprint ? (
        <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="text-xs font-semibold text-slate-800">{blueprint.format}</div>
              <p className="mt-1 text-[11px] font-medium leading-4 text-slate-500">{blueprint.planningRule}</p>
            </div>
            <Badge variant="outline">{blueprint.idealCards}</Badge>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {(blueprint.bestFor ?? []).map((item) => <span key={item} className="rounded-full bg-white px-2 py-1 text-[11px] font-medium text-slate-500 ring-1 ring-slate-100">{item}</span>)}
          </div>
        </div>
      ) : null}

      <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div>
          <div className="mb-2 text-xs font-semibold text-slate-500">제작 설정</div>
          <div className="grid gap-2">
            {controlGroups.map(([title, items]) => (
              <div key={title} className="rounded-lg bg-slate-50 p-3">
                <div className="text-xs font-semibold text-slate-800">{title}</div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {items.map((item) => (
                    <button key={item} type="button" className={settingChipClass(isTemplateSettingSelected(form, title, item))} onClick={() => onToggleSetting?.(title, item)}>
                      {item}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          {layoutSlots.length ? (
            <div className="mt-4">
              <div className="mb-2 text-xs font-semibold text-slate-500">배치 슬롯</div>
              <div className="grid gap-1.5">
                {layoutSlots.map(([title, note]) => (
                  <div key={title} className="rounded-lg bg-slate-50 px-3 py-2">
                    <div className="text-xs font-semibold text-slate-800">{title}</div>
                    <div className="mt-0.5 text-[11px] font-medium leading-4 text-slate-500">{note}</div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
        <div>
          {template.productionFlow?.length ? (
            <div className="mb-4">
              <div className="mb-2 text-xs font-semibold text-slate-500">다음 작업 순서</div>
              <div className="grid gap-1.5">
                {template.productionFlow.map(([title, note], index) => (
                  <div key={`${title}-${index}`} className="grid grid-cols-[28px_minmax(0,1fr)] gap-2 rounded-lg bg-slate-50 px-3 py-2">
                    <div className="text-[11px] font-semibold text-slate-400">{index + 1}</div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-slate-800">{title}</div>
                      <div className="mt-0.5 text-[11px] font-medium leading-4 text-slate-500">{note}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
          <div className="mb-2 text-xs font-semibold text-slate-500">컷별 설계</div>
          <div className="grid gap-1.5">
            {(template.cardPlan ?? []).map(([title, note], index) => (
              <div key={`${title}-${index}`} className="grid grid-cols-[32px_minmax(0,1fr)] gap-2 rounded-lg bg-slate-50 px-3 py-2">
                <div className="text-[11px] font-semibold text-slate-400">{index + 1}</div>
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-slate-800">{title}</div>
                  <div className="mt-0.5 text-[11px] font-medium leading-4 text-slate-500">{note}</div>
                </div>
              </div>
            ))}
          </div>
          {channelStrategy.length ? (
            <div className="mt-4">
              <div className="mb-2 text-xs font-semibold text-slate-500">채널 전략</div>
              <div className="grid gap-1.5">
                {channelStrategy.map(([platform, items]) => (
                  <div key={platform} className="rounded-lg bg-slate-50 px-3 py-2">
                    <div className="text-xs font-semibold text-slate-800">{platform}</div>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {(items ?? []).map((item) => (
                        <span key={item} className="rounded-full bg-white px-2 py-1 text-[11px] font-medium text-slate-500 ring-1 ring-slate-100">{item}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </Wrapper>
  );
}

function AICompositionGuide({ template, form }) {
  const slots = (template.pages?.length ? template.pages : template.cardPlan?.map(([title]) => title) ?? []).slice(0, Number(form.cardCount) || 6);
  return (
    <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
      <div className="flex items-start gap-2">
        <div className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-md bg-white text-slate-600 ring-1 ring-slate-200">
          <Sparkles className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-xs font-semibold text-slate-900">AI 구성 도움</div>
          <p className="mt-1 text-[11px] font-medium leading-4 text-slate-500">
            주제와 독자를 입력한 뒤 AI 추천을 받으면, 아래 템플릿 흐름을 바탕으로 페이지별 제목과 역할을 다시 제안합니다.
          </p>
          {slots.length ? (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {slots.map((slot, index) => (
                <span key={`${slot}-${index}`} className="rounded-full bg-white px-2 py-1 text-[11px] font-medium text-slate-600 ring-1 ring-slate-100">
                  {index + 1}. {slot}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function isTemplateSettingSelected(form, group, item) {
  const values = form.templateSettings?.[group];
  return Array.isArray(values) && values.includes(item);
}

function settingChipClass(active) {
  return [
    'rounded-full px-2 py-1 text-[11px] font-medium transition',
    active ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-100' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'
  ].join(' ');
}

function CharacterAssetPicker({ assets = [], currentAssets = [], onImport }) {
  const currentIds = new Set(currentAssets.map((asset) => asset.id));
  const reusableAssets = assets.filter((asset) => asset?.url && !currentIds.has(asset.id)).slice(0, 12);
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="text-xs font-semibold text-slate-500">에셋에서 가져오기</div>
        <Badge variant="outline">{assets.length}개</Badge>
      </div>
      {reusableAssets.length ? (
        <div className="grid grid-cols-6 gap-2">
          {reusableAssets.map((asset, index) => (
            <button
              key={asset.id}
              type="button"
              className="aspect-[4/5] overflow-hidden rounded-md border border-slate-200 bg-slate-50 transition hover:border-indigo-300 hover:ring-2 hover:ring-indigo-100"
              onClick={() => onImport?.(asset)}
              title={asset.name}
              aria-label={`${index + 1}번 저장 캐릭터 가져오기`}
            >
              <img src={assetUrl(asset.url)} alt={asset.name} className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      ) : (
        <div className="rounded-md border border-dashed border-slate-200 bg-slate-50 p-3 text-xs font-medium leading-5 text-slate-500">
          저장된 캐릭터 에셋이 없습니다.
        </div>
      )}
    </div>
  );
}

function CharacterPreview({ form, preview, onOpenImage, onSelectCharacter, onRemoveCharacter }) {
  const assets = form.characterAssets ?? [];
  const selectedAssetId = form.selectedCharacterId || assets[0]?.id || '';
  const selectedAsset = assets.find((asset) => asset.id === selectedAssetId);
  const style = characterStylePreset(form.characterStyleId);
  const detail = characterDetailPreset(form.characterDetailLevel);
  const roughPreview = {
    title: `${form.characterName || '캐릭터'} 러프 미리보기`,
    description: form.characterRole,
    kind: 'svg',
    preview,
    name: form.characterName
  };
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-slate-950">캐릭터 미리보기</div>
          <div className="mt-1 flex flex-wrap gap-1.5">
            <Badge variant="outline">{style.label}</Badge>
            <Badge variant="outline">{detail.label}</Badge>
          </div>
        </div>
        {selectedAsset ? <Badge>대표</Badge> : null}
      </div>
      <button type="button" className="aspect-[4/5] w-full overflow-hidden rounded-lg border border-slate-200 bg-slate-50 text-left transition hover:border-indigo-300 hover:ring-2 hover:ring-indigo-100" onClick={() => onOpenImage?.(selectedAsset?.url ? { ...selectedAsset, url: assetUrl(selectedAsset.url), title: selectedAsset.name } : roughPreview)}>
        {selectedAsset?.url ? (
          <img src={assetUrl(selectedAsset.url)} alt="생성된 캐릭터" className="h-full w-full object-cover" />
        ) : (
          <svg viewBox="0 0 320 400" className="h-full w-full" role="img" aria-label="캐릭터 미리보기">
            <rect width="320" height="400" fill={preview.background} />
            <circle cx="160" cy="112" r="58" fill={preview.skin} stroke="#1f2937" strokeWidth="5" />
            <path d="M105 103c8-45 40-67 82-54 27 8 43 29 40 61-28-24-66-27-122-7Z" fill={preview.hair} />
            <circle cx="137" cy="117" r="6" fill="#111827" />
            <circle cx="183" cy="117" r="6" fill="#111827" />
            <path d={preview.mouth} fill="none" stroke="#111827" strokeLinecap="round" strokeWidth="5" />
            <path d="M102 244c9-52 39-82 58-82s49 30 58 82v94H102v-94Z" fill={preview.outfit} stroke="#1f2937" strokeWidth="5" />
            <path d="M112 190c-26 20-39 54-38 96" fill="none" stroke="#1f2937" strokeLinecap="round" strokeWidth="8" />
            <path d="M208 190c26 20 39 54 38 96" fill="none" stroke="#1f2937" strokeLinecap="round" strokeWidth="8" />
            <rect x="72" y="282" width="176" height="42" rx="21" fill="#ffffff" opacity="0.86" />
            <text x="160" y="308" textAnchor="middle" fill="#334155" fontSize="18" fontWeight="700">{preview.label}</text>
          </svg>
        )}
      </button>
      <div className="mt-3 min-w-0">
        <div className="truncate text-sm font-semibold text-slate-950">{form.characterName || selectedAsset?.name || '캐릭터'}</div>
      </div>
      {assets.length ? (
        <div className="mt-4">
          <div className="mb-2 text-xs font-semibold text-slate-500">현재 기획</div>
          <div className="grid grid-cols-4 gap-2">
            {assets.map((asset, index) => (
              <div key={asset.id} className="group relative">
                <button
                  type="button"
                  className={`aspect-[4/5] w-full overflow-hidden rounded-md border bg-slate-50 transition hover:border-indigo-300 hover:ring-2 hover:ring-indigo-100 ${asset.id === selectedAssetId ? 'border-indigo-300 ring-2 ring-indigo-100' : 'border-slate-200'}`}
                  onClick={() => onSelectCharacter?.(asset.id)}
                  aria-label={`${index + 1}번 캐릭터 대표 선택`}
                >
                  <img src={assetUrl(asset.url)} alt={asset.name} className="h-full w-full object-cover" />
                </button>
                <button type="button" className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-white/90 text-slate-500 opacity-0 shadow-sm transition hover:text-red-600 group-hover:opacity-100" onClick={() => onRemoveCharacter?.(asset.id)} aria-label="캐릭터 삭제">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="mt-4 rounded-lg border border-dashed border-slate-200 bg-slate-50 p-3 text-xs font-medium leading-5 text-slate-500">
          생성 전에는 선택한 그림체를 반영한 러프 미리보기가 표시됩니다.
        </div>
      )}
    </div>
  );
}

function ImageDialog({ image, onClose }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/70 p-4" role="dialog" aria-modal="true" onMouseDown={onClose}>
      <div className="grid max-h-[92vh] w-full max-w-5xl gap-3 rounded-lg bg-white p-4 shadow-2xl" onMouseDown={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold text-slate-950">{image.title || image.name || '캐릭터 이미지'}</h2>
            {image.description || image.model ? <p className="mt-1 truncate text-xs font-medium text-slate-500">{image.description || `${image.provider || 'image'} ${image.model || ''}`}</p> : null}
          </div>
          <Button size="icon" variant="ghost" onClick={onClose} aria-label="닫기"><X className="h-4 w-4" /></Button>
        </div>
        <div className="grid min-h-0 place-items-center overflow-auto rounded-lg bg-slate-100 p-3">
          {image.kind === 'svg' ? <RoughCharacterSvg preview={image.preview} name={image.name} /> : <img src={image.url} alt={image.title || image.name || '캐릭터 이미지'} className="max-h-[76vh] max-w-full rounded-lg object-contain shadow-sm" />}
        </div>
        {image.prompt ? <div className="max-h-24 overflow-auto rounded-lg bg-slate-950 p-3 text-xs font-medium leading-5 text-slate-100">{image.prompt}</div> : null}
      </div>
    </div>
  );
}

function RoughCharacterSvg({ preview, name }) {
  return (
    <svg viewBox="0 0 320 400" className="max-h-[76vh] w-full max-w-md rounded-lg bg-white shadow-sm" role="img" aria-label="캐릭터 러프 확대">
      <rect width="320" height="400" fill={preview.background} />
      <circle cx="160" cy="112" r="58" fill={preview.skin} stroke="#1f2937" strokeWidth="5" />
      <path d="M105 103c8-45 40-67 82-54 27 8 43 29 40 61-28-24-66-27-122-7Z" fill={preview.hair} />
      <circle cx="137" cy="117" r="6" fill="#111827" />
      <circle cx="183" cy="117" r="6" fill="#111827" />
      <path d={preview.mouth} fill="none" stroke="#111827" strokeLinecap="round" strokeWidth="5" />
      <path d="M102 244c9-52 39-82 58-82s49 30 58 82v94H102v-94Z" fill={preview.outfit} stroke="#1f2937" strokeWidth="5" />
      <path d="M112 190c-26 20-39 54-38 96" fill="none" stroke="#1f2937" strokeLinecap="round" strokeWidth="8" />
      <path d="M208 190c26 20 39 54 38 96" fill="none" stroke="#1f2937" strokeLinecap="round" strokeWidth="8" />
      <rect x="72" y="282" width="176" height="42" rx="21" fill="#ffffff" opacity="0.86" />
      <text x="160" y="308" textAnchor="middle" fill="#334155" fontSize="18" fontWeight="700">{(name || preview.label || '캐릭터').slice(0, 8)}</text>
    </svg>
  );
}

function formFromDraft(draft = {}) {
  return {
    title: draft.title || DEFAULT_FORM.title,
    format: FORMAT_PRESETS.some((preset) => preset.id === draft.format) ? draft.format : DEFAULT_FORM.format,
    topic: draft.topic ?? '',
    audience: draft.audience ?? '',
    goal: draft.goal ?? DEFAULT_FORM.goal,
    contentDirection: draft.contentDirection ?? '',
    cardCount: draft.cardCount ?? DEFAULT_FORM.cardCount,
    detailLevel: draft.detailLevel ?? DEFAULT_FORM.detailLevel,
    tone: draft.tone ?? DEFAULT_FORM.tone,
    characterName: draft.characterName ?? DEFAULT_FORM.characterName,
    characterRole: draft.characterRole ?? DEFAULT_FORM.characterRole,
    characterTraits: draft.characterTraits ?? DEFAULT_FORM.characterTraits,
    characterPrompt: draft.characterPrompt ?? DEFAULT_FORM.characterPrompt,
    characterStyleId: draft.characterStyleId ?? DEFAULT_FORM.characterStyleId,
    characterDetailLevel: draft.characterDetailLevel ?? DEFAULT_FORM.characterDetailLevel,
    characterAssets: Array.isArray(draft.characterAssets) ? draft.characterAssets : [],
    selectedCharacterId: draft.selectedCharacterId ?? draft.characterAssets?.[0]?.id ?? '',
    visualDirection: draft.visualDirection ?? DEFAULT_FORM.visualDirection,
    storyFlow: draft.storyFlow ?? DEFAULT_FORM.storyFlow,
    promptGuide: draft.promptGuide ?? DEFAULT_FORM.promptGuide,
    avoid: draft.avoid ?? DEFAULT_FORM.avoid,
    templateId: draft.templateId ?? '',
    templateLabel: draft.templateLabel ?? '',
    templateFormatSignal: draft.templateFormatSignal ?? '',
    templateCanvas: draft.templateCanvas ?? '',
    templatePlatforms: Array.isArray(draft.templatePlatforms) ? draft.templatePlatforms : [],
    templatePlatformSpecs: Array.isArray(draft.templatePlatformSpecs) ? draft.templatePlatformSpecs : [],
    templateProduction: draft.templateProduction ?? null,
    templateCardPlan: Array.isArray(draft.templateCardPlan) ? draft.templateCardPlan : [],
    templateEditorControls: Array.isArray(draft.templateEditorControls) ? draft.templateEditorControls : [],
    templateProductionFlow: Array.isArray(draft.templateProductionFlow) ? draft.templateProductionFlow : [],
    templateLayoutSlots: Array.isArray(draft.templateLayoutSlots) ? draft.templateLayoutSlots : [],
    templateChannelStrategy: Array.isArray(draft.templateChannelStrategy) ? draft.templateChannelStrategy : [],
    templateBlueprint: isTemplateBlueprint(draft.templateBlueprint) ? draft.templateBlueprint : null,
    templateSettings: normalizeTemplateSettings(draft.templateSettings)
  };
}

function normalizeDraft(form, preset, draftId) {
  const now = new Date().toISOString();
  return {
    ...form,
    id: draftId || `planning-${Date.now()}`,
    formatLabel: preset.label,
    cardCount: Number(form.cardCount) || 6,
    templateId: form.templateId || '',
    templateLabel: form.templateLabel || '',
    templateFormatSignal: form.templateFormatSignal || '',
    templateCanvas: form.templateCanvas || '',
    templatePlatforms: Array.isArray(form.templatePlatforms) ? form.templatePlatforms : [],
    templatePlatformSpecs: Array.isArray(form.templatePlatformSpecs) ? form.templatePlatformSpecs : [],
    templateProduction: form.templateProduction ?? null,
    templateCardPlan: Array.isArray(form.templateCardPlan) ? form.templateCardPlan : [],
    templateEditorControls: Array.isArray(form.templateEditorControls) ? form.templateEditorControls : [],
    templateProductionFlow: Array.isArray(form.templateProductionFlow) ? form.templateProductionFlow : [],
    templateLayoutSlots: Array.isArray(form.templateLayoutSlots) ? form.templateLayoutSlots : [],
    templateChannelStrategy: Array.isArray(form.templateChannelStrategy) ? form.templateChannelStrategy : [],
    templateBlueprint: isTemplateBlueprint(form.templateBlueprint) ? form.templateBlueprint : null,
    templateSettings: normalizeTemplateSettings(form.templateSettings),
    characterStyleId: form.characterStyleId || DEFAULT_FORM.characterStyleId,
    characterDetailLevel: form.characterDetailLevel || DEFAULT_FORM.characterDetailLevel,
    characterAssets: Array.isArray(form.characterAssets) ? form.characterAssets : [],
    selectedCharacterId: form.selectedCharacterId || form.characterAssets?.[0]?.id || '',
    updatedAt: now,
    createdAt: now
  };
}

function draftToStudio(draft) {
  const label = draft.topic || draft.title;
  return {
    id: `planning-studio-${draft.id}`,
    label,
    keyword: label,
    category: draft.formatLabel,
    summary: draft.goal,
    manualBrief: {
      topic: draft.topic || draft.title,
      prompt: makePlanningBriefPrompt(draft),
      audience: draft.audience,
      tone: draft.tone,
      cardCount: draft.cardCount,
      contentDirection: draft.contentDirection,
      channelName: '@trlab.insight'
    },
    contentIdeas: makeContentIdeas(draft),
    contentSetup: {
      title: draft.title,
      cardCount: draft.cardCount,
      templateId: draft.templateId,
      templateLabel: draft.templateLabel,
      templateFormatSignal: draft.templateFormatSignal,
      templateCanvas: draft.templateCanvas,
      templatePlatforms: draft.templatePlatforms,
      templatePlatformSpecs: draft.templatePlatformSpecs,
      templateProduction: draft.templateProduction,
      templateCardPlan: draft.templateCardPlan,
      templateEditorControls: draft.templateEditorControls,
      templateProductionFlow: draft.templateProductionFlow,
      templateLayoutSlots: draft.templateLayoutSlots,
      templateChannelStrategy: draft.templateChannelStrategy,
      templateBlueprint: draft.templateBlueprint,
      templateSettings: draft.templateSettings,
      characterLibrary: draft.characterAssets ?? [],
      selectedCharacterId: draft.selectedCharacterId,
      planningDraft: draft
    },
    validation: {
      contentType: draft.formatLabel,
      reason: draft.goal
    },
    production: {
      tier: '기획',
      score: 80,
      suggestedAngle: draft.promptGuide
    },
    planningDraft: draft
  };
}

function makeContentIdeas(draft) {
  const topic = draft.topic || '이 주제';
  if (draft.format === 'instatoon') return [`${topic}을 툰으로 쉽게 따라 하기`, `${topic} 단계별 시연`, `${topic} 저장용 체크포인트`];
  if (draft.format === 'product') return [`${topic} 사기 전 보는 기준`, `${topic} 필요한 사람과 아닌 사람`, `${topic} 고를 때 놓치는 것`];
  return [`${topic} 한 번에 정리`, `${topic} 기준부터 볼게요`, `${topic} 저장용 체크리스트`];
}

function makePlanningAssistPayload(stage, form, preset, template) {
  const characterStyle = characterStylePreset(form.characterStyleId);
  const characterDetail = characterDetailPreset(form.characterDetailLevel);
  return {
    stage,
    topic: form.topic,
    audience: form.audience,
    goal: form.goal,
    contentDirection: form.contentDirection,
    format: preset?.label || form.format,
    tone: form.tone,
    cardCount: form.cardCount,
    storyFlow: form.storyFlow,
    visualDirection: form.visualDirection,
    promptGuide: form.promptGuide,
    avoid: form.avoid,
    characterStyle: form.format === 'instatoon' ? {
      id: characterStyle.id,
      label: characterStyle.label,
      prompt: characterStyle.prompt,
      detailLevel: characterDetail.label,
      detailPrompt: characterDetail.prompt,
      role: form.characterRole,
      traits: form.characterTraits
    } : null,
    instructionMode: inferInstructionMode(form),
    template: template ? {
      id: template.id,
      label: template.label,
      formatSignal: template.formatSignal,
      cardPlan: template.cardPlan,
      editorControls: template.editorControls
    } : null
  };
}

function inferInstructionMode(form = {}) {
  const text = `${form.topic ?? ''} ${form.goal ?? ''} ${form.contentDirection ?? ''} ${form.storyFlow ?? ''} ${form.promptGuide ?? ''}`;
  if (/운동|홈트|루틴|상체|하체|코어|자세|횟수|세트|푸시업|팔굽혀|덤벨|플랭크|스쿼트|스트레칭/.test(text)) return 'exercise_tutorial';
  if (/방법|하는 법|가이드|순서|체크리스트|계획|루틴/.test(text)) return 'how_to_tutorial';
  return 'general';
}

function applyPlanningAssist(form, data = {}) {
  if (data.stage === 'flow') {
    const cardFlow = Array.isArray(data.cardFlow) ? data.cardFlow.map(cleanDraftText).filter(Boolean).slice(0, 12) : [];
    return {
      ...form,
      storyFlow: cardFlow.length ? cardFlow.join('\n') : form.storyFlow,
      cardCount: cardFlow.length || form.cardCount,
      detailLevel: ['simple', 'balanced', 'specific'].includes(data.detailLevel) ? data.detailLevel : form.detailLevel
    };
  }
  if (data.stage === 'production') {
    return {
      ...form,
      visualDirection: cleanDraftMultilineText(data.visualDirection) || form.visualDirection,
      promptGuide: cleanDraftMultilineText(data.promptGuide) || form.promptGuide,
      avoid: cleanDraftMultilineText(data.avoid) || form.avoid
    };
  }
  if (data.stage === 'character') {
    return {
      ...form,
      characterName: cleanDraftText(data.characterName) || form.characterName,
      characterRole: cleanDraftText(data.characterRole) || form.characterRole,
      characterTraits: cleanDraftText(data.characterTraits) || form.characterTraits,
      characterPrompt: cleanDraftText(data.characterPrompt) || form.characterPrompt
    };
  }
  if (data.stage === 'template') {
    return {
      ...form,
      templateSettings: {
        ...(form.templateSettings ?? {}),
        ...normalizeTemplateSettings(data.templateSettings)
      }
    };
  }
  return form;
}

function parseStoryFlow(value = '', cardCount = 6) {
  const cards = `${value ?? ''}`
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);
  if (cards.length) return cards.slice(0, 12);
  const count = Math.min(12, Math.max(1, Number(cardCount) || 6));
  return Array.from({ length: count }, (_, index) => `${index + 1}컷 역할 입력`);
}

function makeAutoCharacterFields(form, preset) {
  const topic = form.topic || '일상 공감';
  const audience = form.audience || '인스타그램 독자';
  const style = characterStylePreset(form.characterStyleId);
  const detail = characterDetailPreset(form.characterDetailLevel);
  const isWork = /직장|출근|회사|퇴근|월요|업무|상사|동료/.test(`${topic} ${audience}`);
  const isParent = /육아|부모|엄마|아빠|아이|아기|어린이/.test(`${topic} ${audience}`);
  const isTutorial = /방법|루틴|순서|단계|따라|시연|자세|횟수|세트|운동|튜토리얼/.test(`${topic} ${form.contentDirection} ${form.storyFlow}`);
  const role = isTutorial
    ? `${audience}에게 ${topic}을 시연하는 안내 캐릭터`
    : isParent ? '현실적인 초보 부모 주인공' : isWork ? '평범한 직장인 주인공' : `${audience}가 쉽게 이입하는 일상 주인공`;
  const name = isParent ? '하루맘' : isWork ? '오늘이' : '모아';
  const traits = isTutorial
    ? '동작이 잘 보이는 단순한 복장, 과장되지 않은 표정, 손짓과 포즈로 핵심을 설명하는 캐릭터'
    : isParent
    ? '눈 밑 피곤함은 살짝 있지만 표정이 따뜻하고, 당황-공감-작은 안도감이 잘 드러나는 캐릭터'
    : isWork
      ? '표정 변화가 크고, 속마음이 얼굴에 살짝 드러나며, 지친 듯하지만 귀여운 현실감이 있는 캐릭터'
      : '과장되지 않은 표정과 단순한 실루엣으로 다양한 상황에 재사용하기 쉬운 캐릭터';
  return {
    characterName: name,
    characterRole: role,
    characterTraits: traits,
    characterPrompt: [
      `simple Korean Instagram toon main character for ${topic}`,
      role,
      traits,
      `target audience: ${audience}`,
      style.prompt,
      detail.prompt,
      `round friendly face, expressive eyes, reusable outfit`,
      `consistent character sheet, front view, side view, three quarter view, 3 facial expressions`,
      `no readable text, no logo, no complex background`,
      `style goal: ${preset.label}`
    ].join(', ')
  };
}

function normalizeCharacterAsset({ form, image, prompt, currentWork }) {
  const createdAt = new Date().toISOString();
  const id = `character-${Date.now()}`;
  const style = characterStylePreset(form.characterStyleId);
  const detail = characterDetailPreset(form.characterDetailLevel);
  return {
    id,
    type: 'character',
    name: form.characterName || `캐릭터 ${createdAt.slice(11, 16)}`,
    role: form.characterRole,
    traits: form.characterTraits,
    prompt,
    url: image?.url,
    provider: image?.provider || 'openai',
    model: image?.model || '',
    sourceWorkId: currentWork?.id || '',
    sourceWorkTitle: currentWork?.title || '',
    styleLabel: style.label,
    detailLabel: detail.label,
    createdAt,
    defaultPlacement: {
      x: 0.58,
      y: 0.28,
      width: 0.32,
      height: 0.42,
      anchor: 'right-middle'
    }
  };
}

function assetUrl(url = '') {
  if (!url || /^(data:|https?:\/\/)/.test(url)) return url;
  if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
    return `http://${window.location.hostname}:5174${url}`;
  }
  return url;
}

function makeCharacterImagePrompt(form) {
  const style = characterStylePreset(form.characterStyleId);
  const detail = characterDetailPreset(form.characterDetailLevel);
  return [
    'Create a reusable character reference image for a Korean Instagram toon carousel.',
    'Use OpenAI image generation. Output should be a clean character sheet, not a finished card.',
    `Character name: ${form.characterName || 'main character'}.`,
    `Role: ${form.characterRole || 'relatable everyday protagonist'}.`,
    `Traits: ${form.characterTraits || 'simple expressive character'}.`,
    `Topic context: ${form.topic || form.title}.`,
    `Audience: ${form.audience || 'Instagram readers'}.`,
    `Reference style: ${style.label}. ${style.prompt}.`,
    `Detail level: ${detail.label}. ${detail.prompt}.`,
    form.characterPrompt ? `Additional user prompt: ${form.characterPrompt}.` : '',
    'Include one main full-body pose and two small expression variations if possible.',
    'Keep the design simple and reusable across many panels.',
    'No readable text, no logo, no watermark, no speech bubbles, no complex background.',
    'Use a plain light background so the character can later be placed on card layouts.'
  ].filter(Boolean).join('\n');
}

function makeCharacterPreview(form) {
  const style = characterStylePreset(form.characterStyleId);
  const detail = characterDetailPreset(form.characterDetailLevel);
  const text = `${style.prompt} ${detail.prompt} ${form.characterPrompt} ${form.characterTraits} ${form.characterRole}`;
  const hue = hashText(text) % 360;
  const worried = /피곤|지친|당황|월요|출근|현실|초보/.test(text);
  return {
    background: `hsl(${hue} 52% 94%)`,
    outfit: `hsl(${(hue + 34) % 360} 48% 58%)`,
    hair: /밝|갈색|brown/i.test(text) ? '#7c4a2d' : '#263238',
    skin: '#f6d7bd',
    mouth: worried ? 'M138 145c15-10 30-10 45 0' : 'M138 142c13 15 32 15 45 0',
    label: (form.characterName || '캐릭터').slice(0, 8),
    note: `${style.label} · ${detail.label}`
  };
}

function characterStylePreset(id) {
  return CHARACTER_STYLE_PRESETS.find((preset) => preset.id === id) ?? CHARACTER_STYLE_PRESETS[0];
}

function characterDetailPreset(id) {
  return CHARACTER_DETAIL_PRESETS.find((preset) => preset.id === id) ?? CHARACTER_DETAIL_PRESETS[0];
}

function hashText(value = '') {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  return hash;
}

function makePlanningBriefPrompt(draft) {
  const characters = draft.characterAssets?.length
    ? draft.characterAssets.map((asset, index) => `${index + 1}번 캐릭터: ${asset.name} (${asset.role}) / 참조 이미지: ${asset.url} / 기본 배치: x ${asset.defaultPlacement?.x}, y ${asset.defaultPlacement?.y}, width ${asset.defaultPlacement?.width}`).join('\n')
    : '저장된 캐릭터 없음';
  return [
    draft.goal,
    ``,
    draft.contentDirection ? `전개 프롬프트:\n${draft.contentDirection}` : '',
    `형식: ${draft.formatLabel}`,
    draft.templateLabel ? `선택 템플릿: ${draft.templateLabel}\n템플릿 유형: ${draft.templateFormatSignal}\n캔버스: ${draft.templateCanvas}\n채널: ${(draft.templatePlatforms ?? []).join(', ')}` : '',
    `카드 흐름:\n${draft.storyFlow}`,
    draft.templateProduction ? `템플릿 제작 설정:\n${formatProductionBrief(draft.templateProduction)}` : '',
    draft.templateEditorControls?.length ? `편집 컨트롤:\n${formatEditorControlsBrief(draft.templateEditorControls)}` : '',
    draft.templateProductionFlow?.length ? `제작 흐름:\n${formatProductionFlowBrief(draft.templateProductionFlow)}` : '',
    draft.templateLayoutSlots?.length ? `배치 슬롯:\n${formatCardPlanBrief(draft.templateLayoutSlots)}` : '',
    draft.templateChannelStrategy?.length ? `채널 전략:\n${formatChannelStrategyBrief(draft.templateChannelStrategy)}` : '',
    draft.templateBlueprint ? `카드 유형 블루프린트:\n${formatTemplateBlueprintBrief(draft.templateBlueprint)}` : '',
    Object.keys(draft.templateSettings ?? {}).length ? `선택한 제작 옵션:\n${formatTemplateSettingsBrief(draft.templateSettings)}` : '',
    draft.templateCardPlan?.length ? `컷별 역할:\n${formatCardPlanBrief(draft.templateCardPlan)}` : '',
    `프롬프트 가이드:\n${draft.promptGuide}`,
    draft.format === 'instatoon' ? `캐릭터 설정:\n이름: ${draft.characterName}\n역할: ${draft.characterRole}\n특징: ${draft.characterTraits}\n캐릭터 생성 프롬프트: ${draft.characterPrompt}\n대표 캐릭터 ID: ${draft.selectedCharacterId || ''}\n저장된 캐릭터:\n${characters}\n카드 설계 시 필요한 카드에는 "characterAssetId"와 "characterPlacement"를 포함한다. characterPlacement는 0~1 비율의 x, y, width, height로 잡아 이후 편집기에서 드래그로 수정할 수 있게 한다.` : '',
    `시각 방향:\n${draft.visualDirection}`,
    `피해야 할 것:\n${draft.avoid}`
  ].filter(Boolean).join('\n\n');
}

function loadPlanningFormDraft(workId) {
  if (typeof window === 'undefined') return null;
  try {
    const parsed = JSON.parse(window.localStorage.getItem(planningFormDraftKey(workId)) || 'null');
    if (!parsed || typeof parsed !== 'object') return null;
    return sanitizePlanningFormDraft(parsed);
  } catch {
    return null;
  }
}

function metadataFormFromWork(work = {}) {
  const metadata = work.metadata ?? {};
  const topic = meaningfulWorkTitle(work.title) || cleanDraftText(metadata.goal);
  const audience = [
    cleanDraftText(metadata.audienceNote),
    metadataListLabels(metadata.ageGroups, metadataLabelMaps.ageGroups).join(', '),
    metadataLabel(metadata.gender, metadataLabelMaps.gender),
    metadataListLabels(metadata.situations, metadataLabelMaps.situations).join(', ')
  ].filter(Boolean).join(' / ');
  const objective = metadataLabel(metadata.objective, metadataLabelMaps.objective);
  const toneLabel = metadataLabel(metadata.tone, metadataLabelMaps.tone);
  const channel = metadataLabel(metadata.channel, metadataLabelMaps.channel);
  const goal = cleanDraftText(metadata.goal) || [objective, channel].filter(Boolean).join(' / ') || DEFAULT_FORM.goal;
  const format = metadata.tone === 'info' || metadata.objective === 'education' || /방법|루틴|가이드|체크|정보|상체|운동/.test(`${topic} ${goal}`) ? 'information' : DEFAULT_FORM.format;
  const preset = FORMAT_PRESETS.find((item) => item.id === format) ?? FORMAT_PRESETS[0];
  return {
    ...preset.defaults,
    format,
    title: topic ? `${topic} 카드뉴스 기획` : preset.defaults.title,
    topic,
    audience,
    goal,
    contentDirection: cleanDraftMultilineText(metadata.notes),
    tone: toneLabel ? `${toneLabel} 말투` : DEFAULT_FORM.tone
  };
}

function mergePlanningLocalDraft(base, localDraft) {
  const next = { ...base, ...localDraft };
  ['title', 'topic', 'audience', 'goal', 'tone'].forEach((key) => {
    if (!cleanDraftText(localDraft?.[key])) next[key] = base[key];
  });
  if (!cleanDraftMultilineText(localDraft?.contentDirection)) next.contentDirection = base.contentDirection;
  ['visualDirection', 'storyFlow', 'promptGuide', 'avoid'].forEach((key) => {
    if (!cleanDraftMultilineText(localDraft?.[key])) next[key] = base[key];
  });
  return next;
}

function meaningfulWorkTitle(title = '') {
  const cleaned = cleanDraftText(title);
  if (!cleaned || /^새 카드뉴스 작업물$/.test(cleaned) || /^카드뉴스 작업물\s*\d*$/.test(cleaned)) return '';
  return cleaned;
}

function metadataListLabels(values = [], labelMap = {}) {
  return (Array.isArray(values) ? values : [])
    .filter((value) => value && value !== 'none')
    .map((value) => labelMap[value] ?? value)
    .filter(Boolean);
}

function metadataLabel(value, labelMap = {}) {
  if (!value || value === 'none') return '';
  return labelMap[value] ?? value;
}

function resolveEquippedTemplate(template) {
  return resolveTemplateItem(template);
}

function applyTemplateToForm(form, template, options = {}) {
  const presetId = presetIdFromTemplate(template);
  const preset = FORMAT_PRESETS.find((item) => item.id === presetId) ?? FORMAT_PRESETS[0];
  const storyFlow = formatCardPlanFlow(template.cardPlan, template.pages);
  const productionBrief = formatProductionBrief(template.production);
  const topic = options.preserveTopic ? form.topic : '';
  return {
    ...form,
    format: preset.id,
    title: form.title?.trim() && form.title !== DEFAULT_FORM.title ? form.title : `${template.label} 기획`,
    topic,
    goal: template.description || preset.defaults.goal,
    contentDirection: form.contentDirection || '',
    cardCount: template.pages?.length || Number(template.meta?.replace(/\D/g, '')) || form.cardCount,
    tone: toneFromTemplate(template) || form.tone,
    visualDirection: productionBrief || preset.defaults.visualDirection,
    storyFlow: storyFlow || preset.defaults.storyFlow,
    promptGuide: [
      template.production?.nextStep,
      productionBrief ? `제작 설정은 다음 항목을 우선 반영한다.\n${productionBrief}` : '',
      template.canvas ? `캔버스는 ${template.canvas} 기준으로 잡는다.` : '',
      template.platforms?.length ? `채널은 ${template.platforms.join(', ')} 재사용을 고려한다.` : '',
      preset.defaults.promptGuide
    ].filter(Boolean).join('\n\n'),
    avoid: preset.defaults.avoid,
    templateId: template.id,
    templateLabel: template.label,
    templateFormatSignal: template.formatSignal || '',
    templateCanvas: template.canvas || '',
    templatePlatforms: Array.isArray(template.platforms) ? template.platforms : [],
    templatePlatformSpecs: Array.isArray(template.platformSpecs) ? template.platformSpecs : [],
    templateProduction: template.production ?? null,
    templateCardPlan: Array.isArray(template.cardPlan) ? template.cardPlan : [],
    templateEditorControls: Array.isArray(template.editorControls) ? template.editorControls : [],
    templateProductionFlow: Array.isArray(template.productionFlow) ? template.productionFlow : [],
    templateLayoutSlots: Array.isArray(template.layoutSlots) ? template.layoutSlots : [],
    templateChannelStrategy: Array.isArray(template.channelStrategy) ? template.channelStrategy : [],
    templateBlueprint: isTemplateBlueprint(template.templateBlueprint) ? template.templateBlueprint : null,
    templateSettings: defaultTemplateSettings(template.editorControls?.length ? { groups: template.editorControls } : template.production)
  };
}

function presetIdFromTemplate(template = {}) {
  const haystack = `${template.id ?? ''} ${template.category ?? ''} ${template.formatSignal ?? ''}`.toLowerCase();
  if (/instatoon|toon|컷툰|대화/.test(haystack)) return 'instatoon';
  if (/product|commerce|ranking|제품|랭킹|구매/.test(haystack)) return 'product';
  return 'information';
}

function toneFromTemplate(template = {}) {
  if (!template.tone) return '';
  return `${template.tone} 톤`;
}

function formatCardPlanFlow(cardPlan = [], pages = []) {
  if (Array.isArray(cardPlan) && cardPlan.length) return cardPlan.map(([title, note]) => `${title}: ${note}`).join('\n');
  if (Array.isArray(pages) && pages.length) return pages.join('\n');
  return '';
}

function formatCardPlanBrief(cardPlan = []) {
  return cardPlan.map(([title, note], index) => `${index + 1}. ${title}: ${note}`).join('\n');
}

function formatProductionBrief(production) {
  if (!production?.groups?.length) return '';
  return production.groups.map(([title, items]) => `- ${title}: ${items.join(', ')}`).join('\n');
}

function formatEditorControlsBrief(groups = []) {
  if (!Array.isArray(groups) || !groups.length) return '';
  return groups.map(([title, items]) => `- ${title}: ${(Array.isArray(items) ? items : []).join(', ')}`).join('\n');
}

function formatProductionFlowBrief(flow = []) {
  if (!Array.isArray(flow) || !flow.length) return '';
  return flow.map(([title, note], index) => `${index + 1}. ${title}: ${note}`).join('\n');
}

function formatChannelStrategyBrief(strategy = []) {
  if (!Array.isArray(strategy) || !strategy.length) return '';
  return strategy.map(([platform, items]) => `- ${platform}: ${(Array.isArray(items) ? items : []).join(', ')}`).join('\n');
}

function formatTemplateBlueprintBrief(blueprint) {
  if (!isTemplateBlueprint(blueprint)) return '';
  return [
    `- 형식: ${blueprint.format || '-'}`,
    `- 적정 컷: ${blueprint.idealCards || '-'}`,
    blueprint.planningRule ? `- 기획 규칙: ${blueprint.planningRule}` : '',
    blueprint.productionChecklist?.length ? `- 제작 체크: ${blueprint.productionChecklist.join(', ')}` : ''
  ].filter(Boolean).join('\n');
}

function defaultTemplateSettings(production) {
  if (!production?.groups?.length) return {};
  return production.groups.reduce((settings, [title, items]) => ({
    ...settings,
    [title]: items?.[0] ? [items[0]] : []
  }), {});
}

function normalizeTemplateSettings(settings) {
  if (!settings || typeof settings !== 'object' || Array.isArray(settings)) return {};
  return Object.entries(settings).reduce((result, [key, values]) => {
    const cleanValues = Array.isArray(values) ? values.map(cleanDraftText).filter(Boolean).slice(0, 12) : [];
    if (!cleanValues.length) return result;
    return { ...result, [cleanDraftText(key)]: cleanValues };
  }, {});
}

function formatTemplateSettingsBrief(settings) {
  const normalized = normalizeTemplateSettings(settings);
  return Object.entries(normalized).map(([title, values]) => `- ${title}: ${values.join(', ')}`).join('\n');
}

function isTemplateProduction(value) {
  return Boolean(value && typeof value === 'object' && Array.isArray(value.groups));
}

function isTemplateBlueprint(value) {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function savePlanningFormDraft(form, workId) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(planningFormDraftKey(workId), JSON.stringify({
      savedAt: new Date().toISOString(),
      ...sanitizePlanningFormDraft(form)
    }));
  } catch {
    // 임시저장 실패가 제작 흐름을 막으면 안 된다.
  }
}

function planningFormDraftKey(workId) {
  return workId ? `${PLANNING_FORM_DRAFT_KEY}.${workId}` : PLANNING_FORM_DRAFT_KEY;
}

function sanitizePlanningFormDraft(value = {}) {
  return {
    title: cleanDraftText(value.title) || DEFAULT_FORM.title,
    format: FORMAT_PRESETS.some((preset) => preset.id === value.format) ? value.format : DEFAULT_FORM.format,
    topic: cleanDraftText(value.topic),
    audience: cleanDraftText(value.audience),
    goal: cleanDraftText(value.goal) || DEFAULT_FORM.goal,
    contentDirection: cleanDraftMultilineText(value.contentDirection),
    cardCount: Math.min(12, Math.max(3, Number(value.cardCount) || DEFAULT_FORM.cardCount)),
    detailLevel: ['simple', 'balanced', 'specific'].includes(value.detailLevel) ? value.detailLevel : DEFAULT_FORM.detailLevel,
    tone: cleanDraftText(value.tone) || DEFAULT_FORM.tone,
    visualDirection: cleanDraftMultilineText(value.visualDirection) || DEFAULT_FORM.visualDirection,
    storyFlow: cleanDraftMultilineText(value.storyFlow) || DEFAULT_FORM.storyFlow,
    promptGuide: cleanDraftMultilineText(value.promptGuide) || DEFAULT_FORM.promptGuide,
    avoid: cleanDraftMultilineText(value.avoid) || DEFAULT_FORM.avoid,
    templateId: cleanDraftText(value.templateId),
    templateLabel: cleanDraftText(value.templateLabel),
    templateFormatSignal: cleanDraftText(value.templateFormatSignal),
    templateCanvas: cleanDraftText(value.templateCanvas),
    templatePlatforms: Array.isArray(value.templatePlatforms) ? value.templatePlatforms.slice(0, 8).map(cleanDraftText).filter(Boolean) : [],
    templatePlatformSpecs: Array.isArray(value.templatePlatformSpecs) ? value.templatePlatformSpecs.slice(0, 8) : [],
    templateProduction: isTemplateProduction(value.templateProduction) ? value.templateProduction : null,
    templateCardPlan: Array.isArray(value.templateCardPlan) ? value.templateCardPlan.slice(0, 12) : [],
    templateEditorControls: Array.isArray(value.templateEditorControls) ? value.templateEditorControls.slice(0, 12) : [],
    templateProductionFlow: Array.isArray(value.templateProductionFlow) ? value.templateProductionFlow.slice(0, 12) : [],
    templateLayoutSlots: Array.isArray(value.templateLayoutSlots) ? value.templateLayoutSlots.slice(0, 12) : [],
    templateChannelStrategy: Array.isArray(value.templateChannelStrategy) ? value.templateChannelStrategy.slice(0, 8) : [],
    templateBlueprint: isTemplateBlueprint(value.templateBlueprint) ? value.templateBlueprint : null,
    templateSettings: normalizeTemplateSettings(value.templateSettings),
    characterName: cleanDraftText(value.characterName) || DEFAULT_FORM.characterName,
    characterRole: cleanDraftText(value.characterRole) || DEFAULT_FORM.characterRole,
    characterTraits: cleanDraftText(value.characterTraits) || DEFAULT_FORM.characterTraits,
    characterPrompt: cleanDraftText(value.characterPrompt) || DEFAULT_FORM.characterPrompt,
    characterStyleId: cleanDraftText(value.characterStyleId) || DEFAULT_FORM.characterStyleId,
    characterDetailLevel: cleanDraftText(value.characterDetailLevel) || DEFAULT_FORM.characterDetailLevel,
    characterAssets: Array.isArray(value.characterAssets) ? value.characterAssets.slice(0, 12) : [],
    selectedCharacterId: cleanDraftText(value.selectedCharacterId)
  };
}

function cleanDraftText(value) {
  return `${value ?? ''}`.replace(/\s+/g, ' ').trim();
}

function cleanDraftMultilineText(value) {
  return `${value ?? ''}`
    .split('\n')
    .map((line) => line.replace(/[ \t]+/g, ' ').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
