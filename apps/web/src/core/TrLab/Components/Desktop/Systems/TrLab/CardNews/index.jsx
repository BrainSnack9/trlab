'use client';

import { CardNewsView } from '@/core/TrLab/Components/Desktop/Organisms/TrLab/CardNews/CardNewsView';
import useTrLabWorkspace from '@/core/TrLab/modules/controller/useTrLabWorkspace';

export default function CardNews() {
  const workspace = useTrLabWorkspace();

  return (
    <CardNewsView
      studio={workspace.studioTrend}
      setView={workspace.setView}
      contentPlans={workspace.contentPlans}
      setContentPlans={workspace.setContentPlans}
    />
  );
}
