import { exclusionAreas, interestAreas, radarColors } from '@/core/TrLab/modules/configs/constants';

export function classifyText(value) {
  const text = `${value ?? ''}`.toLowerCase();
  return interestAreas.find((area) => area.keywords.some((k) => text.includes(k.toLowerCase())))
    ?? interestAreas.find((area) => area.id === 'life');
}

export function isAdultText(value) {
  const text = `${value ?? ''}`;
  return /(^|\s|\[|\(|#)(ㅇㅎ|19금|19세|19禁|성인|후방|후방주의|야짤|야동|노출|선정|음란)(\s|\]|\)|$|[.,!?])/i.test(text);
}

export function isSignalVisible(signal, selectedSet, excludedSet) {
  const text = `${signal.title ?? ''} ${signal.summary ?? ''}`;
  if (isAdultText(text)) return false;
  if (exclusionAreas.some((area) => excludedSet.has(area.id) && matchesArea(text, area))) return false;
  if (!selectedSet.size) return true;
  return selectedSet.has(classifyText(text).id);
}

export function isTrendVisible(trend, selectedSet, excludedSet) {
  const text = `${trend.keyword ?? trend.label ?? ''} ${(trend.sampleTitles ?? []).join(' ')}`;
  if (isAdultText(text)) return false;
  if (exclusionAreas.some((area) => excludedSet.has(area.id) && matchesArea(text, area))) return false;
  if (!selectedSet.size) return true;
  return selectedSet.has((trend.area?.id ? trend.area : classifyText(text)).id);
}

export function matchesArea(value, area) {
  const text = `${value ?? ''}`.toLowerCase();
  return area.keywords.some((keyword) => text.includes(keyword.toLowerCase()));
}

export function trendToRadarItem(trend, index) {
  const score = trend.score ?? 0;
  return {
    id: trend.id ?? `trend-${hash(trend.keyword ?? trend.label)}`,
    label: trend.keyword ?? trend.label,
    category: trend.area?.label ?? trend.category ?? '라이프',
    rank: index + 1,
    heat: score,
    score,
    production: trend.production,
    validation: trend.validation,
    contentIdeas: trend.contentIdeas ?? trend.aiAnalysis?.contentIdeas ?? [],
    searchVerification: trend.searchVerification,
    aiAnalysis: trend.aiAnalysis,
    channelFit: trend.channelFit,
    evidence: trend.evidence ?? [],
    sampleTitles: trend.sampleTitles ?? [],
    scoring: trend.scoring,
    crossCheck: trend.crossCheck,
    mentions: trend.mentions ?? 0,
    sources: trend.sources ?? [],
    intent: trend.crossCheck?.label ?? (trend.sources ?? []).join(', '),
    color: radarColors[index % radarColors.length],
    x: [30, 52, 68, 40, 78, 18, 58, 84, 25, 72][index] ?? 50,
    y: [43, 28, 55, 70, 36, 63, 77, 66, 25, 84][index] ?? 50,
    size: Math.max(68, Math.min(112, 58 + score * 0.75)),
    summary: trend.production?.suggestedAngle ?? trend.sampleTitles?.[0] ?? ''
  };
}

export function getSignalKind(signal) {
  if (signal.source === 'Google Trends') return '급상승';
  if (signal.type === 'topical-serp') return '영역시드';
  if (signal.source === 'Search SERP') return '검색결과';
  if (signal.source === 'Inven') return '게임뉴스';
  if (signal.source === 'ArcaLive') return '서브컬처';
  if (signal.source === 'Reddit') return '글로벌';
  return signal.type || '커뮤니티';
}

export function getSignalQuality(signal) {
  if (signal.qualityLabel) {
    return { suspicious: ['낮음', '제외'].includes(signal.qualityLabel), label: signal.qualityLabel, reasons: signal.qualityReasons ?? [], score: signal.qualityScore ?? 0 };
  }
  const title = `${signal.title ?? ''}`;
  const reasons = [];
  if (isAdultText(title)) reasons.push('성인/선정성');
  if (title.length < 8) reasons.push('짧은 제목');
  if (/(jpg$|png$|gif$|공지|로그인|회원가입|메뉴)/i.test(title)) reasons.push('목록 잡음');
  return { suspicious: reasons.length > 0, label: reasons.length ? '검토 필요' : '정상', reasons, score: reasons.length ? 30 : 70 };
}

export function formatTime(value) {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleString('ko-KR', { dateStyle: 'short', timeStyle: 'short' });
}

export function getHostname(value) {
  try { return new URL(value).hostname.replace(/^www\./, ''); } catch { return '-'; }
}

export function makeScenario(studio) {
  const plan = [`${studio?.label} 핵심 신호`, '왜 지금 반응하는가', '콘텐츠 각도', '검증 포인트', '요약'];
  return plan.map((title, index) => ({
    page: index + 1,
    title,
    body: index === 0 ? `${studio?.label}를 한눈에 설명합니다.` : `${title}를 짧고 명확하게 정리합니다.`
  }));
}

export function buildContentIdeas(studio) {
  const aiIdeas = [
    ...(studio?.contentIdeas ?? []),
    ...(studio?.aiAnalysis?.contentIdeas ?? [])
  ].filter(Boolean);
  if (aiIdeas.length) return [...new Set(aiIdeas)].slice(0, 6);
  return [
    studio?.validation?.suggestedTitle ?? `${studio?.label} 카드뉴스 초안`,
    studio?.production?.suggestedAngle,
    `${studio?.label} 검색자가 궁금해할 질문 7개`
  ].filter(Boolean);
}

function hash(value = '') {
  let result = 0;
  for (let index = 0; index < value.length; index += 1) result = (result * 31 + value.charCodeAt(index)) >>> 0;
  return result.toString(36);
}
