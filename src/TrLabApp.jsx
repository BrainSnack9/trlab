'use client';

import { useState } from 'react';
import { AppHeader } from './app-shell/components/AppHeader';
import { useTrLabData } from './app-shell/hooks/useTrLabData';
import { DashboardView } from './app-shell/views/DashboardView';
import { CollectionView } from './app-shell/views/CollectionView';
import { SearchView } from './app-shell/views/SearchView';
import { StudioView } from './app-shell/views/StudioView';
import { CardNewsView } from './app-shell/views/CardNewsView';
import { defaultExcludedAreas, defaultSelectedAreas } from './app-shell/constants';
import { trendToRadarItem } from './app-shell/utils';

export default function TrLabApp() {
  const [view, setView] = useState('dashboard');
  const [queue, setQueue] = useState([]);
  const [contentPlans, setContentPlans] = useState({});
  const [selectedTrend, setSelectedTrend] = useState(null);
  const [selectedAreas, setSelectedAreas] = useState(defaultSelectedAreas);
  const [excludedAreas, setExcludedAreas] = useState(defaultExcludedAreas);
  const data = useTrLabData();

  const chooseTrend = (trend) => {
    setSelectedTrend(trend.label ? trend : trendToRadarItem(trend, (trend.rank ?? 1) - 1));
    setView('search');
  };

  const addToQueue = (verification) => {
    if (!selectedTrend) return;
    const nextTrend = verification ? { ...selectedTrend, searchVerification: verification } : selectedTrend;
    setQueue((items) => [nextTrend, ...items.filter((item) => item.id !== selectedTrend.id)]);
    setView('studio');
  };

  return (
    <div data-testid="app-scroll-root" className="h-screen overflow-y-auto text-foreground">
      <AppHeader view={view} setView={setView} queue={queue} />
      <main className="mx-auto w-full max-w-[1480px] p-4 md:p-6 lg:p-8">
        {view === 'dashboard' && (
          <DashboardView
            {...data}
            chooseTrend={chooseTrend}
            selectedAreas={selectedAreas}
            setSelectedAreas={setSelectedAreas}
            excludedAreas={excludedAreas}
            setExcludedAreas={setExcludedAreas}
            onCollectSignals={() => data.collectSignals(selectedAreas)}
          />
        )}
        {view === 'collection' && <CollectionView {...data} />}
        {view === 'search' && (
          <SearchView
            selected={selectedTrend}
            addToQueue={addToQueue}
            queued={queue.some((item) => item.id === selectedTrend?.id)}
            setView={setView}
          />
        )}
        {view === 'studio' && <StudioView queue={queue} studio={queue[0] ?? selectedTrend} setView={setView} contentPlans={contentPlans} setContentPlans={setContentPlans} />}
        {view === 'cardnews' && <CardNewsView studio={queue[0] ?? selectedTrend} setView={setView} contentPlans={contentPlans} setContentPlans={setContentPlans} />}
      </main>
    </div>
  );
}
