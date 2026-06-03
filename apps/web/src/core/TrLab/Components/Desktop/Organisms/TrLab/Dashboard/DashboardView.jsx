import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, FileText } from 'lucide-react';
import { Badge } from '@/core/TrLab/Components/Desktop/Atoms/TrLab/Common/Badge/Badge';
import { Button } from '@/core/TrLab/Components/Desktop/Atoms/TrLab/Common/Button/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/core/TrLab/Components/Desktop/Atoms/TrLab/Common/Card';
import { defaultExcludedAreas, defaultSelectedAreas } from '@/core/TrLab/modules/configs/constants';
import { isSignalVisible, isTrendVisible } from '@/core/TrLab/modules/helpers/utils';
import { PageHero } from '@/core/TrLab/Components/Desktop/Molecules/TrLab/Common';
import { CandidateBoard, ScopeFilter, TrendProcessingStatus } from './DashboardWidgets';
import { getSignalDateSummary } from '@/core/TrLab/modules/clients/api';

export function DashboardView(props) {
  const selectedSet = useMemo(() => new Set(props.selectedAreas), [props.selectedAreas]);
  const excludedSet = useMemo(() => new Set(props.excludedAreas), [props.excludedAreas]);
  const selectedProfileSet = useMemo(() => new Set(props.selectedChannelProfiles ?? []), [props.selectedChannelProfiles]);
  const visibleSignals = useMemo(() => props.signals.filter((s) => isSignalVisible(s, selectedSet, excludedSet)), [props.signals, selectedSet, excludedSet]);
  const candidates = useMemo(() => props.rankedTrends
    .filter((t) => isTrendVisible(t, selectedSet, excludedSet))
    .filter((t) => isProfileVisible(t, selectedProfileSet)), [props.rankedTrends, selectedSet, excludedSet, selectedProfileSet]);
  const [selectedCandidateId, setSelectedCandidateId] = useState('');
  const selectedCandidate = useMemo(() => candidates.find((candidate) => getCandidateId(candidate) === selectedCandidateId) ?? candidates[0], [candidates, selectedCandidateId]);
  const resetScope = () => {
    props.setSelectedChannelProfiles(props.channelProfiles?.filter((profile) => profile.enabled !== false).map((profile) => profile.id) ?? []);
    props.setSelectedAreas(defaultSelectedAreas);
    props.setExcludedAreas(defaultExcludedAreas);
  };

  useEffect(() => {
    if (!candidates.length) {
      setSelectedCandidateId('');
      return;
    }
    if (!selectedCandidateId || !candidates.some((candidate) => getCandidateId(candidate) === selectedCandidateId)) {
      setSelectedCandidateId(getCandidateId(candidates[0]));
    }
  }, [candidates, selectedCandidateId]);

  return (
    <div className="space-y-5">
      <AnalysisOverlay show={props.rankingLoading} />
      <section className="grid gap-4 md:grid-cols-[minmax(0,1fr)_360px] md:items-end">
        <PageHero title="트렌드 감지" description="수집은 통합으로 실행하고, 결과는 계정 프로필 기준으로 나눠 봅니다." />
        <SignalSummary
          total={props.signalStats?.total ?? props.signals.length}
          visible={visibleSignals.length}
          candidates={props.rankingLoading ? '...' : candidates.length}
        />
      </section>
      <AnalysisDatePicker analysisDate={props.analysisDate} setAnalysisDate={props.setAnalysisDate} meta={props.processingMeta} />
      <TrendProcessingStatus meta={props.processingMeta} trends={candidates} loading={props.rankingLoading} onRefresh={props.refreshTrendRanking} onCollect={props.onCollectSignals} onClear={props.clearCollectedTrends} collecting={props.collectingSignals} clearing={props.clearingCollection} hasSignals={Boolean(props.signals.length)} />
      <ScopeFilter {...props} selectedSet={selectedSet} excludedSet={excludedSet} reset={resetScope} />
      <section className="grid items-stretch gap-5 md:h-[calc(100vh-220px)] md:min-h-[720px] md:grid-cols-[minmax(0,1fr)_300px] xl:grid-cols-[minmax(0,1fr)_380px]">
        <CandidateBoard candidates={candidates} selectedCandidate={selectedCandidate} onSelectCandidate={(candidate) => setSelectedCandidateId(getCandidateId(candidate))} />
        <CandidateDetailPanel candidate={selectedCandidate} chooseTrend={props.chooseTrend} loading={props.rankingLoading} />
      </section>
    </div>
  );
}

