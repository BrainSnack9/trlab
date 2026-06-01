import { useCallback, useEffect, useRef, useState } from 'react';
import { collectSignals as collectSignalsApi, getLatestSignals, getLatestTrendSnapshot, rankTrends } from '@/core/TrLab/modules/clients/api';
import { collectableSourceIds, initialSources, interestAreas, sourceNameById } from '@/core/TrLab/modules/configs/constants';
import { classifyText } from '@/core/TrLab/modules/helpers/utils';

export function useTrLabData() {
  const [sources, setSources] = useState(initialSources);
  const [signals, setSignals] = useState([]);
  const [rankedTrends, setRankedTrends] = useState([]);
  const [processingMeta, setProcessingMeta] = useState(null);
  const [signalSources, setSignalSources] = useState([]);
  const [signalStats, setSignalStats] = useState({ total: 0 });
  const [collectionRuns, setCollectionRuns] = useState([]);
  const [collectingSignals, setCollectingSignals] = useState(false);
  const [rankingLoading, setRankingLoading] = useState(true);
  const [collectError, setCollectError] = useState('');
  const [sourceRunStates, setSourceRunStates] = useState({});
  const [timerEvents, setTimerEvents] = useState([]);
  const sourceRunStatesRef = useRef({});

  const loadLatestCollection = useCallback(async () => {
    const data = await getLatestSignals();
    setSignals(data.signals ?? []);
    setSignalStats(data.stats ?? { total: data.signals?.length ?? 0 });
    setSignalSources(data.sources ?? []);
    setCollectionRuns(data.runs ?? []);
    return data;
  }, []);

  const loadLatestTrendSnapshot = useCallback(async () => {
    setRankingLoading(true);
    try {
      const data = await getLatestTrendSnapshot();
      const snapshot = data.snapshot;
      setRankedTrends((snapshot?.items ?? []).map(snapshotToTrend));
      setProcessingMeta(snapshot ? { processedAt: snapshot.createdAt, inputCount: snapshot.count, candidateCount: snapshot.count, verifiedCount: 0, reason: snapshot.reason, mode: 'snapshot', ai: { enabled: false, provider: '저장 스냅샷', analyzed: snapshot.count } } : null);
      return data;
    } finally {
      setRankingLoading(false);
    }
  }, []);

  const refreshTrendRanking = useCallback(async () => {
    setRankingLoading(true);
    try {
      const data = await rankTrends();
      setRankedTrends(data.trends ?? []);
      setProcessingMeta({ processedAt: data.processedAt, inputCount: data.inputCount ?? 0, candidateCount: data.candidateCount ?? 0, verifiedCount: data.verifiedCount ?? 0, mode: 'live', ai: data.ai });
      return data;
    } finally {
      setRankingLoading(false);
    }
  }, []);

  const collectSource = useCallback(async (sourceId, reason = 'manual', areas = []) => {
    const sourceName = sourceNameById[sourceId];
    if (!sourceName || sourceRunStatesRef.current[sourceId]) return;
    setSourceRunning(sourceRunStatesRef, setSourceRunStates, sourceId, true);
    try {
      const data = await collectSignalsApi({ source: sourceId, reason, areas });
      await loadLatestCollection();
      pushTimerEvent(setTimerEvents, { source: sourceName, count: data.sources?.[0]?.count ?? 0, reason });
    } catch (error) {
      pushTimerEvent(setTimerEvents, { source: sourceName, count: 0, reason: 'failed', error: error.message });
    } finally {
      setSourceRunning(sourceRunStatesRef, setSourceRunStates, sourceId, false);
    }
  }, [loadLatestCollection]);

  const collectSignals = useCallback(async (areas = []) => {
    setCollectingSignals(true);
    setCollectError('');
    try {
      const data = await collectSignalsApi({ areas });
      await loadLatestCollection();
    } catch (error) {
      setCollectError(error.message ?? '수집 중 오류가 발생했습니다.');
    } finally {
      setCollectingSignals(false);
    }
  }, [loadLatestCollection]);

  useEffect(() => { Promise.all([loadLatestCollection(), loadLatestTrendSnapshot()]).catch(() => {}); }, [loadLatestCollection, loadLatestTrendSnapshot]);
  useEffect(() => {
    const refresh = () => Promise.all([loadLatestCollection(), loadLatestTrendSnapshot()]).catch(() => {});
    const timer = setInterval(refresh, 60000);
    const onVisible = () => { if (document.visibilityState === 'visible') refresh(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [loadLatestCollection, loadLatestTrendSnapshot]);
  return { sources, setSources, signals, signalStats, rankedTrends, processingMeta, signalSources, collectionRuns, collectingSignals, rankingLoading, collectError, sourceRunStates, timerEvents, collectSource, collectSignals, refreshTrendRanking, collectableSourceIds };
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
