import { resolveTemplateItem } from '@/core/TrLab/modules/templates/templateCatalog';

export const CONTENT_BRIEF_VERSION = 1;

export function buildContentBrief(work = {}, overrides = {}) {
  const sourceWork = work && typeof work === 'object' ? work : {};
  const metadata = normalizeMetadata(sourceWork.metadata);
  const planning = normalizePlanning(overrides.planningDraft ?? sourceWork.planningDraft);
  const template = resolveTemplateItem(overrides.template ?? sourceWork.equippedItems?.template) ?? overrides.template ?? sourceWork.equippedItems?.template ?? null;
  const cardCount = countStoryFlowItems(planning.storyFlow) || planning.cardCount || template?.pages?.length || Number(`${template?.meta ?? ''}`.replace(/\D/g, '')) || 5;

  return {
    version: CONTENT_BRIEF_VERSION,
    work: {
      id: cleanText(sourceWork.id),
      title: cleanText(sourceWork.title),
      status: cleanText(sourceWork.status)
    },
    metadata,
    planning,
    format: {
      id: planning.format || formatFromTemplate(template),
      label: planning.formatLabel || template?.formatSignal || ''
    },
    template: {
      selected: template,
      id: template?.id || planning.templateId || '',
      label: template?.label || planning.templateLabel || '',
      formatSignal: template?.formatSignal || planning.templateFormatSignal || '',
      canvas: template?.canvas || planning.templateCanvas || '',
      platforms: arrayOr(template?.platforms, planning.templatePlatforms),
      platformSpecs: arrayOr(planning.templatePlatformSpecs, template?.platformSpecs),
      production: planning.templateProduction ?? template?.production ?? null,
      cardPlan: arrayOr(planning.templateCardPlan, template?.cardPlan),
      editorControls: arrayOr(planning.templateEditorControls, template?.editorControls),
      productionFlow: arrayOr(planning.templateProductionFlow, template?.productionFlow),
      layoutSlots: arrayOr(planning.templateLayoutSlots, template?.layoutSlots),
      channelStrategy: arrayOr(planning.templateChannelStrategy, template?.channelStrategy),
      blueprint: planning.templateBlueprint ?? template?.templateBlueprint ?? null,
      settings: isPlainObject(planning.templateSettings) ? planning.templateSettings : {}
    },
    assets: {
      characters: Array.isArray(planning.characterAssets) ? planning.characterAssets : [],
      selectedCharacterId: planning.selectedCharacterId || ''
    },
    generation: {
      cardCount,
      title: planning.title || cleanText(sourceWork.title),
      topic: planning.topic || cleanText(sourceWork.title),
      audience: planning.audience || metadata.audienceNote || '',
      goal: planning.goal || metadata.goal || '',
      tone: planning.tone || metadata.tone || '',
      contentDirection: planning.contentDirection || metadata.notes || '',
      prompt: makePlanningBriefPrompt(planning)
    }
  };
}

export function contentBriefToStudio(brief) {
  if (!brief) return null;
  const planning = brief.planning ?? {};
  const work = brief.work ?? {};
  return {
    id: planning.id ? `planning-studio-${planning.id}` : work.id,
    label: brief.generation.topic || work.title,
    keyword: brief.generation.topic || work.title,
    category: brief.template.label || brief.format.label || '카드뉴스',
    summary: brief.generation.goal || brief.template.selected?.description || '',
    cardCount: brief.generation.cardCount,
    manualBrief: {
      topic: brief.generation.topic,
      prompt: brief.generation.prompt,
      contentDirection: brief.generation.contentDirection,
      audience: brief.generation.audience,
      tone: brief.generation.tone,
      cardCount: brief.generation.cardCount
    },
    contentBrief: brief,
    contentSetup: {
      contentBrief: brief,
      title: brief.generation.title,
      cardCount: brief.generation.cardCount,
      template: brief.template.selected,
      templateId: brief.template.id,
      templateLabel: brief.template.label,
      templateFormatSignal: brief.template.formatSignal,
      templateCanvas: brief.template.canvas,
      templatePlatforms: brief.template.platforms,
      templateProduction: brief.template.production,
      templateCardPlan: brief.template.cardPlan,
      templateEditorControls: brief.template.editorControls,
      templatePlatformSpecs: brief.template.platformSpecs,
      templateProductionFlow: brief.template.productionFlow,
      templateLayoutSlots: brief.template.layoutSlots,
      templateChannelStrategy: brief.template.channelStrategy,
      templateBlueprint: brief.template.blueprint,
      templateSettings: brief.template.settings,
      planningDraft: planning
    },
    planningDraft: planning
  };
}

