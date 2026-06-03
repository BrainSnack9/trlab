'use client';

import { PlanView } from '@/core/TrLab/Components/Desktop/Organisms/TrLab/Studio/StudioView';
import useTrLabWorkspace from '@/core/TrLab/modules/controller/useTrLabWorkspace';

export default function Plan() {
  const workspace = useTrLabWorkspace();

  return (
    <PlanView
      queue={workspace.queue}
      studio={workspace.studioTrend}
      setView={workspace.setView}
      setQueue={workspace.setQueue}
      contentPlans={workspace.contentPlans}
      setContentPlans={workspace.setContentPlans}
    />
  );
}
