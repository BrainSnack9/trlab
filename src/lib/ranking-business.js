const strongAreas = ['tech', 'brand', 'economy', 'finance', 'shopping', 'travel', 'health', 'food', 'auto', 'education', 'local'];
const cappedAreas = ['sports', 'entertainment', 'life'];
const noisePattern = /ㅋㅋ|ㄷㄷ|명언|실시간|반응|제약|짤/;

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
  if (['sports', 'entertainment'].includes(areaId)) score -= 10;
  if (noisePattern.test(`${candidate.keyword} ${candidate.sampleTitles.join(' ')}`)) score -= 14;
  return score;
}
