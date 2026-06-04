import { useState } from 'react';
import { SlidersHorizontal, Sparkles } from 'lucide-react';
import { Badge } from '@/core/TrLab/Components/Desktop/Atoms/TrLab/Common/Badge/Badge';
import { Button } from '@/core/TrLab/Components/Desktop/Atoms/TrLab/Common/Button/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/core/TrLab/Components/Desktop/Atoms/TrLab/Common/Card';
import { exclusionAreas, interestAreas } from '@/core/TrLab/modules/configs/constants';
import { tuneChannelProfile } from '@/core/TrLab/modules/clients/api';

const trendButtonClass = 'h-10 px-3 text-xs';

export function ScopeFilter({ selectedSet, excludedSet, selectedChannelProfiles, setSelectedChannelProfiles, channelProfiles, accountSlots, setSelectedAreas, setExcludedAreas, setView, reset }) {
  const toggleSelected = (id) => setSelectedAreas((areas) => areas.includes(id) ? areas.filter((v) => v !== id) : [...areas, id]);
  const toggleProfile = (id) => setSelectedChannelProfiles((profiles) => profiles.includes(id) ? profiles.filter((v) => v !== id) : [...profiles, id]);
  const toggleExcluded = (id) => setExcludedAreas((areas) => areas.includes(id) ? areas.filter((v) => v !== id) : [...areas, id]);
  const selectedProfileSet = new Set(selectedChannelProfiles ?? []);
  const profileItems = buildProfileFilterItems(channelProfiles ?? [], accountSlots ?? []);
  return (
    <Card className="bg-white/80">
      <CardHeader className="border-b">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2"><SlidersHorizontal className="h-5 w-5 text-indigo-600" />감지 범위</CardTitle>
            <p className="mt-1 text-xs font-semibold text-muted-foreground">계정 프로필은 후보 필터와 수집 seed에만 적용하고, 세부 관리는 계정 프로필 화면에서 합니다.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" className={trendButtonClass} onClick={() => setView('profiles')}>계정 프로필</Button>
            <Button variant="outline" size="sm" className={trendButtonClass} onClick={reset}>기본값</Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4 pt-5 xl:grid-cols-[1.15fr_1fr_1fr]">
        <ChipGroup
          title={`계정 프로필 · ${selectedProfileSet.size ? `${selectedProfileSet.size}개 적용` : '전체 보기'}`}
          items={profileItems}
          activeSet={selectedProfileSet}
          onToggle={toggleProfile}
          emptyText="계정 프로필 화면에서 운영 계정을 먼저 배정하세요."
        />
        <ChipGroup title={`관심 영역 · ${selectedSet.size ? `${selectedSet.size}개` : '꺼짐'}`} items={interestAreas} activeSet={selectedSet} onToggle={toggleSelected} />
        <ChipGroup title="제외 영역" items={exclusionAreas} activeSet={excludedSet} onToggle={toggleExcluded} danger />
      </CardContent>
    </Card>
  );
}

function buildProfileFilterItems(profiles, slots) {
  const profileMap = new Map(profiles.map((profile) => [profile.id, profile]));
  const assigned = slots
    .filter((slot) => slot.profileId && profileMap.has(slot.profileId))
    .map((slot) => {
      const profile = profileMap.get(slot.profileId);
      return {
        id: profile.id,
        key: slot.id,
        label: `${slot.label} · ${profile.label}`
      };
    });
  if (assigned.length) return assigned;
  return profiles.map((profile) => ({
    id: profile.id,
    key: profile.id,
    label: profile.label
  }));
}

function ChipGroup({ title, items, activeSet, onToggle, danger, emptyText = '선택 가능한 항목이 없습니다.' }) {
  return (
    <div className="min-w-0">
      <div className="mb-2 text-sm font-bold">{title}</div>
      <div className="flex max-h-24 flex-wrap gap-2 overflow-auto pr-1">
        {items.length ? items.map((item) => (
          <Button
            key={item.key ?? item.id}
            variant={activeSet.has(item.id) ? (danger ? 'destructive' : 'default') : 'outline'}
            size="sm"
            className={`${trendButtonClass} max-w-full rounded-md`}
            onClick={() => onToggle(item.id)}
          >
            <span className="truncate">{item.label}</span>
          </Button>
        )) : <span className="rounded-md border border-dashed bg-slate-50 px-3 py-2 text-xs font-semibold text-muted-foreground">{emptyText}</span>}
      </div>
    </div>
  );
}

