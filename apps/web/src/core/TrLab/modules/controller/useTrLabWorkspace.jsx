'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { defaultExcludedAreas, defaultSelectedAreas, defaultSelectedProfiles } from '@/core/TrLab/modules/configs/constants';
import { useTrLabData } from '@/core/TrLab/modules/controller/useTrLabData';
import { trendToRadarItem } from '@/core/TrLab/modules/helpers/utils';

const TrLabWorkspaceContext = createContext(null);
const WORKSPACE_STORAGE_KEY = 'trlab.workspace.v1';
const WORKSPACE_STATE_VERSION = 5;
const PERSISTABLE_VIEWS = new Set(['overview', 'metadata', 'templates', 'works', 'planning', 'profiles', 'collection', 'settings', 'studio', 'plan', 'cardnews']);
const WORK_DETAIL_STAGES = new Set(['overview', 'metadata', 'templates', 'planning', 'studio', 'plan', 'cardnews']);
const DEFAULT_SAVED_TEMPLATES = [{
  id: 'saved-home-training-routine',
  label: '홈트레이닝 운동 구성 가이드',
  category: 'custom',
  description: '초보자가 집에서 주 3회 운동 루틴을 스스로 짤 수 있게 돕는 저장형 템플릿',
  meta: '6컷',
  tone: '초보 친화',
  intensity: 'soft',
  editorMode: 'text',
  formatSignal: '정보 / 루틴 설계',
  platforms: ['Instagram', 'Threads'],
  canvas: '4:5 1080x1350',
  pages: ['표지', '목표 정하기', '운동 블록', '주 3회 예시', '강도 조절', '저장 체크'],
  cardPlan: [
    ['표지', '홈트 루틴을 못 짜는 초보자의 고민을 한 문장으로 잡습니다.'],
    ['목표 정하기', '감량, 체력, 자세 교정 중 하나를 먼저 고르게 합니다.'],
    ['운동 블록', '하체, 상체, 코어, 유산소 블록을 10~15분 단위로 나눕니다.'],
    ['주 3회 예시', '월/수/금 또는 격일 루틴으로 바로 따라 할 예시를 보여줍니다.'],
    ['강도 조절', '숨참, 자세 무너짐, 근육통 기준으로 난이도를 조절하게 합니다.'],
    ['저장 체크', '운동 전 확인할 체크리스트와 다음 행동을 고정합니다.']
  ],
  production: {
    nextStep: '기획 단계에서 LLM이 초보자용 루틴 문구와 컷별 구성을 완성합니다.',
    groups: [
      ['이미지', ['Pexels 홈트 사진', 'AI 배경', '운동 소품']],
      ['텍스트', ['큰 제목', '짧은 기준', '체크리스트']],
      ['배치', ['상단 제목', '중앙 루틴 카드', '하단 저장 CTA']],
      ['톤', ['부담 적게', '초보자 기준', '실행 중심']]
    ]
  },
  templateSettings: {
    source: 'example',
    imagePlan: 'Pexels에서 home workout, fitness mat, dumbbell, stretching 이미지를 우선 찾고 부족하면 AI 배경을 생성',
    beginnerFlow: true
  },
  savedAt: '2026-06-24T00:00:00.000Z',
  savedFrom: 'example'
}];

