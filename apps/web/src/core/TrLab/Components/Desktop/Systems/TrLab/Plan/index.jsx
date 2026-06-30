'use client';

import { PlanView } from '@/core/TrLab/Components/Desktop/Organisms/TrLab/Studio/StudioView';
import { mergeStudioContentBrief, workToContentStudio } from '@/core/TrLab/modules/content/contentBrief';
import useTrLabWorkspace from '@/core/TrLab/modules/controller/useTrLabWorkspace';

export default function Plan() {
  const workspace = useTrLabWorkspace();
  const workStudio = workToContentStudio(workspace.currentWork);
  const studio = mergeStudioContentBrief(workspace.studioTrend, workStudio);
  const expectedCardCount = studio?.contentBrief?.generation?.cardCount || studio?.planningDraft?.cardCount || 0;
  const storedPlan = compatibleContentPlan(workspace.contentPlans?.[studio?.id], expectedCardCount);
  const workPlan = compatibleContentPlan(workspace.currentWork?.contentPlan, expectedCardCount);
  const contentPlans = studio?.id && (storedPlan || workPlan)
    ? { ...workspace.contentPlans, [studio.id]: storedPlan || workPlan }
    : workspace.contentPlans;

  return (
    <PlanView
      queue={workspace.queue}
      studio={studio}
      setView={workspace.setView}
      setQueue={workspace.setQueue}
      contentPlans={contentPlans}
      setContentPlans={workspace.setContentPlans}
      updateCurrentWork={workspace.updateCurrentWork}
    />
  );
}

function compatibleContentPlan(plan, expectedCardCount) {
  if (!plan) return null;
  const count = Array.isArray(plan.cards) ? plan.cards.length : 0;
  if (expectedCardCount && count && count !== expectedCardCount) return null;
  return plan;
}
