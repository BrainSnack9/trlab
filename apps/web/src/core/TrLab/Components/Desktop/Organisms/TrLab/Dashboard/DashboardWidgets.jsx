import { SlidersHorizontal, Sparkles } from 'lucide-react';
import { Badge } from '@/core/TrLab/Components/Desktop/Atoms/TrLab/Common/Badge/Badge';
import { Button } from '@/core/TrLab/Components/Desktop/Atoms/TrLab/Common/Button/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/core/TrLab/Components/Desktop/Atoms/TrLab/Common/Card';
import { exclusionAreas, interestAreas } from '@/core/TrLab/modules/configs/constants';

export function ScopeFilter({ selectedSet, excludedSet, setSelectedAreas, setExcludedAreas, reset }) {
  const toggleSelected = (id) => setSelectedAreas((areas) => areas.includes(id) ? areas.filter((v) => v !== id) : [...areas, id]);
  const toggleExcluded = (id) => setExcludedAreas((areas) => areas.includes(id) ? areas.filter((v) => v !== id) : [...areas, id]);
  return (
    <Card className="bg-white/80">
      <CardHeader className="border-b"><div className="flex flex-wrap items-center justify-between gap-3"><div><CardDescription>Interest Scope</CardDescription><CardTitle className="flex items-center gap-2"><SlidersHorizontal className="h-5 w-5 text-indigo-600" />관심 영역과 제외 영역</CardTitle></div><Button variant="outline" size="sm" onClick={reset}>기본값</Button></div></CardHeader>
      <CardContent className="grid gap-4 pt-5 lg:grid-cols-[1fr_1fr]">
        <ChipGroup title={`보고 싶은 영역 · 수집 seed ${selectedSet.size}개 영역`} items={interestAreas} activeSet={selectedSet} onToggle={toggleSelected} />
        <ChipGroup title="자동 제외 영역" items={exclusionAreas} activeSet={excludedSet} onToggle={toggleExcluded} danger />
      </CardContent>
    </Card>
  );
}

function ChipGroup({ title, items, activeSet, onToggle, danger }) {
  return <div><div className="mb-2 text-sm font-bold">{title}</div><div className="flex max-h-28 flex-wrap gap-2 overflow-auto pr-1">{items.map((item) => <Button key={item.id} variant={activeSet.has(item.id) ? (danger ? 'destructive' : 'default') : 'outline'} size="sm" className="h-8 rounded-md px-2.5 text-xs" onClick={() => onToggle(item.id)}>{item.label}</Button>)}</div></div>;
}

