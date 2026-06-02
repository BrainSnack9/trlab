import { useCallback, useEffect, useRef, useState } from 'react';
import { clearCollectedTrends as clearCollectedTrendsApi, collectSignals as collectSignalsApi, deleteChannelProfile as deleteChannelProfileApi, getChannelProfiles, getLatestSignals, getLatestTrendSnapshot, rankTrends, saveChannelProfile as saveChannelProfileApi } from '@/core/TrLab/modules/clients/api';
import { collectableSourceIds, initialSources, interestAreas, sourceNameById } from '@/core/TrLab/modules/configs/constants';
import { classifyText } from '@/core/TrLab/modules/helpers/utils';

export function useTrLabData() {
  const [sources, setSources] = useState(initialSources);
  const [signals, setSignals] = useState([]);
  const [rankedTrends, setRankedTrends] = useState([]);
  const [processingMeta, setProcessingMeta] = useState(null);
  const [channelProfiles, setChannelProfiles] = useState([]);
  const [signalSources, setSignalSources] = useState([]);
  const [signalStats, setSignalStats] = useState({ total: 0 });
  const [collectionRuns, setCollectionRuns] = useState([]);
  const [collectingSignals, setCollectingSignals] = useState(false);
  const [rankingLoading, setRankingLoading] = useState(true);
  const [collectError, setCollectError] = useState('');
  const [clearingCollection, setClearingCollection] = useState(false);
  const [sourceRunStates, setSourceRunStates] = useState({});
  const [timerEvents, setTimerEvents] = useState([]);
  const collectionClearedRef = useRef(false);
  const sourceRunStatesRef = useRef({});

  const loadLatestCollection = useCallback(async ({ force = false } = {}) => {
    if (collectionClearedRef.current && !force) return { signals: [], stats: { total: 0 }, sources: [], runs: [] };
    const data = await getLatestSignals();
    setSignals(data.signals ?? []);
    setSignalStats(data.stats ?? { total: data.signals?.length ?? 0 });
    setSignalSources(data.sources ?? []);
    setCollectionRuns(data.runs ?? []);
    return data;
  }, []);

  const loadLatestTrendSnapshot = useCallback(async ({ force = false } = {}) => {
    if (collectionClearedRef.current && !force) return { snapshot: null };
    setRankingLoading(true);
    try {
      const data = await getLatestTrendSnapshot();
      const snapshot = data.snapshot;
      if (snapshot) {
        setRankedTrends((snapshot.items ?? []).map(snapshotToTrend));
        setProcessingMeta({ processedAt: snapshot.createdAt, inputCount: snapshot.count, candidateCount: snapshot.count, verifiedCount: 0, reason: snapshot.reason, mode: 'snapshot', ai: { enabled: false, provider: '저장 스냅샷', analyzed: snapshot.count } });
      }
      return data;
    } finally {
      setRankingLoading(false);
    }
  }, []);

  const loadChannelProfiles = useCallback(async () => {
    const data = await getChannelProfiles();
    setChannelProfiles(data.profiles ?? []);
    return data;
  }, []);

  const refreshTrendRanking = useCallback(async () => {
    collectionClearedRef.current = false;
    setRankingLoading(true);
    setCollectError('');
    try {
      const data = await rankTrends();
      setRankedTrends(data.trends ?? []);
      setProcessingMeta({ processedAt: data.processedAt, inputCount: data.inputCount ?? 0, candidateCount: data.candidateCount ?? 0, verifiedCount: data.verifiedCount ?? 0, mode: 'live', ai: data.ai });
      return data;
    } catch (error) {
      setCollectError(error.message ?? 'AI 분석 중 오류가 발생했습니다.');
      throw error;
    } finally {
      setRankingLoading(false);
    }
  }, []);

  const collectSource = useCallback(async (sourceId, reason = 'manual', areas = [], profiles = []) => {
    const sourceName = sourceNameById[sourceId];
    if (!sourceName || sourceRunStatesRef.current[sourceId]) return;
    setSourceRunning(sourceRunStatesRef, setSourceRunStates, sourceId, true);
    try {
      collectionClearedRef.current = false;
      const data = await collectSignalsApi({ source: sourceId, reason, areas, profiles });
      await loadLatestCollection({ force: true });
      pushTimerEvent(setTimerEvents, { source: sourceName, count: data.sources?.[0]?.count ?? 0, reason });
    } catch (error) {
      pushTimerEvent(setTimerEvents, { source: sourceName, count: 0, reason: 'failed', error: error.message });
    } finally {
      setSourceRunning(sourceRunStatesRef, setSourceRunStates, sourceId, false);
    }
  }, [loadLatestCollection]);

  const collectSignals = useCallback(async ({ areas = [], profiles = [] } = {}) => {
    collectionClearedRef.current = false;
    setCollectingSignals(true);
    setCollectError('');
    try {
      await collectSignalsApi({ areas, profiles });
      await loadLatestCollection({ force: true });
    } catch (error) {
      setCollectError(error.message ?? '수집 중 오류가 발생했습니다.');
    } finally {
      setCollectingSignals(false);
    }
  }, [loadLatestCollection]);

  const saveChannelProfile = useCallback(async (profile) => {
    const data = await saveChannelProfileApi(profile);
    await loadChannelProfiles();
    return data.profile;
  }, [loadChannelProfiles]);

  const deleteChannelProfile = useCallback(async (id) => {
    await deleteChannelProfileApi(id);
    await loadChannelProfiles();
  }, [loadChannelProfiles]);

  const clearCollectedTrends = useCallback(async () => {
    setClearingCollection(true);
    collectionClearedRef.current = true;
    setSignals([]);
    setSignalStats({ total: 0 });
    setSignalSources([]);
    setCollectionRuns([]);
    setRankedTrends([]);
    setProcessingMeta(null);
    setCollectError('');
    setTimerEvents([]);
    try {
      await clearCollectedTrendsApi();
    } catch (error) {
      setCollectError(error.message ?? '초기화 중 오류가 발생했습니다.');
      throw error;
    } finally {
      setClearingCollection(false);
    }
  }, []);

  useEffect(() => { Promise.all([loadLatestCollection(), loadLatestTrendSnapshot(), loadChannelProfiles()]).catch(() => {}); }, [loadLatestCollection, loadLatestTrendSnapshot, loadChannelProfiles]);
  return { sources, setSources, signals, signalStats, rankedTrends, processingMeta, channelProfiles, signalSources, collectionRuns, collectingSignals, clearingCollection, rankingLoading, collectError, sourceRunStates, timerEvents, collectSource, collectSignals, clearCollectedTrends, refreshTrendRanking, saveChannelProfile, deleteChannelProfile, collectableSourceIds };
}

