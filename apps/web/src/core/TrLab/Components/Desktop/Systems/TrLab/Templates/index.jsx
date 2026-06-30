'use client';

import { Check, Loader2, Save, Search, Sparkles, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/core/TrLab/Components/Desktop/Atoms/TrLab/Common/Button/Button';
import { recommendContentTemplate } from '@/core/TrLab/modules/clients/api';
import { buildContentBrief, contentBriefToTemplateRecommendationPayload } from '@/core/TrLab/modules/content/contentBrief';
import useTrLabWorkspace from '@/core/TrLab/modules/controller/useTrLabWorkspace';
import useWorkDialogs from '@/core/TrLab/modules/controller/useWorkDialogs';
import { templateCategories as categories, templateItems } from '@/core/TrLab/modules/templates/templateCatalog';

const CANVAS_PRESETS = [
  { id: 'instagram-portrait', label: 'Instagram 4:5', ratio: '4:5', width: 1080, height: 1350 },
  { id: 'square', label: 'Square 1:1', ratio: '1:1', width: 1080, height: 1080 },
  { id: 'story', label: 'Story/Reels 9:16', ratio: '9:16', width: 1080, height: 1920 },
  { id: 'custom', label: '직접 입력', ratio: 'custom', width: 1080, height: 1350 }
];

const DEFAULT_TEMPLATE_SETUP = {
  pageCount: 0,
  canvasPreset: 'instagram-portrait',
  canvasWidth: 1080,
  canvasHeight: 1350
};
const stepButtonClass = 'grid h-9 w-9 place-items-center rounded-md border border-slate-200 bg-white text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-100';
const canvasInputClass = 'h-9 w-full rounded-md border border-slate-200 bg-white px-2 text-sm font-semibold text-slate-700 outline-none focus:border-slate-400';
const recommendInputClass = 'h-10 rounded-md border border-slate-200 bg-slate-50 px-3 text-sm font-medium outline-none transition focus:border-slate-400 focus:bg-white';

export default function Templates() {
  const { currentWork, equippedItems, equipItem, setView, createWork, updateCurrentWork, setPlanningDrafts, setContentPlans, setQueue, setSelectedTrend, savedTemplates, saveTemplate, deleteSavedTemplate } = useTrLabWorkspace();
  const { createWorkWithDialog } = useWorkDialogs();
  const workEquippedItems = currentWork?.equippedItems ?? equippedItems;
  const planningDraft = currentWork?.planningDraft ?? null;
  const [localPlanningDraft, setLocalPlanningDraft] = useState(null);
  const effectivePlanningDraft = useMemo(() => mergePlanningDraftSources(planningDraft, localPlanningDraft), [planningDraft, localPlanningDraft]);
  const contentBrief = useMemo(() => buildContentBrief(currentWork, { planningDraft: effectivePlanningDraft }), [currentWork, effectivePlanningDraft]);
  const equippedId = workEquippedItems?.template?.id;
  const allTemplates = useMemo(() => [...(savedTemplates ?? []), ...templateItems], [savedTemplates]);
  const equippedTemplate = allTemplates.find((item) => item.id === equippedId);
  const [category, setCategory] = useState('all');
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState(equippedId || templateItems[0].id);
  const [activeLibrary, setActiveLibrary] = useState('all');
  const planningRecommendationInput = useMemo(() => makeRecommendationInputFromPlanning(effectivePlanningDraft, currentWork), [currentWork, effectivePlanningDraft]);
  const planningInputKey = useMemo(() => [
    effectivePlanningDraft?.id,
    effectivePlanningDraft?.updatedAt,
    effectivePlanningDraft?.savedAt,
    effectivePlanningDraft?.topic,
    effectivePlanningDraft?.audience,
    effectivePlanningDraft?.goal,
    effectivePlanningDraft?.contentDirection
  ].filter(Boolean).join('|'), [effectivePlanningDraft]);
  const [recommendInput, setRecommendInput] = useState(planningRecommendationInput);
  const [recommendInputEdited, setRecommendInputEdited] = useState(false);
  const [recommendState, setRecommendState] = useState({ loading: false, error: '', result: null });
  const [templateSetups, setTemplateSetups] = useState(() => {
    const template = workEquippedItems?.template;
    return template?.id ? { [template.id]: setupFromTemplate(template) } : {};
  });

  const recommendations = recommendState.result?.recommendations ?? [];
  const recommendedOrder = useMemo(() => new Map(recommendations.map((item, index) => [item.templateId, index])), [recommendations]);
  const selectedRecommendation = recommendations.find((item) => item.templateId === selectedId) ?? null;

  const filteredTemplates = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return templateItems.filter((item) => {
      const matchesCategory = category === 'all' || item.category === category;
      const searchable = [
        item.label,
        item.description,
        item.tone,
        item.formatSignal,
        item.canvas,
        ...(item.platforms ?? []),
        ...(item.pages ?? []),
        ...(item.production?.groups ?? []).flatMap(([title, values]) => [title, ...values])
      ].join(' ');
      const matchesKeyword = !keyword || searchable.toLowerCase().includes(keyword);
      return matchesCategory && matchesKeyword;
    });
  }, [category, query]);

  const displayedTemplates = useMemo(() => {
    return [...filteredTemplates].sort((a, b) => {
      const rankA = recommendedOrder.has(a.id) ? recommendedOrder.get(a.id) : Number.MAX_SAFE_INTEGER;
      const rankB = recommendedOrder.has(b.id) ? recommendedOrder.get(b.id) : Number.MAX_SAFE_INTEGER;
      if (rankA !== rankB) return rankA - rankB;
      return 0;
    });
  }, [filteredTemplates, recommendedOrder]);
  const recommendedTemplates = useMemo(() => {
    return recommendations
      .map((item) => templateItems.find((template) => template.id === item.templateId))
      .filter(Boolean);
  }, [recommendations]);
  const visibleLibraryTemplates = activeLibrary === 'saved'
    ? (savedTemplates ?? [])
    : activeLibrary === 'recommend'
      ? recommendedTemplates
      : displayedTemplates;

  const selectedTemplate = allTemplates.find((item) => item.id === selectedId) ?? displayedTemplates[0] ?? templateItems[0];
  const lockedPageCount = contentBrief?.generation?.cardCount || effectivePlanningDraft?.cardCount || 0;
  const selectedSetup = {
    ...(templateSetups[selectedTemplate.id] ?? setupFromTemplate(selectedTemplate)),
    ...(lockedPageCount ? { pageCount: lockedPageCount } : {})
  };
  const configuredTemplate = useMemo(() => configureTemplate(selectedTemplate, selectedSetup), [selectedTemplate, selectedSetup]);

  useEffect(() => {
    setLocalPlanningDraft(loadPlanningFormDraft(currentWork?.id));
  }, [currentWork?.id]);

  useEffect(() => {
    if (!effectivePlanningDraft || recommendInputEdited) return;
    setRecommendInput(planningRecommendationInput);
  }, [effectivePlanningDraft, planningInputKey, planningRecommendationInput, recommendInputEdited]);

  const updateTemplateSetup = (patch) => {
    setTemplateSetups((current) => ({
      ...current,
      [selectedTemplate.id]: normalizeTemplateSetup({
        ...setupFromTemplate(selectedTemplate),
        ...(current[selectedTemplate.id] ?? {}),
        ...patch
      }, selectedTemplate)
    }));
  };

  const applyTemplate = (item) => {
    const configuredItem = configureTemplate(item, {
      ...(templateSetups[item.id] ?? setupFromTemplate(item)),
      ...(lockedPageCount ? { pageCount: lockedPageCount } : {})
    });
    if (!currentWork) {
      createWorkWithDialog({
        initialTitle: `${configuredItem.label} 작업물`,
        stage: 'metadata',
        workInput: {
          equippedItems: { template: configuredItem },
          status: 'template'
        }
      });
      return;
    }
    persistEffectivePlanningDraft(effectivePlanningDraft, { template: configuredItem, setPlanningDrafts, updateCurrentWork });
    equipItem('template', configuredItem);
    setView('overview');
  };
  const requestRecommendation = async () => {
    const topic = (contentBrief?.generation?.topic || recommendInput.topic).trim();
    if (!topic || recommendState.loading) return;
    setRecommendState({ loading: true, error: '', result: null });
    try {
      const result = await recommendContentTemplate(contentBriefToTemplateRecommendationPayload(contentBrief, recommendInput));
      const firstTemplateId = result?.recommendations?.[0]?.templateId;
      if (firstTemplateId && templateItems.some((item) => item.id === firstTemplateId)) setSelectedId(firstTemplateId);
      setActiveLibrary('recommend');
      setRecommendState({ loading: false, error: '', result });
    } catch (error) {
      setRecommendState({ loading: false, error: error instanceof Error ? error.message : '템플릿 추천에 실패했습니다.', result: null });
    }
  };
  const saveConfiguredTemplate = () => {
    const saved = saveTemplate({
      ...configuredTemplate,
      id: `saved-${configuredTemplate.id}-${Date.now()}`,
      label: `${configuredTemplate.label} 저장본`,
      category: 'custom',
      savedFrom: 'user'
    });
    if (saved?.id) setSelectedId(saved.id);
    setActiveLibrary('saved');
  };
  const createHomeTrainingExample = () => {
    const template = savedTemplates?.find((item) => item.id === 'saved-home-training-routine');
    const example = makeHomeTrainingExample(template);
    setSelectedTrend(example.studio);
    setQueue((items = []) => [example.studio, ...items.filter((item) => item?.id !== example.studio.id)]);
    setContentPlans((plans = {}) => ({ ...plans, [example.studio.id]: example.contentPlan }));
    createWork({
      title: example.title,
      status: 'plan',
      stage: 'plan',
      equippedItems: { template: example.template, planning: { id: example.planningDraft.id, label: example.planningDraft.title, description: example.planningDraft.topic, meta: `${example.planningDraft.cardCount}컷` } },
      planningDraft: example.planningDraft,
      contentPlan: example.contentPlan,
      metadata: {
        objective: 'save',
        tone: 'helpful',
        channel: 'instagram',
        audienceNote: example.planningDraft.audience,
        goal: example.planningDraft.goal,
        notes: 'Pexels 또는 AI 이미지로 배경을 만들고, 문구는 카드 편집기에서 SVG 텍스트로 얹는 제작 전 설계 예시'
      }
    });
  };

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <div className="flex min-h-10 flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
        <h1 className="text-xl font-semibold tracking-normal text-slate-950">템플릿 추천</h1>
        <p className="mt-1 text-sm font-medium text-slate-500">상세 기획서를 기준으로 추천을 받은 뒤, 필요하면 직접 비교해서 고릅니다.</p>
        </div>
        <div className="grid grid-cols-3 gap-2 rounded-lg border border-slate-200 bg-white p-1 text-xs font-semibold text-slate-500">
          <TemplateStat label="추천" value={recommendations.length} />
          <TemplateStat label="저장" value={savedTemplates?.length ?? 0} />
          <TemplateStat label="전체" value={templateItems.length} />
        </div>
      </div>

      {currentWork && !effectivePlanningDraft ? <PlanningRequiredPanel onGoPlanning={() => setView('planning')} /> : null}

      <section className="grid min-h-[720px] gap-5 lg:grid-cols-[minmax(0,1fr)_400px]">
        <div className="space-y-4">
          {currentWork && !effectivePlanningDraft ? null : (
            <TemplateRecommendationPanel
              value={recommendInput}
              state={recommendState}
              planningDraft={effectivePlanningDraft}
              contentBrief={contentBrief}
              onGoPlanning={() => setView('planning')}
              onSubmit={requestRecommendation}
              onSelect={(id) => {
                setSelectedId(id);
                setActiveLibrary('recommend');
              }}
            />
          )}

          <TemplateLibraryPanel
            activeLibrary={activeLibrary}
            onLibraryChange={setActiveLibrary}
            templates={visibleLibraryTemplates}
            savedTemplates={savedTemplates}
            recommendations={recommendations}
            selectedId={selectedId}
            equippedId={equippedId}
            category={category}
            query={query}
            recommendedOrder={recommendedOrder}
            onCategoryChange={setCategory}
            onQueryChange={setQuery}
            onSelect={setSelectedId}
            onApply={applyTemplate}
            onDeleteSavedTemplate={deleteSavedTemplate}
            onCreateHomeTrainingExample={createHomeTrainingExample}
          />
        </div>

        <aside className="sticky top-4 max-h-[calc(100vh-96px)] overflow-y-auto rounded-lg border border-slate-200 bg-white p-4 shadow-[0_16px_40px_rgba(15,23,42,0.08)]">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-xs font-medium text-slate-600">{categoryLabel(configuredTemplate.category)} · {configuredTemplate.formatSignal}</div>
              <h2 className="mt-1 truncate text-lg font-semibold text-slate-950">{configuredTemplate.label}</h2>
              <p className="mt-2 text-sm font-medium leading-6 text-slate-500">{configuredTemplate.description}</p>
            </div>
            {equippedTemplate?.id === configuredTemplate.id ? <Check className="mt-1 h-4 w-4 shrink-0 text-slate-600" /> : null}
          </div>

          <CoreTemplateSummary template={configuredTemplate} recommendation={selectedRecommendation} />

          <div className="mt-3 grid grid-cols-2 gap-2 text-xs font-medium text-slate-500">
            <MetaBox label="페이지" value={configuredTemplate.meta} />
            <MetaBox label="톤" value={configuredTemplate.tone} />
            <MetaBox label="캔버스" value={configuredTemplate.canvas} />
            <MetaBox label="유형" value={configuredTemplate.formatSignal} />
          </div>

          <TemplateSetupControls setup={selectedSetup} template={selectedTemplate} contentBrief={contentBrief} onChange={updateTemplateSetup} />

          <Button className="mt-3 w-full justify-center" variant="outline" onClick={saveConfiguredTemplate}>
            <Save className="h-4 w-4" />
            현재 설정 저장
          </Button>

          <Button
            className={equippedId === configuredTemplate.id ? 'sticky bottom-0 mt-5 w-full bg-slate-100 text-slate-700 hover:bg-slate-200' : 'sticky bottom-0 mt-5 w-full bg-slate-900 text-white shadow-sm hover:bg-slate-800'}
            variant={equippedId === configuredTemplate.id ? 'secondary' : 'default'}
            onClick={() => applyTemplate(configuredTemplate)}
          >
            {equippedId === configuredTemplate.id ? '설정 다시 적용' : '이 템플릿 적용'}
          </Button>
        </aside>
      </section>
    </div>
  );
}

