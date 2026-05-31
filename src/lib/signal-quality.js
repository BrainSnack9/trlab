import { adultPattern, lowIntentCuePattern, marketingCuePattern, politicsPattern, riskPattern } from './ranking-config';

const junkPattern = /(로그인|회원가입|공지|메뉴|댓글|추천|이전|다음|광고|AD|단축키|설정하기)$/i;

export function evaluateSignalQuality(signal) {
  const text = `${signal.title ?? ''} ${signal.summary ?? ''}`;
  const reasons = [];
  let score = 45;

  if (adultPattern.test(text)) reasons.push('성인/선정성');
  if (politicsPattern.test(text)) reasons.push('정치');
  if (riskPattern.test(text)) { score -= 18; reasons.push('리스크'); }
  if (junkPattern.test(text) || signal.title?.length < 6) { score -= 24; reasons.push('목록 잡음'); }
  if (marketingCuePattern.test(text)) { score += 28; reasons.push('콘텐츠 각도'); }
  if (lowIntentCuePattern.test(text)) { score -= 14; reasons.push('낮은 의도'); }
  if (signal.source === 'Search SERP' || signal.source === 'Google Trends') score += 10;
  if (/[?]|왜|방법|비교|전략|변화|영향|분석|혜택|출시|가격/.test(text)) score += 10;

  const finalScore = Math.max(0, Math.min(100, Math.round(score)));
  return {
    score: finalScore,
    label: labelFor(finalScore, reasons),
    reasons,
    storable: !reasons.includes('성인/선정성') && !reasons.includes('정치') && !reasons.includes('목록 잡음')
  };
}

function labelFor(score, reasons) {
  if (reasons.includes('성인/선정성') || reasons.includes('정치') || reasons.includes('목록 잡음')) return '제외';
  if (score >= 72) return '고품질';
  if (score >= 52) return '보통';
  return '낮음';
}
