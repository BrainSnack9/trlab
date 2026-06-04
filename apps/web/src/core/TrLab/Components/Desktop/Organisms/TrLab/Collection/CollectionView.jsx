import { useCallback, useEffect, useRef, useState } from 'react';
import { Activity, Clock3, Database, Eraser, PauseCircle, PlayCircle, RefreshCw, Rss, ServerCog } from 'lucide-react';
import { Button } from '@/core/TrLab/Components/Desktop/Atoms/TrLab/Common/Button/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/core/TrLab/Components/Desktop/Atoms/TrLab/Common/Card';
import { Badge } from '@/core/TrLab/Components/Desktop/Atoms/TrLab/Common/Badge/Badge';
import { PageHero } from '@/core/TrLab/Components/Desktop/Molecules/TrLab/Common';
import { CollectionTabs } from './CollectionTabs';
import { getCollectorRuntimeStatus, runCollectorRuntimeAction } from '@/core/TrLab/modules/clients/api';
import { formatTime } from '@/core/TrLab/modules/helpers/utils';

export function CollectionView(props) {
  const collector = useCollectorRuntime({
    onCollectionFinished: () => props.refreshCollection?.({ force: true, analysisDate: props.analysisDate })
  });

  return (
    <div className="space-y-5">
      <section>
        <PageHero title="수집 관리" description="자동 수집은 켜고 끄기만 간단하게, AI 분석은 트렌드 감지에서 수동으로 실행합니다." />
      </section>

      <section className="space-y-4">
        <AutomationPanel collector={collector} refreshCollection={props.refreshCollection} analysisDate={props.analysisDate} />
        <StoragePanel
          signals={props.signals}
          collectionRuns={props.collectionRuns}
          collectorEvents={collector.status?.events ?? []}
          clearCollectedTrends={props.clearCollectedTrends}
          clearingCollection={props.clearingCollection}
          canClear={Boolean(props.signals.length || props.rankedTrends.length)}
        />
      </section>

      <CollectionTabs {...props} />
    </div>
  );
}

