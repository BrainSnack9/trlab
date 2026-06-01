'use client';

import { StudioView } from '@/core/TrLab/Components/Desktop/Organisms/TrLab/Studio/StudioView';
import useTrLabWorkspace from '@/core/TrLab/modules/controller/useTrLabWorkspace';

export default function Studio() {
  const workspace = useTrLabWorkspace();

  return (
    <StudioView
      queue={workspace.queue}
      studio={workspace.studioTrend}
      setView={workspace.setView}
      setQueue={workspace.setQueue}
      contentPlans={workspace.contentPlans}
      setContentPlans={workspace.setContentPlans}
    />
  );
}
