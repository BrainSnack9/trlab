export const contentPlanControllerHelpers = {
  makeManualStudio(values) {
    const topic = values.topic.trim();
    const prompt = values.prompt.trim();
    const cardCount = Math.min(12, Math.max(3, Number(values.cardCount) || 8));
    const channelName = contentPlanControllerHelpers.normalizeChannelName(values.channelName);
    const idSeed = `${topic}-${prompt}-${cardCount}-${Date.now()}`;
    return {
      id: `manual-${contentPlanControllerHelpers.hashString(idSeed)}`,
      label: topic,
      keyword: topic,
      category: 'manual',
      sourceMode: 'manual',
      channelName,
      score: 100,
      rank: 1,
      summary: prompt,
      production: {
        tier: 'Manual',
        score: 100,
        suggestedAngle: prompt
      },
      validation: {
        contentType: '사용자 입력'
      },
      manualBrief: {
        topic,
        prompt,
        channelName,
        audience: values.audience?.trim(),
        tone: values.tone?.trim(),
        cardCount
      },
      cardCount,
      evidence: [],
      sampleTitles: [],
      sources: ['manual']
    };
  },

  hashString(value) {
    let result = 0;
    for (let index = 0; index < value.length; index += 1) result = (result * 31 + value.charCodeAt(index)) >>> 0;
    return result.toString(36);
  },

  normalizeChannelName(value) {
    const text = `${value ?? ''}`.trim();
    if (!text) return '@trlab.insight';
    return text.startsWith('@') ? text : `@${text}`;
  }
};
