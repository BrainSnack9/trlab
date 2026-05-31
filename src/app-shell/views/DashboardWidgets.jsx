import { SlidersHorizontal, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { exclusionAreas, interestAreas } from '../constants';

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

export function TrendProcessingStatus({ meta, trends, loading, onRefresh, onCollect, collecting }) {
  const verified = trends.filter((trend) => trend.searchVerification?.grade === '통과').length;
  const ready = trends.filter((trend) => trend.production?.tier === '바로 제작').length;
  const mode = meta?.mode === 'snapshot' ? '저장 스냅샷' : 'AI 가공 레이더';
  return (
    <Card className="border-indigo-200 bg-indigo-50/55">
      <CardContent className="grid gap-3 p-4 lg:grid-cols-[1fr_auto] lg:items-center">
        <div>
          <div className="flex flex-wrap items-center gap-2"><Badge className="bg-indigo-600">{loading ? '처리 중' : mode}</Badge><span className="text-sm font-bold text-slate-950">기본 화면은 최신 저장 랭킹을 빠르게 보여주고, 필요할 때 AI 재분석을 실행합니다.</span></div>
          <p className="mt-1 text-xs text-slate-600">마지막 처리 {meta?.processedAt ? new Date(meta.processedAt).toLocaleTimeString('ko-KR') : '-'} · 후보 {meta?.candidateCount ?? trends.length}개 · {meta?.reason ?? 'manual-rank'}</p>
        </div>
        <div className="grid grid-cols-5 gap-2 text-center text-xs font-bold"><Stat value={loading ? '...' : ready} label="바로 제작" /><Stat value={loading ? '...' : (meta?.verifiedCount ?? verified)} label="검색검증" /><Stat value={loading ? '...' : verified} label="통과" /><Button size="sm" variant="outline" className="h-full min-h-[42px] whitespace-normal leading-tight" onClick={onCollect} disabled={collecting}>{collecting ? '수집 중' : '관심영역 수집'}</Button><Button size="sm" className="h-full min-h-[42px] whitespace-normal leading-tight" onClick={onRefresh} disabled={loading}>AI 재분석</Button></div>
      </CardContent>
    </Card>
  );
}

function Stat({ value, label }) {
  return <span className="flex min-h-[42px] flex-col justify-center rounded-md bg-white px-3 py-2 text-[11px] font-black leading-tight text-slate-500 shadow-sm"><b className="block text-base leading-none text-slate-950">{value}</b>{label}</span>;
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
  return (
    <button type="button" className="text-left font-bold" onClick={() => chooseTrend(candidate)}>
      <Card className="h-full bg-white shadow-none transition hover:border-indigo-300 hover:bg-indigo-50/30">
        <CardContent className="space-y-3 p-4">
          <div className="flex items-start justify-between gap-3"><div className="min-w-0"><span className="text-xs font-black text-slate-500">#{index + 1}</span><strong className="mt-1 line-clamp-2 block text-lg">{candidate.keyword}</strong></div><Badge>{candidate.production?.score ?? candidate.score}</Badge></div>
          <div className="flex flex-wrap gap-1.5"><Badge variant="secondary">{candidate.area?.label}</Badge><Badge>{candidate.production?.tier ?? '검증'}</Badge>{candidate.searchVerification && <Badge variant="outline">검색 {candidate.searchVerification.grade}</Badge>}</div>
          <div className="grid grid-cols-3 gap-2 text-xs"><Mini label="언급" value={candidate.mentions} /><Mini label="출처" value={candidate.sources?.length ?? 0} /><Mini label="제작" value={candidate.production?.score ?? '-'} /></div>
          <p className="rounded-md bg-indigo-50 p-2 text-xs font-bold leading-5 text-indigo-900">{candidate.production?.suggestedAngle ?? candidate.contentAngle}</p>
          <p className="line-clamp-2 text-xs text-muted-foreground">{candidate.sampleTitles?.[0]}</p>
        </CardContent>
      </Card>
    </button>
  );
}

function Mini({ label, value }) {
  return <span className="rounded-md bg-slate-50 p-2 text-[11px] font-black text-muted-foreground">{label} <b className="text-slate-900">{value}</b></span>;
}
