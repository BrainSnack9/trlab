import { useEffect, useMemo, useState } from 'react';
import { Database, RefreshCcw, ShieldAlert, UploadCloud } from 'lucide-react';
import { Badge } from '@/core/TrLab/Components/Desktop/Atoms/TrLab/Common/Badge/Badge';
import { Button } from '@/core/TrLab/Components/Desktop/Atoms/TrLab/Common/Button/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/core/TrLab/Components/Desktop/Atoms/TrLab/Common/Card';
import { PageHero } from '@/core/TrLab/Components/Desktop/Molecules/TrLab/Common';
import { getDatabaseStatus, runDatabaseAction } from '@/core/TrLab/modules/clients/api';

const tableLabels = {
  signals: '수집 신호',
  collection_runs: '수집 로그',
  keyword_snapshots: '트렌드 스냅샷',
  content_plans: '콘텐츠 플랜',
  content_images: '이미지 결과',
  account_slots: '계정',
  channel_profiles: '프로필'
};

export function SettingsView() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [working, setWorking] = useState('');
  const [error, setError] = useState('');
  const [confirm, setConfirm] = useState('');
  const runtimeTotal = useMemo(() => sumCounts(status?.counts, status?.runtimeTables), [status]);
  const configTotal = useMemo(() => sumCounts(status?.counts, status?.configTables), [status]);

  const refresh = async () => {
    setLoading(true);
    setError('');
    try {
      setStatus(await getDatabaseStatus());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const runAction = async (payload) => {
    setWorking(payload.action);
    setError('');
    try {
      const data = await runDatabaseAction(payload);
      setStatus(data.result?.status ?? data.result ?? status);
      setConfirm('');
    } catch (err) {
      setError(err.message);
    } finally {
      setWorking('');
    }
  };

  useEffect(() => { refresh(); }, []);

  return (
    <div className="space-y-5">
      <PageHero title="설정" description="저장소 상태를 확인하고 개발용 DB 작업을 제한적으로 실행합니다.">
        <div className="mt-4 flex flex-wrap gap-2">
          <Badge variant="secondary">{status?.mode ?? '확인 중'}</Badge>
          <Badge variant="outline">런타임 {runtimeTotal.toLocaleString()}개</Badge>
          <Badge variant="outline">설정 {configTotal.toLocaleString()}개</Badge>
        </div>
      </PageHero>

      {error ? <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700">{error}</div> : null}

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
        <DatabaseStatusCard status={status} loading={loading} onRefresh={refresh} />
        <DatabaseActionsCard
          status={status}
          working={working}
          confirm={confirm}
          setConfirm={setConfirm}
          onMigrate={() => runAction({ action: 'migrate-sqlite', replaceRuntime: true })}
          onReset={() => runAction({ action: 'reset-runtime', confirm })}
        />
      </section>
    </div>
  );
}

function DatabaseStatusCard({ status, loading, onRefresh }) {
  const tables = [...(status?.runtimeTables ?? []), ...(status?.configTables ?? [])];
  return (
    <Card>
      <CardHeader className="border-b">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2"><Database className="h-5 w-5 text-indigo-600" />DB 상태</CardTitle>
          <Button variant="outline" size="sm" onClick={onRefresh} disabled={loading}><RefreshCcw className="h-4 w-4" />새로고침</Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-5">
        <div className="grid gap-3 md:grid-cols-3">
          <Metric label="Provider" value={status?.provider ?? '-'} />
          <Metric label="Mode" value={status?.mode ?? '-'} />
          <Metric label="Postgres" value={status?.postgresConfigured ? 'connected' : 'off'} />
        </div>
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {tables.map((table) => (
            <div key={table} className="rounded-md border bg-slate-50 p-3">
              <div className="text-xs font-black text-slate-500">{tableLabels[table] ?? table}</div>
              <div className="mt-1 text-lg font-black text-slate-950">{Number(status?.counts?.[table] ?? 0).toLocaleString()}</div>
              <div className="mt-1 text-[11px] font-semibold text-muted-foreground">{table}</div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function DatabaseActionsCard({ status, working, confirm, setConfirm, onMigrate, onReset }) {
  const busy = Boolean(working);
  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle className="flex items-center gap-2"><ShieldAlert className="h-5 w-5 text-amber-600" />DB 작업</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pt-5">
        <div className="rounded-lg border bg-slate-50 p-3">
          <div className="flex items-start gap-2">
            <UploadCloud className="mt-0.5 h-4 w-4 text-indigo-600" />
            <div>
              <div className="text-sm font-black text-slate-950">SQLite 데이터를 현재 DB로 이관</div>
              <p className="mt-1 text-xs font-semibold leading-5 text-muted-foreground">런타임 테이블을 비우고 SQLite 데이터를 다시 채웁니다. 설정 테이블은 upsert됩니다.</p>
            </div>
          </div>
          <Button className="mt-3 w-full" onClick={onMigrate} disabled={busy || status?.mode !== 'supabase'}>
            {working === 'migrate-sqlite' ? '이관 중' : 'SQLite → Supabase 이관'}
          </Button>
        </div>

        <div className="rounded-lg border border-red-100 bg-red-50/60 p-3">
          <div className="text-sm font-black text-red-900">런타임 데이터 초기화</div>
          <p className="mt-1 text-xs font-semibold leading-5 text-red-700">수집 신호, 스냅샷, 콘텐츠 플랜, 이미지 결과만 비웁니다. 계정/프로필은 유지됩니다.</p>
          <input
            className="mt-3 h-10 w-full rounded-md border border-red-200 bg-white px-3 text-sm font-bold outline-none focus:border-red-400"
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
            placeholder="RESET 입력"
          />
          <Button className="mt-2 w-full" variant="destructive" onClick={onReset} disabled={busy || confirm !== 'RESET'}>
            {working === 'reset-runtime' ? '초기화 중' : '런타임 데이터 초기화'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function Metric({ label, value }) {
  return (
    <div className="rounded-md border bg-white p-3">
      <div className="text-xs font-black text-slate-500">{label}</div>
      <div className="mt-1 truncate text-sm font-black text-slate-950">{value}</div>
    </div>
  );
}

function sumCounts(counts = {}, tables = []) {
  return tables.reduce((sum, table) => sum + Number(counts?.[table] ?? 0), 0);
}
