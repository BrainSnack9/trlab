import { generateAIJson, hasAIProvider } from '#trlab/modules/services/ai/ai-providers';

const STAGES = new Set(['flow', 'production', 'character', 'template']);

export async function assistPlanningStage(input = {}) {
  const stage = clean(input.stage);
  if (!STAGES.has(stage)) throw new Error('unsupported planning assist stage');
  const context = normalizeContext(input);
  if (!context.topic) throw new Error('topic is required');

  if (!hasAIProvider()) return fallbackAssist(stage, context);

  try {
    const { data, meta } = await generateAIJson(JSON.stringify({
      task: '카드뉴스 기획 화면의 특정 단계 입력값만 보완한다.',
      stage,
      context,
      rules: [
        '기본 설정(topic, audience, goal)은 새로 만들지 않는다. 사용자가 입력한 내용을 바탕으로만 제안한다.',
        '요청 stage에 해당하는 필드만 반환한다.',
        '한국어로 짧고 바로 편집 가능한 문장만 쓴다.',
        '과장된 마케팅 문구보다 실제 카드 설계에 도움이 되는 입력값을 만든다.'
      ],
      jsonShape: shapeForStage(stage)
    }), {
      systemPrompt: '한국어 인스타그램 카드뉴스 기획 보조자. 사용자가 입력해야 하는 특정 단계의 필드만 채운다. 반드시 JSON만 반환한다.'
    });
    return normalizeAssist(stage, data, { source: 'ai', meta });
  } catch (error) {
    return { ...fallbackAssist(stage, context), warning: error.message };
  }
}

function normalizeContext(input = {}) {
  return {
    topic: clean(input.topic),
    audience: clean(input.audience),
    goal: clean(input.goal),
    format: clean(input.format),
    tone: clean(input.tone),
    cardCount: Math.min(12, Math.max(3, Number(input.cardCount) || 6)),
    storyFlow: cleanMultiline(input.storyFlow),
    visualDirection: cleanMultiline(input.visualDirection),
    promptGuide: cleanMultiline(input.promptGuide),
    avoid: cleanMultiline(input.avoid),
    template: input.template && typeof input.template === 'object' ? {
      id: clean(input.template.id),
      label: clean(input.template.label),
      formatSignal: clean(input.template.formatSignal),
      cardPlan: Array.isArray(input.template.cardPlan) ? input.template.cardPlan.slice(0, 12) : [],
      editorControls: Array.isArray(input.template.editorControls) ? input.template.editorControls.slice(0, 12) : []
    } : null
  };
}

function shapeForStage(stage) {
  if (stage === 'flow') return { cardFlow: [''], detailLevel: 'balanced' };
  if (stage === 'production') return { visualDirection: '', promptGuide: '', avoid: '' };
  if (stage === 'character') return { characterName: '', characterRole: '', characterTraits: '', characterPrompt: '' };
  return { templateSettings: { 배경: [''] } };
}

function normalizeAssist(stage, data, meta) {
  if (stage === 'flow') {
    return {
      ...meta,
      stage,
      cardFlow: asStringArray(data?.cardFlow).slice(0, 12),
      detailLevel: ['simple', 'balanced', 'specific'].includes(data?.detailLevel) ? data.detailLevel : 'balanced'
    };
  }
  if (stage === 'production') {
    return {
      ...meta,
      stage,
      visualDirection: cleanMultiline(data?.visualDirection),
      promptGuide: cleanMultiline(data?.promptGuide),
      avoid: cleanMultiline(data?.avoid)
    };
  }
  if (stage === 'character') {
    return {
      ...meta,
      stage,
      characterName: clean(data?.characterName),
      characterRole: clean(data?.characterRole),
      characterTraits: clean(data?.characterTraits),
      characterPrompt: clean(data?.characterPrompt)
    };
  }
  return {
    ...meta,
    stage,
    templateSettings: normalizeSettings(data?.templateSettings)
  };
}

function fallbackAssist(stage, context) {
  const topic = context.topic || '이 주제';
  if (stage === 'flow') {
    const base = context.template?.cardPlan?.length
      ? context.template.cardPlan.map(([title, note]) => `${title}: ${note}`)
      : ['문제 제기', '왜 중요한지', '핵심 기준', '예시', '저장할 정리'];
    return { source: 'fallback', stage, cardFlow: base.slice(0, context.cardCount), detailLevel: context.cardCount >= 6 ? 'specific' : 'balanced' };
  }
  if (stage === 'production') {
    return {
      source: 'fallback',
      stage,
      visualDirection: `${topic}을 한눈에 이해할 수 있게 여백을 넓게 두고, 카드마다 핵심 문장 1개와 보조 요소 1개만 배치한다.`,
      promptGuide: `각 컷은 ${context.audience || '독자'}가 바로 이해할 수 있는 실제 상황과 짧은 문장으로 설계한다.`,
      avoid: '작은 글씨, 긴 문단, 한 컷에 여러 메시지, 근거 없는 단정'
    };
  }
  if (stage === 'character') {
    return {
      source: 'fallback',
      stage,
      characterName: '오늘이',
      characterRole: `${context.audience || '독자'}가 쉽게 이입하는 일상 주인공`,
      characterTraits: `${topic}을 겪는 사람처럼 현실감 있고, 표정 변화가 크며, 과장되지 않은 공감형 캐릭터`,
      characterPrompt: `simple Korean Instagram toon main character for ${topic}, relatable everyday protagonist, clean black line art, expressive eyes, warm neutral outfit, consistent character sheet, no text, no complex background`
    };
  }
  return {
    source: 'fallback',
    stage,
    templateSettings: defaultSettings(context.template?.editorControls)
  };
}

function defaultSettings(groups = []) {
  if (!Array.isArray(groups) || !groups.length) return {};
  return groups.reduce((result, [title, items]) => {
    const values = Array.isArray(items) ? items.slice(0, 2).map(clean).filter(Boolean) : [];
    return values.length ? { ...result, [clean(title)]: values } : result;
  }, {});
}

function normalizeSettings(settings) {
  if (!settings || typeof settings !== 'object' || Array.isArray(settings)) return {};
  return Object.entries(settings).reduce((result, [key, values]) => {
    const cleanValues = asStringArray(values).slice(0, 8);
    return cleanValues.length ? { ...result, [clean(key)]: cleanValues } : result;
  }, {});
}

function asStringArray(value) {
  return Array.isArray(value) ? value.map(clean).filter(Boolean) : [];
}

function clean(value) {
  return `${value ?? ''}`.replace(/\s+/g, ' ').trim();
}

function cleanMultiline(value) {
  return `${value ?? ''}`
    .split('\n')
    .map((line) => line.replace(/[ \t]+/g, ' ').trim())
    .filter(Boolean)
    .join('\n');
}
