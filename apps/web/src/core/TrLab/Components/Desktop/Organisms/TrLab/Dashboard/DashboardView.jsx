import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Eraser, FileText, RefreshCw, ThumbsUp, XCircle } from 'lucide-react';
import { Badge } from '@/core/TrLab/Components/Desktop/Atoms/TrLab/Common/Badge/Badge';
import { Button } from '@/core/TrLab/Components/Desktop/Atoms/TrLab/Common/Button/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/core/TrLab/Components/Desktop/Atoms/TrLab/Common/Card';
import { defaultExcludedAreas, defaultSelectedAreas } from '@/core/TrLab/modules/configs/constants';
import { isTrendVisible } from '@/core/TrLab/modules/helpers/utils';
import { PageHero } from '@/core/TrLab/Components/Desktop/Molecules/TrLab/Common';
import { CandidateBoard, ScopeFilter } from './DashboardWidgets';
import { getSignalDateSummary } from '@/core/TrLab/modules/clients/api';

const trendButtonClass = 'h-10 px-3 text-xs';

export function DashboardView(props) {
  const selectedSet = useMemo(() => new Set(props.selectedAreas), [props.selectedAreas]);
  const excludedSet = useMemo(() => new Set(props.excludedAreas), [props.excludedAreas]);
  const selectedProfileSet = useMemo(() => new Set(props.selectedChannelProfiles ?? []), [props.selectedChannelProfiles]);
  const allProfileSet = useMemo(() => new Set((props.channelProfiles ?? []).map((profile) => profile.id)), [props.channelProfiles]);
  const [feedbackActions, setFeedbackActions] = useState({});
  const [feedbackSavingId, setFeedbackSavingId] = useState('');
  const [feedbackNotice, setFeedbackNotice] = useState(null);
  const baseCandidates = useMemo(() => props.rankedTrends
    .filter((t) => isTrendVisible(t, selectedSet, excludedSet))
    .filter((t) => isProfileVisible(t, selectedProfileSet, allProfileSet)), [props.rankedTrends, selectedSet, excludedSet, selectedProfileSet, allProfileSet]);
  const candidates = useMemo(() => baseCandidates
    .filter((candidate) => feedbackActions[getCandidateId(candidate)] !== 'reject')
    .sort((a, b) => Number(feedbackActions[getCandidateId(b)] === 'positive') - Number(feedbackActions[getCandidateId(a)] === 'positive')), [baseCandidates, feedbackActions]);
  const [selectedCandidateId, setSelectedCandidateId] = useState('');
  const selectedCandidate = useMemo(() => candidates.find((candidate) => getCandidateId(candidate) === selectedCandidateId) ?? candidates[0], [candidates, selectedCandidateId]);
  const trendDataLoading = props.rankingLoading || props.snapshotLoading;
  const recordFeedback = async (action, candidate, reason) => {
    if (!candidate) return;
    const reflect = action === 'positive' || action === 'reject';
    const feedbackId = getCandidateId(candidate);
    if (reflect) {
      setFeedbackSavingId(`${action}:${feedbackId}`);
      setFeedbackNotice(null);
    }
    try {
      if (!props.recordCandidateFeedback) throw new Error('피드백 저장 API가 연결되지 않았습니다.');
      const result = await props.recordCandidateFeedback({ action, candidate, reason, source: 'dashboard' });
      if (result?.ok === false) throw new Error(result.error ?? '피드백 저장에 실패했습니다.');
      if (reflect) {
        setFeedbackActions((current) => ({ ...current, [feedbackId]: action }));
        setFeedbackNotice({
          candidateId: feedbackId,
          type: 'success',
          message: action === 'positive' ? '좋음 학습을 저장했어요.' : '제외 학습을 저장하고 보드에서 숨겼어요.'
        });
      }
      return result;
    } catch (error) {
      if (reflect) {
        setFeedbackNotice({
          candidateId: feedbackId,
          type: 'error',
          message: error.message ?? '피드백 저장에 실패했습니다.'
        });
      }
      return null;
    } finally {
      if (reflect) setFeedbackSavingId('');
    }
  };
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
      <PageHero title="트렌드 감지" description="수집은 통합으로 실행하고, 결과는 계정 프로필 기준으로 나눠 봅니다." />
      <AnalysisDatePicker
        analysisDate={props.analysisDate}
        setAnalysisDate={props.setAnalysisDate}
        loading={trendDataLoading}
        rankingLoading={props.rankingLoading}
        collectionRevision={props.collectionRevision}
        onAnalyze={props.refreshTrendRanking}
        onCollect={props.onCollectSignals}
        onClear={props.clearCollectedTrends}
        collecting={props.collectingSignals}
        clearing={props.clearingCollection}
        hasSignals={Boolean(props.signals.length)}
        candidateCount={candidates.length}
      />
      <ScopeFilter {...props} selectedSet={selectedSet} excludedSet={excludedSet} reset={resetScope} />
      <section className="grid items-start gap-5 md:grid-cols-[minmax(0,1fr)_300px] xl:grid-cols-[minmax(0,1fr)_380px]">
        <CandidateBoard
          candidates={candidates}
          selectedCandidate={selectedCandidate}
          feedbackActions={feedbackActions}
          onSelectCandidate={(candidate) => {
            setSelectedCandidateId(getCandidateId(candidate));
            recordFeedback('view', candidate, 'candidate-detail-view');
          }}
        />
        <CandidateDetailPanel
          candidate={selectedCandidate}
          chooseTrend={props.chooseTrend}
          loading={trendDataLoading}
          onFeedback={recordFeedback}
          feedbackAction={feedbackActions[getCandidateId(selectedCandidate)]}
          feedbackSavingId={feedbackSavingId}
          feedbackNotice={feedbackNotice}
        />
      </section>
    </div>
  );
}