function AnalysisDatePicker({ analysisDate, setAnalysisDate, meta }) {
  const dates = useMemo(() => recentKstDates(7), []);
  const selected = analysisDate || dates[0]?.id;
  const [summary, setSummary] = useState({});
  const [summaryLoading, setSummaryLoading] = useState(false);
  const windowLabel = meta?.analysisWindow?.date === selected
    ? meta?.analysisWindow?.label
    : `${selected} 05:00 KST`;

  const refreshSummary = async () => {
    setSummaryLoading(true);
    try {
      const data = await getSignalDateSummary(dates.map((item) => item.id));
      setSummary(Object.fromEntries((data.summaries ?? []).map((item) => [item.date, item])));
    } finally {
      setSummaryLoading(false);
    }
  };

  useEffect(() => {
    refreshSummary().catch(() => {});
  }, []);

  const selectedCount = summary[selected]?.count ?? 0;

  return (
    <Card className="bg-white">
      <CardContent className="grid gap-3 p-4 lg:grid-cols-[1fr_auto] lg:items-center">
        <div>
          <div className="flex items-center gap-2 text-sm font-black text-slate-950">
            <CalendarDays className="h-4 w-4 text-indigo-600" />
            분석 기준일
          </div>
          <p className="mt-1 text-xs font-semibold text-muted-foreground">선택한 날짜의 05:00 KST부터 다음날 05:00 KST 전까지 수집된 신호만 AI 분석에 사용합니다.</p>
          <div className="mt-2 flex flex-wrap gap-2 text-xs font-bold text-slate-500">
            <span>현재 기준: {windowLabel}</span>
            <span>분석 가능 신호: {summaryLoading ? '확인 중' : `${selectedCount}건`}</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {dates.map((item) => (
            <Button key={item.id} size="sm" variant={selected === item.id ? 'default' : 'outline'} onClick={() => setAnalysisDate(item.id)}>
              {item.label} {formatCount(summary[item.id]?.count)}
            </Button>
          ))}
          <input
            className="h-9 rounded-md border bg-white px-2 text-sm font-bold outline-none focus:border-indigo-300"
            type="date"
            value={selected}
            onChange={(event) => {
              setAnalysisDate(event.target.value);
              if (!summary[event.target.value]) {
                getSignalDateSummary([event.target.value]).then((data) => {
                  setSummary((current) => ({ ...current, ...Object.fromEntries((data.summaries ?? []).map((item) => [item.date, item])) }));
                }).catch(() => {});
              }
            }}
          />
          <Button size="sm" variant="outline" onClick={refreshSummary} disabled={summaryLoading}>개수 확인</Button>
        </div>
      </CardContent>
    </Card>
  );
}