function snapshotToTrend(item) {
  const text = `${item.keyword ?? ''} ${(item.sampleTitles ?? []).join(' ')}`;
  const score = estimateSnapshotScore(item, text);
  return {
    ...item,
    id: item.id ?? `snapshot-${item.keyword}`,
    keyword: item.keyword,
    label: item.label ?? item.keyword,
    area: typeof item.area === 'object' ? item.area : areaFromSnapshot(item.area, text),
    score: item.score ?? score,
    mentions: item.mentions,
    sources: item.sources ?? [],
    sampleTitles: item.sampleTitles ?? [],
    production: item.production ?? { score, tier: score >= 82 ? '바로 제작' : score >= 65 ? '검증 후 제작' : '관찰', suggestedAngle: item.sampleTitles?.[0] ?? '' }
  };
}

function setSourceRunning(ref, setter, sourceId, running) {
  ref.current = { ...ref.current, [sourceId]: running };
  setter(ref.current);
}

function areaFromSnapshot(label, text) {
  return interestAreas.find((area) => area.label === label) ?? classifyText(`${label ?? ''} ${text}`);
}

function estimateSnapshotScore(item, text) {
  const sourceScore = Math.min(26, (item.sources?.length ?? 0) * 8);
  const mentionScore = Math.min(20, Math.max(0, item.mentions ?? 0) * 2);
  const titleScore = /전략|변화|이유|영향|미래|성장|확장|분석|비교/.test(text) ? 22 : 10;
  const noisePenalty = /ㅋㅋ|ㄷㄷ|실시간|명언|반응|제약|할인/.test(text) ? 14 : 0;
  return Math.max(35, Math.min(92, 30 + sourceScore + mentionScore + titleScore - noisePenalty));
}

function pushTimerEvent(setTimerEvents, event) {
  setTimerEvents((events) => [{ id: `${Date.now()}-${event.source}`, at: new Date().toLocaleTimeString('ko-KR'), ...event }, ...events].slice(0, 12));
}
