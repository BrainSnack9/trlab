import { useEffect, useState } from 'react';
import { ArrowLeft, BarChart3, CheckCircle2, Database, MessageCircle, Plus, ShieldCheck } from 'lucide-react';
import { Badge } from '@/core/TrLab/Components/Desktop/Atoms/TrLab/Common/Badge/Badge';
import { Button } from '@/core/TrLab/Components/Desktop/Atoms/TrLab/Common/Button/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/core/TrLab/Components/Desktop/Atoms/TrLab/Common/Card';
import { Empty, StageHead } from '@/core/TrLab/Components/Desktop/Molecules/TrLab/Common';
import { verifySearch } from '@/core/TrLab/modules/clients/api';

export function SearchView({ selected, addToQueue, queued, setView }) {
  const [searchCheck, setSearchCheck] = useState(null);
  const [checkingSearch, setCheckingSearch] = useState(false);
  const [searchError, setSearchError] = useState('');

  useEffect(() => {
    if (!selected) return;
    const cached = searchCheckFromSelected(selected);
    if (cached) {
      setSearchCheck(cached);
      setCheckingSearch(false);
      setSearchError('');
      return;
    }
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
      <StageHead title={`${selected.label} 검색 검증`}>
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

function searchCheckFromSelected(selected) {
  const verification = selected?.searchVerification;
  if (!verification) return null;
  if (verification.verification) return verification;
  const sources = verification.sources ?? [];
  const results = sources.flatMap((source) => (source.results ?? []).map((item) => ({ ...item, source: source.source })));
  return {
    query: selected.keyword ?? selected.label,
    checkedAt: verification.checkedAt,
    sources,
    results,
    verification: {
      score: verification.score,
      grade: verification.grade,
      tokens: verification.tokens ?? [],
      summary: `${selected.label} 관련 검색 매칭 ${verification.matchedResults ?? results.length}건을 확인했습니다.`,
      reason: `강한 근거 ${verification.matchedResults ?? results.length}건 · 확인 출처 ${verification.sourceCount ?? sources.filter((source) => source.status === 'ok' && source.count > 0).length}곳`,
      recommendedAction: verification.grade === '통과' ? '제목 후보 선택으로 넘겨도 됩니다.' : '원문 확인 후 보류 판단을 권장합니다.',
      draftReady: verification.grade === '통과',
      keyFindings: verification.keyFindings ?? []
    }
  };
}

function queueLabel(queued, checking, canQueue) {
  if (queued) return '제목 선택 대기';
  if (checking) return '검색 검증 중';
  return canQueue ? '제목 후보 선택' : '검증 통과 필요';
}

function SummaryCard({ selected }) {
  const evidence = getEvidence(selected);
  const accentColor = selected.color || '#4f46e5';
  return (
    <Card className="overflow-hidden">
      <div className="border-b bg-slate-950 p-5 text-white" style={{ background: `linear-gradient(135deg, ${accentColor}, #111827)` }}><Badge variant="secondary">#{selected.rank}</Badge><h2 className="mt-3 break-words text-xl font-black leading-tight text-white">{cleanDisplayText(selected.label)}</h2><p className="mt-2 break-words text-[13px] font-semibold leading-5 text-white/80">{cleanDisplayText(selected.summary)}</p></div>
      <CardContent className="space-y-4 pt-5">
        <SummaryStats selected={selected} />
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

function SummaryStats({ selected }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <StatTile icon={BarChart3} label="제작점수" value={selected.production?.score ?? selected.score ?? 0} tone="indigo" />
      <StatTile icon={MessageCircle} label="반응" value={selected.scoring?.communityReaction ?? 0} tone="rose" />
      <StatTile icon={Database} label="출처" value={selected.sources?.length ?? 0} tone="slate" />
      <StatTile icon={ShieldCheck} label="등급" value={selected.production?.tier ?? '검증'} tone="emerald" />
    </div>
  );
}

function StatTile({ icon: Icon, label, value, tone }) {
  const toneClass = {
    indigo: 'border-indigo-100 bg-indigo-50 text-indigo-700',
    rose: 'border-rose-100 bg-rose-50 text-rose-700',
    slate: 'border-slate-200 bg-slate-50 text-slate-700',
    emerald: 'border-emerald-100 bg-emerald-50 text-emerald-700'
  }[tone] ?? 'border-slate-200 bg-slate-50 text-slate-700';

  return (
    <div className={`min-w-0 rounded-lg border p-3 ${toneClass}`}>
      <div className="flex items-center gap-1.5 text-[11px] font-black">
        <Icon className="h-3.5 w-3.5 shrink-0" />
        <span>{label}</span>
      </div>
      <strong className="mt-2 block truncate text-xl font-black leading-none text-slate-950">{value}</strong>
    </div>
  );
}

function ResultCard({ selected, searchCheck, checking, error }) {
  const verification = searchCheck?.verification;
  const results = getUniqueResults(searchCheck);
  const sources = searchCheck?.sources ?? [];
  const tokens = verification?.tokens ?? getTokens(searchCheck?.query ?? selected.label);
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle>검증 판정</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {checking && <div className="rounded-lg border border-dashed p-6 text-sm font-semibold text-muted-foreground">Google/Naver 검색 결과를 확인하는 중입니다.</div>}
          {error && <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">{error}</div>}
          {verification ? <VerificationVerdict verification={verification} /> : null}
          <div className="rounded-lg border bg-white p-3">
            <div className="text-[11px] font-black text-slate-500">매칭 단어</div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {tokens.map((token) => <Badge key={token} variant="secondary">{cleanDisplayText(token)}</Badge>)}
            </div>
            <p className="mt-3 text-xs font-semibold leading-5 text-muted-foreground">최근 45일 결과 중 제목에 매칭 단어가 잡힌 항목만 강한 근거로 봅니다.</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>출처별 확인 결과</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <SourceStatusGrid sources={sources} checking={checking} />
          <ResultList results={results} checking={checking} />
        </CardContent>
      </Card>
    </div>
  );
}

function VerificationVerdict({ verification }) {
  const tone = getGradeTone(verification.grade);
  return (
    <div className={`rounded-xl border p-4 ${tone.box}`}>
      <h3 className="text-2xl font-black leading-tight text-slate-950">{verification.score}점</h3>
      <p className="mt-3 break-words text-sm font-bold leading-6 text-slate-800">{cleanDisplayText(verification.summary)}</p>
      <p className="mt-2 break-words text-xs font-semibold leading-5 text-muted-foreground">{cleanDisplayText(verification.reason)}</p>
    </div>
  );
}

function SourceStatusGrid({ sources, checking }) {
  if (checking && !sources.length) return <div className="rounded-lg border border-dashed p-4 text-sm font-semibold text-muted-foreground">출처별 결과를 불러오는 중입니다.</div>;
  if (!sources.length) return <div className="rounded-lg border border-dashed p-4 text-sm font-semibold text-muted-foreground">아직 확인된 출처가 없습니다.</div>;
  return (
    <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
      {sources.map((source) => {
        const tone = getSourceTone(source);
        return (
          <div key={source.source} className={`rounded-lg border p-3 ${tone}`}>
            <div className="text-xs font-black text-slate-600">{source.source}</div>
            <div className="mt-2 flex items-end justify-between gap-2">
              <strong className="text-xl font-black text-slate-950">{source.count ?? 0}</strong>
              <Badge variant="outline">{source.status === 'ok' ? '확인됨' : '실패'}</Badge>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DetailBlock({ title, children }) {
  return <section><div className="mb-2 text-[11px] font-black text-slate-500">{title}</div><div className="text-xs font-semibold leading-5 text-slate-700">{children}</div></section>;
}

function ResultList({ results, checking }) {
  if (checking && !results.length) return null;
  if (!results.length) return <div className="rounded-lg border border-dashed p-4 text-sm font-semibold text-muted-foreground">검색 결과에서 강한 근거를 아직 찾지 못했습니다.</div>;
  return (
    <div className="space-y-2">
      <div className="text-[11px] font-black text-slate-500">강한 근거 {results.length}개</div>
      <div className="grid min-w-0 gap-2">
        {results.slice(0, 8).map((result) => (
          <a key={`${result.source}-${result.url || result.title}`} href={result.url} target="_blank" rel="noreferrer" className="min-w-0 rounded-lg border bg-white p-3 transition hover:border-indigo-300">
            <div className="flex flex-wrap gap-1.5">
              <Badge variant="outline">{result.source}</Badge>
              {(result.matchTokens ?? []).slice(0, 3).map((token) => <Badge key={token} variant="secondary">{cleanDisplayText(token)}</Badge>)}
              {result.publishedAt ? <Badge variant="secondary">{formatDate(result.publishedAt)}</Badge> : null}
            </div>
            <strong className="mt-2 line-clamp-2 block break-words text-sm leading-5">{cleanDisplayText(result.title)}</strong>
          </a>
        ))}
      </div>
    </div>
  );
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

function getUniqueResults(searchCheck) {
  const seen = new Set();
  return (searchCheck?.results ?? []).filter((result) => {
    const key = cleanDisplayText(result.url || result.title).toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function getTokens(value) {
  return cleanDisplayText(value).split(/\s+/).filter((token) => token.length >= 2).slice(0, 6);
}

function getGradeTone(grade) {
  if (grade === '통과') return { box: 'border-emerald-200 bg-emerald-50' };
  if (grade === '보류') return { box: 'border-amber-200 bg-amber-50' };
  return { box: 'border-slate-200 bg-slate-50' };
}

function getSourceTone(source) {
  if (source.status !== 'ok') return 'bg-red-50 border-red-100';
  if ((source.count ?? 0) > 0) return 'bg-emerald-50 border-emerald-100';
  return 'bg-slate-50 border-slate-200';
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
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