function useTrLabWorkspaceImpl() {
  const pathname = usePathname();
  const router = useRouter();
  const routeState = parseWorkspacePath(pathname);
  const data = useTrLabData();
  const [hydrated, setHydrated] = useState(false);
  const [view, setViewState] = useState(() => routeState.view);
  const [works, setWorks] = useState([]);
  const [currentWorkId, setCurrentWorkId] = useState(() => routeState.currentWorkId);
  const [queue, setQueue] = useState([]);
  const [contentPlans, setContentPlans] = useState({});
  const [planningDrafts, setPlanningDrafts] = useState([]);
  const [savedTemplates, setSavedTemplates] = useState(DEFAULT_SAVED_TEMPLATES);
  const [equippedItems, setEquippedItems] = useState({});
  const [selectedTrend, setSelectedTrend] = useState(null);
  const [analysisDate, setAnalysisDate] = useState(todayKstDate());
  const [selectedChannelProfiles, setSelectedChannelProfiles] = useState(defaultSelectedProfiles);
  const [selectedAreas, setSelectedAreas] = useState(defaultSelectedAreas);
  const [excludedAreas, setExcludedAreas] = useState(defaultExcludedAreas);
  const loadedAnalysisDateRef = useRef('');

  useEffect(() => {
    const persisted = loadWorkspaceState();
    if (persisted.works) setWorks(persisted.works);
    if (persisted.queue) setQueue(persisted.queue);
    if (persisted.contentPlans) setContentPlans(persisted.contentPlans);
    if (persisted.planningDrafts) setPlanningDrafts(persisted.planningDrafts);
    if (persisted.savedTemplates) setSavedTemplates(mergeDefaultSavedTemplates(persisted.savedTemplates));
    if (persisted.equippedItems) setEquippedItems(persisted.equippedItems);
    if (persisted.selectedTrend) setSelectedTrend(persisted.selectedTrend);
    if (persisted.analysisDate) setAnalysisDate(persisted.analysisDate);
    if (persisted.selectedChannelProfiles) setSelectedChannelProfiles(persisted.selectedChannelProfiles);
    if (persisted.selectedAreas) setSelectedAreas(persisted.selectedAreas);
    if (persisted.excludedAreas) setExcludedAreas(persisted.excludedAreas);
    setHydrated(true);
  }, []);

  useEffect(() => {
    const nextRoute = parseWorkspacePath(pathname);
    setViewState(nextRoute.view);
    setCurrentWorkId(nextRoute.currentWorkId);
  }, [pathname]);

  const setView = useCallback((nextView) => {
    const normalizedView = PERSISTABLE_VIEWS.has(nextView) ? nextView : null;
    setViewState(normalizedView);
    const nextPath = makeViewPath(normalizedView, currentWorkId);
    if (pathname !== nextPath) router.push(nextPath);
  }, [currentWorkId, pathname, router]);

  const currentWork = useMemo(() => works.find((work) => work.id === currentWorkId) ?? null, [currentWorkId, works]);

  const createWork = useCallback((input = {}) => {
    const work = normalizeWork(input);
    setWorks((items = []) => [work, ...items]);
    setCurrentWorkId(work.id);
    setEquippedItems(work.equippedItems ?? {});
    router.push(`/works/${work.id}/${input.stage ?? 'metadata'}`);
    return work;
  }, [router]);

  const openWork = useCallback((workId, stage = 'overview') => {
    if (!workId) return;
    const normalizedStage = WORK_DETAIL_STAGES.has(stage) ? stage : 'metadata';
    setCurrentWorkId(workId);
    router.push(normalizedStage === 'overview' ? `/works/${workId}` : `/works/${workId}/${normalizedStage}`);
  }, [router]);

  const duplicateWork = useCallback((workId) => {
    const source = works.find((work) => work.id === workId);
    if (!source) return null;
    const work = normalizeWork({
      ...source,
      id: undefined,
      title: `${source.title} 복사본`,
      status: source.status ?? 'draft',
      sourceWorkId: source.id
    });
    setWorks((items = []) => [work, ...items]);
    setCurrentWorkId(work.id);
    router.push(`/works/${work.id}`);
    return work;
  }, [router, works]);

  const deleteWork = useCallback((workId) => {
    setWorks((items = []) => items.filter((work) => work.id !== workId));
    if (currentWorkId === workId) {
      setCurrentWorkId(null);
      setEquippedItems({});
      router.push('/works');
    }
  }, [currentWorkId, router]);

  const updateCurrentWork = useCallback((updater) => {
    if (!currentWorkId) return;
    setWorks((items = []) => items.map((work) => {
      if (work.id !== currentWorkId) return work;
      const nextWork = typeof updater === 'function' ? updater(work) : { ...work, ...updater };
      return normalizeWorkUpdate(nextWork);
    }));
  }, [currentWorkId]);

  const chooseTrend = useCallback((trend) => {
    if (!trend) return;
    const nextTrend = trend?.label ? trend : trendToRadarItem(trend, (trend?.rank ?? 1) - 1);
    setSelectedTrend(nextTrend);
    data.recordCandidateFeedback?.({ action: 'select', candidate: nextTrend, reason: 'candidate-open' });
    setView('studio');
  }, [data]);

  const addToQueue = useCallback((verification) => {
    setQueue((items) => {
      if (!selectedTrend) return items;
      const nextTrend = verification ? { ...selectedTrend, searchVerification: summarizeSearchVerification(verification) } : selectedTrend;
      data.recordCandidateFeedback?.({ action: 'queue', candidate: nextTrend, reason: verification ? 'search-verified-queue' : 'manual-queue' });
      return [nextTrend, ...(items || []).filter((item) => item?.id !== selectedTrend?.id)];
    });
    if (selectedTrend) setView('studio');
  }, [data, selectedTrend]);

  const clearCollectedTrends = useCallback(async () => {
    await data.clearCollectedTrends();
    setSelectedTrend(null);
    setQueue([]);
    setSelectedChannelProfiles(getDefaultProfileIds(data.channelProfiles));
    setSelectedAreas(defaultSelectedAreas);
    setExcludedAreas(defaultExcludedAreas);
  }, [data]);

  const changeAnalysisDate = useCallback((nextDate) => {
    if (!isDateText(nextDate)) return;
    setAnalysisDate(nextDate);
  }, []);

  const equipItem = useCallback((slot, item) => {
    if (!slot) return;
    const normalizedItem = item ? normalizeEquippedItem(item) : null;
    setEquippedItems((current) => ({
      ...current,
      [slot]: normalizedItem
    }));
    if (currentWorkId) {
      setWorks((items = []) => items.map((work) => {
        if (work.id !== currentWorkId) return work;
        return normalizeWorkUpdate({
          ...work,
          status: statusFromSlot(slot, normalizedItem, work.status),
          equippedItems: {
            ...(work.equippedItems ?? {}),
            [slot]: normalizedItem
          }
        });
      }));
    }
  }, [currentWorkId]);

  const saveTemplate = useCallback((template) => {
    if (!template) return null;
    const saved = normalizeSavedTemplate(template);
    setSavedTemplates((items = []) => [saved, ...items.filter((item) => item.id !== saved.id)].slice(0, 30));
    return saved;
  }, []);

  const deleteSavedTemplate = useCallback((templateId) => {
    if (!templateId) return;
    setSavedTemplates((items = []) => items.filter((item) => item.id !== templateId && item.savedFrom !== 'example'));
  }, []);

  const studioTrend = useMemo(() => queue?.[0] ?? selectedTrend, [queue, selectedTrend]);
  const isQueued = useMemo(() => queue?.some((item) => item?.id === selectedTrend?.id), [queue, selectedTrend]);

  useEffect(() => {
    if (!hydrated) return;
    saveWorkspaceState({ view, works, currentWorkId, queue, contentPlans, planningDrafts, savedTemplates, equippedItems, selectedTrend, analysisDate, selectedChannelProfiles, selectedAreas, excludedAreas });
  }, [hydrated, view, works, currentWorkId, queue, contentPlans, planningDrafts, savedTemplates, equippedItems, selectedTrend, analysisDate, selectedChannelProfiles, selectedAreas, excludedAreas]);

  useEffect(() => {
    if (!hydrated || !isDateText(analysisDate) || loadedAnalysisDateRef.current === analysisDate) return;
    loadedAnalysisDateRef.current = analysisDate;
    Promise.all([
      data.refreshCollection({ force: true, analysisDate }),
      data.refreshTrendSnapshot({ force: true, analysisDate })
    ]).catch(() => {
      loadedAnalysisDateRef.current = '';
    });
  }, [hydrated, analysisDate, data.refreshCollection, data.refreshTrendSnapshot]);

  return {
    ...data,
    view,
    setView,
    works,
    setWorks,
    currentWork,
    currentWorkId,
    setCurrentWorkId,
    createWork,
    openWork,
    duplicateWork,
    deleteWork,
    updateCurrentWork,
    queue,
    setQueue,
    contentPlans,
    setContentPlans,
    planningDrafts,
    setPlanningDrafts,
    savedTemplates,
    setSavedTemplates,
    saveTemplate,
    deleteSavedTemplate,
    equippedItems,
    setEquippedItems,
    equipItem,
    selectedTrend,
    setSelectedTrend,
    analysisDate,
    setAnalysisDate: changeAnalysisDate,
    selectedChannelProfiles,
    setSelectedChannelProfiles,
    accountSlots: data.accountSlots,
    setAccountSlots: data.setAccountSlots,
    selectedAreas,
    setSelectedAreas,
    excludedAreas,
    setExcludedAreas,
    studioTrend,
    isQueued,
    chooseTrend,
    addToQueue,
    clearCollectedTrends
  };
}

