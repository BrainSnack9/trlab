'use client';

import HeaderNavigator from '@/core/TrLab/Components/Desktop/Organisms/Templates/Header/HeaderNavigator';
import DesktopRoutes from '@/core/TrLab/routes/pages/desktop';

export default function TemplateHeader() {
  return (
    <div data-testid="app-scroll-root" className="flex h-screen flex-col overflow-hidden bg-background text-foreground">
      <HeaderNavigator />
      <main className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto">
        <div className="mx-auto w-full max-w-[1480px] min-w-0 p-4 md:p-6 lg:p-8">
          <DesktopRoutes />
        </div>
      </main>
    </div>
  );
}
