import { formatCardText } from '@/lib/card-text';

export function evaluateCardNewsPlan(plan) {
  const cards = Array.isArray(plan?.cards) ? plan.cards : [];
  const checks = [
    check('7~12장 캐러셀', cards.length >= 7 && cards.length <= 12, `${cards.length}장`),
    check('표지로 시작', cards[0]?.role === 'cover', roleText(cards[0])),
    check('레퍼런스 리듬', hasReferenceRhythm(plan), plan?.referencePattern?.deckLength || plan?.referenceStyle || '없음'),
    check('비교 카드 포함', cards.some((card) => card.role === 'comparison' || card.layout === 'comparison_board'), '비교 축'),
    check('데이터 카드 포함', cards.some((card) => card.role === 'data_scene' || card.layout === 'data_chart'), '숫자/그래프'),
    check('저장 체크리스트로 종료', cards.at(-1)?.role === 'checklist' || cards.at(-1)?.layout === 'checklist', roleText(cards.at(-1))),
    check('표지 제목 16자 이하', coverTitleLength(cards[0]) > 0 && coverTitleLength(cards[0]) <= 16, `${coverTitleLength(cards[0])}자`),
    check('표지 훅 신호', hasCoverHook(cards[0]), cards[0]?.title || '없음'),
    check('표지 본문 2줄 이하', coverLineCount(cards[0]) <= 2, `${coverLineCount(cards[0])}줄`),
    check('카드별 장면 분리', repeatedCardPairs(cards).length === 0, repeatedCardPairs(cards).length ? `${repeatedCardPairs(cards).length}쌍 반복` : '반복 없음'),
    check('카드별 시각 라벨', cards.every((card) => card.visualItems?.length >= 2), 'visualItems 2개 이상'),
    check('데이터 근거 숫자', dataCards(cards).some((card) => hasNumber([card.dataPoint, card.sourceLine, card.body].join(' '))), '숫자 포함'),
    check('게시 문구 패키지', Boolean(plan?.captionFirstLine && plan?.captionBody && plan?.captionCTA && plan?.hashtags?.length >= 5), '첫 줄/본문/CTA/태그'),
    check('캡션 본문 맥락', hasCaptionContext(plan), `${captionLength(plan)}자`),
    check('보고서 라벨 제거', !/근거:|해석:|실행:|데이터:/u.test(cards.map((card) => card.body).join('\n')), '본문 라벨 없음')
  ];
  const passed = checks.filter((item) => item.passed).length;
  return {
    score: Math.round((passed / checks.length) * 100),
    label: passed === checks.length ? '출력 준비' : passed >= 8 ? '보완 조금' : '보완 필요',
    checks
  };
}

function check(label, passed, detail = '') {
  return { label, passed: Boolean(passed), detail, action: actionFor(label) };
}

function actionFor(label) {
  return {
    '7~12장 캐러셀': '레퍼런스처럼 최소 7장, 권장 8~12장으로 장면을 나누세요.',
    '표지로 시작': '첫 카드는 role=cover로 두고 긴 설명 대신 후크만 남기세요.',
    '레퍼런스 리듬': 'referencePattern에 카드 수, 표지, 본문, 근거, 마무리 리듬을 채우세요.',
    '비교 카드 포함': '한 장은 비교표/비교축으로 만들고 visualItems에 비교 대상을 넣으세요.',
    '데이터 카드 포함': '한 장은 숫자/그래프 카드로 만들고 dataPoint에 숫자를 넣으세요.',
    '저장 체크리스트로 종료': '마지막 카드는 저장 기준 3개짜리 checklist로 끝내세요.',
    '표지 제목 16자 이하': '표지 제목은 16자 이하의 짧은 반전/질문형 문장으로 줄이세요.',
    '표지 훅 신호': '표지에 왜/착시/비교/놓쳐요/반전 같은 멈춤 단어를 넣으세요.',
    '표지 본문 2줄 이하': '표지 본문은 0~2줄로 줄이고 근거는 뒷장으로 보내세요.',
    '카드별 장면 분리': '반복되는 카드의 제목/본문을 다른 역할, 다른 시각 장면으로 바꾸세요.',
    '카드별 시각 라벨': '각 카드 visualItems에 그래프 축, 비교칸, 체크 항목 2개 이상을 넣으세요.',
    '데이터 근거 숫자': 'data_scene 카드에 댓글/추천/조회/% 같은 실제 숫자를 넣으세요.',
    '게시 문구 패키지': 'captionFirstLine, captionBody, captionCTA, hashtags 5개 이상을 채우세요.',
    '캡션 본문 맥락': 'captionBody는 120~700자로 반응, 비교, 근거, 저장 이유를 자연스럽게 설명하세요.',
    '보고서 라벨 제거': '본문에서 근거:/해석:/실행:/데이터: 같은 내부 라벨을 지우세요.'
  }[label] ?? '레퍼런스 기준에 맞게 문안과 시각 요소를 다시 정리하세요.';
}

function roleText(card) {
  return card?.role || card?.layout || '없음';
}

function coverLineCount(card) {
  return formatCardText(card?.body ?? '').split('\n').filter(Boolean).length;
}

function coverTitleLength(card) {
  return `${card?.title ?? ''}`.trim().length;
}

function hasCoverHook(card) {
  const title = `${card?.title ?? ''}`.trim();
  return /왜|진짜|믿기|착시|비교|놓쳐|달라|반전|한 줄|이게|요즘|갑자기|모르면|전에/.test(title);
}

function repeatedCardPairs(cards) {
  const pairs = [];
  for (let left = 0; left < cards.length; left += 1) {
    for (let right = left + 1; right < cards.length; right += 1) {
      const similarity = jaccard(cardSignature(cards[left]), cardSignature(cards[right]));
      if (similarity >= 0.72) pairs.push([left, right]);
    }
  }
  return pairs;
}

function cardSignature(card) {
  return tokenize(`${card?.title ?? ''} ${card?.body ?? ''}`)
    .filter((token) => !STOPWORDS.has(token));
}

function tokenize(value) {
  return `${value ?? ''}`
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2);
}

function jaccard(left, right) {
  if (!left.length || !right.length) return 0;
  const a = new Set(left);
  const b = new Set(right);
  const intersection = [...a].filter((token) => b.has(token)).length;
  const union = new Set([...a, ...b]).size;
  return union ? intersection / union : 0;
}

const STOPWORDS = new Set(['그리고', '하지만', '그래서', '이제', '그냥', '같이', '먼저', '정말', '하나', '있어요', '해요', '봐요']);

function dataCards(cards) {
  return cards.filter((card) => card.role === 'data_scene' || card.layout === 'data_chart');
}

function hasNumber(value) {
  return /\d/.test(`${value ?? ''}`);
}

function captionLength(plan) {
  return `${plan?.captionBody ?? ''}`.trim().length;
}

function hasCaptionContext(plan) {
  const body = `${plan?.captionBody ?? ''}`.trim();
  return body.length >= 120 && body.length <= 700 && /(반응|비교|근거|저장|숫자)/.test(body);
}

function hasReferenceRhythm(plan) {
  const pattern = plan?.referencePattern;
  if (!pattern || typeof pattern !== 'object') return false;
  return ['deckLength', 'coverRhythm', 'bodyRhythm', 'proofRhythm', 'endingRhythm']
    .every((key) => `${pattern[key] ?? ''}`.trim().length >= 4);
}
