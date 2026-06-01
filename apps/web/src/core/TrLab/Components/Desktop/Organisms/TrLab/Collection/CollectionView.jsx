import { Activity, Clock3, Rss, ServerCog, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/core/TrLab/Components/Desktop/Atoms/TrLab/Common/Button/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/core/TrLab/Components/Desktop/Atoms/TrLab/Common/Card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/core/TrLab/Components/Desktop/Atoms/TrLab/Common/Select';
import { Metric, PageHero } from '@/core/TrLab/Components/Desktop/Molecules/TrLab/Common';
import { CollectionTabs } from './CollectionTabs';
import { collectableSourceIds } from '@/core/TrLab/modules/configs/constants';

export function CollectionView(props) {
  return (
    <div className="space-y-5">
      <section className="grid gap-4 md:grid-cols-[minmax(0,1fr)_360px] md:items-end">
        <PageHero label="Collection Control Room" title="수집 채널과 저장소 관리" description="채널 상태, 저장 데이터, 수집 로그를 한곳에서 점검합니다." />
        <div className="grid grid-cols-3 gap-2"><Metric label="전체 신호" value={props.signalStats?.total ?? props.signals.length} /><Metric label="채널" value={props.sources.length} /><Metric label="최근 로그" value={props.collectionRuns.length} /></div>
      </section>
      <Card>
        <CardHeader className="border-b">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div><CardDescription>Signal Health</CardDescription><CardTitle className="flex items-center gap-2"><ServerCog className="h-5 w-5 text-indigo-600" />수집 채널 상태</CardTitle></div>
            <Toolbar collectSignals={props.collectSignals} collectingSignals={props.collectingSignals} />
          </div>
        </CardHeader>
        <CardContent className="pt-5"><div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_360px]"><EventList events={props.timerEvents} /><TimerBox /></div></CardContent>
      </Card>
      <CollectionTabs {...props} />
    </div>
  );
}

function Toolbar({ collectSignals, collectingSignals }) {
  return <div className="flex flex-wrap gap-2"><Select value="30"><SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="30">30분</SelectItem></SelectContent></Select><Button variant="outline" disabled><SlidersHorizontal className="h-4 w-4" />소스 적용중</Button><Button variant="outline" disabled><Activity className="h-4 w-4" />자동 수집 작동 중</Button><Button onClick={collectSignals} disabled={collectingSignals}><Rss className="h-4 w-4" />{collectingSignals ? '수집 중' : '전체 수집'}</Button></div>;
}

function TimerBox() {
  return (
    <div className="rounded-lg border bg-slate-50/70 p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-black text-slate-700"><Clock3 className="h-4 w-4 text-indigo-600" />자동 수집</div>
        <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-black text-slate-600">{collectableSourceIds.length}개 채널</span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <span className="rounded-md bg-white p-2"><b className="block text-slate-950">30분</b>수집 주기</span>
        <span className="rounded-md bg-white p-2"><b className="block text-slate-950">4회</b>랭킹 반영</span>
      </div>
      <p className="mt-2 text-[11px] leading-4 text-muted-foreground">00:00, 06:00, 12:00, 18:00에 트렌드 이력으로 저장됩니다.</p>
    </div>
  );
}

function EventList({ events }) {
  return (
    <div className="max-h-[180px] overflow-y-auto rounded-lg border bg-white p-3">
      {!events.length ? <div className="text-sm text-muted-foreground">화면에서 실행한 수동 수집 기록은 아직 없습니다.</div> : <div className="space-y-2">{events.map((event) => <div key={event.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-slate-50 px-3 py-2 text-sm"><span><b>{event.source}</b> · {event.reason}</span><span className="text-muted-foreground">{event.error ? event.error : `${event.count}건`} · {event.at}</span></div>)}</div>}
    </div>
  );
}
