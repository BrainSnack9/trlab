'use client';

import { Layers3 } from 'lucide-react';
import { Badge } from '@/core/TrLab/Components/Desktop/Atoms/TrLab/Common/Badge/Badge';
import { Button } from '@/core/TrLab/Components/Desktop/Atoms/TrLab/Common/Button/Button';
import { steps, utilitySteps } from '@/core/TrLab/modules/configs/constants';
import useTrLabWorkspace from '@/core/TrLab/modules/controller/useTrLabWorkspace';

export default function HeaderNavigator() {
  const { view, setView, queue } = useTrLabWorkspace();

  return (
    <header className="shrink-0 border-b border-slate-200 bg-white/95 px-4 py-3 shadow-[0_1px_0_rgba(15,23,42,0.04)] backdrop-blur-xl md:px-6">
      <div className="mx-auto grid w-full max-w-[1480px] gap-3 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
        <nav className="grid w-full gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1 md:grid-cols-5">
          {steps.map(([id, label, , Icon]) => (
            <Button key={id} variant={view === id ? 'secondary' : 'ghost'} className={navClass(view === id)} onClick={() => setView(id)}>
              <Icon className="h-4 w-4 shrink-0" />
              <span className="min-w-0 truncate text-[13px] font-black leading-tight">{label}</span>
            </Button>
          ))}
        </nav>

        <div className="grid gap-2 rounded-lg border border-slate-200 bg-slate-50 p-1 sm:grid-flow-col sm:justify-start xl:justify-end">
          {utilitySteps.map(([id, label, , Icon]) => (
            <Button key={id} variant={view === id ? 'secondary' : 'ghost'} className={utilityClass(view === id)} onClick={() => setView(id)}>
              <Icon className="h-4 w-4 shrink-0" />
              <span className="truncate text-[13px] font-black leading-tight">{label}</span>
            </Button>
          ))}
          {Boolean(queue?.length) && (
            <Button variant="ghost" className="h-10 justify-between gap-2 px-3 text-slate-800 hover:bg-white/80" onClick={() => setView('studio')}>
              <Layers3 className="h-4 w-4 shrink-0" />
              <span className="truncate text-[13px] font-black leading-tight">제작 대기열</span>
              <Badge>{queue.length}</Badge>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}

function navClass(active) {
  return [
    'h-10 justify-start gap-2 px-3 text-left',
    active ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-600 hover:bg-white/80 hover:text-slate-950'
  ].join(' ');
}

function utilityClass(active) {
  return [
    'h-10 justify-start gap-2 px-3 text-left',
    active ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-600 hover:bg-white/80 hover:text-slate-950'
  ].join(' ');
}
