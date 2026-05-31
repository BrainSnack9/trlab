import { Activity, Layers3 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { steps } from '../constants';

export function AppHeader({ view, setView, queue }) {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/90 px-4 py-3 shadow-[0_1px_0_rgba(15,23,42,0.04)] backdrop-blur-xl md:px-6">
      <div className="mx-auto flex w-full max-w-[1480px] flex-wrap items-center gap-3">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-600">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <strong className="block text-[15px] font-black leading-tight text-slate-950">TrLab</strong>
            <span className="text-[11px] font-bold uppercase tracking-normal text-slate-500">Marketing Signal Factory</span>
          </div>
        </div>
        <nav className="order-3 grid w-full gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1 md:grid-cols-5 xl:order-none xl:min-w-[620px] xl:flex-1">
          {steps.map(([id, label, caption, Icon]) => (
            <Button key={id} variant={view === id ? 'secondary' : 'ghost'} className={navClass(view === id)} onClick={() => setView(id)}>
              <Icon className="h-4 w-4" />
              <span>
                <span className="block text-[13px] font-black leading-tight">{label}</span>
                <span className="block text-[11px] font-bold text-slate-500">{caption}</span>
              </span>
            </Button>
          ))}
        </nav>
        <Button variant="outline" className="ml-auto h-10 w-fit min-w-[156px] justify-between border-indigo-200 bg-indigo-50 px-3 text-indigo-700 hover:bg-indigo-100" onClick={() => setView('studio')}>
          <Layers3 className="h-4 w-4" />
          <span className="text-left">
            <span className="block text-[13px] font-black leading-tight">제작 대기열</span>
            <span className="block text-[11px] font-bold text-indigo-500">{queue.length ? `${queue.length}개 대기 중` : '비어 있음'}</span>
          </span>
          <Badge>{queue.length}</Badge>
        </Button>
      </div>
    </header>
  );
}

function navClass(active) {
  return `h-11 justify-start px-3 text-left ${active ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-600 hover:bg-white/80 hover:text-slate-950'}`;
}
