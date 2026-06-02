import { useState } from 'react';
import { Eraser, SlidersHorizontal, Sparkles } from 'lucide-react';
import { Badge } from '@/core/TrLab/Components/Desktop/Atoms/TrLab/Common/Badge/Badge';
import { Button } from '@/core/TrLab/Components/Desktop/Atoms/TrLab/Common/Button/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/core/TrLab/Components/Desktop/Atoms/TrLab/Common/Card';
import { exclusionAreas, interestAreas } from '@/core/TrLab/modules/configs/constants';

export function ScopeFilter({ selectedSet, excludedSet, selectedChannelProfiles, setSelectedChannelProfiles, channelProfiles, setSelectedAreas, setExcludedAreas, saveChannelProfile, deleteChannelProfile, reset }) {
  const toggleSelected = (id) => setSelectedAreas((areas) => areas.includes(id) ? areas.filter((v) => v !== id) : [...areas, id]);
  const toggleProfile = (id) => setSelectedChannelProfiles((profiles) => profiles.includes(id) ? profiles.filter((v) => v !== id) : [...profiles, id]);
  const toggleExcluded = (id) => setExcludedAreas((areas) => areas.includes(id) ? areas.filter((v) => v !== id) : [...areas, id]);
  const selectedProfileSet = new Set(selectedChannelProfiles ?? []);
  return (
    <Card className="bg-white/80">
      <CardHeader className="border-b"><div className="flex flex-wrap items-center justify-between gap-3"><CardTitle className="flex items-center gap-2"><SlidersHorizontal className="h-5 w-5 text-indigo-600" />채널 프로필과 필터</CardTitle><Button variant="outline" size="sm" onClick={reset}>기본값</Button></div></CardHeader>
      <CardContent className="space-y-5 pt-5">
        <ChipGroup title={`운영 채널 프로필 · ${selectedProfileSet.size}개 선택`} items={channelProfiles ?? []} activeSet={selectedProfileSet} onToggle={toggleProfile} />
        <ProfileEditor profiles={channelProfiles ?? []} saveChannelProfile={saveChannelProfile} deleteChannelProfile={deleteChannelProfile} />
        <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        <ChipGroup title={`보고 싶은 영역 · ${selectedSet.size ? `${selectedSet.size}개 영역` : '꺼짐'}`} items={interestAreas} activeSet={selectedSet} onToggle={toggleSelected} />
        <ChipGroup title="자동 제외 영역" items={exclusionAreas} activeSet={excludedSet} onToggle={toggleExcluded} danger />
        </div>
      </CardContent>
    </Card>
  );
}

function ChipGroup({ title, items, activeSet, onToggle, danger }) {
  return <div><div className="mb-2 text-sm font-bold">{title}</div><div className="flex max-h-28 flex-wrap gap-2 overflow-auto pr-1">{items.map((item) => <Button key={item.id} variant={activeSet.has(item.id) ? (danger ? 'destructive' : 'default') : 'outline'} size="sm" className="h-8 rounded-md px-2.5 text-xs" onClick={() => onToggle(item.id)}>{item.label}</Button>)}</div></div>;
}

