import { useEffect, useState } from 'react';
import { createContentPlan } from '@/core/TrLab/modules/clients/api';
import { mergeTemplateSetupIntoPlan } from '@/core/TrLab/modules/templates/templatePlanBridge';
import { contentPlanControllerHelpers } from './contentPlanController.helpers';

const DEFAULT_CARD_COUNT = 5;

export function useContentPlanController({
  studio,
  titleCandidates = [],
  setQueue,
  setView,
  setContentPlans,
  defaultCardCount = DEFAULT_CARD_COUNT
}) {
  const [manualState, setManualState] = useState({ loading: false, error: '' });
  const [manualOpen, setManualOpen] = useState(false);
  const [generationState, setGenerationState] = useState({ loading: false, error: '', cached: false });
  const [setup, setSetup] = useState(() => ({ cardCount: defaultCardCount, title: '' }));

  useEffect(() => {
    setSetup({
      cardCount: studio?.contentSetup?.cardCount ?? studio?.cardCount ?? defaultCardCount,
      title: studio?.selectedHookTitle ?? studio?.contentSetup?.title ?? titleCandidates[0] ?? ''
    });
    setGenerationState({ loading: false, error: '', cached: false });
  }, [studio?.id, defaultCardCount, titleCandidates]);

  const createTrendPlan = async () => {
    if (!studio) return;
    const selectedHookTitle = (setup.title || titleCandidates[0] || studio.label || '').trim();
    setGenerationState({ loading: true, error: '', cached: false });
    try {
      const requestStudio = {
        ...studio,
        cardCount: Number(setup.cardCount) || defaultCardCount,
        selectedHookTitle
      };
      const data = await createContentPlan(requestStudio, { refresh: true });
      const mergedPlan = mergeTemplateSetupIntoPlan(data.plan, requestStudio);
      setContentPlans((plans) => ({ ...plans, [studio.id]: mergedPlan }));
      setGenerationState({ loading: false, error: '', cached: Boolean(data.cached) });
    } catch (error) {
      setGenerationState({ loading: false, error: error.message, cached: false });
    }
  };

  const createManualPlan = async (values) => {
    const manualStudio = contentPlanControllerHelpers.makeManualStudio(values);
    setManualState({ loading: true, error: '' });
    try {
      const data = await createContentPlan(manualStudio, { refresh: true });
      const mergedPlan = mergeTemplateSetupIntoPlan(data.plan, manualStudio);
      setQueue((items = []) => [manualStudio, ...items.filter((item) => item?.id !== manualStudio.id)]);
      setContentPlans((plans) => ({ ...plans, [manualStudio.id]: mergedPlan }));
      setView('plan');
    } catch (error) {
      setManualState({ loading: false, error: error.message });
      return;
    }
    setManualState({ loading: false, error: '' });
  };

  const dismissGenerationError = () => setGenerationState((current) => ({ ...current, error: '' }));
  const dismissManualError = () => setManualState((current) => ({ ...current, error: '' }));

  return {
    manualState,
    manualOpen,
    setManualOpen,
    generationState,
    setup,
    setSetup,
    loading: generationState.loading,
    error: generationState.error,
    cached: generationState.cached,
    dismissGenerationError,
    dismissManualError,
    createTrendPlan,
    createManualPlan
  };
}
