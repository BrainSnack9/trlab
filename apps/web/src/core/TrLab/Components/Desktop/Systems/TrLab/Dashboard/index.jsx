'use client';

import { DashboardView } from '@/core/TrLab/Components/Desktop/Organisms/TrLab/Dashboard/DashboardView';
import useTrLabWorkspace from '@/core/TrLab/modules/controller/useTrLabWorkspace';

export default function Dashboard() {
  const workspace = useTrLabWorkspace();

  return (
      <DashboardView
        {...workspace}
        refreshTrendRanking={() => workspace.refreshTrendRanking({ analysisDate: workspace.analysisDate })}
        onCollectSignals={() => workspace.collectSignals({
          areas: workspace.selectedAreas,
          profiles: workspace.selectedChannelProfiles,
          analysisDate: workspace.analysisDate
        })}
      />
  );
}
