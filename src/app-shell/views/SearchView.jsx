import { useEffect, useState } from 'react';
import { ArrowLeft, CheckCircle2, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Empty, Metric, StageHead } from '../components/Common';

export function SearchView({ selected, addToQueue, queued, setView }) {
  const [searchCheck, setSearchCheck] = useState(null);
  const [checkingSearch, setCheckingSearch] = useState(false);
  const [searchError, setSearchError] = useState('');

  useEffect(() => {
    if (!selected) return;
    let active = true;
    setCheckingSearch(true);
    setSearchError('');
    fetch(`/api/search/verify?q=${encodeURIComponent(selected.label)}&type=${encodeURIComponent(selected.validation?.contentType ?? '검증형')}`, { cache: 'no-store' })
      .then((response) => response.ok ? response.json() : Promise.reject(new Error(`검색 검증 실패: ${response.status}`)))
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
        <Button variant="outline" onClick={() => setView('dashboard')}><ArrowLeft className="h-4 w-4" />레이더로</Button>
        <Button onClick={() => addToQueue(searchCheck)} disabled={checkingSearch || !canQueue}>{queued ? <CheckCircle2 className="h-4 w-4" /> : <Plus className="h-4 w-4" />}{queueLabel(queued, checkingSearch, canQueue)}</Button>
      </StageHead>
      <div className="grid gap-5 lg:grid-cols-[340px_1fr]">
        <SummaryCard selected={selected} />
        <ResultCard searchCheck={searchCheck} checking={checkingSearch} error={searchError} />
      </div>
    </div>
  );
}

function queueLabel(queued, checking, canQueue) {
  if (queued) return '스튜디오에 담김';
  if (checking) return '검색 검증 중';
  return canQueue ? '콘텐츠 스튜디오에 담기' : '검증 통과 필요';
}

function SummaryCard({ selected }) {
  return (
    <Card className="overflow-hidden">
      <div className="p-5 text-white" style={{ background: `linear-gradient(135deg, ${selected.color}, #111827)` }}><Badge variant="secondary">#{selected.rank}</Badge><h2 className="mt-3 text-xl font-black leading-tight">{selected.label}</h2><p className="mt-2 text-[13px] font-semibold leading-5 text-white/80">{selected.summary}</p></div>
      <CardContent className="grid grid-cols-2 gap-2 pt-5"><Metric label="제작점수" value={selected.production?.score ?? selected.score} /><Metric label="언급" value={selected.mentions} /><Metric label="출처" value={selected.sources.length} /><Metric label="등급" value={selected.production?.tier ?? '검증'} /></CardContent>
    </Card>
  );
}

function ResultCard({ searchCheck, checking, error }) {
  const verification = searchCheck?.verification;
  return (
    <Card>
      <CardHeader><CardDescription>Search Verdict</CardDescription><CardTitle>검색 검증 결과</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        {checking && <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">Google/Naver 검색 결과를 확인하는 중입니다.</div>}
        {error && <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
        {verification && <div className="rounded-lg border bg-slate-50 p-4"><Badge>{verification.grade}</Badge><h3 className="mt-3 text-lg font-black leading-tight">점수 {verification.score}</h3><p className="mt-2 text-sm font-semibold text-muted-foreground">{verification.summary}</p><p className="mt-2 text-xs font-medium text-muted-foreground">{verification.reason}</p></div>}
        <div className="grid gap-2">{(searchCheck?.results ?? []).slice(0, 8).map((result) => <a key={`${result.source}-${result.url}`} href={result.url} target="_blank" rel="noreferrer" className="rounded-lg border bg-white p-3 transition hover:border-indigo-300"><Badge variant="outline">{result.source}</Badge><strong className="mt-2 line-clamp-2 block text-sm leading-5">{result.title}</strong></a>)}</div>
      </CardContent>
    </Card>
  );
}