export function TrLabWorkspaceContextProvider({ children }) {
  const value = useTrLabWorkspaceImpl();

  return (
    <TrLabWorkspaceContext.Provider key="TrLabWorkspaceContextProvider" value={value}>
      {children}
    </TrLabWorkspaceContext.Provider>
  );
}

export default function useTrLabWorkspace() {
  const context = useContext(TrLabWorkspaceContext);
  if (!context) throw new Error('useTrLabWorkspace must be used inside TrLabWorkspaceContextProvider');
  return context;
}

function summarizeSearchVerification(searchCheck) {
  if (!searchCheck) return null;
  return {
    query: searchCheck.query,
    checkedAt: searchCheck.checkedAt,
    verification: searchCheck.verification,
    sources: (searchCheck.sources ?? []).map((source) => ({
      source: source.source,
      status: source.status,
      count: source.count,
      error: source.error
    })),
    results: (searchCheck.results ?? []).slice(0, 5).map((result) => ({
      source: result.source,
      title: stripHtml(result.title),
      url: result.url,
      snippet: stripHtml(result.snippet),
      publishedAt: result.publishedAt
    }))
  };
}

function stripHtml(value) {
  return `${value ?? ''}`
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function loadWorkspaceState() {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(WORKSPACE_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.version !== WORKSPACE_STATE_VERSION) return {};
    return {
      view: PERSISTABLE_VIEWS.has(parsed.view) ? parsed.view : undefined,
      works: Array.isArray(parsed.works) ? parsed.works.map(normalizeWorkUpdate) : [],
      currentWorkId: typeof parsed.currentWorkId === 'string' ? parsed.currentWorkId : '',
      queue: Array.isArray(parsed.queue) ? parsed.queue : [],
      contentPlans: isPlainObject(parsed.contentPlans) ? parsed.contentPlans : {},
      planningDrafts: Array.isArray(parsed.planningDrafts) ? parsed.planningDrafts : [],
      savedTemplates: Array.isArray(parsed.savedTemplates) ? parsed.savedTemplates.map(normalizeSavedTemplate) : DEFAULT_SAVED_TEMPLATES,
      equippedItems: isPlainObject(parsed.equippedItems) ? parsed.equippedItems : {},
      selectedTrend: parsed.selectedTrend && typeof parsed.selectedTrend === 'object' ? parsed.selectedTrend : null,
      analysisDate: isDateText(parsed.analysisDate) ? parsed.analysisDate : todayKstDate(),
      selectedChannelProfiles: Array.isArray(parsed.selectedChannelProfiles) ? parsed.selectedChannelProfiles : defaultSelectedProfiles,
      selectedAreas: Array.isArray(parsed.selectedAreas) ? parsed.selectedAreas : defaultSelectedAreas,
      excludedAreas: Array.isArray(parsed.excludedAreas) ? parsed.excludedAreas : defaultExcludedAreas
    };
  } catch {
    return {};
  }
}

