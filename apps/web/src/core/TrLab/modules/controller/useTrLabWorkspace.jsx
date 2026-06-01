'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { defaultExcludedAreas, defaultSelectedAreas } from '@/core/TrLab/modules/configs/constants';
import { useTrLabData } from '@/core/TrLab/modules/controller/useTrLabData';
import { trendToRadarItem } from '@/core/TrLab/modules/helpers/utils';

const TrLabWorkspaceContext = createContext(null);
const WORKSPACE_STORAGE_KEY = 'trlab.workspace.v1';
const WORKSPACE_STATE_VERSION = 1;
const PERSISTABLE_VIEWS = new Set(['dashboard', 'collection', 'search', 'studio', 'cardnews']);

function useTrLabWorkspaceImpl() {
  const data = useTrLabData();
  const [hydrated, setHydrated] = useState(false);
  const [view, setView] = useState('dashboard');
  const [queue, setQueue] = useState([]);
  const [contentPlans, setContentPlans] = useState({});
  const [selectedTrend, setSelectedTrend] = useState(null);
  const [selectedAreas, setSelectedAreas] = useState(defaultSelectedAreas);
  const [excludedAreas, setExcludedAreas] = useState(defaultExcludedAreas);

  useEffect(() => {
    const persisted = loadWorkspaceState();
    if (persisted.view) setView(persisted.view);
    if (persisted.queue) setQueue(persisted.queue);
    if (persisted.contentPlans) setContentPlans(persisted.contentPlans);
    if (persisted.selectedTrend) setSelectedTrend(persisted.selectedTrend);
    if (persisted.selectedAreas) setSelectedAreas(persisted.selectedAreas);
    if (persisted.excludedAreas) setExcludedAreas(persisted.excludedAreas);
    setHydrated(true);
  }, []);

  const chooseTrend = useCallback((trend) => {
    if (!trend) return;
    setSelectedTrend(trend?.label ? trend : trendToRadarItem(trend, (trend?.rank ?? 1) - 1));
    setView('search');
  }, []);

  const addToQueue = useCallback((verification) => {
    setQueue((items) => {
      if (!selectedTrend) return items;
      const nextTrend = verification ? { ...selectedTrend, searchVerification: summarizeSearchVerification(verification) } : selectedTrend;
      return [nextTrend, ...(items || []).filter((item) => item?.id !== selectedTrend?.id)];
    });
    if (selectedTrend) setView('studio');
  }, [selectedTrend]);

  const studioTrend = useMemo(() => queue?.[0] ?? selectedTrend, [queue, selectedTrend]);
  const isQueued = useMemo(() => queue?.some((item) => item?.id === selectedTrend?.id), [queue, selectedTrend]);

  useEffect(() => {
    if (!hydrated) return;
    saveWorkspaceState({ view, queue, contentPlans, selectedTrend, selectedAreas, excludedAreas });
  }, [hydrated, view, queue, contentPlans, selectedTrend, selectedAreas, excludedAreas]);

  return {
    ...data,
    view,
    setView,
    queue,
    setQueue,
    contentPlans,
    setContentPlans,
    selectedTrend,
    setSelectedTrend,
    selectedAreas,
    setSelectedAreas,
    excludedAreas,
    setExcludedAreas,
    studioTrend,
    isQueued,
    chooseTrend,
    addToQueue
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
      queue: Array.isArray(parsed.queue) ? parsed.queue : [],
      contentPlans: isPlainObject(parsed.contentPlans) ? parsed.contentPlans : {},
      selectedTrend: parsed.selectedTrend && typeof parsed.selectedTrend === 'object' ? parsed.selectedTrend : null,
      selectedAreas: Array.isArray(parsed.selectedAreas) && parsed.selectedAreas.length ? parsed.selectedAreas : defaultSelectedAreas,
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
      view: PERSISTABLE_VIEWS.has(state.view) ? state.view : 'dashboard',
      queue: Array.isArray(state.queue) ? state.queue.slice(0, 12) : [],
      contentPlans: isPlainObject(state.contentPlans) ? state.contentPlans : {},
      selectedTrend: state.selectedTrend ?? null,
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
