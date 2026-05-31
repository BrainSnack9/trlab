import { useMemo } from 'react';
import { ListChecks, Radar } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { defaultExcludedAreas, defaultSelectedAreas } from '../constants';
import { isSignalVisible, isTrendVisible, trendToRadarItem } from '../utils';
import { Metric, PageHero } from '../components/Common';
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
      <section className="grid gap-4 md:grid-cols-[minmax(0,1fr)_360px] md:items-end">
        <PageHero label="Trend Command Center" title="실시간 신호를 제작 후보로 정제" description="수집된 신호를 교차검증하고 카드뉴스로 만들 만한 주제를 우선 정렬합니다." />
        <div className="grid grid-cols-3 gap-2"><Metric label="전체 신호" value={props.signalStats?.total ?? props.signals.length} /><Metric label="표시 신호" value={visibleSignals.length} /><Metric label="제작 후보" value={props.rankingLoading ? '...' : candidates.length} /></div>
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

function RadarPanel({ items, chooseTrend, onCollectSignals, collectingSignals, loading }) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex-row items-center justify-between border-b bg-white"><div><CardDescription>Production Radar</CardDescription><CardTitle className="flex items-center gap-2"><Radar className="h-5 w-5 text-indigo-600" />제작 후보 레이더</CardTitle></div><Badge className="bg-indigo-600">콘텐츠화 점수</Badge></CardHeader>
      <CardContent className="relative h-[500px] overflow-hidden bg-[radial-gradient(circle_at_30%_20%,rgba(79,70,229,.12),transparent_28%),linear-gradient(rgba(99,102,241,.08)_1px,transparent_1px),linear-gradient(90deg,rgba(99,102,241,.08)_1px,transparent_1px)] bg-[size:auto,42px_42px,42px_42px]">
        {!items.length ? <EmptyRadar onCollectSignals={onCollectSignals} collectingSignals={collectingSignals} loading={loading} /> : items.map((item) => (
          <button key={item.id} className="absolute grid place-items-center rounded-full border-4 border-white text-white shadow-xl transition hover:z-30 hover:scale-105" style={{ left: `${item.x}%`, top: `${item.y}%`, width: item.size, height: item.size, zIndex: 20 - item.rank, transform: 'translate(-50%, -50%)', background: item.color }} onClick={() => chooseTrend(item)}>
            <span className="text-xs font-black">#{item.rank}</span>{item.size > 76 && <strong className="line-clamp-2 max-w-[72%] text-center text-xs font-black leading-tight">{item.label}</strong>}<small className="font-black">{item.production?.score ?? item.score}</small>
          </button>
        ))}
      </CardContent>
    </Card>
  );
}

function EmptyRadar({ onCollectSignals, collectingSignals, loading }) {
  const title = loading ? '랭킹을 계산하는 중입니다' : '아직 레이더에 올릴 후보가 없습니다';
  const body = loading ? '수집 신호를 묶고 검색 검증 점수를 반영하고 있습니다.' : '시그널을 수집하면 제작 적합도가 높은 후보가 표시됩니다.';
  return <div className="absolute inset-0 grid place-items-center p-6 text-center"><div className="max-w-sm rounded-lg border border-dashed bg-white/90 p-6 shadow-sm"><Radar className="mx-auto h-8 w-8 text-indigo-600" /><h3 className="mt-3 text-lg font-black">{title}</h3><p className="mt-2 text-sm text-muted-foreground">{body}</p>{!loading && <Button className="mt-4" onClick={onCollectSignals} disabled={collectingSignals}>{collectingSignals ? '수집 중' : '시그널 수집'}</Button>}</div></div>;
}

function RecommendedPanel({ items, chooseTrend }) {
  return (
    <Card><CardHeader><CardDescription>Action Queue</CardDescription><CardTitle className="flex items-center gap-2"><ListChecks className="h-5 w-5 text-indigo-600" />먼저 검증할 후보</CardTitle></CardHeader>
      <CardContent className="max-h-[438px] space-y-2 overflow-auto">{items.slice(0, 5).map((item) => <Button key={item.id} variant="secondary" className="h-auto w-full justify-start p-3" onClick={() => chooseTrend(item)}><Badge variant="outline">{item.rank}</Badge><span className="text-left"><span className="block font-bold">{item.label}</span><span className="block text-xs text-muted-foreground">{item.category} · 제작 {item.production?.score ?? item.score} · {item.production?.tier ?? '검증'}</span></span></Button>)}{!items.length && <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">랭킹 계산이 끝나면 우선 검증 후보가 표시됩니다.</p>}</CardContent>
    </Card>
  );
}

function MovementRanking({ items, chooseTrend }) {
  return <Card><CardHeader className="border-b"><CardDescription>Movement Ranking</CardDescription><CardTitle>제작 후보 순위</CardTitle></CardHeader><CardContent className="grid gap-2 pt-5 lg:grid-cols-2">{items.map((item) => <Button key={item.id} variant="secondary" className="h-auto justify-start p-3" onClick={() => chooseTrend(item)}><Badge variant="outline">{item.rank}</Badge><span className="flex-1 text-left"><strong className="block">{item.label}</strong><small className="text-muted-foreground">{item.category} · {item.production?.tier ?? item.intent}</small></span><Badge>{item.production?.score ?? item.score}</Badge></Button>)}</CardContent></Card>;
}
