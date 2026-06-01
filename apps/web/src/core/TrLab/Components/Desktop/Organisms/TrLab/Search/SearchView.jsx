import { useEffect, useState } from 'react';
import { ArrowLeft, CheckCircle2, Plus } from 'lucide-react';
import { Badge } from '@/core/TrLab/Components/Desktop/Atoms/TrLab/Common/Badge/Badge';
import { Button } from '@/core/TrLab/Components/Desktop/Atoms/TrLab/Common/Button/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/core/TrLab/Components/Desktop/Atoms/TrLab/Common/Card';
import { Empty, Metric, StageHead } from '@/core/TrLab/Components/Desktop/Molecules/TrLab/Common';
import { verifySearch } from '@/core/TrLab/modules/clients/api';

export function SearchView({ selected, addToQueue, queued, setView }) {
  const [searchCheck, setSearchCheck] = useState(null);
  const [checkingSearch, setCheckingSearch] = useState(false);
  const [searchError, setSearchError] = useState('');

  useEffect(() => {
    if (!selected) return;
    let active = true;
    setCheckingSearch(true);
    setSearchError('');
    verifySearch({ query: selected.label, type: selected.validation?.contentType ?? '검증형' })
      .then((data) => active && setSearchCheck(data))
      .catch((error) => active && setSearchError(error.message))
      .finally(() => active && setCheckingSearch(false));
    return () => { active = false; };
  }, [selected]);

  if (!selected) return <Empty title="검증할 키워드를 먼저 선택해 주세요" onClick={() => setView('dashboard')} />;
  const grade = searchCheck?.verification?.grade;
  const canQueue = grade === '통과' || grade === '보류';

  return (
    <div className="space-y-5">
      <StageHead label="Step 02 · Search Intelligence" title={`${selected.label} 검색 검증`} description="검색 의도, 결과 강도, 콘텐츠 각도를 확인합니다.">
        <Button variant="outline" onClick={() => setView('dashboard')}><ArrowLeft className="h-4 w-4" />뒤로가기</Button>
        <Button onClick={() => addToQueue(searchCheck)} disabled={checkingSearch || !canQueue}>{queued ? <CheckCircle2 className="h-4 w-4" /> : <Plus className="h-4 w-4" />}{queueLabel(queued, checkingSearch, canQueue)}</Button>
      </StageHead>
      <div className="grid min-w-0 gap-5 lg:grid-cols-[360px_minmax(0,1fr)]">
        <SummaryCard selected={selected} />
        <ResultCard selected={selected} searchCheck={searchCheck} checking={checkingSearch} error={searchError} />
      </div>
    </div>
  );
}

function queueLabel(queued, checking, canQueue) {
  if (queued) return '스튜디오에 담김';
  if (checking) return '검색 검증 중';
  return canQueue ? '콘텐츠 설계 진행' : '검증 통과 필요';
}

function SummaryCard({ selected }) {
  const evidence = getEvidence(selected);
  return (
    <Card className="overflow-hidden">
      <div className="p-5 text-white" style={{ background: `linear-gradient(135deg, ${selected.color}, #111827)` }}><Badge variant="secondary">#{selected.rank}</Badge><h2 className="mt-3 break-words text-xl font-black leading-tight">{cleanDisplayText(selected.label)}</h2><p className="mt-2 break-words text-[13px] font-semibold leading-5 text-white/80">{cleanDisplayText(selected.summary)}</p></div>
      <CardContent className="space-y-4 pt-5">
        <div className="grid grid-cols-2 gap-2"><Metric label="제작점수" value={selected.production?.score ?? selected.score} /><Metric label="반응" value={selected.scoring?.communityReaction ?? 0} /><Metric label="출처" value={selected.sources.length} /><Metric label="등급" value={selected.production?.tier ?? '검증'} /></div>
        <DetailBlock title="왜 가져왔나">
          <p>{makeReason(selected)}</p>
        </DetailBlock>
        <DetailBlock title={`수집 근거 ${evidence.length}개`}>
          <div className="space-y-2">
            {evidence.map((item, index) => (
              <div key={`${item.source}-${index}-${item.title}`} className="rounded-md border bg-slate-50 p-2">
                <div className="flex flex-wrap gap-1.5"><Badge variant="outline">{item.source ?? '근거'}</Badge>{item.metric ? <Badge variant="secondary">{item.metric}</Badge> : null}</div>
                <p className="mt-2 break-words text-xs font-bold leading-5 text-slate-700">{cleanDisplayText(item.title)}</p>
              </div>
            ))}
          </div>
        </DetailBlock>
      </CardContent>
    </Card>
  );
}

