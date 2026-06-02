import { verifySearch } from '#trlab/modules/services/search/ranking-search';
import { badRequest, parseSearchParams } from '#trlab/modules/routes/validators/common';
import { searchVerifyQuerySchema } from '#trlab/modules/routes/validators/schemas';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request) {
  let params;
  try {
    params = parseSearchParams(request, searchVerifyQuerySchema);
  } catch (error) {
    return badRequest(error);
  }
  const query = params.q;
  const type = params.type;

  const result = await verifySearch(query);
  const sources = result.sources ?? [];
  const results = sources.flatMap((source) => source.results.map((item) => ({ ...item, source: source.source })));
  return Response.json({
    query,
    checkedAt: new Date().toISOString(),
    sources,
    results,
    verification: {
      score: result.score,
      grade: result.grade,
      tokens: result.tokens ?? [],
      summary: makeSearchSummary(query, result, type),
      reason: makeSearchReason(result),
      recommendedAction: result.grade === '통과' ? '콘텐츠 스튜디오에 담아도 됩니다.' : '원문 확인 후 보류 판단을 권장합니다.',
      draftReady: result.grade === '통과',
      keyFindings: result.keyFindings ?? []
    }
  });
}

function makeSearchSummary(query, result, type) {
  if (!result.matchedResults) return `${query} 검색 결과에서 충분한 맥락을 찾지 못했습니다.`;
  return `${query} 관련 검색 매칭 ${result.matchedResults}건을 확인했습니다. ${type} 콘텐츠 기준 현재 판정은 ${result.grade}입니다.`;
}

function makeSearchReason(result) {
  const sourceCount = result.sourceCount ?? 0;
  if (!result.matchedResults) return `강한 근거 없음 · 확인 출처 ${sourceCount}곳`;
  return `강한 근거 ${result.matchedResults}건 · 확인 출처 ${sourceCount}곳`;
}
