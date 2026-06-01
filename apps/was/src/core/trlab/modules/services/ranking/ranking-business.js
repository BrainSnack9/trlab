const strongAreas = ['tech', 'brand', 'economy', 'finance', 'shopping', 'travel', 'health', 'food', 'auto', 'education', 'local'];
const cappedAreas = ['sports', 'entertainment', 'life'];
const noisePattern = /ㅋㅋ|ㄷㄷ|명언|실시간|반응|제약|짤/;
const channelGrowthPattern = /(K-?뷰티|화장품|성분|올리브영|전기차|구독|모빌리티|AI|AX|반도체|건강 식품|비교|가격|소비|브랜드|전략)/i;
const monetizableAreas = ['beauty', 'auto', 'tech', 'shopping', 'health', 'finance', 'education', 'local', 'brand'];
const communitySources = new Set(['FMKorea', 'TheQoo', 'Nate Pann', 'DCInside', 'Ruliweb', 'BobaeDream', 'MLBPark', 'Clien', 'Reddit']);

export function compareCandidates(a, b) {
  return (b.production?.score ?? 0) - (a.production?.score ?? 0)
    || getBusinessPriority(b) - getBusinessPriority(a)
    || b.score - a.score;
}

export function limitAreaDominance(candidate, index, candidates) {
  if (!cappedAreas.includes(candidate.area?.id)) return true;
  const earlierSameArea = candidates.slice(0, index).filter((item) => item.area?.id === candidate.area?.id).length;
  return earlierSameArea < 2 || (candidate.production?.score ?? 0) >= 82;
}

function getBusinessPriority(candidate) {
  const areaId = candidate.area?.id;
  let score = candidate.scoring?.intent ?? 0;
  if (strongAreas.includes(areaId)) score += 18;
  if (monetizableAreas.includes(areaId)) score += 10;
  if (areaId === 'beauty') score += 10;
  if (areaId === 'auto') score += 6;
  if (channelGrowthPattern.test(`${candidate.keyword} ${candidate.sampleTitles.join(' ')}`)) score += 14;
  if ((candidate.scoring?.communityReaction ?? 0) >= 16) score += 18;
  else if ((candidate.scoring?.communityReaction ?? 0) >= 8) score += 10;
  if (candidate.sources.includes('Search SERP') && candidate.sampleTitles.length >= 3) score += 6;
  if (!candidate.sources.some((source) => communitySources.has(source))) score -= 14;
  if (['sports', 'entertainment'].includes(areaId)) score -= 10;
  if (noisePattern.test(`${candidate.keyword} ${candidate.sampleTitles.join(' ')}`)) score -= 14;
  return score;
}
