'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, BookOpenText, Check, ClipboardList, FilePlus2, FolderKanban, Image as ImageIcon, Loader2, Save, Sparkles, UserRound, Wand2, X } from 'lucide-react';
import { Badge } from '@/core/TrLab/Components/Desktop/Atoms/TrLab/Common/Badge/Badge';
import { Button } from '@/core/TrLab/Components/Desktop/Atoms/TrLab/Common/Button/Button';
import { GenerationOverlay, NoticeToast } from '@/core/TrLab/Components/Desktop/Molecules/TrLab/GenerationFeedback';
import { assistPlanningStage, createContentPlan, generateContentImage } from '@/core/TrLab/modules/clients/api';
import useTrLabWorkspace from '@/core/TrLab/modules/controller/useTrLabWorkspace';
import useWorkDialogs from '@/core/TrLab/modules/controller/useWorkDialogs';
import { resolveTemplateItem } from '@/core/TrLab/modules/templates/templateCatalog';
import { mergeTemplateSetupIntoPlan } from '@/core/TrLab/modules/templates/templatePlanBridge';

const FORMAT_PRESETS = [
  {
    id: 'instatoon',
    label: '인스타툰',
    summary: '짧은 장면과 대사 중심',
    defaults: {
      title: '인스타툰 카드뉴스 기획',
      goal: '공감되는 상황을 짧은 장면으로 보여주고 저장/공유를 유도한다.',
      promptGuide: '캐릭터와 배경은 단순하게 유지한다. 장면은 1컷에 하나의 감정만 담고, 대사는 짧고 자연스럽게 쓴다.',
      visualDirection: '심플한 선화, 밝은 배경, 큰 표정, 과한 소품 금지',
      storyFlow: '상황 제시\n감정 확대\n공감 포인트\n작은 반전 또는 정리\n저장/공유 유도',
      avoid: '복잡한 세계관, 긴 대사, 작은 글씨, 과한 배경 묘사, 장면마다 다른 그림체'
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

const DEFAULT_FORM = {
  title: '인스타툰 카드뉴스 기획',
  format: 'instatoon',
  topic: '',
  audience: '',
  goal: FORMAT_PRESETS[0].defaults.goal,
  cardCount: 6,
  detailLevel: 'balanced',
  tone: '담백하고 공감되는 말투',
  characterName: '오늘이',
  characterRole: '평범한 직장인 주인공',
  characterTraits: '표정 변화가 크고, 작은 일에 속으로 많이 생각하지만 겉으로는 담담한 캐릭터',
  characterPrompt: 'simple Korean Instagram toon main character, round face, clean black line art, warm neutral outfit, expressive eyes, minimal details, consistent character sheet, front view and three quarter view, no text',
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

export default function Planning() {
  const { planningDrafts, setPlanningDrafts, setQueue, setSelectedTrend, setView, setContentPlans, currentWork, equipItem, updateCurrentWork } = useTrLabWorkspace();
  const { createWorkWithDialog } = useWorkDialogs();
  const [form, setForm] = useState(DEFAULT_FORM);
  const [selectedDraftId, setSelectedDraftId] = useState('');
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [planState, setPlanState] = useState({ loading: false, error: '' });
  const [assistState, setAssistState] = useState({ loadingStage: '', error: '' });
  const [characterState, setCharacterState] = useState({ loading: false, error: '' });
  const [imageDialog, setImageDialog] = useState(null);
  const [templateAppliedId, setTemplateAppliedId] = useState('');
  const equippedTemplate = useMemo(() => resolveEquippedTemplate(currentWork?.equippedItems?.template), [currentWork?.equippedItems?.template]);
  const selectedPreset = useMemo(() => FORMAT_PRESETS.find((preset) => preset.id === form.format) ?? FORMAT_PRESETS[0], [form.format]);
  const canSave = form.title.trim() && form.topic.trim();
  const canGenerateCharacter = form.format === 'instatoon' && form.characterPrompt.trim() && !characterState.loading;
  const characterPreview = useMemo(() => makeCharacterPreview(form), [form]);
  const flowCards = useMemo(() => parseStoryFlow(form.storyFlow, form.cardCount), [form.storyFlow, form.cardCount]);

  useEffect(() => {
    const draft = loadPlanningFormDraft();
    if (draft) setForm((current) => ({ ...current, ...draft }));
    setDraftLoaded(true);
  }, []);

  useEffect(() => {
    if (!draftLoaded) return;
    savePlanningFormDraft(form);
  }, [draftLoaded, form]);

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
      const asset = normalizeCharacterAsset({ form, image: data.image, prompt });
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
      planningDraft: draft,
      status: 'planning'
    }));
    return draft;
  };
  const startProduction = async () => {
    const draft = saveDraft();
    if (!draft) return;
    const studio = draftToStudio(draft);
    setSelectedTrend(studio);
    setQueue((items = []) => [studio, ...items.filter((item) => item.id !== studio.id)]);
    setPlanState({ loading: true, error: '' });
    try {
      const data = await createContentPlan(studio, { refresh: true });
      const mergedPlan = mergeTemplateSetupIntoPlan(data.plan, studio);
      setContentPlans((plans) => ({ ...plans, [studio.id]: mergedPlan }));
      updateCurrentWork((work) => ({
        ...work,
        contentPlan: mergedPlan,
        status: 'plan'
      }));
      setView('plan');
    } catch (error) {
      setPlanState({ loading: false, error: error instanceof Error ? error.message : 'AI 추천 생성에 실패했습니다.' });
      return;
    }
    setPlanState({ loading: false, error: '' });
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
      <GenerationOverlay
        open={planState.loading}
        title="AI 추천을 생성하고 있어요"
        description="제목 후보, 시나리오, 카드 초안을 단계별로 구성합니다."
      />
      <NoticeToast
        title="AI 추천 생성 실패"
        message={planState.error}
        onClose={() => setPlanState((current) => ({ ...current, error: '' }))}
      />
      <NoticeToast
        title="AI 도움 실패"
        message={assistState.error}
        onClose={() => setAssistState((current) => ({ ...current, error: '' }))}
      />
      {imageDialog ? <ImageDialog image={imageDialog} onClose={() => setImageDialog(null)} /> : null}

      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <div className="min-w-0">
            <h1 className="text-xl font-semibold tracking-normal text-slate-950">기획</h1>
            <p className="mt-2 text-sm font-medium leading-6 text-slate-500">템플릿 기준을 바탕으로 주제, 독자, 컷 흐름, 제작 조건을 확정합니다.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <PlanningStat label="템플릿" value={equippedTemplate?.label || '미선택'} />
              <PlanningStat label="컷 수" value={`${Number(form.cardCount) || 0}컷`} />
              <PlanningStat label="저장 초안" value={`${planningDrafts.length}개`} />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={saveDraft} disabled={!canSave}>
              <Save className="h-4 w-4" />
              초안 저장
            </Button>
            <Button className="bg-indigo-600 text-white hover:bg-indigo-700" onClick={startProduction} disabled={!canSave || planState.loading}>
              {planState.loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
              {planState.loading ? '설계 생성 중' : '기획 완료하고 설계로'}
            </Button>
          </div>
        </div>
        {planState.error ? <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">{planState.error}</div> : null}
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
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <Field label="시각 방향">
                <textarea className={textareaClass} value={form.visualDirection} onChange={update('visualDirection')} rows={6} />
              </Field>
              <Field label="피해야 할 것">
                <textarea className={textareaClass} value={form.avoid} onChange={update('avoid')} rows={6} />
              </Field>
            </div>
            <Field label="프롬프트 가이드">
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
              <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
                <div className="grid gap-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label="캐릭터 이름"><input className={inputClass} value={form.characterName} onChange={update('characterName')} /></Field>
                    <Field label="캐릭터 역할"><input className={inputClass} value={form.characterRole} onChange={update('characterRole')} /></Field>
                  </div>
                  <Field label="캐릭터 특징"><textarea className={textareaClass} value={form.characterTraits} onChange={update('characterTraits')} rows={4} /></Field>
                  <Field label="이미지 생성 프롬프트"><textarea className={textareaClass} value={form.characterPrompt} onChange={update('characterPrompt')} rows={5} /></Field>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" onClick={autoCharacterPrompt}><Sparkles className="h-4 w-4" />자동 정리</Button>
                    <Button onClick={generateCharacter} disabled={!canGenerateCharacter}>
                      {characterState.loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
                      캐릭터 생성
                    </Button>
                  </div>
                  {characterState.error ? <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">{characterState.error}</div> : null}
                </div>
                <CharacterPreview form={form} preview={characterPreview} onOpenImage={setImageDialog} onSelectCharacter={selectCharacter} onRemoveCharacter={removeCharacter} />
              </div>
            </StepSection>
          ) : null}

          <StepSection
            step={form.format === 'instatoon' ? '5' : '4'}
            icon={Sparkles}
            title="템플릿 설정"
            description="선택한 템플릿의 제작 기준을 마지막으로 확인합니다."
            action={<AssistButton stage="template" loadingStage={assistState.loadingStage} disabled={!form.topic.trim() || !equippedTemplate} onClick={requestPlanningAssist} />}
          >
            <TemplatePlanningPanel template={equippedTemplate} form={form} onApply={applyEquippedTemplateToForm} onToggleSetting={toggleTemplateSetting} embedded />
          </StepSection>

          <StepSection step={form.format === 'instatoon' ? '6' : '5'} icon={Save} title="완료" description="초안을 저장하거나 바로 설계 단계로 넘어갑니다.">
            <DraftList drafts={planningDrafts} selectedId={selectedDraftId} onLoad={loadDraft} />
            <div className="mt-4 flex flex-col gap-3 rounded-lg border border-indigo-100 bg-indigo-50 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-sm font-semibold text-slate-950">기획이 끝났다면 설계를 생성하세요</div>
                <p className="mt-1 text-xs font-medium leading-5 text-slate-600">현재 입력값을 저장한 뒤 다음 설계 페이지로 이동합니다.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={saveDraft} disabled={!canSave}>
                  <Save className="h-4 w-4" />
                  초안 저장
                </Button>
                <Button className="bg-indigo-600 text-white hover:bg-indigo-700" onClick={startProduction} disabled={!canSave || planState.loading}>
                  {planState.loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                  {planState.loading ? '설계 생성 중' : '기획 완료하고 설계로'}
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

function PlanningStat({ label, value }) {
  return (
    <div className="rounded-lg bg-slate-50 px-3 py-2 text-xs font-medium text-slate-500 ring-1 ring-slate-200">
      <span className="block text-[11px] font-semibold text-slate-500">{label}</span>
      <strong className="mt-0.5 block max-w-[180px] truncate text-sm font-semibold text-slate-950">{value}</strong>
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
        <p className="mt-1 text-sm font-medium leading-6 text-slate-500">템플릿을 먼저 선택하면 배경, 캐릭터, 폰트, 글자 배치 같은 제작 설정이 이 단계에 연결됩니다.</p>
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

function CharacterPreview({ form, preview, onOpenImage, onSelectCharacter, onRemoveCharacter }) {
  const assets = form.characterAssets ?? [];
  const selectedAssetId = form.selectedCharacterId || assets[0]?.id || '';
  const selectedAsset = assets.find((asset) => asset.id === selectedAssetId);
  const roughPreview = {
    title: `${form.characterName || '캐릭터'} 러프 미리보기`,
    description: form.characterRole,
    kind: 'svg',
    preview,
    name: form.characterName
  };
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-slate-900">캐릭터 미리보기</div>
          <div className="mt-1 text-xs font-medium text-slate-500">프롬프트를 기반으로 한 기획용 러프입니다.</div>
        </div>
        <Badge variant="outline">{form.characterName || '캐릭터'}</Badge>
      </div>
      <div className="grid gap-3 md:grid-cols-[180px_minmax(0,1fr)] lg:grid-cols-1 2xl:grid-cols-[180px_minmax(0,1fr)]">
        <button type="button" className="aspect-[4/5] overflow-hidden rounded-lg border bg-white text-left transition hover:border-indigo-300 hover:ring-2 hover:ring-slate-100" onClick={() => onOpenImage?.(selectedAsset?.url ? { ...selectedAsset, url: assetUrl(selectedAsset.url), title: selectedAsset.name } : roughPreview)}>
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
        <div className="grid content-start gap-2 text-xs font-medium leading-5 text-slate-600">
          <PreviewRow label="역할" value={form.characterRole} />
          <PreviewRow label="성격" value={form.characterTraits} />
          <PreviewRow label="핵심" value={preview.note} />
        </div>
      </div>
      <div className="mt-4">
        <div className="mb-2 text-xs font-semibold text-slate-500">저장된 캐릭터</div>
        <div className="grid gap-2">
          {assets.length ? assets.map((asset, index) => (
            <div key={asset.id} className={asset.id === selectedAssetId ? 'rounded-lg border border-slate-200 bg-white p-2 ring-2 ring-slate-100' : 'rounded-lg border border-slate-200 bg-white p-2'}>
              <div className="flex gap-2">
                <button type="button" className="h-16 w-12 overflow-hidden rounded-md border bg-slate-50 transition hover:border-indigo-300 hover:ring-2 hover:ring-slate-100" onClick={() => onOpenImage?.({ ...asset, url: assetUrl(asset.url), title: asset.name })}>
                  <img src={assetUrl(asset.url)} alt={asset.name} className="h-full w-full object-cover" />
                </button>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <Badge variant={asset.id === selectedAssetId ? 'default' : 'outline'}>{index + 1}번</Badge>
                    <strong className="truncate text-xs font-semibold text-slate-900">{asset.name}</strong>
                  </div>
                  <div className="mt-1 truncate text-[11px] font-medium text-slate-500">{asset.model || asset.provider || 'OpenAI image'}</div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <Button size="sm" variant="outline" onClick={() => onSelectCharacter?.(asset.id)}>대표 선택</Button>
                    <Button size="sm" variant="outline" onClick={() => navigator.clipboard?.writeText(asset.prompt)}>프롬프트</Button>
                    <Button size="sm" variant="outline" onClick={() => onRemoveCharacter?.(asset.id)}>삭제</Button>
                  </div>
                </div>
              </div>
            </div>
          )) : <div className="rounded-lg border border-dashed bg-white p-3 text-xs font-medium leading-5 text-slate-500">생성된 캐릭터가 없습니다. 캐릭터 생성 버튼으로 OpenAI 이미지를 만든 뒤 저장하세요.</div>}
        </div>
      </div>
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

function PreviewRow({ label, value }) {
  return <div className="rounded-md bg-white p-3"><div className="mb-1 text-[11px] font-semibold text-slate-400">{label}</div><div>{value || '-'}</div></div>;
}

function formFromDraft(draft = {}) {
  return {
    title: draft.title || DEFAULT_FORM.title,
    format: FORMAT_PRESETS.some((preset) => preset.id === draft.format) ? draft.format : DEFAULT_FORM.format,
    topic: draft.topic ?? '',
    audience: draft.audience ?? '',
    goal: draft.goal ?? DEFAULT_FORM.goal,
    cardCount: draft.cardCount ?? DEFAULT_FORM.cardCount,
    detailLevel: draft.detailLevel ?? DEFAULT_FORM.detailLevel,
    tone: draft.tone ?? DEFAULT_FORM.tone,
    characterName: draft.characterName ?? DEFAULT_FORM.characterName,
    characterRole: draft.characterRole ?? DEFAULT_FORM.characterRole,
    characterTraits: draft.characterTraits ?? DEFAULT_FORM.characterTraits,
    characterPrompt: draft.characterPrompt ?? DEFAULT_FORM.characterPrompt,
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
  if (draft.format === 'instatoon') return [`${topic}, 나만 그런 줄 알았는데`, `${topic} 겪어본 사람만 아는 순간`, `${topic} 때문에 멈칫한 날`];
  if (draft.format === 'product') return [`${topic} 사기 전 보는 기준`, `${topic} 필요한 사람과 아닌 사람`, `${topic} 고를 때 놓치는 것`];
  return [`${topic} 한 번에 정리`, `${topic} 기준부터 볼게요`, `${topic} 저장용 체크리스트`];
}

function makePlanningAssistPayload(stage, form, preset, template) {
  return {
    stage,
    topic: form.topic,
    audience: form.audience,
    goal: form.goal,
    format: preset?.label || form.format,
    tone: form.tone,
    cardCount: form.cardCount,
    storyFlow: form.storyFlow,
    visualDirection: form.visualDirection,
    promptGuide: form.promptGuide,
    avoid: form.avoid,
    template: template ? {
      id: template.id,
      label: template.label,
      formatSignal: template.formatSignal,
      cardPlan: template.cardPlan,
      editorControls: template.editorControls
    } : null
  };
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
  const isWork = /직장|출근|회사|퇴근|월요|업무|상사|동료/.test(`${topic} ${audience}`);
  const isParent = /육아|부모|엄마|아빠|아이|아기|어린이/.test(`${topic} ${audience}`);
  const role = isParent ? '현실적인 초보 부모 주인공' : isWork ? '평범한 직장인 주인공' : `${audience}가 쉽게 이입하는 일상 주인공`;
  const name = isParent ? '하루맘' : isWork ? '오늘이' : '모아';
  const traits = isParent
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
      `clean black line art, round friendly face, expressive eyes, minimal outfit, warm neutral color palette`,
      `consistent character sheet, front view, side view, three quarter view, 3 facial expressions`,
      `not too detailed, no text, no logo, no complex background`,
      `style goal: ${preset.label}`
    ].join(', ')
  };
}

function normalizeCharacterAsset({ form, image, prompt }) {
  const createdAt = new Date().toISOString();
  const id = `character-${Date.now()}`;
  return {
    id,
    name: form.characterName || `캐릭터 ${createdAt.slice(11, 16)}`,
    role: form.characterRole,
    traits: form.characterTraits,
    prompt,
    url: image?.url,
    provider: image?.provider || 'openai',
    model: image?.model || '',
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
  return [
    'Create a reusable character reference image for a Korean Instagram toon carousel.',
    'Use OpenAI image generation. Output should be a clean character sheet, not a finished card.',
    `Character name: ${form.characterName || 'main character'}.`,
    `Role: ${form.characterRole || 'relatable everyday protagonist'}.`,
    `Traits: ${form.characterTraits || 'simple expressive character'}.`,
    `Topic context: ${form.topic || form.title}.`,
    `Audience: ${form.audience || 'Instagram readers'}.`,
    `Style prompt: ${form.characterPrompt}.`,
    'Include one main full-body pose and two small expression variations if possible.',
    'Keep the design simple and reusable across many panels.',
    'No readable text, no logo, no watermark, no speech bubbles, no complex background.',
    'Use a plain light background so the character can later be placed on card layouts.'
  ].join('\n');
}

function makeCharacterPreview(form) {
  const text = `${form.characterPrompt} ${form.characterTraits} ${form.characterRole}`;
  const hue = hashText(text) % 360;
  const worried = /피곤|지친|당황|월요|출근|현실|초보/.test(text);
  return {
    background: `hsl(${hue} 52% 94%)`,
    outfit: `hsl(${(hue + 34) % 360} 48% 58%)`,
    hair: /밝|갈색|brown/i.test(text) ? '#7c4a2d' : '#263238',
    skin: '#f6d7bd',
    mouth: worried ? 'M138 145c15-10 30-10 45 0' : 'M138 142c13 15 32 15 45 0',
    label: (form.characterName || '캐릭터').slice(0, 8),
    note: /consistent|시트|sheet/i.test(text) ? '여러 컷에서 같은 인물로 반복 사용' : '기획 단계 러프 미리보기'
  };
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

function loadPlanningFormDraft() {
  if (typeof window === 'undefined') return null;
  try {
    const parsed = JSON.parse(window.localStorage.getItem(PLANNING_FORM_DRAFT_KEY) || 'null');
    if (!parsed || typeof parsed !== 'object') return null;
    return sanitizePlanningFormDraft(parsed);
  } catch {
    return null;
  }
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

function savePlanningFormDraft(form) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(PLANNING_FORM_DRAFT_KEY, JSON.stringify({
      savedAt: new Date().toISOString(),
      ...sanitizePlanningFormDraft(form)
    }));
  } catch {
    // 임시저장 실패가 제작 흐름을 막으면 안 된다.
  }
}

function sanitizePlanningFormDraft(value = {}) {
  return {
    title: cleanDraftText(value.title) || DEFAULT_FORM.title,
    format: FORMAT_PRESETS.some((preset) => preset.id === value.format) ? value.format : DEFAULT_FORM.format,
    topic: cleanDraftText(value.topic),
    audience: cleanDraftText(value.audience),
    goal: cleanDraftText(value.goal) || DEFAULT_FORM.goal,
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