function ResultCard({ selected, searchCheck, checking, error }) {
  const verification = searchCheck?.verification;
  return (
    <Card>
      <CardHeader><CardDescription>Search Verdict</CardDescription><CardTitle>검색 검증 결과</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <VerificationFlow selected={selected} searchCheck={searchCheck} />
        {checking && <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">Google/Naver 검색 결과를 확인하는 중입니다.</div>}
        {error && <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
        {verification && <div className="rounded-lg border bg-slate-50 p-4"><Badge>{verification.grade}</Badge><h3 className="mt-3 text-lg font-black leading-tight">점수 {verification.score}</h3><p className="mt-2 text-sm font-semibold text-muted-foreground">{verification.summary}</p><p className="mt-2 text-xs font-medium text-muted-foreground">{verification.reason}</p>{verification.keyFindings?.length ? <FindingList items={verification.keyFindings} /> : null}</div>}
        <div className="grid min-w-0 gap-2">{(searchCheck?.results ?? []).slice(0, 8).map((result) => <a key={`${result.source}-${result.url}`} href={result.url} target="_blank" rel="noreferrer" className="min-w-0 rounded-lg border bg-white p-3 transition hover:border-indigo-300"><div className="flex flex-wrap gap-1.5"><Badge variant="outline">{result.source}</Badge>{result.publishedAt ? <Badge variant="secondary">{formatDate(result.publishedAt)}</Badge> : null}</div><strong className="mt-2 line-clamp-2 block break-words text-sm leading-5">{cleanDisplayText(result.title)}</strong>{result.snippet ? <p className="mt-1 line-clamp-2 break-words text-xs font-medium leading-5 text-muted-foreground">{cleanDisplayText(result.snippet)}</p> : null}</a>)}</div>
      </CardContent>
    </Card>
  );
}

function VerificationFlow({ selected, searchCheck }) {
  const query = searchCheck?.query ?? selected.label;
  const sourceSummary = searchCheck?.sources?.length
    ? searchCheck.sources.map((source) => `${source.source} ${source.count ?? 0}건`).join(' · ')
    : '검색 실행 전';
  return (
    <div className="grid gap-3 rounded-lg border bg-white p-4 md:grid-cols-3">
      <FlowStep label="1. 수집 근거" value={`${selected.sources?.join(', ') || '출처 없음'} · 반응 ${selected.scoring?.communityReaction ?? 0}`} />
      <FlowStep label="2. 추론 검색어" value={query} />
      <FlowStep label="3. 검증 결과" value={searchCheck?.verification ? `${searchCheck.verification.grade} · ${searchCheck.verification.score}점 · ${sourceSummary}` : sourceSummary} />
    </div>
  );
}

function FlowStep({ label, value }) {
  return <div className="min-w-0"><div className="text-[11px] font-black text-slate-500">{label}</div><p className="mt-1 break-words text-sm font-black leading-5 text-slate-900">{cleanDisplayText(value)}</p></div>;
}

function DetailBlock({ title, children }) {
  return <section><div className="mb-2 text-[11px] font-black text-slate-500">{title}</div><div className="text-xs font-semibold leading-5 text-slate-700">{children}</div></section>;
}

function FindingList({ items }) {
  return <ul className="mt-3 space-y-1.5">{items.slice(0, 4).map((item, index) => <li key={`${index}-${item}`} className="break-words rounded-md bg-white px-3 py-2 text-xs font-bold leading-5 text-slate-700">{cleanDisplayText(item)}</li>)}</ul>;
}

function getEvidence(selected) {
  const evidence = selected.evidence ?? [];
  if (evidence.length) return evidence.slice(0, 4);
  return (selected.sampleTitles ?? []).slice(0, 4).map((title, index) => ({ source: selected.sources?.[index] ?? '수집 제목', title }));
}

function makeReason(selected) {
  const reaction = selected.scoring?.communityReaction ?? 0;
  const evidenceCount = selected.evidence?.length ?? selected.sampleTitles?.length ?? 0;
  if (selected.aiAnalysis?.whyNow) return selected.aiAnalysis.whyNow;
  if (reaction >= 16) return `커뮤니티 댓글/추천/조회 반응이 높고, ${evidenceCount}개 근거에서 같은 맥락이 확인되어 후보로 올렸습니다.`;
  if (selected.crossCheck?.label) return `${selected.crossCheck.label} 상태라 추가 검색 검증 대상으로 올렸습니다.`;
  return '수집된 신호 제목과 출처를 기반으로 콘텐츠 후보로 추론했습니다.';
}

function formatDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
}

function cleanDisplayText(value) {
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
