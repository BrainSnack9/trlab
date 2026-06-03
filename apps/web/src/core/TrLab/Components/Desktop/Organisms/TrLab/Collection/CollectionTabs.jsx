import { useMemo, useState } from 'react';
import { Badge } from '@/core/TrLab/Components/Desktop/Atoms/TrLab/Common/Badge/Badge';
import { Button } from '@/core/TrLab/Components/Desktop/Atoms/TrLab/Common/Button/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/core/TrLab/Components/Desktop/Atoms/TrLab/Common/Card';
import { collectableSourceIds, sourceMetaById, sourceNameById } from '@/core/TrLab/modules/configs/constants';
import { formatTime, getHostname, getSignalKind, getSignalQuality } from '@/core/TrLab/modules/helpers/utils';
import { SignalDrawer } from './SignalDrawer';
import { TrendHistory } from './TrendHistory';

export function CollectionTabs(props) {
  const [activeTab, setActiveTab] = useState('channels');
  const tabs = [['channels', '채널별 상태'], ['signals', '저장 신호'], ['runs', '수집 실행 로그'], ['history', '분석 이력'], ['blocked', '연동 대기']];
  return (
    <Card>
      <CardHeader className="border-b">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle>저장소 상세</CardTitle>
            <p className="mt-1 text-xs font-semibold text-muted-foreground">수집된 신호, 실행 로그, 분석 이력을 필요할 때만 열어 확인합니다.</p>
          </div>
          <div className="flex flex-wrap gap-2">{tabs.map(([id, label]) => <Button key={id} size="sm" variant={activeTab === id ? 'default' : 'outline'} onClick={() => setActiveTab(id)}>{label}</Button>)}</div>
        </div>
      </CardHeader>
      <CardContent className="pt-5">{activeTab === 'channels' && <ChannelGrid {...props} />}{activeTab === 'signals' && <StoredSignals signals={props.signals} />}{activeTab === 'history' && <TrendHistory />}{activeTab === 'runs' && <RunLog runs={props.collectionRuns} />}{activeTab === 'blocked' && <BlockedSources sources={props.sources} />}</CardContent>
    </Card>
  );
}

function ChannelGrid({ sources, signalSources, signals, sourceRunStates, collectSource }) {
  const statusBySource = useMemo(() => new Map(signalSources.map((source) => [source.source, source])), [signalSources]);
  const countBySource = useMemo(() => signals.reduce((map, signal) => map.set(signal.source, (map.get(signal.source) ?? 0) + 1), new Map()), [signals]);
  const useful = sources.filter((source) => collectableSourceIds.includes(source.id));
  return <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{useful.map((source) => <SourceCard key={source.id} source={source} statusBySource={statusBySource} countBySource={countBySource} running={sourceRunStates[source.id]} collectSource={collectSource} />)}</div>;
}

function SourceCard({ source, statusBySource, countBySource, running, collectSource }) {
  const meta = sourceMetaById[source.id] ?? ['기타', source.name];
  const name = sourceNameById[source.id] ?? source.name;
  const status = statusBySource.get(name);
  const statusText = statusLabel(status?.status ?? source.status);
  return (
    <div className="rounded-lg border bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3"><div><strong className="block">{source.name}</strong><span className="text-xs text-muted-foreground">{meta[0]} · {meta[1]}</span></div><Badge variant={status?.status === 'ok' ? 'default' : 'secondary'}>{statusText}</Badge></div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-xs"><Mini label="저장" value={countBySource.get(name) ?? 0} /><Mini label="최근" value={status?.count ?? 0} /><Mini label="주기" value={`${source.interval}분`} /></div>
      {status?.finishedAt && <p className="mt-2 text-xs text-muted-foreground">마지막 수집: {formatTime(status.finishedAt)}</p>}
      <Button className="mt-3 w-full" variant="outline" size="sm" disabled={running} onClick={() => collectSource(source.id, 'storage-tab')}>{running ? '수집 중' : '지금 수집'}</Button>
    </div>
  );
}

function StoredSignals({ signals }) {
  const [selected, setSelected] = useState(null);
  const [source, setSource] = useState('all');
  const [quality, setQuality] = useState('useful');
  const [query, setQuery] = useState('');
  const sources = useMemo(() => [...new Set(signals.map((signal) => signal.source))], [signals]);
  const filtered = useMemo(() => filterSignals(signals, { source, quality, query }), [signals, source, quality, query]);
  return <div className="space-y-4"><SignalFilters {...{ source, setSource, quality, setQuality, query, setQuery, sources, count: filtered.length }} /><div className="max-h-[620px] overflow-y-auto pr-1"><div className="grid gap-3 lg:grid-cols-2">{filtered.slice(0, 100).map((signal) => <SignalCard key={signal.id} signal={signal} onClick={() => setSelected(signal)} />)}</div></div>{selected && <SignalDrawer signal={selected} onClose={() => setSelected(null)} />}</div>;
}