export function contentBriefToTemplateRecommendationPayload(brief, input = {}) {
  if (!brief) {
    return {
      topic: cleanText(input.topic),
      audience: cleanText(input.audience),
      goal: cleanText(input.goal)
    };
  }
  return {
    topic: cleanText(input.topic) || brief.generation.topic,
    audience: cleanText(input.audience) || brief.generation.audience,
    goal: cleanText(input.goal) || brief.generation.goal,
    contentDirection: brief.generation.contentDirection,
    metadata: brief.metadata,
    contentBrief: brief,
    planningDraft: {
      ...brief.planning,
      format: brief.format.id || brief.planning.format,
      formatLabel: brief.format.label || brief.planning.formatLabel,
      templateId: brief.template.id,
      templateLabel: brief.template.label,
      templateFormatSignal: brief.template.formatSignal,
      templateCanvas: brief.template.canvas,
      templatePlatforms: brief.template.platforms,
      templatePlatformSpecs: brief.template.platformSpecs,
      templateProduction: brief.template.production,
      templateCardPlan: brief.template.cardPlan,
      templateEditorControls: brief.template.editorControls,
      templateProductionFlow: brief.template.productionFlow,
      templateLayoutSlots: brief.template.layoutSlots,
      templateChannelStrategy: brief.template.channelStrategy,
      templateBlueprint: brief.template.blueprint,
      templateSettings: brief.template.settings
    }
  };
}

export function mergeStudioContentBrief(studio, workStudio) {
  if (!studio) return workStudio;
  if (!workStudio?.contentSetup) return studio;
  const contentBrief = workStudio.contentBrief ?? studio.contentBrief;
  const planningDraft = workStudio.planningDraft ?? studio.planningDraft;
  return {
    ...studio,
    ...workStudio,
    selectedHookTitle: studio.selectedHookTitle ?? workStudio.selectedHookTitle,
    searchVerification: studio.searchVerification ?? workStudio.searchVerification,
    contentBrief,
    contentSetup: {
      ...(studio.contentSetup ?? {}),
      ...workStudio.contentSetup,
      contentBrief,
      planningDraft,
      cardCount: contentBrief?.generation?.cardCount ?? workStudio.contentSetup.cardCount,
      template: workStudio.contentSetup.template ?? studio.contentSetup?.template,
      templateProduction: workStudio.contentSetup.templateProduction ?? studio.contentSetup?.templateProduction,
      templateCardPlan: workStudio.contentSetup.templateCardPlan?.length ? workStudio.contentSetup.templateCardPlan : studio.contentSetup?.templateCardPlan,
      templateEditorControls: workStudio.contentSetup.templateEditorControls?.length ? workStudio.contentSetup.templateEditorControls : studio.contentSetup?.templateEditorControls,
      templatePlatformSpecs: workStudio.contentSetup.templatePlatformSpecs?.length ? workStudio.contentSetup.templatePlatformSpecs : studio.contentSetup?.templatePlatformSpecs,
      templateProductionFlow: workStudio.contentSetup.templateProductionFlow?.length ? workStudio.contentSetup.templateProductionFlow : studio.contentSetup?.templateProductionFlow,
      templateLayoutSlots: workStudio.contentSetup.templateLayoutSlots?.length ? workStudio.contentSetup.templateLayoutSlots : studio.contentSetup?.templateLayoutSlots,
      templateChannelStrategy: workStudio.contentSetup.templateChannelStrategy?.length ? workStudio.contentSetup.templateChannelStrategy : studio.contentSetup?.templateChannelStrategy,
      templateBlueprint: workStudio.contentSetup.templateBlueprint ?? studio.contentSetup?.templateBlueprint,
      templateSettings: Object.keys(workStudio.contentSetup.templateSettings ?? {}).length ? workStudio.contentSetup.templateSettings : studio.contentSetup?.templateSettings
    },
    manualBrief: {
      ...(studio.manualBrief ?? {}),
      ...(workStudio.manualBrief ?? {})
    },
    planningDraft,
    cardCount: contentBrief?.generation?.cardCount ?? workStudio.cardCount ?? studio.cardCount
  };
}