export function ProfileEditor({ profiles, saveChannelProfile, deleteChannelProfile }) {
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
      keywords: lines(current.keywords),
      strategy: {
        audience: current.audience,
        goals: lines(current.goals),
        voice: current.voice,
        preferredFormats: lines(current.preferredFormats),
        avoidKeywords: lines(current.avoidKeywords),
        decisionRules: lines(current.decisionRules)
      }
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
        <ProfileDetail profile={selected} saveChannelProfile={saveChannelProfile} onEdit={startEdit} onDelete={remove} />
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
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          <input className="h-9 rounded-md border px-3 text-sm outline-none" value={current.audience} onChange={(event) => update({ audience: event.target.value })} placeholder="타깃 독자: 예) 30대 부모, 저장형 정보 선호" />
          <input className="h-9 rounded-md border px-3 text-sm outline-none" value={current.voice} onChange={(event) => update({ voice: event.target.value })} placeholder="말투: 예) 차분한 기준 제시형" />
          <textarea className="min-h-20 rounded-md border p-2 text-sm outline-none" value={current.goals} onChange={(event) => update({ goals: event.target.value })} placeholder="성장 목표, 줄바꿈: 저장&#10;공유&#10;팔로우 전환" />
          <textarea className="min-h-20 rounded-md border p-2 text-sm outline-none" value={current.preferredFormats} onChange={(event) => update({ preferredFormats: event.target.value })} placeholder="선호 포맷, 줄바꿈: 체크리스트형&#10;비교형&#10;랭킹형" />
          <textarea className="min-h-20 rounded-md border p-2 text-sm outline-none" value={current.avoidKeywords} onChange={(event) => update({ avoidKeywords: event.target.value })} placeholder="수집/랭킹 제외 키워드, 줄바꿈: 정치&#10;성인&#10;루머" />
          <textarea className="min-h-20 rounded-md border p-2 text-sm outline-none" value={current.decisionRules} onChange={(event) => update({ decisionRules: event.target.value })} placeholder="선정 기준, 줄바꿈: 저장할 기준이 있을 것&#10;구매/비교로 확장 가능할 것" />
        </div>
        <div className="mt-2 flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => setEditing(false)}>취소</Button>
          <Button size="sm" onClick={submit}>{current.id ? '저장' : '추가'}</Button>
        </div>
      </div>}
    </div>
  );
}

function ProfileDetail({ profile, saveChannelProfile, onEdit, onDelete }) {
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
      <div className="mt-3 grid gap-3 lg:grid-cols-3">
        <StrategyBlock title="타깃/말투" values={[profile.strategy?.audience, profile.strategy?.voice].filter(Boolean)} />
        <StrategyBlock title="성장 목표/포맷" values={[...(profile.strategy?.goals ?? []), ...(profile.strategy?.preferredFormats ?? [])]} />
        <StrategyBlock title="제외/선정 기준" values={[...(profile.strategy?.avoidKeywords ?? []).map((item) => `제외: ${item}`), ...(profile.strategy?.decisionRules ?? [])]} />
      </div>
      <ProfileTunePanel profile={profile} saveChannelProfile={saveChannelProfile} />
    </div>
  );
}

const tuneFields = [
  { id: 'seeds', label: '검색 시드', hint: '수집 검색어를 넓힐 때' },
  { id: 'keywords', label: '판정 키워드', hint: '랭킹 적합도를 세밀하게' },
  { id: 'preferredFormats', label: '선호 포맷', hint: '콘텐츠화 방향 고정' },
  { id: 'avoidKeywords', label: '제외 키워드', hint: '품질 낮은 후보 차단' },
  { id: 'decisionRules', label: '선정 기준', hint: 'AI 판단 기준 보강' },
  { id: 'reddit', label: '레딧 채널', hint: '영문권 보조 소스' },
  { id: 'goals', label: '성장 목표', hint: '저장/공유/전환 목적' }
];

