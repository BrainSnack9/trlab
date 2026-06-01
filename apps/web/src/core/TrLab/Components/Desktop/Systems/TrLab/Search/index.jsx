'use client';

import { SearchView } from '@/core/TrLab/Components/Desktop/Organisms/TrLab/Search/SearchView';
import useTrLabWorkspace from '@/core/TrLab/modules/controller/useTrLabWorkspace';

export default function Search() {
  const workspace = useTrLabWorkspace();

  return (
    <SearchView
      selected={workspace.selectedTrend}
      addToQueue={workspace.addToQueue}
      queued={workspace.isQueued}
      setView={workspace.setView}
    />
  );
}