function AutomationPanel({ collector, refreshCollection, analysisDate }) {
  const status = collector.status;
  const [intervalDraft, setIntervalDraft] = useState(status?.intervalMinutes ?? 30);
  const loading = collector.loading || status?.running;

  useEffect(() => {
    if (status?.intervalMinutes) setIntervalDraft(status.intervalMinutes);
  }, [status?.intervalMinutes]);

  const toggleAuto = async () => {
    if (status?.enabled) {
      await collector.action({ action: 'stop' });
      return;
    }
    await collector.action({ action: 'start', intervalMinutes: intervalDraft });
  };

  const collectNow = async () => {
    await collector.action({ action: 'collect-now', reason: 'manual-runtime' });
  };

  const refreshStatus = async () => {
    await collector.refresh();
    await refreshCollection?.({ force: true, analysisDate });
  };

  return (
    <Card>
      <CardHeader className="border-b">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ServerCog className="h-5 w-5 text-indigo-600" />
              자동 수집
            </CardTitle>
            <p className="mt-1 text-xs font-semibold text-muted-foreground">설정한 주기로 신호만 쌓습니다. 화면은 버튼을 눌렀을 때만 갱신됩니다.</p>
          </div>
          <StatusPill status={status} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-5">
        <div className="grid gap-3 md:grid-cols-3">
          <StateTile icon={Clock3} label="주기" value={`${status?.intervalMinutes ?? intervalDraft}분`} detail={status?.enabled ? '적용 중' : '시작 전'} />
          <StateTile icon={Activity} label="상태" value={status?.running ? '수집 중' : status?.enabled ? '예약됨' : '꺼짐'} detail={status?.nextRunAt ? `다음 ${formatTime(status.nextRunAt)}` : '다음 실행 없음'} tone={status?.running ? 'run' : status?.enabled ? 'good' : 'quiet'} />
          <StateTile icon={Rss} label="최근 결과" value={status?.lastRun ? `${status.lastRun.count ?? 0}건` : '-'} detail={status?.lastRun?.finishedAt ? formatTime(status.lastRun.finishedAt) : '아직 없음'} />
        </div>

        {status?.running ? <RunningBanner run={status.currentRun} /> : null}

        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
          <div className="grid gap-3 lg:grid-cols-[190px_minmax(0,1fr)] lg:items-end">
            <label className="block">
              <span className="text-xs font-black text-slate-500">수집 주기</span>
              <div className="mt-1 flex h-10 overflow-hidden rounded-md border bg-white">
                <input
                  className="min-w-0 flex-1 px-3 text-sm font-black outline-none"
                  type="number"
                  min={status?.minIntervalMinutes ?? 5}
                  max={status?.maxIntervalMinutes ?? 240}
                  value={intervalDraft}
                  onChange={(event) => setIntervalDraft(event.target.value)}
                  disabled={status?.enabled}
                />
                <span className="grid w-12 place-items-center border-l text-xs font-black text-slate-500">분</span>
              </div>
            </label>

            <div className="grid gap-2 sm:grid-cols-3">
              <Button onClick={toggleAuto} disabled={collector.loading}>
                {status?.enabled ? <PauseCircle className="h-4 w-4" /> : <PlayCircle className="h-4 w-4" />}
                {status?.enabled ? '자동 수집 끄기' : '자동 수집 켜기'}
              </Button>
              <Button variant="outline" onClick={collectNow} disabled={loading}>
                <RefreshCw className={status?.running ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
                지금 수집
              </Button>
              <Button variant="outline" onClick={refreshStatus} disabled={collector.loading}>
                <RefreshCw className="h-4 w-4" />
                상태 확인
              </Button>
            </div>
          </div>
          {status?.enabled ? <p className="mt-2 text-xs font-semibold text-slate-500">주기를 바꾸려면 자동 수집을 끈 뒤 다시 켜세요.</p> : null}
          {collector.error ? <p className="mt-2 text-xs font-bold text-red-600">{collector.error}</p> : null}
        </div>
      </CardContent>
    </Card>
  );
}

function StoragePanel({ signals, collectionRuns, collectorEvents, clearCollectedTrends, clearingCollection, canClear }) {
  const scheduledCount = collectionRuns.filter((run) => run.reason?.startsWith?.('scheduled-') || run.reason?.startsWith?.('scheduled-runtime')).length;
  const latestRun = collectionRuns[0];

  return (
    <Card>
      <CardHeader className="border-b">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5 text-indigo-600" />
            수집 로그
          </CardTitle>
          <Button variant="outline" size="sm" onClick={clearCollectedTrends} disabled={clearingCollection || !canClear}>
            <Eraser className="h-4 w-4" />
            {clearingCollection ? '비우는 중' : '데이터 비우기'}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-5">
        <div className="grid gap-2 text-xs md:grid-cols-4">
          <MiniStat label="저장 신호" value={signals.length} />
          <MiniStat label="수집 로그" value={collectionRuns.length} />
          <MiniStat label="정기 로그" value={scheduledCount} />
          <MiniStat label="마지막 수집" value={latestRun?.finishedAt ? formatTime(latestRun.finishedAt) : '-'} />
        </div>
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
          <RuntimeEventList events={collectorEvents} runs={collectionRuns} />
          <LatestRunCard run={latestRun} />
        </div>
      </CardContent>
    </Card>
  );
}

function useCollectorRuntime({ onCollectionFinished } = {}) {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const runningRef = useRef(false);
  const finishedRef = useRef(onCollectionFinished);

  useEffect(() => {
    finishedRef.current = onCollectionFinished;
  }, [onCollectionFinished]);

  const applyStatus = useCallback(async (data) => {
    const wasRunning = runningRef.current;
    runningRef.current = Boolean(data?.running);
    setStatus(data);
    if (wasRunning && !data?.running) await finishedRef.current?.(data);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const data = await getCollectorRuntimeStatus();
      await applyStatus(data);
      setError('');
      return data;
    } catch (err) {
      setError(err.message);
      return null;
    }
  }, [applyStatus]);

  useEffect(() => {
    let alive = true;
    getCollectorRuntimeStatus()
      .then((data) => {
        if (alive) applyStatus(data);
      })
      .catch((err) => {
        if (alive) setError(err.message);
      });
    return () => {
      alive = false;
    };
  }, [applyStatus]);

  useEffect(() => {
    if (!status?.running) return undefined;
    let alive = true;
    const interval = window.setInterval(() => {
      getCollectorRuntimeStatus()
        .then((data) => {
          if (alive) applyStatus(data);
        })
        .catch((err) => {
          if (alive) setError(err.message);
        });
    }, 1000);
    return () => {
      alive = false;
      window.clearInterval(interval);
    };
  }, [applyStatus, status?.running]);

  const action = async (payload) => {
    setLoading(true);
    try {
      const data = await runCollectorRuntimeAction(payload);
      await applyStatus(data);
      setError('');
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { status, loading, error, refresh, action };
}

function StatusPill({ status }) {
  const tone = status?.running ? 'border-indigo-200 bg-indigo-50 text-indigo-700' : status?.enabled ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-50 text-slate-600';
  const label = status?.running ? '수집 중' : status?.enabled ? '켜짐' : '꺼짐';
  return <span className={`rounded-full border px-3 py-1 text-xs font-black ${tone}`}>{label}</span>;
}

function RunningBanner({ run }) {
  return (
    <div className="rounded-lg border border-indigo-100 bg-indigo-50 p-3">
      <div className="flex items-center gap-2 text-sm font-black text-indigo-900">
        <RefreshCw className="h-4 w-4 animate-spin" />
        수집이 진행 중입니다
      </div>
      <p className="mt-1 text-xs font-semibold text-indigo-800">{run?.reason ?? 'runtime'} · {run?.startedAt ? formatTime(run.startedAt) : '방금 시작'}</p>
    </div>
  );
}

function StateTile({ icon: Icon, label, value, detail, tone = 'quiet' }) {
  const tones = {
    good: 'border-emerald-100 bg-emerald-50 text-emerald-800',
    run: 'border-indigo-100 bg-indigo-50 text-indigo-800',
    quiet: 'border-slate-200 bg-white text-slate-900'
  };
  return (
    <div className={`rounded-lg border p-3 ${tones[tone] ?? tones.quiet}`}>
      <div className="flex items-center gap-2 text-xs font-black opacity-80">
        <Icon className="h-4 w-4" />
        {label}
      </div>
      <strong className="mt-3 block text-lg font-black leading-none">{value}</strong>
      <span className="mt-2 block truncate text-[11px] font-semibold opacity-70">{detail}</span>
    </div>
  );
}

function MiniStat({ label, value }) {
  return (
    <span className="rounded-md border bg-slate-50 p-3">
      <span className="block text-[11px] font-black text-slate-500">{label}</span>
      <b className="mt-1 block text-lg font-black leading-none text-slate-950">{value}</b>
    </span>
  );
}

function LatestRunCard({ run }) {
  return (
    <div className="rounded-lg border bg-slate-50 p-3">
      <div className="text-xs font-black text-slate-500">최근 저장된 수집 로그</div>
      {run ? (
        <div className="mt-3 space-y-2 text-sm">
          <div className="flex items-center justify-between gap-2">
            <strong className="truncate text-slate-950">{run.source}</strong>
            <Badge variant={run.status === 'ok' ? 'default' : 'destructive'}>{run.status}</Badge>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <span className="rounded-md bg-white p-2">수집 <b>{run.count ?? 0}건</b></span>
            <span className="rounded-md bg-white p-2">이유 <b>{run.reason ?? '-'}</b></span>
          </div>
          <p className="text-xs font-semibold text-muted-foreground">{formatTime(run.finishedAt)}</p>
        </div>
      ) : (
        <p className="mt-3 text-sm font-semibold text-muted-foreground">아직 저장된 수집 로그가 없습니다.</p>
      )}
    </div>
  );
}

function RuntimeEventList({ events, runs }) {
  const persistedEvents = runsToEvents(runs);
  const displayEvents = events.length ? mergeRuntimeAndPersistedEvents(events, persistedEvents) : persistedEvents;

  return (
    <div className="rounded-lg border bg-white p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-xs font-black text-slate-600">최근 수집 이벤트</span>
        <Badge variant="secondary">{displayEvents.length}건</Badge>
      </div>
      <div className="max-h-[250px] space-y-2 overflow-y-auto pr-1">
        {displayEvents.length ? displayEvents.map((event) => (
          <div key={event.id} className="grid gap-2 rounded-md bg-slate-50 px-3 py-2 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-black text-slate-900">{eventLabel(event)}</span>
              <span className="text-xs font-bold text-muted-foreground">{formatTime(event.at)}</span>
            </div>
            <div className="flex flex-wrap gap-1.5 text-xs">
              <Badge variant={event.status === 'failed' ? 'destructive' : event.status === 'running' ? 'default' : 'outline'}>{event.status}</Badge>
              {Number.isFinite(event.count) ? <Badge variant="secondary">{event.count}건</Badge> : null}
              {Number.isFinite(event.channels) ? <Badge variant="outline">채널 {event.channels}</Badge> : null}
              {Number.isFinite(event.ok) ? <Badge variant="outline">성공 {event.ok}</Badge> : null}
              {Number.isFinite(event.failed) ? <Badge variant="outline">실패 {event.failed}</Badge> : null}
            </div>
          </div>
        )) : <div className="rounded-md border border-dashed bg-slate-50 p-3 text-sm text-muted-foreground">자동 수집을 켜거나 지금 수집을 누르면 여기에 기록됩니다.</div>}
      </div>
    </div>
  );
}

function eventLabel(event) {
  return {
    'scheduler-started': '자동 수집 켜짐',
    'scheduler-stopped': '자동 수집 꺼짐',
    'scheduler-configured': '수집 주기 변경',
    'collect-started': '수집 시작',
    'collect-fetching': '신호 수집 중',
    'collect-saving': '저장 중',
    'collect-saved': '저장 완료',
    'collect-finished': '수집 완료',
    'collect-persisted': '저장된 수집 완료',
    'collect-failed': '수집 실패',
    'collect-skipped': '이미 수집 중'
  }[event.type] ?? event.message ?? event.type;
}

function runsToEvents(runs = []) {
  const grouped = new Map();
  runs.forEach((run) => {
    const key = `${run.startedAt ?? ''}-${run.finishedAt ?? ''}-${run.reason ?? ''}`;
    const previous = grouped.get(key) ?? {
      id: `persisted-${key}`,
      type: 'collect-persisted',
      status: 'ok',
      reason: run.reason,
      startedAt: run.startedAt,
      finishedAt: run.finishedAt,
      at: run.finishedAt ?? run.startedAt,
      count: 0,
      channels: 0,
      ok: 0,
      failed: 0
    };
    previous.count += Number(run.count ?? 0);
    previous.channels += 1;
    if (run.status === 'ok') previous.ok += 1;
    else previous.failed += 1;
    if (run.status !== 'ok') previous.status = 'failed';
    grouped.set(key, previous);
  });
  return [...grouped.values()]
    .sort((a, b) => new Date(b.at ?? 0) - new Date(a.at ?? 0))
    .slice(0, 12);
}

function mergeRuntimeAndPersistedEvents(events, persistedEvents) {
  const merged = [...events, ...persistedEvents];
  const seen = new Set();
  return merged
    .filter((event) => {
      const timeKey = event.startedAt && event.finishedAt ? `${event.startedAt}-${event.finishedAt}-${event.reason ?? ''}` : event.id;
      if (seen.has(timeKey)) return false;
      seen.add(timeKey);
      return true;
    })
    .sort((a, b) => new Date(b.at ?? b.finishedAt ?? 0) - new Date(a.at ?? a.finishedAt ?? 0))
    .slice(0, 12);
}
