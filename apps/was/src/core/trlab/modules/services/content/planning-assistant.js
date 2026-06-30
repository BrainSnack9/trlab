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
        'contentDirection이 있으면 그 전개 요청을 최우선으로 따른다. format의 일반적인 성격보다 사용자의 전개 요청이 우선이다.',
        '요청 stage에 해당하는 필드만 반환한다.',
        '한국어로 짧고 바로 편집 가능한 문장만 쓴다.',
        '과장된 마케팅 문구보다 실제 카드 설계에 도움이 되는 입력값을 만든다.',
        'format이 인스타툰이어도 사용자가 방법 설명, 루틴, 시연, 자세, 횟수, 계획을 요청하면 감정 공감 서사가 아니라 캐릭터가 내용을 시연하는 정보형 튜토리얼 컷으로 만든다.',
        'production 단계에서는 characterStyle이 있으면 그림체, 디테일 수준, 캐릭터 역할을 visualDirection과 promptGuide에 반영한다.',
        'production 단계에서는 이미지 생성용 문장과 카드 편집 지시를 구분한다. 카드 문구 자체를 이미지에 그리라고 하지 않는다.',
        '사용자가 피하라고 한 방향은 카드 흐름에 넣지 않는다.'
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
    contentDirection: cleanMultiline(input.contentDirection),
    format: clean(input.format),
    tone: clean(input.tone),
    cardCount: Math.min(12, Math.max(3, Number(input.cardCount) || 6)),
    instructionMode: clean(input.instructionMode),
    storyFlow: cleanMultiline(input.storyFlow),
    visualDirection: cleanMultiline(input.visualDirection),
    promptGuide: cleanMultiline(input.promptGuide),
    avoid: cleanMultiline(input.avoid),
    characterStyle: input.characterStyle && typeof input.characterStyle === 'object' ? {
      id: clean(input.characterStyle.id),
      label: clean(input.characterStyle.label),
      prompt: cleanMultiline(input.characterStyle.prompt),
      detailLevel: clean(input.characterStyle.detailLevel),
      detailPrompt: cleanMultiline(input.characterStyle.detailPrompt),
      role: clean(input.characterStyle.role),
      traits: cleanMultiline(input.characterStyle.traits)
    } : null,
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
    const base = context.instructionMode === 'exercise_tutorial'
      ? exerciseTutorialFlow(topic, context)
      : context.template?.cardPlan?.length
      ? context.template.cardPlan.map(([title, note]) => `${title}: ${note}`)
      : ['문제 제기', '왜 중요한지', '핵심 기준', '예시', '저장할 정리'];
    return { source: 'fallback', stage, cardFlow: base.slice(0, context.cardCount), detailLevel: context.cardCount >= 6 ? 'specific' : 'balanced' };
  }
  if (stage === 'production') {
    if (context.instructionMode === 'exercise_tutorial') {
      const styleLine = characterStyleLine(context);
      return {
        source: 'fallback',
        stage,
        visualDirection: [
          `${topic}의 핵심 동작이나 단계를 캐릭터가 직접 시연하는 컷으로 구성한다.`,
          '전신 또는 반신 구도로 자세, 손 위치, 방향, 순서가 보이게 하고 필요한 컷에는 화살표, 횟수/세트/시간 배지를 얹을 여백을 둔다.',
          styleLine
        ].filter(Boolean).join('\n'),
        promptGuide: [
          '감정 서사보다 따라 하는 튜토리얼 흐름을 우선한다.',
          context.contentDirection ? `사용자 전개 프롬프트: ${context.contentDirection}` : '',
          '각 컷의 이미지 프롬프트는 배경/포즈/소품만 지시하고, 제목과 설명 문구는 편집 레이어로 분리한다.'
        ].filter(Boolean).join('\n'),
        avoid: '시작 전 고민만 보여주는 컷, 주제와 상관없는 표정 중심 장면, 자세가 보이지 않는 구도, 이미지 안에 직접 들어간 긴 글자, 근거 없는 효과 단정'
      };
    }
    const styleLine = characterStyleLine(context);
    return {
      source: 'fallback',
      stage,
      visualDirection: [
        `${topic}을 한눈에 이해할 수 있게 카드마다 핵심 장면 또는 자료 요소 1개를 중심에 둔다.`,
        '제목/본문이 올라갈 안전 여백을 크게 확보하고, 이미지에는 텍스트를 직접 넣지 않는다.',
        styleLine
      ].filter(Boolean).join('\n'),
      promptGuide: [
        `각 컷은 ${context.audience || '독자'}가 바로 이해할 수 있는 장면, 자료, 비교, 예시 중 하나로 설계한다.`,
        context.contentDirection ? `사용자 전개 프롬프트: ${context.contentDirection}` : '',
        '이미지 생성 프롬프트와 카드 문구를 분리한다.'
      ].filter(Boolean).join('\n'),
      avoid: '작은 글씨, 긴 문단, 한 컷에 여러 메시지, 이미지 안에 직접 들어간 텍스트, 근거 없는 단정'
    };
  }
  if (stage === 'character') {
    if (context.instructionMode === 'exercise_tutorial') {
      return {
        source: 'fallback',
        stage,
        characterName: '루틴이',
        characterRole: `${context.audience || '독자'}에게 운동 자세를 시연하는 안내 캐릭터`,
        characterTraits: '밝고 단정한 표정, 운동 동작이 잘 보이는 단순한 복장, 자세 포인트를 손짓이나 동작으로 설명하는 캐릭터',
        characterPrompt: `simple Korean Instagram toon guide character for ${topic}, demonstrating the user-requested steps or poses, clean black line art, practical outfit, full body pose sheet, instructional gestures, expressive but clear, no text, no logo`
      };
    }
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

function characterStyleLine(context = {}) {
  const style = context.characterStyle;
  if (!style?.label && !style?.prompt) return '';
  return [
    `캐릭터 그림체: ${style.label || '선택한 레퍼런스'}`,
    style.detailLevel ? `디테일: ${style.detailLevel}` : '',
    style.role ? `역할: ${style.role}` : '',
    style.traits ? `특징: ${style.traits}` : '',
    style.prompt ? `스타일 지시: ${style.prompt}` : '',
    style.detailPrompt ? `디테일 지시: ${style.detailPrompt}` : ''
  ].filter(Boolean).join('\n');
}

function exerciseTutorialFlow(topic, context = {}) {
  const direction = context.contentDirection ? ` 요청 반영: ${context.contentDirection}` : '';
  return [
    `루틴 목표와 준비물: ${topic}에서 보여줄 부위, 도구, 난이도 정리${direction}`,
    '운동 순서 한눈에 보기: 사용자가 요청한 동작들을 쉬운 순서로 배열',
    '1번 동작 자세와 횟수: 시작 자세, 움직임, 반복 횟수를 캐릭터가 시연',
    '2번 동작 자세와 횟수: 자주 틀리는 자세와 교정 포인트를 시연',
    '3번 동작 자세와 횟수: 호흡, 속도, 세트 기준을 시연',
    '세트와 휴식: 전체 반복 수, 휴식 시간, 쉬운 버전/어려운 버전',
    '저장 체크: 시작 전 확인할 안전 기준과 다음 행동'
  ];
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
