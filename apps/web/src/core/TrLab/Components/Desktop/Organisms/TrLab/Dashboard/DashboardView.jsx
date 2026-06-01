import { useMemo } from 'react';
import { ListChecks, Radar } from 'lucide-react';
import { Badge } from '@/core/TrLab/Components/Desktop/Atoms/TrLab/Common/Badge/Badge';
import { Button } from '@/core/TrLab/Components/Desktop/Atoms/TrLab/Common/Button/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/core/TrLab/Components/Desktop/Atoms/TrLab/Common/Card';
import { defaultExcludedAreas, defaultSelectedAreas } from '@/core/TrLab/modules/configs/constants';
import { isSignalVisible, isTrendVisible, trendToRadarItem } from '@/core/TrLab/modules/helpers/utils';
import { PageHero } from '@/core/TrLab/Components/Desktop/Molecules/TrLab/Common';
import { CandidateBoard, ScopeFilter, TrendProcessingStatus } from './DashboardWidgets';

export function DashboardView(props) {
  const selectedSet = useMemo(() => new Set(props.selectedAreas), [props.selectedAreas]);
  const excludedSet = useMemo(() => new Set(props.excludedAreas), [props.excludedAreas]);
  const visibleSignals = useMemo(() => props.signals.filter((s) => isSignalVisible(s, selectedSet, excludedSet)), [props.signals, selectedSet, excludedSet]);
  const candidates = useMemo(() => props.rankedTrends.filter((t) => isTrendVisible(t, selectedSet, excludedSet)), [props.rankedTrends, selectedSet, excludedSet]);
  const radarItems = useMemo(() => candidates.slice(0, 8).map(trendToRadarItem), [candidates]);
  const resetScope = () => {
    props.setSelectedAreas(defaultSelectedAreas);
    props.setExcludedAreas(defaultExcludedAreas);
  };

  return (
    <div className="space-y-5">
      <AnalysisOverlay show={props.rankingLoading} />
      <section className="grid gap-4 md:grid-cols-[minmax(0,1fr)_360px] md:items-end">
        <PageHero title="트렌드 감지" description="수집된 신호를 교차검증하고 카드뉴스로 만들 만한 주제를 우선 정렬합니다." />
        <SignalSummary
          total={props.signalStats?.total ?? props.signals.length}
          visible={visibleSignals.length}
          candidates={props.rankingLoading ? '...' : candidates.length}
        />
      </section>
      <TrendProcessingStatus meta={props.processingMeta} trends={candidates} loading={props.rankingLoading} onRefresh={props.refreshTrendRanking} onCollect={props.onCollectSignals} collecting={props.collectingSignals} />
      <section className="grid gap-5 md:grid-cols-[minmax(0,1fr)_300px] xl:grid-cols-[minmax(0,1fr)_380px]">
        <RadarPanel {...props} items={radarItems} loading={props.rankingLoading} />
        <RecommendedPanel items={radarItems} chooseTrend={props.chooseTrend} />
      </section>
      <CandidateBoard candidates={candidates} chooseTrend={props.chooseTrend} />
      <ScopeFilter {...props} selectedSet={selectedSet} excludedSet={excludedSet} reset={resetScope} />
      <MovementRanking items={radarItems} chooseTrend={props.chooseTrend} />
    </div>
  );
}

function AnalysisOverlay({ show }) {
  if (!show) return null;
  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-slate-950/35 px-4 backdrop-blur-[2px]">
      <div className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-5 text-center shadow-xl">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-indigo-600" />
        <h2 className="mt-4 text-lg font-black text-slate-950">AI 분석 중</h2>
        <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">수집된 신호를 콘텐츠 후보로 재정렬하고 있습니다.</p>
      </div>
    </div>
  );
}

function SignalSummary({ total, visible, candidates }) {
  const items = [
    ['전체 신호', total],
    ['표시 신호', visible],
    ['제작 후보', candidates]
  ];

  return (
    <aside className="rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
      <div className="grid grid-cols-3 divide-x divide-slate-200 overflow-hidden rounded-md bg-slate-50">
        {items.map(([label, value]) => (
          <div key={label} className="min-w-0 px-3 py-3 text-center">
            <span className="block truncate text-[11px] font-black text-slate-500">{label}</span>
            <strong className="mt-1 block text-xl font-black leading-none text-slate-950">{value}</strong>
          </div>
        ))}
      </div>
    </aside>
  );
}

