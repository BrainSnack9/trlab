import { Radar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export function Metric({ label, value, tone = 'default' }) {
  const toneClass = tone === 'dark' ? 'bg-slate-950 text-white' : 'border-slate-200 bg-white/95';
  return (
    <Card className={`min-w-0 shadow-none ${toneClass}`}>
      <CardContent className="p-3">
        <span className={`text-[11px] font-black ${tone === 'dark' ? 'text-slate-400' : 'text-muted-foreground'}`}>{label}</span>
        <strong className="mt-0.5 block text-xl leading-none">{value}</strong>
      </CardContent>
    </Card>
  );
}

export function StageHead({ label, title, description, children }) {
  return (
    <section className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="text-xs font-black uppercase text-slate-500">{label}</p>
        <h1 className="mt-1 text-2xl font-black leading-tight tracking-tight md:text-3xl">{title}</h1>
        <p className="mt-2 max-w-3xl text-[13px] leading-5 text-muted-foreground">{description}</p>
      </div>
      <div className="flex flex-wrap gap-2">{children}</div>
    </section>
  );
}

export function PageHero({ label, title, description, children }) {
  return <StageHead label={label} title={title} description={description}>{children}</StageHead>;
}

export function Empty({ title, onClick }) {
  return (
    <Card>
      <CardContent className="grid gap-3 p-8">
        <h1 className="text-2xl font-black">{title}</h1>
        <p className="text-muted-foreground">트렌드 감지 화면에서 시그널을 수집하고 후보를 선택해 주세요.</p>
        <Button className="w-fit" onClick={onClick}><Radar className="h-4 w-4" />레이더로 가기</Button>
      </CardContent>
    </Card>
  );
}