function saveWorkspaceState(state) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify({
      version: WORKSPACE_STATE_VERSION,
      savedAt: new Date().toISOString(),
      view: PERSISTABLE_VIEWS.has(state.view) ? state.view : 'planning',
      works: Array.isArray(state.works) ? state.works.slice(0, 100).map(normalizeWorkUpdate) : [],
      currentWorkId: state.currentWorkId ?? '',
      queue: Array.isArray(state.queue) ? state.queue.slice(0, 12) : [],
      contentPlans: isPlainObject(state.contentPlans) ? state.contentPlans : {},
      planningDrafts: Array.isArray(state.planningDrafts) ? state.planningDrafts.slice(0, 24) : [],
      savedTemplates: Array.isArray(state.savedTemplates) ? mergeDefaultSavedTemplates(state.savedTemplates).slice(0, 30) : DEFAULT_SAVED_TEMPLATES,
      equippedItems: isPlainObject(state.equippedItems) ? state.equippedItems : {},
      selectedTrend: state.selectedTrend ?? null,
      analysisDate: isDateText(state.analysisDate) ? state.analysisDate : todayKstDate(),
      selectedChannelProfiles: Array.isArray(state.selectedChannelProfiles) ? state.selectedChannelProfiles : defaultSelectedProfiles,
      selectedAreas: Array.isArray(state.selectedAreas) ? state.selectedAreas : defaultSelectedAreas,
      excludedAreas: Array.isArray(state.excludedAreas) ? state.excludedAreas : defaultExcludedAreas
    }));
  } catch {
    // localStorage quota/private mode failures should not block the app.
  }
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function normalizeEquippedItem(item) {
  return {
    ...item,
    id: `${item.id ?? item.title ?? item.label ?? Date.now()}`,
    label: `${item.label ?? item.title ?? item.name ?? 'Untitled'}`,
    description: `${item.description ?? item.summary ?? item.topic ?? ''}`,
    meta: item.meta ? `${item.meta}` : ''
  };
}