function AnalysisDatePicker({ analysisDate, setAnalysisDate, loading, rankingLoading, collectionRevision, onAnalyze, onCollect, onClear, collecting, clearing, hasSignals, candidateCount }) {
  const todayId = useMemo(() => getTodayKstId(), []);
  const selected = analysisDate || todayId;
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => parseDateId(selected));
  const [summary, setSummary] = useState({});
  const [summaryLoading, setSummaryLoading] = useState(false);
  const summaryRequestRef = useRef(0);
  const skipNextSummaryRefreshRef = useRef(false);
  const calendarRef = useRef(null);
  const calendarDates = useMemo(() => buildCalendarDates(calendarMonth), [calendarMonth]);
  const visibleDateIds = useMemo(() => calendarDates.map((item) => item.id), [calendarDates]);
  const clearDisabled = rankingLoading || collecting || clearing || (!hasSignals && !candidateCount);

  useEffect(() => {
    const selectedMonth = parseDateId(selected);
    setCalendarMonth((current) => (
      current.getUTCFullYear() === selectedMonth.getUTCFullYear() && current.getUTCMonth() === selectedMonth.getUTCMonth()
        ? current
        : selectedMonth
    ));
  }, [selected]);

  const refreshSummary = useCallback(async () => {
    if (clearing) return;
    const requestId = summaryRequestRef.current + 1;
    summaryRequestRef.current = requestId;
    setSummaryLoading(true);
    try {
      const data = await getSignalDateSummary(visibleDateIds);
      if (summaryRequestRef.current !== requestId) return;
      setSummary((current) => ({ ...current, ...Object.fromEntries((data.summaries ?? []).map((item) => [item.date, item])) }));
    } finally {
      if (summaryRequestRef.current === requestId) setSummaryLoading(false);
    }
  }, [clearing, visibleDateIds]);

  const clearVisibleSummary = useCallback(() => {
    summaryRequestRef.current += 1;
    setSummaryLoading(false);
    setSummary((current) => {
      const next = { ...current };
      const dateIds = new Set([...visibleDateIds, selected]);
      dateIds.forEach((dateId) => {
        next[dateId] = {
          ...(next[dateId] ?? {}),
          date: dateId,
          count: 0,
          sources: 0
        };
      });
      return next;
    });
  }, [selected, visibleDateIds]);

  useEffect(() => {
    if (clearing) {
      skipNextSummaryRefreshRef.current = true;
      clearVisibleSummary();
      return;
    }
    if (skipNextSummaryRefreshRef.current) {
      skipNextSummaryRefreshRef.current = false;
      return;
    }
    refreshSummary().catch(() => {});
  }, [clearing, clearVisibleSummary, refreshSummary, collectionRevision]);

  useEffect(() => {
    if (!calendarOpen) return undefined;
    const closeCalendar = (event) => {
      if (!calendarRef.current?.contains(event.target)) setCalendarOpen(false);
    };
    document.addEventListener('mousedown', closeCalendar);
    return () => document.removeEventListener('mousedown', closeCalendar);
  }, [calendarOpen]);

  const selectedCount = summary[selected]?.count ?? 0;
  const selectedDateLabel = getRelativeDateLabel(selected, todayId);
  const selectDate = (date) => {
    if (!date) return;
    setCalendarOpen(false);
    if (date !== selected) setAnalysisDate(date)?.catch?.(() => {});
  };

  return (
    <section className="sticky top-0 z-20 rounded-lg border border-indigo-100 bg-white/95 shadow-sm backdrop-blur">
      <div className="grid gap-3 p-3 lg:grid-cols-[minmax(250px,0.75fr)_minmax(0,1.25fr)] lg:items-center">
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-md bg-indigo-50 text-indigo-700">
            <CalendarDays className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-black text-indigo-700">분석 기준일</span>
              <Badge variant="secondary">{selectedDateLabel}</Badge>
              {loading && <Badge variant="outline">전환 중</Badge>}
            </div>
            <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <strong className="text-xl font-black leading-none text-slate-950">{selected}</strong>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-start gap-3 lg:justify-end">
          <div ref={calendarRef} className="relative flex flex-wrap items-center gap-2">
            <span className="inline-flex h-10 items-center rounded-md border border-slate-200 bg-slate-50 px-3 text-xs font-black text-slate-700">
              {summaryLoading ? '신호 확인 중' : `${selectedCount}건`}
            </span>
            <Button size="sm" variant="outline" className={trendButtonClass} onClick={() => setCalendarOpen((open) => !open)} disabled={loading}>
              <CalendarDays className="h-4 w-4" />
              날짜 선택
            </Button>
            <Button size="sm" variant="outline" className={trendButtonClass} onClick={refreshSummary} disabled={summaryLoading || clearing}>
              <RefreshCw className={`h-4 w-4 ${summaryLoading ? 'animate-spin' : ''}`} />
              개수
            </Button>
            {calendarOpen && (
              <AnalysisCalendar
                dates={calendarDates}
                month={calendarMonth}
                selected={selected}
                todayId={todayId}
                summary={summary}
                summaryLoading={summaryLoading}
                setMonth={setCalendarMonth}
                selectDate={selectDate}
              />
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2 border-l border-slate-200 pl-3">
            <Button variant="outline" size="sm" className={trendButtonClass} onClick={onCollect} disabled={collecting || clearing}>
              {collecting ? '수집 중' : '트렌드 수집'}
            </Button>
            <Button variant="outline" size="sm" className={trendButtonClass} onClick={onClear} disabled={clearDisabled}>
              <Eraser className="h-4 w-4" />{clearing ? '비우는 중' : '비우기'}
            </Button>
            <Button size="sm" className={trendButtonClass} onClick={onAnalyze} disabled={rankingLoading || clearing}>
              {rankingLoading ? '분석 중' : 'AI 분석'}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

function AnalysisCalendar({ dates, month, selected, todayId, summary, summaryLoading, setMonth, selectDate }) {
  const weekdays = ['일', '월', '화', '수', '목', '금', '토'];

  return (
    <div className="absolute right-0 top-12 z-30 w-[342px] rounded-lg border border-slate-200 bg-white p-3 shadow-xl">
      <div className="mb-3 flex items-center justify-between gap-2">
        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setMonth((current) => addMonths(current, -1))} aria-label="이전 달">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <strong className="text-sm font-black text-slate-950">{formatMonthLabel(month)}</strong>
        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setMonth((current) => addMonths(current, 1))} aria-label="다음 달">
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-black text-slate-400">
        {weekdays.map((day) => <span key={day}>{day}</span>)}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {dates.map((date) => {
          const count = summary[date.id]?.count;
          const isSelected = selected === date.id;
          const isToday = todayId === date.id;
          return (
            <button
              key={date.id}
              type="button"
              className={[
                'grid h-[54px] min-w-0 content-center rounded-md border px-1 text-center transition-colors',
                isSelected ? 'border-indigo-600 bg-indigo-600 text-white shadow-sm' : 'border-transparent hover:border-indigo-200 hover:bg-indigo-50',
                !date.inMonth && !isSelected ? 'text-slate-300' : 'text-slate-800',
                isToday && !isSelected ? 'bg-slate-100 text-slate-950' : ''
              ].filter(Boolean).join(' ')}
              onClick={() => selectDate(date.id)}
            >
              <span className="text-sm font-black leading-none">{date.day}</span>
              <span className={`mt-1 text-[10px] font-bold leading-none ${isSelected ? 'text-white/85' : 'text-slate-500'}`}>
                {Number.isFinite(count) ? `${count}건` : summaryLoading ? '확인 중' : '0건'}
              </span>
            </button>
          );
        })}
      </div>
      <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
        <span className="text-[11px] font-bold text-slate-500">날짜별 수집 신호 수</span>
        <Button size="sm" variant="outline" className={trendButtonClass} onClick={() => selectDate(todayId)}>오늘</Button>
      </div>
    </div>
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

function CandidateDetailPanel({ candidate, chooseTrend, loading, onFeedback, feedbackAction, feedbackSavingId, feedbackNotice }) {
  const evidence = getCandidateEvidence(candidate);
  const score = candidate?.production?.score ?? candidate?.score ?? 0;
  const profile = candidate?.channelFit?.bestProfile;
  const ai = candidate?.aiAnalysis;
  const contentIdeas = getContentIdeas(candidate);
  const feedbackId = getCandidateId(candidate);
  const positiveSaving = feedbackSavingId === `positive:${feedbackId}`;
  const rejectSaving = feedbackSavingId === `reject:${feedbackId}`;
  const visibleNotice = feedbackNotice?.candidateId === feedbackId ? feedbackNotice : null;

  return (
    <Card className="flex flex-col md:sticky md:top-28 md:max-h-[calc(100vh-7rem)]">
      <CardHeader className="border-b"><CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5 text-indigo-600" />후보 상세</CardTitle></CardHeader>
      <CardContent className="min-h-0 flex-1 space-y-4 overflow-auto pt-5">
        {!candidate ? (
          <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">{loading ? '후보를 정리하는 중입니다.' : '제작 후보를 선택하면 상세 내용이 표시됩니다.'}</p>
        ) : <>
          <div className="rounded-md border bg-slate-50 p-3">
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge variant="secondary">{candidate.area?.label ?? '영역 미분류'}</Badge>
              {profile && <Badge variant="outline">{profile.label}</Badge>}
              <Badge variant="outline">{candidate.production?.tier ?? '검증'}</Badge>
              {feedbackAction === 'positive' && <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">좋음 학습됨</Badge>}
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
          <div>
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="text-sm font-black text-slate-700">근거 게시글과 신호</div>
              <Badge variant="secondary">{evidence.length}개</Badge>
            </div>
            <div className="space-y-2">
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
          <div className="grid gap-2">
            {visibleNotice && (
              <p className={`rounded-md border px-3 py-2 text-xs font-bold ${visibleNotice.type === 'error' ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
                {visibleNotice.message}
              </p>
            )}
            <div className="grid grid-cols-2 gap-2">
              <Button size="sm" variant="outline" className={trendButtonClass} onClick={() => onFeedback?.('positive', candidate, 'manual-positive')} disabled={positiveSaving || rejectSaving}>
                <ThumbsUp className="h-4 w-4" />{positiveSaving ? '저장 중' : feedbackAction === 'positive' ? '좋음 학습됨' : '좋음 학습'}
              </Button>
              <Button size="sm" variant="outline" className={`${trendButtonClass} border-red-200 text-red-700 hover:bg-red-50`} onClick={() => onFeedback?.('reject', candidate, 'manual-reject')} disabled={positiveSaving || rejectSaving}>
                <XCircle className="h-4 w-4" />{rejectSaving ? '저장 중' : '제외 학습'}
              </Button>
            </div>
            <Button size="sm" className={`w-full ${trendButtonClass}`} onClick={() => chooseTrend(candidate)}>제목 후보 선택하러 가기</Button>
          </div>
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

function isProfileVisible(candidate, selectedProfileSet, allProfileSet) {
  if (!selectedProfileSet?.size) return true;
  if (isAllProfilesSelected(selectedProfileSet, allProfileSet)) return true;
  const bestId = candidate?.channelFit?.bestProfile?.id;
  const profileIds = (candidate?.channelFit?.profiles ?? []).map((profile) => profile.id);
  return (bestId && selectedProfileSet.has(bestId)) || profileIds.some((id) => selectedProfileSet.has(id));
}

function isAllProfilesSelected(selectedProfileSet, allProfileSet) {
  if (!allProfileSet?.size) return false;
  return allProfileSet.size === selectedProfileSet.size
    && [...allProfileSet].every((id) => selectedProfileSet.has(id));
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

function getTodayKstId() {
  const today = new Date(Date.now() + 9 * 60 * 60 * 1000);
  return formatDateId(new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())));
}

function getRelativeDateLabel(dateId, todayId) {
  const today = parseDateId(todayId);
  const date = parseDateId(dateId);
  const diffDays = Math.round((date.getTime() - today.getTime()) / 86400000);
  if (diffDays === 0) return '오늘';
  if (diffDays === -1) return '어제';
  if (diffDays === 1) return '내일';
  return `${date.getUTCMonth() + 1}/${date.getUTCDate()}`;
}

function buildCalendarDates(monthDate) {
  const firstDate = new Date(Date.UTC(monthDate.getUTCFullYear(), monthDate.getUTCMonth(), 1));
  const startDate = new Date(Date.UTC(firstDate.getUTCFullYear(), firstDate.getUTCMonth(), 1 - firstDate.getUTCDay()));
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), startDate.getUTCDate() + index));
    return {
      id: formatDateId(date),
      day: date.getUTCDate(),
      inMonth: date.getUTCMonth() === monthDate.getUTCMonth()
    };
  });
}

function addMonths(date, amount) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + amount, 1));
}

function formatMonthLabel(date) {
  return `${date.getUTCFullYear()}년 ${date.getUTCMonth() + 1}월`;
}

function parseDateId(dateId) {
  const [year, month, day] = String(dateId || getTodayKstId()).split('-').map(Number);
  return new Date(Date.UTC(year, (month || 1) - 1, day || 1));
}

function formatDateId(date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
}
