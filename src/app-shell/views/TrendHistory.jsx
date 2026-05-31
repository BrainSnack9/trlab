import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatTime } from '../utils';

export function TrendHistory() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState('all');
  const [slot, setSlot] = useState('all');
  const [kind, setKind] = useState('scheduled');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('latest');
  useEffect(() => {
    fetch('/api/trends/history?limit=60', { cache: 'no-store' }).then((response) => response.json()).then((data) => setHistory(data.history ?? [])).finally(() => setLoading(false));
  }, []);
  const dates = useMemo(() => uniqueDates(history), [history]);
  const filtered = useMemo(() => filterHistory(history, { date, slot, kind, query, sort }), [history, date, slot, kind, query, sort]);
  if (loading) return <EmptyHistory text="트렌드 이력을 불러오는 중입니다." />;
  if (!history.length) return <EmptyHistory text="아직 저장된 트렌드 반영 이력이 없습니다." />;
  return (
    <div className="space-y-4">
      <HistoryFilters {...{ date, setDate, slot, setSlot, kind, setKind, query, setQuery, sort, setSort, dates }} />
      <div className="text-sm text-muted-foreground">총 {filtered.length}개 스냅샷</div>
      {!filtered.length ? <EmptyHistory text="조건에 맞는 트렌드 이력이 없습니다." /> : <div className="grid gap-3 xl:grid-cols-2">{filtered.map((run) => <HistoryCard key={run.createdAt} run={run} />)}</div>}
    </div>
  );
}

function HistoryFilters({ date, setDate, slot, setSlot, kind, setKind, query, setQuery, sort, setSort, dates }) {
  return (
    <div className="grid gap-2 rounded-lg border bg-white p-3 lg:grid-cols-[160px_140px_150px_1fr_140px_auto]">
      <Select value={date} onValueChange={setDate}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">전체 날짜</SelectItem>{dates.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select>
      <Select value={slot} onValueChange={setSlot}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">전체 시간</SelectItem><SelectItem value="06">아침 6시</SelectItem><SelectItem value="12">점심 12시</SelectItem><SelectItem value="18">저녁 6시</SelectItem></SelectContent></Select>
      <Select value={kind} onValueChange={setKind}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="scheduled">정기 반영만</SelectItem><SelectItem value="manual">수동만</SelectItem><SelectItem value="all">전체</SelectItem></SelectContent></Select>
      <div className="flex items-center gap-2 rounded-md border px-3"><Search className="h-4 w-4 text-muted-foreground" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="키워드, 분야, 출처 검색" className="h-9 min-w-0 flex-1 bg-transparent text-sm outline-none" /></div>
      <Select value={sort} onValueChange={setSort}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="latest">최신순</SelectItem><SelectItem value="score">평균 점수순</SelectItem><SelectItem value="count">후보 많은순</SelectItem></SelectContent></Select>
      <Button variant="outline" onClick={() => { setDate('all'); setSlot('all'); setKind('scheduled'); setQuery(''); setSort('latest'); }}>초기화</Button>
    </div>
  );
}

function HistoryCard({ run }) {
  return (
    <Card className="shadow-none">
      <CardHeader className="pb-3"><div className="flex flex-wrap items-start justify-between gap-3"><div><CardDescription className="flex items-center gap-1"><CalendarDays className="h-4 w-4" />{formatTime(run.createdAt)}</CardDescription><CardTitle className="text-base">트렌드 반영 스냅샷</CardTitle></div><div className="flex gap-2"><Badge variant="secondary">{run.reason || 'manual'}</Badge><Badge variant="secondary">{run.count}개</Badge><Badge variant="outline">평균 {run.avgScore ?? 0}</Badge></div></div></CardHeader>
      <CardContent className="space-y-2">{run.items.map((item, index) => <HistoryItem key={`${run.createdAt}-${index}-${item.keyword}`} item={item} index={index} />)}</CardContent>
    </Card>
  );
}

function HistoryItem({ item, index }) {
  return <div className="grid gap-2 rounded-lg bg-slate-50 p-3 text-sm md:grid-cols-[32px_1fr_auto]"><Badge variant="outline">{index + 1}</Badge><div><strong className="line-clamp-1">{item.keyword}</strong><p className="text-xs text-muted-foreground">{item.area} · 언급 {item.mentions} · {item.sources.join(', ')}</p></div><Badge>{item.score}</Badge></div>;
}

function EmptyHistory({ text }) {
  return <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">{text}</div>;
}

function uniqueDates(history) {
  return [...new Set(history.map((run) => new Date(run.createdAt).toLocaleDateString('ko-KR')))];
}

function filterHistory(history, { date, slot, kind, query, sort }) {
  const lowered = query.trim().toLowerCase();
  return [...history].filter((run) => {
    const runDate = new Date(run.createdAt);
    const dateOk = date === 'all' || runDate.toLocaleDateString('ko-KR') === date;
    const slotOk = slot === 'all' || String(runDate.getHours()).padStart(2, '0') === slot;
    const kindOk = kind === 'all' || (kind === 'scheduled' ? run.reason?.startsWith('scheduled-') : !run.reason?.startsWith('scheduled-'));
    const text = run.items.map((item) => `${item.keyword} ${item.area} ${item.sources.join(' ')}`).join(' ').toLowerCase();
    return dateOk && slotOk && kindOk && (!lowered || text.includes(lowered));
  }).sort((a, b) => sortHistory(a, b, sort));
}

function sortHistory(a, b, sort) {
  if (sort === 'score') return (b.avgScore ?? 0) - (a.avgScore ?? 0);
  if (sort === 'count') return (b.count ?? 0) - (a.count ?? 0);
  return new Date(b.createdAt) - new Date(a.createdAt);
}
