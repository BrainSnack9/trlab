import { Card, CardContent } from '@/core/TrLab/Components/Desktop/Atoms/TrLab/Common/Card';

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
