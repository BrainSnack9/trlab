import { enrichTrendsWithAI } from '@/lib/ai-trend-analyzer';
import { getLatestSignals, saveKeywordSnapshots } from '@/lib/signal-store';
import { rankTrendSignals } from '@/lib/trend-ranker';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request) {
  try {
    const params = new URL(request.url).searchParams;
    const limit = Number(params.get('limit') ?? 40);
    const verify = params.get('verify') !== '0';
    const verifyLimit = verify ? Math.min(8, Number(params.get('verifyLimit') ?? 5)) : 0;
    const ai = params.get('ai') !== '0';
    const aiLimit = ai ? Math.min(10, Number(params.get('aiLimit') ?? 8)) : 0;
    const reason = params.get('reason') ?? 'manual-rank';
    const signals = getLatestSignals(Number(params.get('signalLimit') ?? 500));
    const ranked = await rankTrendSignals(signals, { limit, verifyLimit });
    const { trends, meta: aiMeta } = await enrichTrendsWithAI(ranked, { limit: aiLimit });

    if (params.get('save') === '1' || reason.startsWith('scheduled-')) {
      saveKeywordSnapshots(trends.slice(0, 30), reason);
    }

    return Response.json({
      processedAt: new Date().toISOString(),
      inputCount: signals.length,
      candidateCount: trends.length,
      verifiedCount: trends.filter((trend) => trend.searchVerification).length,
      ai: aiMeta,
      rankingPolicy: {
        crossCheck: '복수 출처, 반복 감지, 원문 문맥 우대',
        searchVerify: verify ? `상위 ${verifyLimit}개 Google/Naver/검색 API 검증` : '비활성',
        aiAnalyze: aiMeta.enabled ? `${aiMeta.provider} 상위 ${aiMeta.analyzed}개 콘텐츠성 평가` : '비활성 또는 실패',
        riskFilter: '성인, 정치, 루머성 표현 감점'
      },
      trends
    });
  } catch (error) {
    return Response.json({
      error: 'trend_rank_failed',
      message: error instanceof Error ? error.message : '알 수 없는 오류',
      stack: process.env.NODE_ENV === 'development' && error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}