function TemplateCard({ item, selected, equipped, recommended, recommendationRank, onSelect, onApply }) {
  return (
    <article className={templateCardClass(selected)}>
      <button type="button" className="block w-full text-left outline-none" onClick={onSelect}>
        <TemplatePreview item={item} />
        <div className="mt-3 flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-1.5">
              <h2 className="truncate text-sm font-semibold text-slate-950">{item.label}</h2>
              {recommended ? <span className="shrink-0 rounded-full bg-slate-900 px-1.5 py-0.5 text-[10px] font-semibold text-white">추천 {recommendationRank}</span> : null}
            </div>
            <p className="mt-1 line-clamp-2 min-h-10 text-xs font-medium leading-5 text-slate-500">{item.description}</p>
          </div>
          <span className="shrink-0 rounded-full bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-600">{item.meta}</span>
        </div>
      </button>
      <div className="mt-3 flex items-center justify-between gap-2">
        <span className="truncate text-[11px] font-medium text-slate-500">{item.formatSignal}</span>
        <Button size="sm" variant={equipped ? 'secondary' : 'ghost'} className={equipped ? '' : 'text-slate-600 hover:bg-slate-100'} onClick={onApply}>
          {equipped ? '적용됨' : '적용'}
        </Button>
      </div>
    </article>
  );
}

function TemplateStat({ label, value }) {
  return (
    <div className="min-w-16 rounded-md px-3 py-2 text-center">
      <div className="text-[11px] text-slate-400">{label}</div>
      <div className="mt-0.5 text-sm font-semibold text-slate-800">{value}</div>
    </div>
  );
}