function normalizeSavedTemplate(template = {}) {
  const now = new Date().toISOString();
  return {
    ...template,
    id: `${template.id ?? `saved-template-${Date.now()}`}`,
    label: `${template.label ?? template.title ?? '저장 템플릿'}`.trim() || '저장 템플릿',
    description: `${template.description ?? ''}`.trim(),
    category: `${template.category ?? 'custom'}`,
    meta: template.meta ? `${template.meta}` : `${Array.isArray(template.pages) ? template.pages.length : 5}컷`,
    tone: `${template.tone ?? '저장형'}`,
    intensity: `${template.intensity ?? 'soft'}`,
    editorMode: `${template.editorMode ?? 'text'}`,
    formatSignal: `${template.formatSignal ?? '저장 템플릿'}`,
    platforms: Array.isArray(template.platforms) && template.platforms.length ? template.platforms : ['Instagram'],
    canvas: `${template.canvas ?? '4:5 1080x1350'}`,
    pages: Array.isArray(template.pages) && template.pages.length ? template.pages.slice(0, 12) : ['표지', '본문', '정리', 'CTA'],
    cardPlan: Array.isArray(template.cardPlan) ? template.cardPlan.slice(0, 12) : [],
    production: isPlainObject(template.production) ? template.production : {
      nextStep: '기획 단계에서 AI가 구성과 문구를 완성합니다.',
      groups: [['구성', ['AI 초안', '직접 수정']]]
    },
    templateSettings: isPlainObject(template.templateSettings) ? template.templateSettings : {},
    savedAt: template.savedAt || now,
    savedFrom: template.savedFrom || 'user'
  };
}