function RadarPanel({ items, chooseTrend, loading }) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex-row items-center justify-between border-b bg-white"><div><CardDescription>Production Radar</CardDescription><CardTitle className="flex items-center gap-2"><Radar className="h-5 w-5 text-indigo-600" />제작 후보 레이더</CardTitle></div><Badge variant="outline" className="text-slate-600">콘텐츠화 점수</Badge></CardHeader>
      <CardContent className="relative h-[500px] overflow-hidden bg-[radial-gradient(circle_at_30%_20%,rgba(79,70,229,.12),transparent_28%),linear-gradient(rgba(99,102,241,.08)_1px,transparent_1px),linear-gradient(90deg,rgba(99,102,241,.08)_1px,transparent_1px)] bg-[size:auto,42px_42px,42px_42px]">
        {!items.length ? <EmptyRadar loading={loading} /> : items.map((item) => (
          <button key={item.id} className="absolute grid place-items-center rounded-full border-4 border-white text-white shadow-xl transition hover:z-30 hover:scale-105" style={{ left: `${item.x}%`, top: `${item.y}%`, width: item.size, height: item.size, zIndex: 20 - item.rank, transform: 'translate(-50%, -50%)', background: item.color }} onClick={() => chooseTrend(item)}>
            <span className="text-xs font-black">#{item.rank}</span>{item.size > 76 && <strong className="line-clamp-2 max-w-[72%] text-center text-xs font-black leading-tight">{item.label}</strong>}<small className="font-black">{item.production?.score ?? item.score}</small>
          </button>
        ))}
      </CardContent>
    </Card>
  );
}

function EmptyRadar({ loading }) {
  const title = loading ? '랭킹을 계산하는 중입니다' : '아직 레이더에 올릴 후보가 없습니다';
  const body = loading ? '수집 신호를 묶고 검색 검증 점수를 반영하고 있습니다.' : '트렌드 수집 후 AI 분석을 실행하면 제작 후보가 표시됩니다.';
  return <div className="absolute inset-0 grid place-items-center p-6 text-center"><div className="max-w-sm rounded-lg border border-dashed bg-white/90 p-6 shadow-sm"><Radar className="mx-auto h-8 w-8 text-indigo-600" /><h3 className="mt-3 text-lg font-black">{title}</h3><p className="mt-2 text-sm text-muted-foreground">{body}</p></div></div>;
}

function RecommendedPanel({ items, chooseTrend }) {
  return (
    <Card><CardHeader><CardDescription>Action Queue</CardDescription><CardTitle className="flex items-center gap-2"><ListChecks className="h-5 w-5 text-indigo-600" />먼저 검증할 후보</CardTitle></CardHeader>
      <CardContent className="max-h-[438px] space-y-2 overflow-auto">{items.slice(0, 5).map((item) => <Button key={item.id} variant="secondary" className="h-auto w-full justify-start p-3" onClick={() => chooseTrend(item)}><Badge variant="outline">{item.rank}</Badge><span className="flex-1 text-left"><span className="block font-bold">{item.label}</span><span className="block text-xs text-muted-foreground">{item.category} · {item.production?.tier ?? '검증'}</span></span><ScoreChip score={item.production?.score ?? item.score} /></Button>)}{!items.length && <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">랭킹 계산이 끝나면 우선 검증 후보가 표시됩니다.</p>}</CardContent>
    </Card>
  );
}

function MovementRanking({ items, chooseTrend }) {
  return <Card><CardHeader className="border-b"><CardDescription>Movement Ranking</CardDescription><CardTitle>제작 후보 순위</CardTitle></CardHeader><CardContent className="grid gap-2 pt-5 lg:grid-cols-2">{items.map((item) => <Button key={item.id} variant="secondary" className="h-auto justify-start p-3" onClick={() => chooseTrend(item)}><Badge variant="outline">{item.rank}</Badge><span className="flex-1 text-left"><strong className="block">{item.label}</strong><small className="text-muted-foreground">{item.category} · {item.production?.tier ?? item.intent}</small></span><ScoreChip score={item.production?.score ?? item.score} /></Button>)}</CardContent></Card>;
}

function ScoreChip({ score }) {
  const className = score >= 82
    ? 'border-emerald-200 bg-emerald-50/70 text-emerald-700'
    : score >= 66
      ? 'border-amber-200 bg-amber-50/70 text-amber-700'
      : 'border-slate-200 bg-slate-50 text-slate-700';
  return <Badge variant="outline" className={`min-w-10 justify-center ${className}`}>{score}</Badge>;
}
