import { useMemo, useState } from 'react';
import { Bot, Check, GripVertical, Plus, Sparkles, Trash2 } from 'lucide-react';
import { Badge } from '@/core/TrLab/Components/Desktop/Atoms/TrLab/Common/Badge/Badge';
import { Button } from '@/core/TrLab/Components/Desktop/Atoms/TrLab/Common/Button/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/core/TrLab/Components/Desktop/Atoms/TrLab/Common/Card';
import { PageHero } from '@/core/TrLab/Components/Desktop/Molecules/TrLab/Common';
import { ProfileEditor } from '@/core/TrLab/Components/Desktop/Organisms/TrLab/Dashboard/DashboardWidgets';
import { suggestChannelProfile } from '@/core/TrLab/modules/clients/api';

export function ProfileView({ channelProfiles, saveChannelProfile, deleteChannelProfile, selectedChannelProfiles, setSelectedChannelProfiles, accountSlots, setAccountSlots }) {
  const profiles = channelProfiles ?? [];
  const assignedProfileIds = useMemo(() => [...new Set((accountSlots ?? []).map((slot) => slot.profileId).filter(Boolean))], [accountSlots]);
  const assignedCount = (accountSlots ?? []).filter((slot) => slot.profileId).length;
  const applyAssignedProfiles = () => setSelectedChannelProfiles(assignedProfileIds);

  return (
    <div className="space-y-5">
      <PageHero title="계정 프로필" description="운영 계정을 필요한 만큼 만들고, 계정마다 수집과 판단 기준이 되는 프로필을 배정합니다.">
        <div className="mt-4 flex flex-wrap gap-2">
          <Badge variant="secondary">배정 {assignedCount}개</Badge>
          <Badge variant="outline">계정 {(accountSlots ?? []).length}개</Badge>
          <Badge variant="outline">프로필 {profiles.length}개</Badge>
        </div>
      </PageHero>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
        <AccountSlotBoard
          slots={accountSlots ?? []}
          profiles={profiles}
          selectedChannelProfiles={selectedChannelProfiles ?? []}
          setAccountSlots={setAccountSlots}
          setSelectedChannelProfiles={setSelectedChannelProfiles}
          onApplyAll={applyAssignedProfiles}
        />
        <ProfileSuggestionPanel
          profiles={profiles}
          saveChannelProfile={saveChannelProfile}
          setAccountSlots={setAccountSlots}
          setSelectedChannelProfiles={setSelectedChannelProfiles}
        />
      </section>

      <ProfileEditor profiles={profiles} saveChannelProfile={saveChannelProfile} deleteChannelProfile={deleteChannelProfile} />
    </div>
  );
}