function TemplateLibraryPanel({
  activeLibrary,
  onLibraryChange,
  templates,
  savedTemplates = [],
  recommendations = [],
  selectedId,
  equippedId,
  category,
  query,
  recommendedOrder,
  onCategoryChange,
  onQueryChange,
  onSelect,
  onApply,
  onDeleteSavedTemplate,
  onCreateHomeTrainingExample
}) {
  const showFilters = activeLibrary === 'all';
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-wrap gap-1 rounded-lg bg-slate-100 p-1">
          {[
            ['recommend', '추천', recommendations.length],
            ['saved', '내 템플릿', savedTemplates.length],
            ['all', '전체', templateItems.length]
          ].map(([id, label, count]) => (
            <button key={id} type="button" className={libraryTabClass(activeLibrary === id)} onClick={() => onLibraryChange(id)}>
              {label}
              <span className="ml-1 text-[10px] opacity-70">{count}</span>
            </button>
          ))}
        </div>

        {showFilters ? (
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <div className="relative min-w-52 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                id="template-search"
                name="templateSearch"
                className="h-9 w-full rounded-md border border-slate-200 bg-white pl-9 pr-3 text-sm font-medium outline-none transition focus:border-slate-300 focus:ring-2 focus:ring-slate-100"
                value={query}
                onChange={(event) => onQueryChange(event.target.value)}
                placeholder="검색"
              />
            </div>
            <div className="flex flex-wrap gap-1">
              {categories.map(([id, label]) => (
                <button key={id} type="button" className={filterClass(category === id)} onClick={() => onCategoryChange(id)}>
                  {label}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      <div className="mt-4">
        {templates.length ? (
          activeLibrary === 'saved' ? (
            <div className="grid gap-2">
              {templates.map((template) => (
                <SavedTemplateRow
                  key={template.id}
                  template={template}
                  selected={selectedId === template.id}
                  onSelect={() => onSelect(template.id)}
                  onDelete={() => onDeleteSavedTemplate(template.id)}
                  onCreateHomeTrainingExample={onCreateHomeTrainingExample}
                />
              ))}
            </div>
          ) : activeLibrary === 'recommend' ? (
            <div className="grid gap-2">
              {recommendations.map((recommendation, index) => {
                const template = templateItems.find((item) => item.id === recommendation.templateId);
                if (!template) return null;
                return (
                  <RecommendationTemplateRow
                    key={recommendation.templateId}
                    template={template}
                    recommendation={recommendation}
                    rank={index + 1}
                    selected={selectedId === template.id}
                    equipped={equippedId === template.id}
                    onSelect={() => onSelect(template.id)}
                    onApply={() => onApply(template)}
                  />
                );
              })}
            </div>
          ) : (
            <div className="grid content-start gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {templates.map((item) => (
                <TemplateCard
                  key={item.id}
                  item={item}
                  selected={selectedId === item.id}
                  equipped={equippedId === item.id}
                  recommended={recommendedOrder.has(item.id)}
                  recommendationRank={recommendedOrder.has(item.id) ? recommendedOrder.get(item.id) + 1 : null}
                  onSelect={() => onSelect(item.id)}
                  onApply={() => onApply(item)}
                />
              ))}
            </div>
          )
        ) : (
          <TemplateLibraryEmpty activeLibrary={activeLibrary} />
        )}
      </div>
    </section>
  );
}

function RecommendationTemplateRow({ template, recommendation, rank, selected, equipped, onSelect, onApply }) {
  return (
    <div className={recommendationRowClass(selected)}>
      <button type="button" className="min-w-0 flex-1 text-left" onClick={onSelect}>
        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
          <span className="rounded-full bg-slate-900 px-2 py-1 text-[11px] font-semibold text-white">추천 {rank}</span>
          <div className="truncate text-sm font-semibold text-slate-950">{template.label}</div>
          <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600">{Math.round((recommendation.confidence ?? 0.7) * 100)}%</span>
        </div>
        <div className="mt-1 text-xs font-medium text-slate-500">{template.formatSignal}</div>
        <p className="mt-2 line-clamp-2 text-xs font-medium leading-5 text-slate-600">{recommendation.reason}</p>
      </button>
      <Button size="sm" variant={equipped ? 'secondary' : 'outline'} className="shrink-0" onClick={onApply}>
        {equipped ? '적용됨' : '적용'}
      </Button>
    </div>
  );
}

function SavedTemplateRow({ template, selected, onSelect, onDelete, onCreateHomeTrainingExample }) {
  return (
    <div className={savedTemplateRowClass(selected)}>
      <button type="button" className="min-w-0 flex-1 text-left" onClick={onSelect}>
        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
          <div className="truncate text-sm font-semibold text-slate-950">{template.label}</div>
          {template.savedFrom === 'example' ? <span className="shrink-0 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">예시</span> : null}
          <span className="shrink-0 rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">{template.meta}</span>
        </div>
        <div className="mt-1 line-clamp-1 text-xs font-medium text-slate-500">{template.description}</div>
      </button>
      <div className="flex shrink-0 items-center gap-1">
        {template.savedFrom === 'example' && template.id === 'saved-home-training-routine' ? (
          <Button size="sm" onClick={onCreateHomeTrainingExample}>예시 만들기</Button>
        ) : null}
        {template.savedFrom !== 'example' ? (
          <button type="button" className="grid h-8 w-8 place-items-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-slate-700" onClick={onDelete} aria-label={`${template.label} 삭제`}>
            <Trash2 className="h-4 w-4" />
          </button>
        ) : null}
      </div>
    </div>
  );
}

function TemplateLibraryEmpty({ activeLibrary }) {
  const messages = {
    recommend: '주제를 입력하고 추천을 받으면 템플릿 후보가 표시됩니다.',
    saved: '저장한 템플릿이 여기에 표시됩니다.',
    all: '검색 조건에 맞는 템플릿이 없습니다.'
  };
  return (
    <div className="grid min-h-48 place-items-center rounded-lg border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm font-medium text-slate-500">
      {messages[activeLibrary] ?? messages.all}
    </div>
  );
}

function PlanningRequiredPanel({ onGoPlanning }) {
  return (
    <section className="rounded-lg border border-amber-200 bg-amber-50 p-4 shadow-sm">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="text-sm font-semibold text-amber-950">상세 기획서가 먼저 필요합니다</div>
          <p className="mt-1 text-sm font-medium leading-6 text-amber-800">템플릿은 주제만으로 고르지 않고, 독자와 컷 흐름, 제작 지시가 정리된 뒤 추천합니다.</p>
        </div>
        <Button className="shrink-0 bg-amber-950 text-white hover:bg-amber-900" onClick={onGoPlanning}>
          기획하러 가기
        </Button>
      </div>
    </section>
  );
}

function TemplateRecommendationPanel({ value, state, planningDraft, contentBrief, onGoPlanning, onSubmit }) {
  const recommendations = state.result?.recommendations ?? [];
  const generation = contentBrief?.generation ?? {};
  const format = contentBrief?.format ?? {};
  const flowLimit = Math.min(12, Math.max(3, Number(generation.cardCount || planningDraft?.cardCount) || 12));
  const flowItems = `${planningDraft?.storyFlow ?? ''}`.split('\n').map((item) => item.trim()).filter(Boolean).slice(0, flowLimit);
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-950">
              <Sparkles className="h-4 w-4 text-slate-500" />
              기획 기준 템플릿 추천
            </div>
            {recommendations.length ? <span className="rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700">추천 {recommendations.length}개</span> : null}
          </div>
          {planningDraft ? (
            <div className="mt-3 rounded-md bg-slate-50 p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-white px-2 py-1 text-[11px] font-semibold text-slate-500 ring-1 ring-slate-200">{format.label || planningDraft.formatLabel || planningDraft.format || '형식 미정'}</span>
                <span className="rounded-full bg-white px-2 py-1 text-[11px] font-semibold text-slate-500 ring-1 ring-slate-200">{generation.cardCount || planningDraft.cardCount || 0}장</span>
                {generation.tone || planningDraft.tone ? <span className="rounded-full bg-white px-2 py-1 text-[11px] font-semibold text-slate-500 ring-1 ring-slate-200">{generation.tone || planningDraft.tone}</span> : null}
              </div>
              <div className="mt-3 text-sm font-semibold leading-5 text-slate-950">{planningDraft.title || generation.topic}</div>
              <div className="mt-1 text-xs font-medium leading-5 text-slate-600">{generation.audience || planningDraft.audience || '대상 독자 미입력'}</div>
              {generation.contentDirection || planningDraft.contentDirection ? (
                <div className="mt-2 line-clamp-2 rounded bg-white px-2.5 py-2 text-xs font-medium leading-5 text-slate-600">
                  {generation.contentDirection || planningDraft.contentDirection}
                </div>
              ) : null}
              {flowItems.length ? (
                <div className="mt-3 grid max-h-56 gap-1.5 overflow-y-auto pr-1 sm:grid-cols-2">
                  {flowItems.map((item, index) => (
                    <span key={`${item}-${index}`} className="rounded bg-white px-2 py-1 text-[11px] font-semibold text-slate-500 ring-1 ring-slate-100">
                      {index + 1}. {item}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Button variant="outline" onClick={onGoPlanning}>기획 수정</Button>
          <Button className="justify-center" onClick={onSubmit} disabled={state.loading || !(generation.topic || value.topic)?.trim()}>
            {state.loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {state.loading ? '추천 중' : '기획 기준 추천'}
          </Button>
        </div>
      </div>

      {state.error ? <div className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">{state.error}</div> : null}
    </section>
  );
}

function makeRecommendationInputFromPlanning(planningDraft, work) {
  const metadata = work?.metadata ?? {};
  return {
    topic: cleanDraftText(planningDraft?.topic) || cleanDraftText(metadata.goal) || cleanDraftText(work?.title),
    audience: cleanDraftText(planningDraft?.audience) || cleanDraftText(metadata.audienceNote),
    goal: cleanDraftText(planningDraft?.goal) || cleanDraftText(metadata.objective) || cleanDraftText(metadata.goal)
  };
}

const PLANNING_FORM_DRAFT_KEY = 'trlab.planning.form-draft.v1';

function loadPlanningFormDraft(workId) {
  if (!workId || typeof window === 'undefined') return null;
  try {
    const parsed = JSON.parse(window.localStorage.getItem(`${PLANNING_FORM_DRAFT_KEY}.${workId}`) || 'null');
    return normalizePlanningDraftForTemplate(parsed);
  } catch {
    return null;
  }
}

function mergePlanningDraftSources(workDraft, localDraft) {
  const normalizedWorkDraft = normalizePlanningDraftForTemplate(workDraft);
  const normalizedLocalDraft = normalizePlanningDraftForTemplate(localDraft);
  if (!normalizedWorkDraft) return normalizedLocalDraft;
  if (!normalizedLocalDraft) return normalizedWorkDraft;
  const workTime = Date.parse(normalizedWorkDraft.updatedAt || normalizedWorkDraft.savedAt || normalizedWorkDraft.createdAt || '');
  const localTime = Date.parse(normalizedLocalDraft.savedAt || normalizedLocalDraft.updatedAt || normalizedLocalDraft.createdAt || '');
  if (Number.isFinite(localTime) && (!Number.isFinite(workTime) || localTime >= workTime)) {
    return normalizePlanningDraftForTemplate({ ...normalizedWorkDraft, ...normalizedLocalDraft });
  }
  return normalizePlanningDraftForTemplate({ ...normalizedLocalDraft, ...normalizedWorkDraft });
}

function persistEffectivePlanningDraft(planningDraft, { template, setPlanningDrafts, updateCurrentWork }) {
  const draft = mergeTemplateIntoPlanningDraft(normalizePlanningDraftForTemplate(planningDraft), template);
  if (!draft?.topic) return;
  const now = new Date().toISOString();
  const persistedDraft = {
    ...draft,
    id: draft.id || `planning-${Date.now()}`,
    updatedAt: now,
    createdAt: draft.createdAt || now
  };
  setPlanningDrafts?.((items = []) => [persistedDraft, ...items.filter((item) => item.id !== persistedDraft.id)]);
  updateCurrentWork?.((work) => ({
    ...work,
    title: work.title === '새 카드뉴스 작업물' || !work.title ? persistedDraft.title : work.title,
    drafts: {
      ...(work.drafts ?? {}),
      planning: [persistedDraft, ...(work.drafts?.planning ?? []).filter((item) => item.id !== persistedDraft.id)].slice(0, 12)
    },
    planningDraft: persistedDraft,
    equippedItems: {
      ...(work.equippedItems ?? {}),
      planning: {
        id: persistedDraft.id,
        label: persistedDraft.title,
        description: persistedDraft.topic || persistedDraft.goal,
        meta: `${persistedDraft.cardCount || 0}컷`
      }
    },
    status: work.status === 'draft' ? 'planning' : work.status
  }));
}

function mergeTemplateIntoPlanningDraft(draft, template) {
  if (!draft || !template) return draft;
  const lockedCardCount = Number(draft.cardCount) || Number(template.pageCount) || template.pages?.length || 0;
  return {
    ...draft,
    cardCount: lockedCardCount,
    templateId: template.id || draft.templateId || '',
    templateLabel: template.label || draft.templateLabel || '',
    templateFormatSignal: template.formatSignal || draft.templateFormatSignal || '',
    templateCanvas: template.canvas || draft.templateCanvas || '',
    templatePlatforms: Array.isArray(template.platforms) ? template.platforms : draft.templatePlatforms,
    templatePlatformSpecs: Array.isArray(template.platformSpecs) ? template.platformSpecs : draft.templatePlatformSpecs,
    templateProduction: template.production ?? draft.templateProduction ?? null,
    templateCardPlan: Array.isArray(template.cardPlan) ? template.cardPlan : draft.templateCardPlan,
    templateEditorControls: Array.isArray(template.editorControls) ? template.editorControls : draft.templateEditorControls,
    templateProductionFlow: Array.isArray(template.productionFlow) ? template.productionFlow : draft.templateProductionFlow,
    templateLayoutSlots: Array.isArray(template.layoutSlots) ? template.layoutSlots : draft.templateLayoutSlots,
    templateChannelStrategy: Array.isArray(template.channelStrategy) ? template.channelStrategy : draft.templateChannelStrategy,
    templateBlueprint: template.templateBlueprint ?? draft.templateBlueprint ?? null,
    templateSettings: {
      ...(draft.templateSettings ?? {}),
      ...(template.templateSettings ?? {}),
      pageCount: lockedCardCount,
      canvas: template.canvas || draft.templateCanvas || ''
    }
  };
}

function normalizePlanningDraftForTemplate(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const topic = cleanDraftText(value.topic);
  const title = cleanDraftText(value.title) || (topic ? `${topic} 카드뉴스 기획` : '');
  if (!topic && !title) return null;
  return {
    ...value,
    id: cleanDraftText(value.id),
    title,
    topic,
    audience: cleanDraftText(value.audience),
    goal: cleanDraftText(value.goal),
    contentDirection: cleanDraftMultilineText(value.contentDirection),
    format: cleanDraftText(value.format),
    formatLabel: cleanDraftText(value.formatLabel),
    cardCount: Math.min(12, Math.max(0, Number(value.cardCount) || 0)),
    detailLevel: cleanDraftText(value.detailLevel),
    tone: cleanDraftText(value.tone),
    storyFlow: cleanDraftMultilineText(value.storyFlow),
    visualDirection: cleanDraftMultilineText(value.visualDirection),
    promptGuide: cleanDraftMultilineText(value.promptGuide),
    avoid: cleanDraftMultilineText(value.avoid),
    characterName: cleanDraftText(value.characterName),
    characterRole: cleanDraftText(value.characterRole),
    characterTraits: cleanDraftText(value.characterTraits),
    characterPrompt: cleanDraftMultilineText(value.characterPrompt),
    characterStyleId: cleanDraftText(value.characterStyleId),
    characterDetailLevel: cleanDraftText(value.characterDetailLevel),
    characterAssets: Array.isArray(value.characterAssets) ? value.characterAssets.slice(0, 12) : [],
    selectedCharacterId: cleanDraftText(value.selectedCharacterId),
    templateId: cleanDraftText(value.templateId),
    templateLabel: cleanDraftText(value.templateLabel),
    templateFormatSignal: cleanDraftText(value.templateFormatSignal),
    templateCanvas: cleanDraftText(value.templateCanvas),
    templatePlatforms: Array.isArray(value.templatePlatforms) ? value.templatePlatforms.slice(0, 8).map(cleanDraftText).filter(Boolean) : [],
    templatePlatformSpecs: Array.isArray(value.templatePlatformSpecs) ? value.templatePlatformSpecs.slice(0, 8) : [],
    templateProduction: value.templateProduction && typeof value.templateProduction === 'object' ? value.templateProduction : null,
    templateCardPlan: Array.isArray(value.templateCardPlan) ? value.templateCardPlan.slice(0, 12) : [],
    templateEditorControls: Array.isArray(value.templateEditorControls) ? value.templateEditorControls.slice(0, 12) : [],
    templateProductionFlow: Array.isArray(value.templateProductionFlow) ? value.templateProductionFlow.slice(0, 12) : [],
    templateLayoutSlots: Array.isArray(value.templateLayoutSlots) ? value.templateLayoutSlots.slice(0, 12) : [],
    templateChannelStrategy: Array.isArray(value.templateChannelStrategy) ? value.templateChannelStrategy.slice(0, 8) : [],
    templateBlueprint: value.templateBlueprint && typeof value.templateBlueprint === 'object' && !Array.isArray(value.templateBlueprint) ? value.templateBlueprint : null,
    templateSettings: value.templateSettings && typeof value.templateSettings === 'object' && !Array.isArray(value.templateSettings) ? value.templateSettings : {},
    createdAt: cleanDraftText(value.createdAt),
    updatedAt: cleanDraftText(value.updatedAt),
    savedAt: cleanDraftText(value.savedAt)
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

function TemplatePreview({ item, large = false }) {
  const palette = paletteByIntensity[item.intensity] ?? paletteByIntensity.soft;
  const previewClass = large ? 'aspect-[4/5] overflow-hidden rounded-md' : 'aspect-[4/5] overflow-hidden rounded-md';

  return (
    <div className={previewClass}>
      <div className={`flex h-full flex-col ${palette.bg}`}>
        <PreviewHeader item={item} palette={palette} large={large} />
        <PreviewBody item={item} palette={palette} large={large} />
      </div>
    </div>
  );
}

function PreviewHeader({ item, palette, large }) {
  return (
    <div className={`${large ? 'min-h-[35%]' : 'min-h-[32%]'} ${palette.header} p-3 text-white`}>
      <div className="flex items-center justify-between gap-2">
        <span className="rounded-full bg-white/20 px-2 py-1 text-[10px] font-semibold">{item.meta}</span>
      </div>
      <div className={large ? 'mt-5 text-xl font-semibold leading-tight' : 'mt-4 text-base font-semibold leading-tight'}>{previewTitle(item)}</div>
      <div className="mt-2 line-clamp-2 text-[11px] font-medium leading-4 text-white/75">{item.description}</div>
    </div>
  );
}

function PreviewBody({ item, palette, large }) {
  if (item.id === 'instatoon-empathy') return <ToonPreview item={item} palette={palette} large={large} />;
  if (item.id === 'story-before-after') return <BeforeAfterPreview item={item} palette={palette} />;
  if (item.id === 'info-checklist') return <ChecklistPreview item={item} palette={palette} />;
  if (item.id === 'myth-fact') return <MythFactPreview item={item} palette={palette} />;
  if (item.id === 'product-guide') return <ProductPreview item={item} palette={palette} />;
  if (item.id === 'ranking-pick') return <RankingPreview item={item} palette={palette} />;
  if (item.id === 'brand-story') return <BrandPreview item={item} palette={palette} />;
  return <TeaserPreview item={item} palette={palette} />;
}

function ToonPreview({ item, palette, large }) {
  const scenes = large ? ['상황', '속마음', '반전', '저장'] : ['상황', '감정', '반전'];
  return (
    <div className="grid flex-1 grid-cols-2 gap-2 p-3">
      {scenes.map((scene, index) => (
        <div key={scene} className="relative rounded bg-white/70 p-2">
          <div className={`mb-2 h-9 w-9 rounded-full ${palette.badge}`} />
          <div className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-600">{scene}</div>
          {index === 1 ? <div className="absolute right-2 top-3 rounded bg-white/80 px-2 py-1 text-[10px] font-semibold text-slate-500">...</div> : null}
        </div>
      ))}
    </div>
  );
}

function BeforeAfterPreview({ palette }) {
  return (
    <div className="grid flex-1 grid-cols-2 gap-2 p-3">
      {['Before', 'After'].map((label, index) => (
        <div key={label} className="flex flex-col justify-between rounded bg-white/70 p-3">
          <span className={`w-fit rounded-full px-2 py-1 text-[10px] font-semibold ${palette.badge}`}>{label}</span>
          <div className={index === 0 ? 'h-16 rounded bg-slate-200' : 'h-16 rounded bg-slate-300'} />
          <div className="h-2 w-3/4 rounded bg-slate-300" />
        </div>
      ))}
    </div>
  );
}

function ChecklistPreview({ item, palette }) {
  return (
    <div className="grid flex-1 gap-2 p-3">
      {item.pages.slice(1, 5).map((page, index) => (
        <div key={page} className="flex items-center gap-2 rounded bg-white/70 p-2">
          <span className={`grid h-5 w-5 shrink-0 place-items-center rounded text-[10px] font-semibold ${palette.badge}`}>✓</span>
          <span className="text-[11px] font-semibold text-slate-600">{page}</span>
          <span className="ml-auto h-1.5 w-10 rounded bg-slate-200" />
        </div>
      ))}
    </div>
  );
}

function MythFactPreview({ palette }) {
  return (
    <div className="grid flex-1 gap-2 p-3">
      <div className="rounded bg-white/70 p-3">
        <div className="text-[10px] font-semibold text-slate-500">MYTH</div>
        <div className="mt-2 h-3 w-4/5 rounded bg-slate-300" />
      </div>
      <div className="rounded bg-white/70 p-3">
        <div className={`text-[10px] font-semibold ${palette.badge} inline rounded px-1.5 py-0.5`}>FACT</div>
        <div className="mt-2 h-3 w-3/5 rounded bg-slate-300" />
        <div className="mt-2 h-2 w-4/5 rounded bg-slate-200" />
      </div>
    </div>
  );
}

function ProductPreview({ palette }) {
  return (
    <div className="grid flex-1 gap-2 p-3">
      <div className="rounded bg-white/70 p-3">
        <div className={`h-16 rounded ${palette.bg} ring-1 ring-inset ring-slate-200`} />
        <div className="mt-2 flex gap-1">
          <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${palette.badge}`}>기준</span>
          <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-500">주의</span>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        {[1, 2, 3].map((item) => <div key={item} className="h-10 rounded bg-white/70" />)}
      </div>
    </div>
  );
}

function RankingPreview({ palette }) {
  return (
    <div className="grid flex-1 content-center gap-2 p-3">
      {[1, 2, 3].map((rank) => (
        <div key={rank} className="flex items-center gap-2 rounded bg-white/70 p-2">
          <span className={`grid h-7 w-7 place-items-center rounded-full text-[11px] font-semibold ${rank === 1 ? palette.badge : 'bg-slate-100 text-slate-500'}`}>{rank}</span>
          <div className="min-w-0 flex-1">
            <div className="h-2.5 w-3/4 rounded bg-slate-300" />
            <div className="mt-1.5 h-1.5 w-1/2 rounded bg-slate-200" />
          </div>
        </div>
      ))}
    </div>
  );
}

function BrandPreview({ palette }) {
  return (
    <div className="flex flex-1 flex-col justify-between p-3">
      <div className="rounded bg-white/70 p-3">
        <div className={`h-8 w-8 rounded ${palette.badge}`} />
        <div className="mt-3 h-3 w-2/3 rounded bg-slate-300" />
        <div className="mt-2 h-2 w-4/5 rounded bg-slate-200" />
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        {['관점', '증거', 'CTA'].map((label) => (
          <div key={label} className="rounded bg-white/70 px-1.5 py-2 text-center text-[10px] font-semibold text-slate-500">{label}</div>
        ))}
      </div>
    </div>
  );
}

function TeaserPreview({ palette }) {
  return (
    <div className="flex flex-1 flex-col justify-center gap-3 p-4 text-center">
      <div className={`mx-auto grid h-16 w-16 place-items-center rounded-full ${palette.badge} text-lg font-semibold`}>?</div>
      <div className="mx-auto h-3 w-32 rounded bg-slate-300" />
      <div className="mx-auto h-2 w-24 rounded bg-slate-200" />
      <div className="mx-auto rounded-full bg-white/70 px-3 py-1.5 text-[10px] font-semibold text-slate-500">COMING SOON</div>
    </div>
  );
}

function previewTitle(item) {
  const titles = {
    'instatoon-empathy': '오늘의 공감',
    'story-before-after': '바뀐 점',
    'info-checklist': '저장 체크',
    'myth-fact': '진짜일까?',
    'product-guide': '선택 가이드',
    'ranking-pick': 'TOP PICK',
    'brand-story': '우리의 관점',
    'launch-teaser': '곧 공개'
  };
  return titles[item.id] ?? item.label;
}

function MetaBox({ label, value }) {
  return (
    <div className="rounded-md bg-slate-50 px-3 py-2">
      <div className="text-[11px] text-slate-400">{label}</div>
      <div className="mt-1 truncate text-sm font-semibold text-slate-800">{value}</div>
    </div>
  );
}

function CoreTemplateSummary({ template, recommendation }) {
  const firstSlots = (template.cardPlan ?? []).slice(0, 3);
  return (
    <div className="mt-4 rounded-md bg-slate-50 p-3">
      <div className="text-[11px] font-semibold text-slate-400">핵심 내용</div>
      <div className="mt-1 text-sm font-semibold leading-5 text-slate-900">{template.production?.nextStep || template.description}</div>
      {recommendation?.reason ? (
        <div className="mt-3 rounded bg-white px-2.5 py-2">
          <div className="text-[11px] font-semibold text-slate-400">추천 이유</div>
          <div className="mt-1 text-xs font-medium leading-5 text-slate-600">{recommendation.reason}</div>
        </div>
      ) : null}
      {firstSlots.length ? (
        <div className="mt-3 grid gap-1.5">
          {firstSlots.map(([title, note], index) => (
            <div key={`${title}-${index}`} className="grid grid-cols-[24px_minmax(0,1fr)] gap-2 rounded bg-white/80 px-2.5 py-2">
              <span className="text-[11px] font-semibold text-slate-400">{index + 1}</span>
              <div className="min-w-0">
                <div className="truncate text-xs font-semibold text-slate-800">{title}</div>
                <div className="mt-0.5 line-clamp-2 text-[11px] font-medium leading-4 text-slate-500">{note}</div>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function TemplateSetupControls({ setup, template, contentBrief, onChange }) {
  const preset = CANVAS_PRESETS.find((item) => item.id === setup.canvasPreset) ?? CANVAS_PRESETS[0];
  const pageCount = normalizePageCount(setup.pageCount || template.pages?.length || 5);
  const choosePreset = (presetId) => {
    const nextPreset = CANVAS_PRESETS.find((item) => item.id === presetId) ?? CANVAS_PRESETS[0];
    onChange({
      canvasPreset: presetId,
      canvasWidth: nextPreset.width,
      canvasHeight: nextPreset.height
    });
  };
  return (
    <div className="mt-4 rounded-md bg-slate-50 p-3">
      <div className="mb-3 text-xs font-semibold text-slate-500">템플릿 적용 설정</div>
      <div className="grid gap-3">
        <FieldInline label="페이지 수">
          <div className="rounded-md border border-slate-200 bg-white px-3 py-2">
            <div className="text-sm font-semibold text-slate-800">{pageCount}장</div>
            <div className="mt-0.5 text-[11px] font-medium text-slate-400">
              기획 단계에서 정한 컷 수를 유지합니다.
            </div>
          </div>
        </FieldInline>

        <FieldInline label="캔버스">
          <select
            id="template-canvas-preset"
            name="templateCanvasPreset"
            className="h-9 w-full rounded-md border border-slate-200 bg-white px-2 text-sm font-semibold text-slate-700 outline-none focus:border-slate-400"
            value={setup.canvasPreset}
            onChange={(event) => choosePreset(event.target.value)}
          >
            {CANVAS_PRESETS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
          </select>
        </FieldInline>

        <div className="grid grid-cols-2 gap-2">
          <FieldInline label="가로">
            <input
              id="template-canvas-width"
              name="templateCanvasWidth"
              className={canvasInputClass}
              type="number"
              min="320"
              max="4096"
              value={setup.canvasWidth}
              onChange={(event) => onChange({ canvasPreset: 'custom', canvasWidth: event.target.value })}
            />
          </FieldInline>
          <FieldInline label="세로">
            <input
              id="template-canvas-height"
              name="templateCanvasHeight"
              className={canvasInputClass}
              type="number"
              min="320"
              max="4096"
              value={setup.canvasHeight}
              onChange={(event) => onChange({ canvasPreset: 'custom', canvasHeight: event.target.value })}
            />
          </FieldInline>
        </div>
        <div className="rounded bg-white px-2.5 py-2 text-[11px] font-medium text-slate-500">
          적용 시 {contentBrief?.generation?.topic || '현재 기획'}의 {pageCount}장 흐름을 유지하고, {canvasLabel({ ...setup, canvasPreset: setup.canvasPreset || preset.id })} 캔버스만 템플릿에서 가져갑니다.
        </div>
      </div>
    </div>
  );
}

function FieldInline({ label, children }) {
  return (
    <label className="grid gap-1.5">
      <span className="text-[11px] font-semibold text-slate-500">{label}</span>
      {children}
    </label>
  );
}

function configureTemplate(template, setup) {
  const normalizedSetup = normalizeTemplateSetup(setup, template);
  const pages = fitTemplatePages(template.pages ?? [], normalizedSetup.pageCount);
  const cardPlan = fitTemplateCardPlan(template.cardPlan ?? [], pages);
  const canvas = canvasLabel(normalizedSetup);
  return {
    ...template,
    pages,
    cardPlan,
    canvas,
    meta: `${pages.length}컷`,
    templateSettings: {
      ...(template.templateSettings ?? {}),
      pageCount: pages.length,
      canvasPreset: normalizedSetup.canvasPreset,
      canvasWidth: normalizedSetup.canvasWidth,
      canvasHeight: normalizedSetup.canvasHeight,
      canvas
    }
  };
}

function makeHomeTrainingExample(template) {
  const now = new Date().toISOString();
  const resolvedTemplate = configureTemplate(template ?? {
    id: 'saved-home-training-routine',
    label: '홈트레이닝 운동 구성 가이드',
    category: 'custom',
    description: '초보자가 집에서 주 3회 운동 루틴을 스스로 짤 수 있게 돕는 저장형 템플릿',
    meta: '6컷',
    tone: '초보 친화',
    intensity: 'soft',
    formatSignal: '정보 / 루틴 설계',
    platforms: ['Instagram', 'Threads'],
    canvas: '4:5 1080x1350',
    pages: ['표지', '목표 정하기', '운동 블록', '주 3회 예시', '강도 조절', '저장 체크'],
    cardPlan: []
  }, { pageCount: 6, canvasPreset: 'instagram-portrait', canvasWidth: 1080, canvasHeight: 1350 });
  const planningDraft = {
    id: `planning-home-training-${Date.now()}`,
    title: '홈트레이닝 운동 구성 짜는 법 카드뉴스 기획',
    format: 'information',
    formatLabel: '정보형 카드뉴스',
    topic: '홈트레이닝에서 어떻게 운동 구성을 짜는지',
    audience: '운동은 시작하고 싶은데 루틴을 어떻게 짜야 할지 모르는 초보자',
    goal: '독자가 주 3회 홈트 루틴을 스스로 구성하고 저장하게 만든다.',
    cardCount: 6,
    detailLevel: 'balanced',
    tone: '부담을 줄이고 바로 따라 하게 돕는 친절한 말투',
    visualDirection: '밝은 집 실내, 요가매트와 덤벨 같은 간단한 소품, 넓은 여백, 체크리스트와 루틴 카드 중심. 사진은 Pexels 우선, 부족하면 텍스트 없는 AI 배경 생성.',
    storyFlow: [
      '표지: 운동을 못 하는 게 아니라 구성이 막힌다는 훅',
      '목표 정하기: 감량/체력/자세 중 하나만 먼저 선택',
      '운동 블록: 하체-상체-코어-유산소를 10~15분 단위로 조합',
      '주 3회 예시: 월/수/금 또는 격일 루틴으로 바로 보여주기',
      '강도 조절: 숨참, 자세 무너짐, 근육통 기준으로 조절',
      '저장 체크: 오늘 루틴 만들기 체크리스트'
    ].join('\n'),
    promptGuide: 'LLM은 운동 전문 용어보다 초보자가 바로 이해하는 기준을 우선한다. 의료/재활처럼 보이는 조언은 피하고, 통증이 있으면 중단하고 전문가 상담 문구를 마지막에 짧게 둔다.',
    avoid: '무리한 감량 약속, 매일 고강도 운동 강요, 특정 질환 치료 표현, 복잡한 운동명 나열, 작은 글씨',
    templateId: resolvedTemplate.id,
    templateLabel: resolvedTemplate.label,
    templateFormatSignal: resolvedTemplate.formatSignal,
    templateCanvas: resolvedTemplate.canvas,
    templatePlatforms: resolvedTemplate.platforms,
    templatePlatformSpecs: resolvedTemplate.platformSpecs ?? [],
    templateProduction: resolvedTemplate.production,
    templateCardPlan: resolvedTemplate.cardPlan,
    templateEditorControls: resolvedTemplate.editorControls ?? [],
    templateProductionFlow: resolvedTemplate.productionFlow ?? [],
    templateLayoutSlots: resolvedTemplate.layoutSlots ?? [],
    templateChannelStrategy: resolvedTemplate.channelStrategy ?? [],
    templateBlueprint: resolvedTemplate.templateBlueprint ?? null,
    templateSettings: resolvedTemplate.templateSettings ?? {},
    characterAssets: [],
    selectedCharacterId: '',
    createdAt: now,
    updatedAt: now
  };
  const studio = {
    id: `planning-studio-${planningDraft.id}`,
    label: planningDraft.topic,
    keyword: planningDraft.topic,
    category: planningDraft.formatLabel,
    summary: planningDraft.goal,
    manualBrief: {
      topic: planningDraft.topic,
      prompt: `${planningDraft.goal}\n\n카드 흐름:\n${planningDraft.storyFlow}\n\n시각 방향:\n${planningDraft.visualDirection}`,
      audience: planningDraft.audience,
      tone: planningDraft.tone,
      cardCount: planningDraft.cardCount,
      channelName: '@trlab.insight'
    },
    contentSetup: {
      title: planningDraft.title,
      cardCount: planningDraft.cardCount,
      templateId: planningDraft.templateId,
      templateLabel: planningDraft.templateLabel,
      templateCanvas: planningDraft.templateCanvas,
      templateCardPlan: planningDraft.templateCardPlan,
      templateSettings: planningDraft.templateSettings,
      planningDraft
    },
    validation: { contentType: planningDraft.formatLabel, reason: planningDraft.goal },
    production: { tier: '기획', score: 92, suggestedAngle: planningDraft.promptGuide },
    planningDraft
  };
  const contentPlan = {
    id: studio.id,
    primaryTopic: planningDraft.topic,
    targetAudience: planningDraft.audience,
    coreAngle: '운동 종목을 많이 아는 것보다 목표와 시간에 맞춰 블록을 조합하는 법을 알려준다.',
    referenceStyle: 'clean_checklist_home_fitness',
    carouselBlueprint: planningDraft.storyFlow.split('\n'),
    hookTitles: ['홈트 루틴, 이렇게 짜면 덜 막혀요', '운동 초보를 위한 주 3회 구성법', '집에서 운동할 때 순서부터 정해요'],
    captionFirstLine: '홈트는 의지보다 구성이 먼저예요.',
    captionBody: '목표 하나, 운동 블록 네 개, 강도 체크 세 가지로 오늘 루틴을 만들어보세요.',
    captionCTA: '저장해두고 다음 운동 전에 체크하세요.',
    hashtags: ['홈트레이닝', '운동루틴', '초보운동', '운동습관', '카드뉴스'],
    summary: '초보자가 주 3회 홈트 루틴을 직접 구성하도록 돕는 6장 카드뉴스.',
    riskNotes: ['통증이 있으면 중단하고 전문가 상담 안내', '감량/치료 효과 단정 금지'],
    sourceNotes: ['일반 운동 구성 가이드. 의학적 처방 아님.'],
    contentSetup: {
      template: resolvedTemplate,
      templateId: resolvedTemplate.id,
      templateLabel: resolvedTemplate.label,
      templateCanvas: resolvedTemplate.canvas,
      templateCardPlan: resolvedTemplate.cardPlan,
      templateSettings: resolvedTemplate.templateSettings,
      planningDraft
    },
    productionBrief: {
      contentCategory: 'fitness',
      designConcept: '초보자도 부담 없이 저장하는 밝은 홈트 체크리스트',
      moodKeywords: ['clean home fitness', 'warm daylight', 'beginner friendly', 'minimal checklist'],
      palette: ['#0f172a', '#f8fafc', '#22c55e', '#e2e8f0', '#f97316'],
      typographyTone: '큰 제목, 짧은 본문, 숫자와 체크 아이콘 강조',
      visualConsistency: '상단 큰 제목, 중앙 루틴 카드, 하단 저장 체크 CTA 반복',
      assetStrategy: 'Pexels에서 집 운동 사진을 우선 사용하고, 텍스트 없는 배경이 부족하면 AI로 요가매트/덤벨/밝은 거실 배경을 생성',
      pexelsStrategy: {
        enabled: true,
        globalQueries: ['home workout', 'fitness mat', 'dumbbell workout', 'stretching at home'],
        orientation: 'portrait',
        usePolicy: '인물 얼굴이 과하게 특정되지 않는 사진을 배경 또는 참고용으로 사용하고 모든 문구는 SVG 텍스트로 얹음'
      },
      imageGenerationPolicy: 'AI 이미지는 텍스트, 로고, 워터마크 없는 밝은 실내 운동 배경만 생성'
    },
    cards: [
      homeTrainingCard(1, 'cover', 'cover_photo', '홈트 루틴, 어디서부터 짜야 할까요?', '운동을 못 하는 게 아니라 순서가 없어서 막히는 경우가 많아요.', 'home workout beginner living room fitness mat', ['요가매트', '물병', '체크 카드'], '밝은 거실, 요가매트가 아래쪽에 있고 상단 35%는 제목 여백'),
      homeTrainingCard(2, 'why_now', 'checklist', '먼저 목표 하나만 고르세요', '감량, 체력, 자세 중 하나만 정하면 운동 순서가 훨씬 쉬워져요.', 'fitness goal planning notebook workout', ['감량', '체력', '자세'], '노트와 운동 소품을 좌측 하단에 두고 우측에 체크리스트 여백'),
      homeTrainingCard(3, 'framework', 'checklist', '운동은 4개 블록으로 나눠요', '하체 10분, 상체 10분, 코어 10분, 유산소 5분처럼 블록으로 조합하세요.', 'dumbbell mat home workout equipment', ['하체', '상체', '코어', '유산소'], '운동 소품을 작은 그리드처럼 배치하고 중앙에 4블록 카드'),
      homeTrainingCard(4, 'example', 'routine_table', '주 3회라면 이렇게 시작해요', '월요일은 하체+코어, 수요일은 상체+유산소, 금요일은 전신+스트레칭으로 충분해요.', 'woman stretching at home fitness mat', ['월', '수', '금'], '인물은 배경처럼 약하게, 중앙에는 주 3회 루틴 표가 들어갈 넓은 여백'),
      homeTrainingCard(5, 'adjustment', 'quote_card', '강도는 숨과 자세로 조절하세요', '숨이 너무 차거나 자세가 무너지면 횟수보다 쉬는 시간을 먼저 늘리세요.', 'home workout rest water bottle', ['숨참', '자세', '근육통'], '물병과 수건이 있는 휴식 장면, 하단 35%는 주의 문구 여백'),
      homeTrainingCard(6, 'closing', 'checklist', '오늘 루틴 만들기 체크', '목표 1개, 운동 블록 3개, 쉬는 시간까지 정했다면 오늘 루틴은 완성입니다.', 'fitness checklist home workout', ['목표', '블록', '휴식', '저장'], '깨끗한 체크리스트 배경, 하단에 저장 CTA가 들어갈 공간')
    ],
    templateProduction: resolvedTemplate.production,
    templateCardPlan: resolvedTemplate.cardPlan,
    templateSettings: resolvedTemplate.templateSettings,
    generation: {
      source: 'local_example',
      message: '초보자 LLM 제작 흐름 검증용으로 미리 채운 제작 직전 설계입니다.'
    }
  };
  return {
    title: '홈트레이닝 운동 구성 짜는 법',
    template: resolvedTemplate,
    planningDraft,
    studio,
    contentPlan
  };
}

function homeTrainingCard(page, role, layout, title, body, pexelsQuery, visualItems, composition) {
  return {
    page,
    role,
    layout,
    visualType: page === 4 ? 'table' : page === 6 ? 'checklist' : 'photo',
    title,
    body,
    visualPrompt: `${composition}. No text, no logo, no watermark, clean Korean Instagram card background.`,
    visualItems,
    visualBrief: {
      scenario: composition,
      scenarioType: page === 4 ? 'routine_table' : page === 6 ? 'checklist' : 'usage_scene',
      backgroundPrompt: `${composition}, bright natural daylight, minimal home fitness props, no readable text`,
      pexelsQuery,
      referenceImageIntent: 'Pexels 이미지를 배경 후보로 먼저 사용하고, 텍스트가 있거나 구도가 맞지 않으면 AI 재생성 참고로 사용',
      productCandidates: [],
      props: visualItems,
      composition,
      overlaySafeArea: 'top 28% for title, center 46% for body card, bottom 18% for summary or CTA',
      negativePrompt: 'text, logo, watermark, medical claim, unrealistic body transformation'
    },
    visualData: page === 4 ? {
      type: 'routine_table',
      title: '주 3회 루틴 예시',
      columns: ['요일', '구성'],
      rows: [['월', '하체 + 코어'], ['수', '상체 + 유산소'], ['금', '전신 + 스트레칭']],
      callouts: ['처음 2주는 무리하지 않고 쉬는 시간을 넉넉히 둡니다.'],
      sources: []
    } : undefined,
    dataPoint: '초보자가 바로 따라 할 수 있는 구성 기준',
    insight: '운동 종목보다 조합 규칙을 먼저 주면 실행 장벽이 낮아진다.',
    action: page === 6 ? '저장 후 다음 운동 전에 체크' : '다음 카드로 넘겨 루틴 구성 기준 확인',
    sourceLine: '일반 피트니스 루틴 구성 원칙. 개인 통증/질환은 전문가 상담 필요.',
    emphasis: visualItems[0] ?? title
  };
}

function setupFromTemplate(template = {}) {
  const parsed = parseCanvas(template.canvas);
  return normalizeTemplateSetup({
    ...DEFAULT_TEMPLATE_SETUP,
    pageCount: template.pages?.length || Number(`${template.meta ?? ''}`.replace(/\D/g, '')) || DEFAULT_TEMPLATE_SETUP.pageCount,
    canvasPreset: parsed.presetId,
    canvasWidth: parsed.width,
    canvasHeight: parsed.height
  }, template);
}

function normalizeTemplateSetup(setup = {}, template = {}) {
  const fallback = setupFromTemplateFallback(template);
  return {
    pageCount: normalizePageCount(setup.pageCount || fallback.pageCount),
    canvasPreset: CANVAS_PRESETS.some((item) => item.id === setup.canvasPreset) ? setup.canvasPreset : fallback.canvasPreset,
    canvasWidth: normalizeCanvasSize(setup.canvasWidth || fallback.canvasWidth),
    canvasHeight: normalizeCanvasSize(setup.canvasHeight || fallback.canvasHeight)
  };
}

function setupFromTemplateFallback(template = {}) {
  const parsed = parseCanvas(template.canvas);
  return {
    pageCount: template.pages?.length || Number(`${template.meta ?? ''}`.replace(/\D/g, '')) || 5,
    canvasPreset: parsed.presetId,
    canvasWidth: parsed.width,
    canvasHeight: parsed.height
  };
}

function parseCanvas(canvas = '') {
  const text = `${canvas ?? ''}`;
  const match = text.match(/(\d{3,4})\s*x\s*(\d{3,4})/i);
  const width = normalizeCanvasSize(match?.[1] || DEFAULT_TEMPLATE_SETUP.canvasWidth);
  const height = normalizeCanvasSize(match?.[2] || DEFAULT_TEMPLATE_SETUP.canvasHeight);
  const preset = CANVAS_PRESETS.find((item) => item.width === width && item.height === height) ?? CANVAS_PRESETS[0];
  return { presetId: preset.id, width, height };
}

function normalizePageCount(value) {
  return Math.min(12, Math.max(3, Number(value) || 5));
}

function normalizeCanvasSize(value) {
  return Math.min(4096, Math.max(320, Number(value) || 1080));
}

function canvasLabel(setup) {
  const preset = CANVAS_PRESETS.find((item) => item.id === setup.canvasPreset);
  const ratio = preset?.id !== 'custom' ? preset.ratio : ratioFromSize(setup.canvasWidth, setup.canvasHeight);
  return `${ratio} ${setup.canvasWidth}x${setup.canvasHeight}`;
}

function ratioFromSize(width, height) {
  const divisor = gcd(width, height);
  return `${Math.round(width / divisor)}:${Math.round(height / divisor)}`;
}

function gcd(a, b) {
  let x = Math.abs(Number(a) || 1);
  let y = Math.abs(Number(b) || 1);
  while (y) [x, y] = [y, x % y];
  return x || 1;
}

function fitTemplatePages(pages = [], pageCount) {
  const source = pages.length ? pages : ['표지', '본문', '정리', 'CTA'];
  const nextPages = source.slice(0, pageCount);
  while (nextPages.length < pageCount) {
    const nextIndex = nextPages.length + 1;
    nextPages.splice(Math.max(1, nextPages.length - 1), 0, `보강 ${nextIndex}`);
  }
  return nextPages.map((page, index) => {
    if (/^보강\s+\d+/.test(page)) return `보강 ${index + 1}`;
    return page;
  });
}

function fitTemplateCardPlan(cardPlan = [], pages = []) {
  const source = cardPlan.length ? cardPlan : pages.map((page) => [page, `${page} 역할에 맞는 카드`]);
  const nextPlan = source.slice(0, pages.length);
  while (nextPlan.length < pages.length) {
    const page = pages[nextPlan.length];
    nextPlan.splice(Math.max(1, nextPlan.length - 1), 0, [page, '앞 카드와 겹치지 않는 예시나 기준을 보강']);
  }
  return nextPlan.map((item, index) => {
    const [title, note] = Array.isArray(item) ? item : [pages[index], `${pages[index]} 역할에 맞는 카드`];
    return [pages[index] || title || `카드 ${index + 1}`, note || `${pages[index] || title} 역할에 맞는 카드`];
  });
}

function filterClass(active) {
  return [
    'h-7 rounded-full px-3 text-xs font-medium transition',
    active ? 'bg-slate-950 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-950'
  ].join(' ');
}

function templateCardClass(selected) {
  return [
    'group rounded-lg bg-slate-50 p-2.5 shadow-[0_4px_14px_rgba(15,23,42,0.05)] ring-1 ring-slate-200/80 transition-all duration-200',
    selected ? 'bg-white shadow-[0_14px_34px_rgba(15,23,42,0.12)] ring-slate-300' : 'hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_14px_30px_rgba(15,23,42,0.10)] hover:ring-slate-300'
  ].join(' ');
}

function libraryTabClass(active) {
  return [
    'h-8 rounded-md px-3 text-xs font-semibold transition',
    active ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500 hover:bg-white/70 hover:text-slate-900'
  ].join(' ');
}

function recommendationRowClass(selected) {
  return [
    'flex items-start gap-3 rounded-lg border p-3 transition',
    selected ? 'border-slate-400 bg-slate-50 shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
  ].join(' ');
}

function savedTemplateRowClass(selected) {
  return [
    'flex items-center gap-3 rounded-lg border p-3 transition',
    selected ? 'border-slate-400 bg-slate-50 shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
  ].join(' ');
}

function platformChipTitle(template, platform) {
  const spec = template.platformSpecs?.find((item) => item.platform === platform);
  if (!spec) return undefined;
  return [spec.canvas, spec.safeArea, spec.behavior].filter(Boolean).join(' · ');
}

function categoryLabel(category) {
  return categories.find(([id]) => id === category)?.[1] ?? '템플릿';
}

const paletteByIntensity = {
  light: {
    bg: 'bg-slate-50',
    border: 'border-slate-200',
    header: 'bg-slate-600',
    badge: 'bg-slate-100 text-slate-600'
  },
  soft: {
    bg: 'bg-zinc-50',
    border: 'border-zinc-200',
    header: 'bg-zinc-700',
    badge: 'bg-zinc-100 text-zinc-700'
  },
  dark: {
    bg: 'bg-neutral-100',
    border: 'border-neutral-200',
    header: 'bg-neutral-800',
    badge: 'bg-neutral-200 text-neutral-700'
  }
};