export function TrendProcessingStatus({ trends, loading, onRefresh, onCollect, collecting }) {
  return (
    <Card className="border-indigo-200 bg-indigo-50/55">
      <CardContent className="grid gap-3 p-4 lg:grid-cols-[1fr_auto] lg:items-center">
        <div>
          <h2 className="text-base font-black leading-tight text-slate-950">AI 트렌드 분석</h2>
          <p className="mt-1 text-sm font-bold leading-5 text-slate-700">기본 화면은 최신 저장 랭킹을 빠르게 보여주고, 필요할 때 AI 재분석을 실행합니다.</p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <Button variant="outline" className="min-h-[42px]" onClick={onCollect} disabled={collecting}>
            {collecting ? '수집 중' : '트렌드 수집'}
          </Button>
          <Button className="min-h-[42px]" onClick={onRefresh} disabled={loading}>
            {loading ? '분석 중' : 'AI 분석'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function CandidateBoard({ candidates, chooseTrend }) {
  return (
    <Card>
      <CardHeader className="border-b"><div className="flex items-center justify-between gap-3"><div><CardDescription>Candidate Board</CardDescription><CardTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-indigo-600" />제작 후보 보드</CardTitle></div><Badge variant="secondary">{candidates.length}개 후보</Badge></div></CardHeader>
      <CardContent className="pt-5">{candidates.length ? <div data-testid="keyword-candidates" className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">{candidates.slice(0, 8).map((candidate, index) => <CandidateCard key={`${index}-${candidate.keyword}`} candidate={candidate} index={index} chooseTrend={chooseTrend} />)}</div> : <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">수집 데이터가 들어오면 제작 가능한 후보 카드가 표시됩니다.</p>}</CardContent>
    </Card>
  );
}

function CandidateCard({ candidate, index, chooseTrend }) {
  const evidence = getCandidateEvidence(candidate);
  const score = candidate.production?.score ?? candidate.score ?? 0;
  const reaction = candidate.scoring?.communityReaction ?? 0;

  return (
    <button type="button" className="text-left font-bold" onClick={() => chooseTrend(candidate)}>
      <Card className="h-full bg-white shadow-none transition hover:border-indigo-300 hover:bg-indigo-50/30">
        <CardContent className="space-y-3 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <span className="text-xs font-black text-slate-500">#{index + 1}</span>
              <strong className="mt-1 line-clamp-2 block text-lg leading-tight">{candidate.keyword}</strong>
            </div>
            <ScoreBadge score={score} />
          </div>
          <div className="flex flex-wrap gap-1.5"><Badge variant="secondary">{candidate.area?.label}</Badge><TierBadge tier={candidate.production?.tier ?? '검증'} />{candidate.searchVerification && <Badge variant="outline">검색 {candidate.searchVerification.grade}</Badge>}</div>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <MetricTile label="커뮤니티 반응" value={reaction} tone="hot" />
            <MetricTile label="언급" value={candidate.mentions} />
            <MetricTile label="출처" value={candidate.sources?.length ?? 0} />
          </div>
          <p className="rounded-md bg-indigo-50 p-2 text-xs font-bold leading-5 text-indigo-900">{candidate.production?.suggestedAngle ?? candidate.contentAngle}</p>
          <div className="space-y-2 rounded-md border border-slate-100 bg-slate-50 p-2">
            <div className="text-[11px] font-black text-slate-500">근거 {evidence.length}개</div>
            <div className="space-y-1.5">
              {evidence.map((item, evidenceIndex) => (
                <div key={`${item.source}-${evidenceIndex}-${item.title}`} className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-2 text-xs">
                  <span className="rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-black text-slate-500">{item.source ?? `근거 ${evidenceIndex + 1}`}</span>
                  <span className="line-clamp-2 leading-4 text-slate-700">{item.title}</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </button>
  );
}

function ScoreBadge({ score }) {
  const tone = score >= 82 ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : score >= 66 ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-slate-200 bg-slate-50 text-slate-700';
  return (
    <div className={`flex h-8 min-w-12 shrink-0 items-center justify-center rounded-md border px-2 ${tone}`}>
      <span className="sr-only">콘텐츠화 점수</span>
      <strong className="text-sm font-black leading-none">{score}</strong>
    </div>
  );
}

function TierBadge({ tier }) {
  const className = tier === '바로 제작'
    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
    : tier === '검증 후 제작'
      ? 'border-amber-200 bg-amber-50 text-amber-700'
      : 'border-slate-200 bg-slate-50 text-slate-600';
  return <Badge variant="outline" className={className}>{tier}</Badge>;
}

function MetricTile({ label, value, tone = 'quiet' }) {
  const hot = tone === 'hot';
  return (
    <span className={hot ? 'rounded-md border border-rose-100 bg-rose-50/60 px-2 py-1.5' : 'rounded-md border border-slate-100 bg-slate-50 px-2 py-1.5'}>
      <span className={hot ? 'block text-[10px] font-black text-rose-500' : 'block text-[10px] font-black text-slate-500'}>{label}</span>
      <b className={hot ? 'mt-0.5 block text-sm font-black leading-none text-rose-700' : 'mt-0.5 block text-sm font-black leading-none text-slate-800'}>{value ?? 0}</b>
    </span>
  );
}

function getCandidateEvidence(candidate) {
  const evidenceItems = (candidate.evidence ?? []).map((item) => ({
    source: item.source,
    title: item.metric ? `${item.title} · ${item.metric}` : item.title
  }));
  const sampleItems = (candidate.sampleTitles ?? []).map((title, index) => ({
    source: candidate.sources?.[index] ?? '관련 제목',
    title
  }));
  const seen = new Set();

  return [...evidenceItems, ...sampleItems]
    .filter((item) => {
      if (!item.title) return false;
      const key = `${item.source ?? ''}:${item.title}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 3);
}