function AccountSlotBoard({ slots, profiles, selectedChannelProfiles, setAccountSlots, setSelectedChannelProfiles, onApplyAll }) {
  const profileMap = useMemo(() => new Map(profiles.map((profile) => [profile.id, profile])), [profiles]);
  const assigned = slots.filter((slot) => slot.profileId).length;
  const assignProfile = (slotId, profileId) => {
    setAccountSlots((items = []) => items.map((slot) => slot.id === slotId ? { ...slot, profileId } : slot));
  };
  const renameSlot = (slotId, label) => setAccountSlots((items = []) => items.map((slot) => slot.id === slotId ? { ...slot, label } : slot));
  const clearSlot = (slotId) => setAccountSlots((items = []) => items.map((slot) => slot.id === slotId ? { ...slot, profileId: '' } : slot));
  const addSlot = () => setAccountSlots((items = []) => [...items, createAccountSlot(items)]);
  const removeSlot = (slotId) => setAccountSlots((items = []) => items.filter((slot) => slot.id !== slotId));
  const applySlot = (profileId) => profileId && setSelectedChannelProfiles([profileId]);

  return (
    <Card>
      <CardHeader className="border-b">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle>계정 슬롯</CardTitle>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">배정 {assigned}개 · 전체 {slots.length}개</Badge>
            <Button size="sm" variant="outline" onClick={addSlot}><Plus className="h-3.5 w-3.5" />계정 추가</Button>
            <Button size="sm" onClick={onApplyAll} disabled={!assigned}>배정 계정 전체 적용</Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-5">
        <ProfileDragShelf profiles={profiles} />
        {!slots.length ? (
          <div className="grid min-h-44 place-items-center rounded-lg border border-dashed bg-slate-50 p-6 text-center">
            <div>
              <div className="text-sm font-black text-slate-900">아직 등록된 계정이 없습니다.</div>
              <p className="mt-1 text-xs font-semibold leading-5 text-muted-foreground">운영할 계정이 생길 때마다 필요한 만큼 추가하세요.</p>
              <Button className="mt-3" size="sm" onClick={addSlot}><Plus className="h-3.5 w-3.5" />계정 추가</Button>
            </div>
          </div>
        ) : <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
          {slots.map((slot) => {
            const profile = profileMap.get(slot.profileId);
            const active = Boolean(profile && selectedChannelProfiles.includes(profile.id));
            return (
              <div
                key={slot.id}
                className={['rounded-lg border bg-white p-3 transition', active ? 'border-indigo-300 ring-2 ring-indigo-100' : 'border-slate-200'].join(' ')}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault();
                  const profileId = event.dataTransfer.getData('text/plain');
                  if (profileId) assignProfile(slot.id, profileId);
                }}
              >
                <div className="mb-3 flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <span className="block text-[11px] font-black text-slate-400">계정 이름</span>
                    <input aria-label="계정 이름" className="mt-1 w-full rounded-md border border-transparent bg-slate-50 px-2 py-1 text-sm font-black outline-none focus:border-indigo-300" value={slot.label} onChange={(event) => renameSlot(slot.id, event.target.value)} />
                    <span className="mt-1 block text-[10px] font-bold text-slate-400">{slot.id}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Badge variant={active ? 'default' : 'outline'}>{active ? '적용중' : '대기'}</Badge>
                    <Button size="sm" variant="outline" aria-label={`${slot.label} 계정 삭제`} onClick={() => removeSlot(slot.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>
                {profile ? (
                  <div className="rounded-md border border-indigo-100 bg-indigo-50/60 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <strong className="line-clamp-1 block text-sm font-black text-indigo-950">{profile.label}</strong>
                        <p className="mt-1 line-clamp-2 text-xs font-semibold leading-5 text-indigo-900">{profile.strategy?.audience || profile.description}</p>
                      </div>
                      <GripVertical className="h-4 w-4 shrink-0 text-indigo-400" />
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1">
                      {(profile.strategy?.goals ?? []).slice(0, 3).map((goal) => <Badge key={goal} variant="secondary">{goal}</Badge>)}
                    </div>
                    <div className="mt-3 flex gap-2">
                      <Button size="sm" className="flex-1" onClick={() => applySlot(profile.id)}><Check className="h-3.5 w-3.5" />이 계정만 보기</Button>
                      <Button size="sm" variant="outline" aria-label={`${slot.label} 프로필 배정 해제`} onClick={() => clearSlot(slot.id)}>해제</Button>
                    </div>
                  </div>
                ) : (
                  <div className="grid min-h-32 place-items-center rounded-md border border-dashed bg-slate-50 p-4 text-center text-xs font-bold leading-5 text-muted-foreground">
                    프로필 카드를 여기로 드래그하거나 아래 선택창에서 배정
                  </div>
                )}
                <select className="mt-3 h-9 w-full rounded-md border bg-white px-2 text-sm font-semibold" value={slot.profileId} onChange={(event) => assignProfile(slot.id, event.target.value)}>
                  <option value="">프로필 선택</option>
                  {profiles.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
                </select>
              </div>
            );
          })}
        </div>}
      </CardContent>
    </Card>
  );
}

function ProfileDragShelf({ profiles }) {
  return (
    <div className="rounded-lg border bg-slate-50 p-3">
      <div className="mb-2 text-sm font-black text-slate-700">프로필 목록에서 드래그</div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {profiles.map((profile) => (
          <div
            key={profile.id}
            draggable
            onDragStart={(event) => event.dataTransfer.setData('text/plain', profile.id)}
            className="min-w-52 cursor-grab rounded-md border bg-white p-3 shadow-sm active:cursor-grabbing"
          >
            <div className="flex items-center gap-2">
              <GripVertical className="h-4 w-4 text-slate-400" />
              <strong className="line-clamp-1 text-sm font-black text-slate-900">{profile.label}</strong>
            </div>
            <p className="mt-1 line-clamp-2 text-xs font-semibold leading-5 text-muted-foreground">{profile.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProfileSuggestionPanel({ profiles, saveChannelProfile, setAccountSlots, setSelectedChannelProfiles }) {
  const [title, setTitle] = useState('');
  const [state, setState] = useState({ loading: false, error: '', suggestion: null, provider: '' });
  const canGenerate = title.trim().length >= 2 && !state.loading;
  const generate = async () => {
    if (!canGenerate) return;
    setState({ loading: true, error: '', suggestion: null, provider: '' });
    try {
      const data = await suggestChannelProfile(title.trim());
      setState({ loading: false, error: '', suggestion: data.profile, provider: data.provider });
    } catch (error) {
      setState({ loading: false, error: error.message, suggestion: null, provider: '' });
    }
  };
  const saveSuggestion = async () => {
    if (!state.suggestion) return;
    const saved = await saveChannelProfile(state.suggestion);
    setState((current) => ({ ...current, suggestion: saved }));
  };
  const saveAndAssign = async () => {
    if (!state.suggestion) return;
    const saved = await saveChannelProfile(state.suggestion);
    setAccountSlots((slots = []) => {
      const target = slots.find((slot) => !slot.profileId);
      if (!target) return [...slots, createAccountSlot(slots, saved.id, saved.label)];
      return slots.map((slot) => slot.id === target.id ? { ...slot, profileId: saved.id } : slot);
    });
    setSelectedChannelProfiles([saved.id]);
    setState((current) => ({ ...current, suggestion: saved }));
  };

  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle className="flex items-center gap-2"><Bot className="h-5 w-5 text-indigo-600" />AI 프로필 추천</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pt-5">
        <div className="grid gap-2">
          <input className="h-10 rounded-md border px-3 text-sm font-semibold outline-none focus:border-indigo-400" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="예: 30대 직장인 재테크 계정" />
          <Button onClick={generate} disabled={!canGenerate}><Sparkles className="h-4 w-4" />{state.loading ? '추천 생성 중' : '프로필 추천 생성'}</Button>
        </div>
        {state.error ? <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700">{state.error}</div> : null}
        {state.suggestion ? <SuggestionPreview profile={state.suggestion} provider={state.provider} onSave={saveSuggestion} onAssign={saveAndAssign} exists={profiles.some((profile) => profile.id === state.suggestion.id)} /> : (
          <div className="rounded-lg border border-dashed bg-slate-50 p-4 text-sm font-semibold leading-6 text-muted-foreground">프로필 제목만 넣으면 seed, 키워드, 타깃, 제외 기준을 추천합니다.</div>
        )}
      </CardContent>
    </Card>
  );
}

function SuggestionPreview({ profile, provider, onSave, onAssign, exists }) {
  return (
    <div className="space-y-3 rounded-lg border border-indigo-100 bg-indigo-50/50 p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <Badge variant="outline">{provider || 'ai'}</Badge>
          <h3 className="mt-2 text-base font-black text-slate-950">{profile.label}</h3>
          <p className="mt-1 text-xs font-semibold leading-5 text-slate-600">{profile.description}</p>
        </div>
        {exists ? <Badge variant="secondary">이미 있음</Badge> : null}
      </div>
      <MiniList title="검색 seed" values={profile.seeds} />
      <MiniList title="키워드" values={profile.keywords} />
      <MiniList title="전략" values={[profile.strategy?.audience, ...(profile.strategy?.goals ?? []), ...(profile.strategy?.preferredFormats ?? [])].filter(Boolean)} />
      <div className="grid gap-2 sm:grid-cols-2">
        <Button variant="outline" onClick={onSave}>프로필로 저장</Button>
        <Button onClick={onAssign}>저장하고 빈 계정에 적용</Button>
      </div>
    </div>
  );
}

function MiniList({ title, values = [] }) {
  return (
    <div>
      <div className="mb-1 text-xs font-black text-slate-500">{title}</div>
      <div className="flex flex-wrap gap-1">
        {values.slice(0, 8).map((value) => <Badge key={value} variant="secondary">{value}</Badge>)}
      </div>
    </div>
  );
}

function createAccountSlot(slots = [], profileId = '', label = '') {
  const ids = new Set(slots.map((slot) => slot.id));
  let index = slots.length + 1;
  let id = `account-${index}`;
  while (ids.has(id)) {
    index += 1;
    id = `account-${index}`;
  }
  return {
    id,
    label: label ? `${label} 계정` : `계정 ${index}`,
    profileId,
    sortOrder: slots.length
  };
}
