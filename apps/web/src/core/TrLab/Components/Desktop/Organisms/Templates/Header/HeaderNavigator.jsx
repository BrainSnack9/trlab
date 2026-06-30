'use client';

import { Home, Layers3 } from 'lucide-react';
import { Badge } from '@/core/TrLab/Components/Desktop/Atoms/TrLab/Common/Badge/Badge';
import { Button } from '@/core/TrLab/Components/Desktop/Atoms/TrLab/Common/Button/Button';
import { steps, utilitySteps, workAssetStep, workListStep } from '@/core/TrLab/modules/configs/constants';
import useTrLabWorkspace from '@/core/TrLab/modules/controller/useTrLabWorkspace';

const workScopedViews = new Set(['overview', 'metadata', 'templates', 'planning', 'assets', 'plan', 'cardnews']);

export default function HeaderNavigator() {
  const { view, setView, queue, currentWork } = useTrLabWorkspace();

  return (
    <aside className="flex w-[76px] shrink-0 flex-col border-r border-slate-200 bg-white/95 shadow-[1px_0_0_rgba(15,23,42,0.04)] backdrop-blur-xl">
      <div className="grid h-16 shrink-0 place-items-center border-b border-slate-200 px-2">
        <Button variant="ghost" size="icon" className={homeClass(!view)} onClick={() => setView(null)} aria-label="홈">
          <Home className="h-4 w-4" />
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        <NavGroup label="작업물">
          <NavButton item={workListStep} active={view === workListStep[0]} onClick={() => setView(workListStep[0])} />
          <NavButton item={workAssetStep} active={view === workAssetStep[0]} onClick={() => setView(workAssetStep[0])} />
        </NavGroup>

        <NavGroup label="단계">
          {steps.map((item) => {
            const [id] = item;
            const disabled = workScopedViews.has(id) && !currentWork;
            return (
              <NavButton key={id} item={item} active={view === id} disabled={disabled} onClick={() => setView(id)} />
            );
          })}
        </NavGroup>

        <NavGroup label="관리">
          {utilitySteps.map((item) => <NavButton key={item[0]} item={item} active={view === item[0]} onClick={() => setView(item[0])} />)}
        </NavGroup>
      </div>

      <div className="border-t border-slate-200 p-2">
        <Button variant="ghost" className={queueClass(Boolean(queue?.length))} onClick={() => setView('studio')} disabled={!queue?.length}>
          <Layers3 className="h-4 w-4 shrink-0" />
          <span className="w-full truncate text-center text-[10px] font-medium leading-tight">대기열</span>
          <Badge className="h-4 px-1 text-[10px]">{queue?.length ?? 0}</Badge>
        </Button>
      </div>
    </aside>
  );
}

function NavButton({ item, active, disabled = false, onClick }) {
  const [id, label, description, Icon] = item;
  return (
    <Button
      key={id}
      variant={active ? 'secondary' : 'ghost'}
      className={navClass(active, disabled)}
      onClick={() => !disabled && onClick()}
      disabled={disabled}
      title={disabled ? '작업물을 먼저 선택하세요' : description || label}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="w-full truncate text-center text-[10px] font-medium leading-tight">{label}</span>
    </Button>
  );
}

function NavGroup({ label, children }) {
  return (
    <section className="mb-4">
      <div className="pb-2 text-center text-[9px] font-medium uppercase tracking-normal text-slate-400">{label}</div>
      <nav className="grid gap-1">{children}</nav>
    </section>
  );
}

function navClass(active, disabled = false) {
  if (disabled) {
    return 'h-[54px] w-full flex-col justify-center gap-1 rounded-lg px-1 text-center cursor-not-allowed text-slate-300 hover:bg-transparent hover:text-slate-300';
  }

  return [
    'h-[54px] w-full flex-col justify-center gap-1 rounded-lg px-1 text-center',
    active ? 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-100 hover:bg-indigo-50 hover:text-indigo-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'
  ].join(' ');
}

function homeClass(active) {
  return [
    'h-9 w-9 rounded-lg',
    active ? 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-100 hover:bg-indigo-50 hover:text-indigo-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'
  ].join(' ');
}

function queueClass(enabled) {
  return [
    'h-[58px] w-full flex-col justify-center gap-1 rounded-lg px-1 text-slate-800',
    enabled ? 'hover:bg-slate-100' : 'cursor-not-allowed opacity-60'
  ].join(' ');
}