export function workToContentStudio(work) {
  return contentBriefToStudio(buildContentBrief(work));
}

function normalizePlanning(planning = {}) {
  if (!planning || typeof planning !== 'object' || Array.isArray(planning)) return {};
  const storyFlow = cleanMultiline(planning.storyFlow);
  return {
    ...planning,
    id: cleanText(planning.id),
    title: cleanText(planning.title),
    topic: cleanText(planning.topic),
    audience: cleanText(planning.audience),
    goal: cleanText(planning.goal),
    contentDirection: cleanMultiline(planning.contentDirection),
    format: cleanText(planning.format),
    formatLabel: cleanText(planning.formatLabel),
    cardCount: countStoryFlowItems(storyFlow) || Number(planning.cardCount) || 0,
    detailLevel: cleanText(planning.detailLevel),
    tone: cleanText(planning.tone),
    storyFlow,
    visualDirection: cleanMultiline(planning.visualDirection),
    promptGuide: cleanMultiline(planning.promptGuide),
    avoid: cleanMultiline(planning.avoid)
  };
}

function countStoryFlowItems(value) {
  return `${value ?? ''}`.split('\n').map((item) => item.trim()).filter(Boolean).length;
}

function normalizeMetadata(metadata = {}) {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return {};
  return {
    ...metadata,
    audienceNote: cleanText(metadata.audienceNote),
    objective: cleanText(metadata.objective),
    tone: cleanText(metadata.tone),
    channel: cleanText(metadata.channel),
    goal: cleanText(metadata.goal),
    notes: cleanMultiline(metadata.notes)
  };
}

function makePlanningBriefPrompt(planning = {}) {
  return [
    planning.goal,
    planning.contentDirection ? `전개 프롬프트:\n${planning.contentDirection}` : '',
    planning.storyFlow ? `카드 흐름:\n${planning.storyFlow}` : '',
    planning.visualDirection ? `시각 방향:\n${planning.visualDirection}` : '',
    planning.promptGuide ? `프롬프트 가이드:\n${planning.promptGuide}` : '',
    planning.avoid ? `피해야 할 것:\n${planning.avoid}` : ''
  ].filter(Boolean).join('\n\n');
}

function formatFromTemplate(template) {
  const text = `${template?.id ?? ''} ${template?.category ?? ''} ${template?.formatSignal ?? ''}`.toLowerCase();
  if (/instatoon|toon|컷툰|대화/.test(text)) return 'instatoon';
  if (/product|commerce|ranking|제품|랭킹|구매/.test(text)) return 'product';
  if (template) return 'information';
  return '';
}

function arrayOr(primary, fallback) {
  if (Array.isArray(primary) && primary.length) return primary;
  if (Array.isArray(fallback)) return fallback;
  return [];
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function cleanText(value) {
  return `${value ?? ''}`.replace(/\s+/g, ' ').trim();
}

function cleanMultiline(value) {
  return `${value ?? ''}`
    .split('\n')
    .map((line) => line.replace(/[ \t]+/g, ' ').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