function SignalCard({ signal, onClick }) {
  const quality = getSignalQuality(signal);
  return <button type="button" onClick={onClick} className="rounded-lg border bg-white p-4 text-left transition hover:border-indigo-300 hover:bg-indigo-50/30"><div className="mb-3 flex flex-wrap items-center gap-2"><Badge variant="secondary">{getSignalKind(signal)}</Badge><Badge variant="outline">{signal.source}</Badge><Badge variant={quality.suspicious ? 'destructive' : 'default'}>{quality.label} {quality.score ?? signal.qualityScore}</Badge></div><strong className="line-clamp-2 block">{signal.title}</strong>{quality.reasons?.length > 0 && <p className="mt-2 text-xs text-muted-foreground">{quality.reasons.join(', ')}</p>}<div className="mt-3 flex flex-wrap justify-between gap-2 text-xs text-muted-foreground"><span>{getHostname(signal.url)}</span><span>{formatTime(signal.lastSeenAt ?? signal.collectedAt)}</span></div></button>;
}

function SignalFilters({ source, setSource, quality, setQuality, query, setQuery, sources, count }) {
  return <div className="grid gap-2 rounded-lg border bg-white p-3 md:grid-cols-[160px_160px_1fr_auto]"><select className="h-9 rounded-md border bg-white px-2 text-sm" value={source} onChange={(event) => setSource(event.target.value)}><option value="all">전체 출처</option>{sources.map((item) => <option key={item} value={item}>{item}</option>)}</select><select className="h-9 rounded-md border bg-white px-2 text-sm" value={quality} onChange={(event) => setQuality(event.target.value)}><option value="useful">보통 이상</option><option value="high">고품질만</option><option value="low">낮음 포함</option><option value="all">전체</option></select><input className="h-9 rounded-md border px-3 text-sm outline-none" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="제목, 요약 검색" /><Badge variant="secondary" className="h-9 justify-center">{count}건</Badge></div>;
}

function filterSignals(signals, { source, quality, query }) {
  const text = query.trim().toLowerCase();
  return signals.filter((signal) => {
    const q = getSignalQuality(signal);
    const sourceOk = source === 'all' || signal.source === source;
    const qualityOk = quality === 'all' || (quality === 'high' ? q.label === '고품질' : quality === 'useful' ? q.score >= 52 : true);
    const queryOk = !text || `${signal.title} ${signal.summary}`.toLowerCase().includes(text);
    return sourceOk && qualityOk && queryOk;
  }).sort((a, b) => (getSignalQuality(b).score ?? 0) - (getSignalQuality(a).score ?? 0) || new Date(b.lastSeenAt ?? b.collectedAt) - new Date(a.lastSeenAt ?? a.collectedAt));
}

function RunLog({ runs }) {
  return <div className="max-h-[460px] space-y-2 overflow-y-auto">{runs.map((run) => <div key={run.id} className="grid gap-2 rounded-lg border bg-slate-50 p-3 text-sm md:grid-cols-[120px_1fr_120px_140px]"><Badge variant={run.status === 'ok' ? 'default' : 'destructive'}>{statusLabel(run.status)}</Badge><div><strong>{run.source}</strong><p className="text-xs text-muted-foreground">{reasonLabel(run.reason)}</p></div><span>{run.count}건</span><span className="text-xs text-muted-foreground">{formatTime(run.finishedAt)}</span></div>)}</div>;
}

function BlockedSources({ sources }) {
  return <div className="grid gap-3 md:grid-cols-2">{sources.filter((source) => !collectableSourceIds.includes(source.id)).map((source) => <div key={source.id} className="rounded-lg border bg-slate-50 p-4"><div className="flex items-center justify-between gap-3"><strong>{source.name}</strong><Badge variant="outline">{statusLabel(source.status)}</Badge></div><p className="mt-2 text-sm text-muted-foreground">공식 권한 또는 로컬 로그인 세션이 필요합니다. 자동 수집 전 인증 전략을 먼저 정해야 합니다.</p></div>)}</div>;
}

function Mini({ label, value }) {
  return <span className="rounded-md bg-slate-50 p-2 text-muted-foreground">{label} <b className="text-slate-900">{value}</b></span>;
}

function statusLabel(value) {
  return {
    ok: '정상',
    active: '활성',
    failed: '실패',
    blocked: '대기',
    disabled: '비활성'
  }[value] ?? value ?? '대기';
}

function reasonLabel(value) {
  return {
    manual: '수동',
    'storage-tab': '수동 수집',
    collect: '수집'
  }[value] ?? (value?.startsWith?.('scheduled-') ? '정기 반영' : value ?? '-');
}