function ProfileEditor({ profiles, saveChannelProfile, deleteChannelProfile }) {
  const [selectedId, setSelectedId] = useState(profiles[0]?.id ?? '');
  const selected = profiles.find((profile) => profile.id === selectedId) ?? profiles[0];
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(emptyProfile());
  const current = draft;
  const update = (patch) => setDraft((value) => ({ ...value, ...patch }));
  const choose = (id) => {
    setSelectedId(id);
    setEditing(false);
    setDraft(emptyProfile());
  };
  const startCreate = () => {
    setEditing(true);
    setDraft(emptyProfile());
  };
  const startEdit = () => {
    if (!selected) return;
    setEditing(true);
    setDraft(profileToDraft(selected));
  };
  const submit = async () => {
    const saved = await saveChannelProfile({
      ...current,
      seeds: lines(current.seeds),
      reddit: lines(current.reddit),
      keywords: lines(current.keywords)
    });
    setSelectedId(saved?.id ?? current.id ?? '');
    setEditing(false);
    setDraft(emptyProfile());
  };
  const remove = async () => {
    if (!selected?.id) return;
    await deleteChannelProfile(selected.id);
    setSelectedId('');
    setEditing(false);
  };
  return (
    <div className="space-y-3 rounded-lg border bg-white p-3">
      <div className="grid gap-3 lg:grid-cols-[220px_minmax(0,1fr)]">
        <div>
          <div className="mb-2 flex items-center justify-between gap-2">
            <div className="text-sm font-bold">프로필 목록</div>
            <Button size="sm" onClick={startCreate}>추가</Button>
          </div>
          <div className="max-h-64 space-y-2 overflow-auto pr-1">
            {profiles.map((profile) => (
              <button key={profile.id} type="button" className={`w-full rounded-md border px-3 py-2 text-left text-sm font-bold transition ${selected?.id === profile.id ? 'border-indigo-300 bg-indigo-50 text-indigo-950' : 'bg-white hover:bg-slate-50'}`} onClick={() => choose(profile.id)}>
                <span className="block truncate">{profile.label}</span>
                <span className="mt-1 block truncate text-xs font-medium text-muted-foreground">{profile.description || profile.id}</span>
              </button>
            ))}
          </div>
        </div>
        <ProfileDetail profile={selected} onEdit={startEdit} onDelete={remove} />
      </div>
      {editing && <div className="rounded-md border bg-slate-50 p-3">
        <div className="mb-2 text-sm font-bold">{current.id ? '프로필 수정' : '프로필 추가'}</div>
        <div className="grid gap-2 md:grid-cols-[180px_1fr_1fr]">
          <input className="h-9 rounded-md border px-3 text-sm outline-none" value={current.id ?? ''} onChange={(event) => update({ id: event.target.value })} placeholder="프로필 ID" disabled={Boolean(current.id && selected?.id === current.id)} />
          <input className="h-9 rounded-md border px-3 text-sm outline-none" value={current.label} onChange={(event) => update({ label: event.target.value })} placeholder="프로필 이름" />
          <input className="h-9 rounded-md border px-3 text-sm outline-none" value={current.description} onChange={(event) => update({ description: event.target.value })} placeholder="설명" />
        </div>
        <div className="mt-2 grid gap-2 md:grid-cols-3">
        <textarea className="min-h-20 rounded-md border p-2 text-sm outline-none" value={current.seeds} onChange={(event) => update({ seeds: event.target.value })} placeholder="검색 시드, 줄바꿈으로 입력" />
        <textarea className="min-h-20 rounded-md border p-2 text-sm outline-none" value={current.reddit} onChange={(event) => update({ reddit: event.target.value })} placeholder="레딧 채널명, 줄바꿈으로 입력" />
        <textarea className="min-h-20 rounded-md border p-2 text-sm outline-none" value={current.keywords} onChange={(event) => update({ keywords: event.target.value })} placeholder="판정 키워드, 줄바꿈으로 입력" />
        </div>
        <div className="mt-2 flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => setEditing(false)}>취소</Button>
          <Button size="sm" onClick={submit}>{current.id ? '저장' : '추가'}</Button>
        </div>
      </div>}
    </div>
  );
}

function ProfileDetail({ profile, onEdit, onDelete }) {
  if (!profile) return <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">등록된 프로필이 없습니다.</div>;
  return (
    <div className="rounded-md border bg-slate-50 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-xs font-black text-slate-500">{profile.id}</div>
          <h3 className="mt-1 text-lg font-black text-slate-950">{profile.label}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{profile.description || '설명 없음'}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onEdit}>수정</Button>
          <Button variant="outline" size="sm" onClick={onDelete}>삭제</Button>
        </div>
      </div>
      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        <ValueList title={`검색 시드 ${profile.seeds?.length ?? 0}개`} values={profile.seeds} />
        <ValueList title={`레딧 채널 ${profile.reddit?.length ?? 0}개`} values={profile.reddit} />
        <ValueList title={`키워드 ${profile.keywords?.length ?? 0}개`} values={profile.keywords} />
      </div>
    </div>
  );
}

function ValueList({ title, values = [] }) {
  return (
    <div className="rounded-md border bg-white p-3">
      <div className="mb-2 text-xs font-black text-slate-500">{title}</div>
      <div className="max-h-36 space-y-1 overflow-auto pr-1">
        {values.length ? values.map((value) => <div key={value} className="rounded bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-700">{value}</div>) : <div className="text-xs text-muted-foreground">없음</div>}
      </div>
    </div>
  );
}

