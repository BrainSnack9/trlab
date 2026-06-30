'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import HeaderNavigator from '@/core/TrLab/Components/Desktop/Organisms/Templates/Header/HeaderNavigator';
import WorkCommandBar from '@/core/TrLab/Components/Desktop/Organisms/Templates/Header/WorkCommandBar';
import DesktopRoutes from '@/core/TrLab/routes/pages/desktop';

export default function TemplateHeader() {
  const pathname = usePathname();
  const [transitioning, setTransitioning] = useState(false);

  useEffect(() => {
    setTransitioning(true);
    const timer = window.setTimeout(() => setTransitioning(false), 360);
    return () => window.clearTimeout(timer);
  }, [pathname]);

  return (
    <div data-testid="app-scroll-root" className="flex h-screen overflow-hidden bg-background text-foreground">
      <HeaderNavigator />
      <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <WorkCommandBar />
        <div className="relative min-h-0 flex-1 overflow-x-hidden overflow-y-auto trlab-stable-scroll">
          <RouteProgress active={transitioning} />
          <div className="mx-auto w-full max-w-[1480px] min-w-0 p-4 md:p-6 lg:p-8">
            <div key={pathname} className="trlab-route-panel">
              <DesktopRoutes />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function RouteProgress({ active }) {
  return (
    <div className={active ? 'trlab-route-progress is-active' : 'trlab-route-progress'} aria-hidden="true">
      <div />
    </div>
  );
}