function formatCount(value) {
  if (!Number.isFinite(value)) return '';
  return `· ${value}건`;
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

function CandidateDetailPanel({ candidate, chooseTrend, loading }) {
  const evidence = getCandidateEvidence(candidate);
  const score = candidate?.production?.score ?? candidate?.score ?? 0;
  const profile = candidate?.channelFit?.bestProfile;
  const ai = candidate?.aiAnalysis;
  const contentIdeas = getContentIdeas(candidate);

  return (
    <Card className="flex h-full min-h-0 flex-col">
      <CardHeader className="border-b"><CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5 text-indigo-600" />후보 상세</CardTitle></CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden pt-5">
        {!candidate ? (
          <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">{loading ? '후보를 정리하는 중입니다.' : '제작 후보를 선택하면 상세 내용이 표시됩니다.'}</p>
        ) : <>
          <div className="rounded-md border bg-slate-50 p-3">
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge variant="secondary">{candidate.area?.label ?? '영역 미분류'}</Badge>
              {profile && <Badge variant="outline">{profile.label}</Badge>}
              <Badge variant="outline">{candidate.production?.tier ?? '검증'}</Badge>
            </div>
            <h3 className="mt-3 text-xl font-black leading-tight text-slate-950">{candidate.keyword ?? candidate.label}</h3>
            <p className="mt-2 text-sm font-bold leading-6 text-slate-700">{candidate.production?.suggestedAngle ?? candidate.contentAngle ?? '분석 각도를 확인 중입니다.'}</p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <DetailMetric label="점수" value={score} />
            <DetailMetric label="언급" value={candidate.mentions} />
            <DetailMetric label="출처" value={candidate.sources?.length ?? 0} />
          </div>
          {contentIdeas.length ? <div className="rounded-md border border-indigo-100 bg-indigo-50 p-3">
            <div className="text-xs font-black text-indigo-700">콘텐츠 제목 후보</div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {contentIdeas.map((idea) => <Badge key={idea} variant="outline">{idea}</Badge>)}
            </div>
          </div> : null}
          {ai && <div className="rounded-md border border-slate-100 bg-slate-50 p-3">
            <div className="text-xs font-black text-slate-600">키워드 검증 판단</div>
            <p className="mt-1 text-sm font-bold leading-6 text-indigo-950">{ai.angle ?? ai.summary ?? ai.reason ?? 'AI 분석 결과가 반영된 후보입니다.'}</p>
          </div>}
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="text-sm font-black text-slate-700">근거 게시글과 신호</div>
              <Badge variant="secondary">{evidence.length}개</Badge>
            </div>
            <div className="min-h-[220px] flex-1 space-y-2 overflow-auto pr-1">
              {evidence.map((item, index) => (
                <article key={`${item.source}-${index}-${item.title}`} className="rounded-md border bg-slate-50 p-3">
                  <div className="mb-1 flex flex-wrap items-center gap-1.5">
                    <Badge variant="outline">{item.source || '출처'}</Badge>
                    {item.metric && <Badge variant="secondary">{item.metric}</Badge>}
                  </div>
                  {item.url ? (
                    <a href={item.url} target="_blank" rel="noreferrer" className="line-clamp-2 text-sm font-bold leading-5 text-slate-900 hover:text-indigo-700">{item.title}</a>
                  ) : (
                    <p className="line-clamp-2 text-sm font-bold leading-5 text-slate-900">{item.title}</p>
                  )}
                </article>
              ))}
              {!evidence.length && <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">이 후보에 연결된 근거가 아직 없습니다.</p>}
            </div>
          </div>
          <Button className="w-full min-h-[42px]" onClick={() => chooseTrend(candidate)}>제목 후보 선택하러 가기</Button>
        </>}
      </CardContent>
    </Card>
  );
}

function getContentIdeas(candidate) {
  return [...new Set([
    ...(candidate?.contentIdeas ?? []),
    ...(candidate?.aiAnalysis?.contentIdeas ?? [])
  ].filter(Boolean))].slice(0, 6);
}

function isProfileVisible(candidate, selectedProfileSet) {
  if (!selectedProfileSet?.size) return true;
  const bestId = candidate?.channelFit?.bestProfile?.id;
  const profileIds = (candidate?.channelFit?.profiles ?? []).map((profile) => profile.id);
  return (bestId && selectedProfileSet.has(bestId)) || profileIds.some((id) => selectedProfileSet.has(id));
}

function DetailMetric({ label, value }) {
  return (
    <span className="rounded-md border border-slate-100 bg-slate-50 px-2 py-2">
      <span className="block text-[10px] font-black text-slate-500">{label}</span>
      <b className="mt-1 block text-base font-black leading-none text-slate-900">{value ?? 0}</b>
    </span>
  );
}

function getCandidateEvidence(candidate) {
  if (!candidate) return [];
  const seen = new Set();
  const evidenceItems = (candidate.evidence ?? []).map((item) => ({
    source: item.source,
    title: item.title,
    url: item.url,
    metric: item.metric
  }));
  const sampleItems = (candidate.sampleTitles ?? []).map((title, index) => ({
    source: candidate.sources?.[index] ?? '관련 제목',
    title,
    url: ''
  }));

  return [...evidenceItems, ...sampleItems]
    .filter((item) => {
      if (!item.title) return false;
      const key = `${item.source ?? ''}:${item.title}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function getCandidateId(candidate) {
  return candidate?.id ?? `${candidate?.keyword ?? candidate?.label ?? ''}`;
}

function recentKstDates(count) {
  const today = new Date(Date.now() + 9 * 60 * 60 * 1000);
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - index));
    const id = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
    return {
      id,
      label: index === 0 ? '오늘' : index === 1 ? '어제' : `${date.getUTCMonth() + 1}/${date.getUTCDate()}`
    };
  });
}
