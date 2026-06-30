'use client';

import { PlanView } from '@/core/TrLab/Components/Desktop/Organisms/TrLab/Studio/StudioView';
import useTrLabWorkspace from '@/core/TrLab/modules/controller/useTrLabWorkspace';
import { resolveTemplateItem } from '@/core/TrLab/modules/templates/templateCatalog';

export default function Plan() {
  const workspace = useTrLabWorkspace();
  const workStudio = workToStudio(workspace.currentWork);
  const studio = mergeStudioTemplateSetup(workspace.studioTrend, workStudio);
  const contentPlans = studio?.id && workspace.currentWork?.contentPlan
    ? { ...workspace.contentPlans, [studio.id]: workspace.currentWork.contentPlan }
    : workspace.contentPlans;

  return (
    <PlanView
      queue={workspace.queue}
      studio={studio}
      setView={workspace.setView}
      setQueue={workspace.setQueue}
      contentPlans={contentPlans}
      setContentPlans={workspace.setContentPlans}
    />
  );
}

function mergeStudioTemplateSetup(studio, workStudio) {
  if (!studio) return workStudio;
  if (!workStudio?.contentSetup) return studio;
  return {
    ...studio,
    contentSetup: {
      ...workStudio.contentSetup,
      ...(studio.contentSetup ?? {}),
      template: studio.contentSetup?.template ?? workStudio.contentSetup.template,
      templateProduction: studio.contentSetup?.templateProduction ?? workStudio.contentSetup.templateProduction,
      templateCardPlan: studio.contentSetup?.templateCardPlan?.length ? studio.contentSetup.templateCardPlan : workStudio.contentSetup.templateCardPlan,
      templateEditorControls: studio.contentSetup?.templateEditorControls?.length ? studio.contentSetup.templateEditorControls : workStudio.contentSetup.templateEditorControls,
      templatePlatformSpecs: studio.contentSetup?.templatePlatformSpecs?.length ? studio.contentSetup.templatePlatformSpecs : workStudio.contentSetup.templatePlatformSpecs,
      templateProductionFlow: studio.contentSetup?.templateProductionFlow?.length ? studio.contentSetup.templateProductionFlow : workStudio.contentSetup.templateProductionFlow,
      templateLayoutSlots: studio.contentSetup?.templateLayoutSlots?.length ? studio.contentSetup.templateLayoutSlots : workStudio.contentSetup.templateLayoutSlots,
      templateChannelStrategy: studio.contentSetup?.templateChannelStrategy?.length ? studio.contentSetup.templateChannelStrategy : workStudio.contentSetup.templateChannelStrategy,
      templateBlueprint: studio.contentSetup?.templateBlueprint ?? workStudio.contentSetup.templateBlueprint,
      templateSettings: Object.keys(studio.contentSetup?.templateSettings ?? {}).length ? studio.contentSetup.templateSettings : workStudio.contentSetup.templateSettings
    },
    planningDraft: studio.planningDraft ?? workStudio.planningDraft
  };
}

function workToStudio(work) {
  if (!work) return null;
  const planning = work.planningDraft ?? {};
  const template = resolveTemplateItem(work.equippedItems?.template) ?? work.equippedItems?.template ?? null;
  return {
    id: planning.id ? `planning-studio-${planning.id}` : work.id,
    label: planning.topic || work.title,
    keyword: planning.topic || work.title,
    category: template?.label || '카드뉴스',
    summary: planning.goal || template?.description || '',
    contentSetup: {
      template,
      templateProduction: planning.templateProduction ?? template?.production ?? null,
      templateCardPlan: planning.templateCardPlan ?? template?.cardPlan ?? [],
      templateEditorControls: planning.templateEditorControls ?? template?.editorControls ?? [],
      templatePlatformSpecs: planning.templatePlatformSpecs ?? template?.platformSpecs ?? [],
      templateProductionFlow: planning.templateProductionFlow ?? template?.productionFlow ?? [],
      templateLayoutSlots: planning.templateLayoutSlots ?? template?.layoutSlots ?? [],
      templateChannelStrategy: planning.templateChannelStrategy ?? template?.channelStrategy ?? [],
      templateBlueprint: planning.templateBlueprint ?? template?.templateBlueprint ?? null,
      templateSettings: planning.templateSettings ?? {}
    },
    planningDraft: planning
  };
}
