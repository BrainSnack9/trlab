export function mergeTemplateSetupIntoPlan(plan = {}, source = {}) {
  const planning = source.planningDraft ?? source.contentSetup?.planningDraft ?? {};
  const template = source.contentSetup?.template ?? source.template ?? null;
  const templateProduction = planning.templateProduction ?? source.contentSetup?.templateProduction ?? template?.production ?? null;
  const templateCardPlan = planning.templateCardPlan ?? source.contentSetup?.templateCardPlan ?? template?.cardPlan ?? [];
  const templateSettings = planning.templateSettings ?? source.contentSetup?.templateSettings ?? {};
  const templateEditorControls = planning.templateEditorControls ?? source.contentSetup?.templateEditorControls ?? template?.editorControls ?? [];
  const templatePlatformSpecs = planning.templatePlatformSpecs ?? source.contentSetup?.templatePlatformSpecs ?? template?.platformSpecs ?? [];
  const templateProductionFlow = planning.templateProductionFlow ?? source.contentSetup?.templateProductionFlow ?? template?.productionFlow ?? [];
  const templateLayoutSlots = planning.templateLayoutSlots ?? source.contentSetup?.templateLayoutSlots ?? template?.layoutSlots ?? [];
  const templateChannelStrategy = planning.templateChannelStrategy ?? source.contentSetup?.templateChannelStrategy ?? template?.channelStrategy ?? [];
  const templateBlueprint = planning.templateBlueprint ?? source.contentSetup?.templateBlueprint ?? template?.templateBlueprint ?? null;
  if (!template && !templateProduction && !templateCardPlan?.length && !templateEditorControls?.length && !templateProductionFlow?.length && !templateLayoutSlots?.length && !templateChannelStrategy?.length && !templateBlueprint && !Object.keys(templateSettings ?? {}).length) return plan;
  return {
    ...plan,
    contentSetup: {
      ...(plan.contentSetup ?? {}),
      ...(source.contentSetup ?? {}),
      template,
      templateId: template?.id ?? planning.templateId ?? source.contentSetup?.templateId ?? '',
      templateLabel: template?.label ?? planning.templateLabel ?? source.contentSetup?.templateLabel ?? '',
      templateFormatSignal: template?.formatSignal ?? planning.templateFormatSignal ?? source.contentSetup?.templateFormatSignal ?? '',
      templateCanvas: template?.canvas ?? planning.templateCanvas ?? source.contentSetup?.templateCanvas ?? '',
      templatePlatforms: template?.platforms ?? planning.templatePlatforms ?? source.contentSetup?.templatePlatforms ?? [],
      templatePlatformSpecs,
      templateProduction,
      templateCardPlan,
      templateEditorControls,
      templateProductionFlow,
      templateLayoutSlots,
      templateChannelStrategy,
      templateBlueprint,
      templateSettings,
      planningDraft: planning
    },
    templateProduction,
    templateCardPlan,
    templateEditorControls,
    templatePlatformSpecs,
    templateProductionFlow,
    templateLayoutSlots,
    templateChannelStrategy,
    templateBlueprint,
    templateSettings
  };
}