function mergeDefaultSavedTemplates(templates = []) {
  const items = templates.map(normalizeSavedTemplate);
  const ids = new Set(items.map((item) => item.id));
  return [
    ...DEFAULT_SAVED_TEMPLATES.filter((item) => !ids.has(item.id)),
    ...items
  ];
}

function parseWorkspacePath(pathname) {
  const parts = `${pathname ?? ''}`.split('/').filter(Boolean);
  if (parts[0] === 'works' && parts[1]) {
    const stage = WORK_DETAIL_STAGES.has(parts[2]) ? parts[2] : 'overview';
    return { view: stage, currentWorkId: parts[1] };
  }
  const view = PERSISTABLE_VIEWS.has(parts[0]) ? parts[0] : null;
  return { view, currentWorkId: null };
}

function makeViewPath(view, currentWorkId) {
  if (!view) return '/';
  if (view === 'works') return '/works';
  if (view === 'overview' && currentWorkId) return `/works/${currentWorkId}`;
  if (currentWorkId && WORK_DETAIL_STAGES.has(view)) return `/works/${currentWorkId}/${view}`;
  return `/${view}`;
}

function normalizeWork(input = {}) {
  const now = new Date().toISOString();
  const id = input.id || `work-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  return normalizeWorkUpdate({
    id,
    title: `${input.title || input.label || '새 작업물'}`.trim() || '새 작업물',
    status: input.status || 'draft',
    metadata: isPlainObject(input.metadata) ? { ...defaultWorkMetadata(), ...input.metadata } : defaultWorkMetadata(),
    equippedItems: isPlainObject(input.equippedItems) ? input.equippedItems : {},
    planningDraft: input.planningDraft ?? null,
    contentPlan: input.contentPlan ?? null,
    assets: isPlainObject(input.assets) ? input.assets : {},
    output: isPlainObject(input.output) ? input.output : {},
    sourceWorkId: input.sourceWorkId ?? '',
    createdAt: input.createdAt || now,
    updatedAt: input.updatedAt || now
  });
}

function normalizeWorkUpdate(work = {}) {
  const now = new Date().toISOString();
  return {
    ...work,
    id: `${work.id ?? `work-${Date.now()}`}`,
    title: `${work.title ?? '새 작업물'}`.trim() || '새 작업물',
    status: `${work.status ?? 'draft'}`,
    metadata: isPlainObject(work.metadata) ? { ...defaultWorkMetadata(), ...work.metadata } : defaultWorkMetadata(),
    equippedItems: isPlainObject(work.equippedItems) ? work.equippedItems : {},
    planningDraft: work.planningDraft ?? null,
    contentPlan: work.contentPlan ?? null,
    assets: isPlainObject(work.assets) ? work.assets : {},
    output: isPlainObject(work.output) ? work.output : {},
    createdAt: work.createdAt || now,
    updatedAt: now
  };
}

function statusFromSlot(slot, item, fallback = 'draft') {
  if (!item) return fallback;
  if (slot === 'template') return 'template';
  if (slot === 'planning') return 'planning';
  if (slot === 'work') return fallback;
  return fallback;
}

function defaultWorkMetadata() {
  return {
    ageGroups: ['20s', '30s'],
    gender: 'all',
    situations: ['work', 'saving'],
    objective: 'save',
    tone: 'empathy',
    channel: 'instagram',
    audienceNote: '',
    goal: '',
    notes: ''
  };
}

function getDefaultProfileIds(profiles = []) {
  const ids = profiles.filter((profile) => profile.enabled !== false).map((profile) => profile.id);
  return ids.length ? ids : defaultSelectedProfiles;
}

function todayKstDate() {
  const kst = new Date(Date.now() + 9 * 60 * 60 * 1000);
  return `${kst.getUTCFullYear()}-${String(kst.getUTCMonth() + 1).padStart(2, '0')}-${String(kst.getUTCDate()).padStart(2, '0')}`;
}

function isDateText(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(`${value ?? ''}`);
}
