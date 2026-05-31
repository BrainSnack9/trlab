import { ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatTime, getHostname, getSignalKind, getSignalQuality } from '../utils';

export function SignalDrawer({ signal, onClose }) {
  const quality = getSignalQuality(signal);
  const googleUrl = `https://www.google.com/search?q=${encodeURIComponent(signal.title)}`;
  const naverUrl = `https://search.naver.com/search.naver?query=${encodeURIComponent(signal.title)}`;
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/45 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="h-full w-full max-w-xl overflow-y-auto rounded-lg border bg-slate-950 p-5 text-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex flex-wrap gap-2"><Badge variant="secondary">{getSignalKind(signal)}</Badge><Badge variant="outline">{signal.source}</Badge><Badge variant={quality.suspicious ? 'destructive' : 'default'}>{quality.label}</Badge></div><h3 className="mt-3 text-lg font-black">{signal.title}</h3></div><Button size="sm" variant="outline" className="border-white/20 bg-white/10 text-white hover:bg-white/20" onClick={onClose}>닫기</Button></div>
        {signal.summary && <p className="mt-3 rounded-md bg-white/10 p-3 text-sm text-slate-200">{signal.summary}</p>}
        <div className="mt-4 grid gap-2 text-sm md:grid-cols-4"><Info label="출처" value={getHostname(signal.url)} /><Info label="반복" value={signal.seenCount ?? 1} /><Info label="수집" value={formatTime(signal.lastSeenAt ?? signal.collectedAt)} /><Info label="유형" value={signal.type || '-'} /></div>
        <div className="mt-4 flex flex-wrap gap-2"><Button asChild><a href={signal.url} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4" />원문 열기</a></Button><Button variant="outline" className="bg-white text-slate-950" asChild><a href={googleUrl} target="_blank" rel="noreferrer">Google 검색</a></Button><Button variant="outline" className="bg-white text-slate-950" asChild><a href={naverUrl} target="_blank" rel="noreferrer">Naver 검색</a></Button></div>
      </div>
    </div>
  );
}

function Info({ label, value }) {
  return <span className="rounded-md bg-white/10 p-3 text-slate-300">{label}<b className="block text-white">{value}</b></span>;
}