function emptyProfile() {
  return { id: '', label: '', description: '', seeds: '', reddit: '', keywords: '' };
}

function profileToDraft(profile) {
  return {
    id: profile.id,
    label: profile.label ?? '',
    description: profile.description ?? '',
    seeds: (profile.seeds ?? []).join('\n'),
    reddit: (profile.reddit ?? []).join('\n'),
    keywords: (profile.keywords ?? []).join('\n')
  };
}

function lines(value) {
  return `${value ?? ''}`.split(/\n|,/).map((item) => item.trim()).filter(Boolean);
}


export function TrendProcessingStatus({ trends, loading, onRefresh, onCollect, onClear, collecting, clearing, hasSignals }) {
  const clearDisabled = loading || collecting || clearing || (!hasSignals && !trends.length);
  return (
    <Card className="border-indigo-200 bg-indigo-50/55">
      <CardContent className="grid gap-3 p-4 lg:grid-cols-[1fr_auto] lg:items-center">
        <div>
          <h2 className="text-base font-black leading-tight text-slate-950">AI 트렌드 분석</h2>
          <p className="mt-1 text-sm font-bold leading-5 text-slate-700">기본 화면은 최신 저장 랭킹을 빠르게 보여주고, 필요할 때 AI 재분석을 실행합니다.</p>
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          <Button variant="outline" className="min-h-[42px]" onClick={onCollect} disabled={collecting || clearing}>
            {collecting ? '수집 중' : '트렌드 수집'}
          </Button>
          <Button variant="outline" className="min-h-[42px]" onClick={onClear} disabled={clearDisabled}>
            <Eraser className="h-4 w-4" />{clearing ? '비우는 중' : '비우기'}
          </Button>
          <Button className="min-h-[42px]" onClick={onRefresh} disabled={loading || clearing}>
            {loading ? '분석 중' : 'AI 분석'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function CandidateBoard({ candidates, selectedCandidate, onSelectCandidate }) {
  return (
    <Card className="flex h-full min-h-0 flex-col">
      <CardHeader className="border-b"><div className="flex items-center justify-between gap-3"><CardTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-indigo-600" />제작 후보 보드</CardTitle><Badge variant="secondary">{candidates.length}개 후보</Badge></div></CardHeader>
      <CardContent className="min-h-0 flex-1 overflow-auto pt-5">{candidates.length ? <div data-testid="keyword-candidates" className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">{candidates.slice(0, 8).map((candidate, index) => <CandidateCard key={`${index}-${candidate.keyword}`} candidate={candidate} index={index} selected={getCandidateId(candidate) === getCandidateId(selectedCandidate)} onSelectCandidate={onSelectCandidate} />)}</div> : <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">수집 데이터가 들어오면 제작 가능한 후보 카드가 표시됩니다.</p>}</CardContent>
    </Card>
  );
}

function CandidateCard({ candidate, index, selected, onSelectCandidate }) {
  const evidence = getCandidateEvidence(candidate);
  const score = candidate.production?.score ?? candidate.score ?? 0;
  const reaction = candidate.scoring?.communityReaction ?? 0;
  const profile = candidate.channelFit?.bestProfile;

  return (
    <button type="button" className="text-left font-bold" onClick={() => onSelectCandidate(candidate)}>
      <Card className={`h-full bg-white shadow-none transition hover:border-indigo-300 hover:bg-indigo-50/30 ${selected ? 'border-indigo-300 bg-indigo-50/40 ring-2 ring-indigo-100' : ''}`}>
        <CardContent className="space-y-3 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <span className="text-xs font-black text-slate-500">#{index + 1}</span>
              <strong className="mt-1 line-clamp-2 block text-lg leading-tight">{candidate.keyword}</strong>
            </div>
            <ScoreBadge score={score} />
          </div>
          <div className="flex flex-wrap gap-1.5"><Badge variant="secondary">{candidate.area?.label}</Badge>{profile && <Badge variant="outline">{profile.label}</Badge>}<TierBadge tier={candidate.production?.tier ?? '검증'} />{candidate.searchVerification && <Badge variant="outline">검색 {candidate.searchVerification.grade}</Badge>}</div>
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

function getCandidateId(candidate) {
  return candidate?.id ?? `${candidate?.keyword ?? candidate?.label ?? ''}`;
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