function ProfileTunePanel({ profile, saveChannelProfile }) {
  const [field, setField] = useState('seeds');
  const [context, setContext] = useState('');
  const [state, setState] = useState({ loading: false, error: '', suggestions: [], provider: '' });
  const selectedField = tuneFields.find((item) => item.id === field) ?? tuneFields[0];
  const currentValues = getProfileFieldValues(profile, field);
  const generate = async () => {
    setState({ loading: true, error: '', suggestions: [], provider: '' });
    try {
      const data = await tuneChannelProfile({ profile, field, context });
      setState({ loading: false, error: '', suggestions: data.suggestions ?? [], provider: data.provider ?? '' });
    } catch (error) {
      setState({ loading: false, error: error.message, suggestions: [], provider: '' });
    }
  };
  const addItem = async (item) => {
    const saved = await saveChannelProfile(addProfileFieldValue(profile, field, item));
    setState((current) => ({
      ...current,
      suggestions: current.suggestions.filter((value) => value !== item && !getProfileFieldValues(saved, field).includes(value))
    }));
  };

  return (
    <div className="mt-4 rounded-lg border border-indigo-100 bg-white p-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm font-black text-slate-950">
            <Sparkles className="h-4 w-4 text-indigo-600" />
            AI 프로필 튜닝
          </div>
          <p className="mt-1 text-xs font-semibold leading-5 text-muted-foreground">필요한 항목만 추천받아 기존 프로필에 바로 추가합니다.</p>
        </div>
        {state.provider ? <Badge variant="outline">{state.provider}</Badge> : null}
      </div>

      <div className="mt-3 grid gap-3 xl:grid-cols-[220px_minmax(0,1fr)]">
        <div className="grid gap-2">
          {tuneFields.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`rounded-md border px-3 py-2 text-left transition ${field === item.id ? 'border-indigo-300 bg-indigo-50 text-indigo-950' : 'bg-white hover:bg-slate-50'}`}
              onClick={() => {
                setField(item.id);
                setState({ loading: false, error: '', suggestions: [], provider: '' });
              }}
            >
              <span className="block text-xs font-black">{item.label}</span>
              <span className="mt-1 block text-[11px] font-semibold text-muted-foreground">{item.hint}</span>
            </button>
          ))}
        </div>
        <div className="min-w-0 space-y-3">
          <div className="rounded-md border bg-slate-50 p-3">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <strong className="text-sm font-black text-slate-900">{selectedField.label}</strong>
              <Badge variant="secondary">현재 {currentValues.length}개</Badge>
            </div>
            <div className="flex max-h-24 flex-wrap gap-1.5 overflow-auto pr-1">
              {currentValues.length ? currentValues.slice(0, 18).map((value) => <Badge key={value} variant="outline">{value}</Badge>) : <span className="text-xs font-semibold text-muted-foreground">아직 등록된 값이 없습니다.</span>}
            </div>
          </div>
          <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_auto]">
            <input
              className="h-10 rounded-md border px-3 text-sm font-semibold outline-none focus:border-indigo-300"
              value={context}
              onChange={(event) => setContext(event.target.value)}
              placeholder="선택 입력: 예) 30대 직장인에게 맞게, 검색검증 잘 되는 표현으로"
            />
            <Button onClick={generate} disabled={state.loading}>
              <Sparkles className="h-4 w-4" />
              {state.loading ? '추천 중' : '추천 받기'}
            </Button>
          </div>
          {state.error ? <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700">{state.error}</div> : null}
          <div className="flex flex-wrap gap-2">
            {state.suggestions.length ? state.suggestions.map((item) => (
              <button
                key={item}
                type="button"
                className="rounded-md border border-indigo-100 bg-indigo-50 px-2.5 py-1.5 text-xs font-black text-indigo-900 transition hover:border-indigo-300 hover:bg-indigo-100"
                onClick={() => addItem(item)}
              >
                + {item}
              </button>
            )) : <div className="rounded-md border border-dashed bg-slate-50 p-3 text-xs font-semibold text-muted-foreground">추천을 받으면 추가 가능한 후보가 여기에 나타납니다.</div>}
          </div>
        </div>
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

function StrategyBlock({ title, values = [] }) {
  return (
    <div className="rounded-md border bg-white p-3">
      <div className="mb-2 text-xs font-black text-slate-500">{title}</div>
      <div className="space-y-1">
        {values.length ? values.slice(0, 8).map((value) => <div key={value} className="rounded bg-indigo-50 px-2 py-1 text-xs font-semibold text-indigo-900">{value}</div>) : <div className="text-xs text-muted-foreground">없음</div>}
      </div>
    </div>
  );
}

function getProfileFieldValues(profile, field) {
  if (!profile) return [];
  if (['goals', 'preferredFormats', 'avoidKeywords', 'decisionRules'].includes(field)) {
    return profile.strategy?.[field] ?? [];
  }
  return profile[field] ?? [];
}

function addProfileFieldValue(profile, field, item) {
  const value = `${item ?? ''}`.trim();
  if (!value) return profile;
  const currentValues = getProfileFieldValues(profile, field);
  const nextValues = [...new Set([...currentValues, value])];
  if (['goals', 'preferredFormats', 'avoidKeywords', 'decisionRules'].includes(field)) {
    return {
      ...profile,
      strategy: {
        ...(profile.strategy ?? {}),
        [field]: nextValues
      }
    };
  }
  return {
    ...profile,
    [field]: nextValues
  };
}

function emptyProfile() {
  return { id: '', label: '', description: '', seeds: '', reddit: '', keywords: '', audience: '', goals: '저장\n공유', voice: '', preferredFormats: '체크리스트형\n비교형', avoidKeywords: '정치\n성인\n루머', decisionRules: '' };
}

function profileToDraft(profile) {
  return {
    id: profile.id,
    label: profile.label ?? '',
    description: profile.description ?? '',
    seeds: (profile.seeds ?? []).join('\n'),
    reddit: (profile.reddit ?? []).join('\n'),
    keywords: (profile.keywords ?? []).join('\n'),
    audience: profile.strategy?.audience ?? '',
    goals: (profile.strategy?.goals ?? []).join('\n'),
    voice: profile.strategy?.voice ?? '',
    preferredFormats: (profile.strategy?.preferredFormats ?? []).join('\n'),
    avoidKeywords: (profile.strategy?.avoidKeywords ?? []).join('\n'),
    decisionRules: (profile.strategy?.decisionRules ?? []).join('\n')
  };
}

function lines(value) {
  return `${value ?? ''}`.split(/\n|,/).map((item) => item.trim()).filter(Boolean);
}


export function CandidateBoard({ candidates, selectedCandidate, onSelectCandidate, feedbackActions = {} }) {
  return (
    <Card>
      <CardHeader className="border-b">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-indigo-600" />
            제작 후보 보드
          </CardTitle>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Badge variant="secondary">{candidates.length}개 후보</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-5">{candidates.length ? <div data-testid="keyword-candidates" className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">{candidates.map((candidate, index) => <CandidateCard key={`${index}-${candidate.keyword}`} candidate={candidate} index={index} selected={getCandidateId(candidate) === getCandidateId(selectedCandidate)} feedbackAction={feedbackActions[getCandidateId(candidate)]} onSelectCandidate={onSelectCandidate} />)}</div> : <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">수집 데이터가 들어오면 제작 가능한 후보 카드가 표시됩니다.</p>}</CardContent>
    </Card>
  );
}

function CandidateCard({ candidate, index, selected, feedbackAction, onSelectCandidate }) {
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
          <div className="flex flex-wrap gap-1.5"><Badge variant="secondary">{candidate.area?.label}</Badge>{profile && <Badge variant="outline">{profile.label}</Badge>}<TierBadge tier={candidate.production?.tier ?? '검증'} />{feedbackAction === 'positive' && <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">좋음 학습</Badge>}{candidate.searchVerification && <Badge variant="outline">검색 {candidate.searchVerification.grade}</Badge>}</div>
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
